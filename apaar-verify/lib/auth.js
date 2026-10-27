// JWT session in an httpOnly cookie (jose). Password hashing lives in the login route (bcryptjs).
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const COOKIE_NAME = 'apaar_token';
const MAX_AGE = 60 * 60 * 8; // 8 hours

// The app runs with a dev default so `npm run dev` needs no setup. Set JWT_SECRET for anything real.
const DEV_SECRET = 'dev-only-secret-change-me-before-deploying-0123456789';
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || DEV_SECRET);

export async function signSession(user) {
  return new SignJWT({
    uid: user.id,
    role: user.role,
    email: user.email,
    institution_id: user.institution_id ?? null,
    apaar_id: user.apaar_id ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export function setSessionCookie(token) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true', // set to true behind HTTPS
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}
