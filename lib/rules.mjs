import { CRITERIA,normalize,probability } from './evaluation.mjs';
export function decideTurn(game,message,evaluation) {
  if(game.status!=='playing') throw new Error('Game finished');
  if(!Object.hasOwn(CRITERIA,evaluation.reaction)) throw new Error('Unknown decision');
  for(const key of ['novelty','relevance','contradiction','threat','confidence']) probability(evaluation[key]);
  const exactRepeat=game.history.some(item=>normalize(item.player)===normalize(message));
  const reaction=exactRepeat?'repeat':evaluation.reaction;
  const confident=evaluation.confidence>=.5;
  const useful=evaluation.novelty>=.6 && evaluation.relevance>=.5 && evaluation.contradiction<.7;
  const bonus={sincere:25,funny:23,convincing:30};
  const penalty={repeat:-10,name_drop:-6,bribe:-15,manipulation:-12};
  const delta=exactRepeat?-10:!confident?0:(useful?bonus[reaction]??0:0)+(penalty[reaction]??0);
  const score=Math.max(0,Math.min(100,game.score+delta));
  const expelled=evaluation.threat>=.95 && evaluation.confidence>=.8;
  const status=expelled?'lost':score>=80?'won':game.turns+1>=6?'lost':'playing';
  const action=status==='won'?'admit':status==='lost'?'refuse':!confident||evaluation.relevance<.5?'ask_detail':evaluation.contradiction>=.7||delta<0?'challenge':'acknowledge';
  const mood=status==='won'?'Estás adentro':status==='lost'?'Hoy no se pudo':delta>0?'Está aflojando':delta<0?'No compra el chamuyo':'Te está escuchando';
  return {score,status,action,mood,reaction,patience:Math.max(0,5-game.turns)};
}
