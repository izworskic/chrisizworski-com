import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planExperience} from '../experience-foundry/lib/planning.mjs';
const registry=JSON.parse(fs.readFileSync('benchmarks/tool-network-registry.json','utf8'));
test('Foundry plans require credible competing concepts, exact linked state and progression',()=>{
 const output=planExperience({
  slug:'rocket-foundry-second-pass-fixture',
  question:'For a specific rocket launch where could a visitor watch, what is unknown and what next?',
  owner:'rocket-launch-usa'
 },registry);
 assert.equal(output.plan.recipe,'custom');
 assert.equal(output.plan.constraints.noNewCanonical,true);
 assert.equal(output.plan.handoffs.filter(x=>x.type==='regional-handoff').length,6);
 const requirements=output.plan.acceptanceRequirements;
 assert.match(requirements.visitorAnswer,/engine name/i);
 assert.match(requirements.visitorAnswer,/source-backed answer/i);
 for(const key of ['competingConcepts','linkedState','evidenceProgression','measurement','releaseProof']){
  assert.equal(typeof requirements[key],'string');
  assert.ok(requirements[key].length>75,key);
 }
 assert.match(requirements.competingConcepts,/straw man/i);
 assert.match(requirements.linkedState,/destination loaded the exact selected ID/i);
 assert.match(requirements.evidenceProgression,/event admission/i);
 assert.match(requirements.measurement,/restoration/i);
 for(const stage of ['concept-review','linked-state-review','evidence-progression-review','measurement-review','owner-ci','observe']){
  const found=output.plan.stages.find(x=>x.id===stage);
  assert.equal(found?.status,'NOT_VERIFIED',stage);
 }
 for(const term of ['credible SAFE alternative','national→regional→national','Supported access then spectator weather','Primary attempt vs verified destination restoration']){
  assert.ok(Object.values(output.files).some(x=>x.includes(term)),term);
 }
 assert.match(output.files['IMPLEMENT.md'],/Do not claim uplift/i);
});
