#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (path) => readFileSync(path, "utf8");
const write = (path, value) => writeFileSync(path, value);
const readJson = (path) => JSON.parse(read(path));
const writeJson = (path, value) => write(path, JSON.stringify(value, null, 2) + "\n");
const target = "/fall-color/upper-peninsula-fall-color/";

let upNorth = read("public/up-north-michigan/index.html");
upNorth = upNorth.replace('"dateModified":"2026-08-18"', '"dateModified":"2026-08-22"');
const oldFallLink = '<p class="check-link"><a href="/fall-color/">Fall color tracker, eight regions</a></p>';
const newFallLink = '<p class="check-link"><a href="/fall-color/">Fall color tracker, eight regions</a><br><a href="/fall-color/upper-peninsula-fall-color/">Upper Peninsula peak timing and live guide</a></p>';
if (!upNorth.includes(oldFallLink) && !upNorth.includes(newFallLink)) throw new Error("Up North fall-card anchor missing");
upNorth = upNorth.replace(oldFallLink, newFallLink);
write("public/up-north-michigan/index.html", upNorth);

let circle = read("public/lake-superior-circle-tour/index.html");
circle = circle.replace('"dateModified": "2026-08-12"', '"dateModified": "2026-08-22"');
const oldSeason = '<div class="p-card"><strong>Best Season</strong>Late June–September. July–August warmest. September: no bugs, early fall color. May–June: peak waterfalls, black flies in Canada. Avoid Duluth holiday weekends, it fills up.</div>';
const newSeason = '<div class="p-card"><strong>Best Season</strong>Late June–September. July–August warmest. September: no bugs, early fall color. Driving the Michigan side in fall? Check <a href="/fall-color/upper-peninsula-fall-color/">Upper Peninsula peak timing and the live color guide</a>. May–June: peak waterfalls, black flies in Canada. Avoid Duluth holiday weekends, it fills up.</div>';
if (!circle.includes(oldSeason) && !circle.includes(newSeason)) throw new Error("Circle Tour best-season anchor missing");
circle = circle.replace(oldSeason, newSeason);
write("public/lake-superior-circle-tour/index.html", circle);

const benchmark = {
  version: "1.0.0",
  updated: "2026-08-22",
  timezone: "America/Detroit",
  objective: "Move the existing Upper Peninsula fall-color regional owner from the page-one threshold into the top 10 through contextual internal authority, without rewriting the destination snippet or the protected statewide Fall Color hub.",
  source: {
    title: "chrisizworski.com-Performance-on-Search-2026-08-21",
    spreadsheetId: "1lrFEAxYT7whMAx2Gnrq-IRfUHr7cjshU542FWwJ7Kfw",
    exportedThrough: "2026-08-19",
    windowDays: 7
  },
  target,
  sourcePaths: ["/up-north-michigan/", "/lake-superior-circle-tour/"],
  baseline: { impressions: 78, clicks: 1, ctr: 0.0128, averagePosition: 11.88 },
  treatment: {
    type: "distribution-only-rank-push",
    destinationSearchFacingFieldsChanged: false,
    protectedStatewideHubChanged: false,
    links: [
      { source: "/up-north-michigan/", context: "fall-color trip check" },
      { source: "/lake-superior-circle-tour/", context: "September / Michigan U.P. trip planning" }
    ]
  },
  targets: {
    evaluationWindowDays: 28,
    averagePositionAtOrBetterThan: 10,
    stretchAveragePositionAtOrBetterThan: 8,
    ctrFloor: 0.01,
    stopLossAveragePositionWorseThan: 15
  }
};
writeJson("benchmarks/upper-peninsula-fall-rank-expansion.json", benchmark);

const benchmarkScript = `#!/usr/bin/env node\n\nimport { readFile } from "node:fs/promises";\nimport path from "node:path";\nconst root = path.resolve(import.meta.dirname, "..");\nconst read = (file) => readFile(path.join(root, file), "utf8");\nconst upNorth = await read("public/up-north-michigan/index.html");\nconst circle = await read("public/lake-superior-circle-tour/index.html");\nconst targetPage = await read("public/fall-color/upper-peninsula-fall-color/index.html");\nconst benchmark = JSON.parse(await read("benchmarks/upper-peninsula-fall-rank-expansion.json"));\nconst ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));\nconst failures = [];\nconst check = (name, pass) => { if (!pass) failures.push(name); };\ncheck("Up North link exists", upNorth.includes('href="/fall-color/upper-peninsula-fall-color/"'));\ncheck("Circle Tour link exists", circle.includes('href="/fall-color/upper-peninsula-fall-color/"'));\ncheck("destination title frozen", targetPage.includes('<title>Upper Peninsula Fall Color 2026 | Peak Dates &amp; Map</title>'));\ncheck("destination H1 frozen", targetPage.includes('<h1>When does fall color peak in the Upper Peninsula?</h1>'));\ncheck("destination canonical frozen", targetPage.includes('rel="canonical" href="https://chrisizworski.com/fall-color/upper-peninsula-fall-color/"'));\ncheck("baseline exact", benchmark.baseline.impressions === 78 && benchmark.baseline.clicks === 1 && benchmark.baseline.averagePosition === 11.88);\ncheck("top ten target", benchmark.targets.averagePositionAtOrBetterThan === 10 && benchmark.targets.stretchAveragePositionAtOrBetterThan === 8);\nconst item = ledger.experiments.find((entry) => entry.id === "2026-08-22-upper-peninsula-fall-rank");\ncheck("ledger protection", item?.status === "pending-clean-window" && item?.paths?.includes("/fall-color/upper-peninsula-fall-color/"));\nconsole.log("\\nUPPER PENINSULA FALL RANK BENCHMARK");\nconsole.log("=".repeat(72));\nconsole.log("Baseline: 78 impressions, 1 click, position 11.88");\nconsole.log("Target: top 10; stretch top 8; destination snippet frozen");\nif (failures.length) { console.log("Failures:"); for (const failure of failures) console.log(" - " + failure); }\nif (process.argv.includes("--check")) { if (failures.length) process.exitCode = 1; else console.log("benchmark:up-fall-rank PASS\\n"); }\n`;
write("scripts/benchmark-upper-peninsula-fall-rank.mjs", benchmarkScript);

