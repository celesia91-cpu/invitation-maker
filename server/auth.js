// server/auth.js
// Basic JWT validation without external dependencies.

import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

function constantTimeEqual(a = '', b = '') {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getCookie(cookieHeader = '', name) {
  for (const part of cookieHeader.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k && constantTimeEqual(k, name)) return v;
  }
  return '';
}

function verifyJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expected = createHmac('sha256', SECRET).update(data).digest('base64url');
  const sig = Buffer.from(sigB64, 'base64url');
  const exp = Buffer.from(expected, 'base64url');
  if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
    throw new Error('Invalid signature');
  }
  const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const payload = JSON.parse(payloadJson);
  if (typeof payload.exp !== 'number') throw new Error('Missing exp');
  if (Date.now() >= payload.exp * 1000) throw new Error('Token expired');
  return payload;
}

/**
 * Extract and validate the authenticated user from the request.
 * Accepts either a Bearer JWT token or a `session` cookie containing a JWT.
 * @param {import('http').IncomingMessage} req
 * @returns {{ id: string }}
 */
export function authenticate(req) {
  const auth = req.headers['authorization'];
  let token = '';
  const bearer = 'Bearer ';
  if (auth && auth.length > bearer.length && constantTimeEqual(auth.slice(0, bearer.length), bearer)) {
    token = auth.slice(bearer.length);
  } else {
    const session = getCookie(req.headers['cookie'], 'session');
    if (session) token = session;
  }
  if (!token) throw new Error('Missing token');
  const payload = verifyJwt(token);
  const userId = payload.sub || payload.userId || payload.id;
  if (!userId) throw new Error('Invalid token payload');
  return { id: String(userId) };
}
