import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {ProductionStore} from './production-store.mjs';
import {COOKIE,checkPassword,issueSession,readSession} from './access.mjs';
import {TurnError} from './turns.mjs';
export function createHandler({env=process.env,store=new ProductionStore()}={}) {
  return async (req,res) => {
    const send=(status,data,headers={})=>{
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff',...headers}); res.end(JSON.stringify(data));
    };
    try {
      const path=new URL(req.url,'https://invalid.local').pathname;
      if(req.method!=='POST' || !['/api/login','/api/start','/api/talk','/api/continue','/api/resume'].includes(path))return send(404,{error:'No encontrado.'});
      if(env.CARAMELO_ENABLED!=='1' || !env.PUBLIC_ORIGIN?.startsWith('https://') ||
        !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ACCESS_PASSWORD_HASH || '') ||
        !/^[a-f0-9]{64}$/.test(env.SESSION_SECRET || '') || !env.JEV_API_KEY || !env.OPENAI_API_KEY)
        return send(503,{error:'La puerta está en pausa. Volvé en un rato.'});
      if(req.headers.origin!==env.PUBLIC_ORIGIN || req.headers.host!==new URL(env.PUBLIC_ORIGIN).host ||
        req.headers['content-type']?.split(';')[0]!=='application/json')return send(403,{error:'Origen no permitido.'});
      let id=readSession(req.headers.cookie,env.SESSION_SECRET);
      if(path!=='/api/login' && !id)return send(401,{error:'Necesitás la contraseña de la invitación.',code:'auth_required'});
      // Vercel overwrites this header; never trust arbitrary client X-Forwarded-For.
      const forwarded=env.VERCEL==='1'?req.headers['x-vercel-forwarded-for']?.split(',')[0].trim():req.socket?.remoteAddress;
      const ip=isIP(forwarded || '')?forwarded:'unknown';
      const bucket=createHmac('sha256',env.SESSION_SECRET).update(ip).digest('hex');
      if(path==='/api/login') {
        await store.rate('login-global',100,60);
        await store.rate(`login:${bucket}`,10,900);
      } else await store.rate(`${path}:${bucket}`,path==='/api/start'?15:60,path==='/api/start'?3600:60);
      if(Number(req.headers['content-length'] || 0)>4096)return send(413,{error:'Mensaje demasiado largo.'});
      let body;
      try {
        // Disable framework parsing in the entrypoint; count bytes before parsing.
        let raw=''; for await(const chunk of req) {raw+=chunk; if(Buffer.byteLength(raw)>4096)return send(413,{error:'Mensaje demasiado largo.'});}
        body=JSON.parse(raw);
      } catch {return send(400,{error:'Mensaje inválido.'});}
      if(path==='/api/login') {
        if(!await checkPassword(body?.password,env.ACCESS_PASSWORD_HASH))return send(401,{error:'Esa no es la contraseña. Revisá tu invitación.'});
        return send(200,{ok:true},{'Set-Cookie':`${COOKIE}=${issueSession(env.SESSION_SECRET)}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`});
      }
      if(path==='/api/start')return send(200,await store.start(id));
      if(path==='/api/resume')return send(200,{game:await store.resume(id)});
      if(path==='/api/continue') {
        if(!Number.isSafeInteger(body?.expectedVersion) || body.expectedVersion<0)return send(400,{error:'Versión inválida.'});
        return send(200,await store.continue(id,body.expectedVersion));
      }
      const message=typeof body?.message==='string'?body.message.trim():'';
      if(!message || message.length>280 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body?.turnId) ||
        !Number.isSafeInteger(body?.expectedVersion) || body.expectedVersion<0)return send(400,{error:'Mensaje o identificador inválido.'});
      return send(200,await store.talk(id,{message,turnId:body.turnId,expectedVersion:body.expectedVersion}));
    } catch(error) {
      if(error instanceof TurnError)return send(error.status,{error:error.message,code:error.code});
      return send(503,{error:'La puerta está en pausa. Volvé en un rato.',code:'unavailable'});
    }
  };
}
