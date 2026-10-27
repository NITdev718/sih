// Deterministic synthetic data (fixed PRNG seed). Nothing here is real - all names and IDs are fictional.
import { generateApaarId, luhnCheckDigit } from './validation.js';

export const SEED = 20260926;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const INSTITUTIONS = [
  { id: 1, name: 'Aryabhata Institute of Technology', city: 'Pune', state: 'Maharashtra', udise: '27250100101', courses: ['B.Tech Computer Science', 'B.Tech Electronics', 'B.Tech Mechanical'], maxYear: 4 },
  { id: 2, name: 'Kalinga College of Arts & Science', city: 'Bhubaneswar', state: 'Odisha', udise: '21140200202', courses: ['B.A. Economics', 'B.Sc. Physics', 'B.Sc. Mathematics'], maxYear: 3 },
  { id: 3, name: 'Vindhya Institute of Management', city: 'Bhopal', state: 'Madhya Pradesh', udise: '23310300303', courses: ['MBA Finance', 'MBA Marketing', 'BBA'], maxYear: 2 },
  { id: 4, name: 'Sahyadri Polytechnic', city: 'Mangaluru', state: 'Karnataka', udise: '29180400404', courses: ['Diploma Civil Engineering', 'Diploma Electrical', 'Diploma Computer Engineering'], maxYear: 3 },
  { id: 5, name: 'Vaigai Government College', city: 'Madurai', state: 'Tamil Nadu', udise: '33250500505', courses: ['B.Com', 'B.Sc. Chemistry', 'B.A. English'], maxYear: 3 },
];

const MALE = ['Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Karthik', 'Aditya', 'Rahul', 'Siddharth', 'Kabir', 'Ishaan', 'Manoj', 'Nikhil', 'Pranav', 'Varun', 'Harsh', 'Deepak', 'Suresh', 'Vignesh', 'Tejas', 'Omkar'];
const FEMALE = ['Ananya', 'Diya', 'Saanvi', 'Meera', 'Priya', 'Kavya', 'Isha', 'Nandini', 'Pooja', 'Shreya', 'Lakshmi', 'Aditi', 'Riya', 'Sneha', 'Tanvi', 'Divya', 'Anjali', 'Swathi', 'Mrunal', 'Smita'];
const SURNAMES = {
  1: ['Patil', 'Kulkarni', 'Deshmukh', 'Joshi', 'Pawar', 'Jadhav', 'Gokhale', 'Bhosale'],
  2: ['Mohanty', 'Panda', 'Behera', 'Nayak', 'Sahoo', 'Mishra', 'Patnaik', 'Pradhan'],
  3: ['Sharma', 'Verma', 'Tiwari', 'Chouhan', 'Yadav', 'Dubey', 'Gupta', 'Jain'],
  4: ['Shetty', 'Hegde', 'Bhat', 'Naik', 'Rao', 'Kamath', 'Poojary', 'Gowda'],
  5: ['Iyer', 'Subramanian', 'Raman', 'Pillai', 'Nadar', 'Krishnan', 'Murugan', 'Venkatesh'],
};

// Hand-picked people so the demo flow is stable.
const FIXED = {
  0: { first: 'Ananya', last: 'Deshmukh', gender: 'F' }, // demo student (Institution 1)
  1: { first: 'Subhashree', last: 'Mohanty', gender: 'F' }, // pre-approved consent -> "Verified"
  2: { first: 'Rohan', last: 'Sharma', gender: 'M' }, // duplicate source (typo variant)
  4: { first: 'Vignesh', last: 'Murugan', gender: 'M' }, // pending consent request
};

const INVALID_IDX = [7, 19, 30]; // records whose APAAR ID fails the checksum
const INACTIVE_IDX = [9, 22];
const DUP_SOURCES = [2, 11, 16, 25];
const PEOPLE = 36; // 36 base records + 4 duplicates = 40

