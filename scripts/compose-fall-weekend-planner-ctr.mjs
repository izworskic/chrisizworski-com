#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (path) => readFileSync(path, "utf8");
const write = (path, value) => writeFileSync(path, value);
const readJson = (path) => JSON.parse(read(path));
const writeJson = (path, value) => write(path, JSON.stringify(value, null, 2) + "\n");

const pagePath = "public/fall-color/michigan-leaf-peeping-planner/index.html";
let page = read(pagePath);
const replacements = [
  ["<title>Michigan Leaf Peeping Planner 2026 | Peak This Weekend</title>", "<title>Michigan Fall Color Weekend Planner 2026 | Where to Go</title>"],
  ["<meta name=\"description\" content=\"Tell it where you live and which weekend you can travel. It ranks Michigan's eight color regions by nearness to peak and how far you have to drive.\" />", "<meta name=\"description\" content=\"Enter your Michigan starting city and travel weekend. Rank eight fall-color regions by expected closeness to peak and drive distance, then check live color.\" />"],
  ["<meta property=\"og:title\" content=\"Michigan Leaf Peeping Planner 2026 | Peak This Weekend\" />", "<meta property=\"og:title\" content=\"Michigan Fall Color Weekend Planner 2026 | Where to Go\" />"],
  ["<meta property=\"og:description\" content=\"Tell it where you live and which weekend you can travel. It ranks Michigan's eight color regions by nearness to peak and how far you have to drive.\" />", "<meta property=\"og:description\" content=\"Enter your Michigan starting city and travel weekend. Rank eight fall-color regions by expected closeness to peak and drive distance, then check live color.\" />"],
  ["<meta name=\"twitter:title\" content=\"Michigan Leaf Peeping Planner 2026 | Peak This Weekend\" />", "<meta name=\"twitter:title\" content=\"Michigan Fall Color Weekend Planner 2026 | Where to Go\" />"],
  ["<meta name=\"twitter:description\" content=\"Tell it where you live and which weekend you can travel. It ranks Michigan's eight color regions by nearness to peak and how far you have to drive.\" />", "<meta name=\"twitter:description\" content=\"Enter your Michigan starting city and travel weekend. Rank eight fall-color regions by expected closeness to peak and drive distance, then check live color.\" />"],
  ["\"name\": \"Michigan Leaf Peeping Planner 2026 | Peak This Weekend\"", "\"name\": \"Michigan Fall Color Weekend Planner 2026 | Where to Go\""],
  ["\"dateModified\": \"2026-08-09\"", "\"dateModified\": \"2026-08-22\""],
  ["<h1>Michigan Leaf Peeping Planner</h1>", "<h1>Michigan Fall Color Weekend Planner</h1>"],
  ["<p class=\"lede\">Most color maps answer a question nobody asks: what is peaking <i>today</i>, statewide. The question people actually have is narrower. <b>I live here, I can get away on this weekend, where should I drive?</b> Tell it those two things and it ranks all eight Michigan color regions by how close to peak they should be on your dates and how far you have to go.</p>", "<p class=\"lede\"><b>Choose your Michigan starting city and the weekend you can travel.</b> This planner ranks all eight fall-color regions by how close they should be to peak on your dates and how far you have to drive. Before you leave, check the <a href=\"/fall-color/\">live Michigan Fall Color tracker</a> because weather can move the timing.</p>"]
];
for (const [from, to] of replacements) {
  if (!page.includes(from) && !page.includes(to)) throw new Error("Planner page anchor missing: " + from.slice(0, 100));
  page = page.replace(from, to);
}
write(pagePath, page);

