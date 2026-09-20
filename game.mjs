export const INTRO = 'Buenas. Lista cerrada, casa llena. Dame una buena razón para abrir esa soga.';
export const MAX_TURNS = 6;
export { publicGame } from './lib/turns.mjs';
export function newGame() {
  return { turns: 0, version: 0, score: 12, status: 'playing', mood: 'Cara de póker', line: INTRO,
    history: [], operations: new Map(), busy: false, expires: Date.now() + 3600000 };
}
