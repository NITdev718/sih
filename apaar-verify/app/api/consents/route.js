import { getDb, audit, nowIso } from '@/lib/db';
import { handle, json, readJson, requireRole, HttpError } from '@/lib/api';
import { expireConsents, shapeConsent } from '@/lib/consent';
import { sanitizeFields, validateApaarId } from '@/lib/validation';
import { rateLimit } from '@/lib/ratelimit';
import { sha256 } from '@/lib/hash';

export const dynamic = 'force-dynamic';

const BASE = 'SELECT c.*, u.display_name, u.email FROM consents c JOIN users u ON u.id = c.verifier_id';

export const GET = handle(async () => {
  const s = await requireRole(['student', 'verifier', 'admin']);
  const db = getDb();
  expireConsents(db);
  let rows;
  if (s.role === 'student') {
    const u = db.prepare('SELECT apaar_id FROM users WHERE id = ?').get(s.uid);
    rows = db.prepare(`${BASE} WHERE c.apaar_id = ? ORDER BY c.id DESC`).all(u?.apaar_id ?? '');
  } else if (s.role === 'verifier') {
    rows = db.prepare(`${BASE} WHERE c.verifier_id = ? ORDER BY c.id DESC LIMIT 100`).all(s.uid);
  } else {
    rows = db.prepare(`${BASE} ORDER BY c.id DESC LIMIT 200`).all();
  }
  return json({ consents: rows.map(shapeConsent) });
});

// body.action: request (verifier) | approve | deny | revoke (student)
export const POST = handle(async (req) => {
  const s = await requireRole(['student', 'verifier']);
  const body = await readJson(req, 5_000);
  const db = getDb();
  expireConsents(db);
  const ts = nowIso();

  if (body.action === 'request') {
    if (s.role !== 'verifier') throw new HttpError(403, 'Only verifiers can request access');
    const rl = rateLimit(`consent-req:${s.uid}`, 20, 60_000);
    if (!rl.ok) throw new HttpError(429, `Too many requests. Try again in ${rl.retryAfter}s.`, {}, { 'Retry-After': String(rl.retryAfter) });
    const v = validateApaarId(body.apaar_id);
    if (!v.ok) throw new HttpError(400, v.error);
    const fields = sanitizeFields(body.fields);
    if (!fields.length) throw new HttpError(400, 'Choose at least one field to request');
    const stu = db.prepare("SELECT apaar_id FROM students WHERE apaar_id = ? AND status IN ('active','inactive')").get(v.id);
    if (!stu) throw new HttpError(404, 'No student found for that APAAR ID');
    const open = db.prepare("SELECT status FROM consents WHERE apaar_id = ? AND verifier_id = ? AND status IN ('pending','approved')").get(v.id, s.uid);
    if (open) throw new HttpError(409, open.status === 'pending' ? 'A request is already pending for this student' : 'You already have active consent from this student');

    const id = db.transaction(() => {
      const r = db.prepare("INSERT INTO consents (apaar_id, verifier_id, fields_json, status, created_at) VALUES (?,?,?,'pending',?)").run(v.id, s.uid, JSON.stringify(fields), ts);
      audit('consent.request', { consent_id: Number(r.lastInsertRowid), apaar_ref: sha256(v.id).slice(0, 12), verifier_id: s.uid, fields });
      return Number(r.lastInsertRowid);
    })();
    return json({ consent: shapeConsent(db.prepare(`${BASE} WHERE c.id = ?`).get(id)) }, 201);
  }

  if (!['approve', 'deny', 'revoke'].includes(body.action)) throw new HttpError(400, 'action must be request, approve, deny or revoke');
  if (s.role !== 'student') throw new HttpError(403, 'Only the student can decide on consent');

  const me = db.prepare('SELECT apaar_id FROM users WHERE id = ?').get(s.uid);
  const id = Number(body.id);
  const c = Number.isInteger(id) ? db.prepare('SELECT * FROM consents WHERE id = ? AND apaar_id = ?').get(id, me?.apaar_id ?? '') : null;
  if (!c) throw new HttpError(404, 'Consent not found');

  if (body.action === 'revoke') {
    if (c.status !== 'approved') throw new HttpError(409, `Only approved consent can be revoked (this one is ${c.status})`);
    db.transaction(() => {
      db.prepare("UPDATE consents SET status = 'revoked', decided_at = ? WHERE id = ?").run(ts, id);
      audit('consent.revoke', { consent_id: id, apaar_ref: sha256(c.apaar_id).slice(0, 12), verifier_id: c.verifier_id });
    })();
  } else {
    if (c.status !== 'pending') throw new HttpError(409, `This request was already ${c.status}`);
    if (body.action === 'deny') {
      db.transaction(() => {
        db.prepare("UPDATE consents SET status = 'denied', decided_at = ? WHERE id = ?").run(ts, id);
        audit('consent.deny', { consent_id: id, apaar_ref: sha256(c.apaar_id).slice(0, 12), verifier_id: c.verifier_id });
      })();
    } else {
      const requested = JSON.parse(c.fields_json);
      const granted = body.fields === undefined ? requested : sanitizeFields(body.fields).filter((f) => requested.includes(f));
      if (!granted.length) throw new HttpError(400, 'Select at least one field to share, or deny the request');
      const days = body.days === undefined ? 30 : Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 365) throw new HttpError(400, 'days must be a whole number from 1 to 365');
      const expires = new Date(Date.now() + days * 86_400_000).toISOString();
      db.transaction(() => {
        db.prepare("UPDATE consents SET status = 'approved', fields_json = ?, expires_at = ?, decided_at = ? WHERE id = ?").run(JSON.stringify(granted), expires, ts, id);
        audit('consent.approve', { consent_id: id, apaar_ref: sha256(c.apaar_id).slice(0, 12), verifier_id: c.verifier_id, fields: granted, days });
      })();
    }
  }
  return json({ consent: shapeConsent(db.prepare(`${BASE} WHERE c.id = ?`).get(id)) });
});
