import { getDb } from '@/lib/db';
import { handle, json, requireRole, HttpError } from '@/lib/api';
import { getAdapters } from '@/lib/adapters';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  const s = await requireRole(['student']);
  const db = getDb();
  const user = db.prepare('SELECT apaar_id, display_name FROM users WHERE id = ?').get(s.uid);
  if (!user?.apaar_id) throw new HttpError(404, 'No student record is linked to this account');

  const student = db
    .prepare('SELECT s.apaar_id, s.name, s.dob, s.gender, s.course, s.year, s.status, i.name AS institution, i.city, i.state FROM students s JOIN institutions i ON i.id = s.institution_id WHERE s.apaar_id = ?')
    .get(user.apaar_id);
  if (!student) throw new HttpError(404, 'Student record not found');

  const history = db
    .prepare(
      `SELECT a.id, a.result, a.ts, COALESCE(u.display_name, u.email) AS verifier
       FROM access_log a LEFT JOIN users u ON u.id = a.verifier_id
       WHERE a.apaar_id = ? ORDER BY a.ts DESC LIMIT 50`,
    )
    .all(user.apaar_id);

  // Linked services via mock adapters (same interface a live API Setu client would expose)
  const { abc, digilocker } = getAdapters();
  const [credits, documents] = await Promise.all([abc.getCreditSummary({ apaarId: user.apaar_id }), digilocker.listIssuedDocuments({ apaarId: user.apaar_id })]);

  return json({ student, history, services: { credits, documents } });
});
