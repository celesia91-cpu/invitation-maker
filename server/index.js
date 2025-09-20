// server/index.js
// Minimal HTTP server exposing GET /api/designs

import http from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { authenticate, authorizeRoles, DEFAULT_USER_ROLE } from './auth.js';
import { getDesignsByUser, getDesignById, getMarketplaceDesigns, withDesignOwnership } from './designs-store.js';
import { userTokens, userPurchases, categories, designs, designOwners } from './database.js';
import {
  recordView,
  recordConversion,
  getPopularDesigns,
  getConversionRates
} from './analytics-store.js';
import {
  addWebmFile,
  deleteWebmFile,
  getWebmFileById,
  getWebmFilesByDesign,
  updateWebmFile
} from './webm-store.js';
import { getNavigationState, saveNavigationState } from './navigation-state-store.js';
import { isAdminRole, resolveMarketplaceRole, MARKETPLACE_ROLES } from '../shared/marketplace.js';

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

function getStoredUser(userId) {
  return users.get(String(userId));
}

function isStoredAdminUser(userId) {
  const record = getStoredUser(userId);
  return Boolean(record && isAdminRole(record.role));
}

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

const requireAdmin = authorizeRoles('admin');

const AUTH_ERROR_MESSAGE = 'Design ownership required';

function respondJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function respondError(res, statusCode, type, message) {
  respondJson(res, statusCode, { error: { type, message } });
}

function getAuthenticatedUser(req, res) {
  try {
    return authenticate(req);
  } catch (err) {
    respondError(res, 401, 'authorization_error', 'Authentication required');
    return null;
  }
}

function userOwnsDesign(user, designId) {
  if (isAdminRole(user.role)) {
    return true;
  }
  const ownership = designOwners.get(String(designId));
  return Boolean(ownership && ownership.userId === user.id);
}

function ensureDesignAccess(res, user, designId) {
  if (userOwnsDesign(user, designId)) {
    return true;
  }
  respondError(res, 403, 'authorization_error', AUTH_ERROR_MESSAGE);
  return false;
}

const ADMIN_DESIGN_STATUSES = new Set(['draft', 'published', 'archived']);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cloneSlides(slides = []) {
  if (!Array.isArray(slides)) return [];
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(slides);
    }
  } catch (err) {
    // Fall back to JSON cloning below when structuredClone is unavailable.
  }
  return JSON.parse(JSON.stringify(slides));
}

function cloneTags(tags = []) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => normalizeString(String(tag)))
    .filter((tag) => tag.length > 0);
}

function respondValidationErrors(res, details, message = 'Validation failed') {
  respondJson(res, 422, {
    error: {
      type: 'validation_error',
      message,
      details
    }
  });
}

