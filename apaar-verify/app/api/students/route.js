import { getDb } from '@/lib/db';
import { handle, json, requireRole, intParam } from '@/lib/api';
import { luhnValid } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const SORTS = {
  name: 's.name',
  apaar_id: 's.apaar_id',
  course: 's.course',
  year: 's.year',
  status: 's.status',
  dob: 's.dob',
  institution: 'i.name',
};
const STATUSES = ['active', 'inactive', 'invalid', 'merged', 'rejected'];

export const GET = handle(async (req) => {
  const s = await requireRole(['institution', 'admin']);
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const sortKey = SORTS[url.searchParams.get('sort')] ? url.searchParams.get('sort') : 'name';
  const dir = url.searchParams.get('dir') === 'desc' ? 'DESC' : 'ASC';
  const page = intParam(url, 'page', 1, 1, 100000);
  const pageSize = intParam(url, 'pageSize', 10, 1, 50);
  const status = url.searchParams.get('status');

  const where = [];
  const args = [];
  if (s.role === 'institution') {
    where.push('s.institution_id = ?');
    args.push(s.institution_id);
  } else if (url.searchParams.get('institution_id')) {
    where.push('s.institution_id = ?');
    args.push(parseInt(url.searchParams.get('institution_id'), 10) || 0);
  }
  if (status && STATUSES.includes(status)) {
    where.push('s.status = ?');
    args.push(status);
  } else {
    where.push("s.status NOT IN ('merged','rejected')");
  }
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    where.push("(s.name LIKE ? ESCAPE '\\' OR s.apaar_id LIKE ? ESCAPE '\\' OR s.course LIKE ? ESCAPE '\\')");
    args.push(like, like, like);
  }
  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const db = getDb();
  const total = db.prepare(`SELECT COUNT(*) c FROM students s JOIN institutions i ON i.id = s.institution_id ${W}`).get(...args).c;
  const rows = db
    .prepare(
      `SELECT s.apaar_id, s.name, s.dob, s.gender, s.institution_id, i.name AS institution, s.course, s.year, s.status
       FROM students s JOIN institutions i ON i.id = s.institution_id ${W}
       ORDER BY ${SORTS[sortKey]} ${dir}, s.apaar_id ASC LIMIT ? OFFSET ?`,
    )
    .all(...args, pageSize, (page - 1) * pageSize)
    .map((r) => ({ ...r, id_valid: luhnValid(r.apaar_id) }));

  return json({ rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) });
});
