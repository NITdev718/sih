import { getDb, audit } from '@/lib/db';
import { handle, json, readJson, requireRole, HttpError } from '@/lib/api';

export const dynamic = 'force-dynamic';

// DEMO ONLY - deliberately corrupts one audit row so the integrity check (and /verify) can be shown failing.
// body: { action: 'tamper' | 'restore' }  (default 'tamper'). Disable with ENABLE_TAMPER_DEMO=false.
export const POST = handle(async (req) => {
  await requireRole(['admin']);
  if (process.env.ENABLE_TAMPER_DEMO === 'false') throw new HttpError(403, 'Tamper demo is disabled');
  const body = await readJson(req, 1_000);
  const db = getDb();
  const backup = db.prepare("SELECT value FROM meta WHERE key = 'tamper_backup'").get();

  if (body.action === 'restore') {
    if (!backup) throw new HttpError(409, 'Nothing to restore - no record has been tampered with');
    const { id, payload } = JSON.parse(backup.value);
    db.transaction(() => {
      db.prepare('UPDATE audit_log SET payload = ? WHERE id = ?').run(payload, id);
      db.prepare("DELETE FROM meta WHERE key = 'tamper_backup'").run();
      audit('demo.restore', { record: id });
    })();
    return json({ ok: true, restored: id });
  }

  if (backup) throw new HttpError(409, 'A record is already tampered with. Restore it first.');
  const count = db.prepare('SELECT COUNT(*) c FROM audit_log').get().c;
  if (count < 4) throw new HttpError(409, 'Not enough audit records to tamper with');
  const target = db.prepare("SELECT id, payload FROM audit_log WHERE action LIKE 'consent.%' OR action LIKE 'student.%' ORDER BY id LIMIT 1 OFFSET 1").get() || db.prepare('SELECT id, payload FROM audit_log ORDER BY id LIMIT 1 OFFSET 2').get();

  db.transaction(() => {
    audit('demo.tamper', { record: target.id });
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('tamper_backup', ?)").run(JSON.stringify({ id: target.id, payload: target.payload }));
    db.prepare('UPDATE audit_log SET payload = ? WHERE id = ?').run(JSON.stringify({ tampered: true, note: 'altered by demo button' }), target.id);
  })();
  return json({ ok: true, tampered: target.id });
});
