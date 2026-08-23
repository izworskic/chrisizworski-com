#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (path) => readFileSync(path, "utf8");
const write = (path, value) => writeFileSync(path, value);
const readJson = (path) => JSON.parse(read(path));
const writeJson = (path, value) => write(path, JSON.stringify(value, null, 2) + "\n");

function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Missing ${label}: ${from.slice(0, 120)}`);
  return text.replace(from, to);
}

function replaceRegexRequired(text, pattern, to, label) {
  if (text.includes(to)) return text;
  if (!pattern.test(text)) throw new Error(`Missing ${label}`);
  return text.replace(pattern, to);
}

const releaseDate = "2026-08-22";

// --- Zone 6a planting calendar: page-one CTR treatment ---
const zonePath = "public/zone-6a-planting-calendar/index.html";
let zone = read(zonePath);
zone = replaceRequired(zone,
  "<title>Michigan Planting Calendar by City: Zone 6a to the UP</title>",
  "<title>Michigan Zone 6a Planting Calendar by City | Chris Izworski</title>",
  "zone title");
zone = replaceRequired(zone,
  "<meta name=\"description\" content=\"Michigan planting calendar built on 78 State Climatologist frost stations. Pick your city for indoor start, transplant, and sow dates for 47 crops.\">",
  "<meta name=\"description\" content=\"Michigan Zone 6a planting calendar by city. Get indoor seed-starting, transplant, direct-sow and fall-sow dates for 47 crops from 78 frost stations.\">",
  "zone description");
zone = replaceRequired(zone,
  "<meta property=\"og:title\" content=\"Michigan Planting Calendar by City: Interactive, Zone 6a to the UP\">",
  "<meta property=\"og:title\" content=\"Michigan Zone 6a Planting Calendar by City | Chris Izworski\">",
  "zone og title");
zone = replaceRequired(zone,
  "<meta property=\"og:description\" content=\"Michigan planting calendar built on 78 State Climatologist frost stations. Pick your city for indoor start, transplant, and sow dates for 47 crops.\">",
  "<meta property=\"og:description\" content=\"Michigan Zone 6a planting calendar by city. Get indoor seed-starting, transplant, direct-sow and fall-sow dates for 47 crops from 78 frost stations.\">",
  "zone og description");
zone = replaceRequired(zone,
  "\"name\":\"Michigan Planting Calendar by City: Interactive, Zone 6a to the UP\"",
  "\"name\":\"Michigan Zone 6a Planting Calendar by City | Chris Izworski\"",
  "zone schema name");
zone = replaceRequired(zone,
  "\"description\":\"Michigan planting calendar built on 78 State Climatologist frost stations. Pick your city for indoor start, transplant, and sow dates for 47 crops.\"",
  "\"description\":\"Michigan Zone 6a planting calendar by city. Get indoor seed-starting, transplant, direct-sow and fall-sow dates for 47 crops from 78 frost stations.\"",
  "zone schema description");
zone = replaceRequired(zone,
  "\"dateModified\":\"2026-08-10\"",
  "\"dateModified\":\"2026-08-22\"",
  "zone dateModified");
zone = replaceRequired(zone,
  "<h1>Michigan Planting Calendar</h1>",
  "<h1>Michigan Zone 6a Planting Calendar by City</h1>",
  "zone H1");
const zoneAnswer = "<p><strong>Pick your nearest Michigan city and this calendar computes indoor seed-starting, transplant, direct-sow, and fall-sow dates for 47 crops from local frost probabilities.</strong> Zone 6a gardeners around Bay City start from a median May 2 last spring frost, while colder Michigan locations run weeks later, so every crop recalculates instead of relying on one statewide date.</p>";
zone = replaceRegexRequired(
  zone,
  /<p>A planting calendar is only as good as the frost date underneath it,[\s\S]*?<\/p>/,
  zoneAnswer,
  "zone first answer");
write(zonePath, zone);

// --- Heirloom tomatoes: page-one CTR treatment ---
const heirloomPath = "public/heirloom-tomatoes-michigan/index.html";
let heirloom = read(heirloomPath);
heirloom = replaceRequired(heirloom,
  "<title>Heirloom Tomatoes in Michigan | Chris Izworski</title>",
  "<title>Best Heirloom Tomatoes for Michigan | Chris Izworski</title>",
  "heirloom title");
heirloom = replaceRequired(heirloom,
  "<meta name=\"description\" content=\"Heirloom tomatoes in Michigan, varieties, growing tips, and seed saving guidance from Chris Izworski and Freighter View Farms on Saginaw Bay.\">",
  "<meta name=\"description\" content=\"Best heirloom tomatoes for Michigan: Cherokee Purple, Mortgage Lifter, Black Krim, Stupice and more, with Zone 6a field notes and seed-saving tips.\">",
  "heirloom description");
heirloom = replaceRequired(heirloom,
  "<meta property=\"og:title\" content=\"Heirloom Tomatoes in Michigan | Chris Izworski\">",
  "<meta property=\"og:title\" content=\"Best Heirloom Tomatoes for Michigan | Chris Izworski\">",
  "heirloom og title");
heirloom = replaceRequired(heirloom,
  "<meta property=\"og:description\" content=\"Heirloom tomatoes in Michigan, varieties, growing tips, and seed saving guidance from Chris Izworski and Freighter View Farms on Saginaw Bay.\">",
  "<meta property=\"og:description\" content=\"Best heirloom tomatoes for Michigan: Cherokee Purple, Mortgage Lifter, Black Krim, Stupice and more, with Zone 6a field notes and seed-saving tips.\">",
  "heirloom og description");
heirloom = replaceRequired(heirloom,
  "\"headline\": \"Heirloom Tomatoes in Michigan: Varieties, Growing Tips, and Zone 6a Field Notes\"",
  "\"headline\": \"Best Heirloom Tomatoes for Michigan: Zone 6a Field Guide\"",
  "heirloom schema headline");
heirloom = replaceRequired(heirloom,
  "\"dateModified\": \"2026-08-10\"",
  "\"dateModified\": \"2026-08-22\"",
  "heirloom dateModified");
heirloom = replaceRequired(heirloom,
  "<h1>Heirloom Tomatoes in Michigan</h1>",
  "<h1>Best Heirloom Tomatoes for Michigan</h1>",
  "heirloom H1");
heirloom = replaceRequired(heirloom,
  "Zone 6a, Updated April 2026",
  "Zone 6a, Updated August 2026",
  "heirloom visible update");
const heirloomAnswer = "<p class=\"lede\"><strong>Best heirloom tomatoes for Michigan:</strong> Cherokee Purple and Mortgage Lifter are the most reliable large slicers in my Zone 6a Bay City garden, Black Krim performs well in lakeshore conditions, and Stupice is the safer early choice for northern Michigan. This guide compares 10 varieties by maturity, reliability, disease pressure, flavor, and use.</p>";
heirloom = replaceRegexRequired(
  heirloom,
  /<p class=\"lede\">[\s\S]*?<\/p>/,
  heirloomAnswer,
  "heirloom first answer");
write(heirloomPath, heirloom);

// --- Measured experiment source of truth ---
const experiment = {
  version: "1.0.0",
  updated: releaseDate,
  timezone: "America/Detroit",
  objective: "Convert two unprotected gardening pages already at the page-one threshold into qualified clicks without changing the active tomato-planting or frost-date experiments.",
  source: {
    title: "chrisizworski.com-Performance-on-Search-2026-08-22",
    spreadsheetId: "1dm2AC6FN4lU9P0viRs3mhVtg098AuvwEdNbKw-PsEVw",
    exportedThrough: "2026-08-20",
    windowDays: 7,
    note: "Page baselines are page-scoped. The export does not provide a page-query join, so no sitewide query row is attributed to either page."
  },
  protectedNeighbors: [
    "/when-to-plant-tomatoes-michigan/",
    "/michigan-frost-dates/"
  ],
  pages: [
    {
      id: "zone-6a-calendar",
      path: "/zone-6a-planting-calendar/",
      canonical: "https://chrisizworski.com/zone-6a-planting-calendar/",
      distinctIntent: "Michigan planting dates for many crops by city and frost station, with Zone 6a as the primary regional framing.",
      baseline: { impressions: 34, clicks: 0, ctr: 0, averagePosition: 8.26 },
      treatment: {
        title: "Michigan Zone 6a Planting Calendar by City | Chris Izworski",
        h1: "Michigan Zone 6a Planting Calendar by City",
        firstAnswer: "Pick your nearest Michigan city and compute planting windows for 47 crops from local frost probabilities."
      },
      target: { ctr: 0.02, stretchCtr: 0.03, averagePositionMax: 10.5, stopLossAveragePositionWorseThan: 13 }
    },
    {
      id: "heirloom-tomatoes",
      path: "/heirloom-tomatoes-michigan/",
      canonical: "https://chrisizworski.com/heirloom-tomatoes-michigan/",
      distinctIntent: "Choose heirloom tomato varieties that perform well in Michigan and understand their Zone 6a tradeoffs.",
      baseline: { impressions: 30, clicks: 0, ctr: 0, averagePosition: 10.37 },
      treatment: {
        title: "Best Heirloom Tomatoes for Michigan | Chris Izworski",
        h1: "Best Heirloom Tomatoes for Michigan",
        firstAnswer: "Name the strongest Michigan choices immediately, then compare 10 varieties by maturity, reliability, disease pressure, flavor, and use."
      },
      target: { ctr: 0.02, stretchCtr: 0.03, averagePositionMax: 12, stopLossAveragePositionWorseThan: 15 }
    }
  ]
};
writeJson("benchmarks/garden-page-one-ctr-experiment.json", experiment);

const benchmarkScript = `#!/usr/bin/env node\n\nimport { readFile } from "node:fs/promises";\nimport path from "node:path";\nconst root = path.resolve(import.meta.dirname, "..");\nconst read = (file) => readFile(path.join(root, file), "utf8");\nconst zone = await read("public/zone-6a-planting-calendar/index.html");\nconst heirloom = await read("public/heirloom-tomatoes-michigan/index.html");\nconst tomato = await read("public/when-to-plant-tomatoes-michigan/index.html");\nconst frost = await read("public/michigan-frost-dates/index.html");\nconst experiment = JSON.parse(await read("benchmarks/garden-page-one-ctr-experiment.json"));\nconst ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));\nconst portfolio = JSON.parse(await read("benchmarks/search-authority-portfolio.json"));\nconst failures = [];\nconst check = (name, pass) => { if (!pass) failures.push(name); };\ncheck("zone title", zone.includes('<title>Michigan Zone 6a Planting Calendar by City | Chris Izworski</title>'));\ncheck("zone H1", zone.includes('<h1>Michigan Zone 6a Planting Calendar by City</h1>'));\ncheck("zone direct answer", zone.includes('Pick your nearest Michigan city and this calendar computes indoor seed-starting'));\ncheck("zone canonical", zone.includes('<link rel="canonical" href="https://chrisizworski.com/zone-6a-planting-calendar/">'));\ncheck("zone freshness", zone.includes('"dateModified":"2026-08-22"'));\ncheck("heirloom title", heirloom.includes('<title>Best Heirloom Tomatoes for Michigan | Chris Izworski</title>'));\ncheck("heirloom H1", heirloom.includes('<h1>Best Heirloom Tomatoes for Michigan</h1>'));\ncheck("heirloom direct answer", heirloom.includes('<strong>Best heirloom tomatoes for Michigan:</strong>'));\ncheck("heirloom canonical", heirloom.includes('<link rel="canonical" href="https://chrisizworski.com/heirloom-tomatoes-michigan/">'));\ncheck("heirloom freshness", heirloom.includes('"dateModified": "2026-08-22"'));\ncheck("tomato protected title", tomato.includes('<title>When to Plant Tomatoes in Michigan: 2026 Dates by Region</title>'));\ncheck("tomato protected H1", tomato.includes('<h1>When to Plant Tomatoes in Michigan: 2026 Dates by Region</h1>'));\ncheck("frost protected title", frost.includes('<title>Michigan Last Frost Dates by City: 2026 Planting Calendar</title>'));\ncheck("frost protected H1", frost.includes('<h1>Michigan Last Frost Dates by City</h1>'));\ncheck("zone baseline", experiment.pages[0].baseline.impressions === 34 && experiment.pages[0].baseline.clicks === 0 && experiment.pages[0].baseline.averagePosition === 8.26);\ncheck("heirloom baseline", experiment.pages[1].baseline.impressions === 30 && experiment.pages[1].baseline.clicks === 0 && experiment.pages[1].baseline.averagePosition === 10.37);\ncheck("targets not weakened", experiment.pages.every((p) => p.target.ctr >= 0.02 && p.target.stretchCtr >= 0.03));\nconst zoneLedger = ledger.experiments.find((e) => e.id === "2026-08-22-zone-6a-calendar-ctr");\nconst heirloomLedger = ledger.experiments.find((e) => e.id === "2026-08-22-heirloom-tomatoes-ctr");\ncheck("zone ledger protection", zoneLedger?.status === "pending-clean-window" && zoneLedger?.lastSearchFacingChangeDate === "2026-08-22");\ncheck("heirloom ledger protection", heirloomLedger?.status === "pending-clean-window" && heirloomLedger?.lastSearchFacingChangeDate === "2026-08-22");\ncheck("latest snapshot advanced", portfolio.measurement?.latestLeadingSnapshot?.spreadsheetId === "1dm2AC6FN4lU9P0viRs3mhVtg098AuvwEdNbKw-PsEVw" && portfolio.measurement?.latestLeadingSnapshot?.exportedThrough === "2026-08-20");\nconsole.log("\\nGARDEN PAGE-ONE CTR SPRINT");\nconsole.log("=".repeat(72));\nconsole.log("Zone 6a calendar: 34 impressions / 0 clicks / position 8.26");\nconsole.log("Heirloom tomatoes: 30 impressions / 0 clicks / position 10.37");\nconsole.log("Target: >=2.0% CTR on each page while preserving protected tomato/frost treatments");\nif (failures.length) { console.log("Failures:"); for (const failure of failures) console.log(" - " + failure); }\nif (process.argv.includes("--check")) { if (failures.length) process.exitCode = 1; else console.log("benchmark:garden-page-one-ctr PASS\\n"); }\n`;
write("scripts/benchmark-garden-page-one-ctr.mjs", benchmarkScript);

