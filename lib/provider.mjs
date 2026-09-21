import {setTimeout as delay} from 'node:timers/promises';

export class ProviderError extends Error {
  constructor(provider,kind,status=0) {
    super(`${provider} ${kind}${status?` ${status}`:''}`);
    Object.assign(this,{provider,kind,status});
  }
}
// Only explicitly transient failures are retried, within the turn's deadline.
// Every attempt passes the accounting/security hook; never log request bodies.
export async function providerJSON({provider,url,payload,key,signal,beforeCall=()=>{},attempts=1}) {
  for(let attempt=0;attempt<attempts;attempt++) {
    signal?.throwIfAborted();
    await beforeCall({provider,payload});
    signal?.throwIfAborted();
    let retryAfter=300;
    try {
      const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
        body:JSON.stringify(payload),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)});
      if(!response.ok) {
        const header=response.headers?.get('retry-after');
        if(header)retryAfter=Math.max(300,Number.isFinite(Number(header))?Number(header)*1000:Date.parse(header)-Date.now());
        throw new ProviderError(provider,'http',response.status);
      }
      try{return await response.json();}catch{throw new ProviderError(provider,'invalid_response');}
    } catch(error) {
      if(signal?.aborted)throw error;
      const failure=error instanceof ProviderError?error:new ProviderError(provider,error.name==='TimeoutError'?'timeout':'network');
      const retryable=['timeout','network'].includes(failure.kind)||[408,429,500,502,503,504].includes(failure.status);
      // A long provider-requested backoff must not block the serverless lease.
      if(!retryable||attempt+1>=attempts||!Number.isFinite(retryAfter)||retryAfter>1500)throw failure;
      await delay(retryAfter,undefined,{signal});
    }
  }
}
