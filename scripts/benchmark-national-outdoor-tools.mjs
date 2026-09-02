#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel) => readFile(path.join(root, rel), "utf8");
const contract = JSON.parse(await read("benchmarks/national-outdoor-tools.json"));
const lifecycle = JSON.parse(await read("benchmarks/national-source-lifecycle.json"));
const candidates = JSON.parse(await read("benchmarks/national-intelligence-candidates-2026-09-02.json"));
const cropData = JSON.parse(await read("public/data/national-planting-crops.json"));
const riverIndex = JSON.parse(await read("public/data/national-usgs-streamflow-sites.json"));
const riverIndexGenerator = await read("scripts/generate-national-usgs-streamflow-index.mjs");
const shared = await read("lib/national-outdoor.js");
const client = await read("public/assets/national-tools.js");
const dashboard = await read("public/assets/national-dashboard.js");
const nationalCss = await read("public/assets/national-tools.css");
const admission = JSON.parse(await read("benchmarks/national-location-admission.json"));
const vercel = JSON.parse(await read("vercel.json"));
const sitemap = await read("public/sitemap.xml");
const homepage = await read("public/index.html");
const registry = JSON.parse(await read("benchmarks/tool-network-registry.json"));
const pages = {
  hub: await read("public/national-tools/index.html"),
  aurora: await read("public/national-tools/aurora/index.html"),
  rivers: await read("public/national-tools/rivers/index.html"),
  coastal: await read("public/national-tools/coastal/index.html"),
  frost: await read("public/national-tools/frost/index.html"),
  planting: await read("public/national-tools/planting/index.html"),
  fall: await read("public/national-tools/fall-color/index.html"),
};
const apis = {
  geocode: await read("api/national-geocode.js"),
  aurora: await read("api/national-aurora.js"),
  rivers: await read("api/national-rivers.js"),
  riverContext: await read("api/national-river-context.js"),
  coastal: await read("api/national-coastal.js"),
  frost: await read("api/national-frost.js"),
  fall: await read("api/national-fall-color.js"),
  fallObservations: await read("api/national-fall-observations.js"),
};

const frostStationNormals = (apis.frost.match(/async function stationNormals[\s\S]*?\n}\nasync function normals/) || [""])[0];

let rawScore = 0;
let maxPoints = 0;
const failures = [];
function check(name, ok, points, detail = "") {
  maxPoints += points;
  if (ok) rawScore += points;
  else failures.push(detail ? `${name}: ${detail}` : name);
}

const lossTotal = Object.entries(contract.lossFunction)
  .filter(([key]) => key !== "total")
  .reduce((sum, [, value]) => sum + value, 0);
check("Loss function totals 100", lossTotal === 100 && contract.lossFunction.total === 100, 5, String(lossTotal));
const valueTotal = Object.entries(contract.productValueFunction || {})
  .filter(([key]) => !["total","normalNewFamilyMinimum","priorityThreshold"].includes(key))
  .reduce((sum, [, value]) => sum + (Number.isFinite(value) ? value : 0), 0);
const searchOpportunityTotal = Object.values(contract.searchOpportunityMatrix?.weights || {})
  .reduce((sum, value) => sum + value, 0);
