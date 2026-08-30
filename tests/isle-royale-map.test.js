const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/isle-royale-map/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/isle-royale.js'), 'utf8');
const routeWeatherApi = fs.readFileSync(path.join(root, 'api/isle-royale-route-weather.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/catalog.json'), 'utf8'));
const deepManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/deep-layer-manifest.json'), 'utf8'));
const contextManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/context-layer-manifest.json'), 'utf8'));
const contextBuilder = fs.readFileSync(path.join(root, 'scripts/build-isle-royale-context-layers.py'), 'utf8');
const waterIntelJs = fs.readFileSync(path.join(root, 'public/assets/isle-royale-water-intelligence.js'), 'utf8');
const waterIntelApi = fs.readFileSync(path.join(root, 'api/isle-royale-water-intelligence.js'), 'utf8');
const isleBenchmark = fs.readFileSync(path.join(root, 'scripts/benchmark-isle-royale-map.mjs'), 'utf8');
const circleTour = fs.readFileSync(path.join(root, 'public/lake-superior-circle-tour/index.html'), 'utf8');
const upNorth = fs.readFileSync(path.join(root, 'public/up-north-michigan/index.html'), 'utf8');
const deepWorkflow = fs.readFileSync(path.join(root, '.github/workflows/isle-royale-deep-data.yml'), 'utf8');
const contextWorkflow = fs.readFileSync(path.join(root, '.github/workflows/isle-royale-context-data.yml'), 'utf8');

function rendered(s) { return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'); }

test('canonical and Chris Izworski entity are present', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/isle-royale-map\/">/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"dateModified":"2026-08-30"/);
});

test('SERP strings fit repository limits', () => {
  const title = rendered(html.match(/<title>([^<]+)<\/title>/)[1]);
  const desc = rendered(html.match(/<meta name="description" content="([^"]+)">/)[1]);
  assert.ok(title.length <= 60, `title ${title.length}`);
  assert.ok(desc.length <= 158, `description ${desc.length}`);
});

test('public basemap is keyless and not restricted NPS map tiles', () => {
  assert.match(js, /tile\.openstreetmap\.org/);
  assert.doesNotMatch((html + js).toLowerCase(), /nps\.gov\/maps\/pmtiles/);
});

test('runtime supports source-backed web-map ingestion and fail-soft fallback', () => {
  assert.match(js, /75e3ceba038a45f7b4d5a9d7c6a46ccf/);
  assert.match(js, /57a5a514a8cd40f098b2f99029d118cf/);
  assert.match(js, /services1\.arcgis\.com\/XBhYkoXKJCRHbe7M\/arcgis\/rest\/services\/Isle_Royale_WFL1\/FeatureServer/);
  assert.match(js, /MAPLABEL/);
  assert.match(js, /TRLALTNAME/);
  assert.match(js, /loadFallbackAnchors/);
  assert.match(js, /loadArcGISService/);
});

test('catalog preserves original research families while retiring non-planning science layers', () => {
  const cats = catalog.items.map(x => x.npmapsCategory.toLowerCase()).join(' ');
  for (const term of ['current park map','regional map','rock harbor','windigo','camping','transportation','shipwreck','relief','lighthouse','geologic','vegetation','historical']) {
    assert.ok(cats.includes(term), `missing ${term}`);
  }
  for (const id of ['geology','vegetation-detailed','vegetation-simple','vegetation-change-1996-2017','horne-fire-2021']) {
    assert.ok(catalog.items.some(x => x.id === id && x.state === 'research-only'), id);
  }
  assert.ok(catalog.items.some(x => x.id === 'relief' && x.state === 'live-tile' && /U\.S\. Geological Survey/.test(x.publisher)));
  assert.ok(catalog.items.some(x => x.id === 'quiet-no-wake' && x.state === 'generated-runtime' && /22 official polygons/i.test(x.label)));
  assert.ok(catalog.items.some(x => x.id === 'shipwrecks' && x.state === 'live-api'));
  assert.doesNotMatch(html, /data-layer="vegetation-(?:overview|baseline|change)"/);
  assert.doesNotMatch(html, /data-layer="horne-fire"/);
});

