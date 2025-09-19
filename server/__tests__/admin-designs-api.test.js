import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { designs, designOwners } from '../database.js';
import { acquireTestServer } from './test-server.js';

process.env.JWT_SECRET ??= 'test-secret';
process.env.NODE_ENV = 'test';

const { default: server } = await import('../index.js');

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

const initialDesigns = new Map();
for (const [id, design] of designs.entries()) {
  initialDesigns.set(id, deepClone(design));
}

const initialDesignOwners = new Map();
for (const [id, record] of designOwners.entries()) {
  initialDesignOwners.set(id, deepClone(record));
}

function resetState() {
  designs.clear();
  for (const [id, design] of initialDesigns.entries()) {
    designs.set(id, deepClone(design));
  }
  designOwners.clear();
  for (const [id, record] of initialDesignOwners.entries()) {
    designOwners.set(id, deepClone(record));
  }
}

let baseUrl;
let serverHandle;

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${headerB64}.${payloadB64}`;
  const signature = createHmac('sha256', process.env.JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function buildAuthHeaders(role = 'admin') {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  const token = signJwt({ sub: 'admin-user', role, exp });
  return { Authorization: `Bearer ${token}` };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch (err) {
      body = null;
    }
  }
  return { response, body };
}

async function createDesign(overrides = {}) {
  const payload = {
    title: 'Admin Created Template',
    status: 'draft',
    thumbnailUrl: 'https://cdn.example.com/designs/admin-template.png',
    slides: [
      {
        id: 'slide_1',
        layout: 'cover',
        components: [{ type: 'text', value: 'Welcome' }]
      }
    ],
    tags: ['featured'],
    notes: 'Initial moderation notes',
    ...overrides
  };

  const headers = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders()
  };

  return request('/api/admin/designs', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
}

test.before(async () => {
  serverHandle = await acquireTestServer(server);
  baseUrl = serverHandle.baseUrl;
});

test.after(async () => {
  if (serverHandle) {
    await serverHandle.release();
    serverHandle = null;
  }
});

test.beforeEach(() => {
  resetState();
});

test.afterEach(() => {
  resetState();
});

test('POST /api/admin/designs rejects non-admin users', async () => {
  const payload = {
    title: 'Unauthorized Template',
    status: 'draft',
    thumbnailUrl: 'https://cdn.example.com/designs/unauthorized.png',
    slides: [],
    tags: [],
    notes: ''
  };

  const { response } = await request('/api/admin/designs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders('user')
    },
    body: JSON.stringify(payload)
  });

  assert.equal(response.status, 403);
});

test('POST /api/admin/designs validates required fields', async () => {
  const { response, body } = await request('/api/admin/designs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders()
    },
    body: JSON.stringify({ status: 'draft' })
  });

  assert.equal(response.status, 422);
  assert.equal(body?.error?.type, 'validation_error');
  assert.ok(Array.isArray(body?.error?.details));
  assert.ok(body.error.details.some((detail) => detail.field === 'title'));
});

test('POST /api/admin/designs creates a design record', async () => {
  const ownerId = 'user_123';
  const { response, body } = await createDesign({ ownerId });

  assert.equal(response.status, 201);
  assert.ok(body?.id);
  assert.equal(body.ownerId, ownerId);
  assert.equal(body.status, 'draft');
  assert.equal(body.title, 'Admin Created Template');
  assert.equal(body.thumbnailUrl, 'https://cdn.example.com/designs/admin-template.png');
  assert.ok(Array.isArray(body.slides));
  assert.equal(body.notes, 'Initial moderation notes');
  assert.ok(body.createdAt);
  assert.ok(body.updatedAt);

  const stored = designs.get(body.id);
  assert.ok(stored, 'Design should exist in storage');
  assert.equal(stored.status, 'draft');
  const ownership = designOwners.get(body.id);
  assert.equal(ownership?.userId, ownerId);
});

test('GET /api/admin/designs returns paginated results', async () => {
  const { body: created } = await createDesign({ title: 'List Template Example' });
  assert.ok(created?.id);

  const { response, body } = await request('/api/admin/designs', {
    method: 'GET',
    headers: buildAuthHeaders()
  });

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body?.data));
  assert.ok(body?.pagination);
  assert.equal(body.pagination.page, 1);
  assert.ok(body.pagination.total >= body.data.length);
  const found = body.data.find((design) => design.id === created.id);
  assert.ok(found, 'Created design should appear in admin listing');
});

test('PUT /api/admin/designs/:id replaces a design with optimistic locking', async () => {
  const { body: created } = await createDesign({ ownerId: 'owner_put' });
  assert.ok(created?.id);
  const designId = created.id;

  const replacement = {
    title: 'Replaced Template',
    status: 'published',
    thumbnailUrl: 'https://cdn.example.com/designs/replaced.png',
    slides: [
      {
        id: 'slide_main',
        layout: 'gallery',
        components: [{ type: 'image', assetId: 'asset_1' }]
      }
    ],
    tags: ['updated'],
    notes: 'Approved for publishing',
    ownerId: 'owner_put',
    price: 19.99
  };

  const headers = {
    'Content-Type': 'application/json',
    'If-Unmodified-Since': created.updatedAt,
    ...buildAuthHeaders()
  };

  const { response, body } = await request(`/api/admin/designs/${designId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(replacement)
  });

  assert.equal(response.status, 200);
  assert.equal(body.title, replacement.title);
  assert.equal(body.status, replacement.status);
  assert.equal(body.notes, replacement.notes);
  assert.equal(body.tags[0], 'updated');
  assert.equal(body.ownerId, 'owner_put');
  assert.notEqual(body.updatedAt, created.updatedAt);

  const stored = designs.get(designId);
  assert.equal(stored?.status, 'published');
  assert.equal(stored?.premium, true);

  const staleHeaders = {
    'Content-Type': 'application/json',
    'If-Unmodified-Since': created.updatedAt,
    ...buildAuthHeaders()
  };

  const staleAttempt = await request(`/api/admin/designs/${designId}`, {
    method: 'PUT',
    headers: staleHeaders,
    body: JSON.stringify(replacement)
  });

  assert.equal(staleAttempt.response.status, 409);
  assert.equal(staleAttempt.body?.error?.type, 'conflict_error');
});