check("Product value function totals 100", valueTotal === 100 && contract.productValueFunction?.total === 100, 5, String(valueTotal));
check("Search opportunity matrix totals 100", searchOpportunityTotal === 100 && contract.searchOpportunityMatrix?.minimumScore === 80, 4, String(searchOpportunityTotal));
check("Production benchmark preserves 92 target and both hard gates", contract.productionBenchmark?.overallTarget === 92 && contract.productionBenchmark?.dimensions?.factualSourceIntegrity?.hardGate === true && contract.productionBenchmark?.dimensions?.canonicalCannibalizationIntegrity?.hardGate === true, 4);
check("Candidate discovery wave contains at least 20 researched combinations", Array.isArray(candidates.candidates) && candidates.candidates.length >= 20, 5, String(candidates.candidates?.length || 0));
check("Smoke remains blocked until credentials and supported interfaces pass", candidates.decision?.blockedHighestValue === "smoke-clear-air" && candidates.candidates.some((candidate) => candidate.id === "smoke-clear-air" && /^blocked-/.test(candidate.gate)), 4);
check("Coastal is the admitted Phase 3 standalone after the source audit", candidates.decision?.completedStandalone?.includes("coastal-water-window") && candidates.candidates.some((candidate) => candidate.id === "coastal-water-window" && /^implemented-/.test(candidate.gate)), 4);
check("Snowpack advances to the next eligible standalone", candidates.decision?.nextEligibleStandalone === "snowpack-melt" && candidates.candidates.some((candidate) => candidate.id === "snowpack-melt" && candidate.gate === "eligible"), 4);
check("Candidate matrix forbids location-page expansion by score alone", /No candidate authorizes location-page generation/.test(candidates.decision?.longTailRule || ""), 3);
check("Phase 2 adds no indexable route family", contract.indexPolicy?.phase2AddsIndexableRoutes === false, 4);
check("Phase 3 admits one distinct coastal canonical", contract.indexPolicy?.phase3AddsIndexableRoutes === true && contract.coastalProduct?.route === "/national-tools/coastal/" && contract.coastalProduct?.api === "/api/national-coastal", 4);
check("Phase 0 source lifecycle contract is current", lifecycle.updated === "2026-09-02" && contract.phase0?.sourceLifecycleContract === "benchmarks/national-source-lifecycle.json", 4);
check("USGS production runtime is off retiring WaterServices", !/waterservices\.usgs\.gov/.test(apis.rivers + apis.riverContext + riverIndexGenerator) && lifecycle.sources?.usgsContinuous?.status === "migrated" && lifecycle.sources?.usgsStatistics?.status === "migrated-beta", 8);
check("Smoke remains credential-gated on supported source families", lifecycle.sources?.airNow?.status === "source-key-gated" && lifecycle.sources?.nasaFirms?.status === "source-key-gated" && contract.phase2?.smokeAirQuality?.indexableRouteCreated === false, 5);
check("FIRMS lifecycle avoids new Suomi-NPP dependency", /NOAA20/.test(JSON.stringify(lifecycle.sources?.nasaFirms)) && /NOAA21/.test(JSON.stringify(lifecycle.sources?.nasaFirms)) && /November 1, 2026/.test(lifecycle.sources?.nasaFirms?.lifecycle || ""), 3);
check("Coastal source lifecycle is production-audited and keyless", ["nwsMarineBeachForecast","ndbcRealtime","noaaCoopsTides"].every((id) => lifecycle.sources?.[id]?.status === "production-supported" && lifecycle.sources?.[id]?.authentication === "none"), 5);
check("Coastal lifecycle preserves source semantics", /may not downgrade or override/.test(lifecycle.sources?.nwsMarineBeachForecast?.dominanceRule || "") && /not proof of exact conditions/.test(lifecycle.sources?.ndbcRealtime?.semantics || "") && /not observed water level/.test(lifecycle.sources?.noaaCoopsTides?.semantics || ""), 4);

