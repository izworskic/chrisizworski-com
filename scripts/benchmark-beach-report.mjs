import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(root, relative), "utf8");
const exists = async (relative) => access(path.join(root, relative)).then(() => true, () => false);

const [
  benchmark,
  catalog,
  api,
  library,
  client,
  css,
  mainPage,
  dailyPage,
  sitemap,
  robots,
  toolsPage,
  greatLakesPage,
  homePage,
  llms,
  scorecard,
] = await Promise.all([
  read("benchmarks/michigan-beach-report.json").then(JSON.parse),
  read("data/beaches.json").then(JSON.parse),
  read("api/beaches.js"),
  read("lib/beach-report.js"),
  read("public/assets/beach-report.js"),
  read("public/assets/beach-report.css"),
  read("public/great-lakes-beaches/index.html"),
  read("public/best-michigan-beaches-today/index.html"),
  read("public/sitemap-beaches.xml"),
  read("public/robots.txt"),
  read("public/tools/index.html"),
  read("public/great-lakes/index.html"),
  read("public/index.html"),
  read("public/llms.txt"),
  read("docs/michigan-beach-report-scorecard.md"),
]);

const all = (...conditions) => conditions.every(Boolean);
const has = (text, pattern) => pattern.test(text);
const detailDirectories = await readdir(path.join(root, "public", "great-lakes-beaches"), { withFileTypes: true });
const generatedSlugs = new Set(detailDirectories.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
const detailFilesPresent = (
  await Promise.all(catalog.beaches.map((beach) => exists(`public/great-lakes-beaches/${beach.slug}/index.html`)))
).every(Boolean);

const evaluators = {
  live_inputs: () => all(
    has(api, /BEACHGUARD_SEARCH/),
    has(api, /NWS_ALERT_AREAS/),
    has(api, /NWS_SURF_OFFICES/),
    has(api, /products\/types\/SRF/),
    has(api, /NDBC_LATEST/),
    has(api, /open-meteo\.com/),
  ),
  catalog_depth: () => catalog.beaches.length >= 50 && new Set(catalog.beaches.map((beach) => beach.slug)).size === catalog.beaches.length,
  exploration_tools: () => all(
    has(mainPage, /id="beachSearch"/),
    has(mainPage, /id="lakeFilter"/),
    has(mainPage, /data-trait-filter=/),
    has(client, /navigator\.geolocation/),
    has(client, /L\.map|window\.L\.map/),
  ),
  daily_decision: () => all(has(api, /daily_top_slugs/), has(dailyPage, /id="dailyList"/), has(client, /season\.active/)),
  official_overrides: () => all(
    has(library, /if \(waterQuality\?\.state === "closure"\) \{[\s\S]{0,160}score: 0/),
    has(library, /waterQuality\?\.state === "advisory"[\s\S]{0,100}Math\.min\(score, 20\)/),
    has(library, /if \(hazards\.length\)/),
    has(api, /water_quality\.state === "no-active-alert"/),
    has(api, /rating\.eligible === true/),
    has(api, /rankingInputsLive/),
  ),
  no_false_all_clear: () => all(
    has(api, /not a guarantee of safe water/i),
    has(api, /Do not interpret unavailable data as an all-clear/i),
    has(mainPage, /does not mean a recent water sample exists/i),
    !has(mainPage + dailyPage, />[^<]*(safe to swim|water is safe|safe for swimming)[^<]*</i),
  ),
  freshness_provenance: () => all(
    has(library, /ageHours <= 6/),
    has(client, /station_id/),
    has(client, /distance_miles/),
    has(client, /swimRisk\.issued_at/),
    has(client, /swimRisk\.zone_name/),
    has(mainPage, /id="sourceHealth"/),
  ),
  swim_risk_flag_truth: () => all(
    has(api, /NWS_ALERT_AREAS/),
    has(api, /products\/types\/SRF/),
    has(library, /special weather statement/i),
    has(library, /swimRisk\?\.status === "high"/),
    has(library, /swimRisk\?\.status === "low"/),
    has(library, /Posted DNR flag: check at the beach/),
    has(api, /beach\.swim_risk\.status === "low"/),
    has(mainPage + dailyPage, /forecast is not the posted flag/i),
  ),
  bounded_parallel_fetches: () => all(
    has(api, /Promise\.allSettled/),
    has(api, /AbortSignal\.timeout/),
    has(api, /s-maxage=600/),
  ),
  stale_observation_guard: () => all(
    has(library, /ageHours != null && ageHours <= 6/),
    has(library, /const dataComplete = Boolean\(weatherComplete && lakeObservationComplete\)/),
    has(library, /if \(!dataComplete\) \{[\s\S]{0,2600}score: null/),
    has(library, /score: null,[\s\S]{0,1200}eligible: false,[\s\S]{0,100}data_complete: false/),
    has(api, /rating\.eligible === true/),
    has(mainPage + dailyPage, /score is N\/A/i),
  ),
  graceful_degradation: () => all(
    has(api, /status: "unavailable"/),
    has(api, /Promise\.allSettled/),
    has(client, /function errorHtml/),
    has(client, /Official water-quality feed is unavailable/),
  ),
  responsive_accessible_ui: () => all(
    has(css, /@media \(max-width: 720px\)/),
    has(css, /prefers-reduced-motion/),
    has(css, /:focus-visible/),
    has(mainPage, /<label/),
    has(mainPage, /<dialog/),
    has(mainPage, /skip-link/),
  ),
  progressive_fallbacks: () => all(
    has(css, /\.skeleton/),
    has(client, /empty-state/),
    has(client, /Location access was not available/),
    has(client, /Live conditions could not load/),
    has(mainPage, /<noscript>/),
  ),
  credible_visual: () => all(
    has(css, /sleeping-bear-beach-nps\.jpg/),
    has(mainPage, /National Park Service/),
    awaitableImage,
  ),
  structured_main_pages: () => all(
    has(mainPage, /rel="canonical"/),
    has(mainPage, /FAQPage/),
    has(mainPage, /BreadcrumbList/),
    has(dailyPage, /rel="canonical"/),
    has(dailyPage, /FAQPage/),
  ),
  detail_index: () => all(
    catalog.beaches.length >= 50,
    detailFilesPresent,
    catalog.beaches.every((beach) => generatedSlugs.has(beach.slug) && sitemap.includes(`/great-lakes-beaches/${beach.slug}/`)),
    has(sitemap, /<lastmod>/),
  ),
  internal_discovery: () => all(
    has(toolsPage, /Michigan Beach Report/),
    has(greatLakesPage, /Michigan Beach Report/),
    has(homePage, /Michigan Beach Report/),
    has(llms, /Michigan Beach Report/),
    has(robots, /sitemap-beaches\.xml/i),
  ),
  season_switch: () => all(
    catalog.season.start === "05-15",
    catalog.season.end === "09-15",
    has(library, /today >= start && today <= end/),
    has(client, /Daily picks return May 15/),
    has(mainPage, /Live all year/),
  ),
  intent_analytics: () => ["Beach Search", "Beach Near Me", "Beach Detail Open", "Daily Pick Open"].every((event) => client.includes(event)),
  measurement_plan: () => all(
    has(scorecard, /Search-to-detail engagement/),
    has(scorecard, /Location utility adoption/),
    has(scorecard, /False “all-clear”/),
    has(scorecard, /90\/100/),
  ),
};

const awaitableImage = await exists("public/assets/beach-report/sleeping-bear-beach-nps.jpg");
const categories = [];
let score = 0;

for (const category of benchmark.categories) {
  const weight = category.checks.reduce((sum, check) => sum + check.points, 0);
  if (weight !== category.weight) throw new Error(`${category.name} check points (${weight}) do not equal category weight (${category.weight}).`);
  let earned = 0;
  const checks = [];
  for (const check of category.checks) {
    const evaluator = evaluators[check.id];
    if (!evaluator) throw new Error(`No evaluator exists for ${check.id}.`);
    const passed = Boolean(evaluator());
    if (passed) earned += check.points;
    checks.push({ ...check, passed });
  }
  score += earned;
  categories.push({ ...category, earned, checks });
}

const definedMaximum = benchmark.categories.reduce((sum, category) => sum + category.weight, 0);
if (definedMaximum !== benchmark.maximum_score) throw new Error(`Benchmark weights total ${definedMaximum}, expected ${benchmark.maximum_score}.`);

console.log(`Michigan Beach Report benchmark: ${score}/${benchmark.maximum_score}`);
console.log(`Legacy baseline: ${benchmark.baseline.score}/${benchmark.maximum_score} · Launch: ${benchmark.launch_threshold} · Stretch: ${benchmark.stretch_target}`);
console.log("");
for (const category of categories) {
  console.log(`${category.earned === category.weight ? "PASS" : "PART"}  ${String(category.earned).padStart(2)}/${category.weight}  ${category.name}`);
  for (const check of category.checks.filter((item) => !item.passed)) console.log(`      MISS ${check.id}: ${check.description}`);
}

if (process.argv.includes("--check") && score < benchmark.launch_threshold) {
  console.error(`\nLaunch benchmark failed: ${score} is below ${benchmark.launch_threshold}.`);
  process.exitCode = 1;
} else if (process.argv.includes("--check")) {
  console.log(`\nLaunch benchmark passed by ${score - benchmark.launch_threshold} points.`);
}
