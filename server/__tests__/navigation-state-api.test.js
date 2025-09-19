import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { acquireTestServer } from './test-server.js';

process.env.JWT_SECRET ??= 'test-secret';
process.env.NODE_ENV = 'test';

const { default: server } = await import('../index.js');

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
  serverHandle = await acquireTestServer(server);
  baseUrl = serverHandle.baseUrl;
});

test.after(async () => {
  if (serverHandle) {
    await serverHandle.release();
    serverHandle = null;
  }
});

test('GET /api/navigation/state returns an empty object by default', async () => {
  const { response, body } = await request('/api/navigation/state', {
    method: 'GET',
    headers: buildAuthHeaders('nav-default-user')
  });

  assert.equal(response.status, 200);
  assert.deepEqual(body, { state: {} });
});

test('PUT /api/navigation/state saves the provided state for the user', async () => {
  const userId = 'nav-save-user';
  const payload = {
    currentStep: 'details',
    completedSteps: ['intro']
  };

  const { response: saveResponse, body: saveBody } = await request('/api/navigation/state', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(userId)
    },
    body: JSON.stringify(payload)
  });

  assert.equal(saveResponse.status, 200);
  assert.deepEqual(saveBody, { state: payload });

  const { response: fetchResponse, body: fetchBody } = await request('/api/navigation/state', {
    method: 'GET',
    headers: buildAuthHeaders(userId)
  });

  assert.equal(fetchResponse.status, 200);
  assert.deepEqual(fetchBody, { state: payload });
});

test('PATCH /api/navigation/state merges updates into the existing state', async () => {
  const userId = 'nav-partial-user';
  const initialState = { currentStep: 'templates', layout: 'grid' };

  await request('/api/navigation/state', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(userId)
    },
    body: JSON.stringify(initialState)
  });

  const updates = { layout: 'list', lastVisitedAt: '2024-01-01T00:00:00.000Z' };
  const { response: patchResponse, body: patchBody } = await request('/api/navigation/state', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(userId)
    },
    body: JSON.stringify(updates)
  });

  assert.equal(patchResponse.status, 200);
  assert.deepEqual(patchBody, {
    state: {
      currentStep: 'templates',
      layout: 'list',
      lastVisitedAt: '2024-01-01T00:00:00.000Z'
    }
  });
});

test('PUT /api/navigation/state requires authentication', async () => {
  const { response, body } = await request('/api/navigation/state', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentStep: 'details' })
  });

  assert.equal(response.status, 401);
  assert.deepEqual(body, {
    error: {
      type: 'authorization_error',
      message: 'Authentication required'
    }
  });
});