function validateAdminDesignPayload(body, { requireAllFields = false, allowOwnerChange = true } = {}) {
  const errors = [];
  const normalized = {};

  const shouldValidate = (field) => requireAllFields || Object.prototype.hasOwnProperty.call(body, field);

  if (shouldValidate('title')) {
    const title = normalizeString(body.title);
    if (!title) {
      errors.push({ field: 'title', message: 'Title is required' });
    } else {
      normalized.title = title;
    }
  }

  if (shouldValidate('status')) {
    const status = normalizeString(body.status).toLowerCase();
    if (!status) {
      errors.push({ field: 'status', message: 'Status is required' });
    } else if (!ADMIN_DESIGN_STATUSES.has(status)) {
      errors.push({ field: 'status', message: 'Unsupported status value' });
    } else {
      normalized.status = status;
    }
  }

  if (shouldValidate('thumbnailUrl')) {
    if (body.thumbnailUrl === undefined || body.thumbnailUrl === null) {
      normalized.thumbnailUrl = '';
    } else if (typeof body.thumbnailUrl === 'string') {
      normalized.thumbnailUrl = body.thumbnailUrl.trim();
    } else {
      errors.push({ field: 'thumbnailUrl', message: 'thumbnailUrl must be a string' });
    }
  }

  if (shouldValidate('slides')) {
    if (body.slides === undefined || body.slides === null) {
      normalized.slides = [];
    } else if (!Array.isArray(body.slides)) {
      errors.push({ field: 'slides', message: 'slides must be an array' });
    } else {
      normalized.slides = cloneSlides(body.slides);
    }
  }

  if (shouldValidate('tags')) {
    if (body.tags === undefined || body.tags === null) {
      normalized.tags = [];
    } else if (!Array.isArray(body.tags)) {
      errors.push({ field: 'tags', message: 'tags must be an array' });
    } else {
      normalized.tags = cloneTags(body.tags);
    }
  }

  if (shouldValidate('notes')) {
    if (body.notes === undefined || body.notes === null) {
      normalized.notes = '';
    } else if (typeof body.notes === 'string') {
      normalized.notes = body.notes;
    } else {
      errors.push({ field: 'notes', message: 'notes must be a string' });
    }
  }

  if (allowOwnerChange && shouldValidate('ownerId')) {
    if (body.ownerId === undefined || body.ownerId === null) {
      normalized.ownerId = null;
    } else {
      const ownerId = normalizeString(body.ownerId);
      normalized.ownerId = ownerId || null;
    }
  }

  if (!allowOwnerChange && Object.prototype.hasOwnProperty.call(body, 'ownerId')) {
    errors.push({ field: 'ownerId', message: 'ownerId cannot be modified' });
  }

  return { errors, normalized };
}

