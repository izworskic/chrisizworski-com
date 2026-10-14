'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {evaluate,manifest}=require('../lib/niagara-falls/quality-loss-evaluate.js');
test('every Niagara engine, UX, map, video, image and word component has a documented loss function and explicit owner',()=>{
 const seen=new Set();
 for(const item of manifest.metrics){
  assert.ok(item.id&&!seen.has(item.id));seen.add(item.id);
  assert.ok(item.component&&item.owner&&item.loss_function&&item.check);
  assert.ok(['binary','human'].includes(item.kind));
  assert.ok(['critical','major'].includes(item.severity));
  if(item.kind==='binary')assert.equal(item.threshold,0);
 }
 for(const domain of ['engine','ux','map','video','image','words','search','ops']){
  assert.ok(manifest.metrics.filter(m=>m.domain===domain).length>=3,domain);
 }
 assert.ok(manifest.metrics.length>=70);
});
test('all automated Niagara losses clear zero; human reviews remain explicitly unresolved',()=>{
 const result=evaluate();
 assert.equal(result.automated_release_gate,'PASS',JSON.stringify(result.failures,null,2));
 assert.equal(result.loss_score,0);
 assert.ok(result.measured>=60);
 assert.ok(result.unreviewed>=10);
 assert.equal(result.human_review_state,'REVIEW_REQUIRED');
});
test('map_syntax loss is one when an accidental truncated map script is released',()=>{
 const map='public/assets/niagara-visit-map.js';
 const source=fs.readFileSync(path.join(__dirname,'..',map),'utf8');
 const broken=source.replace(/function renderComparison\(w\)\{/, "function renderComparison(w){var x='");
 const result=evaluate({overrides:{[map]:broken}});
 assert.equal(result.automated_release_gate,'FAIL');
 assert.ok(result.failures.some(x=>x.id==='M01'),JSON.stringify(result.failures));
});
test('a visually pleasant page with misleading boat claims cannot pass critical word gate',()=>{
 const file='public/assets/niagara-falls-today.js';
 const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 const broken=source.replace(/Bookings, tickets and queues are not confirmed\./g,'Ticket guaranteed.').replace(/The boat fits your published operating window/g,'You have a booked boat');
 const result=evaluate({overrides:{[file]:broken}});
 assert.equal(result.automated_release_gate,'FAIL');
 assert.ok(result.failures.some(x=>x.id==='W01'));
});
test('unreviewed visual or editorial components cannot silently earn a perfect score',()=>{
 const result=evaluate();
 assert.equal(result.human_review_state,'REVIEW_REQUIRED');
 assert.ok(result.metrics.filter(x=>x.loss===null).every(x=>x.status==='REVIEW_REQUIRED'));
 assert.ok(result.metrics.filter(x=>x.kind==='human').length>=14);
});
