import { getDb, audit } from '@/lib/db';
import { handle, json, readJson, requireRole, HttpError } from '@/lib/api';
import { isValidDob, normalizeGender, validateApaarId } from '@/lib/validation';
import { sha256 } from '@/lib/hash';

export const dynamic = 'force-dynamic';

export const PATCH = handle(async (req, { params }) => {
  const s = await requireRole(['institution']);
  const id = String(params.id || '');
  if (!/^\d{12}$/.test(id)) throw new HttpError(400, 'Invalid APAAR ID in URL');
  const body = await readJson(req, 5_000);

  const db = getDb();
  const cur = db.prepare('SELECT * FROM students WHERE apaar_id = ?').get(id);
  if (!cur || cur.status === 'merged' || cur.status === 'rejected') throw new HttpError(404, 'Student not found');
  if (cur.institution_id !== s.institution_id) throw new HttpError(403, 'This student belongs to another institution');

  const next = {};
  const errors = {};
  if ('name' in body) {
    const n = String(body.name).replace(/\s+/g, ' ').trim();
    if (!/^[\p{L}][\p{L} .'\-]{1,79}$/u.test(n)) errors.name = 'Name has invalid characters or length';
    else next.name = n;
  }
  if ('dob' in body) {
    const d = isValidDob(body.dob);
    if (!d.ok) errors.dob = d.error;
    else next.dob = d.value;
  }
  if ('gender' in body) {
    const g = normalizeGender(body.gender);
    if (!g) errors.gender = 'Gender must be M, F or O';
    else next.gender = g;
  }
  if ('course' in body) {
    const c = String(body.course).replace(/\s+/g, ' ').trim();
    if (!c || c.length > 80) errors.course = 'Course is required (max 80 characters)';
    else next.course = c;
  }
  if ('year' in body) {
    const y = Number(body.year);
    if (!Number.isInteger(y) || y < 1 || y > 6) errors.year = 'Year must be 1 to 6';
    else next.year = y;
  }
  if ('status' in body) {
    if (!['active', 'inactive'].includes(body.status)) errors.status = 'Status must be active or inactive';
    else if (cur.status === 'invalid') errors.status = 'Fix the APAAR ID first - this record is flagged invalid';
    else next.status = body.status;
  }
  let newId = null;
  if ('apaar_id' in body && String(body.apaar_id).replace(/[\s-]/g, '') !== id) {
    const v = validateApaarId(body.apaar_id);
    if (cur.status !== 'invalid') errors.apaar_id = 'Only records flagged invalid can have their APAAR ID corrected';
    else if (!v.ok) errors.apaar_id = v.error;
    else if (db.prepare('SELECT 1 FROM students WHERE apaar_id = ?').get(v.id)) errors.apaar_id = 'That APAAR ID already exists';
    else newId = v.id;
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Validation failed', { fields: errors });
  if (!Object.keys(next).length && !newId) throw new HttpError(400, 'Nothing to update');

  db.transaction(() => {
    const sets = Object.keys(next).map((k) => `${k} = @${k}`);
    const params = { ...next, id };
    if (newId) {
      sets.push('apaar_id = @newId', "status = 'active'");
      params.newId = newId;
    }
    db.prepare(`UPDATE students SET ${sets.join(', ')} WHERE apaar_id = @id`).run(params);
    audit('student.update', { apaar_ref: sha256(newId || id).slice(0, 12), fields: [...Object.keys(next), ...(newId ? ['apaar_id'] : [])], by_institution: s.institution_id });
  })();

  const row = db.prepare('SELECT s.*, i.name AS institution FROM students s JOIN institutions i ON i.id = s.institution_id WHERE s.apaar_id = ?').get(newId || id);
  return json({ student: row });
});
