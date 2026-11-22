'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const core=require('../public/assets/cuyahoga-watch-core.js');
const parks=require('../data/cuyahoga/public-watch-spots.json');
const pubParks=require('../public/cuyahoga-freighter-watch/viewpoints.json');
const pilot=require('../data/cuyahoga/noaa-coast-pilot-bridge-references.json');
const pubPilot=require('../public/cuyahoga-freighter-watch/bridges.json');
const page=readFileSync('public/cuyahoga-freighter-watch/index.html','utf8');
const app=readFileSync('public/assets/cuyahoga-watch-app.js','utf8');
const css=readFileSync('public/assets/cuyahoga-watch.css','utf8');
const now=Date.parse('2026-11-22T14:00:00.000Z');
const v=(seen,lat=41.492,lon=-81.699)=>({mmsi:'367111222',name:'EXAMPLE VESSEL',seen,lat,lon,source:'same-site AIS',speedKnots:2.4,lengthMeters:120,shipType:70});

test('public source directory is exactly the reviewed dataset, not a guessed access map',()=>{
 assert.deepEqual(pubParks,parks);
 assert.equal(core.validCatalog(parks),true);
 assert.equal(parks.spots.length,4);
 assert.equal(new Set(parks.spots.map(x=>x.id)).size,4);
 for(const x of parks.spots){
  assert.equal(x.visitStatus,'PUBLIC_PARK_ACCESS_VERIFY_CURRENT_CLOSURES');
  assert.ok(x.coordinateNote.includes('NOT'));
  assert.ok(x.coordinateSource.startsWith('https://'));
  assert.ok(x.officialUrl.startsWith('https://www.clevelandmetroparks.com/'));
 }
 assert.deepEqual(pubPilot,pilot);
 assert.equal(pubPilot.excludedFromFutureEtas,true);
 assert.equal(pubPilot.bridges.length,21);
});
test('a fresh AIS observation near Cleveland is displayed without future prediction',()=>{
 const result=core.classifyLive({ok:true,checkedAt:'2026-11-22T13:59:50Z',vessels:[
  v('2026-11-22T13:58:00Z'),
  v('2026-11-22T13:24:00Z'),
  v('2026-11-22T13:58:00Z',41.6,-81.699),
  {...v('2026-11-22T13:58:00Z'),mmsi:'NOT_NINE_DIGITS'}
 ]},now);
 assert.equal(result.state,'REPORTS_AVAILABLE');
 assert.equal(result.count,1);
 assert.equal(result.vessels[0].name,'EXAMPLE VESSEL');
 assert.equal(result.vessels[0].speedKnots,2.4);
});
test('no fresh sightings and feed outage never assert no ships',()=>{
 const empty=core.classifyLive({ok:true,checkedAt:'2026-11-22T13:59:00Z',vessels:[]},now);
 assert.equal(empty.state,'NO_FRESH_LOCAL_REPORTS');
 assert.match(empty.reason,/do not establish an empty river/);
 const missing=core.classifyLive(null,now);
 assert.equal(missing.state,'UNAVAILABLE');
 assert.match(missing.reason,/does not mean no ships/);
 const stale=core.classifyLive({ok:true,checkedAt:'2026-11-22T13:00:00Z',vessels:[v('2026-11-22T13:59:00Z')]},now);
 assert.equal(stale.state,'STALE');
 assert.equal(stale.count,0);
 assert.equal(core.recent(v('2026-11-22T14:04:00Z'),now),false);
 assert.equal(core.recent(v('2026-11-22T13:29:59Z'),now),false);
});
test('a missing or valid historical archive never invents a continuous ship path',()=>{
 assert.equal(core.historyDay(null,'barker-2025-07-07'),null);
 assert.equal(core.historicView(null,'barker-2025-07-07',3).state,'HISTORY_UNAVAILABLE');
 const data={schemaVersion:1,observationKind:'NOAA_HISTORICAL_BROADCAST_FIXES',voyages:[
  {id:'barker-2025-07-07',name:'MARK W BARKER',fixes:[
   {seen:'2025-07-07T04:02:19Z',lat:41.4941,lon:-81.70342},
   {seen:'2025-07-07T04:01:09Z',lat:41.49457,lon:-81.70317}
  ]}
 ]};
 const result=core.historicView(data,'barker-2025-07-07',-8);
 assert.equal(result.state,'HISTORICAL');
 assert.equal(result.count,2);
 assert.equal(result.observedAt,'2025-07-07T04:01:09Z');
 assert.match(result.disclaimer,/not the continuous path sailed/);
 assert.equal(core.historicView(data,'barker-2025-07-07',99).index,1);
});
test('published preview is noindex, map first, source-first, accessible and has no new production dependency',()=>{
 assert.match(page,/<meta name="robots" content="noindex,follow">/);
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski.com\/cuyahoga-freighter-watch\/"/);
 assert.match(page,/aria-pressed="true"/);
 assert.match(page,/id="cuyahoga-map"/);
 assert.match(page,/id="history-scrubber"/);
 assert.match(page,/id="live-vessels"/);
 assert.match(page,/https:\/\/coast.noaa.gov\/accessais\//);
 assert.match(page,/https:\/\/www.clevelandmetroparks.com\//);
 assert.match(page,/#person/);
 assert.match(app,/fetch\('\/api\/freighter-ais'/);
 assert.doesNotMatch(app,/openwaters|marine.?traffic\.com|redis|api\.openai\.com/i);
 assert.doesNotMatch(app,/arrive(?:s|d|al)? in \d|minutes until|ETA =/i);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/focus-visible/);
});

test('all publicly displayed 2025 observations are actual NOAA fixes with retained source fingerprints',()=>{
 const dataset=JSON.parse(readFileSync('public/cuyahoga-freighter-watch/noaa-historical-2025.json','utf8'));
 assert.equal(dataset.observationKind,'NOAA_HISTORICAL_BROADCAST_FIXES');
 assert.equal(dataset.timezone,'UTC');
 assert.deepEqual(dataset.dates,['2025-07-07','2025-08-15','2025-08-21']);
 assert.deepEqual(dataset.voyages.map(v=>v.fixes.length),[434,215,353]);
 for(const v of dataset.voyages){
  assert.match(v.originalArchiveSha256,/^[0-9a-f]{64}$/);
  assert.equal(v.fixes[0].seen,v.firstObservedAt);
  assert.equal(v.fixes.at(-1).seen,v.lastObservedAt);
  assert.ok(v.fixes.every(p=>core.inArea(p)&&p.seen.startsWith(v.date)));
  assert.equal(new Set(v.fixes.map(p=>p.seen)).size,v.fixes.length);
  assert.equal(core.historicView(dataset,v.id,0).state,'HISTORICAL');
 }
 assert.deepEqual(dataset.voyages.map(v=>v.mmsi),['368251670','366938760','368251670']);
 assert.ok(dataset.disclaimers.some(x=>/not live/i.test(x)));
 assert.ok(dataset.disclaimers.some(x=>/bridge/.test(x)));
});
test('switching evidence type keeps source domains and future ETAs separated',()=>{
 assert.match(app,/state\.mode==='live'/);
 assert.match(app,/const historic=mode==='historic'/);
 assert.match(app,/\/cuyahoga-freighter-watch\/noaa-historical-2025\.json/);
 assert.match(app,/\/cuyahoga-freighter-watch\/viewpoints\.json/);
 assert.match(app,/\/cuyahoga-freighter-watch\/bridges\.json/);
 assert.match(page,/<noscript>/);
 assert.match(page,/Park managers provide current access information/);
 assert.doesNotMatch(page,/<iframe[^>]+src="https:\/\/.*(?:tracking|ais|maps)/i);
});

test('each public NOAA replay begins with an actual observed ship fix near the central Cuyahoga river bends',()=>{
 const dataset=JSON.parse(readFileSync('public/cuyahoga-freighter-watch/noaa-historical-2025.json','utf8'));
 const expected={'barker-2025-07-07':96,'laud-2025-08-15':36,'barker-2025-08-21':157};
 for(const v of dataset.voyages){
  const index=core.firstRiverFixIndex(dataset,v.id);
  assert.equal(index,expected[v.id]);
  const first=core.historicView(dataset,v.id,index);
  assert.equal(first.observed.seen,v.fixes[index].seen);
  assert.ok(first.observed.lat>=41.488&&first.observed.lat<=41.496);
  assert.ok(first.observed.lon>=-81.706&&first.observed.lon<=-81.697);
 }
 assert.equal(core.firstRiverFixIndex(null,'missing'),0);
});
