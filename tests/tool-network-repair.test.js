import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registry=JSON.parse(await readFile(new URL('../benchmarks/tool-network-registry.json',import.meta.url),'utf8'));
const actions=JSON.parse(await readFile(new URL('../benchmarks/tool-network-actions.json',import.meta.url),'utf8'));
const stack=await readFile(new URL('../public/assets/contextual-trip-stack.js',import.meta.url),'utf8');

const relationships=[...(registry.relationships||[]),...(actions.relationships||[])];
const has=(from,to)=>relationships.some(r=>r.from===from&&r.to===to);

test('Perfect Lawn is connected to useful Michigan yard and garden decisions',()=>{
  assert.equal(has('perfect-lawn','planting-calendar'),true);
  assert.equal(has('perfect-lawn','frost-dates'),true);
  assert.equal(has('perfect-lawn','phenology'),true);
});

test('Whitetail is connected before deer-season demand arrives',()=>{
  assert.equal(has('whitetail','outdoor-weekend'),true);
  assert.equal(has('whitetail','phenology'),true);
  assert.equal(has('fall-color','whitetail'),true);
  assert.match(stack,/whitetail:\{label:'Michigan Whitetail Report'/);
  assert.match(stack,/cen:\{[^\n]+whitetail/);
});

test('no non-leaf registry node remains isolated after this repair',()=>{
  const degree=new Map((registry.tools||[]).map(tool=>[tool.id,0]));
  for(const rel of relationships){
    if(degree.has(rel.from))degree.set(rel.from,degree.get(rel.from)+1);
    if(degree.has(rel.to))degree.set(rel.to,degree.get(rel.to)+1);
  }
  const isolated=(registry.tools||[]).filter(tool=>tool.networkRole!=='leaf'&&(degree.get(tool.id)||0)===0).map(tool=>tool.id);
  assert.deepEqual(isolated,[]);
});

test('Fall River standalone candidate is shelved and no retired experiment remains',()=>{
  const candidate=(registry.expansionOpportunities||[]).find(item=>item.id==='fall-river-window');
  assert.equal(candidate?.status,'shelved');
  assert.equal(Object.prototype.hasOwnProperty.call(actions,'experiments'),false);
  assert.doesNotMatch(stack,/fall-river-window-v1|Network Experiment/);
});
