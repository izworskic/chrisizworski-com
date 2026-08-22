#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (path) => readFileSync(path, "utf8");
const write = (path, value) => writeFileSync(path, value);
const readJson = (path) => JSON.parse(read(path));
const writeJson = (path, value) => write(path, JSON.stringify(value, null, 2) + "\n");

const pagePath = "public/fall-color-northern-lights-michigan/index.html";
let page = read(pagePath);
const replacements = [
  ["<title>Michigan Fall Color and Northern Lights: 2026 Peak Overlap</title>", "<title>Michigan Fall Color &amp; Northern Lights 2026: Best Overlap</title>"],
  ["<meta name=\"description\" content=\"Late September in Michigan's Upper Peninsula is the one window when fall color and aurora season overlap. Where to go and how to read both forecasts.\">", "<meta name=\"description\" content=\"See when Michigan fall color and northern lights overlap in the Upper Peninsula, then check the live fall-color map and aurora forecast before you drive.\">"],
  ["<meta property=\"og:title\" content=\"Michigan Fall Color and Northern Lights: 2026 Peak Overlap\">", "<meta property=\"og:title\" content=\"Michigan Fall Color &amp; Northern Lights 2026: Best Overlap\">"],
  ["<meta property=\"og:description\" content=\"Late September in Michigan's Upper Peninsula is the one window when fall color and aurora season overlap. Where to go and how to read both forecasts.\">", "<meta property=\"og:description\" content=\"See when Michigan fall color and northern lights overlap in the Upper Peninsula, then check the live fall-color map and aurora forecast before you drive.\">"],
  ["\"name\": \"Michigan Fall Color and Northern Lights: 2026 Peak Overlap\"", "\"name\": \"Michigan Fall Color & Northern Lights 2026: Best Overlap\""],
  ["\"description\": \"Late September in Michigan's Upper Peninsula is the one window when fall color and aurora season overlap. Where to go and how to read both forecasts.\"", "\"description\": \"See when Michigan fall color and northern lights overlap in the Upper Peninsula, then check the live fall-color map and aurora forecast before you drive.\""],
  ["\"dateModified\": \"2026-08-10\"", "\"dateModified\": \"2026-08-22\""],
  ["<h1>Fall Color and Northern Lights in Michigan: The Equinox Double Feature</h1>", "<h1>Michigan Fall Color and Northern Lights: Best Overlap Window</h1>"],
  ["<p>For about two weeks in late September, the Upper Peninsula offers something the rest of the year does not: hardwood color at or near peak during the statistically strongest aurora window of the year. This is how to plan for both at once.</p>", "<p><strong>The best chance to combine Michigan fall color and northern lights is late September into early October in the Upper Peninsula.</strong> Color is seasonal and aurora is event-driven, so use the live fall-color map and the current northern-lights forecast together before committing to the drive.</p>"]
];
for (const [from, to] of replacements) {
  if (!page.includes(from) && !page.includes(to)) throw new Error("Fall/aurora page anchor missing: " + from.slice(0, 90));
  page = page.replace(from, to);
}
const callout = '<div class="callout" id="fall-aurora-live-answer"><strong>Check both before you go:</strong> open the <a href="/fall-color/">live Michigan Fall Color map</a> for current canopy timing, then open the <a href="/northern-lights-michigan/">Michigan Northern Lights forecast</a> for the current aurora and cloud setup. A good color weekend is not automatically a good aurora night.</div>\n\n';
const wrapAnchor = '<div class="wrap">\n\n';
if (!page.includes('id="fall-aurora-live-answer"')) {
  if (!page.includes(wrapAnchor)) throw new Error("Fall/aurora wrap anchor missing");
  page = page.replace(wrapAnchor, wrapAnchor + callout);
}
write(pagePath, page);

const experiment = {
  version: "1.0.0",
  updated: "2026-08-22",
  timezone: "America/Detroit",
  objective: "Convert an existing page-one fall-color plus northern-lights crossover result into qualified clicks without changing the protected Fall Color hub or Northern Lights page.",
  source: {
    title: "chrisizworski.com-Performance-on-Search-2026-08-21",
    spreadsheetId: "1lrFEAxYT7whMAx2Gnrq-IRfUHr7cjshU542FWwJ7Kfw",
    exportedThrough: "2026-08-19",
    windowDays: 7,
    note: "The page baseline is page-scoped. The export does not provide a page-query join, so no sitewide query row is attributed to this page."
  },
  path: "/fall-color-northern-lights-michigan/",
  baseline: { impressions: 90, clicks: 0, ctr: 0, averagePosition: 8.28 },
  treatment: {
    type: "page-one-ctr",
    title: "Michigan Fall Color & Northern Lights 2026: Best Overlap",
    h1: "Michigan Fall Color and Northern Lights: Best Overlap Window",
    firstAnswer: "The best chance to combine Michigan fall color and northern lights is late September into early October in the Upper Peninsula.",
    utilityHandoffs: ["/fall-color/", "/northern-lights-michigan/"],
    protectedNeighborsUnchanged: ["/fall-color/", "/northern-lights-michigan/"]
  },
  targets: {
    evaluationWindowDays: 28,
    ctrAtOrAbove: 0.02,
    stretchCtrAtOrAbove: 0.03,
    averagePositionAtOrBetterThan: 10,
    stopLossAveragePositionWorseThan: 12.5
  }
};
writeJson("benchmarks/fall-aurora-ctr-experiment.json", experiment);

