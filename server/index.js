// server/index.js
// Minimal HTTP server exposing GET /api/designs

import http from 'node:http';
import { authenticate } from './auth.js';
import { getDesignsByUser } from './designs-store.js';

const port = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  try {
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
