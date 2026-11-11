'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const model=require('../lib/starbase-viewing');
const site=JSON.parse(read('public/starbase-rocket-launch-viewing/places.json'));
const html=read('public/starbase-rocket-launch-viewing/index.html');
const js=read('public/starbase-rocket-launch-viewing/app.js');
const css=read('public/starbase-rocket-launch-viewing/styles.css');
const nationalHtml=read('public/synced-national-tools/rocket-launch-live/index.html');
const nationalJs=read('public/synced-national-tools/rocket-launch-live/app.js');

test('map manifest is a complete build-checked projection of the research model',()=>{
 assert.equal(site.schemaVersion,1);
 assert.equal(site.sourceOfTruth,'lib/starbase-viewing.js');
 assert.equal(site.sites.length,3);
 assert.deepEqual(site.sites.map(x=>x.id),model.SITES.map(x=>x.id));
 for(const place of site.sites){
  const original=model.SITES.find(x=>x.id===place.id);
  for(const field of ['lat','lon','coordinateRole','geographicSource','accessSource','viewingSource','accessNote','scene','tradeoff','profiles'])
   assert.deepEqual(place[field],original[field],place.id+' : '+field);
  assert.ok(place.lat>25.8&&place.lat<26.2);
  assert.ok(place.lon< -97&&place.lon> -97.5);
  assert.match(html,new RegExp('id="'+place.id+'"'));
 }
 const run=spawnSync(process.execPath,['scripts/export-starbase-places.js','--check'],{cwd:root,encoding:'utf8',timeout:12000});
 assert.equal(run.status,0,run.stderr||run.error?.message||'Manifest drift');
 assert.match(run.stdout,/PASS: Starbase public map references match source inventory/);
});
test('land-manager and NOAA coastal geography are real places, not pad or parking gates',()=>{
 const [isla,zapata,lighthouse]=site.sites;
 assert.deepEqual([isla.lat,isla.lon],[26.071745,-97.160249]);
 assert.deepEqual([zapata.lat,zapata.lon],[26.00181,-97.29856]);
 assert.match(zapata.geographicSource,/tidesandcurrents\.noaa\.gov\/benchmarks\/8779911/);
 assert.match(isla.geographicSource,/topoquest\.com/);
 assert.match(lighthouse.accessSource,/atlas\.thc\.texas\.gov/);
 for(const place of site.sites)assert.match(place.coordinateRole,/not |NOT |—/);
 assert.match(site.geometryDisclosure,/NOT verified entrance/);
});
test('pad is shown only with Texas mission-source GPS, never inferred from facility or image',()=>{
 const noPad={region:'texas',pad:'Starbase'};
 assert.equal(model.safePad(noPad),null);
 assert.equal(model.safePad({region:'california',lat:26,lon:-97.15}),null);
 assert.equal(model.safePad({region:'texas',lat:0,lon:0}),null);
 assert.equal(model.safePad({region:'texas',lat:26.1,lon:-97.15,pad:'Test'}).name,'Test');
 const launch={region:'texas',lat:25.998,lon:-97.155,pad:'Starship'};
 const pad=model.safePad(launch);
 assert.ok(pad);
 const distance=model.haversineMiles(isolate(site.sites[0]),pad);
 assert.ok(distance>4&&distance<7);
 const bearing=model.bearingDegrees(site.sites[0],pad);
 assert.ok(bearing>=0&&bearing<360);
});
function isolate(x){return {lat:x.lat,lon:x.lon}}
test('no city beach-open declaration can authorize launch operations or override stale unknown',()=>{
 const now=Date.parse('2026-11-03T18:00:00Z');
 const fresh={state:'open-general',checkedAt:'2026-11-03T17:30:00Z'};
 const open=model.noticeVerdict(fresh,now);
 assert.equal(open.state,'general-open');
 assert.match(open.detail,/NOT an authorized launch viewing/);
 const closed=model.noticeVerdict({...fresh,state:'closed'},now);
 assert.equal(closed.state,'closed');
 assert.match(closed.detail,/Do not try/);
 assert.equal(model.noticeVerdict({...fresh,checkedAt:'2026-11-03T16:10:00Z'},now).state,'unknown');
 assert.equal(model.noticeVerdict({state:'open-general',checkedAt:null},now).state,'unknown');
 assert.equal(model.noticeVerdict({...fresh,checkedAt:'2026-11-04T17:30:00Z'},now).state,'unknown');
});
test('personas change ranked advice without claiming a public opening or sightline',()=>{
 assert.equal(model.viewOptions('first-time')[0].id,'isla-blanca');
 assert.equal(model.viewOptions('no-causeway')[0].id,'zapata');
 assert.equal(model.viewOptions('history')[0].id,'lighthouse');
 for(const opt of model.viewOptions('history')){
  assert.equal(opt.status,'published-place-not-live-opening');
  assert.match(opt.caveat,/No site/);
  assert.equal(opt.padDistanceMiles,null);
 }
 const given=model.buildStarbaseViewing(
  {id:'test-uuid',region:'texas',lat:25.998,lon:-97.155,pad:'Test Starship'},
  {state:'closed',checkedAt:'2026-11-03T17:30:00Z'},null,Date.parse('2026-11-03T18:00:00Z')
 );
 assert.equal(given.accessNotice.state,'closed');
 assert.ok(given.sites.every(s=>s.padDistanceMiles>0));
 assert.ok(given.sites.every(s=>s.padBearingDegrees>=0));
 assert.match(given.safety,/never navigable/);
});
test('search intent and safety are present in static HTML with no script, without duplicate canonical',()=>{
 const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const body=visible.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
 assert.ok(body.length>12000);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
 assert.match(html,/href="https:\/\/chrisizworski\.com\/starbase-rocket-launch-viewing\/"/);
 assert.match(body,/Don't drive toward the launch pad/);
 assert.equal((body.match(/class="sb-place-card"/g)||[]).length,3);
 assert.match(body,/Boca Chica Beach/);
 assert.match(body,/Starbase's authoritative beach and road notice/);
 assert.match(body,/NOAA San Martin Lake Channel benchmark/);
 assert.match(body,/CC BY 2.0/);
 assert.match(body,/SpaceX_IFT-5_Launch/);
 assert.match(body,/id="sb-map"/);
 assert.match(body,/id="sb-mission-picker" disabled/);
 assert.match(body,/id="sb-map-status"/);
 assert.match(body,/data-site-select="isla-blanca"/);
});
test('map and mission selection are wired, fail closed, and share launch UUID with national hub',()=>{
 assert.match(js,/state\.request/);
 assert.match(js,/loadPlaces\(\);loadMission/);
 assert.match(js,/state\.data\?\.starbaseViewing\?\.pad/);
 assert.match(js,/if\(state\.map\)displayPad\(\)/);
 assert.match(js,/data\.starbaseViewing\?\.accessNotice/);
 assert.match(js,/if\(response\.status===404&&id&&!fromExpired\)/);
 assert.match(js,/tile\.on\('tileerror'/);
 assert.match(js,/osm\.on\('tileerror'/);
 assert.match(js,/history\.replaceState/);
 assert.match(js,/Three possible viewing areas are on the map/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(nationalJs,/starbase-rocket-launch-viewing/);
 assert.match(nationalJs,/floridaSpecialistLink\(r\.specialist\)/);
 assert.match(nationalHtml,/id="rl-nav-starbase"/);
 assert.match(nationalHtml,/starbase-rocket-launch-viewing/);
 assert.match(read('lib/rocket-launch-usa.js'),/specialist: '\/starbase-rocket-launch-viewing\/'/);
 assert.match(read('api/rocket-launch-usa.js'),/starbaseViewing:region\.id==='texas'/);
});
test('the new guide is discoverable exactly once in the main sitemap and guides directory',()=>{
 const sitemap=read('public/sitemap.xml');
 const canonical='https://chrisizworski.com/starbase-rocket-launch-viewing/';
 const found=sitemap.match(new RegExp(canonical.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&'),'g'))||[];
 assert.equal(found.length,1);
 assert.match(read('public/guides/index.html'),/data-field-guide="starbase-rocket-viewing"/);
 assert.match(read('public/guides/index.html'),/Where to Watch Starship: Starbase Texas Viewing Atlas/);
 assert.doesNotMatch(html,/https:\/\/chrisizworski\.com\/national-tools\/rocket-launch-live\/"><meta name="robots"/);
});
