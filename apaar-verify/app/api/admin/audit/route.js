import { getDb } from '@/lib/db';
import { handle, json, requireRole, intParam } from '@/lib/api';
import { checkChain } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req) => {
  await requireRole(['admin']);
  const url = new URL(req.url);
  const page = intParam(url, 'page', 1, 1, 100000);
  const pageSize = intParam(url, 'pageSize', 12, 1, 50);
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) c FROM audit_log').get().c;
  const rows = db.prepare('SELECT id, action, payload, prev_hash, hash, ts FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, (page - 1) * pageSize);
  const chain = checkChain(db);
  return json({ rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), chain: { ok: chain.ok, brokenAt: chain.brokenAt } });
});
