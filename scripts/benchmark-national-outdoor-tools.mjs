#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel) => readFile(path.join(root, rel), "utf8");
const contract = JSON.parse(await read("benchmarks/national-outdoor-tools.json"));
const cropData = JSON.parse(await read("public/data/national-planting-crops.json"));
const shared = await read("lib/national-outdoor.js");
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
  frost: await read("api/national-frost.js"),
  fall: await read("api/national-fall-color.js"),
};

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

check("Aurora has best dark weather window", /bestCloudWindow/.test(apis.aurora) && /best_dark_window/.test(apis.aurora) && /Best weather window after dark/.test(pages.aurora), 5);
check("Aurora separates Kp from visibility", /Kp is not a local visibility forecast|Kp is not a local visibility probability|Kp is not a local forecast/.test(pages.aurora + apis.aurora), 4);
check("Aurora includes moon context", /U\.S\. Naval Observatory|moon/.test(apis.aurora) && /moon illumination/.test(pages.aurora), 3);
check("Aurora sources expose stale semantics", /staleAfterMinutes/.test(apis.aurora) && /sources:/.test(apis.aurora), 3);

check("Rivers include same-date historical percentiles", /dailyStatistics/.test(apis.rivers) && /P10,P25,P50,P75,P90/.test(apis.rivers) && /historical_comparison/.test(apis.rivers), 5);
check("Rivers match NWPS by exact USGS ID", /byUsgs/.test(apis.rivers) && /usgsId/.test(apis.rivers) && /stageflow\/forecast/.test(apis.rivers), 5);
check("River UI exposes history and official forecast", /(?:same-date historical percentiles|daily percentiles for this calendar date)/i.test(pages.rivers) && /NOAA NWPS/.test(pages.rivers), 4);
check("River safety veto remains intact", /cannot determine whether paddling.*safe/i.test(apis.rivers) && /does not mean runnable, fishable, wadable, or safe/i.test(pages.rivers), 5);

check("Frost includes spring and fall probabilities", /fall_10/.test(apis.frost) && /fall_50/.test(apis.frost) && /median first 32°F freeze/.test(pages.frost), 5);
check("Frost includes hard-freeze forecast", /hard_freeze_hours/.test(apis.frost) && /hours at or below 28°F/.test(pages.frost), 4);
check("Frost carries station-distance confidence", /station_fit/.test(apis.frost) && /confidence/.test(apis.frost) && /station confidence/.test(pages.frost), 4);
check("Hardiness is not a frost date", /do not determine your spring planting date/.test(apis.frost), 4);

check("Planting uses external crop rule dataset", /national-planting-crops\.json/.test(pages.planting) && !/const crops=\[\[/.test(pages.planting), 5);
check("Crop dataset has meaningful depth", Array.isArray(cropData.crops) && cropData.crops.length >= 18, 4, String(cropData.crops?.length || 0));
check("Crop dataset has multiple Extension sources", Array.isArray(cropData.sources) && cropData.sources.length >= 4 && cropData.sources.every((s) => /Extension/i.test(s.name)), 4);
check("Planting has a now-next decision surface", /What can I do now\?/.test(pages.planting) && /Hold outdoors/.test(pages.planting), 4);

check("Fall beta uses a historical timing band", /historicalWindow/.test(apis.fall) && /typical_window/.test(apis.fall) && /historical transition window/.test(pages.fall), 5);
check("Fall weather is explicitly separate", /do not mathematically shift the historical satellite date/.test(apis.fall) && /do not alter the historical satellite timing score/.test(pages.fall), 5);
check("Fall beta rejects fake current color", /not an observed 2026 leaf-color reading/.test(apis.fall) && /fake peak percentage|fake peak|invented/i.test(pages.fall), 5);
check("Fall exposes variability confidence", /median_absolute_deviation_days/.test(apis.fall) && /confidence/.test(apis.fall), 3);

check("All APIs are noindex", Object.values(apis).every((x) => /X-Robots-Tag",\s*"noindex, nofollow"/.test(x)), 5);
check("Michigan handoffs remain", pages.aurora.includes("/northern-lights-michigan/") && pages.frost.includes("/michigan-frost-dates/") && pages.planting.includes("/zone-6a-planting-calendar/") && pages.fall.includes("/fall-color/"), 5);

const ids = new Set(registry.tools.map((tool) => tool.id));
check("National tools remain registered", ["national-aurora","national-rivers","national-frost","national-planting","national-fall-color"].every((id) => ids.has(id)), 4);
check("Smoke/AQ remains source-key gated", contract.phase2?.smokeAirQuality?.status === "source-key-gated" && contract.phase2?.smokeAirQuality?.indexableRouteCreated === false, 4);
check("Master prompt remains the build doctrine", (await read("docs/NATIONAL_OUTDOOR_TOOLS_MASTER_PROMPT.md")).includes("## Loss function"), 3);

const score = Math.round((rawScore / maxPoints) * 100);
const summary = { score, rawScore, maxPoints, failures, hardVetoes: contract.hardVetoes };
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
if (process.argv.includes("--check") && failures.length) process.exit(1);
