'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const core=require('../public/assets/calumet-watch-core.js');
const guide=require('../public/calumet-freighter-watch/guide.json');
const html=readFileSync('public/calumet-freighter-watch/index.html','utf8');
const css=readFileSync('public/assets/calumet-watch.css','utf8');
const app=readFileSync('public/assets/calumet-watch-app.js','utf8');
const now=Date.parse('2026-11-22T19:00:00Z');
const vessel=(seen,lat=41.7228,lon=-87.5433)=>({mmsi:'366123456',name:'TEST FREIGHTER',seen,lat,lon,shipType:70,course:123,lengthMeters:190,speedKnots:4.6,source:'site AIS'});

test('Calumet bridge and public-place catalog is source-backed and explicitly limited',()=>{
 assert.equal(core.validateGuide(guide),true);
 assert.equal(guide.bridges.length,10);assert.equal(guide.viewpoints.length,2);
 assert.equal(guide.bridges.filter(b=>b.group==='city').length,5);
 assert.equal(guide.bridges.filter(b=>b.group==='rail').length,5);
 assert.equal(guide.turningBasins.references.length,3);
 assert.deepEqual(guide.turningBasins.references.map(x=>x.milesAboveMouth),[0.9,4.63,6.06]);
 assert.equal(guide.dataRules.noEta,true);
 assert.equal(guide.dataRules.noLiveBridgeOpenings,true);
 assert.ok(guide.bridges.every(b=>b.mapRole==='ROUNDED_REFERENCE_NOT_SPAN'));
 assert.ok(guide.viewpoints.every(p=>p.coordinateNote.includes('NOT')));
 assert.ok(guide.viewpoints.every(p=>p.sourceUrl.startsWith('https://')));
 assert.ok(guide.bridges.some(b=>b.id==='95th'&&b.riverMile===1.09));
 assert.ok(guide.viewpoints.some(p=>p.id==='calumetpark'&&p.accessClass==='PUBLIC_PARK_SIGHTLINE_NOT_VERIFIED'));
});
test('fresh AIS is bounded, checked and individually fresh, with original attribution',()=>{
 const result=core.classifyLive({ok:true,checkedAt:'2026-11-22T18:59:30Z',
 vessels:[vessel('2026-11-22T18:58:00Z'),vessel('2026-11-22T18:20:00Z'),
  vessel('2026-11-22T18:59:00Z',41.55,-87.5433),
  {...vessel('2026-11-22T18:59:00Z'),mmsi:'bad'}],
 attribution:[{source:'AIS',credit:'Recorded upstream credit'}]},now);
 assert.equal(result.state,'REPORTS_AVAILABLE');assert.equal(result.vessels.length,1);
 assert.equal(result.vessels[0].name,'TEST FREIGHTER');
 assert.equal(result.vessels[0].source,'site AIS');
 assert.equal(result.vessels[0].heading,null);
 assert.equal(result.attributions[0].credit,'Recorded upstream credit');
 assert.equal(core.vesselVisual(result.vessels[0]).kind,'cargo');
 assert.equal(core.vesselVisual(result.vessels[0]).course,123);
 assert.equal(core.nearPlace(guide.viewpoints[0],result,now).state,'NEARBY_REPORTED_POSITION');
});
test('true AIS heading is optional, source-reported and bounded',()=>{
 const valid=core.classifyLive({ok:true,checkedAt:'2026-11-22T18:59:30Z',
  vessels:[{...vessel('2026-11-22T18:58:00Z'),heading:265}]},now);
 assert.equal(valid.vessels[0].heading,265);
 const invalid=core.classifyLive({ok:true,checkedAt:'2026-11-22T18:59:30Z',
  vessels:[{...vessel('2026-11-22T18:58:00Z'),heading:511}]},now);
 assert.equal(invalid.vessels[0].heading,null);
});
test('no fresh observations, stale checks and unavailable data are not assertions of an empty river',()=>{
 const unavailable=core.classifyLive(null,now);
 assert.equal(unavailable.state,'UNAVAILABLE');assert.match(unavailable.reason,/does not mean no ships/);
 const stale=core.classifyLive({ok:true,checkedAt:'2026-11-22T18:01:00Z',
  vessels:[vessel('2026-11-22T18:59:00Z')]},now);
 assert.equal(stale.state,'STALE');assert.equal(stale.vessels.length,0);
 const empty=core.classifyLive({ok:true,checkedAt:'2026-11-22T18:59:00Z',vessels:[]},now);
 assert.equal(empty.state,'NO_FRESH_LOCAL_REPORTS');assert.match(empty.reason,/do not establish an empty river/);
 assert.equal(core.nearPlace(guide.viewpoints[0],empty,now).state,'NOT_DETERMINABLE');
 assert.equal(core.recent(vessel('2026-11-22T19:03:00Z'),now),false);
});
test('duplicates do not inflate the number of ships and ship-size markers are not scale claims',()=>{
 const report=core.classifyLive({ok:true,checkedAt:'2026-11-22T18:59:30Z',vessels:[
  vessel('2026-11-22T18:58:00Z'),vessel('2026-11-22T18:57:00Z'),
  {...vessel('2026-11-22T18:59:00Z'),mmsi:'367765432',shipType:80,lengthMeters:244}
 ]},now);
 assert.equal(report.vessels.length,2);
 assert.equal(core.vesselVisual(report.vessels[0]).kind,'tanker');
 assert.equal(core.vesselVisual(report.vessels[0]).size,'large');
 assert.equal(core.vesselVisual(report.vessels[1]).illustrative,true);
});
test('noindex route and inherited site contracts are preserved without touching existing boat tools',()=>{
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/calumet-freighter-watch\/"/);
 assert.match(html,/#person/);
 assert.match(html,/© 2026 Chris Izworski/);
 assert.match(html,/id="calumet-map"/);assert.match(html,/id="bridge-angle"/);
 assert.match(html,/id="view-choices"/);assert.match(html,/<noscript>/);
 assert.match(html,/id="rail-layer"/);assert.match(app,/state\.railBridges=L\.layerGroup\(\)/);
 assert.match(app,/b\.group==='rail'/);
 assert.match(html,/turning basins/);
 assert.match(html,/\/assets\/visitor-map-links\.js/);
 assert.match(app,/fetch\('\/api\/freighter-ais'/);
 assert.match(app,/core\.nearPlace\(/);assert.match(app,/if\(!window\.L\)/);
 assert.match(app,/textContent/);
 assert.doesNotMatch(app,/api\.openai\.com|marine.?traffic\.com|redis|setInterval/i);
 assert.doesNotMatch(app,/ETA\s*=|arrive in \d|minutes until/i);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);
});
test('mechanism is a manual teaching simulation with reset, not a real bridge opening',()=>{
 assert.match(html,/teaching illustration/);
 assert.match(html,/SCHEMATIC/);
 assert.match(html,/type="range" min="0" max="70"/);
 assert.match(app,/bridge-reset/);assert.match(app,/slider\.addEventListener\('input'/);
 assert.equal(core.noticeWindow({start:'2027-02-01',end:'2027-02-03',sourceUrl:'https://navcen.uscg.gov'},'2026-11-22'),'PUBLISHED_FUTURE_WORK_NOT_LIVE');
});
