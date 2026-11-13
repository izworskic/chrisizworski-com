'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const {SITES,CLOSED}=require('../lib/vandenberg-viewing');
const data=JSON.parse(read('public/vandenberg-rocket-launch-viewing/places.json'));
const page=read('public/vandenberg-rocket-launch-viewing/index.html');
const script=read('public/vandenberg-rocket-launch-viewing/guide-map.js');
const css=read('public/vandenberg-rocket-launch-viewing/styles.css');
const tracker=read('public/vandenberg-rocket-launch-viewing/guide.js');

test('the six guide map pins are generated from the exact source used by the mission-specific planner',()=>{
  assert.equal(data.schemaVersion,1);
  assert.equal(data.sourceOfTruth,'lib/vandenberg-viewing.js');
  assert.equal(data.places.length,6);
  assert.deepEqual(data.places.map(p=>p.id),SITES.map(s=>s.id));
  for(const place of data.places){
    const model=SITES.find(s=>s.id===place.id);
    for(const field of ['name','lat','lon','kind','pinLabel','scene','accessNote','osm','source','accessSource'])
      assert.deepEqual(place[field],model[field],field+' must match live viewing planner: '+place.id);
    assert.ok(place.articleAnchor&&page.includes('id="'+place.articleAnchor+'"'));
    assert.ok(place.lat>34.55&&place.lat<34.8&&place.lon>-120.7&&place.lon< -120.35);
  }
  assert.ok(CLOSED.length>=4);
  for(const blocked of CLOSED)assert.ok(!data.places.some(p=>p.name===blocked),
    'Closed viewing area must not be a map pin: '+blocked);
  assert.match(data.geometryDisclosure,/NOT parking entrances/);
});

test('the map exporter detects any drift between the guide and the living viewing inventory',()=>{
  const run=spawnSync(process.execPath,
    ['scripts/export-vandenberg-guide-map.js','--check'],
    {cwd:root,encoding:'utf8',timeout:15000});
  assert.equal(run.status,0,run.stderr||run.error?.message||'map mismatch');
  assert.match(run.stdout,/PASS: guide map manifest matches all six/);
});

test('the map is embedded immediately after the first answer, not buried below the guide or an outbound link',()=>{
  const pos=page.indexOf('id="viewing-map"');
  assert.ok(pos>page.indexOf('class="vg-quick"'));
  assert.ok(pos<page.indexOf('id="choose"'));
  assert.ok(pos<page.indexOf('id="where-to-watch"'));
  assert.match(page,/<div id="vg-viewing-map" class="vg-viewing-map" role="region" tabindex="0"/);
  assert.match(page,/id="vg-map-places"/);
  assert.match(page,/id="vg-map-selection"/);
  assert.match(page,/id="vg-map-filters"/);
  assert.match(page,/aria-label="Map legend"/);
  assert.match(page,/href="#viewing-map">Viewing map<\/a>/);
  assert.ok(page.includes('href="/national-tools/rocket-launch-live/?region=california#rl-vandenberg"'));
  assert.match(page,/Map data attribution/);
  assert.match(page,/not<\/em> official parking entrances/);
});

test('the map uses actual Leaflet pins, stable CARTO/OSM tiles, click selection, and accessible focus',()=>{
  assert.match(page,/leaflet@1\.9\.4\/dist\/leaflet\.css/);
  assert.match(page,/leaflet@1\.9\.4\/dist\/leaflet\.js/);
  assert.match(page,/guide-map\.js\?v=20261113-rust-v2/);
  assert.match(script,/window\.L\.map\(root/);
  assert.match(script,/window\.L\.marker\(\[p\.lat,p\.lon\]/);
  assert.match(script,/window\.L\.divIcon/);
  assert.match(script,/marker\.on\('click'/);
  assert.match(script,/keyboard:true/);
  assert.match(script,/buttons\.querySelectorAll\('button\[data-map-filter\]'\)/);
  assert.match(script,/aria-pressed/);
  assert.match(script,/fetch\('\/api\/carto-basemap-config'/);
  assert.match(script,/https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(script,/https:\/\/\{s\}\.basemaps\.cartocdn\.com\/rastertiles\/voyager/);
  assert.match(script,/root\.dataset\.tiles='carto-keyed'/);
  assert.match(script,/root\.dataset\.tiles='osm-fallback'/);
  assert.match(script,/places\.json/);
  assert.match(script,/document\.createElement/);
  assert.doesNotMatch(script,/\.innerHTML\s*=/);
});

test('map popups expose detailed guide sections, original venue evidence and access restrictions',()=>{
  assert.match(script,/Read what to expect here/);
  assert.match(script,/place\.articleAnchor/);
  assert.match(script,/sceneLabel\(place\)/);
  assert.match(script,/place\.accessNote/);
  assert.match(script,/place\.source/);
  assert.match(script,/place\.accessSource/);
  assert.match(script,/Check Space Force beach rules/);
  assert.match(script,/Check campus parking rules/);
  assert.match(page,/Surf Beach may close for launches/);
  assert.match(page,/Harris Grade Road/);
  assert.match(page,/Highway 246/);
  assert.doesNotMatch(script,/google\.com\/maps\/dir|directions\?/i,
    'Never route visitors toward uncertain parking entrances.');
});

test('the map remains non-blocking and safe when Leaflet, CARTO tiles or manifest cannot load',()=>{
  assert.match(page,/The interactive map requires JavaScript/);
  assert.match(page,/href="#surf-beach"/);
  assert.match(page,/href="#city-parks"/);
  assert.match(script,/if\(!window\.L\)/);
  assert.match(script,/if\(!checkManifest\(payload\)\)/);
  assert.match(script,/The map isn.t loading/);
  assert.match(script,/!response\.ok/);
  assert.doesNotMatch(script,/api\/rocket-launch-usa|api\.weather\.gov|ll\.thespacedevs|navigator\.geolocation|localStorage|sessionStorage|flightPath|trajectoryPoints/);
});

test('mobile map, selected-place cards and controls are intentionally designed rather than hidden',()=>{
  assert.match(css,/\.vg-map-layout\{display:grid/);
  assert.match(css,/\.vg-viewing-map\{position:relative;height:565px/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/\.vg-viewing-map\{height:340px\}/);
  assert.match(css,/@media\(max-width:440px\)/);
  assert.match(css,/\.vg-map-icon-coast span\{background:/);
  assert.match(css,/\.vg-map-pin-selected span/);
  assert.match(css,/\.vg-map-place:focus-visible/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('GA4 measures only public place selection and map-to-planner actions, never visitor location',()=>{
  assert.match(tracker,/'nav','hero','decision','weather','check-schedule','bottom','map'/);
  assert.match(tracker,/vandenberg_guide_map_site_select/);
  assert.match(tracker,/ALLOWED_PLACES/);
  assert.match(tracker,/vandenberg_guide_planner_open/);
  assert.match(script,/new CustomEvent\('vandenberg-guide:site-select'/);
  assert.doesNotMatch(tracker,/getCurrentPosition|navigator\.geolocation|userLatitude|userLongitude|localStorage|sessionStorage/);
});
