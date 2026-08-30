import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('public/isle-royale-map/index.html');
const js = read('public/assets/isle-royale-map.js');
const api = read('api/isle-royale.js');
const routeWeatherApi = read('api/isle-royale-route-weather.js');
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
  && /Build a route \+ check marine conditions/.test(html)
  && /function addRoutePoint/.test(js)
  && /function routeForecastSamples/.test(js)
  && /function relativeWind/.test(js)
  && /Add this point to route/.test(js)
  && /\/api\/isle-royale-route-weather/.test(js)
  && /forecastGridData/.test(routeWeatherApi)
  && /waveHeight/.test(routeWeatherApi)
  && /wavePeriod/.test(routeWeatherApi)
  && /PILM4/.test(routeWeatherApi)
  && /ROAM4/.test(routeWeatherApi)
  && /alerts\/active\?point=/.test(routeWeatherApi);
const reliefRuntime = /USGSShadedReliefOnly\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/.test(js)
  && /data-layer="relief"/.test(html)
  && catalog.items.some(x => x.id === 'relief' && x.state === 'live-tile');
const referenceShelfComplete = /class="map-shelf"/.test(html)
  && /Rock Harbor area guide/.test(html)
  && /Windigo area guide/.test(html)
  && /Anchorage zones/.test(html)
  && /Off-trail camping zones/.test(html)
  && /Historic \/ archived map references/.test(html);

add('source-catalog', 12, catalog.items.length >= 19 && npmapsComplete && catalogCrawlable && referenceShelfComplete, `${catalog.items.length} catalog entries; 16/16 NPMaps families; crawlable catalog + in-tool reference shelf`);
add('visitor-geometry', 13, /75e3ceba038a45f7b4d5a9d7c6a46ccf/.test(js) && /loadArcGISService/.test(js) && currentShipwreckRuntime, 'public ArcGIS web-map + service ingestion + current NPS shipwreck buoy runtime');
add('planning-flow', 15, ['feature-search','layer-filters','feature-list','park-live-status','route-planner'].every(x => html.includes(`id="${x}"`)) && /flyToFeature/.test(js) && /\/api\/isle-royale/.test(js) && measurementComplete && reliefRuntime && pointDetailRuntime && osmToggleRuntime && routePlanningRuntime, 'search + reversible OSM context + route building + route-time NWS wind/wave/weather + large point details + current NPS park-state');
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
    && deepManifest.sources.vegetation_overview.bytes < deepManifest.sources.vegetation.bytes / 2
    && contextManifest.layers.quiet_no_wake.quiet_no_wake_features === 19
    && contextManifest.layers.quiet_no_wake.no_wake_features === 3
    && /loadDeepLayer/.test(js)
    && /loadContextLayer/.test(js)
    && /geology-units\.geojson/.test(js)
    && /vegetation-overview-2000\.geojson/.test(js)
    && /vegetation-baseline-2000\.geojson/.test(js)
    && /quiet-no-wake-zones\.geojson/.test(js)
    && /vegetation-change-1996-2017\.geojson/.test(js)
    && /horne-fire-burn-severity\.geojson/.test(js)
    && /Vegetation overview \(2000\)/.test(html)
    && /Vegetation detailed \(2000\)/.test(html)
    && /data-layer="quiet-no-wake"/.test(html)
    && /data-layer="vegetation-change"/.test(html)
    && /data-layer="horne-fire"/.test(html)
    && /historical 2000-inventory derivatives/i.test(js)
    && /historical USGS context/i.test(js)
    && catalog.items.some(x => x.id === 'geology' && x.state === 'generated-runtime')
    && catalog.items.some(x => x.id === 'vegetation-simple' && x.state === 'generated-runtime')
    && catalog.items.some(x => x.id === 'vegetation-detailed' && x.state === 'generated-runtime')
    && catalog.items.some(x => x.id === 'quiet-no-wake' && x.state === 'generated-runtime')
    && catalog.items.some(x => x.id === 'vegetation-change-1996-2017' && x.state === 'generated-runtime')
    && catalog.items.some(x => x.id === 'horne-fire-2021' && x.state === 'generated-runtime'),
  `verified geology + detailed/overview vegetation + 22 NPS boating zones + USGS relief/change/fire layers, hashes, size gates and lazy loaders`
);

const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
const hardFailures = [];
if (/nps\.gov\/maps\/pmtiles/i.test(html + js)) hardFailures.push('Restricted NPS basemap usage detected in runtime surface');
if (!/not a navigation chart/i.test(html)) hardFailures.push('navigation disclaimer missing');
if (!/approximate reference/i.test(js)) hardFailures.push('fallback derivation label missing');
if (!deepSourceChecks.every(Boolean)) hardFailures.push('deep GIS file/hash/size integrity failed');
if (!contextSourceChecks.every(Boolean)) hardFailures.push('context GIS file/hash/count/size integrity failed');
if (contextManifest.layers?.quiet_no_wake?.quiet_no_wake_features !== 19 || contextManifest.layers?.quiet_no_wake?.no_wake_features !== 3) hardFailures.push('quiet/no-wake 19+3 regulatory reconciliation failed');
if (!/historical 2000-inventory derivatives/i.test(js) || !/Vegetation detailed \(2000\)/.test(html) || !/Vegetation overview \(2000\)/.test(html)) hardFailures.push('vegetation freshness/derivation warning missing');
if (!npmapsComplete) hardFailures.push('16-product NPMaps completeness gate failed');
if (!catalogCrawlable) hardFailures.push('crawlable source catalog/raw manifest link missing');
if (!measurementComplete) hardFailures.push('planned privacy-safe Isle Royale measurement events missing');
if (!currentShipwreckRuntime) hardFailures.push('current NPS shipwreck buoy runtime missing');
if (!pointDetailRuntime) hardFailures.push('point hit-target/detail popup runtime missing');
if (!osmToggleRuntime) hardFailures.push('OSM context is not a reversible layer');
if (!routePlanningRuntime) hardFailures.push('route-aware marine planning runtime missing');
if (!reliefRuntime) hardFailures.push('keyless USGS relief runtime missing');
if (!referenceShelfComplete) hardFailures.push('official/reference map shelf incomplete');
if (deepManifest.sources?.vegetation_overview?.features !== 6 || deepManifest.sources?.vegetation_overview?.bytes >= deepManifest.sources?.vegetation?.bytes / 2) hardFailures.push('vegetation overview reduction gate failed');

console.log(`Isle Royale map benchmark: ${score}/100 (release target ${spec.valueFunction.releaseTarget})`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${String(c.weight).padStart(2)} ${c.id} — ${c.evidence}`);
if (hardFailures.length) console.error('HARD GATES:', hardFailures.join('; '));

if (process.argv.includes('--check') && (score < spec.valueFunction.releaseTarget || hardFailures.length)) process.exit(1);