const ledgerPath = "benchmarks/growth-experiments.json";
const ledger = readJson(ledgerPath);
if (!ledger.experiments.some((item) => item.id === "2026-08-22-upper-peninsula-fall-rank")) {
  ledger.experiments.push({
    id: "2026-08-22-upper-peninsula-fall-rank",
    paths: [target],
    sourcePaths: ["/up-north-michigan/", "/lake-superior-circle-tour/"],
    hypothesis: "Two contextual links from relevant northern-Michigan and Lake Superior planning surfaces will move the existing regional fall-color owner from average position 11.88 into the top 10 without changing its already-strong snippet.",
    primaryMetric: "Search Console average position for /fall-color/upper-peninsula-fall-color/",
    baseline: { windowDays: 7, impressions: 78, clicks: 1, ctr: 0.0128, averagePosition: 11.88 },
    target: { averagePositionAtOrBetterThan: 10, stretchAveragePositionAtOrBetterThan: 8, ctrFloor: 0.01 },
    status: "pending-clean-window",
    releaseDate: null,
    evaluationWindow: null,
    lastSearchFacingChangeDate: null,
    decisionDate: null,
    result: null,
    stopCondition: "Average position worsens beyond 15 after a meaningful sample, CTR falls below 1%, the destination snippet changes, or the statewide Fall Color owner is altered during its protected window."
  });
  ledger.ledgerVersion = "1.12.0";
  writeJson(ledgerPath, ledger);
}

const portfolioPath = "benchmarks/search-authority-portfolio.json";
const portfolio = readJson(portfolioPath);
if (!portfolio.focusPortfolio.some((item) => item.id === "upper-peninsula-fall")) {
  const fallIndex = portfolio.focusPortfolio.findIndex((item) => item.id === "fall-color");
  portfolio.focusPortfolio.splice(Math.max(0, fallIndex + 1), 0, {
    id: "upper-peninsula-fall",
    surface: "https://chrisizworski.com/fall-color/upper-peninsula-fall-color/",
    priorityScore: 89,
    action: "PROTECT",
    next: "Measure the August 22 contextual-authority rank push for a clean 28-day window; keep the regional destination snippet frozen and leave the statewide Fall Color experiment untouched.",
    observed: { impressions: 78, clicks: 1, ctr: 0.0128, position: 11.88 }
  });
}
if (!portfolio.protectedQueue.some((item) => item.toLowerCase().includes("upper peninsula fall color"))) {
  portfolio.protectedQueue.push("Upper Peninsula Fall Color rank-distribution treatment — position 11.88 baseline, destination snippet frozen");
}
writeJson(portfolioPath, portfolio);

const verifyPath = "scripts/verify-source.mjs";
let verify = read(verifyPath);
const marker = "const intentionalChanges = new Set([\n";
let note = "";
if (!verify.includes('"/up-north-michigan/"')) note += '  // Aug 22 2026: contextual distribution for the Upper Peninsula fall-color rank experiment. Re-crawl after production release, then remove.\\n  "/up-north-michigan/",\\n';
if (!verify.includes('"/lake-superior-circle-tour/"')) note += '  "/lake-superior-circle-tour/",\\n';
if (note) verify = verify.replace(marker, marker + note.replaceAll("\\n", "\n"));
write(verifyPath, verify);

const sitemapPath = "public/sitemap.xml";
let sitemap = read(sitemapPath);
for (const slug of ["up-north-michigan", "lake-superior-circle-tour"]) {
  const re = new RegExp("(<loc>https://chrisizworski\\.com/" + slug + "/<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)");
  if (re.test(sitemap)) sitemap = sitemap.replace(re, "$12026-08-22$2");
}
write(sitemapPath, sitemap);

const pkgPath = "package.json";
const pkg = readJson(pkgPath);
pkg.scripts["benchmark:up-fall-rank"] = "node scripts/benchmark-upper-peninsula-fall-rank.mjs";
if (!pkg.scripts["verify:all"].includes("benchmark:up-fall-rank")) pkg.scripts["verify:all"] += " && npm run benchmark:up-fall-rank -- --check";
writeJson(pkgPath, pkg);

execFileSync("node", ["scripts/benchmark-upper-peninsula-fall-rank.mjs", "--check"], { stdio: "inherit" });
unlinkSync("scripts/compose-up-fall-rank.mjs");
unlinkSync(".github/workflows/up-fall-rank-temp.yml");
execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
execFileSync("git", ["add", "-A"]);
execFileSync("git", ["commit", "-m", "Push Upper Peninsula fall color into top ten"], { stdio: "inherit" });
execFileSync("git", ["push", "origin", "HEAD:feat/up-fall-page-one-rank-2026-08-22"], { stdio: "inherit" });
