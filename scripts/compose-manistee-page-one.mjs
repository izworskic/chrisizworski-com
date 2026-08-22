#!/usr/bin/env node

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (path) => readFileSync(path, "utf8");
const write = (path, value) => writeFileSync(path, value);
const readJson = (path) => JSON.parse(read(path));
const writeJson = (path, value) => write(path, JSON.stringify(value, null, 2) + "\n");

const pagePath = "public/michigan-paddling/manistee-river/index.html";
let page = read(pagePath);

const replacements = [
  ["<title>Manistee River Paddling Guide | Chris Izworski</title>", "<title>Manistee River Paddling Guide: Map, Access &amp; Float Trips</title>"],
  ["<meta name=\"description\" content=\"Guide to paddling Michigan&#x27;s Manistee River: CCC Bridge to High Bridge, liveries, water levels, and a section-by-section look at the Wild and Scenic stretch.\">", "<meta name=\"description\" content=\"Plan a Manistee River canoe or kayak trip with public put-ins and take-outs, float sections, campgrounds, liveries, live USGS flows and the interactive field map.\">"],
  ["<meta property=\"og:title\" content=\"Manistee River Paddling: Sections, Liveries, and Trip Planning\">", "<meta property=\"og:title\" content=\"Manistee River Paddling Guide: Map, Access &amp; Float Trips\">"],
  ["<meta property=\"og:description\" content=\"The Manistee River by section: where to put in, where to take out, what to expect on each stretch.\">", "<meta property=\"og:description\" content=\"Plan a Manistee River canoe or kayak trip with public access, float sections, live river conditions and the interactive field map.\">"],
  ["\"name\": \"Manistee River Paddling: Sections, Liveries, and Trip Planning\"", "\"name\": \"Manistee River Paddling Guide: Map, Access & Float Trips\""],
  ["\"description\": \"Guide to paddling Michigan&#x27;s Manistee River: CCC Bridge to High Bridge, liveries, water levels, and a section-by-section look at the Wild and Scenic stretch.\"", "\"description\": \"Plan a Manistee River canoe or kayak trip with public put-ins and take-outs, float sections, campgrounds, liveries, live USGS flows and the interactive field map.\""],
  ["\"dateModified\": \"2026-08-10\"", "\"dateModified\": \"2026-08-22\""],
  ["<h1 class=\"page-title\">Manistee River Paddling</h1>", "<h1 class=\"page-title\">Manistee River Paddling Guide</h1>"],
  ["<p class=\"sub\">A practical guide to canoeing the Manistee, Michigan's quieter alternative to the Au Sable.</p>", "<p class=\"sub\">Canoe and kayak trip planning with public access, float sections, campgrounds, liveries, live river conditions and the interactive field map.</p>"],
];

for (const [from, to] of replacements) {
  if (!page.includes(from) && !page.includes(to)) throw new Error(`Manistee page anchor missing: ${from.slice(0, 80)}`);
  page = page.replace(from, to);
}

const directAnswer = `<div class="river-card" id="manistee-trip-answer">\n  <div class="river-name">Planning a Manistee River canoe or kayak trip?</div>\n  <p class="river-notes">Start with the <a href="/manistee-river-map/">interactive Manistee River field map</a> for mapped public put-ins and take-outs, campgrounds, liveries and outfitters, river gauges, and other trip-planning points. Then use the section guide below to choose the stretch and check current USGS river conditions before you leave.</p>\n</div>\n\n`;
const directAnchor = `<figure class="fig hero">`;
if (!page.includes('id="manistee-trip-answer"')) {
  if (!page.includes(directAnchor)) throw new Error("Manistee direct-answer insertion anchor missing");
  page = page.replace(directAnchor, directAnswer + directAnchor);
}

