import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, applyDecision, publicGame, askJev } from '../game.mjs';

test('three good distinct arguments win, completed games cannot change', () => {
  const game = newGame();
  for (const message of ['uno', 'dos', 'tres']) applyDecision(game, message, 'convincing');
  assert.equal(game.status, 'won');
  assert.equal(game.turns, 3);
  assert.throws(() => applyDecision(game, 'four', 'convincing'));
});
test('six neutral turns lose and repeating a successful line cannot farm points', () => {
  const neutral = newGame();
  for (let i = 0; i < 6; i++) applyDecision(neutral, String(i), 'neutral');
  assert.equal(neutral.status, 'lost');
  const repeat = newGame();
  applyDecision(repeat, 'hola', 'convincing');
  applyDecision(repeat, 'HOLA', 'convincing');
  assert.equal(repeat.score, 32);
  assert.equal(repeat.history[1].choice, 'repeat');
});
test('hostility ends the game and private state is not exposed', () => {
  const game = newGame();
  applyDecision(game, 'example', 'hostile');
  assert.equal(game.status, 'lost');
  assert.equal(publicGame(game).history, undefined);
  assert.equal(publicGame(game).busy, undefined);
});
test('unknown provider choices cannot mutate the score', () => {
  const game = newGame();
  assert.throws(() => applyDecision(game, 'text', '__proto__'));
  assert.equal(game.turns, 0);
});
test('provider failures and invalid outputs do not fabricate decisions', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 401 }));
  await assert.rejects(askJev(newGame(), 'hello'), /Provider HTTP 401/);
  globalThis.fetch.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ answers: { reaction: { choice: 'unknown' } } }) }));
  await assert.rejects(askJev(newGame(), 'hello'), /Invalid provider decision/);
});
