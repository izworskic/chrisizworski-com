import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const html = read('public/isle-royale-map/index.html');
const js = read('public/assets/isle-royale-map.js');
const vercel = read('vercel.json');
const api = read('api/isle-royale.js');
const routeWeatherApi = read('api/isle-royale-route-weather.js');
const waterApi = read('api/isle-royale-water-intelligence.js');
const waterJs = read('public/assets/isle-royale-water-intelligence.js');
const catalog = JSON.parse(read('public/isle-royale-map/catalog.json'));
const spec = JSON.parse(read('benchmarks/isle-royale-map.json'));
const deepManifest = JSON.parse(read('public/isle-royale-map/data/deep-layer-manifest.json'));
const contextManifest = JSON.parse(read('public/isle-royale-map/data/context-layer-manifest.json'));
const officialPortages = JSON.parse(read('public/isle-royale-map/data/official-portages-2026.json'));
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
  && /Open this coordinate on the source map/.test(js)
  && /\.popup-action\{[^}]*min-height:42px/.test(html);

const interactionAssetFresh = /\/assets\/isle-royale-map\.js\?v=20260831-canoe-trip-graph-1/.test(html)
  && !/isle-royale-map\.js\?v=20260830-19/.test(html)
  && /"source": "\/assets\/isle-royale-map\.js"/.test(vercel)
  && /"key": "Cache-Control"[\s\S]{0,120}"value": "no-store, max-age=0"/.test(vercel)
  && /"key": "CDN-Cache-Control"[\s\S]{0,120}"value": "no-store"/.test(vercel)
  && /"key": "Vercel-CDN-Cache-Control"[\s\S]{0,120}"value": "no-store"/.test(vercel);

