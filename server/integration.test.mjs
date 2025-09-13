import assert from 'node:assert';
import { createHmac } from 'node:crypto';
import { userTokens } from './database.js';

process.env.NODE_ENV = 'test';
const server = (await import('./index.js')).default;

function makeToken(id){
  const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const payload = Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  const sig = createHmac('sha256','dev-secret').update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

userTokens.set('demo',2);
await new Promise(res => server.listen(0,res));
const port = server.address().port;
const base = `http://localhost:${port}`;
const token = makeToken('demo');
const headers = { Authorization: `Bearer ${token}` };

// Marketplace fetch
let res = await fetch(`${base}/api/designs`, { headers });
let list = await res.json();
assert.ok(Array.isArray(list) && list.length >= 1);
console.log('login to marketplace returns designs');

// Editor fetch
res = await fetch(`${base}/api/designs/1`, { headers });
const design = await res.json();
assert.strictEqual(design.id, '1');
console.log('navigation to editor fetches design');

// Payment processing stub
res = await fetch(`${base}/api/purchase`, { method:'POST', headers:{...headers,'Content-Type':'application/json'}, body: JSON.stringify({tokens:-1}) });
let data = await res.json();
assert.strictEqual(data.tokens, 1);
console.log('purchase endpoint deducts token');

// Unauthorized access
res = await fetch(`${base}/api/designs`);
assert.strictEqual(res.status, 401);
console.log('unauthorized access rejected');

// Token tampering
const badToken = token.slice(0,-1) + 'x';
res = await fetch(`${base}/api/designs`, { headers:{ Authorization: `Bearer ${badToken}` } });
assert.strictEqual(res.status, 401);
console.log('tampered token rejected');

// Injection attempt
res = await fetch(`${base}/api/designs/1%3BDROP`, { headers });
assert.strictEqual(res.status, 400);
console.log('injection attack in path rejected');

server.close();
