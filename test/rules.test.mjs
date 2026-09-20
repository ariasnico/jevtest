import test from 'node:test';
import assert from 'node:assert/strict';
import { decideTurn } from '../lib/rules.mjs';
const ev = {reaction:'name_drop',novelty:1,relevance:1,contradiction:0,threat:0,confidence:1};
test('zero affinity does not end the game early', () => {
  const game = {turns:1,score:6,history:[],status:'playing'};
  assert.equal(decideTurn(game,'Es amigo mío',ev).status,'playing');
  assert.equal(decideTurn(game,'Es amigo mío',ev).score,0);
  assert.equal(game.score,6);
});
test('uncertainty asks for clarification and weak insults do not end game', () => {
  const game = {turns:0,score:12,history:[],status:'playing'};
  assert.equal(decideTurn(game,'hola',{...ev,confidence:.2}).action,'ask_detail');
  assert.equal(decideTurn(game,'ortiva',{...ev,reaction:'hostile',threat:.1}).status,'playing');
  assert.equal(decideTurn(game,'amenaza',{...ev,threat:.99}).status,'lost');
});
test('repeated arguments cannot earn points and sixth turn ends game', () => {
  const game = {turns:1,score:40,history:[{player:'  Mi Cumpleaños  '}],status:'playing'};
  assert.equal(decideTurn(game,'mi cumpleaños',{...ev,reaction:'sincere'}).score,30);
  assert.equal(decideTurn({...game,turns:5},'otro',{...ev,reaction:'neutral'}).status,'lost');
  assert.equal(decideTurn({...game,score:70},'nuevo',{...ev,reaction:'convincing'}).status,'won');
});
