'use strict';
// Candidate reference fixtures only. This is not an automatic production copy grader.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'design-systems/production-design-pilot/editorial-fixtures.json'),'utf8'));
const norm=s=>s.toLowerCase().replace(/\s+/g,' ').trim();
const numbers=s=>[...s.matchAll(/\d+(?:[.:/]\d+)*/g)].map(m=>m[0]).sort();
const render=e=>[e.answer,e.evidence,e.action].filter(Boolean).join(' ');
function review(e,copy){
 const text=norm(copy);
 const errors=[];
 for(const fact of e.facts)if(!text.includes(norm(fact)))errors.push('missing fact: '+fact);
 for(const fact of e.critical)if(!text.includes(norm(fact)))errors.push('missing limit: '+fact);
 for(const claim of e.forbidden)if(text.includes(norm(claim)))errors.push('unsupported claim: '+claim);
 if(JSON.stringify(numbers(copy))!==JSON.stringify(numbers(e.before)))errors.push('numeric tokens changed');
 if(/[\u2013\u2014]/.test(copy))errors.push('dash connector');
 return errors;
}
test('editorial example inventory covers evidence and availability independently',()=>{
 assert.equal(fixtures.schema,1);
 assert.equal(fixtures.examples.length,10);
 assert.equal(new Set(fixtures.examples.map(e=>e.id)).size,10);
 assert.deepEqual([...new Set(fixtures.examples.map(e=>e.kind))].sort(),
  ['editorial','estimate','forecast','inference','model','observation','simulation']);
 assert.deepEqual([...new Set(fixtures.examples.map(e=>e.availability))].sort(),
  ['available','partial','stale','unavailable']);
 for(const e of fixtures.examples){
  assert.equal(e.source.fixture,true);
  assert.ok(e.answer&&e.evidence&&e.critical.length&&e.forbidden.length,e.id);
  assert.ok(norm(render(e)).includes(norm(e.source.name)),e.id+' source');
 }
});
test('curated before/after copy preserves explicit facts, limitations and numeric tokens',()=>{
 for(const e of fixtures.examples)assert.deepEqual(review(e,render(e)),[],e.id);
});
test('all examples reject a removed material limit and an unsupported claim',()=>{
 for(const e of fixtures.examples){
  const original=render(e);
  const removed=norm(original).replaceAll(norm(e.critical[0]),'');
  assert.ok(review(e,removed).some(x=>x.startsWith('missing limit:')),e.id+' missing limit');
  assert.ok(review(e,original+' '+e.forbidden[0]).some(x=>x.startsWith('unsupported claim:')),e.id+' fabricated claim');
 }
});
test('numeric, zero-vs-missing and source failures remain detectable',()=>{
 const byId=id=>fixtures.examples.find(e=>e.id===id);
 const estimate=byId('snow-estimate');
 assert.ok(review(estimate,render(estimate).replace('6.4 inches','64 inches')).includes('numeric tokens changed'));
 const forecast=byId('weather-forecast');
 assert.ok(review(forecast,render(forecast).replace('2 to 4 inches','4 inches')).includes('numeric tokens changed'));
 const unknown=byId('snow-missing');
 assert.ok(review(unknown,render(unknown)+' 0 inches').includes('unsupported claim: 0 inches'));
 const zero=byId('snow-zero');
 assert.ok(review(zero,render(zero).replace('0 inches','unknown')).includes('numeric tokens changed'));
 const stale=byId('ais-stale');
 assert.ok(review(stale,render(stale).replace('14:20 UTC','14:40 UTC')).includes('numeric tokens changed'));
 const model=byId('aurora-model');
 assert.ok(review(model,render(model).replace('20/100','20%')).includes('numeric tokens changed'));
 assert.ok(review(estimate,render(estimate).replace('Example NWS spotter report','a source')).includes('missing fact: Example NWS spotter report'));
});
test('historical source references exist, without pinning future editorial wording',()=>{
 for(const entry of fixtures.sourceAnchors){
  assert.ok(fs.statSync(path.join(root,entry.path)).isFile(),entry.path);
  assert.ok(entry.spans.every(s=>typeof s==='string'&&s.length>0));
 }
});
