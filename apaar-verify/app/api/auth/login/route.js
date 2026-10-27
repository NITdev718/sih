import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signSession, setSessionCookie } from '@/lib/auth';
import { handle, json, readJson, HttpError, clientIp } from '@/lib/api';
import { rateLimit } from '@/lib/ratelimit';
import { ROLE_HOME } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Compared against when the e-mail is unknown, so response time does not reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const POST = handle(async (req) => {
  const body = await readJson(req, 5_000);
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!email || !password) throw new HttpError(400, 'Email and password are required');
  if (email.length > 254 || password.length > 200) throw new HttpError(400, 'Email or password is too long');

  const rl = rateLimit(`login:${clientIp(req)}:${email}`, 8, 60_000);
  if (!rl.ok) {
    throw new HttpError(429, `Too many sign-in attempts. Try again in ${rl.retryAfter}s.`, { retryAfter: rl.retryAfter }, { 'Retry-After': String(rl.retryAfter) });
  }

  const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
  const ok = bcrypt.compareSync(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password');

  setSessionCookie(await signSession(user));
  return json({
    user: { id: user.id, email: user.email, role: user.role, display_name: user.display_name, institution_id: user.institution_id },
    home: ROLE_HOME[user.role],
  });
});