const experiment = {
  version: "1.0.0",
  updated: "2026-08-22",
  timezone: "America/Detroit",
  objective: "Convert an existing page-one Michigan fall-color planner result into qualified clicks by describing the weekend decision in plain language while preserving the live statewide Fall Color tracker as the current-conditions owner.",
  source: {
    title: "chrisizworski.com-Performance-on-Search-2026-08-21",
    spreadsheetId: "1lrFEAxYT7whMAx2Gnrq-IRfUHr7cjshU542FWwJ7Kfw",
    exportedThrough: "2026-08-19",
    windowDays: 7,
    note: "Page metrics are page-scoped. No sitewide query row is attributed to this page because the export does not provide a page-query join."
  },
  path: "/fall-color/michigan-leaf-peeping-planner/",
  canonical: "https://chrisizworski.com/fall-color/michigan-leaf-peeping-planner/",
  distinctIntent: "Choose where in Michigan to drive for fall color on a specific weekend from a specific starting point.",
  protectedNeighbor: "https://chrisizworski.com/fall-color/",
  baseline: { impressions: 54, clicks: 0, ctr: 0, averagePosition: 10.07 },
  treatment: {
    type: "page-one-ctr",
    title: "Michigan Fall Color Weekend Planner 2026 | Where to Go",
    h1: "Michigan Fall Color Weekend Planner",
    productIdentityPreserved: "Michigan Leaf Peeping Planner",
    firstAnswer: "Choose your Michigan starting city and the weekend you can travel; the planner ranks eight regions by expected closeness to peak and drive distance.",
    liveTrackerHandoff: "/fall-color/",
    protectedStatewideHubChanged: false
  },
  targets: {
    evaluationWindowDays: 28,
    ctrAtOrAbove: 0.02,
    stretchCtrAtOrAbove: 0.03,
    averagePositionAtOrBetterThan: 12,
    stopLossAveragePositionWorseThan: 15
  }
};
writeJson("benchmarks/fall-weekend-planner-ctr-experiment.json", experiment);

const benchmarkScript = `#!/usr/bin/env node\n\nimport { readFile } from "node:fs/promises";\nimport path from "node:path";\nconst root = path.resolve(import.meta.dirname, "..");\nconst read = (file) => readFile(path.join(root, file), "utf8");\nconst page = await read("public/fall-color/michigan-leaf-peeping-planner/index.html");\nconst hub = await read("public/fall-color/index.html");\nconst experiment = JSON.parse(await read("benchmarks/fall-weekend-planner-ctr-experiment.json"));\nconst ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));\nconst failures = [];\nconst check = (name, pass) => { if (!pass) failures.push(name); };\ncheck("canonical preserved", page.includes('<link rel="canonical" href="https://chrisizworski.com/fall-color/michigan-leaf-peeping-planner/"'));\ncheck("plain-language title", page.includes('<title>Michigan Fall Color Weekend Planner 2026 | Where to Go</title>'));\ncheck("H1 aligned", page.includes('<h1>Michigan Fall Color Weekend Planner</h1>'));\ncheck("weekend direct answer", page.includes('Choose your Michigan starting city and the weekend you can travel.'));\ncheck("live tracker handoff", page.includes('href="/fall-color/"'));\ncheck("product identity remains in app schema", page.includes('"name": "Michigan Leaf Peeping Planner"'));\ncheck("statewide hub remains canonical to itself", hub.includes('rel="canonical" href="https://chrisizworski.com/fall-color/'));\ncheck("baseline exact", experiment.baseline.impressions === 54 && experiment.baseline.clicks === 0 && experiment.baseline.averagePosition === 10.07);\ncheck("CTR target explicit", experiment.targets.ctrAtOrAbove === 0.02 && experiment.targets.averagePositionAtOrBetterThan === 12);\nconst item = ledger.experiments.find((entry) => entry.id === "2026-08-22-fall-weekend-planner-ctr");\ncheck("ledger protection", item?.status === "pending-clean-window" && item?.lastSearchFacingChangeDate === "2026-08-22");\nconsole.log("\\nFALL WEEKEND PLANNER CTR BENCHMARK");\nconsole.log("=".repeat(72));\nconsole.log("Baseline: 54 impressions, 0 clicks, position 10.07");\nconsole.log("Target: CTR >= 2.0%; hold position <= 12");\nif (failures.length) { console.log("Failures:"); for (const failure of failures) console.log(" - " + failure); }\nif (process.argv.includes("--check")) { if (failures.length) process.exitCode = 1; else console.log("benchmark:fall-weekend-planner-ctr PASS\\n"); }\n`;
write("scripts/benchmark-fall-weekend-planner-ctr.mjs", benchmarkScript);

