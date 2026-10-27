import { CONSENT_FIELDS } from './validation.js';

/** Mark approved consents whose expiry has passed. */
export function expireConsents(db) {
  db.prepare("UPDATE consents SET status = 'expired' WHERE status = 'approved' AND expires_at IS NOT NULL AND expires_at < ?").run(new Date().toISOString());
}

/** Return ONLY the consented fields of a student record - never the whole row. */
export function projectFields(student, institutionName, fields) {
  const src = {
    name: student.name,
    dob: student.dob,
    gender: student.gender,
    institution: institutionName,
    course: student.course,
    year: student.year,
    status: student.status,
  };
  const out = {};
  for (const f of fields) if (CONSENT_FIELDS.includes(f)) out[f] = src[f];
  return out;
}

export function shapeConsent(row) {
  return {
    id: row.id,
    apaar_id: row.apaar_id,
    verifier: { id: row.verifier_id, name: row.display_name || row.email, email: row.email },
    fields: JSON.parse(row.fields_json),
    status: row.status,
    expires_at: row.expires_at,
    created_at: row.created_at,
    decided_at: row.decided_at,
  };
}
