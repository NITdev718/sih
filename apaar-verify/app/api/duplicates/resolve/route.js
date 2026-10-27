import { getDb, audit, nowIso } from '@/lib/db';
import { handle, json, readJson, requireRole, HttpError } from '@/lib/api';
import { listDuplicatePairs, pairKey } from '@/lib/duplicates';
import { sha256 } from '@/lib/hash';

export const dynamic = 'force-dynamic';

// Open duplicate candidates for the signed-in institution (all, for admins).
export const GET = handle(async () => {
  const s = await requireRole(['institution', 'admin']);
  const pairs = listDuplicatePairs(getDb(), s.role === 'institution' ? s.institution_id : null);
  return json({ pairs });
});

// body: { a, b, action: 'merge' | 'keep' | 'reject', survivor? }
//  merge  -> one record survives (default a), the other is marked merged and its consents move across
//  keep   -> both are genuine people; stop flagging this pair
//  reject -> record b is rejected as a bad/duplicate submission
export const POST = handle(async (req) => {
  const s = await requireRole(['institution', 'admin']);
  const body = await readJson(req, 5_000);
  const a = String(body.a ?? '');
  const b = String(body.b ?? '');
  const action = body.action;
  if (!/^\d{12}$/.test(a) || !/^\d{12}$/.test(b) || a === b) throw new HttpError(400, 'Provide two different 12-digit IDs as "a" and "b"');
  if (!['merge', 'keep', 'reject'].includes(action)) throw new HttpError(400, 'action must be merge, keep or reject');

  const db = getDb();
  const get = db.prepare("SELECT * FROM students WHERE apaar_id = ? AND status IN ('active','inactive','invalid')");
  const ra = get.get(a);
  const rb = get.get(b);
  if (!ra || !rb) throw new HttpError(404, 'One or both records were not found (already resolved?)');
  if (s.role === 'institution' && ra.institution_id !== s.institution_id && rb.institution_id !== s.institution_id) {
    throw new HttpError(403, 'Neither record belongs to your institution');
  }

  const ts = nowIso();
  const [k1, k2] = pairKey(a, b);
  let result;
  db.transaction(() => {
    if (action === 'keep') {
      db.prepare("INSERT OR REPLACE INTO dup_decisions (a, b, decision, ts) VALUES (?,?,'keep',?)").run(k1, k2, ts);
      result = { action, kept: [a, b] };
    } else if (action === 'reject') {
      db.prepare("UPDATE students SET status = 'rejected' WHERE apaar_id = ?").run(b);
      result = { action, rejected: b };
    } else {
      const survivor = body.survivor === b ? b : body.survivor && body.survivor !== a ? null : a;
      if (!survivor) throw new HttpError(400, 'survivor must be a or b');
      const loser = survivor === a ? b : a;
      db.prepare("UPDATE students SET status = 'merged', merged_into = ? WHERE apaar_id = ?").run(survivor, loser);
      db.prepare('UPDATE consents SET apaar_id = ? WHERE apaar_id = ?').run(survivor, loser);
      db.prepare("INSERT OR REPLACE INTO dup_decisions (a, b, decision, ts) VALUES (?,?,'merge',?)").run(k1, k2, ts);
      result = { action, survivor, merged: loser };
    }
    audit(`duplicate.${action}`, { a_ref: sha256(a).slice(0, 12), b_ref: sha256(b).slice(0, 12), ...(result.survivor ? { survivor_ref: sha256(result.survivor).slice(0, 12) } : {}), by_role: s.role });
  })();

  return json({ ok: true, result });
});
