import { getDb } from '@/lib/db';
import { handle, json, requireRole } from '@/lib/api';
import { listDuplicatePairs } from '@/lib/duplicates';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const s = await requireRole(['institution', 'admin']);
  const db = getDb();
  const inst = s.role === 'institution' ? s.institution_id : null;
  const where = inst ? 'WHERE institution_id = ? AND status IN (\'active\',\'inactive\',\'invalid\')' : "WHERE status IN ('active','inactive','invalid')";
  const args = inst ? [inst] : [];
  const count = (extra = '') => db.prepare(`SELECT COUNT(*) c FROM students ${where} ${extra}`).get(...args).c;

  return json({
    institution: inst ? db.prepare('SELECT id, name, city, state, udise_code FROM institutions WHERE id = ?').get(inst) : null,
    total: count(),
    active: count("AND status = 'active'"),
    invalid: count("AND status = 'invalid'"),
    duplicates: listDuplicatePairs(db, inst).length,
    byCourse: db.prepare(`SELECT course AS label, COUNT(*) AS value FROM students ${where} GROUP BY course ORDER BY value DESC, label`).all(...args),
    byYear: db.prepare(`SELECT 'Year ' || year AS label, COUNT(*) AS value FROM students ${where} GROUP BY year ORDER BY year`).all(...args),
  });
});
