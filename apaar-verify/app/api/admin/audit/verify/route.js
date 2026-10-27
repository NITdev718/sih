import { getDb } from '@/lib/db';
import { handle, json, requireRole } from '@/lib/api';
import { checkChain } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Recomputes every hash from the genesis record and reports the first broken link.
export const POST = handle(async () => {
  await requireRole(['admin']);
  const started = Date.now();
  const r = checkChain(getDb());
  return json({ ...r, ms: Date.now() - started });
});