test('planning, provenance, accessibility and safety hooks exist', () => {
  for (const id of ['feature-search','layer-filters','feature-list','map-status','park-live-status','source-catalog','route-planner']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /not a navigation chart/i);
  assert.match(html, /National Park Service/i);
  assert.match(html, /Official maps from the original research/);
  assert.match(html, /Rock Harbor map/);
  assert.match(html, /Windigo map/);
  assert.match(html, /Anchorage zones/);
  assert.match(html, /Off-trail camping zones/);
  assert.match(html, /Regional access \+ trail mileage/);
  assert.match(html, /Historic maps/);
  assert.match(js, /sourceStatus/);
  assert.match(js, /\/api\/isle-royale/);
  assert.match(js, /boater_campgrounds/);
  assert.match(js, /current_alerts/);
  assert.match(api, /National Park Service — Boat-In Campgrounds/);
  assert.match(api, /detectCurrentClosures/);
});

test('map points have large pointer tolerance and data-rich detail popups', () => {
  assert.match(js, /L\.canvas\(\{padding:\.5, tolerance:coarsePointer \? 14 : 9\}\)/);
  assert.match(js, /radius:category === 'campground' \? 7\.5 : 7/);
  assert.match(js, /collectFeatureFacts/);
  assert.match(js, /properties:\{\.\.\.props\}/);
  assert.match(js, /Related information/);
  assert.match(js, /Open this coordinate in OpenStreetMap/);
  assert.match(js, /NPS camping & campground guidance/);
  assert.match(js, /NPS hiking guidance/);
  assert.match(js, /NPS ferry, seaplane & transportation/);
  assert.match(js, /NPS lighthouses & places to go/);
  assert.match(js, /Open map-data source/);
  assert.match(html, /Tap any point to open its available attributes, coordinates, source links and related NPS planning information/);
  assert.match(html, /\.popup-action\{[^}]*min-height:42px/);
  assert.match(html, /\.isle-detail-popup \.leaflet-popup-content/);
});


test('OSM context behaves as a reversible layer rather than a permanently disabled one-shot button', () => {
  assert.match(html, /id="load-osm"[^>]*aria-pressed="false"[^>]*>Show OSM context/);
  assert.match(js, /const osmContextGroup = L\.layerGroup\(\)/);
  assert.match(js, /function setOsmContextVisible/);
  assert.match(js, /Hide OSM context/);
  assert.match(js, /Show OSM context/);
  assert.match(js, /targetGroup:osmContextGroup/);
  assert.match(js, /btn\.disabled = false/);
});

