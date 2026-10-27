// Hash-chained audit log helpers. Kept separate from db.js so the seeder can use them without a circular import.
import { GENESIS, computeHash, verifyChain } from './hash.js';

export function appendAuditTo(db, action, payload = {}, ts = new Date().toISOString()) {
  const run = db.transaction(() => {
    const last = db.prepare('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1').get();
    const prev = last ? last.hash : GENESIS;
    const body = JSON.stringify(payload);
    const hash = computeHash(prev, action, body, ts);
    db.prepare('INSERT INTO audit_log (action, payload, prev_hash, hash, ts) VALUES (?, ?, ?, ?, ?)').run(action, body, prev, hash, ts);
    return hash;
  });
  return run();
}

export function checkChain(db) {
  const rows = db.prepare('SELECT id, action, payload, prev_hash, hash, ts FROM audit_log ORDER BY id ASC').all();
  return verifyChain(rows);
}
