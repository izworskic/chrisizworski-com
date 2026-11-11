'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {buildWallopsViewing,safePad,geometry,typeOf,PLACES,PROFILES}=require('../lib/wallops-viewing');
const {analyzeSchedule,safeText}=require('../api/wallops-official')._test;
const {REGIONS}=require('../lib/rocket-launch-usa');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('public/wallops-rocket-launch-viewing/places.json'));
const national=read('public/synced-national-tools/rocket-launch-live/index.html');
const page=read('public/wallops-rocket-launch-viewing/index.html');
const app=read('public/wallops-rocket-launch-viewing/app.js');
const local=REGIONS.find(x=>x.id==='virginia');
const A={id:'11111111-1111-4111-8111-111111111111',region:'virginia',lat:37.835,lon:-75.484,
  locationId:21,name:'Fixture Sounding Mission A',rocket:'Black Brant IX',pad:'Research pad',
  net:'2026-11-14T11:00:00Z',netPrecision:'minute'};
test('NASA public visitor GPS and town site reference manifest cannot silently drift',()=>{
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.sourceOfTruth,'lib/wallops-viewing.js');
 assert.equal(manifest.sites.length,3);
 assert.deepEqual(manifest.sites.map(x=>x.id),PLACES.map(x=>x.id));
 for(const p of PLACES){
  const published=manifest.sites.find(x=>x.id===p.id);
  assert.ok(published,p.id);
  for(const field of ['lat','lon','name','kind','coordinateRole','geographicSource','accessSource','navigation','scene'])
   assert.deepEqual(published[field],p[field],p.id+' '+field);
  assert.ok(p.lat>37.7&&p.lat<38.1&&p.lon> -75.8&&p.lon< -75.25);
  assert.match(p.geographicSource,/^https:\/\//);
 }
 assert.deepEqual([PLACES[0].lat,PLACES[0].lon],[37.9393167,-75.4566333]);
 assert.match(PLACES[0].coordinateRole,/NOT a surveyed launch-viewing lawn/);
 assert.match(PLACES[1].coordinateRole,/NOT park entrance or parking/);
 assert.match(PLACES[2].coordinateRole,/NOT a marked launch viewing platform/);
});
test('official NASA events remain separate from LL2 national schedule and public geography',()=>{
 const d=buildWallopsViewing(A,[],Date.parse('2026-11-03T17:00:00Z'));
 assert.equal(d.missionId,A.id);
 assert.equal(d.sites.length,3);
 assert.equal(d.pad.name,'Research pad');
 assert.equal(d.pad.coordinateRole,'source-reported-restricted-LL2-pad-not-public-navigation');
 assert.equal(d.official.visitorViewingStatus,'mission-event-unverified');
 assert.equal(d.official.nonNasaRangeActivity,'not-exhaustively-represented-in-ll2');
 assert.equal(d.official.nextPublicMission,'not-verified-by-this-geographic-module');
 assert.ok(d.sites.every(x=>x.accessState==='not-live-verified'&&!x.parkingVerified));
 assert.equal(d.sites[0].viewingPermission,'not-announced-for-selected-mission');
 assert.equal(d.geojson.features.length,4);
 assert.equal(d.geojson.features[3].properties.role,'source-reported-restricted-LL2-pad-not-public-navigation');
 assert.match(d.accessCautions.join(' '),/Route 175/);
});
test('unknown pad, foreign or out-of-range pad never gets a bearing or marker',()=>{
 for(const p of [
  {...A,region:'texas'}, {...A,lat:0,lon:0}, {...A,lat:null,lon:null},
  {...A,lat:37.91,lon:-77},null
 ]){
  assert.equal(safePad(p),null);
  const d=buildWallopsViewing(p);
  assert.equal(d.pad,null);
  assert.equal(d.geojson.features.length,3);
  assert.ok(d.sites.every(x=>x.geometry===null));
 }
 const d=buildWallopsViewing();
 assert.equal(d.missionType.code,'none');
 assert.equal(d.missionId,null);
 assert.match(d.missionType.summary,/does not disprove/);
});
test('pad geometry is straight-line from public place reference, not road or trajectory',()=>{
 const d=buildWallopsViewing(A);
 for(const p of d.sites){
  const g=p.geometry;assert.ok(g.miles>0&&g.miles<40);
  assert.ok(g.bearingDegrees>=0&&g.bearingDegrees<360);
  assert.ok(g.bearingCardinal);
  assert.deepEqual(g,geometry(p,d.pad));
 }
 assert.match(d.spectatorSkyNote,/NOT NASA launch weather/);
 assert.deepEqual(Object.keys(PROFILES).sort(),['backup','first','photo','science']);
});
test('sounding rockets, HASTE, orbital rockets and unknown types remain distinct',()=>{
 assert.equal(typeOf(A).code,'sounding');
 assert.equal(typeOf({...A,rocket:'Terrier-Improved Malemute'}).code,'sounding');
 assert.equal(typeOf({...A,rocket:'HASTE'}).code,'suborbital');
 assert.equal(typeOf({...A,rocket:'Electron'}).code,'orbital');
 assert.equal(typeOf({...A,rocket:'Unnamed rocket'}).code,'unclassified');
 assert.match(typeOf({...A,rocket:'HASTE'}).summary,/not automatically a NASA sounding/);
});
test('NASA public empty schedule must NOT be reported as no range activity',()=>{
 const html='<html><body><h1>Wallops Launch Schedule</h1><h2>No public launches on the schedule at this time</h2><a>Wallops Range Blog</a></body></html>';
 const x=analyzeSchedule(html);
 assert.equal(x.status,'no-public-listed');
 assert.match(x.summary,/does not rule out non-NASA/);
 assert.equal(analyzeSchedule('<html>Wallops some past launch</html>').status,'source-checked');
 assert.equal(analyzeSchedule('<html>unrelated page</html>').status,'unverified');
 assert.equal(analyzeSchedule('<script>No public launches on the schedule at this time</script><h1>Wallops</h1>').status,'source-checked');
 assert.ok(!safeText('<style>some fake open visitor event</style><h2>Wallops</h2>').includes('some fake'));
});
test('route connects one Virginia specialist to central national mission IDs',()=>{
 assert.equal(local.specialist,'/wallops-rocket-launch-viewing/');
 assert.deepEqual(local.ids,[21]);
 assert.ok(local.sites.some(s=>s.id==='wallops-visitor'));
 const api=read('api/rocket-launch-usa.js');
 assert.match(api,/wallopsViewing:region\.id==='virginia'/);
 assert.match(api,/buildWallopsViewing\(selected,weather,now\)/);
 const nationalJs=read('public/synced-national-tools/rocket-launch-live/app.js');
 assert.match(nationalJs,/url\.startsWith\('\/wallops-rocket-launch-viewing\/'\)\?'virginia'/);
 assert.match(nationalJs,/Wallops viewing spots for this launch/);
 assert.match(national,/id="rl-nav-wallops"/);
 assert.match(app,/URLSearchParams\(\{region:'virginia'\}\)/);
 assert.match(app,/launchId/);
});
test('published Wallops page has one canonical, static source links and no launch promise',()=>{
 assert.equal((page.match(/rel="canonical"/g)||[]).length,1);
 assert.match(page,/https:\/\/chrisizworski\.com\/wallops-rocket-launch-viewing\//);
 assert.match(page,/Times can change/);
 assert.match(page,/No launch listed\? Wallops may still be busy/);
 assert.match(page,/data-place="nasa-visitor"/);
 assert.match(page,/data-place="reed"/);
 assert.match(page,/data-place="harbor"/);
 assert.match(page,/id="w-mission-select" disabled/);
 assert.match(page,/Don.t stop on Route 175/);
 assert.match(page,/Assateague can close for a launch/);
 assert.match(page,/not a current or actual launch photo/);
 assert.match(page,/Built by Chris Izworski/);
 const guides=read('public/guides/index.html');
 assert.match(guides,/data-field-guide="wallops-rocket-viewing"/);
 const map=read('public/sitemap.xml');
 assert.equal(map.split('https://chrisizworski.com/wallops-rocket-launch-viewing/').length-1,1);
 assert.match(map,/wallops-rocket-launch-viewing\/[^<]*<\/loc>\s*<lastmod>2026-11-10<\/lastmod>/);
});
