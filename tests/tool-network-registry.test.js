import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registry=JSON.parse(await readFile(new URL('../benchmarks/tool-network-registry.json',import.meta.url),'utf8'));
const tools=new Map(registry.tools.map(t=>[t.id,t]));

test('tool network registry has stable unique nodes and complete relationships',()=>{
  assert.ok(registry.tools.length>=40);
  assert.equal(tools.size,registry.tools.length);
  assert.ok(registry.relationships.length>=45);
  for(const r of registry.relationships){
    assert.ok(tools.has(r.from),`missing source ${r.from}`);
    assert.ok(tools.has(r.to),`missing destination ${r.to}`);
    assert.notEqual(r.from,r.to);
    assert.match(r.strength,/^(essential|strong|optional|experimental)$/);
    assert.ok(r.reason.length>10);
  }
});

test('no search experiment or freeze remains active',()=>{
  assert.match(registry.rules.searchChangePolicy,/No search experiment or freeze is active/);
  for(const tool of registry.tools){
    assert.notEqual(tool.searchTreatment?.status,'protected',tool.id);
    assert.notEqual(tool.searchTreatment?.status,'active-measurement-window',tool.id);
    assert.equal(Object.prototype.hasOwnProperty.call(tool.searchTreatment||{},'experiment'),false,tool.id);
  }
});

test('cannibalization groups name one owner and distinct support nodes',()=>{
  for(const group of registry.cannibalizationGroups){
    assert.ok(tools.has(group.owner),group.intent);
    assert.ok(group.rule);
    assert.equal(new Set(group.supports).size,group.supports.length);
    assert.ok(!group.supports.includes(group.owner));
    for(const id of group.supports)assert.ok(tools.has(id),`${group.intent}: ${id}`);
  }
});

test('new tool candidates use the 100 point best-fit model and connect to the live network',()=>{
  const keys=['distinctSearchIntent','networkFit','uniqueUtility','authorityAndSeasonFit','measurementPlan','cannibalizationSafety'];
  assert.equal(keys.reduce((sum,k)=>sum+registry.bestFitScoring[k],0),100);
  for(const candidate of registry.expansionOpportunities){
    const score=keys.reduce((sum,k)=>sum+candidate.scores[k],0);
    assert.equal(score,candidate.bestFitScore,candidate.id);
    assert.ok(candidate.connectsTo.length>=2,candidate.id);
    for(const id of candidate.connectsTo)assert.ok(tools.has(id),`${candidate.id}: ${id}`);
  }
  assert.equal(registry.expansionOpportunities.find(c=>c.id==='fall-river-window')?.status,'shelved');
});
