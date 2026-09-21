import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {COOKIE,hashPassword,checkPassword,issueSession,readSession} from '../lib/access.mjs';
import {createHandler} from '../lib/production-handler.mjs';
import {ProductionStore} from '../lib/production-store.mjs';
import {queryJev} from '../lib/evaluation.mjs';
import {generateDialogue} from '../lib/dialogue.mjs';
test('password hashing and signed sessions reject tampering, expiry and wrong passwords',async()=>{
  const hash=await hashPassword('test-invitation');
  assert.equal(await checkPassword('test-invitation',hash),true);
  assert.equal(await checkPassword('wrong',hash),false);
  assert.equal(await checkPassword(null,hash),false);
  const secret=randomBytes(32).toString('hex'), now=Date.now();
  const token=issueSession(secret,now);
  assert.ok(readSession(`${COOKIE}=${token}`,secret,now));
  assert.equal(readSession(`${COOKIE}=${token}`,secret,now+8*3600000),null);
  assert.equal(readSession(`${COOKIE}=${token}`,randomBytes(32).toString('hex'),now),null);
  assert.equal(readSession(`${COOKIE}=${token.slice(0,-1)}z`,secret,now),null);
});
test('production API gates every model route, origin, host, login and input',async()=>{
  let starts=0,talks=0;
  const env={CARAMELO_ENABLED:'1',PUBLIC_ORIGIN:'https://game.example',ACCESS_PASSWORD_HASH:await hashPassword('test-invitation'),
    SESSION_SECRET:randomBytes(32).toString('hex'),JEV_API_KEY:'test',OPENAI_API_KEY:'test'};
  const store={rate:async()=>{},start:async()=>{starts++;return {score:12};},talk:async()=>{talks++;}};
  const handler=createHandler({env,store});
  async function request(path,body={},extra={}) {
    const req=Readable.from([JSON.stringify(body)]);
    Object.assign(req,{url:path,method:'POST',headers:{host:'game.example',origin:env.PUBLIC_ORIGIN,'content-type':'application/json',...extra},socket:{remoteAddress:'127.0.0.1'}});
    const result={}; await handler(req,{writeHead(status,headers){Object.assign(result,{status,headers});},end(raw){result.body=JSON.parse(raw);}});return result;
  }
  assert.equal((await request('/api/start')).status,401);
  assert.equal((await request('/api/talk')).status,401);
  assert.equal((await request('/api/continue',{expectedVersion:0})).status,401);
  assert.equal((await request('/api/resume')).status,401);
  assert.equal((await request('/api/index')).status,404);
  assert.equal((await request('/api/login',{password:'test-invitation'},{origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/login',{password:'test-invitation'},{host:'evil.example'})).status,403);
  assert.equal((await request('/api/login',{password:'wrong'})).status,401);
  const login=await request('/api/login',{password:'test-invitation'});
  assert.equal(login.status,200);assert.match(login.headers['Set-Cookie'],/Secure; HttpOnly; SameSite=Strict/);
  const cookie=login.headers['Set-Cookie'].split(';')[0];
  assert.equal((await request('/api/start',{},{cookie})).status,200);
  assert.equal((await request('/api/talk',{message:'hi'},{cookie})).status,400);
  assert.equal(starts,1);assert.equal(talks,0);
  store.rate=async()=>{throw new Error('Redis unavailable');};
  assert.equal((await request('/api/start',{},{cookie})).status,503);assert.equal(starts,1);
  env.CARAMELO_ENABLED='0';assert.equal((await request('/api/start',{},{cookie})).status,503);
});
test('provider accounting fails closed and restricts models and request sizes',async()=>{
  const store=new ProductionStore({command:async()=>0});
  const meta={provider:'jev',payload:{model:'jev-latest',questions:{},state:{}}};
  await assert.rejects(store.reserve(meta,{lock:'test',owner:'test'}),{code:'unavailable'});
  await assert.rejects(store.reserve({...meta,payload:{...meta.payload,model:'other'}},{}),{code:'unavailable'});
  await assert.rejects(store.reserve({...meta,payload:{...meta.payload,state:'x'.repeat(12001)}},{}),{code:'unavailable'});
  const noRedis=new ProductionStore({url:'',token:''});
  await assert.rejects(noRedis.start('test'),{code:'unavailable'});
});
test('provider hooks are awaited and a denied reservation prevents all external requests',async t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('unexpected fetch');});
  const beforeCall=async()=>{await Promise.resolve();throw Error('budget denied');};
  await assert.rejects(queryJev({}, {},{beforeCall}),/budget denied/);
  await assert.rejects(generateDialogue({history:[],message:'hi',decision:{status:'playing'},beforeCall}),/budget denied/);
  assert.equal(calls,0);
});
