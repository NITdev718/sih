import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { handle, json } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Returns { user: null } (HTTP 200) when signed out so the navbar can poll quietly.
export const GET = handle(async () => {
  const s = await getSession();
  if (!s) return json({ user: null });
  const user = getDb().prepare('SELECT id, email, role, institution_id, apaar_id, display_name FROM users WHERE id = ?').get(s.uid);
  return json({ user: user || null });
});
