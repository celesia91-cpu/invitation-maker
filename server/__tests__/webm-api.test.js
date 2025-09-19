import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { webmFiles } from '../database.js';
import { addWebmFile } from '../webm-store.js';

process.env.JWT_SECRET ??= 'test-secret';
process.env.NODE_ENV = 'test';

const { default: server } = await import('../index.js');

let baseUrl;
const initialWebmIds = new Set(webmFiles.keys());
const AUTH_ERROR_MESSAGE = 'Design ownership required';

function expectAuthorizationError(body, message = AUTH_ERROR_MESSAGE) {
  assert.deepEqual(body, {
    error: {
      type: 'authorization_error',
      message
    }
  });
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${headerB64}.${payloadB64}`;
  const signature = createHmac('sha256', process.env.JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function buildAuthHeaders(userId, role = 'user') {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  const token = signJwt({ sub: userId, role, exp });
  return { Authorization: `Bearer ${token}` };
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch (err) {
      body = null;
    }
  }
  return { response, body };
}

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(0, () => resolve());
  });
  const address = server.address();
  if (typeof address === 'string') {
    baseUrl = address;
  } else {
    baseUrl = `http://127.0.0.1:${address.port}`;
  }
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test.afterEach(() => {
  for (const id of Array.from(webmFiles.keys())) {
    if (!initialWebmIds.has(id)) {
      webmFiles.delete(id);
    }
  }
});

test('POST /api/webm creates a WebM record for the design owner', async () => {
  const headers = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders('demo')
  };
  const payload = {
    designId: '1',
    storageUri: 'https://cdn.example.com/designs/1/new-preview.webm',
    durationSeconds: 4.5,
    sizeBytes: 2048
  };
  const { response, body } = await request('/api/webm', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  assert.equal(response.status, 201);
  assert.ok(body?.id);
  assert.equal(body.designId, '1');
  assert.equal(body.storageUri, payload.storageUri);
  assert.equal(body.uploadedBy, 'demo');
  assert.equal(body.durationSeconds, payload.durationSeconds);
  assert.equal(body.sizeBytes, payload.sizeBytes);
  assert.ok(webmFiles.has(body.id));
});

test('POST /api/webm rejects requests from non-owners', async () => {
  const headers = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders('not-owner')
  };
  const payload = {
    designId: '1',
    storageUri: 'https://cdn.example.com/designs/1/rejected.webm'
  };
  const { response, body } = await request('/api/webm', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  assert.equal(response.status, 403);
  expectAuthorizationError(body);
});

test('GET /api/webm/:id returns metadata when owner requests it', async () => {
  const { response, body } = await request('/api/webm/100', {
    method: 'GET',
    headers: buildAuthHeaders('demo')
  });

  assert.equal(response.status, 200);
  assert.equal(body.id, '100');
  assert.equal(body.designId, '1');
});

test('GET /api/webm/:id blocks access for non-owners', async () => {
  const { response, body } = await request('/api/webm/100', {
    method: 'GET',
    headers: buildAuthHeaders('stranger')
  });

  assert.equal(response.status, 403);
  expectAuthorizationError(body);
});

test('GET /api/webm/:id requires authentication', async () => {
  const { response, body } = await request('/api/webm/100', {
    method: 'GET'
  });

  assert.equal(response.status, 401);
  expectAuthorizationError(body, 'Authentication required');
});

test('GET /api/designs/:id/webm lists design assets for the owner', async () => {
  const { response, body } = await request('/api/designs/1/webm', {
    method: 'GET',
    headers: buildAuthHeaders('demo')
  });

  assert.equal(response.status, 200);
  assert.equal(body.designId, '1');
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length >= 1);
});

test('GET /api/designs/:id/webm rejects non-owners', async () => {
  const { response, body } = await request('/api/designs/3/webm', {
    method: 'GET',
    headers: buildAuthHeaders('demo')
  });

  assert.equal(response.status, 403);
  expectAuthorizationError(body);
});

test('GET /api/designs/:id/webm returns 401 when unauthenticated', async () => {
  const { response, body } = await request('/api/designs/1/webm', {
    method: 'GET'
  });

  assert.equal(response.status, 401);
  expectAuthorizationError(body, 'Authentication required');
});

test('PATCH /api/webm/:id updates metadata for the owner', async () => {
  const created = await addWebmFile({
    designId: '1',
    storageUri: 'https://cdn.example.com/designs/1/update-source.webm',
    uploadedBy: 'demo'
  });

  const { response, body } = await request(`/api/webm/${created.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders('demo')
    },
    body: JSON.stringify({ durationSeconds: 9.75 })
  });

  assert.equal(response.status, 200);
  assert.equal(body.durationSeconds, 9.75);
  assert.equal(webmFiles.get(created.id)?.durationSeconds, 9.75);
});

test('PATCH /api/webm/:id forbids updates from non-owners', async () => {
  const created = await addWebmFile({
    designId: '1',
    storageUri: 'https://cdn.example.com/designs/1/nope.webm',
    uploadedBy: 'demo'
  });

  const { response, body } = await request(`/api/webm/${created.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders('stranger')
    },
    body: JSON.stringify({ durationSeconds: 2 })
  });

  assert.equal(response.status, 403);
  expectAuthorizationError(body);
});

test('DELETE /api/webm/:id removes the record for the owner', async () => {
  const created = await addWebmFile({
    designId: '1',
    storageUri: 'https://cdn.example.com/designs/1/delete-me.webm',
    uploadedBy: 'demo'
  });

  const { response } = await request(`/api/webm/${created.id}`, {
    method: 'DELETE',
    headers: buildAuthHeaders('demo')
  });

  assert.equal(response.status, 204);
  assert.equal(webmFiles.has(created.id), false);
});

test('DELETE /api/webm/:id rejects non-owners', async () => {
  const created = await addWebmFile({
    designId: '1',
    storageUri: 'https://cdn.example.com/designs/1/reject-delete.webm',
    uploadedBy: 'demo'
  });

  const { response, body } = await request(`/api/webm/${created.id}`, {
    method: 'DELETE',
    headers: buildAuthHeaders('stranger')
  });

  assert.equal(response.status, 403);
  expectAuthorizationError(body);
  assert.equal(webmFiles.has(created.id), true);
});
