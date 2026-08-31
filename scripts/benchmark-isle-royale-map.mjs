import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('public/isle-royale-map/index.html');
const js = read('public/assets/isle-royale-map.js');
const api = read('api/isle-royale.js');
const routeWeatherApi = read('api/isle-royale-route-weather.js');
const waterApi = read('api/isle-royale-water-intelligence.js');
const waterJs = read('public/assets/isle-royale-water-intelligence.js');
const catalog = JSON.parse(read('public/isle-royale-map/catalog.json'));
const spec = JSON.parse(read('benchmarks/isle-royale-map.json'));
const deepManifest = JSON.parse(read('public/isle-royale-map/data/deep-layer-manifest.json'));
const contextManifest = JSON.parse(read('public/isle-royale-map/data/context-layer-manifest.json'));
const deepPath = file => path.join(root, 'public/isle-royale-map/data', file);
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(deepPath(file))).digest('hex');
const deepCaps = {geology:25_000_000, vegetation:25_000_000, vegetation_overview:8_000_000};
const deepSourceChecks = Object.entries(deepCaps).map(([key, cap]) => {
  const meta = deepManifest.sources?.[key];
  if (!meta || !meta.file || !/^[a-f0-9]{64}$/.test(meta.sha256 || '')) return false;
  const file = deepPath(meta.file);
  if (!fs.existsSync(file)) return false;
  const stat = fs.statSync(file);
  return stat.size === meta.bytes && stat.size <= cap && sha256(meta.file) === meta.sha256;
});
const contextExpected = {quiet_no_wake:22, vegetation_change:2738, horne_fire:93};
const contextSourceChecks = Object.entries(contextExpected).map(([key, expected]) => {
  const meta = contextManifest.layers?.[key];
  if (!meta || meta.status !== 'generated' || meta.features !== expected || !meta.file || !/^[a-f0-9]{64}$/.test(meta.sha256 || '')) return false;
  const file = deepPath(meta.file);
  if (!fs.existsSync(file)) return false;
  const stat = fs.statSync(file);
  return stat.size === meta.bytes && stat.size <= 15_000_000 && sha256(meta.file) === meta.sha256;
});

