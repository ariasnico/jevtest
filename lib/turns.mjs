import {createHash} from 'node:crypto';
import {evaluateTurn} from './evaluation.mjs';
import {decideTurn} from './rules.mjs';
import {generateDialogue,validateDialogue} from './dialogue.mjs';

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
  const signal=AbortSignal.timeout(20000);
  const deps={evaluate:evaluateTurn,decide:decideTurn,generate:generateDialogue,validate:validateDialogue,beforeCall:()=>{},...overrides};
  try{
    const evaluation=await deps.evaluate(game,message,{signal,beforeCall:deps.beforeCall});
    operation.evaluation=evaluation;
    const decision=deps.decide(game,message,evaluation);
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
    if(game.chapter==='vip'&&decision.status==='won')return commit('Me caíste bien. Vení, sentate con nosotros en el VIP. El próximo tema lo elegís vos.');
    if(game.chapter==='vip'&&decision.status==='lost')return commit('No terminamos de conectar. Seguí disfrutando la pista; esta mesa hoy queda entre nosotros.');
    let feedback=[];
    for(let i=0;i<2;i++){
      signal.throwIfAborted();
      const context={chapter:game.chapter||'door',currentLine:game.line,history:game.history,message,decision,feedback,signal,beforeCall:deps.beforeCall};
      const line=await deps.generate(context);
      const check=await deps.validate({...context,line});
      signal.throwIfAborted();
      if(check.ok){
        return commit(line);
      }
      feedback=check.reasons;
    }
    throw new Error('Dialogue validation failed');
  } catch(error){
    if(error instanceof TurnError)throw error;
    throw new TurnError(502,'No salió la respuesta. Probá de nuevo; no perdiste un intento.','failed');
  } finally {operation.pending=false;game.busy=false;}
}
