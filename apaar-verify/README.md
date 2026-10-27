# APAAR-Verify

Prototype for **Smart India Hackathon SIH26263** - *APAAR ID-Based Student Data Management and Verification Platform*.
**All data is fictional** (deterministic synthetic seed; the UI shows a "Demo data - fictional" banner). Not affiliated with any government body.

Next.js 14 (App Router, plain JavaScript) - Tailwind CSS - Route Handlers as the backend - SQLite (`better-sqlite3`) - `bcryptjs` + `jose` (JWT in an httpOnly cookie) - `framer-motion`, `lucide-react`. Charts are SVG/CSS. SHA-256 uses Node's `crypto`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # checksum, fuzzy match, CSV and hash-chain tests (no install needed)
```

Needs Node 20.19+ (or 22+). No setup: `data/apaar.db` is created and seeded on the first request. `npm run seed` wipes and reseeds it. Optional: copy `.env.example` to `.env.local` and set `JWT_SECRET` (a dev default is used otherwise).

## Demo logins (password for all: `Demo@1234`)

| Role | Email | Lands on |
|---|---|---|
| Institution (Aryabhata Institute, Pune) | `institution@apaar.test` | `/institution` |
| Student (Ananya Deshmukh) | `student@apaar.test` | `/student` |
| Verifier (BharatBank desk) | `verifier@apaar.test` | `/verify` |
| Admin | `admin@apaar.test` | `/admin` |
| Extra verifiers | `recruiter@apaar.test`, `scraper@apaar.test` (seeded to trigger an anomaly alert) | `/verify` |

Demo APAAR IDs (also shown as shortcut chips on `/verify`):
`639962295221` Ananya (consent needed) - `878939727763` Subhashree (already consented) - `601457826852` request pending - `999900000012` not found - `999900000013` bad checksum.

## 3-minute demo script

1. **0:00 Landing** - the hero, animated counters, the role picker. Toggle dark mode. Click **Enter as Institution**.
2. **0:30 Institution** - stat cards and charts. **Download sample CSV**, upload it: 5 rows import, 3 come back with line-numbered errors (bad checksum, impossible date, missing fields) and 1 fuzzy duplicate. In **Duplicate resolver** merge or keep a pair. In the table, find the "Invalid ID" row and **Edit** it with a corrected ID.
3. **1:15 Verifier** - sign out, **Enter as Verifier**. Try `878939727763`: **Verified** showing only the 5 consented fields (no DOB, no gender). Try `639962295221`: **Consent required** -> **Request access**.
4. **1:50 Student** - sign in as the student. Flip the ID card. In the consent manager approve the request for just *Full name*. Note the access history.
5. **2:15 Verifier again** - re-run `639962295221`: **Verified** with exactly one field. (Back as student: **Revoke**, and it is refused instantly.)
6. **2:30 Admin** - usage chart and the anomaly alert for `scraper@apaar.test` (ID enumeration). **Verify chain integrity** -> intact. **Tamper with a record** -> verify again -> *first broken link: record #N*, highlighted. As the verifier, any lookup now returns **Tampered** (fail-closed). Back to admin -> **Restore**.

## How it works

- **APAAR ID**: 12 digits + Luhn checksum (`lib/validation.js`). **Fuzzy duplicates**: similarity = name 60% (token-sorted Levenshtein) + DOB 30% + institution 10%; >= 85% is flagged.
- **Consent projection**: `POST /api/verify` returns only the fields in the approved consent, built server-side (`lib/consent.js`). Every lookup writes `access_log` and the audit chain.
- **Audit chain**: `hash = SHA-256(prev_hash + action + payload + ts)` (`lib/hash.js`). Audit payloads store hashed references, not names. `verifyChain` reports the first broken link. `/api/admin/tamper` is **demo only** (disable with `ENABLE_TAMPER_DEMO=false`); it backs up the original so *Restore* works.
- **Rate limits** (in-memory): login 8/min per IP+email, verify 20/min per user.
- **Auth**: bcrypt hashes, JWT cookie, middleware guards pages, and every API route re-checks the role.

Extensions beyond the brief: extra columns `users.apaar_id`, `users.display_name`, `students.merged_into`; tables `dup_decisions` and `meta`; routes `GET /api/duplicates/resolve`, `GET /api/institution/stats`, `GET /api/public/stats`, `GET /api/verify` (demo shortcuts).

## Swapping SQLite for PostgreSQL

All SQL lives in `lib/db.js`, `lib/seed.js`, `lib/audit.js`, `lib/duplicates.js` and the route handlers. Steps: add `pg`, make `getDb()` return a pool, make calls `async` (`better-sqlite3` is synchronous), change `?` placeholders to `$1..`, `INTEGER PRIMARY KEY AUTOINCREMENT` to `BIGSERIAL`, `INSERT OR REPLACE` to `INSERT ... ON CONFLICT DO UPDATE`, and `strftime(...)` defaults to `now()`. Use `SERIALIZABLE` (or an advisory lock) in `appendAuditTo` so two writers cannot fork the chain. Replace the in-memory rate limiter with Redis if you run more than one instance.

## Swapping the mock adapters (DigiLocker / ABC / UDISE+ via API Setu)

`lib/adapters/{digilocker,abc,udise}.js` expose the methods callers use (`listIssuedDocuments`, `verifyDocument`, `getCreditSummary`, `getAccount`, `getInstitutionProfile`, `validateInstitution`). To go live, add `lib/adapters/live/*.js` with the same method names backed by API Setu HTTP clients (OAuth, consent artefacts, signature checks), and return them from `getAdapters()` when `ADAPTER_MODE=live`. Callers do not change.

## Layout

```
app/            pages (/, /login, /institution, /student, /verify, /admin) + app/api/** route handlers
components/     Navbar, Providers (auth + toasts), ui, Charts, IdCard, UploadPanel, DuplicateResolver, StudentTable, ConsentManager
lib/            db, auth, api, validation, hash, audit, csv, consent, duplicates, ratelimit, seed(-data), adapters/*
scripts/        test.mjs, reset-db.mjs
middleware.js   role-based page protection
```

## Prototype limits

Demo passwords are published here. The pseudo-QR on the ID card is decorative, not scannable. Cookies are not `Secure` unless `COOKIE_SECURE=true`. No CSRF tokens (SameSite=Lax only). Not load-tested.