const checks = [];
const add = (id, weight, ok, evidence) => checks.push({id, weight, ok:Boolean(ok), evidence});
const cat = catalog.items.map(x => `${x.id} ${x.npmapsCategory} ${x.state}`.toLowerCase()).join(' ');
const requiredNpMapsIds = [
  'visitor-web-map','regional-map','rock-harbor','windigo','camping-zones','transportation',
  'shipwrecks','relief','lighthouses','geology','vegetation-detailed','vegetation-simple',
  'quiet-no-wake','anchorage-zones','historic-brochure','historic-windigo'
];
const catalogIds = new Set(catalog.items.map(x => x.id));
const npmapsComplete = requiredNpMapsIds.every(id => catalogIds.has(id));
const catalogCrawlable = /href=["']\/isle-royale-map\/catalog\.json/.test(html) && (html.match(/<tbody id="catalog-body">[\s\S]*?<tr>/g) || []).length >= 1;
const measurementComplete = [
  'isle_royale_layer_toggle','isle_royale_search','isle_royale_feature_open','isle_royale_source_open','isle_royale_osm_context'
].every(eventName => js.includes(eventName));
const currentShipwreckRuntime = /fetchShipwreckDataset/.test(api)
  && /shipwrecks,/.test(api)
  && /addPendingShipwrecks/.test(js)
  && /visitorGeometrySettled/.test(js)
  && catalog.items.some(x => x.id === 'shipwrecks' && x.state === 'live-api');
const pointDetailRuntime = /L\.canvas\(\{padding:\.5, tolerance:coarsePointer \? 14 : 9\}\)/.test(js)
  && /radius:category === 'campground' \? 7\.5 : 7/.test(js)
  && /collectFeatureFacts/.test(js)
  && /Related information/.test(js)
  && /Open this coordinate in OpenStreetMap/.test(js)
  && /\.popup-action\{[^}]*min-height:42px/.test(html);
const osmToggleRuntime = /const osmContextGroup = L\.layerGroup\(\)/.test(js)
  && /function setOsmContextVisible/.test(js)
  && /Hide OSM context/.test(js)
  && /Show OSM context/.test(js)
  && /targetGroup:osmContextGroup/.test(js);
const routePlanningRuntime = /id="route-planner"/.test(html)
  && /Plan a route/.test(html)
  && /function addRoutePoint/.test(js)
  && /function routeForecastSamples/.test(js)
  && /function relativeWind/.test(js)
  && /Start route here/.test(js)
  && /Route to here/.test(js)
  && /\/api\/isle-royale-route-weather/.test(js)
  && /forecastGridData/.test(routeWeatherApi)
  && /waveHeight/.test(routeWeatherApi)
  && /wavePeriod/.test(routeWeatherApi)
  && /PILM4/.test(routeWeatherApi)
  && /ROAM4/.test(routeWeatherApi)
  && /alerts\/active\?point=/.test(routeWeatherApi);
const routeEditingRuntime = /function routeControlDistances/.test(js)
  && /function projectControlPointAlongPath/.test(js)
  && /function removeRoutePoint/.test(js)
  && /mi (?:leg|water).*mi total/.test(js)
  && /Remove from route/.test(js)
  && /marker\.bindPopup/.test(js)
  && /\.route-distance/.test(html);

const smartRoutingRuntime = /const trailGraph = \{/.test(js)
  && /function registerTrailGeometry/.test(js)
  && /function shortestTrailPath/.test(js)
  && /function resolveHikingRoute/.test(js)
  && /trail-snapped/.test(js)
  && /draggable:true/.test(js)
  && /nearestControlSegmentIndex/.test(js)
  && /function reverseRoute/.test(js)
  && /route\.resolvedPoints\.length \? route\.resolvedPoints : route\.points/.test(js)
  && /if\(route\.mode!=='hike'&&route\.points\.length>=2&&route\.smartState!=='water-aware'\)return \[\]/.test(js);
const waterIntelligenceRuntime = /\/api\/isle-royale-water-intelligence/.test(js)
  && /function resolveWaterRouteAsync/.test(js)
  && /water-aware/.test(js)
  && /Open-water exposure model/.test(js)
  && /NPS boating-zone check/.test(js)
  && /Nearby mapped refuge \/ stopping options/.test(js)
  && /id="route-day-hours"/.test(html)
  && /id="route-intelligence"/.test(html)
  && /isle-royale-water-intelligence\.js/.test(html)
  && /function routeSegment/.test(waterJs)
  && /crosses\(n,nn\)/.test(waterJs)
  && /waterKeys/.test(waterJs)
  && /outside-water routing component/.test(waterJs)
  && /function crossingCount/.test(waterJs)
  && /shortcutSafe=!crosses/.test(waterJs)
  && /Generated route intersects mapped shoreline/.test(waterJs)
  && /Water route failed final coastline validation/.test(waterJs)
  && /land_crossings:landCrossings/.test(waterJs)
  && /Water route failed zero-land-crossing validation/.test(js)
  && /stats\.land_crossings!==0/.test(js)
  && /route\.resolvedPoints=\[\];[\s\S]{0,100}route\.smartState='water-fallback'/.test(js)
  && /No route line or mileage is shown until a zero-land-crossing path is validated/.test(js)
  && /route-distance-badge/.test(js)
  && /Water · .*mi/.test(js)
  && /weatherSamples/.test(waterJs)
  && /zonesAlongPath/.test(waterJs)
  && /dayEnds/.test(waterJs)
  && /natural"="coastline/.test(waterApi)
  && /planning shoreline geometry only/i.test(waterApi);
const itineraryRuntime = /id="route-itinerary"/.test(html)
  && /function sourceBackedWaterCamps/.test(js)
  && /record\.boater\|\|record\.liveAlert/.test(js)
  && /function buildRouteItinerary/.test(js)
  && /function summarizeItineraryWeather/.test(js)
  && /function insertItineraryCampStop/.test(js)
  && /isle_royale_itinerary_stop/.test(js)
  && /planning candidate, not an availability claim/i.test(js)
  && /function buildItinerary/.test(waterJs)
  && /function projectPointToPath/.test(waterJs)
  && /function slicePath/.test(waterJs)
  && /\.slice\(0,8\)/.test(routeWeatherApi);

const scenarioRuntime = /id="route-scenarios"/.test(html)
  && /function renderRouteScenarios/.test(js)
  && /function compareScenarioWeather/.test(js)
  && /function applyScenarioPlan/.test(js)
  && /scenarioGenerated:true/.test(js)
  && /isle_royale_scenario_apply/.test(js)
  && /isle_royale_scenario_weather/.test(js)
  && /function routeScheduledForecastSamples/.test(js)
  && /target_time:p\.target_time\|\|null/.test(js)
  && /function scenarioProfiles/.test(waterJs)
  && /function buildScenarioSet/.test(waterJs)
  && /Weather-conservative/.test(waterJs)
  && /Balanced/.test(waterJs)
  && /Ambitious/.test(waterJs)
  && /if\(Number\.isFinite\(targetMs\)\)out\.target_time/.test(routeWeatherApi)
  && /Scheduled route sample falls outside the supported NWS forecast window/.test(routeWeatherApi);

const mapFirstRoutingRuntime = /id="explore-mode"[^>]*aria-pressed="true"/.test(html)
  && /id="route-mode"[^>]*>Build route/.test(html)
  && /id="route-map-guide"/.test(html)
  && /id="route-stop-list"/.test(html)
  && /function addFeatureToRoute/.test(js)
  && /route\.adding&&record\.latlng/.test(js)
  && /function renderRouteStops/.test(js)
  && /if\(!route\.adding\)return;/.test(js)
  && /routePoint\.kind==='campground'&&distanceMiles\(routePoint,point\)<\.08/.test(js)
  && /point\.sourceBackedBoatIn=Boolean\(match\.boater\)/.test(js)
  && !/route\.points\.length===2\)setRouteAdding\(false\)/.test(js)
  && /nextPinned=candidates\.find/.test(waterJs)
  && /pinned:Boolean\(chosen\?\.pinned\)/.test(waterJs);

const manualDayEndRuntime = /function setCampDayEnd/.test(js)
  && /End next day here/.test(js)
  && /End day here/.test(js)
  && /manualDayEnd/.test(js)
  && /not in the current NPS Boat-In campground feed/.test(js)
  && /nextManual=candidates\.find/.test(waterJs)
  && /manual_day_end:Boolean\(chosen\?\.manual_day_end\)/.test(waterJs)
  && /under_target:Boolean\(chosen\?\.manual_day_end/.test(waterJs);

const tripPersistenceRuntime = /id="route-save"/.test(html)
  && /id="route-restore"/.test(html)
  && /id="route-share"/.test(html)
  && /id="route-export-gpx"/.test(html)
  && /id="cockpit-save"/.test(html)
  && /id="cockpit-share"/.test(html)
  && /id="cockpit-gpx"/.test(html)
  && /TRIP_STORAGE_KEY='isle-royale-trip-v1'/.test(js)
  && /localStorage\.setItem\(TRIP_STORAGE_KEY/.test(js)
  && /url\.hash='trip='/.test(js)
  && /window\.location\.hash\.startsWith\('#trip='\)/.test(js)
  && /sourceBackedBoatIn:false,liveAlert:false/.test(js)
  && /function exportRouteGpx/.test(js)
  && /application\/gpx\+xml/.test(js)
  && /temporary fallback sketches are not exported/.test(js);

const focusCockpitRuntime = /id="planning-cockpit"/.test(html)
  && /id="cockpit-route-mode"/.test(html)
  && /id="cockpit-route-stops"/.test(html)
  && /id="cockpit-undo"/.test(html)
  && /id="cockpit-redo"/.test(html)
  && /id="route-redo"/.test(html)
  && /function captureRouteSnapshot/.test(js)
  && /function snapshotFingerprint/.test(js)
  && /function rememberRouteEdit\(action='route edit'\)/.test(js)
  && /function undoRouteEdit/.test(js)
  && /function redoRouteEdit/.test(js)
  && /function restoreRouteSnapshot/.test(js)
  && /departure:route\.departure/.test(js)
  && /adding:Boolean\(route\.adding\)/.test(js)
  && /button\.textContent=undoLabel/.test(js)
  && /button\.textContent=redoLabel/.test(js)
  && /rememberRouteEdit\('change speed'\)/.test(js)
  && /rememberRouteEdit\('change day length'\)/.test(js)
  && /rememberRouteEdit\('change departure'\)/.test(js)
  && /last\?\.fingerprint===fingerprint/.test(js)
  && /historyAction:\(active\?'set ':'clear '\)/.test(js)
  && /renderRouteStopsInto\(els\.cockpitStops\)/.test(js)
  && /els\.cockpitMode\?\.addEventListener\('change'/.test(js)
  && /els\.cockpitWeather\?\.addEventListener\('click',analyzeRouteWeather\)/.test(js)
  && /scenarioGenerated:true/.test(js)
  && /sourceBackedBoatIn:true/.test(js);

const largePlanningCanvasRuntime = /id="focus-map"[^>]*aria-pressed="false"/.test(html)
  && /\.route-building \.shell\{grid-template-columns:minmax\(0,2\.45fr\)/.test(html)
  && /\.route-building \.map-wrap\{height:clamp\(660px,86dvh,940px\)/.test(html)
  && /@media\(max-width:620px\)[\s\S]*\.route-building \.map-wrap\{height:clamp\(540px,82dvh,780px\)/.test(html)
  && /body\.map-focus \.map-wrap\{position:fixed;inset:0/.test(html)
  && /function setMapFocus/.test(js)
  && /map\.invalidateSize\(\{pan:false\}\)/.test(js)
  && /isle_royale_map_focus/.test(js);

const reliefRuntime = /USGSShadedReliefOnly\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/.test(js)
  && /data-layer="relief"/.test(html)
  && catalog.items.some(x => x.id === 'relief' && x.state === 'live-tile');
const referenceShelfComplete = /Official maps from the original research/.test(html)
  && /Rock Harbor map/.test(html)
  && /Windigo map/.test(html)
  && /Anchorage zones/.test(html)
  && /Off-trail camping zones/.test(html)
  && /Regional access \+ trail mileage/.test(html)
  && /Historic maps/.test(html);

add('source-catalog', 12, catalog.items.length >= 19 && npmapsComplete && catalogCrawlable && referenceShelfComplete, `${catalog.items.length} catalog entries; 16/16 NPMaps families; crawlable catalog + in-tool reference shelf`);
add('visitor-geometry', 13, /75e3ceba038a45f7b4d5a9d7c6a46ccf/.test(js) && /loadArcGISService/.test(js) && currentShipwreckRuntime, 'public ArcGIS web-map + service ingestion + current NPS shipwreck buoy runtime');
add('planning-flow', 15, ['feature-search','layer-filters','feature-list','park-live-status','route-planner'].every(x => html.includes(`id="${x}"`)) && /flyToFeature/.test(js) && /\/api\/isle-royale/.test(js) && measurementComplete && reliefRuntime && pointDetailRuntime && osmToggleRuntime && routePlanningRuntime && smartRoutingRuntime && waterIntelligenceRuntime && itineraryRuntime && scenarioRuntime && mapFirstRoutingRuntime && manualDayEndRuntime && largePlanningCanvasRuntime && focusCockpitRuntime && tripPersistenceRuntime && routeEditingRuntime, 'map-first route planning with leg/cumulative distances, obvious deletion, cockpit/undo-redo, source-backed camps/day ends, persistence and water intelligence');
add('provenance', 10, /sourceStatus/.test(js) && /source-catalog/.test(html) && /National Park Service — Boat-In Campgrounds/.test(api) && catalog.items.every(x => x.publisher && x.source && x.state), 'map + live operational sources/status displayed and cataloged');
add('safety', 10, !/nps\.gov\/maps\/pmtiles|Park Tiles/i.test(html + js) && /not a navigation chart/i.test(html) && /approximate reference/i.test(js), 'no restricted NPS basemap; navigation and fallback caveats');
add('fail-soft', 10, /loadFallbackAnchors/.test(js) && /catch/.test(js) && /Promise\.allSettled/.test(api) && /degraded:/.test(api) && /tile\.openstreetmap\.org/.test(js), 'geometry fallbacks + independent NPS feed degradation + keyless basemap');
add('accessibility', 8, /aria-live/.test(html) && /feature-list/.test(html) && /focus-visible/.test(html), 'status region + list alternative + focus states');
add('search-entity', 8, /https:\/\/chrisizworski\.com\/#person/.test(html) && /WebApplication/.test(html) && /Dataset/.test(html) && /dateModified/.test(html), 'Person + WebApplication + Dataset + freshness');
add('network', 6, (html.match(/chrisizworski\.com\//g) || []).length >= 4 && /great-lakes-lighthouses|lake-superior-circle-tour|michiganoutdoorsnow/.test(html), 'contextual existing-tool links');
add('deep-data-path', 8,
  deepSourceChecks.every(Boolean)
    && contextSourceChecks.every(Boolean)
    && deepManifest.sources.geology.features >= 1900
    && deepManifest.sources.vegetation.features === 38
    && deepManifest.sources.vegetation_overview.features === 6
    && contextManifest.layers.quiet_no_wake.quiet_no_wake_features === 19
    && contextManifest.layers.quiet_no_wake.no_wake_features === 3
    && /quiet-no-wake-zones\.geojson/.test(js)
    && /data-layer="quiet-no-wake"/.test(html)
    && !/data-layer="vegetation-(?:overview|baseline|change)"/.test(html)
    && !/data-layer="horne-fire"/.test(html)
    && ['geology','vegetation-detailed','vegetation-simple','vegetation-change-1996-2017','horne-fire-2021']
      .every(id => catalog.items.some(x => x.id === id && x.state === 'research-only')),
  'original deep-research assets remain integrity-audited; planner exposes only decision-useful regulatory/terrain layers'
);

const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
const hardFailures = [];
if (/nps\.gov\/maps\/pmtiles/i.test(html + js)) hardFailures.push('Restricted NPS basemap usage detected in runtime surface');
if (!/not a navigation chart/i.test(html)) hardFailures.push('navigation disclaimer missing');
if (!/approximate reference/i.test(js)) hardFailures.push('fallback derivation label missing');
if (!deepSourceChecks.every(Boolean)) hardFailures.push('deep GIS file/hash/size integrity failed');
if (!contextSourceChecks.every(Boolean)) hardFailures.push('context GIS file/hash/count/size integrity failed');
if (contextManifest.layers?.quiet_no_wake?.quiet_no_wake_features !== 19 || contextManifest.layers?.quiet_no_wake?.no_wake_features !== 3) hardFailures.push('quiet/no-wake 19+3 regulatory reconciliation failed');
if (!npmapsComplete) hardFailures.push('16-product NPMaps completeness gate failed');
if (!catalogCrawlable) hardFailures.push('crawlable source catalog/raw manifest link missing');
if (!measurementComplete) hardFailures.push('planned privacy-safe Isle Royale measurement events missing');
if (!currentShipwreckRuntime) hardFailures.push('current NPS shipwreck buoy runtime missing');
if (!pointDetailRuntime) hardFailures.push('point hit-target/detail popup runtime missing');
if (!osmToggleRuntime) hardFailures.push('OSM context is not a reversible layer');
if (!routePlanningRuntime) hardFailures.push('route-aware marine planning runtime missing');
if (!smartRoutingRuntime) hardFailures.push('smart trail routing runtime missing');
if (!waterIntelligenceRuntime) hardFailures.push('water intelligence runtime missing or reduced to a draggable straight-line sketch');
if (!itineraryRuntime) hardFailures.push('multi-day water itinerary is not source-backed by open NPS Boat-In campgrounds with per-day context');
if (!scenarioRuntime) hardFailures.push('scenario planning is missing side-by-side trip structures or overnight-aware forecast comparison');
if (!mapFirstRoutingRuntime) hardFailures.push('map-first route building is missing persistent Build mode, clickable campsite stops, or pinned campsite itinerary behavior');
if (!manualDayEndRuntime) hardFailures.push('manual campsite day-end control is missing or can bypass Boat-In/closure truth gates');
if (!largePlanningCanvasRuntime) hardFailures.push('planning map is too constrained or missing full-viewport focus mode and Leaflet resize handling');
if (!focusCockpitRuntime) hardFailures.push('Focus map is missing shared route controls, stop/day-end editing, or true undo/redo route history');
if (!/speed:Number\(route\.speed\)\|\|3/.test(js) || !/hours:Number\(route\.hours\)\|\|6/.test(js) || !/departure:route\.departure/.test(js)) hardFailures.push('Undo snapshots are reading post-change DOM values instead of committed route settings');
if (!/button\.textContent=undoLabel/.test(js) || !/last\?\.fingerprint===fingerprint/.test(js)) hardFailures.push('Undo is missing action labels or no-op history deduplication');
if (!tripPersistenceRuntime) hardFailures.push('trip persistence/handoff is missing local-only save, share-fragment restore, or resolved-route GPX export safeguards');
if (!routeEditingRuntime) hardFailures.push('route planning is missing leg/cumulative distances or obvious stop deletion from the map/list');
if (!/function crossingCount/.test(waterJs) || !/Water route failed final coastline validation/.test(waterJs) || !/route\.resolvedPoints=\[\];[\s\S]{0,100}route\.smartState='water-fallback'/.test(js)) hardFailures.push('water routing can still display an unverified line or accept a mapped shoreline crossing');
if (!/route-distance-badge/.test(js) || !/Water · .*mi/.test(js) || !/Calculating water distance/.test(js)) hardFailures.push('water distance is not clearly identified on the resolved route');
if (/data-layer="vegetation-(?:overview|baseline|change)"|data-layer="horne-fire"/.test(html)) hardFailures.push('retired vegetation/ecology layers leaked back into the planning controls');
if (!['geology','vegetation-detailed','vegetation-simple','vegetation-change-1996-2017','horne-fire-2021'].every(id => catalog.items.some(x => x.id === id && x.state === 'research-only'))) hardFailures.push('retired research layers are not clearly marked research-only in the source catalog');
if (!reliefRuntime) hardFailures.push('keyless USGS relief runtime missing');
if (!referenceShelfComplete) hardFailures.push('official/reference map shelf incomplete');

console.log(`Isle Royale map benchmark: ${score}/100 (release target ${spec.valueFunction.releaseTarget})`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${String(c.weight).padStart(2)} ${c.id} — ${c.evidence}`);
if (hardFailures.length) console.error('HARD GATES:', hardFailures.join('; '));

if (process.argv.includes('--check') && (score < spec.valueFunction.releaseTarget || hardFailures.length)) process.exit(1);
