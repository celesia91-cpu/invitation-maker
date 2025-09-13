import assert from 'node:assert';

function createStorage() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: key => { store.delete(key); },
    clear: () => { store.clear(); }
  };
}

global.localStorage = createStorage();
global.sessionStorage = createStorage();

const { APIClient } = await import('./api-client.js');

const fetchStub = async () => ({
  ok: true,
  headers: { get: () => 'application/json' },
  json: async () => ({ token: 'abc123', user: { email: 'user@example.com' } })
});

// Session-only storage uses sessionStorage
{
  const client = new APIClient('http://test', fetchStub);
  await client.login({ email: 'a', password: 'b', remember: false });
  assert.ok(sessionStorage.getItem('app_auth_session'));
  assert.strictEqual(localStorage.getItem('app_auth_session'), null);
  console.log('session tokens stored in sessionStorage');
}

// Persistent storage survives reload
{
  localStorage.clear();
  sessionStorage.clear();
  let client = new APIClient('http://test', fetchStub);
  await client.login({ email: 'a', password: 'b', remember: true });
  assert.ok(localStorage.getItem('app_auth_session'));
  client = new APIClient('http://test', fetchStub);
  assert.strictEqual(client.token, 'abc123');
  console.log('persistent token survives reload');
}

// Expired sessions are cleaned up
{
  localStorage.setItem('app_auth_session', JSON.stringify({ token: 'old', lastActivity: Date.now() - (8 * 24 * 60 * 60 * 1000) }));
  sessionStorage.setItem('app_auth_session', JSON.stringify({ token: 'old', lastActivity: Date.now() - (2 * 24 * 60 * 60 * 1000) }));
  const client = new APIClient('http://test', fetchStub);
  assert.strictEqual(client.token, null);
  assert.strictEqual(localStorage.getItem('app_auth_session'), null);
  assert.strictEqual(sessionStorage.getItem('app_auth_session'), null);
  console.log('expired sessions are removed');
}