const benchmarkScript = `#!/usr/bin/env node\n\nimport { readFile } from "node:fs/promises";\nimport path from "node:path";\n\nconst root = path.resolve(import.meta.dirname, "..");\nconst read = (file) => readFile(path.join(root, file), "utf8");\nconst page = await read("public/fall-color-northern-lights-michigan/index.html");\nconst experiment = JSON.parse(await read("benchmarks/fall-aurora-ctr-experiment.json"));\nconst ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));\nconst failures = [];\nconst check = (name, pass) => { if (!pass) failures.push(name); };\ncheck("canonical preserved", page.includes('<link rel="canonical" href="https://chrisizworski.com/fall-color-northern-lights-michigan/">'));\ncheck("title treatment", page.includes('<title>Michigan Fall Color &amp; Northern Lights 2026: Best Overlap</title>'));\ncheck("H1 treatment", page.includes('<h1>Michigan Fall Color and Northern Lights: Best Overlap Window</h1>'));\ncheck("direct answer", page.includes('The best chance to combine Michigan fall color and northern lights is late September into early October in the Upper Peninsula.'));\ncheck("live fall handoff", page.includes('href="/fall-color/"'));\ncheck("live aurora handoff", page.includes('href="/northern-lights-michigan/"'));\ncheck("baseline exact", experiment.baseline.impressions === 90 && experiment.baseline.clicks === 0 && experiment.baseline.averagePosition === 8.28);\ncheck("CTR target explicit", experiment.targets.ctrAtOrAbove === 0.02 && experiment.targets.averagePositionAtOrBetterThan === 10);\nconst ledgerExperiment = ledger.experiments.find((item) => item.id === "2026-08-22-fall-aurora-overlap-ctr");\ncheck("ledger protection exists", ledgerExperiment?.status === "pending-clean-window" && ledgerExperiment?.paths?.includes("/fall-color-northern-lights-michigan/"));\nconsole.log("\\nFALL + AURORA CTR BENCHMARK");\nconsole.log("=".repeat(72));\nconsole.log("Baseline: 90 impressions, 0 clicks, position 8.28");\nconsole.log("Target: CTR >= 2.0%, position <= 10");\nif (failures.length) { console.log("Failures:"); for (const failure of failures) console.log(" - " + failure); }\nif (process.argv.includes("--check")) { if (failures.length) process.exitCode = 1; else console.log("benchmark:fall-aurora-ctr PASS\\n"); }\n`;
write("scripts/benchmark-fall-aurora-ctr.mjs", benchmarkScript);

const ledgerPath = "benchmarks/growth-experiments.json";
const ledger = readJson(ledgerPath);
if (!ledger.experiments.some((item) => item.id === "2026-08-22-fall-aurora-overlap-ctr")) {
  ledger.experiments.push({
    id: "2026-08-22-fall-aurora-overlap-ctr",
    paths: ["/fall-color-northern-lights-michigan/"],
    hypothesis: "A clearer overlap-window snippet plus immediate handoffs to the live fall-color and aurora tools will convert an existing position-8 result that currently earns impressions but no clicks.",
    primaryMetric: "Search Console page CTR while holding page-one average position",
    baseline: { windowDays: 7, impressions: 90, clicks: 0, ctr: 0, averagePosition: 8.28 },
    target: { ctr: 0.02, stretchCtr: 0.03, averagePositionMax: 10 },
    status: "pending-clean-window",
    releaseDate: null,
    evaluationWindow: null,
    lastSearchFacingChangeDate: "2026-08-22",
    decisionDate: null,
    result: null,
    stopCondition: "Average position worsens beyond 12.5 after a meaningful sample, CTR remains effectively zero after the clean window, canonical changes, or the treatment weakens the protected Fall Color or Northern Lights owners."
  });
  ledger.ledgerVersion = "1.11.0";
  writeJson(ledgerPath, ledger);
}

const portfolioPath = "benchmarks/search-authority-portfolio.json";
const portfolio = readJson(portfolioPath);
if (!portfolio.protectedQueue.some((item) => item.toLowerCase().includes("fall color + northern lights"))) {
  portfolio.protectedQueue.push("Fall Color + Northern Lights crossover CTR treatment — position 8.28 baseline, protect through clean 28-day window");
}
writeJson(portfolioPath, portfolio);

const sitemapPath = "public/sitemap.xml";
let sitemap = read(sitemapPath);
const sitemapRe = /(<loc>https:\/\/chrisizworski\.com\/fall-color-northern-lights-michigan\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/;
if (sitemapRe.test(sitemap)) sitemap = sitemap.replace(sitemapRe, "$12026-08-22$2");
write(sitemapPath, sitemap);

const pkgPath = "package.json";
const pkg = readJson(pkgPath);
pkg.scripts["benchmark:fall-aurora-ctr"] = "node scripts/benchmark-fall-aurora-ctr.mjs";
if (!pkg.scripts["verify:all"].includes("benchmark:fall-aurora-ctr")) pkg.scripts["verify:all"] += " && npm run benchmark:fall-aurora-ctr -- --check";
writeJson(pkgPath, pkg);

execFileSync("node", ["scripts/benchmark-fall-aurora-ctr.mjs", "--check"], { stdio: "inherit" });
unlinkSync("scripts/compose-fall-aurora-ctr.mjs");
unlinkSync(".github/workflows/fall-aurora-ctr-temp.yml");
execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
execFileSync("git", ["add", "-A"]);
execFileSync("git", ["commit", "-m", "Launch fall color and northern lights CTR treatment"], { stdio: "inherit" });
execFileSync("git", ["push", "origin", "HEAD:feat/fall-aurora-ctr-2026-08-22"], { stdio: "inherit" });
