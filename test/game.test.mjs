import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,publicGame} from '../game.mjs';
import {executeTurn} from '../lib/turns.mjs';
import {evaluateTurn} from '../lib/evaluation.mjs';
const evaluation={reaction:'convincing',confidence:.99,novelty:.99,relevance:.99,contradiction:0,threat:0};
const deps={evaluate:async()=>evaluation,generate:async()=> 'Buen punto. ¿Qué más me contás?',validate:async()=>({ok:true})};
const request=(n=0)=>({turnId:String(n),expectedVersion:n,message:'Una razón nueva '+n});
test('an insult produces a terminal refusal and later apologies cannot reopen the game',async()=>{
  const game=newGame();let calls=0;
  const providers={...deps,evaluate:async()=>({...evaluation,reaction:'hostile',threat:0}),
    generate:async()=>{calls++;throw Error('Writer must not run after expulsion');},
    validate:async()=>{calls++;throw Error('Validator must not run after expulsion');}};
  const insult={...request(),message:'alta cara de boludo tenes'};
  const response=await executeTurn(game,insult,providers);
  assert.equal(response.status,'lost');assert.equal(response.turns,1);
  assert.equal(response.line,'Con ese trato no entrás. Se terminó la charla.');
  assert.equal(game.action,'refuse');
  assert.deepEqual(await executeTurn(game,insult,providers),response);
  await assert.rejects(executeTurn(game,{...request(1),message:'Perdón, era un chiste.'},providers),{code:'finished'});
  assert.equal(calls,0);
});
test('three good turns win; replay is free and altered payload rejected',async()=>{
  const game=newGame();let calls=0;
  const providers={...deps,generate:async()=>{calls++;return 'Respuesta '+calls;}};
  for(let i=0;i<3;i++)await executeTurn(game,request(i),providers);
  assert.equal(game.status,'won');assert.equal(game.turns,3);
  assert.equal((await executeTurn(game,request(2),providers)).status,'won');assert.equal(calls,3);
  await assert.rejects(executeTurn(game,{...request(2),message:'otro'},providers),{code:'conflict'});
  assert.equal(publicGame(game).operations,undefined);assert.equal(publicGame(game).history,undefined);
});
test('failed validation regenerates once and never mutates game',async()=>{
  const game=newGame();let calls=0;const before=publicGame(game);
  await assert.rejects(executeTurn(game,request(),{...deps,generate:async()=>{calls++;return 'No';},validate:async()=>({ok:false,reasons:['contradiction']})}),{code:'failed'});
  assert.equal(calls,2);assert.deepEqual(publicGame(game),before);assert.equal(game.busy,false);
  await assert.rejects(executeTurn(game,request(),deps),{code:'failed'});
});
test('pending duplicate and stale version cannot consume another turn',async()=>{
  const game=newGame();let release;
  const pending=executeTurn(game,request(),{...deps,evaluate:()=>new Promise(resolve=>{release=resolve;})});
  await assert.rejects(executeTurn(game,request(),deps),{code:'pending'});
  release(evaluation);await pending;
  await assert.rejects(executeTurn(game,{...request(),turnId:'other'},deps),{code:'stale'});
  assert.equal(game.turns,1);
});
test('invalid or failed Jev outputs do not invent evaluations',async t=>{
  t.mock.method(globalThis,'fetch',async()=>({ok:false,status:401}));
  await assert.rejects(evaluateTurn(newGame(),'hola'),/Jev HTTP 401/);
  globalThis.fetch.mock.mockImplementation(async()=>({ok:true,json:async()=>({answers:{reaction:{choice:'unknown'}}})}));
  await assert.rejects(evaluateTurn(newGame(),'hola'),/Invalid Jev reaction/);
});
