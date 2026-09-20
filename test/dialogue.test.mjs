import test from 'node:test';
import assert from 'node:assert/strict';
import { localDialogueErrors, generateDialogue, validateDialogue } from '../lib/dialogue.mjs';
test('reject empty, oversized and duplicate dialogue', () => {
  assert.deepEqual(localDialogueErrors('Pasá.', [{guard:'Pasá.'}]), ['duplicate']);
  assert.ok(localDialogueErrors('x'.repeat(181), []).includes('length'));
  assert.ok(localDialogueErrors(' ', []).includes('empty'));
});
test('semantic validation rejects admission against the game decision', async t => {
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({answers:{related:{noul:.99},incompatible:{noul:.9},grounded:{noul:.99}}})}));
  const result=await validateDialogue({history:[],message:'Hola',line:'Pasá.',decision:{status:'playing'}});
  assert.deepEqual(result,{ok:false,reasons:['contradiction']});
});
test('incomplete generation and malformed validation are failures', async t => {
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})}));
  await assert.rejects(generateDialogue({history:[],message:'Hola',decision:{status:'playing'}}),/Incomplete/);
  globalThis.fetch.mock.mockImplementation(async()=>({ok:true,json:async()=>({answers:{related:{noul:'yes'}}})}));
  await assert.rejects(validateDialogue({history:[],message:'Hola',line:'Buenas.',decision:{status:'playing'}}),/Invalid provider probability/);
});
test('OpenAI request is short, non-reasoning and not stored', async t => {
  let payload;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    payload = JSON.parse(options.body);
    return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'¿De dónde lo conocés?'}]}]})};
  });
  const line = await generateDialogue({history:[],message:'Conozco al dueño',decision:{status:'playing',action:'challenge'}});
  assert.equal(line,'¿De dónde lo conocés?');
  assert.equal(payload.model,'gpt-5.6-luna');
  assert.equal(payload.reasoning.effort,'none');
  assert.equal(payload.store,false);
});
