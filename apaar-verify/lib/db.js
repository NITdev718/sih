// SQLite (better-sqlite3). The file data/apaar.db is created and seeded automatically on first use.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from './seed.js';
import { appendAuditTo } from './audit.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  udise_code TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('institution','student','verifier','admin')),
  institution_id INTEGER REFERENCES institutions(id),
  apaar_id TEXT,            -- extension: links a student login to its record
  display_name TEXT         -- extension: friendly name for the UI
);
CREATE TABLE IF NOT EXISTS students (
  apaar_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dob TEXT NOT NULL,
  gender TEXT NOT NULL,
  institution_id INTEGER NOT NULL REFERENCES institutions(id),
  course TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | inactive | invalid | merged | rejected
  merged_into TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apaar_id TEXT NOT NULL,
  verifier_id INTEGER NOT NULL REFERENCES users(id),
  fields_json TEXT NOT NULL,
  status TEXT NOT NULL,      -- pending | approved | denied | revoked | expired
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verifier_id INTEGER NOT NULL REFERENCES users(id),
  apaar_id TEXT NOT NULL,
  result TEXT NOT NULL,      -- verified | consent_required | not_found | invalid | tampered
  ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dup_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  a TEXT NOT NULL,
  b TEXT NOT NULL,
  decision TEXT NOT NULL,
  ts TEXT NOT NULL,
  UNIQUE (a, b)
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX IF NOT EXISTS idx_students_inst ON students(institution_id);
CREATE INDEX IF NOT EXISTS idx_consents_apaar ON consents(apaar_id);
CREATE INDEX IF NOT EXISTS idx_access_apaar ON access_log(apaar_id);
CREATE INDEX IF NOT EXISTS idx_access_ts ON access_log(ts);
`;

export function getDb() {
  if (globalThis.__apaarDb) return globalThis.__apaarDb;
  const file = process.env.APAAR_DB_PATH || path.join(process.cwd(), 'data', 'apaar.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (c === 0) seedDatabase(db); // first request: create demo data
  globalThis.__apaarDb = db;
  return db;
}

/** Append a hash-chained audit row for a state-changing action. */
export function audit(action, payload = {}) {
  return appendAuditTo(getDb(), action, payload);
}

export function nowIso() {
  return new Date().toISOString();
}
