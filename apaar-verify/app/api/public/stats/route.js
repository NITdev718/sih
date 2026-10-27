import { getDb } from '@/lib/db';
import { handle, json } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Unauthenticated, aggregate numbers only (used by the landing page counters). Also triggers first-run DB seeding.
export const GET = handle(async () => {
  const db = getDb();
  const one = (sql) => db.prepare(sql).get().c;
  return json({
    students: one("SELECT COUNT(*) c FROM students WHERE status IN ('active','inactive')"),
    institutions: one('SELECT COUNT(*) c FROM institutions'),
    verifications: one('SELECT COUNT(*) c FROM access_log'),
    auditEntries: one('SELECT COUNT(*) c FROM audit_log'),
  });
});
