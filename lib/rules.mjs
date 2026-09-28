import { CRITERIA,normalize,probability } from './evaluation.mjs';
export const VIP_START_SCORE = 30;
export const VIP_WIN_SCORE = 60;
export function decideTurn(game,message,evaluation) {
  if(game.status!=='playing') throw new Error('Game finished');
  if(!Object.hasOwn(CRITERIA,evaluation.reaction)) throw new Error('Unknown decision');
  for(const key of ['novelty','relevance','contradiction','threat','confidence']) probability(evaluation[key]);
  const exactRepeat=game.history.some(item=>normalize(item.player)===normalize(message));
  const reaction=exactRepeat?'repeat':evaluation.reaction;
  const vip=game.chapter==='vip';
  // Clavicular is meant to be an easy, fun second chapter: laxer bar and lower target.
  const confident=evaluation.confidence>=(vip?.35:.5);
  const useful=vip?evaluation.novelty>=.4 && evaluation.relevance>=.4 && evaluation.contradiction<.8
    :evaluation.novelty>=.6 && evaluation.relevance>=.5 && evaluation.contradiction<.7;
  const bonus={sincere:25,funny:23,convincing:30};
  const penalty={repeat:-10,name_drop:-6,bribe:-15,manipulation:-12};
  const delta=exactRepeat?-10:!confident?0:(useful?bonus[reaction]??0:0)+(penalty[reaction]??0);
  const score=Math.max(0,Math.min(100,game.score+delta));
  // Direct aggression closes the door even if repeated or preceded by a good
  // argument. Use Jev's original classification, not the repetition override.
  const expelled=evaluation.reaction==='hostile' || (evaluation.threat>=.95 && evaluation.confidence>=.8);
  const status=expelled?'lost':score>=(vip?VIP_WIN_SCORE:80)?'won':game.turns+1>=6?'lost':'playing';
  const action=status==='won'?'admit':status==='lost'?'refuse':!confident||evaluation.relevance<(vip?.4:.5)?'ask_detail':evaluation.contradiction>=.7||delta<0?'challenge':'acknowledge';
  const mood=status==='won'?(vip?'Uno más de la mesa':'Estás adentro'):status==='lost'?(vip?'El VIP queda para otra noche':'Hoy no se pudo'):vip?(delta<0?'Le bajaste la onda':score>=45?'Hay código':score>=35?'Rompiste el hielo':'Te está midiendo'):delta>0?'Está aflojando':delta<0?'No compra el chamuyo':'Te está escuchando';
  return {score,status,action,mood,reaction,patience:Math.max(0,5-game.turns)};
}
