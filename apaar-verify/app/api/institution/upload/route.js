import { getDb, audit } from '@/lib/db';
import { handle, json, readJson, requireRole, HttpError } from '@/lib/api';
import { parseCsv, CSV_HEADERS } from '@/lib/csv';
import { validateStudentRow, findDuplicateCandidates } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ROWS = 1000;

export const POST = handle(async (req) => {
  const session = await requireRole(['institution']);
  const body = await readJson(req, 1_500_000);

  let rows;
  if (typeof body.csv === 'string') {
    const parsed = parseCsv(body.csv);
    const missing = CSV_HEADERS.filter((h) => !parsed.headers.includes(h));
    if (!parsed.headers.length) throw new HttpError(400, 'The file is empty');
    if (missing.length) throw new HttpError(400, `Missing required column(s): ${missing.join(', ')}`, { expected: CSV_HEADERS });
    rows = parsed.rows;
  } else if (Array.isArray(body.rows)) {
    rows = body.rows.map((r, i) => ({ ...r, __line: i + 1 }));
  } else {
    throw new HttpError(400, 'Send { csv: "<file text>" } or { rows: [...] }');
  }
  if (!rows.length) throw new HttpError(400, 'No data rows found');
  if (rows.length > MAX_ROWS) throw new HttpError(400, `Too many rows (${rows.length}). Maximum is ${MAX_ROWS} per upload.`);

  const db = getDb();
  const instId = session.institution_id;
  const existingIds = new Set(db.prepare('SELECT apaar_id FROM students').all().map((r) => r.apaar_id));
  const pool = db
    .prepare("SELECT apaar_id, name, dob, institution_id FROM students WHERE status IN ('active','inactive','invalid')")
    .all();

  const seen = new Set();
  const results = [];
  const valid = [];
  const duplicates = [];

  for (const row of rows) {
    const line = row.__line;
    const v = validateStudentRow(row);
    const errors = [...v.errors];
    const id = v.value.apaar_id;
    if (id) {
      if (existingIds.has(id)) errors.push({ field: 'apaar_id', message: 'Exact duplicate: this APAAR ID already exists' });
      else if (seen.has(id)) errors.push({ field: 'apaar_id', message: 'Exact duplicate: repeated earlier in this file' });
    }
    if (errors.length) {
      results.push({ line, apaar_id: String(row.apaar_id ?? ''), status: 'error', errors });
      continue;
    }
    seen.add(id);
    const record = { ...v.value, institution_id: instId, course: v.value.course, year: v.value.year, status: 'active' };

    const matches = findDuplicateCandidates(record, pool);
    if (matches.length) {
      duplicates.push({
        line,
        apaar_id: id,
        name: record.name,
        matches: matches.slice(0, 3).map((m) => ({ apaar_id: m.record.apaar_id, name: m.record.name, dob: m.record.dob, similarity: m.similarity })),
      });
    }
    pool.push({ apaar_id: id, name: record.name, dob: record.dob, institution_id: instId });
    valid.push(record);
    results.push({ line, apaar_id: id, status: 'inserted', errors: [] });
  }

  if (valid.length) {
    const ins = db.prepare('INSERT INTO students (apaar_id, name, dob, gender, institution_id, course, year, status) VALUES (@apaar_id,@name,@dob,@gender,@institution_id,@course,@year,@status)');
    db.transaction(() => {
      for (const r of valid) ins.run(r);
      audit('students.upload', {
        institution_id: instId,
        total: rows.length,
        inserted: valid.length,
        rejected: rows.length - valid.length,
        fuzzy_duplicates: duplicates.length,
        sample_ids: valid.slice(0, 10).map((r) => r.apaar_id),
      });
    })();
  }

  return json({
    summary: { total: rows.length, inserted: valid.length, rejected: rows.length - valid.length, duplicate_candidates: duplicates.length },
    results,
    duplicates,
  });
});
