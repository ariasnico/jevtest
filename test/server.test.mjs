import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { server } from '../server.mjs';

test('HTTP boundaries protect private files, session state, origin and input', async t => {
  process.env.JEV_API_KEY = 'test-only-placeholder';
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const host = `127.0.0.1:${process.env.PORT || 3000}`;
  async function request(path, body, extra = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(url + path, { method: body === undefined ? 'GET' : 'POST', headers: { Host: host, Origin: `http://${host}`, 'Content-Type': 'application/json', ...extra } }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers })));
      });
      req.on('error', reject);
      req.end(body === undefined ? undefined : JSON.stringify(body));
    });
  }
  for (const path of ['/.env', '/.git/config', '/server.mjs', '/%2e%2e/.env']) assert.equal((await request(path)).status, 404);
  assert.equal((await request('/api/start', {}, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('/api/start', {}, { Host: 'evil.example' })).status, 403);
  assert.equal((await request('/api/talk', { message: 'hi' })).status, 401);
  const start = await request('/api/start', {});
  assert.equal(start.status, 200);
  const cookie = start.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly; SameSite=Strict/);
  const body = await start.json();
  assert.equal(body.score, 12);
  assert.equal(body.history, undefined);
  const session = { Cookie: cookie.split(';')[0] };
  assert.equal((await request('/api/talk', null, session)).status, 400);
  for (const message of ['', 'x'.repeat(281), 123]) assert.equal((await request('/api/talk', { message }, session)).status, 400);
  const root = await request('/');
  assert.equal(root.status, 200);
  assert.match(root.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