const popupReadabilityRuntime = /id="map-inspector"/.test(html)
  && /id="map-inspector-body"/.test(html)
  && /id="map-inspector-center-point"/.test(html)
  && /id="map-inspector-center-card"/.test(html)
  && /function popupSafeBounds/.test(js)
  && /function promotePopupToFloatingInspector/.test(js)
  && /function scheduleFloatingInspectorPromotion/.test(js)
  && /function sizeFloatingInspector/.test(js)
  && /function centerFloatingInspector/.test(js)
  && /floatingInspector\.body\.replaceChildren\(detail\)/.test(js)
  && /popupEl\.classList\.add\('isle-popup-promoted'\)/.test(js)
  && /scheduleFloatingInspectorPromotion\(popup\)/.test(js)
  && /\.map-inspector\{/.test(html)
  && /\.map-inspector-body\{[^}]*overflow:auto/.test(html)
  && /\.isle-popup-promoted\{visibility:hidden!important/.test(html)
  && /body\.map-focus\.detail-popup-open \.planning-cockpit\{display:none\}/.test(html);

const popupDragRuntime = /function inspectorPosition/.test(js)
  && /function wireFloatingInspectorDrag/.test(js)
  && /function centerInspectorPoint/.test(js)
  && /Drag this card anywhere on the map/.test(html)
  && /Center card/.test(html)
  && /Center point/.test(html)
  && /window\.addEventListener\('pointermove',move/.test(js)
  && /window\.addEventListener\('pointerup',end/.test(js)
  && /shell\.style\.left=.*\+'px'/.test(js)
  && /shell\.style\.top=.*\+'px'/.test(js)
  && /\.map-inspector-drag\{/.test(html)
  && /cursor:grab/.test(html)
  && /touch-action:none/.test(html)
  && /function officialPortagePopup/.test(js)
  && /wrap\.className='popup-detail official-portage-popup'/.test(js)
  && /line\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/.test(js)
  && /badge\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/.test(js)
  && /marker\.bindPopup\(\(\)=>officialPortagePopup\(portage,visual\)/.test(js);

const campgroundDetailRuntime = /trail-accessible-campgrounds\.htm/.test(api)
  && /lake-superior-accessible-campgrounds\.htm/.test(api)
  && /inland-lake-paddling-campgrounds\.htm/.test(api)
  && /function normalizeCampgroundProfiles/.test(api)
  && /campground_profiles:/.test(api)
  && /campgroundByName: new Map\(\)/.test(js)
  && /function findCampgroundProfile/.test(js)
  && /function loadCampSiteIdentifiers/.test(js)
  && /function campgroundSiteIdentifierLabel/.test(js)
  && /tourism"~"camp_site\|camp_pitch"/.test(js)
  && /Numbered campsite \/ pitch/.test(js)
  && /function campSiteIdentifiersFor/.test(js)
  && /Numbered sites & shelters/.test(js)
  && /This may not be a complete site inventory/.test(js)
  && /Site\/shelter identifiers: OpenStreetMap contributors \(supplemental\)/.test(js)
  && /addPopupFact\(facts, 'Total sites'/.test(js)
  && /addPopupFact\(facts, 'Group sites'/.test(js)
  && /loadCampSiteIdentifiers\(\)\.catch/.test(js);

const osmToggleRuntime = /const osmContextGroup = L\.layerGroup\(\)/.test(js)
  && /function setOsmContextVisible/.test(js)
  && /Hide supplemental data/.test(js)
  && /Show supplemental data/.test(js)
  && /function supplementalFeatureType/.test(js)
  && /Supplemental data source:/.test(js)
  && /community-mapped context, not an NPS operational source/.test(js)
  && /targetGroup:osmContextGroup/.test(js)
  && !/>Show OSM context</.test(html);
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
  && /function routeDisplayPoints/.test(js)
  && /function routeIsResolved/.test(js)
  && /function verifiedRouteMiles/.test(js)
  && /function currentDayVerifiedMiles/.test(js)
  && /function finishCurrentDay/.test(js)
  && /function backOneRoutePoint/.test(js)
  && /route\.points\.pop\(\)/.test(js)
  && /id="route-back-point"/.test(html)
  && /id="route-finish-day"/.test(html)
  && /id="cockpit-back-point"/.test(html)
  && /id="cockpit-finish-day"/.test(html)
  && /id="cockpit-finish-trip"/.test(html)
  && /Back one point/.test(html)
  && /Finish day/.test(html)
  && /Finish trip/.test(html)
  && /routeFinishBuild\.disabled=pointCount<2\|\|/.test(js)
  && /isle_royale_finish_day/.test(js)
  && /verified this day/.test(js)
  && /body\.map-focus \.route-build-bar\{display:flex!important/.test(html)
  && !/body\.map-focus \.route-build-bar\{display:none!important/.test(html)
  && !/Draft route · straight between selected points while mapped routing verifies/.test(js)
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
  && /!\['canoe-aware','canoe-partial'\]\.includes\(route\.smartState\)/.test(js)
  && /!\['water-aware','water-partial'\]\.includes\(route\.smartState\)/.test(js)
  && /route\.smartState=legs\.length\?'canoe-partial':'canoe-fallback'/.test(js)
  && /route\.smartState=legs\.length\?'water-partial':'water-fallback'/.test(js);
const canoePortageRuntime = /<option value="canoe">Canoe \+ portage<\/option>/.test(html)
  && /id="route-portage-trips"/.test(html)
  && /id="route-portage-pace"/.test(html)
  && /function resolveCanoeRouteAsync/.test(js)
  && /function canoeTrailLegCandidate/.test(js)
  && /if\(!official\)return null/.test(js)
  && /function canoeWaterLegCandidate/.test(js)
  && /crossings!==0/.test(js)
  && /function canoeTotals/.test(js)
  && /function cycleCanoeLegType/.test(js)
  && /Watercraft routes never cross land except on a designated brown P# portage/.test(js)
  && /attempts an overland crossing that is not a designated NPS portage/.test(js)
  && /Land crossings are limited to designated NPS portages/.test(js)
  && /Route through this portage/.test(js)
  && /route\.mixedLegs\.every\(leg=>leg\?\.verified/.test(js)
  && !/function canoeManualLeg/.test(js)
  && !/drawn water leg/.test(js)
  && /actual walking distance/.test(js)
  && /legType:\['water','portage'\]\.includes/.test(js);

const officialPortageDatasetRuntime = officialPortages?.schema_version === 1
  && officialPortages?.source_vintage === 2026
  && officialPortages?.source_page === 6
  && /National Park Service/.test(officialPortages?.authority || '')
  && Array.isArray(officialPortages?.portages)
  && officialPortages.portages.length === 16
  && Math.abs(officialPortages.portages.reduce((sum,p)=>sum+(Number(p.distance_miles)||0),0)-9.5) < .001
  && Math.max(...officialPortages.portages.map(p=>Number(p.distance_miles)||0)) === 2
  && Math.max(...officialPortages.portages.map(p=>Number(p.elevation_change_ft)||0)) === 175
  && new Set(officialPortages.portages.map(p=>p.id)).size === 16
  && /not landing coordinates/i.test(officialPortages?.disclaimer || '')
  && /officialPortages: '\/isle-royale-map\/data\/official-portages-2026\.json'/.test(js)
  && /function loadOfficialPortages/.test(js)
  && /function matchOfficialPortage/.test(js)
  && /distanceBasis:'nps-published'/.test(js)
  && /mapped_miles:mappedMiles/.test(js)
  && /officialPortage:official/.test(js)
  && /NPS Portage #/.test(js)
  && /Official portage dataset/.test(html);

const selectableOfficialPortageRuntime = /data-layer="official-portage" checked/.test(html)
  && /Official portages/.test(html)
  && /16 NPS 2026 carries/.test(html)
  && /official-portage-badge/.test(html)
  && /map\.createPane\('portagePane'\)/.test(js)
  && /'official-portage': L\.layerGroup\(\)\.addTo\(map\)/.test(js)
  && /function officialPortageMappedGeometry/.test(js)
  && /function renderOfficialPortageLayer/.test(js)
  && /function officialPortagePopup/.test(js)
  && /function addOfficialPortageToTrip/.test(js)
  && /Route through this portage/.test(js)
  && /weight:20,opacity:\.001,interactive:true/.test(js)
  && /className:'official-portage-badge unresolved'/.test(js)
  && /mapped trail corridor could not be resolved/i.test(js)
  && /officialPortageId/.test(js)
  && /selected mapped portage corridor/.test(js)
  && /isle_royale_portage_open/.test(js)
  && /isle_royale_portage_add/.test(js);

const tripCreationRuntime = spec.tripCreationValueFunction?.releaseTarget === 92
  && spec.tripCreationValueFunction?.stretchTarget === 97
  && spec.tripCreationValueFunction?.formula === 'TC = .25C + .20P + .15F + .15D + .10E + .07R + .05T + .03H'
  && Object.values(spec.tripCreationValueFunction?.dimensions||{}).reduce((sum,item)=>sum+(Number(item.weight)||0),0) === 100
  && /function officialPortageLandingPair/.test(js)
  && /function selectedOfficialPortageLeg/.test(js)
  && /async function addOfficialPortageToTrip/.test(js)
  && /function removePortageGroup/.test(js)
  && /portageGroupId:groupId/.test(js)
  && /portageRole:role/.test(js)
  && /kind:'official-portage-landing'/.test(js)
  && /if\(route\.adding\) \{[\s\S]{0,220}addOfficialPortageToTrip\(portage\.id\)/.test(js)
  && /draggable:point\.kind!=='official-portage-landing'/.test(js)
  && /Designated NPS portage · one canoe trip step/.test(js)
  && /function logicalRoutePointCount/.test(js)
  && /function verifiedTripActiveHours/.test(js)
  && /function currentDayVerifiedHours/.test(js)
  && /active travel/.test(js)
  && /portageGroupId:cleanText\(point\.portageGroupId/.test(js)
  && /water → portage → water → camp/.test(html)
  && /function landingNear/.test(waterJs)
  && /return \{route,landingNear,analyze/.test(waterJs);

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
  && /route\.smartState=legs\.length\?'water-partial':'water-fallback'/.test(js)
  && /route\.resolvedPoints=combineCanoeLegs\(legs\)/.test(js)
  && /return route\.points\.length<2\?route\.points:\[\]/.test(js)
  && /route\.smartState==='water-aware'&&Number\(route\.waterStats\?\.land_crossings\|\|0\)===0/.test(js)
  && /No overland fallback is drawn/.test(js)
  && !/Draft route · straight between selected points while mapped routing verifies/.test(js)
  && /function routeIsResolved/.test(js)
  && /function landingNear/.test(waterJs)
  && /return \{route,landingNear,analyze/.test(waterJs)
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
  && /id="route-build-bar"/.test(html)
  && /id="route-back-point"/.test(html)
  && /id="cockpit-back-point"/.test(html)
  && /id="route-finish-day"/.test(html)
  && /id="route-finish-build"/.test(html)
  && /id="cockpit-finish-day"/.test(html)
  && /id="cockpit-finish-trip"/.test(html)
  && /id="route-review-actions"/.test(html)
  && /Finish day/.test(html)
  && /Finish trip/.test(html)
  && /function addFeatureToRoute/.test(js)
  && /route\.adding&&record\.latlng/.test(js)
  && /function renderRouteStops/.test(js)
  && /function renderRouteBuildFlow/.test(js)
  && /function finishCurrentDay/.test(js)
  && /function finishRouteBuild/.test(js)
  && /function resumeRouteBuild/.test(js)
  && /function backOneRoutePoint/.test(js)
  && /isle_royale_route_back_point/.test(js)
  && /route\.reviewing=true/.test(js)
  && /setRouteAdding\(false,\{preserveReview:true\}\)/.test(js)
  && /els\.cockpitFinishDay\?\.addEventListener\('click',finishCurrentDay\)/.test(js)
  && /els\.cockpitFinishTrip\?\.addEventListener\('click',finishRouteBuild\)/.test(js)
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

const tripIntelligenceRuntime = /id="route-paddle-pace"/.test(html)
  && /id="route-portage-pace"/.test(html)
  && /id="route-portage-trips"/.test(html)
  && /id="route-trip-brief"/.test(html)
  && /id="route-export-plan"/.test(html)
  && /Easy · 2\.5 mph/.test(html)
  && /Average · 3\.0 mph/.test(html)
  && /Strong · 3\.5 mph/.test(html)
  && /Easy · 1\.5 mph/.test(html)
  && /Average · 2\.0 mph/.test(html)
  && /Strong · 2\.5 mph/.test(html)
  && /2 loads · double carry · walk 3×/.test(html)
  && /3 loads · triple carry · walk 5×/.test(html)
  && /standard 10 minutes per portage/.test(html)
  && !/id="route-stroke-rate"|id="route-feet-per-stroke"|id="route-portage-speed"|id="route-portage-transition"/.test(html)
  && /const PADDLE_PACES=Object\.freeze/.test(js)
  && /easy:\{label:'Easy',mph:2\.5\}/.test(js)
  && /average:\{label:'Average',mph:3\}/.test(js)
  && /strong:\{label:'Strong',mph:3\.5\}/.test(js)
  && /const PORTAGE_PACES=Object\.freeze/.test(js)
  && /easy:\{label:'Easy',mph:1\.5\}/.test(js)
  && /average:\{label:'Average',mph:2\}/.test(js)
  && /strong:\{label:'Strong',mph:2\.5\}/.test(js)
  && /function paddlePaceSpeed/.test(js)
  && /function portagePaceSpeed/.test(js)
  && /function legacyPaddlePace/.test(js)
  && /function legacyPortagePace/.test(js)
  && /function normalizeCarryTrips/.test(js)
  && /2\*trips-1/.test(js)
  && /function portageTerrainFactor/.test(js)
  && /function tripSegmentMetrics/.test(js)
  && /function canoeLegActiveHours/.test(js)
  && /function verifiedTripActiveHours/.test(js)
  && /function currentDayVerifiedHours/.test(js)
  && /walkingHours\+transitionHours/.test(js)
  && /function tripEffortSummary/.test(js)
  && /function tripDays/.test(js)
  && /function tripDescription/.test(js)
  && /function renderTripBrief/.test(js)
  && /Portage terrain adjustments are planning heuristics/.test(js)
  && !/paddleSpeedFromStrokes|strokeCountForMiles|estimated stroke cycles/.test(js)
  && /TRIP_LIBRARY_KEY='isle-royale-trip-library-v1'/.test(js)
  && /TRIP_AUTOSAVE_KEY='isle-royale-trip-autosave-v1'/.test(js)
  && /function renderSavedTrips/.test(js)
  && /Working route · autosaved/.test(js)
  && /function tripPlanHtml/.test(js)
  && /function downloadTripPlan/.test(js)
  && /format:'html-plan'/.test(js);

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
  && /portageGroupId:cleanText\(point\.portageGroupId/.test(js)
  && /portageRole:\['entry','exit'\]\.includes/.test(js)
  && /logicalRoutePointCount\(normalized\.points\)/.test(js)
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
add('planning-flow', 15, ['feature-search','layer-filters','feature-list','park-live-status','route-planner'].every(x => html.includes(`id="${x}"`)) && /flyToFeature/.test(js) && /\/api\/isle-royale/.test(js) && measurementComplete && reliefRuntime && pointDetailRuntime && popupReadabilityRuntime && popupDragRuntime && campgroundDetailRuntime && osmToggleRuntime && routePlanningRuntime && smartRoutingRuntime && canoePortageRuntime && officialPortageDatasetRuntime && selectableOfficialPortageRuntime && waterIntelligenceRuntime && itineraryRuntime && scenarioRuntime && mapFirstRoutingRuntime && manualDayEndRuntime && largePlanningCanvasRuntime && focusCockpitRuntime && tripPersistenceRuntime && tripIntelligenceRuntime && routeEditingRuntime && tripCreationRuntime, 'canoe-first trip construction with water/portage continuity, atomic P# trip steps, live distance/time, day ends, editing, persistence and water intelligence');
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
if (!interactionAssetFresh) hardFailures.push('live Isle Royale interaction asset is stale-cacheable or using an old version token');
if (!popupReadabilityRuntime) hardFailures.push('rich detail cards are not promoted into the unobstructed floating map inspector');
if (!popupDragRuntime) hardFailures.push('floating inspector cannot move the card itself independently of the map for points and official portages');
if (!campgroundDetailRuntime) hardFailures.push('campground cards are missing official NPS capacity profiles or truthful supplemental numbered site/shelter identifiers');
if (!osmToggleRuntime) hardFailures.push('supplemental-data layer is not reversible or leaks source plumbing into user-facing labels');
if (!routePlanningRuntime) hardFailures.push('route-aware marine planning runtime missing');
if (!smartRoutingRuntime) hardFailures.push('smart trail routing runtime missing');
if (!canoePortageRuntime) hardFailures.push('canoe route planning is missing mixed paddle/portage leg detection, distance accounting, carry settings, or manual leg override');
if (!officialPortageDatasetRuntime) hardFailures.push('official 2026 NPS portage dataset is incomplete, unvalidated, or disconnected from canoe route matching');
if (!selectableOfficialPortageRuntime) hardFailures.push('official portages are not visually selectable map objects with wide tap targets and add-to-trip behavior');
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
if (!tripCreationRuntime) hardFailures.push('canoe trip creation is missing first-class portage transitions, live travel-time feedback, logical trip-step persistence, or water-side landing resolution');
if (!tripIntelligenceRuntime) hardFailures.push('trip intelligence is missing simple researched pace presets, carry math, day planning, named saves, autosave recovery, or portable trip-plan export');
if (!/id="route-finish-day"/.test(html) || !/function finishCurrentDay/.test(js) || !/id="route-finish-build"/.test(html) || !/function finishRouteBuild/.test(js) || !/route\.reviewing=true/.test(js)) hardFailures.push('route builder is missing day-by-day completion or final trip review controls');
if (!/function crossingCount/.test(waterJs) || !/Water route failed final coastline validation/.test(waterJs) || !/route\.smartState=legs\.length\?'water-partial':'water-fallback'/.test(js)) hardFailures.push('water routing can still promote an unsafe route or discard the verified prefix when a later leg fails');
if (!/route-distance-badge/.test(js) || !/Water · .*mi/.test(js) || !/verified this day/.test(js) || !/Earlier safe-water lines and measurements remain on the map/.test(js)) hardFailures.push('live verified leg/day mileage is not preserved while the newest water leg resolves');
if (/data-layer="vegetation-(?:overview|baseline|change)"|data-layer="horne-fire"/.test(html)) hardFailures.push('retired vegetation/ecology layers leaked back into the planning controls');
if (!['geology','vegetation-detailed','vegetation-simple','vegetation-change-1996-2017','horne-fire-2021'].every(id => catalog.items.some(x => x.id === id && x.state === 'research-only'))) hardFailures.push('retired research layers are not clearly marked research-only in the source catalog');
if (!reliefRuntime) hardFailures.push('keyless USGS relief runtime missing');
if (!referenceShelfComplete) hardFailures.push('official/reference map shelf incomplete');

console.log(`Isle Royale map benchmark: ${score}/100 (release target ${spec.valueFunction.releaseTarget})`);
console.log(`Canoe trip creation north star: ${tripCreationRuntime ? 'PASS' : 'FAIL'} (target ${spec.tripCreationValueFunction?.releaseTarget||'n/a'})`);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${String(c.weight).padStart(2)} ${c.id} — ${c.evidence}`);
if (hardFailures.length) console.error('HARD GATES:', hardFailures.join('; '));

if (process.argv.includes('--check') && (score < spec.valueFunction.releaseTarget || hardFailures.length)) process.exit(1);
