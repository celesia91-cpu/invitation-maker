// server/auth.js
// Basic JWT validation without external dependencies.

import { createHmac, timingSafeEqual } from 'node:crypto';

const secretFromEnv = process.env.JWT_SECRET;
if (typeof secretFromEnv !== 'string' || secretFromEnv.length === 0) {
  throw new Error('JWT_SECRET environment variable must be set');
}
const SECRET = secretFromEnv;

export const DEFAULT_USER_ROLE = 'user';

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

function parseJwtSection(segment, type) {
  let decoded;
  try {
    decoded = Buffer.from(segment, 'base64url').toString('utf8');
  } catch (err) {
    console.warn(`Failed to decode JWT ${type}:`, err.message);
    throw new Error(`Invalid token ${type}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(decoded);
  } catch (err) {
    console.warn(`Failed to parse JWT ${type}:`, err.message, decoded.slice(0, 100));
    throw new Error(`Invalid token ${type}`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    console.warn(`JWT ${type} is not an object`);
    throw new Error(`Invalid token ${type}`);
  }
  return parsed;
}

function verifyJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [headerB64, payloadB64, sigB64] = parts;

  const header = parseJwtSection(headerB64, 'header');
  if (header.alg !== 'HS256') {
    console.warn('Unsupported JWT algorithm:', header.alg);
    throw new Error('Unsupported token algorithm');
  }

  const data = `${headerB64}.${payloadB64}`;
  const expected = createHmac('sha256', SECRET).update(data).digest('base64url');
  let sig;
  try {
    sig = Buffer.from(sigB64, 'base64url');
  } catch (err) {
    console.warn('Failed to decode JWT signature:', err.message);
    throw new Error('Invalid token signature');
  }
  const exp = Buffer.from(expected, 'base64url');
  if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
    throw new Error('Invalid signature');
  }

  const payload = parseJwtSection(payloadB64, 'payload');
  if (typeof payload.exp !== 'number') throw new Error('Missing exp');
  if (Date.now() >= payload.exp * 1000) throw new Error('Token expired');
  return payload;
}

/**
 * Extract and validate the authenticated user from the request.
 * Accepts either a Bearer JWT token or a `session` cookie containing a JWT.
 * @param {import('http').IncomingMessage} req
 * @returns {{ id: string, role: string }}
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
  const rawRole = typeof payload.role === 'string' ? payload.role.trim() : '';
  const role = rawRole || DEFAULT_USER_ROLE;
  return { id: String(userId), role };
}

/**
 * Authorize the authenticated user against a list of allowed roles.
 * Returns the authenticated user for downstream handlers when access is granted.
 * @param {...string} allowedRoles
 * @returns {(req: import('http').IncomingMessage, res: import('http').ServerResponse) => ({ id: string, role: string } | null)}
 */
export function authorizeRoles(...allowedRoles) {
  const normalized = allowedRoles
    .map(role => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
    .filter(Boolean);
  const allowedSet = new Set(normalized);

  return (req, res) => {
    const user = authenticate(req);
    if (allowedSet.size > 0) {
      const userRole = String(user.role || '').trim().toLowerCase();
      if (!allowedSet.has(userRole)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return null;
      }
    }
    return user;
  };
}

