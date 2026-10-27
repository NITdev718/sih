// Shared helpers for Route Handlers: error mapping, JSON body parsing, role enforcement.
import { NextResponse } from 'next/server';
import { getSession } from './auth.js';

export class HttpError extends Error {
  constructor(status, message, extra = {}, headers = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
    this.headers = headers;
  }
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status, headers: { 'Cache-Control': 'no-store', ...e.headers } });
      }
      console.error('[api]', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export async function readJson(req, maxChars = 200_000) {
  const text = await req.text();
  if (text.length > maxChars) throw new HttpError(413, 'Request body too large');
  if (!text.trim()) return {};
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, 'Request body must be a JSON object');
  return v;
}

export async function requireRole(roles) {
  const s = await getSession();
  if (!s) throw new HttpError(401, 'Please sign in');
  if (roles && !roles.includes(s.role)) throw new HttpError(403, 'Your role cannot access this resource');
  return s;
}

export function clientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

export function intParam(url, name, def, min, max) {
  const n = parseInt(url.searchParams.get(name) ?? '', 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}
