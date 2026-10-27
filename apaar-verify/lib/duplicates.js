import { findDuplicatePairs } from './validation.js';

export function pairKey(a, b) {
  return a < b ? [a, b] : [b, a];
}

/** Open duplicate candidates (>= threshold) not yet decided with "keep both". */
export function listDuplicatePairs(db, institutionId = null) {
  const rows = db
    .prepare(
      `SELECT s.apaar_id, s.name, s.dob, s.gender, s.institution_id, s.course, s.year, s.status, i.name AS institution
       FROM students s JOIN institutions i ON i.id = s.institution_id
       WHERE s.status IN ('active','inactive','invalid')`,
    )
    .all();
  const kept = new Set(db.prepare("SELECT a, b FROM dup_decisions WHERE decision = 'keep'").all().map((r) => `${r.a}|${r.b}`));
  return findDuplicatePairs(rows)
    .filter((p) => !kept.has(pairKey(p.a.apaar_id, p.b.apaar_id).join('|')))
    .filter((p) => institutionId == null || p.a.institution_id === institutionId || p.b.institution_id === institutionId);
}
