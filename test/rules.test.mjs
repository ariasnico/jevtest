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
test('uncertainty asks for clarification but direct insults and threats end game', () => {
  const game = {turns:0,score:12,history:[],status:'playing'};
  assert.equal(decideTurn(game,'hola',{...ev,confidence:.2}).action,'ask_detail');
  assert.equal(decideTurn(game,'ortiva',{...ev,reaction:'hostile',threat:.1}).status,'lost');
  assert.equal(decideTurn(game,'amenaza',{...ev,threat:.99}).status,'lost');
});
test('direct insult closes entry regardless of score, repetition or novelty', () => {
  const message='alta cara de boludo tenes';
  for(const score of [12,79,95]) {
    for(const history of [[],[{player:message}]]) {
      const result=decideTurn({turns:0,score,history,status:'playing'},message,
        {...ev,reaction:'hostile',novelty:0,relevance:0,threat:0});
      assert.equal(result.status,'lost');
      assert.equal(result.action,'refuse');
    }
  }
});
test('slang, self-deprecation and reported insults do not trigger a keyword ban', () => {
  const game={turns:0,score:12,history:[],status:'playing'};
  for(const message of ['Boludo, qué frío, ¿falta mucho?', 'Soy un boludo, me olvidé la entrada.', 'El de atrás me dijo boludo.']) {
    assert.equal(decideTurn(game,message,{...ev,reaction:'neutral'}).status,'playing');
  }
});
test('repeated arguments cannot earn points and sixth turn ends game', () => {
  const game = {turns:1,score:40,history:[{player:'  Mi Cumpleaños  '}],status:'playing'};
  assert.equal(decideTurn(game,'mi cumpleaños',{...ev,reaction:'sincere'}).score,30);
  assert.equal(decideTurn({...game,turns:5},'otro',{...ev,reaction:'neutral'}).status,'lost');
  assert.equal(decideTurn({...game,score:70},'nuevo',{...ev,reaction:'convincing'}).status,'won');
});