// --- Experiment ledger ---
const ledgerPath = "benchmarks/growth-experiments.json";
const ledger = readJson(ledgerPath);
if (!ledger.experiments.some((item) => item.id === "2026-08-22-zone-6a-calendar-ctr")) {
  ledger.experiments.push({
    id: "2026-08-22-zone-6a-calendar-ctr",
    paths: ["/zone-6a-planting-calendar/"],
    hypothesis: "A Zone 6a + by-city search promise and immediate multi-crop answer will convert an existing position-8 planting-calendar result into clicks without changing the active tomato or frost owners.",
    primaryMetric: "Search Console page CTR while holding page-one average position",
    baseline: { windowDays: 7, impressions: 34, clicks: 0, ctr: 0, averagePosition: 8.26 },
    target: { ctr: 0.02, stretchCtr: 0.03, averagePositionMax: 10.5 },
    status: "pending-clean-window",
    releaseDate: null,
    evaluationWindow: null,
    lastSearchFacingChangeDate: releaseDate,
    decisionDate: null,
    result: null,
    stopCondition: "CTR remains effectively zero after the clean window, average position worsens beyond 13 after a meaningful sample, or the page begins competing with the protected tomato or frost owners."
  });
}
if (!ledger.experiments.some((item) => item.id === "2026-08-22-heirloom-tomatoes-ctr")) {
  ledger.experiments.push({
    id: "2026-08-22-heirloom-tomatoes-ctr",
    paths: ["/heirloom-tomatoes-michigan/"],
    hypothesis: "Leading with best-variety intent and a first-party Zone 6a answer will convert an existing position-10 heirloom result into clicks without changing the active tomato-planting experiment.",
    primaryMetric: "Search Console page CTR while holding near-page-one average position",
    baseline: { windowDays: 7, impressions: 30, clicks: 0, ctr: 0, averagePosition: 10.37 },
    target: { ctr: 0.02, stretchCtr: 0.03, averagePositionMax: 12 },
    status: "pending-clean-window",
    releaseDate: null,
    evaluationWindow: null,
    lastSearchFacingChangeDate: releaseDate,
    decisionDate: null,
    result: null,
    stopCondition: "CTR remains effectively zero after the clean window, average position worsens beyond 15 after a meaningful sample, factual variety claims regress, or the page begins competing with the protected tomato-timing owner."
  });
}
ledger.ledgerVersion = "1.14.0";
writeJson(ledgerPath, ledger);

