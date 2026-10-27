import { getDb, audit, nowIso } from '@/lib/db';
import { handle, json, readJson, requireRole, HttpError } from '@/lib/api';
import { checkChain } from '@/lib/audit';
import { expireConsents, projectFields } from '@/lib/consent';
import { validateApaarId } from '@/lib/validation';
import { demoIds } from '@/lib/seed-data';
import { rateLimit } from '@/lib/ratelimit';
import { sha256 } from '@/lib/hash';

export const dynamic = 'force-dynamic';

// DEMO ONLY: fictional shortcut IDs so a presenter does not have to look them up.
export const GET = handle(async () => {
  await requireRole(['verifier']);
  getDb();
  return json({ demo: demoIds() });
});

// The server decides what is disclosed. The full student record never leaves this handler.
export const POST = handle(async (req) => {
  const s = await requireRole(['verifier']);
  const rl = rateLimit(`verify:${s.uid}`, 20, 60_000);
  if (!rl.ok) {
    throw new HttpError(429, `Rate limit reached. Try again in ${rl.retryAfter}s.`, { retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });
  }
  const body = await readJson(req, 2_000);
  const db = getDb();
  const ts = nowIso();
  const log = (apaar, result) => {
    db.prepare('INSERT INTO access_log (verifier_id, apaar_id, result, ts) VALUES (?,?,?,?)').run(s.uid, apaar, result, ts);
  };
  const logAndAudit = (apaar, result) =>
    db.transaction(() => {
      log(apaar, result);
      audit('verify.lookup', { verifier_id: s.uid, apaar_ref: sha256(apaar).slice(0, 12), result });
    })();

  const v = validateApaarId(body.apaar_id);
  if (!v.ok) {
    log(String(body.apaar_id ?? '').replace(/[\s-]/g, '').slice(0, 20) || '(empty)', 'invalid');
    throw new HttpError(400, v.error, { status: 'invalid' });
  }
  const id = v.id;

  // Fail closed: if the audit trail has been altered, release nothing.
  const chain = checkChain(db);
  if (!chain.ok) {
    log(id, 'tampered');
    return json({ status: 'tampered', message: `Integrity check failed: the audit chain is broken at record #${chain.brokenAt}. No data is released until an administrator investigates.`, brokenAt: chain.brokenAt });
  }

  expireConsents(db);
  const stu = db
    .prepare("SELECT s.*, i.name AS institution_name FROM students s JOIN institutions i ON i.id = s.institution_id WHERE s.apaar_id = ? AND s.status IN ('active','inactive')")
    .get(id);
  if (!stu) {
    logAndAudit(id, 'not_found');
    return json({ status: 'not_found', apaar_id: id, message: 'No active student record matches this APAAR ID.' });
  }

  const consent = db.prepare("SELECT * FROM consents WHERE apaar_id = ? AND verifier_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 1").get(id, s.uid);
  if (!consent) {
    const pending = db.prepare("SELECT id, fields_json FROM consents WHERE apaar_id = ? AND verifier_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1").get(id, s.uid);
    logAndAudit(id, 'consent_required');
    return json({
      status: 'consent_required',
      apaar_id: id,
      pending: Boolean(pending),
      requested_fields: pending ? JSON.parse(pending.fields_json) : null,
      message: pending ? 'Your request is waiting for the student to respond.' : 'This student has not shared any data with you. Send an access request.',
    });
  }

  const fields = JSON.parse(consent.fields_json);
  logAndAudit(id, 'verified');
  return json({
    status: 'verified',
    apaar_id: id,
    fields: projectFields(stu, stu.institution_name, fields),
    consent: { id: consent.id, fields, expires_at: consent.expires_at },
    verified_at: ts,
  });
});
