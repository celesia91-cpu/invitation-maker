// server/index.js
// Minimal HTTP server exposing GET /api/designs

import http from 'node:http';
import { createHmac } from 'node:crypto';
import { authenticate } from './auth.js';
import { getDesignsByUser, getDesignById } from './designs-store.js';
import { userTokens, userPurchases, categories, designs } from './database.js';
import {
  recordView,
  recordConversion,
  getPopularDesigns,
  getConversionRates
} from './analytics-store.js';

const port = process.env.PORT || 3001;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const requests = new Map();

function purgeStaleRequests(now) {
  for (const [key, entry] of requests) {
    if (now - entry.start >= RATE_LIMIT_WINDOW_MS) {
      requests.delete(key);
    }
  }
}

function rateLimit(req, res) {
  const ip = req.socket.remoteAddress;
  const now = Date.now();
  let entry = requests.get(ip);
  if (!entry || now - entry.start >= RATE_LIMIT_WINDOW_MS) {
    purgeStaleRequests(now);
    entry = { count: 0, start: now };
  }
  entry.count += 1;
  requests.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many requests' }));
    return true;
  }
  return false;
}

const forbidden = ['admin', 'administrator', 'root', 'superuser'];
const users = new Map();
let nextUserId = 1;

function isPrivileged(value = '') {
  return forbidden.includes(String(value).toLowerCase());
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      if (typeof data !== 'string' || !data.trim().startsWith('{')) {
        console.warn('Received non-JSON body:', data.slice(0, 100));
        return resolve({});
      }
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed !== 'object' || parsed === null) {
          console.warn('Parsed body is not an object');
          return resolve({});
        }
        resolve(parsed);
      } catch (err) {
        console.warn('JSON parse error for request body:', err.message, data.slice(0, 100));
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const secretFromEnv = process.env.JWT_SECRET;
if (typeof secretFromEnv !== 'string' || secretFromEnv.length === 0) {
  throw new Error('JWT_SECRET environment variable must be set');
}
const SECRET = secretFromEnv;

function ensureAdmin(req, res) {
  const user = authenticate(req);
  if (user.role !== 'admin') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return null;
  }
  return user;
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${headerB64}.${payloadB64}`;
  const sigB64 = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sigB64}`;
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  if (rateLimit(req, res)) return;
  try {
    // Simple auth endpoints for local development
    if (req.method === 'POST' && req.url === '/auth/login') {
      const body = await readBody(req);
      const email = String(body.email || '').trim();
      const password = String(body.password || '').trim();
      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email and password required' }));
        return;
      }
      // Create or re-use a demo user based on the email
      let userRecord = Array.from(users.values()).find(u => u.username === email);
      if (!userRecord) {
        const id = String(nextUserId++);
        userRecord = { id, username: email, role: 'user' };
        users.set(id, userRecord);
        userTokens.set(id, 5);
        userPurchases.set(id, []);
      }
      const storedRole =
        userRecord && typeof userRecord.role === 'string' ? userRecord.role.trim() : '';
      const payload = {
        sub: userRecord.id,
        email,
        role: storedRole || 'user',
        exp: Math.floor(Date.now() / 1000) + 60 * 60
      };
      const token = signJwt(payload);
      const headers = { 'Content-Type': 'application/json', 'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600` };
      res.writeHead(200, headers);
      res.end(
        JSON.stringify({ token, user: { id: userRecord.id, email, role: payload.role } })
      );
      return;
    }

    if (req.method === 'POST' && req.url === '/auth/logout') {
      res.writeHead(204, { 'Set-Cookie': 'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax' });
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/auth/me') {
      try {
        const user = authenticate(req);
        const profile = users.get(user.id) || { id: user.id, username: 'user', role: user.role };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            user: { id: profile.id, email: profile.username, role: profile.role || user.role }
          })
        );
      } catch (err) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
      }
      return;
    }
    if (req.method === 'POST' && req.url === '/auth/register') {
      const body = await readBody(req);
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      const role = typeof body.role === 'string' ? body.role.trim() : '';
      if (!username) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Username required' }));
        return;
      }
      if (isPrivileged(username) || (role && isPrivileged(role))) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden username or role' }));
        return;
      }
      const id = String(nextUserId++);
      users.set(id, { id, username, role: role || 'user' });
      userTokens.set(id, 5);
      userPurchases.set(id, []);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id }));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/user/tokens') {
      const authUser = authenticate(req);
      const tokens = userTokens.get(authUser.id) ?? 0;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tokens }));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/purchase') {
      const authUser = authenticate(req);
      const body = await readBody(req);
      const delta = Number(body.tokens);
      if (!Number.isInteger(delta) || delta === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token amount' }));
        return;
      }
      const current = userTokens.get(authUser.id) || 0;
      const newBalance = current + delta;
      if (newBalance < 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Insufficient tokens' }));
        return;
      }
      userTokens.set(authUser.id, newBalance);
      if (delta > 0) {
        const list = userPurchases.get(authUser.id) || [];
        list.push({ amount: delta, purchasedAt: new Date().toISOString() });
        userPurchases.set(authUser.id, list);
      }
      if (body.designId) {
        recordConversion(String(body.designId));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tokens: newBalance }));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/analytics/view') {
      const body = await readBody(req);
      if (body.designId) {
        recordView(String(body.designId));
        const d = designs.get(String(body.designId));
        if (d) d.views = (d.views || 0) + 1;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/analytics/convert') {
      const body = await readBody(req);
      if (body.designId) recordConversion(String(body.designId));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/analytics/popular') {
      const list = getPopularDesigns();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/analytics/conversions') {
      const list = getConversionRates();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/admin/categories') {
      if (!ensureAdmin(req, res)) return;
      const list = Array.from(categories.values());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/admin/categories') {
      if (!ensureAdmin(req, res)) return;
      const body = await readBody(req);
      const id = String(body.id || '').trim();
      const name = String(body.name || '').trim();
      if (!id || !name) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid category' }));
        return;
      }
      categories.set(id, { id, name });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, name }));
      return;
    }

    if (req.method === 'DELETE' && req.url.startsWith('/api/admin/categories/')) {
      if (!ensureAdmin(req, res)) return;
      const id = decodeURIComponent(req.url.split('/').pop());
      categories.delete(id);
      res.writeHead(204).end();
      return;
    }

    if (req.method === 'POST' && req.url === '/api/admin/designs') {
      if (!ensureAdmin(req, res)) return;
      const body = await readBody(req);
      const id = body.id ? String(body.id) : String(designs.size + 1);
      const design = {
        id,
        userId: body.userId ? String(body.userId) : 'demo',
        title: body.title || 'Untitled',
        category: body.category || '',
        views: 0,
        thumbnailUrl: body.thumbnailUrl || '',
        updatedAt: new Date().toISOString(),
        price: Number(body.price) || 0,
        premium: Number(body.price) > 0
      };
      designs.set(id, design);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(design));
      return;
    }

    if (req.method === 'PUT' && req.url.startsWith('/api/admin/designs/') && req.url.endsWith('/price')) {
      if (!ensureAdmin(req, res)) return;
      const parts = req.url.split('/');
      const id = parts[parts.length - 2];
      const body = await readBody(req);
      const price = Number(body.price);
      const design = designs.get(id);
      if (!design || Number.isNaN(price)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid design or price' }));
        return;
      }
      design.price = price;
      design.premium = price > 0;
      design.updatedAt = new Date().toISOString();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(design));
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/designs/')) {
      const user = authenticate(req);
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const param = decodeURIComponent(urlObj.pathname.slice('/api/designs/'.length));
      if (/^\d+$/.test(param)) {
        const design = await getDesignById(user.id, param);
        if (!design) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Design not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(design));
        return;
      }
      if (!/^[\w-]+$/.test(param)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid category' }));
        return;
      }
      const search = urlObj.searchParams.get('search') || undefined;
      const designs = await getDesignsByUser(user.id, { category: param, search });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(designs));
      return;
    }

    if (req.method === 'GET' && req.url.split('?')[0] === '/api/designs') {
      const user = authenticate(req);
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const category = urlObj.searchParams.get('category') || undefined;
      const search = urlObj.searchParams.get('search') || undefined;
      const designs = await getDesignsByUser(user.id, { category, search });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(designs));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default server;
