// Seeds the SQLite database with synthetic, fictional data (deterministic PRNG - see seed-data.js).
import bcrypt from 'bcryptjs';
import { INSTITUTIONS, DEMO_ACCOUNTS, generateStudents, mulberry32, SEED } from './seed-data.js';
import { generateApaarId } from './validation.js';
import { sha256 } from './hash.js';
import { appendAuditTo } from './audit.js';
import { DEMO_PASSWORD } from './constants.js';

const DAY = 86_400_000;

export function seedDatabase(db) {
  const rng = mulberry32(SEED + 1);
  const now = Date.now();
  const iso = (t) => new Date(t).toISOString();
  const students = generateStudents();
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const run = db.transaction(() => {
    const insInst = db.prepare('INSERT INTO institutions (id, name, city, state, udise_code) VALUES (?,?,?,?,?)');
    for (const i of INSTITUTIONS) insInst.run(i.id, i.name, i.city, i.state, i.udise);

    const insStu = db.prepare('INSERT INTO students (apaar_id, name, dob, gender, institution_id, course, year, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    for (const s of students) insStu.run(s.apaar_id, s.name, s.dob, s.gender, s.institution_id, s.course, s.year, s.status, iso(now - 20 * DAY));

    const insUser = db.prepare('INSERT INTO users (email, password_hash, role, institution_id, apaar_id, display_name) VALUES (?,?,?,?,?,?)');
    const userId = {};
    for (const a of DEMO_ACCOUNTS) {
      const apaar = a.student_idx != null ? students[a.student_idx].apaar_id : null;
      const r = insUser.run(a.email, hash, a.role, a.institution_id, apaar, a.display_name);
      userId[a.email] = Number(r.lastInsertRowid);
    }
    const V = userId['verifier@apaar.test'];
    const R = userId['recruiter@apaar.test'];
    const X = userId['scraper@apaar.test'];

    // Consents
    const insCon = db.prepare('INSERT INTO consents (apaar_id, verifier_id, fields_json, status, expires_at, created_at, decided_at) VALUES (?,?,?,?,?,?,?)');
    const con = (idx, vid, fields, status, createdDaysAgo, expiresInDays) =>
      insCon.run(
        students[idx].apaar_id, vid, JSON.stringify(fields), status,
        expiresInDays == null ? null : iso(now + expiresInDays * DAY),
        iso(now - createdDaysAgo * DAY),
        status === 'pending' ? null : iso(now - (createdDaysAgo - 0.1) * DAY),
      );
    con(0, R, ['name', 'course', 'year'], 'approved', 5, 20); // demo student -> recruiter (revoke demo)
    con(0, X, ['name', 'dob', 'gender'], 'denied', 4, null);
    con(0, V, ['name', 'course'], 'expired', 40, -10); // old consent for the demo verifier has lapsed
    con(1, V, ['name', 'institution', 'course', 'year', 'status'], 'approved', 3, 25); // instant "Verified" demo
    con(4, V, ['name', 'dob', 'course'], 'pending', 1, null); // pending request demo
    con(3, V, ['dob', 'gender'], 'denied', 6, null);

    // Access log
    const insLog = db.prepare('INSERT INTO access_log (verifier_id, apaar_id, result, ts) VALUES (?,?,?,?)');
    const log = (vid, apaar, result, t) => insLog.run(vid, apaar, result, iso(t));
    const s0 = students[0].apaar_id;
    const s1 = students[1].apaar_id;
    log(V, s0, 'consent_required', now - 6 * DAY);
    log(R, s0, 'consent_required', now - 5.2 * DAY);
    log(R, s0, 'verified', now - 4.9 * DAY);
    log(X, s0, 'consent_required', now - 1 * DAY);
    log(V, s1, 'verified', now - 1.5 * DAY);
    const pool = students.filter((s) => s.status === 'active');
    for (let k = 0; k < 14; k++) log(k % 2 ? V : R, k % 3 ? s1 : s0, 'verified', now - (0.3 + rng() * 13) * DAY);
    for (let k = 0; k < 70; k++) {
      const vid = rng() < 0.55 ? V : R;
      const t = now - (0.2 + rng() * 13.5) * DAY;
      if (rng() < 0.62) log(vid, pool[Math.floor(rng() * pool.length)].apaar_id, 'consent_required', t);
      else log(vid, generateApaarId('9' + String(Math.floor(rng() * 1e10)).padStart(10, '0')), 'not_found', t);
    }
    // Suspicious burst: one verifier enumerating IDs in the last hour -> raises an anomaly alert
    for (let k = 0; k < 26; k++) {
      log(X, generateApaarId('8' + String(Math.floor(rng() * 1e10)).padStart(10, '0')), 'not_found', now - (2 + rng() * 52) * 60_000);
    }

    // Audit chain (backdated timestamps so the viewer looks realistic)
    let t = now - 6 * DAY;
    const a = (action, payload) => {
      appendAuditTo(db, action, payload, iso(t));
      t += 17 * 60_000 + Math.floor(rng() * 40) * 60_000;
    };
    a('system.init', { version: '1.0.0', seed: SEED, note: 'synthetic demo data' });
    for (const i of INSTITUTIONS) a('institution.register', { institution_id: i.id, udise: i.udise });
    for (const i of INSTITUTIONS) {
      a('students.bulk_insert', { institution_id: i.id, count: students.filter((s) => s.institution_id === i.id).length, source: 'seed' });
    }
    for (const a2 of DEMO_ACCOUNTS) a('user.create', { role: a2.role, user_ref: sha256(a2.email).slice(0, 12) });
    a('consent.request', { apaar_ref: sha256(students[4].apaar_id).slice(0, 12), verifier_id: V });
    a('consent.approve', { apaar_ref: sha256(s1).slice(0, 12), verifier_id: V });
    a('consent.approve', { apaar_ref: sha256(s0).slice(0, 12), verifier_id: R });
    a('consent.deny', { apaar_ref: sha256(s0).slice(0, 12), verifier_id: X });
    a('student.update', { apaar_ref: sha256(students[9].apaar_id).slice(0, 12), fields: ['status'] });
  });
  run();
}