const faqJson = `        {\n          "@type": "Question",\n          "name": "Is there a Manistee River map with put-ins and take-outs?",\n          "acceptedAnswer": {\n            "@type": "Answer",\n            "text": "Yes. The interactive Manistee River Field Map on ChrisIzworski.com maps public access, put-ins and take-outs, campgrounds, liveries and outfitters, river gauges, and other trip-planning points. Use this paddling guide to choose the river section and the field map for exact locations."\n          }\n        },\n`;
const faqJsonAnchor = `      "mainEntity": [\n`;
if (!page.includes('"name": "Is there a Manistee River map with put-ins and take-outs?"')) {
  if (!page.includes(faqJsonAnchor)) throw new Error("Manistee FAQ schema anchor missing");
  page = page.replace(faqJsonAnchor, faqJsonAnchor + faqJson);
}

const visibleFaq = `<div class="faq-q">Where are the Manistee River put-ins and take-outs?</div>\n<p>Use the <a href="/manistee-river-map/">interactive Manistee River field map</a> for mapped public access, put-ins and take-outs, campgrounds, liveries and outfitters, river gauges, and other points of interest. This guide remains the section-by-section trip-planning owner; the map is the utility layer for exact locations.</p>\n`;
const visibleFaqAnchor = `<div class="faq-q">How long is a Manistee River day trip?</div>`;
if (!page.includes("Where are the Manistee River put-ins and take-outs?")) {
  if (!page.includes(visibleFaqAnchor)) throw new Error("Manistee visible FAQ anchor missing");
  page = page.replace(visibleFaqAnchor, visibleFaq + visibleFaqAnchor);
}
write(pagePath, page);

const benchmark = {
  version: "1.0.0",
  updated: "2026-08-22",
  timezone: "America/Detroit",
  objective: "Move the existing Manistee River paddling guide from the page-one threshold into the top 10 and convert its existing impressions into qualified visits without creating a competing Manistee canonical.",
  source: {
    title: "chrisizworski.com-Performance-on-Search-2026-08-21",
    spreadsheetId: "1lrFEAxYT7whMAx2Gnrq-IRfUHr7cjshU542FWwJ7Kfw",
    exportedThrough: "2026-08-19",
    windowDays: 7,
    note: "Page metrics are page-scoped. Query rows are sitewide directional evidence and are not treated as a page-query join."
  },
  owner: "https://chrisizworski.com/michigan-paddling/manistee-river/",
  utilityDestination: "https://chrisizworski.com/manistee-river-map/",
  baseline: { impressions: 72, clicks: 0, ctr: 0, averagePosition: 11.4 },
  directionalQueries: [
    { query: "manistee river", impressions: 2, clicks: 0, position: 27.5 },
    { query: "upper manistee river", impressions: 2, clicks: 0, position: 27.5 },
    { query: "canoeing manistee river", impressions: 1, clicks: 0, position: 28 },
    { query: "manistee river kayaking", impressions: 1, clicks: 0, position: 29 }
  ],
  treatment: {
    type: "combined-page-one-rank-and-ctr",
    changes: [
      "query-led title and meta description",
      "H1 alignment",
      "crawlable direct trip-planning answer above the hero image",
      "explicit field-map handoff for put-ins and take-outs",
      "visible and structured FAQ coverage for map/access intent"
    ],
    unchanged: [
      "canonical URL",
      "existing section guide",
      "field-map canonical and product",
      "no city/access-point doorway URLs"
    ]
  },
  targets: {
    evaluationWindowDays: 28,
    averagePositionAtOrBetterThan: 10,
    stretchAveragePositionAtOrBetterThan: 8,
    ctrAtOrAbove: 0.015,
    stopLossAveragePositionWorseThan: 15
  }
};
writeJson("benchmarks/manistee-page-one-push.json", benchmark);

