// Pure validation helpers (no dependencies) - shared by API routes, UI and the node test script.

export const CONSENT_FIELDS = ['name', 'dob', 'gender', 'institution', 'course', 'year', 'status'];
export const GENDERS = ['M', 'F', 'O'];
export const DUPLICATE_THRESHOLD = 85;

/* ---------------------------- APAAR ID + Luhn ---------------------------- */

export function luhnValid(digits) {
  const s = String(digits);
  if (!/^\d+$/.test(s)) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = s.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Check digit that makes `payload + digit` pass the Luhn test. */
export function luhnCheckDigit(payload) {
  const s = String(payload);
  let sum = 0;
  let alt = true; // rightmost payload digit is doubled once the check digit is appended
  for (let i = s.length - 1; i >= 0; i--) {
    let d = s.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return (10 - (sum % 10)) % 10;
}

/** Build a valid 12-digit APAAR ID from an 11-digit payload. */
export function generateApaarId(payload11) {
  const p = String(payload11);
  if (!/^\d{11}$/.test(p)) throw new Error('payload must be 11 digits');
  return p + luhnCheckDigit(p);
}

export function cleanApaarId(raw) {
  return String(raw ?? '').replace(/[\s-]/g, '');
}

export function validateApaarId(raw) {
  const id = cleanApaarId(raw);
  if (!id) return { ok: false, error: 'APAAR ID is required' };
  if (!/^\d{12}$/.test(id)) return { ok: false, error: 'APAAR ID must be exactly 12 digits' };
  if (!luhnValid(id)) return { ok: false, error: 'Checksum (Luhn) failed - check for a typo' };
  return { ok: true, id };
}

export function formatApaarId(id) {
  return String(id).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/* --------------------------------- DOB ---------------------------------- */

export function isValidDob(s, now = new Date()) {
  const str = String(s ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return { ok: false, error: 'DOB must be YYYY-MM-DD' };
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { ok: false, error: 'DOB is not a real calendar date' };
  }
  if (dt.getTime() > now.getTime()) return { ok: false, error: 'DOB is in the future' };
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() < m - 1 || (now.getUTCMonth() === m - 1 && now.getUTCDate() < d)) age--;
  if (age < 14 || age > 70) return { ok: false, error: `Age ${age} is outside the expected range (14-70)` };
  return { ok: true, value: str, age };
}

export function normalizeGender(g) {
  const v = String(g ?? '').trim().toLowerCase();
  if (['m', 'male', 'man'].includes(v)) return 'M';
  if (['f', 'female', 'woman'].includes(v)) return 'F';
  if (['o', 'other', 'others', 'nb', 'non-binary', 'x'].includes(v)) return 'O';
  return null;
}

/* ------------------------------ Row validation --------------------------- */

const NAME_RE = /^[\p{L}][\p{L} .'\-]{1,79}$/u;

export function validateStudentRow(row, { now = new Date() } = {}) {
  const errors = [];
  const value = {};

  const id = validateApaarId(row.apaar_id);
  if (!id.ok) errors.push({ field: 'apaar_id', message: id.error });
  else value.apaar_id = id.id;

  const name = String(row.name ?? '').replace(/\s+/g, ' ').trim();
  if (!name) errors.push({ field: 'name', message: 'Name is required' });
  else if (!NAME_RE.test(name)) errors.push({ field: 'name', message: 'Name has invalid characters or length' });
  else value.name = name;

  const dob = isValidDob(row.dob, now);
  if (!String(row.dob ?? '').trim()) errors.push({ field: 'dob', message: 'DOB is required' });
  else if (!dob.ok) errors.push({ field: 'dob', message: dob.error });
  else value.dob = dob.value;

  const gender = normalizeGender(row.gender);
  if (!String(row.gender ?? '').trim()) errors.push({ field: 'gender', message: 'Gender is required' });
  else if (!gender) errors.push({ field: 'gender', message: 'Gender must be M, F or O' });
  else value.gender = gender;

  const course = String(row.course ?? '').replace(/\s+/g, ' ').trim();
  if (!course) errors.push({ field: 'course', message: 'Course is required' });
  else if (course.length > 80) errors.push({ field: 'course', message: 'Course is too long (max 80)' });
  else value.course = course;

  const yearRaw = String(row.year ?? '').trim();
  const year = Number(yearRaw);
  if (!yearRaw) errors.push({ field: 'year', message: 'Year is required' });
  else if (!Number.isInteger(year) || year < 1 || year > 6) errors.push({ field: 'year', message: 'Year must be a whole number from 1 to 6' });
  else value.year = year;

  return { ok: errors.length === 0, errors, value };
}

export function sanitizeFields(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(String))].filter((f) => CONSENT_FIELDS.includes(f));
}

/* ----------------------------- Fuzzy matching ---------------------------- */

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'shri', 'smt', 'kumari', 'dr']);

export function normalizeName(n) {
  const tokens = String(n ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !HONORIFICS.has(t));
  return tokens.sort().join(' '); // token-sort so "Sharma Rohan" == "Rohan Sharma"
}

/** 0..1 */
export function nameSimilarity(a, b) {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  const max = Math.max(x.length, y.length);
  return 1 - levenshtein(x, y) / max;
}

/** 0..1 : exact match = 1, day/month transposed = 0.7, otherwise 0. */
export function dobSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const pa = String(a).split('-');
  const pb = String(b).split('-');
  if (pa.length === 3 && pb.length === 3 && pa[0] === pb[0] && pa[1] === pb[2] && pa[2] === pb[1]) return 0.7;
  return 0;
}

/** Record similarity as a whole-number percentage: name 60% + DOB 30% + institution 10%. */
export function similarity(a, b) {
  const n = nameSimilarity(a.name, b.name);
  const d = dobSimilarity(a.dob, b.dob);
  const i = Number(a.institution_id) === Number(b.institution_id) ? 1 : 0;
  return Math.round((0.6 * n + 0.3 * d + 0.1 * i) * 100);
}

export function findDuplicateCandidates(candidate, pool, threshold = DUPLICATE_THRESHOLD) {
  const out = [];
  for (const rec of pool) {
    if (rec.apaar_id === candidate.apaar_id) continue;
    const s = similarity(candidate, rec);
    if (s >= threshold) out.push({ record: rec, similarity: s });
  }
  return out.sort((x, y) => y.similarity - x.similarity);
}

/** All unordered pairs in `students` at or above the threshold. */
export function findDuplicatePairs(students, threshold = DUPLICATE_THRESHOLD) {
  const live = students.filter((s) => s.status !== 'merged' && s.status !== 'rejected');
  const pairs = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const s = similarity(live[i], live[j]);
      if (s >= threshold) pairs.push({ a: live[i], b: live[j], similarity: s });
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity);
}
