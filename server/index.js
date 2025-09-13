// server/index.js
// Minimal HTTP server exposing GET /api/designs

import http from 'node:http';
import { authenticate } from './auth.js';
import { getDesignsByUser, getDesignById } from './designs-store.js';
import { userTokens, userPurchases } from './database.js';

const port = process.env.PORT || 3000;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const requests = new Map();

function rateLimit(req, res) {
  const ip = req.socket.remoteAddress;
  const now = Date.now();
  let entry = requests.get(ip);
  if (!entry || now - entry.start >= RATE_LIMIT_WINDOW_MS) {
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

const server = http.createServer(async (req, res) => {
  if (rateLimit(req, res)) return;
  try {
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
      users.set(id, { id, username, role });
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
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tokens: newBalance }));
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
