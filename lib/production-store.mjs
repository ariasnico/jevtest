import {randomBytes, createHash} from 'node:crypto';
import {newGame, publicGame,advanceGame} from '../game.mjs';
import {executeTurn, TurnError} from './turns.mjs';

const unavailable = () => new TurnError(503,'La puerta está en pausa. Volvé en un rato.','unavailable');
const busy = () => new TurnError(409,'El patova sigue pensando. Reintentá en unos segundos.','pending');
const encode = game => JSON.stringify({...game, operations:[...game.operations]});
const decode = raw => {const game=JSON.parse(raw); game.operations=new Map(game.operations); return game;};
export class ProductionStore {
  constructor({url=process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token=process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
    prefix='caramelo:v1',command}={}) {
    this.prefix=prefix;
    this.command=command || (async (...args) => {
      if(!url || !token || !url.startsWith('https://')) throw unavailable();
      try {
        const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
          body:JSON.stringify(args),signal:AbortSignal.timeout(3000)});
        if(!response.ok)throw unavailable();
        const data=await response.json();
        if(data.error || !Object.hasOwn(data,'result'))throw unavailable();
        return data.result;
      } catch {throw unavailable();}
    });
  }
  async rate(bucket,limit,seconds) {
    const result=await this.command('EVAL',
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
      1,`${this.prefix}:rate:${bucket}`,seconds);
    if(Number(result)>limit)throw new TurnError(429,'Demasiados intentos. Esperá unos minutos antes de volver.','rate');
  }
  async locked(id,fn) {
    const key=`${this.prefix}:game:${id}`, lock=`${key}:lock`, owner=randomBytes(24).toString('hex');
    if(await this.command('SET',lock,owner,'NX','EX',45)!=='OK')throw busy();
    const save=async game => {
      const result=await this.command('EVAL',
        "if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end; redis.call('SET',KEYS[2],ARGV[2],'EX',3600); return 1",
        2,lock,key,owner,encode(game));
      if(result!==1)throw unavailable();
    };
    try {return await fn({key,lock,owner,save});}
    finally {
      // A crashed invocation leaves a short lease, never an unlocked concurrent turn.
      await this.command('EVAL',"if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0",1,lock,owner).catch(()=>{});
    }
  }
  async start(id) {return this.locked(id,async ({save}) => {const game=newGame(); await save(game); return publicGame(game);});}
  async resume(id) {
    const raw=await this.command('GET',`${this.prefix}:game:${id}`);
    if(!raw)return null;
    return publicGame(decode(raw));
  }
  async continue(id,expectedVersion) {
    return this.locked(id,async ({key,save})=>{
      const raw=await this.command('GET',key);
      if(!raw)throw new TurnError(401,'La noche terminó. Empezá otra partida.','expired');
      const game=advanceGame(decode(raw),expectedVersion);
      await save(game);
      return publicGame(game);
    });
  }
  async reserve({provider,payload},{lock,owner}) {
    // Meter conservatively for visibility, without a daily spending cap.
    // Keep payload restrictions and lease ownership checks before provider calls.
    if(Buffer.byteLength(JSON.stringify(payload))>12000 ||
      !((provider==='jev' && payload.model==='jev-latest' && Object.keys(payload.questions).length<=5) ||
        (provider==='openai' && payload.model==='gpt-5.6-luna' && payload.max_output_tokens===180 && payload.reasoning?.effort==='none')))throw unavailable();
    const day=new Date().toISOString().slice(0,10);
    const result=await this.command('EVAL',
      "if redis.call('GET',KEYS[1])~=ARGV[1] then return -1 end; redis.call('INCRBY',KEYS[2],10000); redis.call('EXPIRE',KEYS[2],259200); return 1",
      2,lock,`${this.prefix}:budget:${day}`,owner);
    if(result!==1)throw unavailable();
  }
  async talk(id,request,overrides={}) {
    return this.locked(id,async lease => {
      const raw=await this.command('GET',lease.key);
      if(!raw)throw new TurnError(401,'La noche terminó. Empezá otra partida.','expired');
      const game=decode(raw);
      // A pending record with no live lease means an interrupted invocation.
      // Do not replay provider requests with an uncertain outcome.
      game.busy=false;
      for(const op of game.operations.values())op.pending=false;
      const old=game.operations.get(request.turnId);
      if(old)return executeTurn(game,request,overrides);
      if(game.version!==request.expectedVersion || game.status!=='playing' || game.operations.size>=24)
        return executeTurn(game,request,overrides); // validation only; no provider call
      const hash=createHash('sha256').update(JSON.stringify({expectedVersion:request.expectedVersion,message:request.message})).digest('hex');
      game.operations.set(request.turnId,{hash,pending:true});
      await lease.save(game); // durable reservation BEFORE any external call
      game.operations.delete(request.turnId);
      let response,error;
      try {response=await executeTurn(game,request,{...overrides,beforeCall:meta=>this.reserve(meta,lease)});}
      catch(e){error=e;}
      await lease.save(game); // CAS prevents a late worker overwriting a newer game
      if(error)throw error;
      return response;
    });
  }
}