// --- Portfolio: advance the leading snapshot and protect the treatments ---
const portfolioPath = "benchmarks/search-authority-portfolio.json";
const portfolio = readJson(portfolioPath);
portfolio.measurement.latestLeadingSnapshot = {
  sourceTitle: "chrisizworski.com-Performance-on-Search-2026-08-22",
  spreadsheetId: "1dm2AC6FN4lU9P0viRs3mhVtg098AuvwEdNbKw-PsEVw",
  exportedThrough: "2026-08-20",
  windowDays: 7,
  purpose: "Prioritization signal only; does not replace complete 28-day experiment decisions."
};
const protectedItems = [
  "Michigan Zone 6a Planting Calendar CTR treatment — 34 impressions, 0 clicks, position 8.26 baseline",
  "Heirloom Tomatoes Michigan CTR treatment — 30 impressions, 0 clicks, position 10.37 baseline"
];
for (const item of protectedItems) if (!portfolio.protectedQueue.includes(item)) portfolio.protectedQueue.push(item);
writeJson(portfolioPath, portfolio);

// --- Temporary source-parity declarations for measured changes ---
const verifyPath = "scripts/verify-source.mjs";
let verify = read(verifyPath);
const marker = "const intentionalChanges = new Set([\n";
if (!verify.includes(marker)) throw new Error("verify-source intentionalChanges marker missing");
let note = "";
if (!verify.includes('"/zone-6a-planting-calendar/"')) note += '  // Aug 22 2026: measured page-one CTR treatment. Re-crawl after production release, then remove.\n  "/zone-6a-planting-calendar/",\n';
if (!verify.includes('"/heirloom-tomatoes-michigan/"')) note += '  // Aug 22 2026: measured page-one CTR treatment. Re-crawl after production release, then remove.\n  "/heirloom-tomatoes-michigan/",\n';
if (note) verify = verify.replace(marker, marker + note);
write(verifyPath, verify);

