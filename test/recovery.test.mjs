import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,publicGame} from '../game.mjs';
import {executeTurn,TurnError} from '../lib/turns.mjs';
import {providerJSON} from '../lib/provider.mjs';
import {recoveryDialogue} from '../lib/recovery-dialogue.mjs';
const evaluation={reaction:'convincing',confidence:.99,novelty:.99,relevance:.99,contradiction:0,threat:0};
const req={turnId:'recovery',expectedVersion:0,message:'Un plan concreto'};
const deps={evaluate:async()=>evaluation,generate:async()=> 'Buen plan.',validate:async()=>({ok:true})};
test('writer and validator outages recover without changing the Jev decision',async()=>{
  for(const chapter of ['door','vip'])for(const stage of ['generate','validate']) {
    const game={...newGame(),chapter};let calls=0;
    const result=await executeTurn(game,req,{...deps,[stage]:async()=>{calls++;throw Error('outage');}});
    assert.equal(result.turns,1);assert.equal(result.score,42);assert.equal(result.status,'playing');assert.equal(calls,2);
    assert.equal(game.operations.get(req.turnId).dialogueSource,'recovery');
  }
});
test('temporary writer failure can recover with generated dialogue',async()=>{
  let calls=0;const game=newGame();
  const result=await executeTurn(game,req,{...deps,generate:async()=>{if(++calls===1)throw Error('network');return 'Eso suena bien.';}});
  assert.equal(result.line,'Eso suena bien.');assert.equal(calls,2);assert.equal(game.operations.get(req.turnId).dialogueSource,'generated');
});
test('Jev failure never awards points or falls back to a fabricated decision',async()=>{
  const game=newGame(),before=publicGame(game);
  await assert.rejects(executeTurn(game,req,{...deps,evaluate:async()=>{throw Error('offline');}}),{code:'evaluation_unavailable'});
  assert.deepEqual(publicGame(game),before);assert.equal(game.busy,false);
});
test('security and accounting failures cannot be swallowed by dialogue recovery',async()=>{
  const game=newGame(),before=publicGame(game);
  await assert.rejects(executeTurn(game,req,{...deps,generate:async()=>{throw new TurnError(503,'Blocked','unavailable');}}),{code:'unavailable'});
  assert.deepEqual(publicGame(game),before);
});
test('all authored recovery lines respect the result, length and no-repeat constraints',()=>{
  for(const chapter of ['door','vip'])for(const reaction of ['sincere','funny','convincing','name_drop','bribe','repeat','manipulation','neutral']) {
    const game={...newGame(),chapter};
    for(let i=0;i<6;i++) {
      const line=recoveryDialogue(game,{reaction,status:'playing',action:'acknowledge'});
      assert.ok(line.length<=180);assert.ok(!game.history.some(item=>item.guard===line));
      game.history.push({guard:line});game.line=line;game.turns++;
    }
  }
});
test('door victory and defeat also survive writer failure',async()=>{
  for(const state of [{score:65},{turns:5}]) {
    const game={...newGame(),...state};
    const result=await executeTurn(game,req,{...deps,generate:async()=>{throw Error('must not call');}});
    assert.equal(result.status,state.score?'won':'lost');
  }
});
test('transient provider failure retries once and accounts for both calls',async t=>{
  let calls=0,reservations=0;
  t.mock.method(globalThis,'fetch',async()=>++calls===1?{ok:false,status:503}:{ok:true,json:async()=>({ok:true})});
  const result=await providerJSON({provider:'jev',url:'https://example.test',payload:{},key:'test',attempts:2,beforeCall:()=>{reservations++;}});
  assert.deepEqual(result,{ok:true});assert.equal(calls,2);assert.equal(reservations,2);
});
test('auth failures and long Retry-After are not retried',async t=>{
  for(const status of [401,429]) {
    let calls=0;
    t.mock.method(globalThis,'fetch',async()=>{calls++;return {ok:false,status,headers:new Headers({'Retry-After':'60'})};});
    await assert.rejects(providerJSON({provider:'openai',url:'https://example.test',payload:{},key:'test',attempts:2}),{status});
    assert.equal(calls,1);t.mock.restoreAll();
  }
});
test('provider retry does not bypass a failed security hook',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return {ok:false,status:503};});
  await assert.rejects(providerJSON({provider:'jev',url:'https://example.test',payload:{},key:'test',attempts:2,beforeCall:()=>{throw Error('blocked');}}),/blocked/);
  assert.equal(calls,0);
});
test('recovery diagnostics never log player text or arbitrary provider errors',async t=>{
  const logs=[];t.mock.method(console,'warn',line=>logs.push(line));
  await executeTurn(newGame(),{...req,message:'PRIVATE PLAYER MESSAGE'},{...deps,generate:async()=>{throw Error('SECRET TOKEN');}});
  assert.ok(logs.length);assert.doesNotMatch(logs.join(''),/PRIVATE PLAYER MESSAGE|SECRET TOKEN/);
  assert.ok(logs.some(line=>JSON.parse(line).event==='dialogue_recovered'));
});