test('route builder turns geometry into a time-aware planning outcome', () => {
  for (const id of ['route-planner','route-mode-select','route-speed','route-departure','route-summary','route-weather-button','route-weather']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(html, /<h3>Plan a route<\/h3>/);
  assert.match(html, /ROUTE INTELLIGENCE/);
  assert.match(js, /function addRoutePoint/);
  assert.match(js, /function distanceMiles/);
  assert.match(js, /function bearingDegrees/);
  assert.match(js, /function routeForecastSamples/);
  assert.match(js, /function relativeWind/);
  assert.match(js, /Start route here/);
  assert.match(js, /isle_royale_route_weather/);
  assert.match(js, /\/api\/isle-royale-route-weather/);
});

test('route weather uses NWS marine grid data and Isle Royale NDBC wind stations', () => {
  assert.match(routeWeatherApi, /api\.weather\.gov/);
  assert.match(routeWeatherApi, /forecastGridData/);
  assert.match(routeWeatherApi, /waveHeight/);
  assert.match(routeWeatherApi, /wavePeriod/);
  assert.match(routeWeatherApi, /waveDirection/);
  assert.match(routeWeatherApi, /windSpeed/);
  assert.match(routeWeatherApi, /windDirection/);
  assert.match(routeWeatherApi, /PILM4/);
  assert.match(routeWeatherApi, /ROAM4/);
  assert.match(routeWeatherApi, /alerts\/active\?point=/);
  assert.match(routeWeatherApi, /planning sketches, not navigational routes/i);
});


test('live operations feed is fail-soft and never claims no alerts from a parser no-match', () => {
  assert.match(api, /Promise\.allSettled/);
  assert.match(api, /degraded:/);
  assert.match(js, /not a declaration that the park has no alerts/i);
  assert.match(js, /Verify current NPS conditions/i);
});


test('quiet/no-wake ETL is IRMA-first and fails closed on a stale regulatory set', () => {
  assert.match(contextBuilder, /irmaservices\.nps\.gov\/datastore\/v8\/rest/);
  assert.match(contextBuilder, /SavedCollection\/Profile/);
  assert.match(contextBuilder, /DigitalFiles/);
  assert.match(contextBuilder, /count != 22/);
  assert.match(contextBuilder, /quiet_count != 19/);
  assert.match(contextBuilder, /no_wake_count != 3/);
  assert.match(contextBuilder, /refusing to promote older\/mismatched geometry/);
});

test('water intelligence is a real coastline-aware planning layer, not a draggable-line benchmark shortcut', () => {
  assert.match(html, /id="route-day-hours"/);
  assert.match(html, /id="route-intelligence"/);
  assert.match(html, /isle-royale-water-intelligence\.js/);
  assert.match(js, /function resolveWaterRouteAsync/);
  assert.match(js, /Open-water exposure model/);
  assert.match(js, /NPS boating-zone check/);
  assert.match(js, /Nearby mapped refuge \/ stopping options/);
  assert.match(waterIntelJs, /function routeSegment/);
  assert.match(waterIntelJs, /crosses\(n,nn\)/);
  assert.match(waterIntelJs, /waterKeys/);
  assert.match(waterIntelJs, /outside-water routing component/);
  assert.match(waterIntelJs, /nearShore/);
  assert.match(waterIntelJs, /weatherSamples/);
  assert.match(waterIntelJs, /zonesAlongPath/);
  assert.match(waterIntelJs, /dayEnds/);
  assert.match(waterIntelApi, /natural"="coastline/);
  assert.match(waterIntelApi, /not a navigation chart/i);
  assert.match(isleBenchmark, /waterIntelligenceRuntime/);
  assert.match(isleBenchmark, /water intelligence runtime missing or reduced to a draggable straight-line sketch/);
});

test('marine forecast sampling grows with route distance rather than control-point count', () => {
  assert.match(js, /Math\.ceil\(total\/4\)\+1/);
  assert.doesNotMatch(js, /Math\.min\(max,Math\.max\(2,route\.points\.length\)\)/);
});

test('map-first route builder separates Explore from persistent Build mode and makes camps clickable trip stops', () => {
  assert.match(html, /id="explore-mode"[^>]*aria-pressed="true"[^>]*>Explore/);
  assert.match(html, /id="route-mode"[^>]*>Build route/);
  assert.match(html, /id="route-map-guide"/);
  assert.match(html, /id="route-stop-list"/);
  assert.match(html, /clicking a campground adds that campsite to the trip/i);
  assert.match(js, /function addFeatureToRoute/);
  assert.match(js, /route\.adding&&record\.latlng/);
  assert.match(js, /record\.category==='campground'&&record\.liveAlert/);
  assert.match(js, /sourceBackedBoatIn:Boolean\(record\?\.boater\)/);
  assert.match(js, /if\(!route\.adding\)return;/);
  assert.match(js, /function renderRouteStops/);
  assert.match(js, /routePoint\.kind==='campground'&&distanceMiles\(routePoint,point\)<\.08/);
  assert.match(js, /point\.sourceBackedBoatIn=Boolean\(match\.boater\)/);
  assert.match(js, /point\.liveAlert=Boolean\(match\.liveAlert\)/);
  assert.doesNotMatch(js, /route\.points\.length===2\)setRouteAdding\(false\)/);
  assert.doesNotMatch(js, /scrollIntoView\(\{behavior:'smooth'.*route-planner/);
});

test('trip persistence stays local/share-fragment based and GPX exports only resolved geometry', () => {
  assert.match(html, /id="route-save"/);
  assert.match(html, /id="route-restore"/);
  assert.match(html, /id="route-share"/);
  assert.match(html, /id="route-export-gpx"/);
  assert.match(html, /id="cockpit-save"/);
  assert.match(html, /id="cockpit-share"/);
  assert.match(html, /id="cockpit-gpx"/);
  assert.match(js, /TRIP_STORAGE_KEY='isle-royale-trip-v1'/);
  assert.match(js, /localStorage\.setItem\(TRIP_STORAGE_KEY/);
  assert.match(js, /url\.hash='trip='/);
  assert.match(js, /window\.history\.replaceState\(null,'',url\.toString\(\)\)/);
  assert.match(js, /window\.location\.hash\.startsWith\('#trip='\)/);
  assert.match(js, /sourceBackedBoatIn:false,liveAlert:false/);
  assert.match(js, /function exportRouteGpx/);
  assert.match(js, /application\/gpx\+xml/);
  assert.match(js, /temporary fallback sketches are not exported/);
  assert.match(js, /Planning export from Chris Izworski Isle Royale Map\. Not a navigation chart/);
  assert.match(js, /const gpxReady=route\.points\.length>=2/);
});

test('focus map becomes a real planning cockpit with shared controls and reversible edits', () => {
  assert.match(html, /id="planning-cockpit"/);
  assert.match(html, /id="cockpit-route-mode"/);
  assert.match(html, /id="cockpit-route-speed"/);
  assert.match(html, /id="cockpit-route-hours"/);
  assert.match(html, /id="cockpit-route-stops"/);
  assert.match(html, /id="cockpit-undo"/);
  assert.match(html, /id="cockpit-redo"/);
  assert.match(html, /id="route-redo"/);
  assert.match(js, /function captureRouteSnapshot/);
  assert.match(js, /function rememberRouteEdit/);
  assert.match(js, /function undoRouteEdit/);
  assert.match(js, /function redoRouteEdit/);
  assert.match(js, /function restoreRouteSnapshot/);
  assert.match(js, /renderRouteStopsInto\(els\.cockpitStops\)/);
  assert.match(js, /els\.cockpitMode\?\.addEventListener\('change'/);
  assert.match(js, /els\.cockpitWeather\?\.addEventListener\('click',analyzeRouteWeather\)/);
  assert.match(js, /rememberRouteEdit\(\);[\s\S]{0,120}route\.points\.splice/);
  assert.match(js, /rememberRouteEdit\(\);[\s\S]{0,120}route\.points\[index\]=/);
  assert.match(js, /rememberRouteEdit\(\);[\s\S]{0,120}route\.points\.reverse/);
  assert.match(js, /scenarioGenerated:true/);
  assert.match(js, /sourceBackedBoatIn:true/);
});

test('planning map expands for route building and supports a full-viewport focus mode', () => {
  assert.match(html, /id="focus-map"[^>]*aria-pressed="false"[^>]*>Focus map/);
  assert.match(html, /\.route-building \.shell\{grid-template-columns:minmax\(0,2\.45fr\)/);
  assert.match(html, /\.route-building \.map-wrap\{height:clamp\(660px,86dvh,940px\)/);
  assert.match(html, /@media\(max-width:620px\)[\s\S]*\.route-building \.map-wrap\{height:clamp\(540px,82dvh,780px\)/);
  assert.match(html, /body\.map-focus \.map-wrap\{position:fixed;inset:0/);
  assert.match(js, /function setMapFocus/);
  assert.match(js, /map\.invalidateSize\(\{pan:false\}\)/);
  assert.match(js, /isle_royale_map_focus/);
  assert.match(js, /if\(document\.body\.classList\.contains\('map-focus'\)\)/);
});

test('manual campsite day ends are explicit, source-aware route decisions', () => {
  assert.match(js, /function setCampDayEnd/);
  assert.match(js, /End next day here/);
  assert.match(js, /End day here/);
  assert.match(js, /manualDayEnd/);
  assert.match(js, /manual_day_end/);
  assert.match(js, /not in the current NPS Boat-In campground feed/);
  assert.match(js, /CURRENT NPS CLOSURE/);
  assert.match(waterIntelJs, /nextManual=candidates\.find/);
  assert.match(waterIntelJs, /manual_day_end:Boolean\(chosen\?\.manual_day_end\)/);
  assert.match(waterIntelJs, /under_target:Boolean\(chosen\?\.manual_day_end/);
});

test('scenario planner compares three trip structures without turning them into safety scores', () => {
  assert.match(html, /id="route-scenarios"/);
  assert.match(html, /Balanced day/);
  assert.match(js, /function renderRouteScenarios/);
  assert.match(js, /function compareScenarioWeather/);
  assert.match(js, /function applyScenarioPlan/);
  assert.match(js, /filter\(point=>!point\.scenarioGenerated\)/);
  assert.match(js, /isle_royale_scenario_apply/);
  assert.match(js, /isle_royale_scenario_weather/);
  assert.match(js, /Scenario names describe trip structure, not safety/);
  assert.match(waterIntelJs, /Weather-conservative/);
  assert.match(waterIntelJs, /Balanced/);
  assert.match(waterIntelJs, /Ambitious/);
  assert.match(isleBenchmark, /scenarioRuntime/);
});

test('multi-day route weather accepts explicit itinerary target times after overnight stops', () => {
  const normalizeWaypoint = require('../api/isle-royale-route-weather.js')._test.normalizeWaypoint;
  const target = '2026-09-02T14:30:00.000Z';
  const waypoint = normalizeWaypoint({lat:48.05,lon:-88.75,distance_miles:12,target_time:target},0);
  assert.equal(waypoint.target_time,target);
  assert.match(routeWeatherApi, /Scheduled route sample falls outside the supported NWS forecast window/);
  assert.match(routeWeatherApi, /Multi-day samples may use explicit itinerary target times after overnight stops/);
  assert.match(js, /function routeScheduledForecastSamples/);
  assert.match(js, /target_time:p\.target_time\|\|null/);
});

test('current NPS off-trail camping zone closures are parsed without fabricating polygons', () => {
  const detector = require('../api/isle-royale.js')._test.detectCurrentClosures;
  const sample = `
    <h2>Current Conditions</h2>
    <p>Off-trail Camping Zone 9: Closed</p>
    <p>Off-trail camping zones 10, 11, 12, 13, 30, 31, 32, 33, 34, 35, 36, 37, 38 are closed due to wolf activity.</p>
  `;
  const alerts = detector(sample);
  const zones = [...new Set(alerts.flatMap(alert => alert.zones || (alert.id === 'off-trail-zone-9' ? [9] : [])))].sort((a,b) => a-b);
  assert.deepEqual(zones, [9,10,11,12,13,30,31,32,33,34,35,36,37,38]);
  assert.match(js, /not mapped polygon geometry/i);
  assert.match(js, /off-trail-camping\.htm/);
});

test('retired science assets remain provenance-auditable but are absent from the planner', () => {
  assert.doesNotMatch(html, /data-layer="geology"/);
  assert.doesNotMatch(html, /data-layer="vegetation-overview"/);
  assert.doesNotMatch(html, /data-layer="vegetation-baseline"/);
  assert.doesNotMatch(html, /data-layer="vegetation-change"/);
  assert.doesNotMatch(html, /data-layer="horne-fire"/);
  for (const key of ['geology','vegetation','vegetation_overview']) {
    const meta = deepManifest.sources[key];
    assert.ok(meta && /^[a-f0-9]{64}$/.test(meta.sha256), `${key} sha256`);
    const file = path.join(root, 'public/isle-royale-map/data', meta.file);
    assert.ok(fs.existsSync(file), `${key} generated file`);
    assert.equal(fs.statSync(file).size, meta.bytes, `${key} byte count`);
  }
  assert.equal(deepManifest.sources.vegetation.features, 38);
  assert.equal(deepManifest.sources.vegetation_overview.features, 6);
});

test('verified NPS and USGS context layers are lazy, hashed and integrity-gated', () => {
  assert.match(html, /data-layer="quiet-no-wake"/);
  assert.doesNotMatch(html, /data-layer="vegetation-change"/);
  assert.doesNotMatch(html, /data-layer="horne-fire"/);
  assert.match(js, /context-layer-manifest\.json/);
  assert.match(js, /quiet-no-wake-zones\.geojson/);
  assert.match(js, /async function loadContextLayer/);
  assert.match(js, /official NPS regulatory geometry/i);

  const expected = {
    quiet_no_wake: 22,
    vegetation_change: 2738,
    horne_fire: 93,
  };

  for (const [key, count] of Object.entries(expected)) {
    const meta = contextManifest.layers[key];
    assert.equal(meta.status, 'generated', key);
    assert.equal(meta.features, count, `${key} feature count`);
    assert.match(meta.sha256, /^[a-f0-9]{64}$/);
    const file = path.join(root, 'public/isle-royale-map/data', meta.file);
    assert.ok(fs.existsSync(file), `${key} generated file`);
    const data = fs.readFileSync(file);
    assert.equal(data.length, meta.bytes, `${key} byte count`);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), meta.sha256, `${key} sha256`);
  }

  assert.equal(contextManifest.layers.quiet_no_wake.quiet_no_wake_features, 19);
  assert.equal(contextManifest.layers.quiet_no_wake.no_wake_features, 3);
  assert.match(contextManifest.layers.quiet_no_wake.geometry_source, /irmaservices\.nps\.gov/);
  assert.match(contextManifest.layers.vegetation_change.license, /CC0/);
  assert.match(contextManifest.layers.horne_fire.license, /CC0/);
});


test('current NPS shipwreck buoy points are coordinated with visitor geometry without duplicate race', () => {
  assert.match(api, /fetchShipwreckDataset/);
  assert.match(api, /shipwrecks,/);
  assert.match(api, /National Park Service — Shipwreck Buoys/);
  assert.match(js, /visitorGeometrySettled/);
  assert.match(js, /addPendingShipwrecks/);
  assert.match(js, /hasMappedNamedFeature/);
  assert.match(js, /National Park Service — Shipwreck Buoys/);
  assert.match(js, /current NPS dive-site \/ mooring reference point/);
});


test('USGS relief is a keyless opt-in layer below vectors', () => {
  assert.match(html, /data-layer="relief"/);
  assert.match(js, /USGSShadedReliefOnly\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  assert.match(js, /reliefPane/);
  assert.match(js, /USGS The National Map · 3DEP \/ GMTED2010/);
  assert.doesNotMatch(js, /nps\.gov\/maps\/pmtiles/i);
  const relief = catalog.items.find(x => x.id === 'relief');
  assert.equal(relief.state, 'live-tile');
  assert.match(relief.source, /basemap\.nationalmap\.gov/);
});

test('GIS workflows validate on PRs and only rebuild or write on explicit dispatch', () => {
  for (const workflow of [deepWorkflow, contextWorkflow]) {
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'/);
    assert.match(workflow, /Validate committed/);
    assert.match(workflow, /git pull --rebase origin/);
  }
  assert.match(deepWorkflow, /vegetation-overview-2000\.geojson/);
  assert.match(contextWorkflow, /quiet-no-wake-zones\.geojson/);
});


test('Isle Royale has protected internal discovery paths outside the frozen tools experiment', () => {
  assert.match(circleTour, /href="\/isle-royale-map\/"[^>]*>Isle Royale interactive map/);
  assert.match(circleTour, /href="\/isle-royale-map\/" class="ext-link">Isle Royale map/);
  assert.match(upNorth, /href="\/isle-royale-map\/"[^>]*>Isle Royale interactive map/);
});


test('route stops expose leg and cumulative distances and can be deleted from list or marker', () => {
  assert.match(js, /function routeControlDistances/);
  assert.match(js, /function projectControlPointAlongPath/);
  assert.match(js, /function removeRoutePoint/);
  assert.match(js, /mi leg · .*mi total/);
  assert.match(html, /\.route-distance/);
  assert.match(js, /Remove from route/);
  assert.match(js, /marker\.bindPopup/);
  assert.match(js, /remove\.textContent='Remove'/);
});

test('smart route planner snaps hiking to mapped trails and keeps water routes editable', () => {
  assert.match(html, /<h3>Plan a route<\/h3>/);
  assert.match(html, /id="route-smart-status"/);
  assert.match(html, /id="route-reverse"/);
  assert.match(html, /Build on the map/);
  assert.match(html, /Every stop shows leg distance and total distance/);
  assert.match(js, /const trailGraph = \{/);
  assert.match(js, /function registerTrailGeometry/);
  assert.match(js, /function shortestTrailPath/);
  assert.match(js, /function resolveHikingRoute/);
  assert.match(js, /function nearestTrailNode/);
  assert.match(js, /trail-snapped/);
  assert.match(js, /Those points are not connected through the currently loaded trail network/);
  assert.match(js, /draggable:true/);
  assert.match(js, /nearestControlSegmentIndex/);
  assert.match(js, /route\.points\.splice\(index,0/);
  assert.match(js, /function reverseRoute/);
});

test('route point workflow stays map-first and weather follows resolved geometry', () => {
  assert.match(js, /Start route here/);
  assert.match(js, /Route to here/);
  assert.match(js, /Add as route stop/);
  assert.doesNotMatch(js, /if\(route\.points\.length===2\)setRouteAdding\(false\)/);
  assert.match(js, /function routePathPoints/);
  assert.match(js, /return route\.resolvedPoints\.length \? route\.resolvedPoints : route\.points/);
  assert.match(js, /const points=routePathPoints\(\)/);
  assert.match(js, /Smart hiking route:/);
  assert.match(js, /Editable water route:/);
});