test('PATCH /api/admin/designs/:id updates provided fields and validates input', async () => {
  const { body: created } = await createDesign();
  assert.ok(created?.id);
  const designId = created.id;

  const patchHeaders = {
    'Content-Type': 'application/json',
    'If-Unmodified-Since': created.updatedAt,
    ...buildAuthHeaders()
  };

  const patchBody = {
    status: 'published',
    notes: 'Ready for launch',
    tags: ['ready']
  };

  const { response, body } = await request(`/api/admin/designs/${designId}`, {
    method: 'PATCH',
    headers: patchHeaders,
    body: JSON.stringify(patchBody)
  });

  assert.equal(response.status, 200);
  assert.equal(body.status, 'published');
  assert.deepEqual(body.tags, ['ready']);
  assert.equal(body.notes, 'Ready for launch');

  const updated = designs.get(designId);
  assert.equal(updated?.status, 'published');
  assert.equal(updated?.notes, 'Ready for launch');

  const invalidPatch = await request(`/api/admin/designs/${designId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'If-Unmodified-Since': body.updatedAt,
      ...buildAuthHeaders()
    },
    body: JSON.stringify({ status: 'invalid', ownerId: 'new-owner' })
  });

  assert.equal(invalidPatch.response.status, 422);
  assert.equal(invalidPatch.body?.error?.type, 'validation_error');
  assert.ok(
    invalidPatch.body.error.details.some((detail) =>
      detail.field === 'status' || detail.field === 'ownerId'
    )
  );
});

test('DELETE /api/admin/designs/:id archives the design and enforces locking', async () => {
  const { body: created } = await createDesign();
  assert.ok(created?.id);
  const designId = created.id;

  const conflictHeaders = {
    'If-Unmodified-Since': new Date(Date.parse(created.updatedAt) - 1000).toISOString(),
    ...buildAuthHeaders()
  };
  const conflictAttempt = await request(`/api/admin/designs/${designId}`, {
    method: 'DELETE',
    headers: conflictHeaders
  });
  assert.equal(conflictAttempt.response.status, 409);
  assert.equal(conflictAttempt.body?.error?.type, 'conflict_error');

  const deleteHeaders = {
    'If-Unmodified-Since': created.updatedAt,
    ...buildAuthHeaders()
  };
  const { response } = await request(`/api/admin/designs/${designId}`, {
    method: 'DELETE',
    headers: deleteHeaders
  });

  assert.equal(response.status, 204);
  const stored = designs.get(designId);
  assert.ok(stored);
  assert.equal(stored.status, 'archived');
  assert.equal(stored.archivedByAdminId, 'admin-user');
});
