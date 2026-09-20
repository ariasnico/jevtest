import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { askJev, applyDecision, newGame, publicGame } from './game.mjs';

const PORT = Number(process.env.PORT || 3000);
const HOST = '127.0.0.1';
const sessions = new Map();
let budget = { start: Date.now(), calls: 0 };
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/motion.js', ['motion.js', 'text/javascript; charset=utf-8']],
  ['/assets/caramelo-door.png', ['assets/caramelo-door.png', 'image/png']]
]);
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
function json(res, status, value, extra = {}) {
  res.writeHead(status, { ...headers, 'Content-Type': 'application/json', ...extra });
  res.end(JSON.stringify(value));
}
async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 4096) throw new Error('Body too large');
  }
  return JSON.parse(body);
}
export const server = http.createServer(async (req, res) => {
  try {
    // Fixed local host allowlist prevents DNS rebinding. Never serve the repo root.
    if (![`127.0.0.1:${PORT}`, `localhost:${PORT}`].includes(req.headers.host)) return json(res, 403, { error: 'Host no permitido.' });
    const path = new URL(req.url, `http://127.0.0.1:${PORT}`).pathname;
    if (req.method === 'GET' && assets.has(path)) {
      const [file, type] = assets.get(path);
      const body = await readFile(new URL(`./public/${file}`, import.meta.url));
      res.writeHead(200, { ...headers, 'Content-Type': type });
      return res.end(body);
    }
    if (req.method !== 'POST' || !['/api/start', '/api/talk'].includes(path)) return json(res, 404, { error: 'No encontrado.' });
    if (req.headers.origin !== `http://${req.headers.host}` || req.headers['content-type']?.split(';')[0] !== 'application/json') return json(res, 403, { error: 'Origen no permitido.' });
    if (!process.env.JEV_API_KEY) return json(res, 503, { error: 'Falta configurar JEV_API_KEY en el .env del servidor.' });
    for (const [id, game] of sessions) if (game.expires < Date.now() && !game.busy) sessions.delete(id);
    if (path === '/api/start') {
      if (sessions.size >= 500) return json(res, 429, { error: 'La puerta está llena. Volvé en un rato.' });
      const oldId = req.headers.cookie?.match(/(?:^|;\s*)caramelo=([a-f0-9]{48})(?:;|$)/)?.[1];
      if (oldId && sessions.get(oldId)?.busy) return json(res, 409, { error: 'Esperá la respuesta del patova.' });
      if (oldId) sessions.delete(oldId);
      const id = randomBytes(24).toString('hex');
      const game = newGame();
      sessions.set(id, game);
      return json(res, 200, publicGame(game), { 'Set-Cookie': `caramelo=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600` });
    }
    const id = req.headers.cookie?.match(/(?:^|;\s*)caramelo=([a-f0-9]{48})(?:;|$)/)?.[1];
    const game = sessions.get(id);
    if (!game) return json(res, 401, { error: 'La noche terminó. Empezá una nueva partida.' });
    if (game.status !== 'playing' || game.busy) return json(res, 409, { error: 'Esperá la respuesta o empezá otra noche.' });
    let body;
    try { body = await readBody(req); } catch { return json(res, 400, { error: 'Mensaje inválido.' }); }
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 280) return json(res, 400, { error: 'Escribí entre 1 y 280 caracteres.' });
    // Another request may have acquired the session while this body was streaming.
    if (game.busy || game.status !== 'playing' || sessions.get(id) !== game) return json(res, 409, { error: 'Esperá la respuesta o empezá otra noche.' });
    if (Date.now() - budget.start > 3600000) budget = { start: Date.now(), calls: 0 };
    if (budget.calls >= 100) return json(res, 429, { error: 'Llegamos al límite local de 100 mensajes por hora. Volvé más tarde.' });
    game.busy = true;
    budget.calls++;
    try {
      const choice = await askJev(game, message);
      return json(res, 200, applyDecision(game, message, choice));
    } catch {
      return json(res, 502, { error: 'El handy del patova se quedó sin señal. Probá de nuevo; no perdiste un intento.' });
    } finally { game.busy = false; }
  } catch {
    if (!res.headersSent) json(res, 500, { error: 'Algo falló en la puerta. Intentá otra vez.' });
    else res.end();
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => console.log(`Caramelo → http://${HOST}:${PORT}`));
}