const routes = [
  "/national-tools/",
  "/national-tools/aurora/",
  "/national-tools/rivers/",
  "/national-tools/coastal/",
  "/national-tools/frost/",
  "/national-tools/planting/",
  "/national-tools/fall-color/",
];
check("Deliberate national canonical routes are present", routes.every((r) => sitemap.includes(`<loc>https://chrisizworski.com${r}</loc>`)), 5);
check("No generated national location tree shipped", !/national-tools\/(?:aurora|rivers|coastal|frost|planting|fall-color)\/(?:[a-z]{2}|city|zip)\//i.test(sitemap), 5);

function nationalRouteFor(name) {
  return name === "hub" ? "/national-tools/" : `/national-tools/${name === "fall" ? "fall-color" : name}/`;
}
function sitemapLastmod(route) {
  const block = new RegExp(
    `<loc>https://chrisizworski\\.com${route.replace(/\//g, "\\/")}</loc>[\\s\\S]{0,200}?<lastmod>(\\d{4}-\\d{2}-\\d{2})`
  ).exec(sitemap);
  return block ? block[1] : "";
}

for (const [name, body] of Object.entries(pages)) {
  const title = (body.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
  const desc = (body.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "";
  check(`${name} title length`, title.length > 0 && title.length <= 60, 1, `${title.length}: ${title}`);
  check(`${name} description length`, desc.length > 0 && desc.length <= 158, 1, String(desc.length));
  check(`${name} canonical Person`, body.includes('"@id":"https://chrisizworski.com/#person"'), 1);
  // A literal date here fails the day the page legitimately changes, which has already cost this
  // repo three separate repairs. Assert the property instead: the page carries a dateModified and
  // it agrees with the lastmod this route publishes in the sitemap.
  const stamped = (body.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/) || [])[1] || "";
  const route = nationalRouteFor(name);
  const sitemapStamp = sitemapLastmod(route);
  check(
    `${name} freshness stamp matches sitemap`,
    Boolean(stamped) && stamped === sitemapStamp,
    1,
    `page ${stamped || "none"} vs sitemap ${sitemapStamp || "none"}`
  );
  check(`${name} visible authorship`, body.includes('class="brand" href="/">Chris Izworski</a>'), 1);
}

check("Shared data helpers expose freshness contract", /sourceMeta/.test(shared) && /stale_after_minutes/.test(shared) && /source_status/.test(shared), 5);
check("Location object includes timezone context", /timeZone/.test(apis.geocode) && /api\.weather\.gov\/points/.test(apis.geocode), 3);
check("Device location is opt-in and rounded before server lookup", /navigator\.geolocation/.test(client) && /toFixed\(3\)/.test(client) && /method:"POST"/.test(client) && /reverseGeocode/.test(apis.geocode) && /roundCoord/.test(apis.geocode), 5);
check("Device coordinates stay out of national page URLs", /body:JSON\.stringify\(\{latitude:roundedLatitude,longitude:roundedLongitude\}\)/.test(client) && !/national-geocode\?lat=/.test(client), 4);
check("All national entry forms expose optional Use my location", Object.values(pages).every((body) => /data-use-location/.test(body) && /location-privacy/.test(body)), 4);
check("Device lookup is not cached and analytics block postal coordinate fields", /method === "POST"[\s\S]*Cache-Control", "no-store"/.test(apis.geocode) && ["latitude","longitude","postalCode","postcode","location"].every((key) => client.includes('"'+key+'"')), 4);

check("National client persists saved places locally", /PLACES_STORE/.test(client) && /savedPlaces/.test(client) && /savePlace/.test(client), 4);
check("Resolved place toolbar supports save switch and share", /function renderPlaceToolbar/.test(client) && /data-place-save/.test(client) && /data-place-switch/.test(client) && /data-place-share/.test(client), 5);
check("Shared national links carry place query not coordinates", /function currentShareUrl/.test(client) && /withQuery\(path,loc\)/.test(client) && /navigator\.share/.test(client) && /clipboard\.writeText/.test(client) && !/currentShareUrl[\s\S]{0,500}latitude/.test(client), 5);
check("Place toolbar actions stay privacy-safe in analytics", /National Place Shared/.test(client) && /National Place Switched/.test(client) && /method:"native"/.test(client) && /method:"clipboard"/.test(client) && !/National Place Shared[^\n]{0,160}(?:query|latitude|longitude|place)/.test(client), 4);

check("Location continuity crosses national tools without new canonicals", /function propagate/.test(client) && /withQuery/.test(client) && /a\[href\^="\/national-tools\/"\]/.test(client), 4);
check("Decision times can render in searched timezone", /fmtInZone/.test(client) && /timeZone/.test(client), 3);

check("National product measurement uses existing Vercel analytics", /_vercel\/insights\/script\.js/.test(client) && /National Location Resolved/.test(client) && /National Tool Open/.test(client) && /National Saved Place/.test(client) && /National Desk Loaded/.test(dashboard), 4);
check("National analytics block raw location properties", /ANALYTICS_BLOCKED_KEYS/.test(client) && ["query","q","latitude","longitude","displayName","place","state","postalCode","location"].every((key) => client.includes('"'+key+'"')), 5);
check("Homepage exposes a small national-tools access link", /href="\/national-tools\/"[^>]*data-track-tool="national-tools"[^>]*data-placement="home-nav"/.test(homepage), 3);

check("Aurora has best dark weather window", /bestCloudWindow/.test(apis.aurora) && /best_dark_window/.test(apis.aurora) && /Best weather window after dark/.test(pages.aurora), 5);
check("Aurora separates Kp from visibility", /Kp is not a local visibility forecast|Kp is not a local visibility probability|Kp is not a local forecast/.test(pages.aurora + apis.aurora), 4);
check("Aurora includes moon context", /U\.S\. Naval Observatory|moon/.test(apis.aurora) && /moon illumination/.test(pages.aurora), 3);
check("Aurora sources expose stale semantics", /staleAfterMinutes/.test(apis.aurora) && /sources:/.test(apis.aurora), 3);
check("Aurora page survives stale shared timezone helper", /typeof N\.fmtInZone===["']function["']/.test(pages.aurora), 4);
check("Aurora exposes NOAA auroral oval visual", /national-oval-img/.test(pages.aurora) && /aurora-forecast-northern-hemisphere\.jpg/.test(pages.aurora), 4);
check("Auroral oval does not become fake sighting probability", /not a sighting probability/i.test(pages.aurora) && /modeled intensity/i.test(pages.aurora), 4);
check("National entry pages cache-bust shared runtime assets", Object.values(pages).every((body) => /national-tools\.js\?v=[^"']+/.test(body)), 3);

check("Rivers preserve same-date historical percentiles in optional context", /dailyStatistics/.test(apis.riverContext) && /p10:/.test(apis.riverContext) && /p25:/.test(apis.riverContext) && /p50:/.test(apis.riverContext) && /p75:/.test(apis.riverContext) && /p90:/.test(apis.riverContext) && /historical_daily_flow/.test(pages.rivers), 5);
check("River discovery index has national depth", riverIndex.site_count >= 9000 && Array.isArray(riverIndex.sites) && riverIndex.sites.length === riverIndex.site_count, 5, String(riverIndex.site_count));
check("Checked-in river discovery index retains explicit source provenance until regenerated", Boolean(riverIndex.source_name) && /^https:\/\//.test(riverIndex.source_url || "") && Array.isArray(riverIndex.sites), 3);
check("River index generator uses modern USGS latest-continuous discovery", /api\.waterdata\.usgs\.gov\/ogcapi\/v0\/collections\/latest-continuous\/items/.test(riverIndexGenerator) && /state_code/.test(riverIndexGenerator) && /site_type_code/.test(riverIndexGenerator) && /parameter_code/.test(riverIndexGenerator) && /RECENT_DAYS = 14/.test(riverIndexGenerator), 6);
check("River discovery uses local national index before live detail", /national-usgs-streamflow-sites\.json/.test(apis.rivers) && /function discoveryRivers/.test(apis.rivers) && /mode === "discovery"/.test(apis.rivers) && /distance_miles/.test(apis.rivers), 5);
check("River core has no live gauge-discovery network call", !/latest-continuous/.test(apis.rivers) && !/monitoring-locations\/items/.test(apis.rivers) && !/bBox/.test(apis.rivers) && !/siteSearch/.test(apis.rivers), 6);
check("River live request uses modern exact-site USGS continuous API", /api\.waterdata\.usgs\.gov\/ogcapi\/v0\/collections\/continuous\/items/.test(apis.rivers) && /monitoring_location_id/.test(apis.rivers) && /application\/query-cql-json/.test(apis.rivers) && /between/.test(apis.rivers), 6);
check("River exact-site observation request has bounded timeout", /observations\(coreSites, coreParameters, 2600\)/.test(apis.rivers) && /observations\(sensorSites, Object\.values\(PARAMETERS\), 2200\)/.test(apis.rivers) && /AbortSignal\.timeout\(timeoutMs\)/.test(apis.rivers), 4);
check("River core adds real multi-signal USGS parameters", ["00010","63680","00300","00095","00400"].every((code) => apis.rivers.includes(code)) && /sensor_availability/.test(apis.rivers), 6);
check("River sensor values are conditional rather than fabricated defaults", /water_temperature:\s*null/.test(apis.rivers) && /turbidity:\s*null/.test(apis.rivers) && /dissolved_oxygen:\s*null/.test(apis.rivers) && /specific_conductance:\s*null/.test(apis.rivers) && /ph:\s*null/.test(apis.rivers), 5);
check("River core computes observed 6h and 24h change", /trend_percent_6h/.test(apis.rivers) && /trend_percent_24h/.test(apis.rivers) && /gage_height_change_24h_ft/.test(apis.rivers), 5);
check("River core excludes historical NOAA and weather network calls", !/nwis\/stat/.test(apis.rivers) && !/api\.water\.noaa\.gov/.test(apis.rivers) && !/api\.weather\.gov/.test(apis.rivers) && /context_pending/.test(apis.rivers), 5);
check("River optional context carries modern USGS history, NOAA NWPS and NWS weather", /statistics\/v0\/observationNormals/.test(apis.riverContext) && /api\.water\.noaa\.gov/.test(apis.riverContext) && /api\.weather\.gov/.test(apis.riverContext) && /stageflow\/forecast/.test(apis.riverContext) && /weatherContext/.test(apis.riverContext), 6);
check("River official forecast trajectory stays distinct from observations", /normalizeForecastTrend/.test(apis.riverContext) && /forecast_trend/.test(apis.riverContext) && /Official forecast trend/.test(pages.rivers), 4);
check("River UI is discovery-first and supports repeated river switching", /mode=discovery/.test(pages.rivers) && /function renderDiscovery/.test(pages.rivers) && /function openSelectedSite/.test(pages.rivers) && /data-site-id/.test(pages.rivers) && /site="\+encodeURIComponent\(siteId\)/.test(pages.rivers) && /← River list/.test(pages.rivers) && /← Choose another river/.test(pages.rivers) && /function returnToRiverList/.test(pages.rivers), 5);
check("River UI leads with what changed and what is next", /What changed\?/.test(pages.rivers) && /What’s next\?/.test(pages.rivers) && /Observed movement/.test(pages.rivers), 5);
check("River UI exposes conditional water-quality sensor panel", /Available water sensors/.test(pages.rivers) && /Dissolved oxygen/.test(pages.rivers) && /Conductivity/.test(pages.rivers) && /Turbidity/.test(pages.rivers), 5);
check("River activity lenses reuse facts without a combined score", [["general","General"],["paddle","Paddle"],["fish","Fish"],["swim","Swim"],["ecology","Ecology"],["trip","Trip"]].every(([id,label]) => pages.rivers.includes('["'+id+'","'+label+'"]')) && /No combined safety score/.test(pages.rivers), 6);
check("River lens caveats stay activity-specific", /cannot determine navigability, hazards, required skill, access or paddling safety/.test(pages.rivers) && /No species, hatch, bite or fishability score/.test(pages.rivers) && /not a swim-safety determination/.test(pages.rivers), 6);
check("River historical and official forecast context remain visible", /same-date USGS historical percentiles/.test(pages.rivers) && /NOAA NWPS/.test(pages.rivers), 4);
check("River safety veto remains intact", /No gauge reading or derived lens can determine whether paddling, swimming, wading, fishing, or boating is safe/.test(apis.rivers) && /River intelligence is not a safety score/.test(pages.rivers), 6);
check("National dashboard carries richer river intelligence", /kicker:"River intelligence"/.test(dashboard) && /Water "/.test(dashboard) && /Turbidity /.test(dashboard), 4);
check("River function has extended runtime budget", Number(vercel.functions?.["api/national-rivers.js"]?.maxDuration) >= 25, 4);
check("River UI rejects non-JSON discovery and selected-detail responses cleanly", /readJsonResponse/.test(pages.rivers) && /River discovery unavailable/.test(pages.rivers) && /Selected river conditions unavailable/.test(pages.rivers), 4);
check("Shared national client parses API responses defensively", /async function readJsonResponse/.test(client) && /content-type/.test(client) && /HTTP /.test(client), 4);
check("National dashboard isolates non-JSON upstream failures", /readJsonResponse/.test(dashboard) && /Outdoor data source unavailable/.test(dashboard), 3);

check("Coastal API composes three independent NOAA source families", /marine_beachforecast_summary/.test(apis.coastal) && /activestations\.xml/.test(apis.coastal) && /data\/realtime2/.test(apis.coastal) && /mdapi\/prod\/webapi\/stations\.json\?type=tidepredictions/.test(apis.coastal) && /api\/prod\/datagetter/.test(apis.coastal), 7);
check("Coastal API isolates upstream failures", /Promise\.allSettled/.test(apis.coastal) && /degraded:/.test(apis.coastal) && /sources:/.test(apis.coastal), 5);
check("Coastal official beach risk cannot be overridden by observations", /dominant signal/.test(apis.coastal) && /do not override an official High risk/.test(apis.coastal) && /rip_swim_risk_code/.test(apis.coastal), 6);
check("Coastal observations preserve station distance and three-hour change", /distance_miles/.test(apis.coastal) && /change_3h/.test(apis.coastal) && /wave_height_ft/.test(apis.coastal) && /water_temperature_f/.test(apis.coastal), 5);
check("Coastal NDBC parser treats missing sensor values as missing", /v === "MM"/.test(apis.coastal) && /const missing =/.test(apis.coastal), 4);
check("Coastal tide context remains prediction with named datum", /product:"predictions"/.test(apis.coastal) && /interval:"hilo"/.test(apis.coastal) && /datum:"MLLW"/.test(apis.coastal) && /not observed water level/.test(pages.coastal), 5);
check("Coastal page preserves local safety authority", /official beach-risk forecast/i.test(pages.coastal) && /does not declare swimming or boating safe/.test(pages.coastal) && /Beach flags, closures, lifeguards/i.test(pages.coastal), 5);
check("Coastal page keeps Michigan canonical deeper", /\/great-lakes-beaches\//.test(pages.coastal) && /Michigan has a deeper beach network/.test(pages.coastal), 4);
check("Coastal analytics excludes raw location", /National Coastal Result/.test(pages.coastal) && /coverage:Boolean/.test(pages.coastal) && /sources_available/.test(pages.coastal) && !/National Coastal Result[^\n]{0,220}(?:latitude|longitude|query|place)/.test(pages.coastal), 4);
check("Coastal is optional in Decision Desk and absent inland", /function coastalCard/.test(dashboard) && /if\(!d\.coastal_available\)return null/.test(dashboard) && /api\/national-coastal/.test(dashboard) && /inputs_total:6/.test(dashboard), 6);
check("Coastal card can outrank routine context without becoming a universal score", /code==="high"\?97/.test(dashboard) && /code==="moderate"\?83/.test(dashboard) && /Official NWS High or Moderate beach risk/.test(JSON.stringify(contract.coastalProduct?.hardRules || [])), 4);
check("Coastal fits the existing bounded API runtime", Number(vercel.functions?.["api/**/*.js"]?.maxDuration) >= 10 && /beach\(0,lat,lon,"day1"\)/.test(apis.coastal) && /3500/.test(apis.coastal) && /3000/.test(apis.coastal), 3);
check("Coastal canonical is registered without Michigan cannibalization", registry.tools?.some((tool) => tool.id === "national-coastal" && tool.canonical === "https://chrisizworski.com/national-tools/coastal/") && registry.cannibalizationGroups?.some((group) => group.owner === "national-coastal" && group.supports?.includes("beach-report") && group.supports?.includes("great-lakes-buoys")), 5);

check("Frost includes spring and fall probabilities", /fall_10/.test(apis.frost) && /fall_50/.test(apis.frost) && /median first fall 32°F freeze/.test(pages.frost), 5);
check("Frost discovers NCEI stations before requesting normals", /access\/services\/search\/v1\/data/.test(apis.frost) && /parseSearchStationIds/.test(apis.frost) && /searchParams\.set\("stations"/.test(apis.frost), 6);
check("Frost Data Service no longer relies on bbox-only normals requests", /searchParams\.set\("stations"/.test(frostStationNormals) && !/searchParams\.set\("bbox"/.test(frostStationNormals), 5);
check("Frost visibly leads with both median freeze dates", /id="spring50"/.test(pages.frost) && /median last spring 32°F freeze/.test(pages.frost) && /id="fall50"/.test(pages.frost) && /median first fall 32°F freeze/.test(pages.frost), 5);
check("Frost exposes median growing-season length", /growing_season_days_50/.test(apis.frost) && /id="season50"/.test(pages.frost) && /median 32°F growing season/.test(pages.frost), 4);
check("Frost includes hard-freeze forecast", /hard_freeze_hours/.test(apis.frost) && /hours at or below 28°F/.test(pages.frost), 4);
check("Frost carries station-distance confidence", /station_fit/.test(apis.frost) && /confidence/.test(apis.frost) && /station confidence/.test(pages.frost), 4);
check("Frost exposes official 2023 USDA ZIP hardiness context", /PHZM_2023_Zip_Code_Table/.test(apis.frost) && /hardiness_zone/.test(apis.frost) && /id="hardiness-zone"/.test(pages.frost) && /2023 USDA/.test(pages.frost), 5);
check("Hardiness remains separate from frost-date semantics", /does not determine the last spring freeze, first fall freeze, or a safe planting date/.test(apis.frost) && /A zone does not tell you your last spring freeze or first fall freeze/.test(pages.frost), 5);
check("Frost UI uses defensive shared response parsing", /readJsonResponse/.test(pages.frost) && /Frost data unavailable/.test(pages.frost), 3);

check("Planting uses external crop rule dataset", /national-planting-crops\.json/.test(pages.planting) && !/const crops=\[\[/.test(pages.planting), 5);
check("Crop dataset has meaningful depth", Array.isArray(cropData.crops) && cropData.crops.length >= 18, 4, String(cropData.crops?.length || 0));
check("Crop dataset has multiple Extension sources", Array.isArray(cropData.sources) && cropData.sources.length >= 4 && cropData.sources.every((s) => /Extension/i.test(s.name)), 4);
check("Planting has a now-next decision surface", /What can I do now\?/.test(pages.planting) && /Hold outdoors/.test(pages.planting), 4);

check("Fall beta uses a historical timing band", /historicalWindow/.test(apis.fall) && /typical_window/.test(apis.fall) && /historical transition window/.test(pages.fall), 5);
check("Fall weather is explicitly separate", /do not mathematically shift the historical satellite date/.test(apis.fall) && /do not alter the historical satellite timing score/.test(pages.fall), 5);
check("Fall beta rejects fake current color", /not an observed 2026 leaf-color reading/.test(apis.fall) && /fake peak percentage|fake peak|invented/i.test(pages.fall), 5);
check("Fall exposes variability confidence", /median_absolute_deviation_days/.test(apis.fall) && /confidence/.test(apis.fall), 3);
check("Fall current observations use official USA-NPN status data", /services\.usanpn\.org\/npn_portal\/observations\/getObservations\.json/.test(apis.fallObservations) && /PHENOPHASE_ID = 498/.test(apis.fallObservations) && /method: "POST"/.test(apis.fallObservations), 5);
check("Fall current observations are geographically and temporally bounded", /LOOKBACK_DAYS = 21/.test(apis.fallObservations) && /RADIUS_MILES = 75/.test(apis.fallObservations) && /haversineMiles/.test(apis.fallObservations) && /bottom_left_x1/.test(apis.fallObservations), 4);
check("Fall observation conflicts are excluded without creating peak precision", /conflictFlag/.test(apis.fallObservations) && /filter\(\(row\) => !row\.conflict\)/.test(apis.fallObservations) && !/peak_percent|landscape_percent/.test(apis.fallObservations), 5);
check("Fall page loads current observations after the core answer", /async function loadObservations/.test(pages.fall) && /void loadObservations\(loc\)/.test(pages.fall) && /api\/national-fall-observations/.test(pages.fall) && /optional source failed independently/.test(pages.fall), 5);
check("Fall page keeps individual-plant observations separate from landscape timing", /individual monitored plants/i.test(pages.fall) && /never become a landscape/i.test(pages.fall) && /do not alter|never.*alter/i.test(pages.fall), 4);


check("Hub is a live multi-signal decision surface", /national-dashboard\.js/.test(pages.hub) && /Your outdoor desk/.test(pages.hub) && /data-desk-grid/.test(pages.hub), 5);
check("Hub compares two saved places across the same five signals", /id="place-compare"/.test(pages.hub) && /id="compare-a"/.test(pages.hub) && /id="compare-b"/.test(pages.hub) && /No overall winner or safety score/.test(pages.hub) && /D\.compare/.test(pages.hub), 5);
check("Comparison engine reuses independent tool contracts without duplicate desk analytics", /async function compare/.test(dashboard) && /load\(left,\{measure:false\}\)/.test(dashboard) && /load\(right,\{measure:false\}\)/.test(dashboard) && /National Places Compared/.test(dashboard), 5);
check("Comparison analytics exclude selected place identity", /National Places Compared",\{signals:5\}/.test(dashboard) && !/National Places Compared[^\n]{0,180}(?:query|latitude|longitude|place)/.test(dashboard), 4);
check("Comparison remains signal-by-signal and responsive", /\["aurora","Aurora"\]/.test(pages.hub) && /\["rivers","River"\]/.test(pages.hub) && /\["frost","Frost"\]/.test(pages.hub) && /\["planting","Planting"\]/.test(pages.hub) && /\["fall","Fall timing"\]/.test(pages.hub) && /compare-matrix/.test(nationalCss), 4);

check("Dashboard loads all five platform inputs independently", ["/api/national-aurora","/api/national-rivers","/api/national-frost","/api/national-fall-color","/data/national-planting-crops.json"].every((needle) => dashboard.includes(needle)) && /getJson/.test(dashboard), 5);
check("Dashboard orders by decision urgency, not a safety score", /sort\(function\(a,b\)\{return b\.priority-a\.priority\}/.test(dashboard) && /not a universal safety score/i.test(pages.hub), 4);
check("Dashboard shows independent source degradation", /if\(!result\.ok\)/.test(dashboard) && /platform inputs available/.test(dashboard), 4);
check("Hub exposes saved places without calling them alerts", /Saved places/.test(pages.hub) && /Save this place/.test(pages.hub) && !/alert me|notify me/i.test(pages.hub), 4);
check("River spatial context is keyless and selected-site only", /openstreetmap\.org\/export\/embed/.test(pages.rivers) && /orientation context only/.test(pages.rivers) && /Selected monitoring point/.test(pages.rivers), 4);
check("Phase 3 responsive decision UI exists", /decision-grid/.test(nationalCss) && /river-map-shell/.test(nationalCss), 2);

check("All APIs are noindex", Object.values(apis).every((x) => /X-Robots-Tag",\s*"noindex, nofollow"/.test(x)), 5);
check("Michigan handoffs remain", pages.aurora.includes("/northern-lights-michigan/") && pages.frost.includes("/michigan-frost-dates/") && pages.planting.includes("/zone-6a-planting-calendar/") && pages.fall.includes("/fall-color/"), 5);

const ids = new Set(registry.tools.map((tool) => tool.id));
check("National tools remain registered", ["national-aurora","national-rivers","national-frost","national-planting","national-fall-color"].every((id) => ids.has(id)), 4);
check("Smoke/AQ remains source-key gated", contract.phase2?.smokeAirQuality?.status === "source-key-gated" && contract.phase2?.smokeAirQuality?.indexableRouteCreated === false, 4);
const admissionWeight = Object.values(admission.weights || {}).reduce((sum, value) => sum + value, 0);
check("Location admission weights total 100", admissionWeight === 100 && admission.minimumScore === 80, 4, String(admissionWeight));
check("Location admission has hard vetoes and critical minimums", Array.isArray(admission.hardVetoes) && admission.hardVetoes.length >= 5 && admission.criticalMinimums?.cannibalizationSafety === 10, 4);
check("Saved places are explicitly not fake alerts", contract.phase3?.alerts?.status === "deferred-until-real-delivery-channel", 4);
check("Phase 3 device location remains manual-first and privacy bounded", contract.phase3?.location?.status === "manual-first-with-optional-device-location" && /rounded to 0\.001 degrees/.test(contract.phase3?.location?.rule || "") && /resolved place query/.test(contract.phase3?.location?.continuity || ""), 4);
check("Phase 3 place toolbar preserves canonical and privacy rules", contract.phase3?.placeToolbar?.status === "live" && /never latitude\/longitude/.test(contract.phase3?.placeToolbar?.shareRule || "") && /place names, ZIPs, and coordinates remain excluded/.test(contract.phase3?.placeToolbar?.analyticsRule || ""), 4);
check("Phase 3 comparison forbids winner and safety scoring", contract.phase3?.comparison?.status === "live" && /without producing an overall winner, universal score, or safety determination/.test(contract.phase3?.comparison?.rule || "") && /signal count only/.test(contract.phase3?.comparison?.measurement || "") && /creates no new indexable URL/.test(contract.phase3?.comparison?.indexability || ""), 4);
check("Fall observation enrichment stays optional and non-peak", contract.phase2?.fallCurrentObservations?.status === "optional-enrichment" && /never become a landscape percent-peak/.test(contract.phase2?.fallCurrentObservations?.rule || "") && /without waiting/.test(contract.phase2?.fallCurrentObservations?.failureMode || "") && /conflicting status records excluded/.test(contract.phase2?.fallCurrentObservations?.coverage || ""), 4);




check("Phase 3 measurement is instrumented without raw location payloads", contract.phase3?.measurement?.status === "instrumented-on-existing-vercel-analytics" && /Never send raw city\/ZIP/.test(contract.phase3?.measurement?.privacy || ""), 4);
const masterPrompt = await read("docs/NATIONAL_OUTDOOR_TOOLS_MASTER_PROMPT.md");
check("Master prompt remains the build doctrine", masterPrompt.includes("## 10. Product Value Function") && masterPrompt.includes("## 11. Loss Function") && masterPrompt.includes("## 14. National Outdoor Decision Desk") && masterPrompt.includes("### Core-before-enrichment rule") && masterPrompt.includes("Core authoritative decision data must not wait on optional enrichment") && masterPrompt.includes("Slow discovery may be precomputed"), 4);
check("River product contract forbids nearest-gauge auto-promotion", /Preserve river-first discovery/.test(masterPrompt) && /explicit river\/gauge selection/.test(masterPrompt) && /exact monitoring-point retrieval/.test(masterPrompt), 4);

const score = Math.round((rawScore / maxPoints) * 100);
const summary = { score, rawScore, maxPoints, failures, hardVetoes: contract.hardVetoes };
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
if (process.argv.includes("--check") && failures.length) process.exit(1);
