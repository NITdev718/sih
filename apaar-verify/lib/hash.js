// Tamper-evident audit chain. hash = SHA-256(prev_hash + action + payload + ts)
import { createHash } from 'node:crypto';

export const GENESIS = '0'.repeat(64);

export function sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

export function computeHash(prevHash, action, payload, ts) {
  return sha256(`${prevHash}${action}${payload}${ts}`);
}

/**
 * Recompute the chain over rows sorted by id ascending.
 * Returns the FIRST broken link, if any.
 */
export function verifyChain(rows) {
  let prev = GENESIS;
  for (const r of rows) {
    if (r.prev_hash !== prev) {
      return { ok: false, brokenAt: r.id, reason: 'Link broken: prev_hash does not match the previous record (a record was removed or re-ordered).', checked: rows.length };
    }
    if (computeHash(r.prev_hash, r.action, r.payload, r.ts) !== r.hash) {
      return { ok: false, brokenAt: r.id, reason: 'Hash mismatch: this record was modified after it was written.', checked: rows.length };
    }
    prev = r.hash;
  }
  return { ok: true, brokenAt: null, reason: null, checked: rows.length };
}
