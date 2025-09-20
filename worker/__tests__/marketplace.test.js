import test from 'node:test';
import assert from 'node:assert/strict';

import { recordView, recordConversion } from '../../server/analytics-store.js';

const workerModule = await import('../index.js');
const worker = workerModule.default ?? workerModule;

function buildHeaders(overrides = {}) {
  return {
    'X-User-Id': 'user-default',
    'X-User-Role': 'user',
    ...overrides
  };
}

async function fetchMarketplace(path, { headers } = {}) {
  const request = new Request(`https://example.com${path}`, {
    method: 'GET',
    headers: headers ?? buildHeaders()
  });
  const response = await worker.fetch(request, {}, {});
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { response, body };
}

test('consumer alias resolves to consumer marketplace listings', async () => {
  const { response, body } = await fetchMarketplace('/api/marketplace', {
    headers: buildHeaders({ 'X-User-Id': 'consumer-user', 'X-User-Role': 'user' })
  });

  assert.equal(response.status, 200);
  assert.equal(body.role, 'consumer');
  const ids = body.data.map((entry) => entry.id);
  assert.ok(ids.includes('1'));
  assert.ok(!ids.includes('2'));
  assert.ok(ids.includes('3'));
});

test('creator role exposes creator listings and flags', async () => {
  const { response, body } = await fetchMarketplace('/api/marketplace', {
    headers: buildHeaders({ 'X-User-Role': 'creator' })
  });

  assert.equal(response.status, 200);
  assert.equal(body.role, 'creator');
  const ids = body.data.map((entry) => entry.id);
  assert.ok(ids.includes('2'));
  assert.ok(!ids.includes('3'));
  const creatorListing = body.data.find((entry) => entry.id === '2');
  assert.ok(creatorListing?.flags);
  assert.ok(Object.prototype.hasOwnProperty.call(creatorListing.flags, 'isAdminTemplate'));
});

test('admin role returns visibility and conversion insights', async () => {
  recordView('1');
  recordView('1');
  recordConversion('1');

  const { response, body } = await fetchMarketplace('/api/marketplace', {
    headers: buildHeaders({ 'X-User-Role': 'admin', 'X-User-Id': 'admin-user' })
  });

  assert.equal(response.status, 200);
  assert.equal(body.role, 'admin');
  const entry = body.data.find((item) => item.id === '1');
  assert.ok(entry);
  assert.ok(entry.visibility);
  assert.equal(entry.visibility.consumer, true);
  assert.equal(entry.conversionRate, 0.5);
});

test('unsupported roles are rejected', async () => {
  const { response, body } = await fetchMarketplace('/api/marketplace', {
    headers: buildHeaders({ 'X-User-Role': 'guest' })
  });

  assert.equal(response.status, 400);
  assert.equal(body?.error, 'Unsupported role');
});

test('non-admin callers cannot override their marketplace role', async () => {
  const { response, body } = await fetchMarketplace('/api/marketplace?role=admin', {
    headers: buildHeaders({ 'X-User-Role': 'creator' })
  });

  assert.equal(response.status, 403);
  assert.equal(body?.error, 'Forbidden role override');
});

test('ownership filters limit marketplace payloads', async () => {
  const ownerResponse = await fetchMarketplace('/api/marketplace?ownerId=demo', {
    headers: buildHeaders({ 'X-User-Role': 'admin' })
  });
  assert.equal(ownerResponse.response.status, 200);
  assert.deepEqual(
    ownerResponse.body.data.map((entry) => entry.id),
    ['1', '2']
  );

  const mineResponse = await fetchMarketplace('/api/marketplace?mine=1', {
    headers: buildHeaders({ 'X-User-Role': 'admin', 'X-User-Id': 'studio-omega' })
  });
  assert.equal(mineResponse.response.status, 200);
  assert.deepEqual(
    mineResponse.body.data.map((entry) => entry.id),
    ['3']
  );
});