const benchScript = `#!/usr/bin/env node\n\nimport { readFile } from "node:fs/promises";\nimport path from "node:path";\n\nconst root = path.resolve(import.meta.dirname, "..");\nconst read = (file) => readFile(path.join(root, file), "utf8");\nconst page = await read("public/michigan-paddling/manistee-river/index.html");\nconst benchmark = JSON.parse(await read("benchmarks/manistee-page-one-push.json"));\nconst experiments = JSON.parse(await read("benchmarks/growth-experiments.json"));\nconst portfolio = JSON.parse(await read("benchmarks/search-authority-portfolio.json"));\n\nconst failures = [];\nconst check = (name, pass) => { if (!pass) failures.push(name); };\ncheck("canonical preserved", page.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-paddling/manistee-river/">'));\ncheck("page-one title treatment", page.includes('<title>Manistee River Paddling Guide: Map, Access &amp; Float Trips</title>'));\ncheck("H1 aligned", page.includes('<h1 class="page-title">Manistee River Paddling Guide</h1>'));\ncheck("direct answer exists", page.includes('id="manistee-trip-answer"'));\ncheck("field map handoff exists", page.includes('href="/manistee-river-map/"'));\ncheck("visible access FAQ exists", page.includes('Where are the Manistee River put-ins and take-outs?'));\ncheck("structured access FAQ exists", page.includes('Is there a Manistee River map with put-ins and take-outs?'));\ncheck("baseline is exact", benchmark.baseline.impressions === 72 && benchmark.baseline.clicks === 0 && benchmark.baseline.averagePosition === 11.4);\ncheck("top ten target is explicit", benchmark.targets.averagePositionAtOrBetterThan === 10 && benchmark.targets.ctrAtOrAbove === 0.015);\nconst experiment = experiments.experiments.find((item) => item.id === "2026-08-22-manistee-paddling-page-one");\ncheck("experiment ledger entry exists", experiment?.status === "pending-clean-window" && experiment?.paths?.includes("/michigan-paddling/manistee-river/"));\nconst focus = portfolio.focusPortfolio.find((item) => item.id === "manistee");\ncheck("portfolio points at actual Search Console owner", focus?.surface === "https://chrisizworski.com/michigan-paddling/manistee-river/" && focus?.action === "PROTECT" && !focus?.toolId);\ncheck("Manistee leaves immediate queue", !portfolio.immediateQueue.join(" ").toLowerCase().includes("manistee"));\ncheck("Manistee enters protected queue", portfolio.protectedQueue.join(" ").toLowerCase().includes("manistee river paddling"));\n\nconsole.log("\\nMANISTEE PAGE-ONE PUSH BENCHMARK");\nconsole.log("=".repeat(72));\nconsole.log(`Baseline: ${benchmark.baseline.impressions} impressions, ${benchmark.baseline.clicks} clicks, position ${benchmark.baseline.averagePosition}`);\nconsole.log(`Target: top ${benchmark.targets.averagePositionAtOrBetterThan}, CTR >= ${(benchmark.targets.ctrAtOrAbove * 100).toFixed(1)}%`);\nif (failures.length) {\n  console.log("Failures:");\n  for (const failure of failures) console.log(` - ${failure}`);\n}\nif (process.argv.includes("--check")) {\n  if (failures.length) process.exitCode = 1;\n  else console.log("benchmark:manistee-page-one PASS\\n");\n}\n`;
write("scripts/benchmark-manistee-page-one-push.mjs", benchScript);

const ledgerPath = "benchmarks/growth-experiments.json";
const ledger = readJson(ledgerPath);
if (!ledger.experiments.some((item) => item.id === "2026-08-22-manistee-paddling-page-one")) {
  ledger.experiments.push({
    id: "2026-08-22-manistee-paddling-page-one",
    paths: ["/michigan-paddling/manistee-river/"],
    hypothesis: "A query-led snippet, direct trip-planning answer and explicit field-map handoff will move the existing Manistee River guide from the page-one threshold into the top 10 and turn current impressions into qualified clicks.",
    primaryMetric: "Search Console average position and CTR for /michigan-paddling/manistee-river/",
    baseline: { windowDays: 7, impressions: 72, clicks: 0, ctr: 0, averagePosition: 11.4 },
    target: { averagePositionAtOrBetterThan: 10, ctrAtOrAbove: 0.015, stretchAveragePositionAtOrBetterThan: 8 },
    status: "pending-clean-window",
    releaseDate: null,
    evaluationWindow: null,
    lastSearchFacingChangeDate: "2026-08-22",
    decisionDate: null,
    result: null,
    stopCondition: "Average position worsens beyond 15 after a meaningful impression sample, CTR remains effectively zero after the clean window, or the field map begins competing as a duplicate search owner."
  });
  ledger.ledgerVersion = "1.10.0";
  writeJson(ledgerPath, ledger);
}

