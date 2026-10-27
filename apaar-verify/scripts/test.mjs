// Run with: npm test   (Node 20.19+ / 22+)
// Tests the pure logic: Luhn checksum, fuzzy matching, CSV parsing, seed data, and the audit hash chain.
import assert from 'node:assert/strict';
import {
  luhnValid, luhnCheckDigit, generateApaarId, validateApaarId, isValidDob, similarity,
  nameSimilarity, findDuplicatePairs, validateStudentRow, levenshtein,
} from '../lib/validation.js';
import { GENESIS, computeHash, verifyChain, sha256 } from '../lib/hash.js';
import { parseCsv, toCsv } from '../lib/csv.js';
import { generateStudents, INSTITUTIONS, demoIds } from '../lib/seed-data.js';
import { rateLimit } from '../lib/ratelimit.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e.message}`);
  }
}

console.log('Luhn / APAAR ID');
test('known Luhn vectors', () => {
  assert.equal(luhnValid('79927398713'), true);
  assert.equal(luhnValid('79927398710'), false);
  assert.equal(luhnValid('4539578763621486'), true);
});
test('generated IDs are 12 digits and valid', () => {
  for (const p of ['40000000000', '99990000001', '12345678901']) {
    const id = generateApaarId(p);
    assert.match(id, /^\d{12}$/);
    assert.equal(luhnValid(id), true);
  }
});
test('every single-digit change is caught', () => {
  const id = generateApaarId('48271936405');
  for (let pos = 0; pos < 12; pos++) {
    for (let d = 0; d < 10; d++) {
      if (String(d) === id[pos]) continue;
      assert.equal(luhnValid(id.slice(0, pos) + d + id.slice(pos + 1)), false, `pos ${pos} -> ${d}`);
    }
  }
});
test('validateApaarId messages', () => {
  assert.equal(validateApaarId('').ok, false);
  assert.match(validateApaarId('12345').error, /12 digits/);
  assert.match(validateApaarId('abcdefghijkl').error, /12 digits/);
  assert.match(validateApaarId('123456789012').error, /Checksum/);
  const good = generateApaarId('55512345678');
  assert.equal(validateApaarId(good.replace(/(\d{4})/g, '$1 ').trim()).ok, true); // spaces tolerated
});
test('luhnCheckDigit round-trips', () => {
  assert.equal(luhnCheckDigit('7992739871'), 3);
});

console.log('DOB / row validation');
test('DOB rules', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  assert.equal(isValidDob('2004-02-29', now).ok, true);
  assert.equal(isValidDob('2005-02-29', now).ok, false); // not a leap year
  assert.equal(isValidDob('2004-13-01', now).ok, false);
  assert.equal(isValidDob('04-02-2004', now).ok, false);
  assert.equal(isValidDob('2030-01-01', now).ok, false);
  assert.equal(isValidDob('2020-01-01', now).ok, false); // too young
  assert.equal(isValidDob('1900-01-01', now).ok, false); // too old
});
test('row validation collects all errors', () => {
  const bad = validateStudentRow({ apaar_id: '123', name: '', dob: 'x', gender: 'Q', course: '', year: '9' });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.errors.map((e) => e.field).sort(), ['apaar_id', 'course', 'dob', 'gender', 'name', 'year']);
  const good = validateStudentRow({ apaar_id: generateApaarId('91000000001'), name: 'Asha  Rao', dob: '2004-05-06', gender: 'female', course: 'B.Sc. Physics', year: '2' }, { now: new Date('2026-10-01') });
  assert.equal(good.ok, true);
  assert.equal(good.value.name, 'Asha Rao');
  assert.equal(good.value.gender, 'F');
});

console.log('Fuzzy matching');
test('levenshtein', () => {
  assert.equal(levenshtein('kitten', 'sitting'), 3);
  assert.equal(levenshtein('', 'abc'), 3);
});
test('name similarity is order-insensitive', () => {
  assert.equal(nameSimilarity('Rohan Sharma', 'Sharma Rohan'), 1);
  assert.ok(nameSimilarity('Rohan Sharma', 'Rohan Sharmaa') > 0.9);
  assert.ok(nameSimilarity('Rohan Sharma', 'Meera Iyer') < 0.5);
});
test('record similarity percentages', () => {
  const a = { name: 'Rohan Sharma', dob: '2005-03-14', institution_id: 3 };
  assert.equal(similarity(a, { ...a }), 100);
  assert.ok(similarity(a, { ...a, name: 'Rohan Sharmaa' }) >= 90);
  assert.equal(similarity(a, { ...a, institution_id: 1 }), 90); // same person, other institution
  assert.ok(similarity(a, { ...a, dob: '1999-01-01' }) < 85); // same name, different DOB: not a duplicate
  assert.equal(similarity(a, { ...a, dob: '2005-14-03' }) < 100, true);
});

