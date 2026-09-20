import test from 'node:test';
import assert from 'node:assert/strict';
import {nextEnding, endingFrames} from '../public/ending-state.js';

test('winning preserves dialogue until the player enters', () => {
  assert.equal(nextEnding('door','WIN'),'admitted');
  assert.equal(nextEnding('admitted','ENTER'),'entering');
  assert.equal(nextEnding('entering','ENTER'),'entering');
  assert.equal(nextEnding('door','ARRIVE'),'door');
  assert.equal(nextEnding('door','SKIP'),'door');
});
test('sequence progresses and can be skipped or reset at any point', () => {
  assert.equal(nextEnding('entering','ARRIVE'),'inside');
  assert.equal(nextEnding('inside','INVITE'),'invitation');
  for (const state of ['entering','inside']) assert.equal(nextEnding(state,'SKIP'),'invitation');
  assert.equal(nextEnding('invitation','FINISH'),'complete');
  for (const state of ['door','admitted','entering','inside','invitation','complete']) assert.equal(nextEnding(state,'RESTART'),'door');
});
test('six distinct anchors last eight seconds at six FPS', () => {
  assert.equal(endingFrames.length,6);
  assert.equal(new Set(endingFrames.map(f=>f.src)).size,6);
  assert.equal(endingFrames.reduce((sum,f)=>sum+f.holdFrames,0),48);
});
