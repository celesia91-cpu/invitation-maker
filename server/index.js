// server/index.js
// Minimal HTTP server exposing GET /api/designs

import http from 'node:http';
import { authenticate } from './auth.js';
import { getDesignsByUser } from './designs-store.js';

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
      const username = body.username;
      const role = body.role;
      if (isPrivileged(username) || isPrivileged(role)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden username or role' }));
        return;
      }
      const id = String(nextUserId++);
      users.set(id, { id, username, role });
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id }));
      return;
    }

    if (req.method === 'GET' && req.url.split('?')[0] === '/api/designs') {
      const user = authenticate(req);
      const designs = await getDesignsByUser(user.id);
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
