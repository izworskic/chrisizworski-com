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
 assert.doesNotMatch(page,/id="history-scrubber"|id="show-history"|2025 ship replay/);
 assert.match(page,/Choose where to watch/);
 assert.match(page,/id="live-vessels"/);
 assert.match(page,/https:\/\/openwaters.io\/ais\//);
 assert.doesNotMatch(page,/NOAA historical AIS ↗/);
 assert.match(page,/https:\/\/www.clevelandmetroparks.com\//);
 assert.match(page,/#person/);
 assert.match(app,/fetch\('\/api\/freighter-ais\?region=cuyahoga'/);
 assert.match(app,/data\.scope!==\x27cuyahoga-regional-openwaters\x27/);
 assert.match(app,/setInterval\(\(\)=>\{if\(!document\.hidden\)getLive\(\);\},60000\)/);
 assert.match(app,/visibilitychange/);
 assert.match(app,/if\(refresh\.disabled\)return/);
 assert.match(app,/if\(selected\)selectShip\(selected,false\)/);
 assert.doesNotMatch(app,/ais\.openwaters\.io|marine.?traffic\.com|redis|api\.openai\.com/i);
 assert.doesNotMatch(app,/arrive(?:s|d|al)? in \d|minutes until|ETA =/i);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/focus-visible/);
});

test('preserved NOAA archive data remains authentic without appearing in the current watch UI',()=>{
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
test('live visitor map does not fetch or present archived 2025 vessel observations',()=>{
 assert.doesNotMatch(app,/state\.mode|renderHistory|history-scrubber|noaa-historical-2025\.json/);
 assert.doesNotMatch(page,/2025 ship replay|Choose a 2025 vessel day/);
 assert.match(page,/Recent AIS vessels/);
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

test('upstream AIS source attribution is preserved and HTML injection remains text-only',()=>{
 const report=core.classifyLive({
  ok:true,checkedAt:'2026-11-22T13:59:59Z',
  vessels:[v('2026-11-22T13:59:00Z')],
  attribution:[{source:'test-source',credit:'Original receiver license and attribution'}]
 },now);
 assert.deepEqual(report.attributions,[{source:'test-source',credit:'Original receiver license and attribution'}]);
 assert.match(page,/id="ais-source-credits"/);
 assert.match(app,/escText\('span','AIS upstream source credits:/);
 assert.match(app,/https:\/\/openwaters\.io\/ais\//);
 assert.equal(report.vessels[0].source,'same-site AIS');
});

test('near-park signal reports only actual recent AIS, with labeled straight-line distance',()=>{
 const park=parks.spots.find(x=>x.id==='scranton');
 const live=core.classifyLive({ok:true,checkedAt:'2026-11-22T13:59:59Z',vessels:[
  {...v('2026-11-22T13:58:00Z',park.lat,park.lon),mmsi:'367111222',name:'AT PARK REFERENCE'},
  {...v('2026-11-22T13:59:30Z',41.49,-81.697),mmsi:'367222333',name:'SECOND REPORT'},
  {...v('2026-11-22T13:22:00Z',41.49,-81.697),mmsi:'367333444',name:'TOO OLD'}
 ]},now);
 const nearby=core.parkObservation(park,live,now);
 assert.equal(nearby.status,'OBSERVED_NEAR_GENERAL_PARK_REFERENCE');
 assert.equal(nearby.closest.vessel.name,'AT PARK REFERENCE');
 assert.ok(nearby.closest.straightLineMiles<.01);
 assert.equal(nearby.closest.reportedMotion,'MOVING_AT_REPORTED_SPEED');
 assert.ok(nearby.nearby.length>=2);
 assert.match(nearby.note,/cannot establish a ship is visible or approaching/);
 assert.equal(core.reportedMotion({...live.vessels[0],speedKnots:.1}),'LOW_REPORTED_SPEED');
 assert.equal(core.reportedMotion({...live.vessels[0],speedKnots:null}),'SPEED_NOT_REPORTED');
 assert.equal(core.straightLineMiles(park,park),0);
 assert.equal(core.straightLineMiles(park,{lat:0,lon:0}),null);
});
test('stale, empty and distant source must not become a sighting',()=>{
 const park=parks.spots.find(x=>x.id==='rivergate');
 const down=core.parkObservation(park,{state:'UNAVAILABLE',vessels:[]},now);
 assert.equal(down.closest,null);
 assert.equal(down.status,'UNAVAILABLE');
 const far=core.classifyLive({ok:true,checkedAt:'2026-11-22T13:59:59Z',
  vessels:[v('2026-11-22T13:59:00Z',41.53,-81.74)]},now);
 const observation=core.parkObservation(park,far,now);
 assert.equal(observation.status,'NO_FRESH_REPORT_NEAR_REFERENCE');
 assert.equal(observation.closest,null);
 assert.match(observation.note,/does not establish the river is empty/);
 assert.equal(core.parkObservation({...park,officialUrl:'http://fake.example'},far,now).status,'INVALID_PARK_REFERENCE');
});
test('historic park match points only to existing NOAA archive fix at nearest source observation',()=>{
 const data=JSON.parse(readFileSync('public/cuyahoga-freighter-watch/noaa-historical-2025.json','utf8'));
 for(const park of parks.spots){
  for(const voyage of data.voyages){
   const nearby=core.historicParkMatch(data,voyage.id,park);
   assert.ok(nearby.index>=0&&nearby.index<voyage.fixes.length);
   assert.equal(nearby.observedAt,voyage.fixes[nearby.index].seen);
   assert.equal(nearby.sourceKind,'NOAA_RECORDED_AIS_FIX_NOT_SIGHTLINE_OR_BRIDGE_PASSAGE');
   const all=voyage.fixes.map(f=>core.straightLineMiles(park,f));
   assert.ok(nearby.straightLineMiles<=Math.min(...all)+.0000001);
  }
 }
 assert.equal(core.historicParkMatch(data,'missing',parks.spots[0]),null);
 assert.equal(core.historicParkMatch(data,'barker-2025-07-07',{lat:0,lon:0}),null);
});
test('live vessel to public shore controls remain synchronized without predictive ETAs',()=>{
 assert.match(app,/function parkSignalLine\(/);
 assert.match(app,/function renderParkSignals\(/);
 assert.match(app,/core\.parkObservation\(/);
 assert.doesNotMatch(app,/core\.historicParkMatch\(|Jump to this recorded NOAA fix/);
 assert.match(app,/syncShipSelection\(/);
 assert.match(app,/Inspect this reported vessel/);
 assert.match(app,/if\(state\.selectedParkId\)choosePark/);
 assert.match(readFileSync('public/assets/cuyahoga-watch.css','utf8'),/\.park-signal/);
 assert.doesNotMatch(app,/estimated arrival|arrival in \d|time to bridge/i);
});

test('dated official Eagle Avenue removal notice stays a schedule, never an inferred current closure',()=>{
 const source=JSON.parse(readFileSync('data/cuyahoga/official-bridge-notices.json','utf8'));
 const publicCopy=JSON.parse(readFileSync('public/cuyahoga-freighter-watch/bridge-notices.json','utf8'));
 assert.deepEqual(publicCopy,source);
 assert.equal(source.notices.length,1);
 const notice=source.notices[0];
 assert.equal(notice.bridgeId,'eagle-280');
 assert.equal(notice.currentOpenOrClosedVerified,false);
 assert.equal(notice.actualCompletionVerified,false);
 assert.ok(notice.sourceUrl.includes('navcen.uscg.gov'));
 const before=core.bridgeNoticeContext(source,'eagle-280','2026-11-22');
 assert.equal(before.phase,'PLANNED_FUTURE_WINDOW');
 assert.match(before.message,/planned|schedules/i);
 assert.equal(before.liveStateKnown,false);
 assert.equal(before.visitorBridgeOpeningPredictionEnabled,false);
 const during=core.bridgeNoticeContext(source,'eagle-280','2027-02-03');
 assert.equal(during.phase,'WITHIN_PUBLISHED_WINDOW_NOT_LIVE_STATUS');
 assert.match(during.message,/does not confirm/);
 const after=core.bridgeNoticeContext(source,'eagle-280','2027-03-05');
 assert.equal(after.phase,'PAST_PUBLISHED_WINDOW');
 assert.match(after.message,/unverified/);
 assert.equal(core.bridgeNoticeContext(source,'center-st-139','2026-11-22'),null);
 assert.equal(core.bridgeNoticeContext(source,'eagle-280','not a date'),null);
 assert.equal(core.bridgeNoticeContext({...source,notices:[{...notice,actualCompletionVerified:true}]},'eagle-280','2027-02-03'),null);
});
test('map distinguishes Eagle work notice from NOAA bridge reference and fixed spans',()=>{
 assert.match(app,/bridgeNoticeContext\(state\.bridgeNotices/);
 assert.match(app,/function clevelandCalendarDay\(/);
 assert.match(app,/bridge-notices\.json/);
 assert.match(app,/NOAA Coast Pilot does not establish current bridge opening availability/);
 assert.match(app,/A fixed bridge does not lift for passing freighters/);
 assert.match(app,/Ohio DOT removal project/);
 assert.match(page,/Dated removal notice/);
 assert.match(css,/\.pin-work/);
});

test('every main NOAA bridge is keyboard-accessible without tapping tightly clustered map pins',()=>{
 const source=JSON.parse(readFileSync('public/cuyahoga-freighter-watch/bridges.json','utf8'));
 assert.equal(source.bridges.filter(b=>b.channel==='main').length,19);
 assert.match(page,/<details class="bridge-picker">/);
 assert.match(page,/<label for="bridge-select">/);
 assert.match(page,/<select id="bridge-select"/);
 assert.match(app,/function chooseBridge\(/);
 assert.match(app,/function plotBridges\(/);
 assert.match(app,/\$\('bridge-select'\)\.addEventListener\('change'/);
 assert.match(app,/state\.selectedBridgeId/);
 assert.match(app,/state\.selectedBridgeId=bridge\.id/);
 assert.match(app,/\$\('bridge-select'\)\.addEventListener/);
 assert.match(css,/\.bridge-picker/);
 assert.doesNotMatch(app,/window\.open\(|alert\(/);
});

test('AIS vessel illustrations reflect only reported category, size band and bounded course',()=>{
 const kinds=[
  {shipType:70,lengthMeters:242,course:90,kind:'cargo',widthClass:'large'},
  {shipType:83,lengthMeters:105,course:0,kind:'tanker',widthClass:'medium'},
  {shipType:31,lengthMeters:26,course:359.9,kind:'tug',widthClass:'small'},
  {shipType:63,lengthMeters:75,course:180,kind:'passenger',widthClass:'small'},
  {shipType:null,lengthMeters:null,course:null,kind:'unknown',widthClass:'not-reported'}
 ];
 for(const entry of kinds){
  const icon=core.vesselVisual(entry);
  assert.equal(icon.kind,entry.kind);
  assert.equal(icon.widthClass,entry.widthClass);
  assert.equal(icon.reportedCourseDegrees,entry.course);
  assert.equal(icon.actualHullGeometryKnown,false);
  assert.equal(icon.illustrationOnly,true);
 }
 assert.equal(core.vesselVisual({shipType:70,course:360}).reportedCourseDegrees,null);
 assert.equal(core.vesselVisual({shipType:70,course:'90'}).reportedCourseDegrees,null);
 assert.equal(core.vesselVisual({shipType:70,heading:265}).reportedHeadingDegrees,265);
 assert.equal(core.vesselVisual({shipType:70,heading:511}).reportedHeadingDegrees,null);
 assert.equal(core.vesselVisual({shipType:70,heading:0}).reportedHeadingDegrees,0);
 const live=core.classifyLive({ok:true,checkedAt:'2026-11-22T13:59:59Z',vessels:[
  {...v('2026-11-22T13:59:00Z'),course:190,heading:205}
 ]},now);
 assert.equal(live.vessels[0].course,190);
 assert.equal(live.vessels[0].heading,205);
 assert.match(app,/function liveVesselIcon\(/);
 assert.doesNotMatch(app,/icon:mapPointIcon\('ship'\)/);
 assert.match(app,/icon:liveVesselIcon\(v\)/);
 assert.match(css,/\.cuyahoga-ship-marker/);
 assert.match(page,/Hull shapes illustrate reported AIS type/);
 assert.ok(page.indexOf('id="live-controls"')<page.indexOf('class="panel places"'),'Reported vessels must appear before park directory');
 assert.match(page,/id="show-ships-on-map"/);
 assert.match(page,/id="show-parks-on-map"/);
 assert.match(app,/function revealMobileFocus\(/);
 assert.match(page,/Unoriented vessel outline/);
 assert.match(app,/function markerHasTravelCourse\(/);
 assert.match(app,/v\.speedKnots>0\.5/);
 assert.match(app,/function markerBearing\(/);
 assert.match(app,/reportedHeadingDegrees/);
 assert.match(app,/const symmetric='M10 7Q3 16 10 25L62 25Q69 16 62 7Z'/);
 assert.doesNotMatch(app,/ship-neutral-ring/);
 assert.match(app,/frameMap\('all'\)/);
 assert.match(app,/frameMap\('ships'\)/);
 assert.match(app,/bindTooltip\(escText\('span'/);
 assert.match(app,/M6 9L50 4Q61 4 69 16Q61 28 50 28L6 23Q3 16 6 9Z/);
 assert.doesNotMatch(app,/M3 17H59L69 12/);
 assert.match(css,/\.is-active-vessel \.ship-hull/);
});

test('first map screen favors four active reference landmarks plus Eagle work notice; full catalogue is opt-in',()=>{
 const data=JSON.parse(readFileSync('public/cuyahoga-freighter-watch/bridges.json','utf8'));
 const mainIds=new Set(data.bridges.filter(b=>b.channel==='main').map(b=>b.id));
 const featured=['center-st-139','columbus-193','carter-243','west-third-369','eagle-280'];
 assert.equal(new Set(featured).size,5);
 assert.ok(featured.every(id=>mainIds.has(id)));
 assert.equal(mainIds.size,19);
 assert.match(app,/featuredBridgeIds=new Set\(\[/);
 assert.match(app,/function renderBridgeMarkers\(/);
 assert.match(app,/!showAll&&!featuredBridgeIds\.has\(bridge\.id\)/);
 assert.match(app,/\$\('show-all-bridges'\)\.addEventListener\('change',renderBridgeMarkers\)/);
 assert.match(page,/id="show-all-bridges"/);
 assert.match(page,/Showing all 19 charted crossings|Show all 19 charted crossings/);
 assert.match(css,/\.bridge-toggle/);
});

test('river desk redesign puts public shore decisions and map before expanded technical evidence',()=>{
 const mapAt=page.indexOf('id="cuyahoga-map"');
 const parksAt=page.indexOf('id="place-buttons"');
 const reportAt=page.indexOf('id="live-vessels"');
 const storyAt=page.indexOf('class="story"');
 const sourceAt=page.indexOf('class="sources"');
 assert.ok(mapAt>0&&parksAt>mapAt&&reportAt>parksAt&&storyAt>reportAt&&sourceAt>storyAt);
 assert.match(page,/<section class="workbench" id="river-workbench"/);
 assert.match(page,/data-park="scranton"/);
 assert.match(page,/data-park="rivergate"/);
 assert.match(page,/data-park="heritage"/);
 assert.match(page,/data-park="wendy"/);
 assert.match(page,/<details class="map-caveat">/);
 assert.match(page,/<details class="report-method">/);
 assert.match(page,/<details class="sources">/);
 assert.match(app,/choosePark\('scranton',false\)/);
 assert.match(css,/#cuyahoga-map\{[^}]*height:clamp/);
 assert.match(css,/\.map-layout\{[^}]*grid-template-rows/);
 assert.doesNotMatch(page,/<script[^>]+src="https:\/\/.*(?:react|jquery|gsap|vue)/i);
});
test('historic Sam Laud photo is verified exact-subject and properly attributed',()=>{
 assert.match(page,/class="story-photo"/);
 assert.match(page,/src="\/assets\/cuyahoga-sam-laud-roy-luck\.jpg"/);
 assert.match(page,/https:\/\/commons\.wikimedia\.org\/wiki\/File:The_Cuyahoga_River_and_Cleveland_OH\.jpg/);
 assert.match(page,/alt="The freighter Sam Laud passing downtown Cleveland/);
 assert.match(page,/Roy Luck/);
 assert.match(page,/https:\/\/creativecommons\.org\/licenses\/by\/2\.0\//);
 assert.match(page,/Historical photograph, not a live view/);
 assert.match(page,/loading="lazy"/);
 assert.match(page,/decoding="async"/);
});
test('optional bridge geography cannot obscure the default current AIS and public parks',()=>{
 assert.match(page,/data-bridge-legend hidden/);
 assert.match(app,/const bridgePickerOpen=document\.querySelector\('\.bridge-picker'\)\?\.open===true/);
 assert.match(app,/if\(!bridgePickerOpen&&!state\.selectedBridgeId\)/);
 assert.match(app,/\.addEventListener\('toggle',renderBridgeMarkers\)/);
 assert.match(app,/zIndexOffset:1000/);
 assert.match(page,/Show all 19 charted crossings/);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
});

test('licensed historical photo contains a complete JPEG frame, not a truncated CDN fragment',()=>{
 const image=readFileSync('public/assets/cuyahoga-sam-laud-roy-luck.jpg');
 assert.ok(image.length>30000&&image.length<250000,'Reasonable self-hosted historical photo size');
 assert.equal(image[0],0xff);
 assert.equal(image[1],0xd8);
 assert.equal(image[image.length-2],0xff);
 assert.equal(image[image.length-1],0xd9);
 assert.match(page,/src="\/assets\/cuyahoga-sam-laud-roy-luck\.jpg"/);
 assert.match(page,/Roy Luck/);
 assert.match(page,/creativecommons\.org\/licenses\/by\/2\.0/);
});

test('sourced river-bend teaching model is optional and never passes itself off as AIS',()=>{
 const html=readFileSync('public/cuyahoga-freighter-watch/index.html','utf8');
 const demo=readFileSync('public/assets/cuyahoga-bend-demo.js','utf8');
 const styles=readFileSync('public/assets/cuyahoga-bend-demo.css','utf8');
 assert.match(html,/id="bend-lab"/);
 assert.match(html,/id="bend-diagram"/);
 assert.match(html,/id="bend-guide"/);
 assert.match(html,/id="bend-position"[^>]*disabled/);
 assert.match(html,/data-bend-step="0"[^>]*disabled/);
 assert.match(html,/id="bend-play"[^>]*disabled/);
 assert.match(html,/Illustration, not vessel tracking/);
 assert.match(html,/not NOAA AIS replay/);
 assert.match(html,/https:\/\/www\.portofcleveland\.com\/tourism-recreation\/tools\/safety-guidelines\//);
 assert.match(html,/\/assets\/cuyahoga-bend-demo\.js/);
 assert.match(html,/\/assets\/cuyahoga-bend-demo\.css/);
 assert.match(demo,/getPointAtLength/);
 assert.match(demo,/prefers-reduced-motion: reduce/);
 assert.match(demo,/document\.hidden/);
 assert.match(demo,/cancelAnimationFrame/);
 assert.match(demo,/setAttribute\('aria-pressed'/);
 assert.match(styles,/@media\(max-width:680px\)/);
 assert.match(styles,/\.bend-lab\{grid-column:1/);
 assert.doesNotMatch(demo,/fetch\(|\/api\/|getUserMedia|geolocation|AIS endpoint/);
});
