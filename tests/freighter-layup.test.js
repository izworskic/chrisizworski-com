'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','public');
const registry=JSON.parse(fs.readFileSync(path.join(root,'assets','freighter-layup-registry.json'),'utf8'));
const model=require('../public/assets/freighter-layup-model.js');
const seasons=registry.seasons;
const historical=seasons.find(s=>s.id==='2025-26');
const upcoming=seasons.find(s=>s.id==='2026-27');
const html=fs.readFileSync(path.join(root,'great-lakes-freighter-winter-layup','index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'assets','freighter-layup.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets','freighter-layup.css'),'utf8');
const secure=s=>/^https:\/\/[^\s]+$/.test(s||'');
test('v2 registry validates against shared identity and status policy',()=>{
 assert.equal(registry.schemaVersion,2);
 assert.deepEqual(model.validateRegistry(registry),[]);
 assert.equal(historical.state,'historical_snapshot');
 assert.equal(upcoming.state,'upcoming_unconfirmed');
 assert.deepEqual(upcoming.records,[],'do not inherit previous-season berth predictions');
 assert.equal(historical.records.length,10);
 assert.deepEqual(model.totals(historical),{documented:10,confirmed:9,reported:1,harbors:3});
});
test('all three harbors are approximate, not dock coordinates',()=>{
 assert.deepEqual(registry.harbors.map(h=>h.id).sort(),['milwaukee','sturgeon-bay','superior']);
 for(const h of registry.harbors){
   assert.equal(h.coordinatePrecision,'approximate_harbor_reference_not_dock');
   assert.ok(Number.isFinite(h.lat)&&Number.isFinite(h.lon));
   assert.match(h.note,/not|NOT|no vessel/i);
 }
});
test('each vessel has canonical key, specific evidence and dated history',()=>{
 const ids=new Set();
 for(const v of historical.records){
   assert.ok(v.id&&!ids.has(v.id),'unique vessel identity '+v.id);ids.add(v.id);
   assert.equal(v.identity.key,v.id);
   assert.ok(model.validImo(v.identity.imo)&&model.validMmsi(v.identity.mmsi));
   assert.ok(['confirmed_historical','reported_historical'].includes(v.status));
   assert.match(v.statusAsOf,/^\d{4}-\d{2}-\d{2}$/);
   assert.ok(secure(v.evidence.url));
   assert.ok(v.evidence.publisher);
   assert.ok(['dock_documented','facility_reported','berth_unverified'].includes(v.berthPrecision));
   assert.ok(v.summary.length>65);
   assert.ok(v.events.length>=1);
   for(const event of v.events){
     assert.match(event.date,/^\d{4}-\d{2}-\d{2}$/);
     assert.ok(event.type&&event.text&&secure(event.source));
   }
 }
});
test('community sightings cannot silently become confirmed',()=>{
 const man=historical.records.find(v=>v.id==='manitoulin');
 assert.equal(man.status,'reported_historical');
 assert.equal(man.evidenceClass,'community_report');
 assert.equal(model.classify(man,historical).confirmed,false);
 assert.equal(model.classify(man,historical).reported,true);
 const promoted=structuredClone(registry);
 promoted.seasons.find(s=>s.id==='2025-26').records.find(v=>v.id==='manitoulin').status='confirmed_historical';
 assert.match(model.validateRegistry(promoted).join(' '),/community report cannot confirm/);
 assert.equal(model.classify(man,upcoming).isCurrent,false);
});
test('vessel identity uses curated exact aliases instead of fuzzy auto-merges',()=>{
 const b=model.findVessel(historical.records,'James R Barker');
 assert.equal(b.reason,'exact_curated_identity');
 assert.equal(b.match.id,'james-r-barker');
 assert.equal(model.findVessel(historical.records,'James Baker').reason,'no_exact_match');
 assert.equal(model.findVessel(historical.records,'Manitoulin').match.id,'manitoulin');
 const collisions=structuredClone(registry);
 collisions.seasons.find(s=>s.id==='2025-26').records.find(v=>v.id==='manitoulin').aliases.push('Mesabi Miner');
 assert.match(model.validateRegistry(collisions).join(' '),/ambiguous alias/);
 assert.equal(model.validImo('1234567'),false);
 assert.equal(model.validMmsi('12'),false);
});
test('sturgeon bay and Milwaukee entries have independent dated historical society sources',()=>{
 for(const [id,source] of [
   ['james-r-barker','https://wmhs.org/james-r-barker-arrives-at-fincantieri/'],
   ['edgar-b-speer','https://wmhs.org/edgar-b-speer-arrives-at-fincantieri/'],
   ['stewart-j-cort','https://wmhs.org/stewart-j-cort-arrives-in-milwaukee/']
 ]){
  const v=historical.records.find(v=>v.id===id);
  assert.ok(v,id);
  assert.equal(v.status,'confirmed_historical');
  assert.equal(v.evidenceClass,'maritime_historical_society');
  assert.equal(v.evidence.url,source);
 }
});
test('ship photographs carry real identities and rights metadata',()=>{
 for(const v of historical.records){
  if(!v.photo)continue;
  assert.ok(secure(v.photo.page));
  assert.match(v.photo.page,/commons\.wikimedia\.org/);
  assert.ok(v.photo.creator&&v.photo.license&&v.photo.date&&v.photo.alt);
  assert.match(v.photo.alt,/not a winter layup|not a winter/i);
  if(v.photo.license!=='Public domain (U.S. federal government)')assert.ok(secure(v.photo.licenseUrl));
 }
});
test('the page has crawlable historical data and interactive multi-harbor controls',()=>{
 for(const id of ['id="season"','id="harbor-filter"','id="ship-search"','id="berth-filter"','id="layup-map"','id="ship-grid"','id="ship-detail"'])
  assert.ok(html.includes(id),id);
 for(const v of historical.records)assert.ok(html.includes('<h3>'+v.name+'</h3>'),v.name);
 for(const h of ['Superior','Sturgeon Bay','Milwaukee'])assert.ok(html.includes(h));
 assert.ok(html.includes('/assets/freighter-layup-model.js'));
 assert.ok(html.includes('https://chrisizworski.com/#person'));
 assert.ok(html.includes('Built by'));
 assert.ok(css.includes('.tag-reported'));
});
test('the app never infers layup from AIS silence or stale position',()=>{
 assert.ok(!app.includes('/api/freighter-ais'));
 assert.ok(!app.includes('speedKnots'));
 assert.ok(!app.includes('lastSeen'));
 assert.ok(app.includes('policy().validateRegistry'));
 assert.ok(app.includes('state.activeHarbor'));
 assert.ok(!html.includes('Live winter layup'));
});
test('app and evidence module are valid JavaScript',()=>{
 assert.doesNotThrow(()=>new Function(app));
 const modelScript=fs.readFileSync(path.join(root,'assets','freighter-layup-model.js'),'utf8');
 assert.doesNotThrow(()=>new Function(modelScript));
});
