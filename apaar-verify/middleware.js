import { NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { PAGE_ROLES } from '@/lib/constants';

// Role-based page protection. API routes enforce roles again on the server.
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const prefix = Object.keys(PAGE_ROLES).find((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!prefix) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', pathname);

  if (!session) return NextResponse.redirect(url);
  if (!PAGE_ROLES[prefix].includes(session.role)) {
    url.searchParams.set('reason', 'forbidden');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/institution/:path*', '/student/:path*', '/verify/:path*', '/admin/:path*'],
};
