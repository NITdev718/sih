// Sample CSV for the institution upload demo: valid rows plus a few deliberate problems.
import { generateApaarId } from './validation.js';
import { CSV_HEADERS, toCsv } from './csv.js';

export function buildSampleCsv() {
  const id = (n) => generateApaarId(`9100000${String(n).padStart(4, '0')}`);
  const row = (n, name, dob, gender, course, year) => ({ apaar_id: id(n), name, dob, gender, course, year });
  const badChecksum = id(6).slice(0, 11) + ((Number(id(6)[11]) + 1) % 10);

  const rows = [
    row(1, 'Kavya Pawar', '2005-04-12', 'F', 'B.Tech Computer Science', 2),
    row(2, 'Tejas Bhosale', '2004-11-03', 'M', 'B.Tech Electronics', 3),
    row(3, 'Mrunal Gokhale', '2006-01-25', 'F', 'B.Tech Mechanical', 1),
    row(4, 'Omkar Jadhav', '2005-08-30', 'M', 'B.Tech Computer Science', 2),
    row(5, 'Kavya Pavar', '2005-04-12', 'F', 'B.Tech Computer Science', 2), // fuzzy duplicate of row 1 (name typo)
    { apaar_id: badChecksum, name: 'Harsh Kulkarni', dob: '2005-02-14', gender: 'M', course: 'B.Tech Mechanical', year: 2 }, // bad checksum
    row(7, 'Riya Joshi', '2005-02-31', 'F', 'B.Tech Electronics', 2), // impossible date
    row(8, '', '2004-09-09', '', 'B.Tech Computer Science', 3), // missing name + gender
  ];
  return toCsv(CSV_HEADERS, rows);
}