const ledgerPath = "benchmarks/growth-experiments.json";
const ledger = readJson(ledgerPath);
if (!ledger.experiments.some((item) => item.id === "2026-08-22-fall-weekend-planner-ctr")) {
  ledger.experiments.push({
    id: "2026-08-22-fall-weekend-planner-ctr",
    paths: ["/fall-color/michigan-leaf-peeping-planner/"],
    hypothesis: "Plain-language weekend-planning search copy will lift an existing position-10 planner from zero clicks while preserving the live Fall Color hub as the statewide current-conditions owner.",
    primaryMetric: "Search Console page CTR while holding page-one/near-page-one average position",
    baseline: { windowDays: 7, impressions: 54, clicks: 0, ctr: 0, averagePosition: 10.07 },
    target: { ctr: 0.02, stretchCtr: 0.03, averagePositionMax: 12 },
    status: "pending-clean-window",
    releaseDate: null,
    evaluationWindow: null,
    lastSearchFacingChangeDate: "2026-08-22",
    decisionDate: null,
    result: null,
    stopCondition: "Average position worsens beyond 15 after a meaningful sample, CTR remains effectively zero after the clean window, planner behavior regresses, or the page begins competing with the statewide live Fall Color current-conditions owner."
  });
  ledger.ledgerVersion = "1.13.0";
  writeJson(ledgerPath, ledger);
}

const portfolioPath = "benchmarks/search-authority-portfolio.json";
const portfolio = readJson(portfolioPath);
if (!portfolio.protectedQueue.some((item) => item.toLowerCase().includes("fall color weekend planner"))) {
  portfolio.protectedQueue.push("Michigan Fall Color Weekend Planner CTR treatment — position 10.07 baseline, distinct weekend-planning intent");
}
writeJson(portfolioPath, portfolio);

const verifyPath = "scripts/verify-source.mjs";
let verify = read(verifyPath);
const marker = "const intentionalChanges = new Set([\n";
const note = '  // Aug 22 2026: measured CTR treatment for the distinct Michigan Fall Color Weekend Planner. Re-crawl after production release, then remove.\n  "/fall-color/michigan-leaf-peeping-planner/",\n';
if (!verify.includes('"/fall-color/michigan-leaf-peeping-planner/"')) verify = verify.replace(marker, marker + note);
write(verifyPath, verify);

const sitemapPath = "public/sitemap.xml";
let sitemap = read(sitemapPath);
const sitemapRe = /(<loc>https:\/\/chrisizworski\.com\/fall-color\/michigan-leaf-peeping-planner\/?<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/;
if (sitemapRe.test(sitemap)) sitemap = sitemap.replace(sitemapRe, "$12026-08-22$2");
write(sitemapPath, sitemap);

const pkgPath = "package.json";
const pkg = readJson(pkgPath);
pkg.scripts["benchmark:fall-weekend-planner-ctr"] = "node scripts/benchmark-fall-weekend-planner-ctr.mjs";
if (!pkg.scripts["verify:all"].includes("benchmark:fall-weekend-planner-ctr")) pkg.scripts["verify:all"] += " && npm run benchmark:fall-weekend-planner-ctr -- --check";
writeJson(pkgPath, pkg);

execFileSync("node", ["scripts/benchmark-fall-weekend-planner-ctr.mjs", "--check"], { stdio: "inherit" });
unlinkSync("scripts/compose-fall-weekend-planner-ctr.mjs");
unlinkSync(".github/workflows/fall-weekend-planner-ctr-temp.yml");
execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
execFileSync("git", ["add", "-A"]);
execFileSync("git", ["commit", "-m", "Launch fall weekend planner CTR treatment"], { stdio: "inherit" });
execFileSync("git", ["push", "origin", "HEAD:feat/fall-weekend-planner-ctr-2026-08-22"], { stdio: "inherit" });
