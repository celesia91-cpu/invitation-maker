// server/auth.js
// Basic JWT validation without external dependencies.

import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k]) => k)
  );
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
  return JSON.parse(payloadJson);
}

/**
 * Extract and validate the authenticated user from the request.
 * Accepts either a Bearer JWT token or a `session` cookie containing a JWT.
 * @param {import('http').IncomingMessage} req
 * @returns {{ id: string }}
 */
export function authenticate(req) {
  const auth = req.headers['authorization'];
  let token;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else {
    const cookies = parseCookies(req.headers['cookie']);
    if (cookies.session) token = cookies.session;
  }
  if (!token) throw new Error('Missing token');
  const payload = verifyJwt(token);
  const userId = payload.sub || payload.userId || payload.id;
  if (!userId) throw new Error('Invalid token payload');
  return { id: String(userId) };
}
