#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel) => readFile(path.join(root, rel), "utf8");
const contract = JSON.parse(await read("benchmarks/national-outdoor-tools.json"));
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
const registry = JSON.parse(await read("benchmarks/tool-network-registry.json"));
const pages = {
  hub: await read("public/national-tools/index.html"),
  aurora: await read("public/national-tools/aurora/index.html"),
  rivers: await read("public/national-tools/rivers/index.html"),
  frost: await read("public/national-tools/frost/index.html"),
  planting: await read("public/national-tools/planting/index.html"),
  fall: await read("public/national-tools/fall-color/index.html"),
};
const apis = {
  geocode: await read("api/national-geocode.js"),
  aurora: await read("api/national-aurora.js"),
  rivers: await read("api/national-rivers.js"),
  riverContext: await read("api/national-river-context.js"),
  frost: await read("api/national-frost.js"),
  fall: await read("api/national-fall-color.js"),
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
check("Phase 2 adds no indexable route family", contract.indexPolicy?.phase2AddsIndexableRoutes === false, 4);
check("Phase 3 adds no indexable route family", contract.indexPolicy?.phase3AddsIndexableRoutes === false, 4);

const routes = [
  "/national-tools/",
  "/national-tools/aurora/",
  "/national-tools/rivers/",
  "/national-tools/frost/",
  "/national-tools/planting/",
  "/national-tools/fall-color/",
];
check("Only deliberate Phase 1 entry routes are required", routes.every((r) => sitemap.includes(`<loc>https://chrisizworski.com${r}</loc>`)), 5);
check("No generated national location tree shipped", !/national-tools\/(?:aurora|rivers|frost|planting|fall-color)\/(?:[a-z]{2}|city|zip)\//i.test(sitemap), 5);

for (const [name, body] of Object.entries(pages)) {
  const title = (body.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
  const desc = (body.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "";
  check(`${name} title length`, title.length > 0 && title.length <= 60, 1, `${title.length}: ${title}`);
  check(`${name} description length`, desc.length > 0 && desc.length <= 158, 1, String(desc.length));
  check(`${name} canonical Person`, body.includes('"@id":"https://chrisizworski.com/#person"'), 1);
  check(`${name} freshness stamp`, body.includes('"dateModified":"2026-08-31"'), 1);
  check(`${name} visible authorship`, body.includes('class="brand" href="/">Chris Izworski</a>'), 1);
}

check("Shared data helpers expose freshness contract", /sourceMeta/.test(shared) && /stale_after_minutes/.test(shared) && /source_status/.test(shared), 5);
check("Location object includes timezone context", /timeZone/.test(apis.geocode) && /api\.weather\.gov\/points/.test(apis.geocode), 3);
check("National client persists saved places locally", /PLACES_STORE/.test(client) && /savedPlaces/.test(client) && /savePlace/.test(client), 4);
check("Location continuity crosses national tools without new canonicals", /function propagate/.test(client) && /withQuery/.test(client) && /a\[href\^="\/national-tools\/"\]/.test(client), 4);
check("Decision times can render in searched timezone", /fmtInZone/.test(client) && /timeZone/.test(client), 3);

check("Aurora has best dark weather window", /bestCloudWindow/.test(apis.aurora) && /best_dark_window/.test(apis.aurora) && /Best weather window after dark/.test(pages.aurora), 5);
check("Aurora separates Kp from visibility", /Kp is not a local visibility forecast|Kp is not a local visibility probability|Kp is not a local forecast/.test(pages.aurora + apis.aurora), 4);
check("Aurora includes moon context", /U\.S\. Naval Observatory|moon/.test(apis.aurora) && /moon illumination/.test(pages.aurora), 3);
check("Aurora sources expose stale semantics", /staleAfterMinutes/.test(apis.aurora) && /sources:/.test(apis.aurora), 3);
check("Aurora page survives stale shared timezone helper", /typeof N\.fmtInZone===["']function["']/.test(pages.aurora), 4);
check("Aurora exposes NOAA auroral oval visual", /national-oval-img/.test(pages.aurora) && /aurora-forecast-northern-hemisphere\.jpg/.test(pages.aurora), 4);
check("Auroral oval does not become fake sighting probability", /not a sighting probability/i.test(pages.aurora) && /modeled intensity/i.test(pages.aurora), 4);
check("National entry pages cache-bust shared runtime assets", Object.values(pages).every((body) => /national-tools\.js\?v=[^"']+/.test(body)), 3);

check("Rivers preserve same-date historical percentiles in optional context", /dailyStatistics/.test(apis.riverContext) && /p10,p25,p50,p75,p90/i.test(apis.riverContext) && /historical_daily_flow/.test(pages.rivers), 5);
check("River discovery index has national depth", riverIndex.site_count >= 9000 && Array.isArray(riverIndex.sites) && riverIndex.sites.length === riverIndex.site_count, 5, String(riverIndex.site_count));
check("River discovery index is source-backed active USGS streamflow inventory", riverIndex.source_name === "USGS Site Service" && /waterservices\.usgs\.gov\/nwis\/site/.test(riverIndex.source_url || "") && riverIndex.criteria?.siteType === "ST" && riverIndex.criteria?.siteStatus === "active" && riverIndex.criteria?.hasDataTypeCd === "iv" && riverIndex.criteria?.parameterCd === "00060", 5);
check("River index generator preserves USGS source criteria", /nwis\/site/.test(riverIndexGenerator) && /siteStatus.*active/s.test(riverIndexGenerator) && /parameterCd.*00060/s.test(riverIndexGenerator) && /siteType.*ST/s.test(riverIndexGenerator), 4);
check("River core uses local index for nearest-gauge discovery", /national-usgs-streamflow-sites\.json/.test(apis.rivers) && /function nearestSites/.test(apis.rivers) && /distance_miles/.test(apis.rivers), 5);
check("River core has no live gauge-discovery network call", !/const\s+SITE\s*=/.test(apis.rivers) && !/new URL\([^)]*nwis\/site/.test(apis.rivers) && !/bBox/.test(apis.rivers) && !/siteSearch/.test(apis.rivers), 6);
check("River live request remains exact-site USGS IV", /nwis\/iv/.test(apis.rivers) && /searchParams\.set\("sites"/.test(apis.rivers) && /searchParams\.set\("period", "P1D"\)/.test(apis.rivers), 5);
check("River exact-site observation request has bounded timeout", /fetchJson\(url, 2500\)/.test(apis.rivers), 4);
check("River core adds real multi-signal USGS parameters", ["00010","63680","00300","00095","00400"].every((code) => apis.rivers.includes(code)) && /sensor_availability/.test(apis.rivers), 6);
check("River sensor values are conditional rather than fabricated defaults", /water_temperature:\s*null/.test(apis.rivers) && /turbidity:\s*null/.test(apis.rivers) && /dissolved_oxygen:\s*null/.test(apis.rivers) && /specific_conductance:\s*null/.test(apis.rivers) && /ph:\s*null/.test(apis.rivers), 5);
check("River core computes observed 6h and 24h change", /trend_percent_6h/.test(apis.rivers) && /trend_percent_24h/.test(apis.rivers) && /gage_height_change_24h_ft/.test(apis.rivers), 5);
check("River core excludes historical NOAA and weather network calls", !/nwis\/stat/.test(apis.rivers) && !/api\.water\.noaa\.gov/.test(apis.rivers) && !/api\.weather\.gov/.test(apis.rivers) && /context_pending/.test(apis.rivers), 5);
check("River optional context carries USGS history NOAA NWPS and NWS weather", /nwis\/stat/.test(apis.riverContext) && /api\.water\.noaa\.gov/.test(apis.riverContext) && /api\.weather\.gov/.test(apis.riverContext) && /stageflow\/forecast/.test(apis.riverContext) && /weatherContext/.test(apis.riverContext), 6);
check("River official forecast trajectory stays distinct from observations", /normalizeForecastTrend/.test(apis.riverContext) && /forecast_trend/.test(apis.riverContext) && /Official forecast trend/.test(pages.rivers), 4);
check("River UI renders core before loading optional context", /render\(d,loc,Boolean\(d\.context_pending\)\)/.test(pages.rivers) && /if\(d\.context_pending\)loadContext\(d,loc\)/.test(pages.rivers), 5);
check("River UI leads with what changed and what is next", /What changed\?/.test(pages.rivers) && /What’s next\?/.test(pages.rivers) && /Observed movement/.test(pages.rivers), 5);
check("River UI exposes conditional water-quality sensor panel", /Available water sensors/.test(pages.rivers) && /Dissolved oxygen/.test(pages.rivers) && /Conductivity/.test(pages.rivers) && /Turbidity/.test(pages.rivers), 5);
check("River activity lenses reuse facts without a combined score", [["general","General"],["paddle","Paddle"],["fish","Fish"],["swim","Swim"],["ecology","Ecology"],["trip","Trip"]].every(([id,label]) => pages.rivers.includes('["'+id+'","'+label+'"]')) && /No combined safety score/.test(pages.rivers), 6);
check("River lens caveats stay activity-specific", /cannot determine navigability, hazards, required skill, access or paddling safety/.test(pages.rivers) && /No species, hatch, bite or fishability score/.test(pages.rivers) && /not a swim-safety determination/.test(pages.rivers), 6);
check("River historical and official forecast context remain visible", /same-date USGS historical percentiles/.test(pages.rivers) && /NOAA NWPS/.test(pages.rivers), 4);
check("River safety veto remains intact", /No gauge reading or derived lens can determine whether paddling, swimming, wading, fishing, or boating is safe/.test(apis.rivers) && /River intelligence is not a safety score/.test(pages.rivers), 6);
check("National dashboard carries richer river intelligence", /kicker:"River intelligence"/.test(dashboard) && /Water "/.test(dashboard) && /Turbidity /.test(dashboard), 4);
check("River function has extended runtime budget", Number(vercel.functions?.["api/national-rivers.js"]?.maxDuration) >= 25, 4);
check("River UI rejects non-JSON server responses cleanly", /readJsonResponse/.test(pages.rivers) && /River conditions unavailable/.test(pages.rivers), 4);
check("Shared national client parses API responses defensively", /async function readJsonResponse/.test(client) && /content-type/.test(client) && /HTTP /.test(client), 4);
check("National dashboard isolates non-JSON upstream failures", /readJsonResponse/.test(dashboard) && /Outdoor data source unavailable/.test(dashboard), 3);

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

check("Hub is a live multi-signal decision surface", /national-dashboard\.js/.test(pages.hub) && /Your outdoor desk/.test(pages.hub) && /data-desk-grid/.test(pages.hub), 5);
check("Dashboard loads all five platform inputs independently", ["/api/national-aurora","/api/national-rivers","/api/national-frost","/api/national-fall-color","/data/national-planting-crops.json"].every((needle) => dashboard.includes(needle)) && /getJson/.test(dashboard), 5);
check("Dashboard orders by decision urgency, not a safety score", /sort\(function\(a,b\)\{return b\.priority-a\.priority\}/.test(dashboard) && /not a universal safety score/i.test(pages.hub), 4);
check("Dashboard shows independent source degradation", /if\(!result\.ok\)/.test(dashboard) && /platform inputs available/.test(dashboard), 4);
check("Hub exposes saved places without calling them alerts", /Saved places/.test(pages.hub) && /Save this place/.test(pages.hub) && !/alert me|notify me/i.test(pages.hub), 4);
check("River spatial context is keyless and fail-soft", /openstreetmap\.org\/export\/embed/.test(pages.rivers) && /orientation context only/.test(pages.rivers) && /primary-gauge/.test(pages.rivers), 4);
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
const masterPrompt = await read("docs/NATIONAL_OUTDOOR_TOOLS_MASTER_PROMPT.md");
check("Master prompt remains the build doctrine", masterPrompt.includes("## Loss function") && masterPrompt.includes("## Phase 3 platform interpretation") && masterPrompt.includes("Core decision data must not wait on optional enrichment") && masterPrompt.includes("Slow discovery may be precomputed"), 4);

const score = Math.round((rawScore / maxPoints) * 100);
const summary = { score, rawScore, maxPoints, failures, hardVetoes: contract.hardVetoes };
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
if (process.argv.includes("--check") && failures.length) process.exit(1);
