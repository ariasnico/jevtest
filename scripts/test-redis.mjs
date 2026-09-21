// Opt-in integration test. Uses a unique expiring namespace; never real providers
// or production counters. node --env-file=.env.production.local scripts/test-redis.mjs
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {ProductionStore} from '../lib/production-store.mjs';
const store=new ProductionStore({prefix:`caramelo:test:${randomUUID()}`});
const id=randomUUID();
const evaluation={reaction:'convincing',confidence:.99,novelty:.99,relevance:.99,contradiction:0,threat:0};
let calls=0;
const deps={evaluate:async()=>{calls++;return evaluation;},generate:async()=> 'Buen punto. ¿Qué más me contás?',validate:async()=>({ok:true})};
await store.start(id);
await assert.rejects(store.continue(id,0),{code:'chapter_locked'});
assert.equal((await store.resume(id)).chapter,'door');
const request={turnId:randomUUID(),expectedVersion:0,message:'Vengo a festejar mi primer sueldo.'};
const response=await store.talk(id,request,deps);
assert.equal(response.turns,1);
assert.deepEqual(await store.talk(id,request,deps),response);assert.equal(calls,1);
await assert.rejects(store.talk(id,{...request,message:'alterado'},deps),{code:'conflict'});
await assert.rejects(store.talk(id,{...request,turnId:randomUUID()},deps),{code:'stale'});
const failed={turnId:randomUUID(),expectedVersion:1,message:'Un nuevo argumento.'};
await assert.rejects(store.talk(id,failed,{...deps,generate:async()=>{throw Error('provider unavailable');}}),{code:'failed'});
const callsAfterFailure=calls;
await assert.rejects(store.talk(id,failed,deps),{code:'failed'});
assert.equal(calls,callsAfterFailure);
// Simulate a worker dying after durable reservation but before it can commit.
const gameKey=`${store.prefix}:game:${id}`;
const interrupted=JSON.parse(await store.command('GET',gameKey));
interrupted.operations.find(([key])=>key===failed.turnId)[1].pending=true;
await store.command('SET',gameKey,JSON.stringify(interrupted),'EX',3600);
await assert.rejects(store.talk(id,failed,deps),{code:'failed'});
assert.equal(calls,callsAfterFailure);
assert.equal(JSON.parse(await store.command('GET',gameKey)).version,1);
await store.locked(id,async lease=>{
  await assert.rejects(store.start(id),{code:'pending'});
  await assert.rejects(store.talk(id,request,deps),{code:'pending'});
  const day=new Date().toISOString().slice(0,10);
  const key=`${store.prefix}:budget:${day}`;
  await store.command('SET',key,'1980000','EX',300);
  const meta={provider:'jev',payload:{model:'jev-latest',state:{},questions:{}}};
  const results=await Promise.allSettled(Array.from({length:8},()=>store.reserve(meta,lease)));
  assert.equal(results.filter(x=>x.status==='fulfilled').length,8);
  assert.equal(Number(await store.command('GET',key)),2060000);
  const other=new ProductionStore({prefix:store.prefix});
  await other.reserve(meta,lease);
  assert.equal(Number(await store.command('GET',key)),2070000);
  await assert.rejects(other.reserve(meta,{...lease,owner:'wrong'}),{code:'unavailable'});
});
await store.rate('test',1,10);
await assert.rejects(store.rate('test',1,10),{code:'rate'});
// Win with deterministic test providers, then transition concurrently. Never
// seed or mutate a real player's game or the production budget namespace.
await store.start(id);
for(let i=0;i<3;i++)await store.talk(id,{turnId:randomUUID(),expectedVersion:i,message:`Fresh reason ${i}`},deps);
const transitions=await Promise.allSettled([store.continue(id,3),store.continue(id,3)]);
assert.ok(transitions.some(r=>r.status==='fulfilled'));
assert.equal((await store.resume(id)).chapter,'vip');
assert.equal((await store.resume(id)).version,4);
assert.equal((await store.continue(id,3)).version,4);
await store.talk(id,{turnId:randomUUID(),expectedVersion:4,message:'A plan for the group'},deps);
assert.equal((await store.continue(id,3)).turns,1);
assert.equal((await store.resume(id)).version,5);
console.log('Redis integration passed: persistent replay, locks, uncapped atomic accounting beyond $2, restart persistence, rate limit. No AI calls.');
