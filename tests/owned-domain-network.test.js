import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entity=JSON.parse(await readFile(new URL('../benchmarks/entity-surface-baseline.json',import.meta.url),'utf8'));
const owned=JSON.parse(await readFile(new URL('../benchmarks/owned-domain-network.json',import.meta.url),'utf8'));
const works=await readFile(new URL('../public/chris-izworski-works/index.html',import.meta.url),'utf8');

const roots=new Map(owned.roots.map(item=>[item.host,item]));
const handoffs=owned.observedLiveHandoffs||[];
const degree=(host)=>handoffs.filter(item=>item.from===host||item.to===host).length;

test('owned-domain ledger covers every self-owned domain in the entity benchmark',()=>{
  for(const host of entity.selfOwnedDomains) assert.ok(roots.has(host),`missing owned root: ${host}`);
});

test('every active owned root participates in the owned-domain graph',()=>{
  const isolated=owned.roots.filter(item=>item.status==='active'&&degree(item.host)===0).map(item=>item.host);
  assert.deepEqual(isolated,[]);
});

test('flagship external domains are mutually discoverable through observed live handoffs',()=>{
  for(const host of owned.gates.requireFlagshipCrossLinks){
    assert.ok(handoffs.some(item=>item.from===host),`${host} has no outbound owned-domain handoff`);
    assert.ok(handoffs.some(item=>item.to===host),`${host} has no inbound owned-domain handoff`);
  }
});

test('central works index names every current flagship owned domain',()=>{
  for(const host of owned.gates.requireCentralWorksIndex) assert.match(works,new RegExp(host.replaceAll('.','\\.')));
});