export function generateStudents() {
  const rng = mulberry32(SEED);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const usedIds = new Set();
  const usedNames = new Set();
  const people = [];

  for (let i = 0; i < PEOPLE; i++) {
    const inst = INSTITUTIONS[i % INSTITUTIONS.length];
    let first, last, gender;
    if (FIXED[i]) ({ first, last, gender } = FIXED[i]);
    else {
      let guard = 0;
      do {
        gender = rng() < 0.5 ? 'M' : 'F';
        first = pick(gender === 'M' ? MALE : FEMALE);
        last = pick(SURNAMES[inst.id]);
        guard++;
      } while (usedNames.has(`${first} ${last}`) && guard < 50);
    }
    usedNames.add(`${first} ${last}`);

    let apaar;
    do {
      const lead = 4 + Math.floor(rng() * 5); // 4-8; the sample CSV uses 9...
      let payload = String(lead);
      for (let k = 0; k < 10; k++) payload += Math.floor(rng() * 10);
      apaar = generateApaarId(payload);
    } while (usedIds.has(apaar));
    usedIds.add(apaar);

    const year = 1 + Math.floor(rng() * inst.maxYear);
    const birthYear = 2007 - year - (rng() < 0.35 ? 1 : 0);
    const month = 1 + Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    const dob = `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    people.push({
      apaar_id: apaar,
      name: `${first} ${last}`,
      dob,
      gender,
      institution_id: inst.id,
      course: pick(inst.courses),
      year,
      status: INACTIVE_IDX.includes(i) ? 'inactive' : 'active',
      _kind: 'clean',
      _first: first,
      _last: last,
    });
  }

  // Deliberately invalid APAAR IDs: flip the check digit so the Luhn test fails.
  for (const i of INVALID_IDX) {
    const p = people[i];
    const base = p.apaar_id.slice(0, 11);
    p.apaar_id = base + ((luhnCheckDigit(base) + 3) % 10);
    p.status = 'invalid';
    p._kind = 'invalid';
  }

  // Deliberate duplicates with different (valid) IDs.
  const dups = DUP_SOURCES.map((srcIdx, n) => {
    const src = people[srcIdx];
    let name = src.name;
    let institution_id = src.institution_id;
    let course = src.course;
    if (n === 0) name = `${src._first} ${src._last}a`; // typo: Sharmaa
    if (n === 1) name = `${src._last} ${src._first}`; // surname first
    if (n === 2) {
      // same person enrolled at a second institution
      institution_id = src.institution_id === 5 ? 1 : src.institution_id + 3 > 5 ? src.institution_id - 2 : src.institution_id + 3;
      course = INSTITUTIONS[institution_id - 1].courses[0];
    }
    if (n === 3) name = src.name.replace(/(\w)\1?(h|a)\b/, '$1$2').replace('dd', 'd').replace('ar', 'r'); // small spelling drift
    if (n === 3 && name === src.name) name = src.name.slice(0, 3) + src.name.slice(4); // fallback: drop a letter

    let apaar;
    do {
      let payload = String(4 + Math.floor(rng() * 5));
      for (let k = 0; k < 10; k++) payload += Math.floor(rng() * 10);
      apaar = generateApaarId(payload);
    } while (usedIds.has(apaar));
    usedIds.add(apaar);

    return { apaar_id: apaar, name, dob: src.dob, gender: src.gender, institution_id, course, year: src.year, status: 'active', _kind: 'duplicate', _of: src.apaar_id };
  });

  return [...people, ...dups].map(({ _first, _last, ...rest }) => rest);
}

export const DEMO_ACCOUNTS = [
  { email: 'institution@apaar.test', role: 'institution', display_name: 'Registrar, Aryabhata Institute', institution_id: 1, student_idx: null },
  { email: 'student@apaar.test', role: 'student', display_name: 'Ananya Deshmukh', institution_id: 1, student_idx: 0 },
  { email: 'verifier@apaar.test', role: 'verifier', display_name: 'BharatBank - Onboarding Desk', institution_id: null, student_idx: null },
  { email: 'admin@apaar.test', role: 'admin', display_name: 'Platform Administrator', institution_id: null, student_idx: null },
  { email: 'recruiter@apaar.test', role: 'verifier', display_name: 'Nirman Corp - Campus Hiring', institution_id: null, student_idx: null },
  { email: 'scraper@apaar.test', role: 'verifier', display_name: 'DataHarvest Agency (suspicious)', institution_id: null, student_idx: null },
];

/** Demo shortcuts surfaced in the UI and README (fictional IDs only). */
export function demoIds(students = generateStudents()) {
  const notFoundPayload = '99990000001';
  const notFound = generateApaarId(notFoundPayload);
  return {
    student: students[0].apaar_id, // demo student: no consent from the demo verifier yet
    verified: students[1].apaar_id, // consent pre-approved for the demo verifier
    pending: students[4].apaar_id, // request already pending
    notFound,
    badChecksum: notFound.slice(0, 11) + ((Number(notFound[11]) + 1) % 10),
  };
}
