import {createHash} from 'node:crypto';
import {evaluateTurn} from './evaluation.mjs';
import {decideTurn} from './rules.mjs';
import {generateDialogue,validateDialogue} from './dialogue.mjs';
import {recoveryDialogue} from './recovery-dialogue.mjs';
import {ProviderError} from './provider.mjs';

export class TurnError extends Error {
  constructor(status,message,code) {super(message);this.status=status;this.code=code;}
}
export function publicGame(game) {
  return {chapter:game.chapter||'door',previousTurns:game.previousTurns||0,
    turns:game.turns,maxTurns:6,score:game.score,status:game.status,mood:game.mood,line:game.line,version:game.version};
}
export async function executeTurn(game,request,overrides={}) {
  const {turnId,expectedVersion,message}=request;
  const hash=createHash('sha256').update(JSON.stringify({expectedVersion,message})).digest('hex');
  const old=game.operations.get(turnId);
  if(old){
    if(old.hash!==hash)throw new TurnError(409,'Ese envío ya se usó con otro mensaje.','conflict');
    if(old.response)return old.response;
    if(old.pending)throw new TurnError(409,'El patova sigue pensando. Reintentá en unos segundos.','pending');
    throw new TurnError(502,'Ese intento falló. Podés volver a enviar sin perder un turno.','failed');
  }
  if(game.busy)throw new TurnError(409,'Esperá la respuesta del patova.','pending');
  if(game.version!==expectedVersion)throw new TurnError(409,'La partida cambió. Empezá otra noche.','stale');
  if(game.status!=='playing')throw new TurnError(409,'La partida ya terminó.','finished');
  if(game.operations.size>=24)throw new TurnError(429,'Demasiados reintentos. Empezá otra noche.','limit');
  const operation={hash,pending:true};
  game.operations.set(turnId,operation);
  game.busy=true;
  const signal=AbortSignal.timeout(30000);
  let stage='evaluation';
  const report=(event,error,reasons=[])=>console.warn(JSON.stringify({event,stage,chapter:game.chapter||'door',
    provider:error instanceof ProviderError?error.provider:undefined,
    kind:error instanceof ProviderError?error.kind:signal.aborted?'deadline':undefined,
    status:error instanceof ProviderError?error.status:undefined,
    reasons:reasons.filter(reason=>['empty','length','duplicate','contradiction','unrelated','invented_fact'].includes(reason))}));
  const deps={evaluate:evaluateTurn,decide:decideTurn,generate:generateDialogue,validate:validateDialogue,beforeCall:()=>{},...overrides};
  try{
    const evaluation=await deps.evaluate(game,message,{signal,beforeCall:deps.beforeCall});
    operation.evaluation=evaluation;
    const decision=deps.decide(game,message,evaluation);
    stage='dialogue';
    const commit=line=>{
      Object.assign(game,decision,{line,turns:game.turns+1,version:game.version+1,
        history:[...game.history,{player:message,guard:line,evaluation,action:decision.action}]});
      operation.response=publicGame(game);
      return operation.response;
    };
    // Expulsion is a game rule, not a dialogue-generation task. Once Jev detects
    // direct aggression, no writer/validator failure may reopen the conversation.
    if(evaluation.reaction==='hostile')return commit(game.chapter==='vip'?'Con esa onda, a mi mesa no. Seguí tu noche por otro lado.':'Con ese trato no entrás. Se terminó la charla.');
    // Jev decides chapter boundaries; a writer outage cannot undo the outcome.
    if(decision.status!=='playing')return commit(recoveryDialogue(game,decision));
    let feedback=[];
    for(let i=0;i<2;i++){
      if(signal.aborted)break;
      const context={chapter:game.chapter||'door',currentLine:game.line,history:game.history,message,decision,feedback,signal,beforeCall:deps.beforeCall};
      try {
        stage='generation';
        const line=await deps.generate(context);
        stage='validation';
        const check=await deps.validate({...context,line});
        signal.throwIfAborted();
        if(check.ok){operation.dialogueSource='generated';return commit(line);}
        feedback=check.reasons;
        report('dialogue_rejected',null,feedback);
      } catch(error) {
        if(error instanceof TurnError)throw error; // Never bypass access/accounting/lock failures.
        report('dialogue_provider_failed',error);
        // No immediate retry for permanent errors or provider throttling.
        if(error instanceof ProviderError && error.kind==='http' && error.status<500)break;
        feedback=['previous_attempt_failed'];
      }
    }
    operation.dialogueSource='recovery';
    report('dialogue_recovered');
    return commit(recoveryDialogue(game,decision));
  } catch(error){
    if(error instanceof TurnError)throw error;
    report('turn_failed',error);
    throw new TurnError(502,'No pudimos conectar con Jev para evaluar tu mensaje. Reintentá; no perdiste un intento.','evaluation_unavailable');
  } finally {operation.pending=false;game.busy=false;}
}
