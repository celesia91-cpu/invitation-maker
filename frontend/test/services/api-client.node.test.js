/**
 * @jest-environment node
 */

import { APIClient } from '../../services/api-client.js';

const noopFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

describe('APIClient.saveToken in non-browser environments', () => {
  beforeEach(() => {
    delete global.localStorage;
    delete global.sessionStorage;
  });

  test('does not throw when web storage APIs are unavailable', () => {
    const client = new APIClient('http://example.com', noopFetch);

    expect(() => client.saveToken('abc123')).not.toThrow();
    expect(client.token).toBeNull();
  });

  test('persists using provided storage when browser storage is missing', () => {
    const client = new APIClient('http://example.com', noopFetch);
    const store = {};
    const storage = {
      setItem: jest.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
    };

    client._storage = storage;

    expect(() => client.saveToken('token-123')).not.toThrow();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(client._storageKey, expect.any(String));
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(JSON.parse(store[client._storageKey]).token).toBe('token-123');
    expect(client.token).toBe('token-123');
  });
});

describe('APIClient marketplace endpoint resolution', () => {
  const createFetchSpy = () => jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ items: [] }),
    text: async () => ''
  });

  test.each([
    ['absolute base without /api yields /api/marketplace path', 'https://example.com', 'https://example.com/api/marketplace'],
    ['absolute base ending in /api avoids duplication', 'https://example.com/api', 'https://example.com/api/marketplace'],
    ['absolute base with trailing slash still gains api prefix', 'https://example.com/', 'https://example.com/api/marketplace'],
    ['relative /api base keeps single /api prefix', '/api', '/api/marketplace']
  ])('%s', async (_label, baseUrl, expectedUrl) => {
    const fetchSpy = createFetchSpy();
    const client = new APIClient(baseUrl, fetchSpy);

    await client.listMarketplace();

    expect(fetchSpy).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({
      method: 'GET'
    }));
  });
});

describe('APIClient auth and health endpoint resolution with /api base', () => {
  const createFetchSpy = (payload = {}) =>
    jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    });

  test('uses api namespace for auth endpoints when constructed with /api base', async () => {
    const fetchSpy = createFetchSpy();
    const client = new APIClient('/api', fetchSpy);

    await client.request('/auth/login', { method: 'POST' });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('login helper preserves api namespace when base includes /api', async () => {
    const responsePayload = { token: 'token-123', user: { id: 'user-1' } };
    const fetchSpy = createFetchSpy(responsePayload);
    const client = new APIClient('/api', fetchSpy);

    await client.login({ email: 'user@example.com', password: 'secret' });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('uses api namespace for health endpoint when constructed with /api base', async () => {
    const fetchSpy = createFetchSpy();
    const client = new APIClient('/api', fetchSpy);

    await client.request('/health');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('healthCheck helper preserves api namespace when base includes /api', async () => {
    const fetchSpy = createFetchSpy({ status: 'ok' });
    const client = new APIClient('/api', fetchSpy);

    await client.healthCheck();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
