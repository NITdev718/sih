// Minimal RFC-4180 style CSV parser / writer (no dependencies).

const ALIASES = {
  apaarid: 'apaar_id',
  apaar: 'apaar_id',
  id: 'apaar_id',
  full_name: 'name',
  student_name: 'name',
  date_of_birth: 'dob',
  birth_date: 'dob',
  sex: 'gender',
  programme: 'course',
  program: 'course',
  semester_year: 'year',
};

export const CSV_HEADERS = ['apaar_id', 'name', 'dob', 'gender', 'course', 'year'];

function normHeader(h) {
  const k = String(h).replace(/^﻿/, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ALIASES[k] || ALIASES[k.replace(/_/g, '')] || k;
}

export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const records = [];
  const lines = []; // physical line number where each record starts
  let row = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let rowStart = 1;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (c === '\n') line++;
        field += c;
      }
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      records.push(row);
      lines.push(rowStart);
      row = [];
      line++;
      rowStart = line;
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    records.push(row);
    lines.push(rowStart);
  }

  const keep = records.map((r, i) => ({ cells: r, line: lines[i] })).filter((r) => r.cells.some((cell) => String(cell).trim() !== ''));
  if (!keep.length) return { headers: [], rows: [] };
  const headers = keep[0].cells.map(normHeader);
  const rows = keep.slice(1).map(({ cells, line: ln }) => {
    const obj = { __line: ln };
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? '').trim()));
    return obj;
  });
  return { headers, rows };
}

function esc(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers, rows) {
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n') + '\n';
}
