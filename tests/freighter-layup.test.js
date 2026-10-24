'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','public'),registry=JSON.parse(fs.readFileSync(path.join(root,'assets','freighter-layup-registry.json'),'utf8'));
const model=require('../public/assets/freighter-layup-model.js'),seasons=registry.seasons;
const old=seasons.find(s=>s.id==='2024-25'),hist=seasons.find(s=>s.id==='2025-26'),upcoming=seasons.find(s=>s.id==='2026-27');
const app=fs.readFileSync(path.join(root,'assets','freighter-layup.js'),'utf8');
const html=fs.readFileSync(path.join(root,'great-lakes-freighter-winter-layup','index.html'),'utf8');
const secure=s=>/^https:\/\/[^\s]+$/.test(s||'');
test('source model supports three winters without future location carryover',()=>{
 assert.deepEqual(model.validateRegistry(registry),[]);
 assert.deepEqual(model.totals(hist),{documented:27,confirmed:10,reported:17,harbors:18});
 assert.deepEqual(model.totals(old),{documented:14,confirmed:2,reported:12,harbors:11});
 assert.deepEqual(upcoming.records,[]);
 assert.equal(upcoming.state,'upcoming_unconfirmed');
});
test('all eighteen harbors are approximate geographic references across the lakes and Seaway',()=>{
 assert.deepEqual(registry.harbors.map(h=>h.id).sort(),['ashtabula','cleveland','ecorse','goderich','hamilton','midland','milwaukee','montreal','owen-sound','port-colborne','port-weller','sarnia','sturgeon-bay','superior','thunder-bay','toledo','toronto','windsor']);
 for(const h of registry.harbors){assert.equal(h.coordinatePrecision,'approximate_harbor_reference_not_dock');assert.ok(Number.isFinite(h.lat)&&Number.isFinite(h.lon));assert.match(h.note,/not|NOT|no vessel/i);}
 assert.equal(registry.harbors.find(h=>h.id==='owen-sound').country,'CA');
});
test('each dated layup has canonical identity, visible confidence and evidence',()=>{
 for(const season of [old,hist])for(const v of season.records){
   assert.equal(v.identity.key,v.id);
   assert.ok(model.validImo(v.identity.imo));
   assert.ok(model.validMmsi(v.identity.mmsi));
   assert.ok(secure(v.evidence?.url),v.id);
   assert.match(v.statusAsOf,/^\d{4}-\d\d-\d\d$/);
   assert.ok(v.events?.length);
   for(const e of v.events){assert.match(e.date,/^\d{4}-\d\d-\d\d$/);assert.ok(secure(e.source));}
   assert.ok(['dock_documented','facility_reported','berth_unverified'].includes(v.berthPrecision));
 }
});
test('American Spirit media report and Manitoulin community report never count as verified',()=>{
 const man=hist.records.find(v=>v.id==='manitoulin'),sp=hist.records.find(v=>v.id==='american-spirit');
 assert.equal(model.classify(man,hist).confirmed,false);
 assert.equal(model.classify(sp,hist).confirmed,false);
 assert.equal(man.evidenceClass,'community_report');
 assert.equal(sp.evidenceClass,'journalistic_report');
 const changed=structuredClone(registry);changed.seasons.find(s=>s.id==='2025-26').records.find(v=>v.id==='manitoulin').status='confirmed_historical';
 assert.match(model.validateRegistry(changed).join(' '),/community report cannot confirm/);
});
test('Algoma Compass has the same hull identity across winters',()=>{
 const v25=old.records.find(v=>v.id==='algoma-compass'),v26=hist.records.find(v=>v.id==='algoma-compass');
 assert.ok(v25&&v26);assert.equal(v25.identity.key,v26.identity.key);
 assert.equal(v25.identity.imo,'7326245');assert.equal(v26.identity.imo,'7326245');
 assert.equal(model.validImo(v25.identity.imo),true);
 assert.equal(model.findVessel(hist.records,'Roger M. Kyes').match.id,'algoma-compass');
 assert.equal(model.findVessel(hist.records,'Roger Kyes').reason,'no_exact_match');
 assert.equal(model.findVessel(hist.records,'James Baker').reason,'no_exact_match');
});
test('duplicate alias across different hulls is forbidden',()=>{
 const changed=structuredClone(registry);changed.seasons.find(s=>s.id==='2025-26').records.find(v=>v.id==='manitoulin').aliases.push('Mesabi Miner');
 assert.match(model.validateRegistry(changed).join(' '),/ambiguous alias/);
 assert.equal(model.validImo('1234568'),false);assert.equal(model.validMmsi('123'),false);
});
test('every reused vessel photo has attribution and a source-scoped date',()=>{
 const seen=new Set();
 for(const v of seasons.flatMap(s=>s.records)){if(!v.photo)continue;
   assert.ok(secure(v.photo.page)&&v.photo.page.includes('commons.wikimedia.org'));
   assert.ok(v.photo.creator&&v.photo.license&&v.photo.date);
   assert.match(v.photo.alt,/not a winter layup|not a winter/i);
   if(!v.photo.license.startsWith('Public domain'))assert.ok(secure(v.photo.licenseUrl));
   seen.add(v.photo.file);
 }
 assert.equal(seen.size,27);
 assert.ok(seasons.flatMap(s=>s.records).every(v=>v.photo),'every curated ship has a licensed real photo');
});
test('atlas supports a third season and links to source-first permanent biographies',()=>{
 for(const id of ['id="season"','id="harbor-filter"','id="ship-search"','id="layup-map"'])assert.ok(html.includes(id));
 for(const id of ['algoma-compass','american-spirit','oakglen','lee-a-tregurtha','stewart-j-cort','james-r-barker'])assert.ok(html.includes('vessels/'+id+'/'),id);
 assert.ok(html.includes('2024-25'));
 for(const v of hist.records)assert.ok(html.includes('<h3>'+v.name+'</h3>'),v.name);
 assert.ok(app.includes('This ship in other winters'));
 assert.ok(app.includes('state.biographies'));
 assert.ok(!app.includes('/api/freighter-ais'));
});
test('both interaction and evidence scripts parse',()=>{
 assert.doesNotThrow(()=>new Function(app));
 assert.doesNotThrow(()=>new Function(fs.readFileSync(path.join(root,'assets','freighter-layup-model.js'),'utf8')));
});
test('expanded seasonal reports preserve dates, reviewed provenance and lower confidence',()=>{
 const added=hist.records.filter(v=>v.evidence.url==='https://www.boatnerd.com/vessel-passage/winter-layup-lists/2025-26/');
 assert.equal(added.length,15);
 const arrivals={'american-century':'2026-01-17',alpena:'2026-01-08','paul-r-tregurtha':'2026-01-14','edwin-h-gott':'2026-01-18','algoma-equinox':'2026-01-13','algoma-bear':'2026-01-14','baie-comeau':'2026-01-08','csl-tadoussac':'2026-01-03','whitefish-bay':'2026-01-19',oakglen:'2026-01-03','mark-w-barker':'2026-01-11','algoma-harvester':'2026-01-09','thunder-bay':'2026-01-13','evans-spirit':'2026-01-08','algoma-buffalo':'2026-01-13'};
 for(const v of added){
   assert.equal(v.status,'reported_historical');assert.equal(v.evidenceClass,'community_report');
   assert.equal(v.events[0].date,arrivals[v.id]);assert.equal(v.evidence.published,null,'review date is not an invented publication date');
   assert.equal(v.evidence.reviewedOn,'2026-10-24');assert.equal(model.classify(v,hist).isCurrent,false);
   assert.ok(v.events.every(e=>e.date<=hist.asOf),'snapshot contains only arrivals before its cutoff');
 }
 assert.equal(old.records.filter(v=>v.evidenceClass==='community_report').length,12);
 assert.equal(model.findVessel(hist.records,'Oakglen').match.harborId,'goderich');
 assert.equal(model.findVessel(old.records,'Oakglen').match.harborId,'owen-sound');
});
test('photo validation rejects missing rights and unapproved image hosts',()=>{
 const missing=structuredClone(registry),foreign=structuredClone(registry);
 delete missing.seasons.find(s=>s.id==='2025-26').records.find(v=>v.id==='algoma-compass').photo.licenseUrl;
 foreign.seasons.find(s=>s.id==='2025-26').records[0].photo.url='https://example.com/unverified.jpg';
 assert.match(model.validateRegistry(missing).join(' '),/missing photo license link/);
 assert.match(model.validateRegistry(foreign).join(' '),/unsupported photo host/);
});
