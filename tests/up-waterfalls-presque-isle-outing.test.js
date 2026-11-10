// Presque Isle outing: one arrival, three distinct geographic features; fail closed on missing evidence.
'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const {PRESETS,seasonalAdvisory,assess}=require('../public/assets/up-waterfalls-presque-isle-outing.js');
const root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/up-waterfalls.json'),'utf8')).waterfalls;
const byId=new Map(data.map(x=>[x.id,x]));
const html=fs.readFileSync(path.join(root,'public/upper-peninsula-waterfalls/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/up-waterfalls.css'),'utf8');
const day=fs.readFileSync(path.join(root,'public/assets/up-waterfalls-day-sheet.js'),'utf8');
function cards(){return new Map(PRESETS.circuit.map(id=>[id,{dataset:{status:'verify',arrivalVerified:'verified'},querySelector:sel=>sel==='.save'?{click(){}}:null}]))}
test('one scenic site links all three curated, source-backed visitor guides',()=>{
 assert.deepEqual(PRESETS.overlook,['nawadaha-falls']);
 assert.deepEqual(PRESETS.circuit,['nawadaha-falls','manido-falls','manabezho-falls']);
 assert.equal(new Set(PRESETS.circuit).size,3);
 for(const id of PRESETS.circuit){const r=byId.get(id);assert.ok(r,id);assert.equal(r.publication,'verified-access-guide');assert.match(r.source,/^https:\/\//);assert.match(r.manager,/Michigan DNR/);assert.ok(r.verification?.parking?.verified);assert.ok(r.verification?.trail?.verified);assert.ok(html.includes('href="/upper-peninsula-waterfalls/'+id+'/"')); }
});
test('winter restriction is a conservative circuit policy, not a bogus road-closure claim',()=>{
 for(const day of ['2026-12-01','2027-01-05','2027-02-28','2027-03-31']){
  assert.equal(seasonalAdvisory(day).winter,true,day);
  assert.equal(assess('circuit',cards(),[],day).ok,false,day);
  assert.equal(assess('overlook',cards(),[],day).ok,true,'shorter option remains conditional and source-reviewed');
 }
 assert.equal(seasonalAdvisory('2027-04-01').winter,false);
 assert.equal(seasonalAdvisory('2027-06-10').winter,false);
 for(const bad of ['2027-02-30','2027-13-10','foo'])assert.equal(seasonalAdvisory(bad).valid,false);
});
test('full circuit requires a date, preserves saved stops and never partially exceeds six',()=>{
 const map=cards();
 assert.equal(assess('circuit',map,[],'').ok,false);
 assert.deepEqual(assess('circuit',map,['nawadaha-falls'],'2027-06-01').missing,['manido-falls','manabezho-falls']);
 assert.equal(assess('circuit',map,['a','b','c','d'],'2027-06-01').ok,false);
 assert.equal(assess('circuit',map,[],'2027-06-01').ok,true);
 const broken=cards();broken.get('manido-falls').dataset.arrivalVerified='pending';
 assert.equal(assess('circuit',broken,[],'2027-06-01').ok,false);
 broken.get('manido-falls').dataset.status='closed';
 assert.equal(assess('overlook',broken,[],'2027-06-01').ok,true);
 assert.equal(assess('not-real',map,[],'2027-06-01').ok,false);
});
test('page is source-led, preserves SEO and map truth; day sheet groups one arrival',()=>{
 assert.equal((html.match(/id="presque-isle-outing"/g)||[]).length,1);
 assert.match(html,/data-presque-preset="overlook"/);assert.match(html,/data-presque-preset="circuit"/);
 assert.match(html,/County Road 519/);
 assert.match(html,/West River Trail repairs/);
 assert.match(html,/https:\/\/www\.michigan\.gov\/recsearch\/parks\/porkies/);
 assert.match(html,/https:\/\/www\.michigan\.gov\/dnr\/about\/newsroom\/closures/);
 assert.ok(html.indexOf('up-waterfalls-presque-isle-outing.js')>html.indexOf('up-waterfalls-day-sheet.js'));
 assert.match(css,/\.presque-isle-outing/);
 assert.match(day,/day-sheet-shared-arrival/);
 assert.match(day,/riverCount >= 2/);
 const section=html.split('<section class="presque-isle-outing"')[1]?.split('<section class="nearby-lab"')[0]||'';
 assert.doesNotMatch(section,/maps\/dir\/|data-parking-lat=|data-parking-lng=/);
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/upper-peninsula-waterfalls\/"/);
});