function assignDesignOwnerRecord(designId, ownerId, timestamp) {
  const key = String(designId);
  const record = designOwners.get(key);
  const userId = ownerId === undefined ? record?.userId ?? null : ownerId;
  if (record) {
    designOwners.set(key, {
      ...record,
      userId,
      updatedAt: timestamp
    });
  } else {
    designOwners.set(key, {
      designId: key,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }
}

function shapeAdminDesign(design) {
  if (!design) return null;
  const ownership = designOwners.get(String(design.id));
  const ownerId = ownership ? ownership.userId ?? null : null;
  const slides = Array.isArray(design.slides) ? cloneSlides(design.slides) : [];
  const tags = Array.isArray(design.tags) ? [...design.tags] : [];
  return {
    id: String(design.id),
    ownerId,
    title: String(design.title || 'Untitled'),
    status: ADMIN_DESIGN_STATUSES.has(design.status) ? design.status : 'draft',
    thumbnailUrl: String(design.thumbnailUrl || ''),
    updatedAt: design.updatedAt || new Date().toISOString(),
    createdAt: design.createdAt || design.updatedAt || new Date().toISOString(),
    slides,
    tags,
    notes: typeof design.notes === 'string' ? design.notes : ''
  };
}

function getAdminDesignId(req) {
  const path = req.url.split('?')[0];
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 4 && segments[0] === 'api' && segments[1] === 'admin' && segments[2] === 'designs') {
    const rawId = decodeURIComponent(segments[3]);
    return rawId.trim();
  }
  return '';
}

function checkIfUnmodifiedSince(req, res, design) {
  const header = req.headers['if-unmodified-since'];
  if (!header) return true;
  const providedTimestamp = Date.parse(header);
  if (Number.isNaN(providedTimestamp)) {
    respondValidationErrors(res, [
      { field: 'If-Unmodified-Since', message: 'Invalid If-Unmodified-Since header' }
    ]);
    return false;
  }
  const updatedAt = Date.parse(design.updatedAt || 0);
  if (!Number.isFinite(updatedAt)) {
    return true;
  }
  if (updatedAt > providedTimestamp) {
    respondError(res, 409, 'conflict_error', 'Design was modified by another request');
    return false;
  }
  return true;
}

function applyAdminDesignUpdates(design, updates, timestamp) {
  if (updates.title !== undefined) {
    design.title = updates.title;
  }
  if (updates.status !== undefined) {
    design.status = updates.status;
  }
  if (updates.thumbnailUrl !== undefined) {
    design.thumbnailUrl = updates.thumbnailUrl;
  }
  if (updates.slides !== undefined) {
    design.slides = updates.slides;
  }
  if (updates.tags !== undefined) {
    design.tags = updates.tags;
  }
  if (updates.notes !== undefined) {
    design.notes = updates.notes;
    design.adminNotes = updates.notes;
  }
  design.updatedAt = timestamp;
}

function coerceNullableNumber(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a number`);
  }
  return numeric;
}

function requireJsonBody(req, res) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    respondError(res, 422, 'validation_error', 'JSON body required');
    return false;
  }
  return true;
}

async function parseJsonBody(req, res) {
  try {
    return await readBody(req);
  } catch (err) {
    respondError(res, 422, 'validation_error', 'Invalid JSON body');
    return null;
  }
}

function getRequestUrl(req) {
  const hostHeader = req.headers?.host;
  const base = hostHeader ? `http://${hostHeader}` : 'http://localhost';
  return new URL(req.url, base);
}

function getWebmIdFromRequest(req) {
  const urlObj = getRequestUrl(req);
  const rawId = decodeURIComponent(urlObj.pathname.slice('/api/webm/'.length));
  const trimmed = rawId.trim();
  return trimmed || '';
}

function ensureWebmId(req, res) {
  const webmId = getWebmIdFromRequest(req);
  if (!webmId) {
    respondError(res, 404, 'not_found', 'WebM asset not found');
    return '';
  }
  return webmId;
}

function getDesignIdForWebmListing(req) {
  const urlObj = getRequestUrl(req);
  const segments = urlObj.pathname.split('/').filter(Boolean);
  if (
    segments.length === 4 &&
    segments[0] === 'api' &&
    segments[1] === 'designs' &&
    segments[3] === 'webm'
  ) {
    const decoded = decodeURIComponent(segments[2]);
    const trimmed = decoded.trim();
    return trimmed || '';
  }
  return '';
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
        userRecord = { id, username: email, role: DEFAULT_USER_ROLE };
        users.set(id, userRecord);
        userTokens.set(id, 5);
        userPurchases.set(id, []);
      }
      const storedRole =
        userRecord && typeof userRecord.role === 'string' ? userRecord.role.trim() : '';
      const payload = {
        sub: userRecord.id,
        email,
        role: storedRole || DEFAULT_USER_ROLE,
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
        const authUser = authenticate(req);
        const storedProfile = users.get(authUser.id);
        const storedRole =
          storedProfile && typeof storedProfile.role === 'string'
            ? storedProfile.role.trim()
            : '';
        const tokenRole = typeof authUser.role === 'string' ? authUser.role.trim() : '';
        const role = storedRole || tokenRole || DEFAULT_USER_ROLE;

        const username =
          storedProfile && typeof storedProfile.username === 'string'
            ? storedProfile.username
            : 'user';

        const responseUser = {
          id: String((storedProfile && storedProfile.id) || authUser.id),
          email: username,
          role
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: responseUser }));
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
      users.set(id, { id, username, role: role || DEFAULT_USER_ROLE });
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

    if (req.url === '/api/navigation/state') {
      if (req.method === 'GET') {
        let authUser;
        try {
          authUser = authenticate(req);
        } catch (err) {
          respondError(res, 401, 'authorization_error', 'Authentication required');
          return;
        }
        const state = getNavigationState(authUser.id);
        respondJson(res, 200, { state });
        return;
      }

      if (req.method === 'PUT' || req.method === 'PATCH') {
        let authUser;
        try {
          authUser = authenticate(req);
        } catch (err) {
          respondError(res, 401, 'authorization_error', 'Authentication required');
          return;
        }

        let body;
        try {
          body = await readBody(req);
        } catch (err) {
          respondError(res, 422, 'validation_error', 'Invalid JSON body');
          return;
        }

        if (typeof body !== 'object' || body === null || Array.isArray(body)) {
          respondError(res, 422, 'validation_error', 'Navigation state payload must be an object');
          return;
        }

        let state;
        try {
          state = saveNavigationState(authUser.id, body);
        } catch (err) {
          respondError(res, 422, 'validation_error', err.message || 'Unable to save navigation state');
          return;
        }

        respondJson(res, 200, { state });
        return;
      }
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
      const adminUser = requireAdmin(req, res);
      if (!adminUser) return;
      const list = Array.from(categories.values());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/admin/categories') {
      const adminUser = requireAdmin(req, res);
      if (!adminUser) return;
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
      const adminUser = requireAdmin(req, res);
      if (!adminUser) return;
      const id = decodeURIComponent(req.url.split('/').pop());
      categories.delete(id);
      res.writeHead(204).end();
      return;
    }

    if (req.method === 'GET' && req.url.split('?')[0] === '/api/admin/designs') {
      const adminUser = requireAdmin(req, res);
      if (!adminUser) return;
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const managedByParam = normalizeString(urlObj.searchParams.get('managedBy'));
      const statusFilter = normalizeString(urlObj.searchParams.get('status')).toLowerCase();
      const ownerFilter = normalizeString(urlObj.searchParams.get('ownerId'));
      const searchParam = normalizeString(urlObj.searchParams.get('search')).toLowerCase();
      let list = Array.from(designs.values());

      if (managedByParam) {
        list = list.filter((design) => normalizeString(design.managedByAdminId) === managedByParam);
      }

      if (statusFilter && ADMIN_DESIGN_STATUSES.has(statusFilter)) {
        list = list.filter((design) => normalizeString(design.status).toLowerCase() === statusFilter);
      }

      if (ownerFilter) {
        list = list.filter((design) => {
          const record = designOwners.get(String(design.id));
          return normalizeString(record?.userId).toLowerCase() === ownerFilter.toLowerCase();
        });
      }

      if (searchParam) {
        list = list.filter((design) => {
          const title = String(design.title || '').toLowerCase();
          const tags = Array.isArray(design.tags)
            ? design.tags.map((tag) => String(tag).toLowerCase()).join(' ')
            : '';
          return title.includes(searchParam) || tags.includes(searchParam);
        });
      }

      list = list.sort((a, b) => {
        const updatedA = Date.parse(a.updatedAt || 0) || 0;
        const updatedB = Date.parse(b.updatedAt || 0) || 0;
        return updatedB - updatedA;
      });

      const DEFAULT_PAGE = 1;
      const DEFAULT_PAGE_SIZE = 25;
      const MAX_PAGE_SIZE = 100;

      const page = Math.max(
        DEFAULT_PAGE,
        Number.parseInt(urlObj.searchParams.get('page') || DEFAULT_PAGE, 10) || DEFAULT_PAGE
      );
      const requestedPageSize = Number.parseInt(
        urlObj.searchParams.get('pageSize') || DEFAULT_PAGE_SIZE,
        10
      );
      const pageSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Number.isFinite(requestedPageSize) ? requestedPageSize : DEFAULT_PAGE_SIZE)
      );
      const startIndex = (page - 1) * pageSize;
      const paged = list.slice(startIndex, startIndex + pageSize);

      const response = {
        data: paged.map((design) => shapeAdminDesign(design)),
        pagination: {
          page,
          pageSize,
          total: list.length
        }
      };

      respondJson(res, 200, response);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/admin/designs') {
      const adminUser = requireAdmin(req, res);
      if (!adminUser) return;
      if (!requireJsonBody(req, res)) return;
      const body = await parseJsonBody(req, res);
      if (body === null) return;

      const { errors, normalized } = validateAdminDesignPayload(body, {
        requireAllFields: true,
        allowOwnerChange: true
      });

      const managedByAdminIdValue = normalizeString(body?.managedByAdminId);
      if (managedByAdminIdValue && managedByAdminIdValue !== adminUser.id && !isStoredAdminUser(managedByAdminIdValue)) {
        errors.push({ field: 'managedByAdminId', message: 'managedByAdminId must reference an admin user' });
      }

      if (errors.length > 0) {
        respondValidationErrors(res, errors);
        return;
      }

      const id = `dsgn_${randomUUID()}`;
      const timestamp = new Date().toISOString();
      const ownerId = normalized.ownerId ?? null;
      const rawIsAdminTemplate = body?.isAdminTemplate;
      const isAdminTemplate =
        rawIsAdminTemplate === undefined
          ? ownerId === null
          : typeof rawIsAdminTemplate === 'string'
            ? rawIsAdminTemplate.toLowerCase() === 'true'
            : Boolean(rawIsAdminTemplate);
      const managedByAdminId = isAdminTemplate
        ? managedByAdminIdValue || adminUser.id
        : managedByAdminIdValue || null;

      const priceValue = Number.parseFloat(body?.price);
      const price = Number.isFinite(priceValue) ? priceValue : 0;

      const design = {
        id,
        title: normalized.title,
        status: normalized.status,
        thumbnailUrl: normalized.thumbnailUrl ?? '',
        slides: normalized.slides ?? [],
        tags: normalized.tags ?? [],
        notes: normalized.notes ?? '',
        adminNotes: normalized.notes ?? '',
        createdAt: timestamp,
        updatedAt: timestamp,
        views: 0,
        category: normalizeString(body?.category),
        price,
        premium: price > 0,
        isAdminTemplate,
        managedByAdminId
      };

      designs.set(id, design);
      assignDesignOwnerRecord(id, ownerId, timestamp);

      respondJson(res, 201, shapeAdminDesign(design));
      return;
    }

    if (req.method === 'PUT' && req.url.startsWith('/api/admin/designs/')) {
      const designId = getAdminDesignId(req);
      if (!designId) {
        // Defer to other more specific admin design routes (e.g., price updates).
      } else {
        const adminUser = requireAdmin(req, res);
        if (!adminUser) return;
        const existing = designs.get(designId);
        if (!existing) {
          respondError(res, 404, 'not_found', 'Design not found');
          return;
        }

        if (!checkIfUnmodifiedSince(req, res, existing)) {
          return;
        }

        if (!requireJsonBody(req, res)) return;
        const body = await parseJsonBody(req, res);
        if (body === null) return;

        const { errors, normalized } = validateAdminDesignPayload(body, {
          requireAllFields: true,
          allowOwnerChange: true
        });

        const managedByAdminIdValue = normalizeString(body?.managedByAdminId);
        if (managedByAdminIdValue && managedByAdminIdValue !== adminUser.id && !isStoredAdminUser(managedByAdminIdValue)) {
          errors.push({ field: 'managedByAdminId', message: 'managedByAdminId must reference an admin user' });
        }

        if (errors.length > 0) {
          respondValidationErrors(res, errors);
          return;
        }

        const ownerId = normalized.ownerId ?? null;
        const rawIsAdminTemplate = body?.isAdminTemplate;
        const isAdminTemplate =
          rawIsAdminTemplate === undefined
            ? ownerId === null
            : typeof rawIsAdminTemplate === 'string'
              ? rawIsAdminTemplate.toLowerCase() === 'true'
              : Boolean(rawIsAdminTemplate);
        const managedByAdminId = isAdminTemplate
          ? managedByAdminIdValue || adminUser.id
          : managedByAdminIdValue || null;

        const priceValue = Number.parseFloat(body?.price);
        const price = Number.isFinite(priceValue) ? priceValue : existing.price ?? 0;

        const timestamp = new Date().toISOString();

        applyAdminDesignUpdates(
          existing,
          {
            title: normalized.title,
            status: normalized.status,
            thumbnailUrl: normalized.thumbnailUrl ?? '',
            slides: normalized.slides ?? [],
            tags: normalized.tags ?? [],
            notes: normalized.notes ?? ''
          },
          timestamp
        );

        existing.price = price;
        existing.premium = price > 0;
        existing.isAdminTemplate = isAdminTemplate;
        existing.managedByAdminId = managedByAdminId;
        if (body?.category !== undefined) {
          existing.category = normalizeString(body.category);
        }
        if (!existing.createdAt) {
          existing.createdAt = timestamp;
        }

        assignDesignOwnerRecord(designId, ownerId, timestamp);

        respondJson(res, 200, shapeAdminDesign(existing));
        return;
      }
    }

    if (req.method === 'PATCH' && req.url.startsWith('/api/admin/designs/')) {
      const designId = getAdminDesignId(req);
      if (!designId) {
        // Ignore non-resource PATCH routes and allow other handlers to evaluate.
      } else {
        const adminUser = requireAdmin(req, res);
        if (!adminUser) return;
        const existing = designs.get(designId);
        if (!existing) {
          respondError(res, 404, 'not_found', 'Design not found');
          return;
        }

        if (!checkIfUnmodifiedSince(req, res, existing)) {
          return;
        }

        if (!requireJsonBody(req, res)) return;
        const body = await parseJsonBody(req, res);
        if (body === null) return;

        const { errors, normalized } = validateAdminDesignPayload(body, {
          requireAllFields: false,
          allowOwnerChange: false
        });

        if (errors.length > 0) {
          respondValidationErrors(res, errors);
          return;
        }

        if (Object.keys(normalized).length === 0) {
          respondValidationErrors(res, [{ field: '*', message: 'No updatable fields provided' }]);
          return;
        }

        const timestamp = new Date().toISOString();

        applyAdminDesignUpdates(existing, normalized, timestamp);

        respondJson(res, 200, shapeAdminDesign(existing));
        return;
      }
    }

    if (req.method === 'DELETE' && req.url.startsWith('/api/admin/designs/')) {
      const designId = getAdminDesignId(req);
      if (!designId) {
        // Allow other handlers to process paths without a direct design id.
      } else {
        const adminUser = requireAdmin(req, res);
        if (!adminUser) return;
        const existing = designs.get(designId);
        if (!existing) {
          respondError(res, 404, 'not_found', 'Design not found');
          return;
        }

        if (!checkIfUnmodifiedSince(req, res, existing)) {
          return;
        }

        const timestamp = new Date().toISOString();
        existing.status = 'archived';
        existing.updatedAt = timestamp;
        existing.archivedAt = timestamp;
        existing.archivedByAdminId = adminUser.id;

        res.writeHead(204).end();
        return;
      }
    }

    if (req.method === 'PUT' && req.url.startsWith('/api/admin/designs/') && req.url.endsWith('/price')) {
      const adminUser = requireAdmin(req, res);
      if (!adminUser) return;
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
      res.end(JSON.stringify(withDesignOwnership(design)));
      return;
    }

    if (req.method === 'GET' && req.url.split('?')[0] === '/api/marketplace') {
      const authUser = authenticate(req);
      const urlObj = new URL(req.url, `http://${req.headers.host}`);

      let defaultRole = resolveMarketplaceRole(authUser.role) || 'consumer';
      if (!MARKETPLACE_ROLES.has(defaultRole)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unsupported role' }));
        return;
      }

      const requestedRoleParam = urlObj.searchParams.get('role');
      let effectiveRole = defaultRole;
      if (requestedRoleParam !== null) {
        const requestedRole = resolveMarketplaceRole(requestedRoleParam);
        if (!MARKETPLACE_ROLES.has(requestedRole)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unsupported role' }));
          return;
        }
        if (!isAdminRole(defaultRole) && requestedRole !== defaultRole) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden role override' }));
          return;
        }
        effectiveRole = requestedRole;
      }

      const categoryParam = urlObj.searchParams.get('category');
      const searchParam = urlObj.searchParams.get('search');
      const category = categoryParam ? categoryParam.trim() : '';
      if (category && !/^[\w-]+$/.test(category)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid category filter' }));
        return;
      }

      const search = searchParam ? searchParam.trim() : '';
      if (search.length > 100) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Search query too long' }));
        return;
      }

      const ownerIdParam = urlObj.searchParams.get('ownerId');
      const ownerId = ownerIdParam ? ownerIdParam.trim() : '';
      const mineParam = urlObj.searchParams.get('mine');
      const mineRequested = typeof mineParam === 'string' && mineParam.trim()
        ? ['1', 'true', 'yes', 'y'].includes(mineParam.trim().toLowerCase())
        : false;

      const payload = await getMarketplaceDesigns({
        role: effectiveRole,
        category: category || undefined,
        search: search || undefined,
        ownerId: ownerId || undefined,
        mine: mineRequested,
        requestingUserId: authUser.id,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
      return;
    }

    if (req.method === 'POST' && req.url === '/api/webm') {
      const user = getAuthenticatedUser(req, res);
      if (!user) return;
      if (!requireJsonBody(req, res)) return;
      const body = await parseJsonBody(req, res);
      if (body === null) return;

      const designId =
        typeof body.designId === 'string'
          ? body.designId.trim()
          : body.designId !== undefined && body.designId !== null
            ? String(body.designId).trim()
            : '';
      if (!designId) {
        respondError(res, 422, 'validation_error', 'designId is required');
        return;
      }

      if (!designs.has(designId)) {
        respondError(res, 422, 'validation_error', 'designId must reference an existing design');
        return;
      }

      if (!ensureDesignAccess(res, user, designId)) {
        return;
      }

      const storageUri = typeof body.storageUri === 'string' ? body.storageUri.trim() : '';
      if (!storageUri) {
        respondError(res, 422, 'validation_error', 'storageUri is required');
        return;
      }

      let durationSeconds;
      let sizeBytes;
      try {
        durationSeconds = coerceNullableNumber(body.durationSeconds, 'durationSeconds');
        sizeBytes = coerceNullableNumber(body.sizeBytes, 'sizeBytes');
      } catch (err) {
        respondError(res, 422, 'validation_error', err.message || 'Invalid numeric field');
        return;
      }

      let uploadedBy;
      if (Object.prototype.hasOwnProperty.call(body, 'uploadedBy')) {
        if (body.uploadedBy === null) {
          uploadedBy = null;
        } else {
          uploadedBy = String(body.uploadedBy).trim();
          if (!uploadedBy) uploadedBy = user.id;
        }
      } else {
        uploadedBy = user.id;
      }

      const payload = {
        designId,
        storageUri,
        uploadedBy
      };
      if (durationSeconds !== undefined) payload.durationSeconds = durationSeconds;
      if (sizeBytes !== undefined) payload.sizeBytes = sizeBytes;

      try {
        const record = await addWebmFile(payload);
        respondJson(res, 201, record);
      } catch (err) {
        respondError(res, 422, 'validation_error', err.message || 'Unable to create WebM asset');
      }
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/webm/')) {
      const webmId = ensureWebmId(req, res);
      if (!webmId) return;

      const user = getAuthenticatedUser(req, res);
      if (!user) return;

      const record = await getWebmFileById(webmId);
      if (!record) {
        respondError(res, 404, 'not_found', 'WebM asset not found');
        return;
      }
      if (!ensureDesignAccess(res, user, record.designId)) {
        return;
      }
      respondJson(res, 200, record);
      return;
    }

    if (req.method === 'PATCH' && req.url.startsWith('/api/webm/')) {
      const webmId = ensureWebmId(req, res);
      if (!webmId) return;

      const user = getAuthenticatedUser(req, res);
      if (!user) return;
      if (!requireJsonBody(req, res)) return;
      const body = await parseJsonBody(req, res);
      if (body === null) return;

      const existing = await getWebmFileById(webmId);
      if (!existing) {
        respondError(res, 404, 'not_found', 'WebM asset not found');
        return;
      }
      if (!ensureDesignAccess(res, user, existing.designId)) {
        return;
      }

      const updates = {};

      if (Object.prototype.hasOwnProperty.call(body, 'storageUri')) {
        if (body.storageUri === null) {
          updates.storageUri = null;
        } else {
          const value = typeof body.storageUri === 'string' ? body.storageUri.trim() : '';
          if (!value) {
            respondError(res, 422, 'validation_error', 'storageUri must be a non-empty string');
            return;
          }
          updates.storageUri = value;
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'durationSeconds')) {
        try {
          updates.durationSeconds = coerceNullableNumber(body.durationSeconds, 'durationSeconds');
        } catch (err) {
          respondError(res, 422, 'validation_error', err.message || 'Invalid durationSeconds');
          return;
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'sizeBytes')) {
        try {
          updates.sizeBytes = coerceNullableNumber(body.sizeBytes, 'sizeBytes');
        } catch (err) {
          respondError(res, 422, 'validation_error', err.message || 'Invalid sizeBytes');
          return;
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'uploadedBy')) {
        if (body.uploadedBy === null) {
          updates.uploadedBy = null;
        } else {
          const value = String(body.uploadedBy).trim();
          if (!value) {
            respondError(res, 422, 'validation_error', 'uploadedBy must be a non-empty string');
            return;
          }
          updates.uploadedBy = value;
        }
      }

      if (Object.prototype.hasOwnProperty.call(body, 'designId')) {
        const nextDesignId =
          typeof body.designId === 'string'
            ? body.designId.trim()
            : body.designId !== null && body.designId !== undefined
              ? String(body.designId).trim()
              : '';
        if (!nextDesignId) {
          respondError(res, 422, 'validation_error', 'designId must be a non-empty string');
          return;
        }
        if (!designs.has(nextDesignId)) {
          respondError(res, 422, 'validation_error', 'designId must reference an existing design');
          return;
        }
        if (!ensureDesignAccess(res, user, nextDesignId)) {
          return;
        }
        updates.designId = nextDesignId;
      }

      if (Object.keys(updates).length === 0) {
        respondError(res, 422, 'validation_error', 'No updatable fields provided');
        return;
      }

      try {
        const record = await updateWebmFile(webmId, updates);
        if (!record) {
          respondError(res, 404, 'not_found', 'WebM asset not found');
          return;
        }
        respondJson(res, 200, record);
      } catch (err) {
        respondError(res, 422, 'validation_error', err.message || 'Unable to update WebM asset');
      }
      return;
    }

    if (req.method === 'DELETE' && req.url.startsWith('/api/webm/')) {
      const webmId = ensureWebmId(req, res);
      if (!webmId) return;

      const user = getAuthenticatedUser(req, res);
      if (!user) return;

      const existing = await getWebmFileById(webmId);
      if (!existing) {
        respondError(res, 404, 'not_found', 'WebM asset not found');
        return;
      }

      if (!ensureDesignAccess(res, user, existing.designId)) {
        return;
      }

      const deleted = await deleteWebmFile(webmId);
      if (!deleted) {
        respondError(res, 404, 'not_found', 'WebM asset not found');
        return;
      }
      res.writeHead(204).end();
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/api/designs/')) {
      const designIdForWebm = getDesignIdForWebmListing(req);
      if (designIdForWebm) {
        if (!designs.has(designIdForWebm)) {
          respondError(res, 404, 'not_found', 'Design not found');
          return;
        }

        const user = getAuthenticatedUser(req, res);
        if (!user) return;
        if (!ensureDesignAccess(res, user, designIdForWebm)) {
          return;
        }

        const files = await getWebmFilesByDesign(designIdForWebm);
        respondJson(res, 200, { designId: designIdForWebm, data: files });
        return;
      }

      const urlObj = getRequestUrl(req);
      const user = authenticate(req);
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
      const userDesigns = await getDesignsByUser(user.id, { category: param, search });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(userDesigns));
      return;
    }

    if (req.method === 'GET' && req.url.split('?')[0] === '/api/designs') {
      const user = authenticate(req);
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const category = urlObj.searchParams.get('category') || undefined;
      const search = urlObj.searchParams.get('search') || undefined;
      const userDesigns = await getDesignsByUser(user.id, { category, search });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(userDesigns));
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