const portfolioPath = "benchmarks/search-authority-portfolio.json";
const portfolio = readJson(portfolioPath);
const manistee = portfolio.focusPortfolio.find((item) => item.id === "manistee");
if (!manistee) throw new Error("Manistee focus item missing");
manistee.surface = "https://chrisizworski.com/michigan-paddling/manistee-river/";
delete manistee.toolId;
manistee.action = "PROTECT";
manistee.next = "Measure the August 22 Manistee River paddling page-one treatment for a clean 28-day window; keep the guide as the search owner and the field map as the utility destination.";
manistee.observed = { impressions: 72, clicks: 0, ctr: 0, position: 11.4 };
portfolio.immediateQueue = portfolio.immediateQueue.filter((item) => !item.toLowerCase().includes("manistee"));
if (!portfolio.protectedQueue.some((item) => item.toLowerCase().includes("manistee river paddling"))) {
  portfolio.protectedQueue.push("Manistee River paddling guide page-one treatment — guide search owner + field-map utility handoff");
}
writeJson(portfolioPath, portfolio);

const authorityPath = "scripts/benchmark-search-authority-portfolio.mjs";
let authority = read(authorityPath);
authority = authority.replace('    immediateText.includes("manistee") &&\n', '    !immediateText.includes("manistee") &&\n');
if (!authority.includes('protectedText.includes("manistee river paddling")')) {
  authority = authority.replace('    protectedText.includes("au sable") &&\n', '    protectedText.includes("au sable") &&\n    protectedText.includes("manistee river paddling") &&\n');
}
write(authorityPath, authority);

const verifyPath = "scripts/verify-source.mjs";
let verify = read(verifyPath);
const verifyMarker = "const intentionalChanges = new Set([\n";
const verifyNote = '  // Aug 22 2026: measured Manistee River paddling page-one treatment on the existing canonical guide. Re-crawl after production release, then remove this declaration.\n  "/michigan-paddling/manistee-river/",\n';
if (!verify.includes(verifyNote.trim())) {
  if (!verify.includes(verifyMarker)) throw new Error("Source parity marker missing");
  verify = verify.replace(verifyMarker, verifyMarker + verifyNote);
  write(verifyPath, verify);
}

const sitemapPath = "public/sitemap.xml";
let sitemap = read(sitemapPath);
const sitemapRe = /(<loc>https:\/\/chrisizworski\.com\/michigan-paddling\/manistee-river\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/;
if (sitemapRe.test(sitemap)) sitemap = sitemap.replace(sitemapRe, "$12026-08-22$2");
write(sitemapPath, sitemap);

const pkgPath = "package.json";
const pkg = readJson(pkgPath);
delete pkg.scripts["preverify:all"];
pkg.scripts["benchmark:manistee-page-one"] = "node scripts/benchmark-manistee-page-one-push.mjs";
if (!pkg.scripts["verify:all"].includes("benchmark:manistee-page-one")) {
  pkg.scripts["verify:all"] += " && npm run benchmark:manistee-page-one -- --check";
}
writeJson(pkgPath, pkg);

execFileSync("node", ["scripts/benchmark-manistee-page-one-push.mjs", "--check"], { stdio: "inherit" });

unlinkSync("scripts/compose-manistee-page-one.mjs");
execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
execFileSync("git", ["add", "-A"]);
execFileSync("git", ["commit", "-m", "Push Manistee paddling guide onto page one"], { stdio: "inherit" });
execFileSync("git", ["push"], { stdio: "inherit" });
