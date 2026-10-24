'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const publicDir=path.join(__dirname,'..','public');
const registry=JSON.parse(fs.readFileSync(path.join(publicDir,'assets','freighter-layup-registry.json'),'utf8'));
const seasons=registry.seasons;
const historical=seasons.find(s=>s.id==='2025-26');
const upcoming=seasons.find(s=>s.id==='2026-27');
const site=fs.readFileSync(path.join(publicDir,'great-lakes-freighter-winter-layup','index.html'),'utf8');
const js=fs.readFileSync(path.join(publicDir,'assets','freighter-layup.js'),'utf8');
function secure(s){return /^https:\/\/[^\s]+$/.test(s)}
test('registry uses a source-backed, season-separated model',()=>{
 assert.equal(registry.schemaVersion,1);
 assert.ok(historical && upcoming);
 assert.equal(historical.state,'historical_snapshot');
 assert.equal(upcoming.state,'upcoming_unconfirmed');
 assert.deepEqual(upcoming.records,[],'Current winter must never inherit last winter berths');
 assert.equal(historical.records.length,6);
 assert.ok(/not.*complete|not.*exhaustive|partial/i.test(registry.description+' '+historical.note));
});
test('every confirmed historical berth has individual source and snapshot date',()=>{
 const ids=new Set();
 for(const v of historical.records){
   assert.ok(v.id && !ids.has(v.id),'each vessel requires stable unique id');ids.add(v.id);
   assert.ok(v.name && v.berth && v.harborId);
   assert.equal(v.status,'confirmed_historical');
   assert.equal(v.statusAsOf,'2026-01-30');
   assert.equal(v.evidence.publisher,'Duluth Seaway Port Authority');
   assert.ok(secure(v.evidence.url));
   assert.equal(v.evidence.published,'2026-01-30');
   assert.ok(registry.harbors.some(h=>h.id===v.harborId));
   assert.ok(v.summary && v.summary.length>65);
   assert.ok(Array.isArray(v.events) && v.events.length);
   for(const ev of v.events){
     assert.match(ev.date,/^\d{4}-\d\d-\d\d$/);
     assert.ok(secure(ev.source),'timeline events require a source');
     assert.ok(ev.text && ev.text.length>20);
   }
 }
});
test('harbor coordinates are explicitly not berths or ship positions',()=>{
 for(const h of registry.harbors){
   assert.ok(Number.isFinite(h.lat)&&Number.isFinite(h.lon));
   assert.equal(h.coordinatePrecision,'approximate_harbor_reference_not_dock');
   assert.match(h.note,/not|no vessel/i);
 }
 assert.ok(!js.includes('/api/freighter-ais'),'Layup archives must not falsely infer status from AIS');
 assert.ok(js.includes('coordinatePrecision')||site.includes('approximate harbor reference'));
});
test('all embedded photographs have verifiable identities and licensing',()=>{
 for(const v of historical.records){
   if(!v.photo)continue;
   assert.ok(secure(v.photo.page));
   assert.match(v.photo.page,/commons\.wikimedia\.org/);
   assert.ok(v.photo.file&&v.photo.creator&&v.photo.license&&v.photo.date&&v.photo.alt);
   assert.match(v.photo.alt,/not a winter layup|not a winter/i);
   if(v.photo.license!=='Public domain (U.S. federal government)') assert.ok(secure(v.photo.licenseUrl));
 }
});
test('search, season selector and source links exist without requiring JavaScript',()=>{
 for(const s of ['id="season"','id="ship-search"','id="berth-filter"','id="layup-map"','id="ship-grid"','id="ship-detail"','https://duluthport.com/','Built by'])assert.ok(site.includes(s),s);
 for(const v of historical.records)assert.ok(site.includes(v.name),v.name);
 assert.ok(site.includes('https://chrisizworski.com/#person'));
 assert.ok(!site.includes('Live winter layup'), 'Archived and current statuses must be distinguished');
});
test('all UI scripts have valid JavaScript syntax',()=>assert.doesNotThrow(()=>new Function(js)));
