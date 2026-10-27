// Wipes data/apaar.db and reseeds it (deterministic). Usage: npm run seed
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../lib/db.js';

const base = path.join(process.cwd(), 'data', 'apaar.db');
for (const f of [base, `${base}-wal`, `${base}-shm`]) fs.rmSync(f, { force: true });
const db = getDb();
console.log('Seeded:', db.prepare('SELECT COUNT(*) c FROM students').get().c, 'students,', db.prepare('SELECT COUNT(*) c FROM audit_log').get().c, 'audit rows');
