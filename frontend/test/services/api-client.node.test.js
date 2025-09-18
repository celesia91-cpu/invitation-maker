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
