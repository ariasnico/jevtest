export const INTRO = 'Buenas. Lista cerrada, casa llena. Dame una buena razón para abrir esa soga.';
export const MAX_TURNS = 6;
export const VIP_INTRO = 'La mesa está llena de gente pidiendo selfies. ¿Vos qué traés a la noche?';
import {TurnError} from './lib/turns.mjs';
export { publicGame } from './lib/turns.mjs';
export function newGame() {
  return { chapter: 'door', turns: 0, version: 0, score: 12, status: 'playing', mood: 'Cara de póker', line: INTRO,
    history: [], operations: new Map(), busy: false, expires: Date.now() + 3600000 };
}
export function advanceGame(game,expectedVersion) {
  if(game.busy)throw new TurnError(409,'Esperá a que termine la respuesta.','pending');
  // Retrying a successful transition never resets the VIP or its progress.
  if(game.chapter==='vip')return game;
  if(game.status!=='won')throw new TurnError(403,'Primero tenés que convencer al patova.','chapter_locked');
  if(game.version!==expectedVersion)throw new TurnError(409,'La partida cambió. Recargá para recuperarla.','stale');
  return {...newGame(),chapter:'vip',version:game.version+1,previousTurns:game.turns,
    mood:'Te mide de arriba abajo',line:VIP_INTRO};
}