console.log('CSV');
test('parser handles quotes, commas, CRLF, BOM', () => {
  const csv = '﻿Apaar ID,Name,DOB,Gender,Course,Year\r\n123,"Rao, Asha",2004-01-01,F,"B.Sc ""Hons""",2\r\n\r\n456,Ravi,2003-02-02,M,B.Com,1';
  const { headers, rows } = parseCsv(csv);
  assert.deepEqual(headers, ['apaar_id', 'name', 'dob', 'gender', 'course', 'year']);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, 'Rao, Asha');
  assert.equal(rows[0].course, 'B.Sc "Hons"');
  assert.equal(rows[1].__line, 4);
});
test('toCsv round-trip', () => {
  const rows = [{ a: 'x,y', b: 'say "hi"' }];
  const out = parseCsv(toCsv(['a', 'b'], rows));
  assert.equal(out.rows[0].a, 'x,y');
  assert.equal(out.rows[0].b, 'say "hi"');
});

console.log('Seed data');
test('deterministic', () => {
  assert.deepEqual(generateStudents(), generateStudents());
});
test('40 students across 5 institutions with the intended anomalies', () => {
  const s = generateStudents();
  assert.equal(s.length, 40);
  assert.equal(new Set(s.map((x) => x.institution_id)).size, INSTITUTIONS.length);
  assert.equal(new Set(s.map((x) => x.apaar_id)).size, 40);
  const invalid = s.filter((x) => x.status === 'invalid');
  assert.equal(invalid.length, 3);
  assert.ok(invalid.every((x) => !luhnValid(x.apaar_id)));
  assert.ok(s.filter((x) => x.status !== 'invalid').every((x) => luhnValid(x.apaar_id)));
});
test('exactly the 4 planted duplicates are detected, with no false positives', () => {
  const s = generateStudents();
  const pairs = findDuplicatePairs(s);
  assert.equal(pairs.length, 4, JSON.stringify(pairs.map((p) => [p.a.name, p.b.name, p.similarity])));
  const planted = new Set(s.filter((x) => x._kind === 'duplicate').map((x) => x.apaar_id));
  assert.ok(pairs.every((p) => planted.has(p.a.apaar_id) || planted.has(p.b.apaar_id)));
});
test('demo ids', () => {
  const d = demoIds();
  assert.ok(luhnValid(d.student) && luhnValid(d.verified) && luhnValid(d.pending) && luhnValid(d.notFound));
  assert.equal(luhnValid(d.badChecksum), false);
});

console.log('Audit hash chain');
function buildChain(n) {
  const rows = [];
  let prev = GENESIS;
  for (let i = 1; i <= n; i++) {
    const action = i % 2 ? 'student.update' : 'consent.approve';
    const payload = JSON.stringify({ i, ref: sha256(String(i)).slice(0, 8) });
    const ts = new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString();
    const hash = computeHash(prev, action, payload, ts);
    rows.push({ id: i, action, payload, prev_hash: prev, hash, ts });
    prev = hash;
  }
  return rows;
}
test('intact chain verifies', () => {
  const r = verifyChain(buildChain(25));
  assert.equal(r.ok, true);
  assert.equal(r.checked, 25);
  assert.equal(verifyChain([]).ok, true);
});
test('hash = sha256(prev + action + payload + ts)', () => {
  const [row] = buildChain(1);
  assert.equal(row.hash, sha256(`${GENESIS}${row.action}${row.payload}${row.ts}`));
  assert.equal(row.hash.length, 64);
});
test('editing a record reports THAT record as the first broken link', () => {
  const rows = buildChain(10);
  rows[4].payload = '{"i":5,"ref":"forged"}';
  const r = verifyChain(rows);
  assert.equal(r.ok, false);
  assert.equal(r.brokenAt, 5);
  assert.match(r.reason, /modified/);
});
test('re-hashing a forged record still breaks the NEXT link', () => {
  const rows = buildChain(10);
  rows[4].payload = '{"forged":true}';
  rows[4].hash = computeHash(rows[4].prev_hash, rows[4].action, rows[4].payload, rows[4].ts);
  const r = verifyChain(rows);
  assert.equal(r.ok, false);
  assert.equal(r.brokenAt, 6);
});
test('deleting a record breaks the chain at the following row', () => {
  const rows = buildChain(10);
  rows.splice(3, 1);
  assert.equal(verifyChain(rows).brokenAt, 5);
});
test('first of several tampered rows is reported', () => {
  const rows = buildChain(12);
  rows[8].action = 'x';
  rows[2].ts = 'x';
  assert.equal(verifyChain(rows).brokenAt, 3);
});

console.log('Rate limiter');
test('blocks after the limit and reports retryAfter', () => {
  const key = `t:${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 60_000).ok, true);
  const r = rateLimit(key, 3, 60_000);
  assert.equal(r.ok, false);
  assert.ok(r.retryAfter >= 1 && r.retryAfter <= 60);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