// --- Sitemap freshness ---
const sitemapPath = "public/sitemap.xml";
let sitemap = read(sitemapPath);
for (const slug of ["zone-6a-planting-calendar", "heirloom-tomatoes-michigan"]) {
  const re = new RegExp(`(<loc>https:\\/\\/chrisizworski\\.com\\/${slug}\\/?<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`);
  if (!re.test(sitemap)) throw new Error(`Sitemap entry missing for ${slug}`);
  sitemap = sitemap.replace(re, `$1${releaseDate}$2`);
}
write(sitemapPath, sitemap);

// --- Full repository gate ---
const pkgPath = "package.json";
const pkg = readJson(pkgPath);
pkg.scripts["benchmark:garden-page-one-ctr"] = "node scripts/benchmark-garden-page-one-ctr.mjs";
if (!pkg.scripts["verify:all"].includes("benchmark:garden-page-one-ctr")) pkg.scripts["verify:all"] += " && npm run benchmark:garden-page-one-ctr -- --check";
writeJson(pkgPath, pkg);

execFileSync("node", ["scripts/benchmark-garden-page-one-ctr.mjs", "--check"], { stdio: "inherit" });

// Self-clean temporary composer machinery before committing the real treatment.
unlinkSync("scripts/compose-garden-page-one-ctr.mjs");
unlinkSync(".github/workflows/garden-page-one-ctr-temp.yml");
execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
execFileSync("git", ["add", "-A"]);
execFileSync("git", ["commit", "-m", "Launch gardening page-one CTR sprint"], { stdio: "inherit" });
execFileSync("git", ["push", "origin", "HEAD:feat/garden-page-one-ctr-2026-08-22"], { stdio: "inherit" });
