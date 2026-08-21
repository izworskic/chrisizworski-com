#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const hubPath = path.join(root, "public", "fall-color", "index.html");
const sitemapPath = path.join(root, "public", "sitemap.xml");
const baselinePath = path.join(root, "benchmarks", "ctr-surface-baseline.json");
const benchmarkScriptPath = path.join(root, "scripts", "benchmark-ctr-surface.mjs");
const testPath = path.join(root, "tests", "fall-search-lift.test.js");

function replaceOnce(source, from, to, label) {
  const at = source.indexOf(from);
  if (at === -1) throw new Error(`Missing expected source for ${label}`);
  if (source.indexOf(from, at + from.length) !== -1) {
    throw new Error(`Expected one match for ${label}, found more than one`);
  }
  return source.slice(0, at) + to + source.slice(at + from.length);
}

function replaceAllExact(source, from, to, minCount, label) {
  const count = source.split(from).length - 1;
  if (count < minCount) throw new Error(`Expected at least ${minCount} matches for ${label}, found ${count}`);
  return source.split(from).join(to);
}

let hub = await readFile(hubPath, "utf8");

const oldTitle = "Michigan Fall Color Map 2026 | Live Peak Conditions";
const newTitle = "Michigan Fall Color Map 2026: Where Color Is Now";
const oldDescription = "See where Michigan's fall color is peaking now on a live map built from canopy camera and weather data, with regional peak dates and a forecast.";
const newDescription = "Michigan fall color map for 2026 with today's statewide status, regional peak dates, live canopy and weather signals, and a forecast from the U.P. south.";

hub = replaceAllExact(hub, oldTitle, newTitle, 3, "Fall hub title surfaces");
hub = replaceAllExact(hub, oldDescription, newDescription, 3, "Fall hub description surfaces");

hub = replaceOnce(
  hub,
`    {
      "@type": "WebSite",
      "@id": "https://chrisizworski.com/fall-color/#website",
      "url": "https://chrisizworski.com/fall-color/",
      "name": "Michigan Fall Color",
      "description": "Live Michigan fall color map, forecast, and rivers to paddle through the color.",
      "inLanguage": "en-US",
      "publisher": {
        "@id": "https://chrisizworski.com/#person"
      }
    },`,
`    {
      "@type": "WebSite",
      "@id": "https://chrisizworski.com/#website",
      "url": "https://chrisizworski.com/",
      "name": "Chris Izworski",
      "publisher": {
        "@id": "https://chrisizworski.com/#person"
      }
    },`,
  "canonical WebSite entity",
);
hub = replaceAllExact(
  hub,
  '"@id": "https://chrisizworski.com/fall-color/#website"',
  '"@id": "https://chrisizworski.com/#website"',
  1,
  "WebPage isPartOf canonical site",
);
hub = replaceOnce(
  hub,
  '"name": "Michigan Fall Color Map 2026: Live Peak Conditions and Forecast"',
  '"name": "Michigan Fall Color Map 2026: Where Color Is Now"',
  "WebPage name",
);
hub = replaceOnce(hub, '"dateModified": "2026-08-18"', '"dateModified": "2026-08-21"', "Fall hub dateModified");
hub = replaceOnce(
  hub,
`      "breadcrumb": {
        "@id": "https://chrisizworski.com/fall-color/#breadcrumb"
      },
      "isAccessibleForFree": true`,
`      "breadcrumb": {
        "@id": "https://chrisizworski.com/fall-color/#breadcrumb"
      },
      "mainEntity": {
        "@id": "https://chrisizworski.com/fall-color/#dataset"
      },
      "isAccessibleForFree": true`,
  "Fall hub mainEntity",
);
hub = replaceOnce(
  hub,
`          "name": "Home",
          "item": "https://chrisizworski.com/fall-color/"`,
`          "name": "Home",
          "item": "https://chrisizworski.com/"`,
  "Fall breadcrumb home",
);
hub = replaceOnce(hub, '<h1 style="margin-top:7px">Michigan Fall Color</h1>', '<h1 style="margin-top:7px">Michigan Fall Color Map 2026</h1>', "Fall H1");

const statewideStatus = `
  <section class="card pad" id="statewideStatus" aria-labelledby="statewideStatusHeading" style="margin:16px 0">
    <div class="row" style="align-items:baseline;margin-bottom:8px">
      <span class="kicker">2026 statewide status</span>
      <time class="mono tiny muted" id="statewideStatusUpdated" datetime="2026-08-21">Updated Aug 21</time>
    </div>
    <h2 id="statewideStatusHeading" class="serif-h" style="font-size:20px;line-height:1.2;margin:0 0 7px">Michigan is still predominantly green as the 2026 season begins.</h2>
    <p class="small soft" id="statewideStatusBody" style="margin:0">The first meaningful color normally develops in the western Upper Peninsula in late September. For trip planning, target Sep 28&ndash;Oct 6 in the western U.P., Oct 5&ndash;17 across northern Lower Michigan, and Oct 18&ndash;28 in southern Michigan. Live canopy and weather readings below refine those windows as the season moves.</p>
  </section>
`;
hub = replaceOnce(
  hub,
  '\n\n  <section class="seasonal-desk" data-seasonal-module="fall-day-decisions"',
  `\n${statewideStatus}\n  <section class="seasonal-desk" data-seasonal-module="fall-day-decisions"`,
  "crawler-readable statewide status",
);
hub = replaceOnce(
  hub,
  '<div id="liveStripBody" class="small soft">Reading the latest canopy and weather data.</div>',
  '<div id="liveStripBody" class="small soft">Seasonal baseline: western U.P. peak Sep 28&ndash;Oct 6; northern Lower Michigan Oct 5&ndash;17; southern Michigan Oct 18&ndash;28. Live readings refine these windows when available.</div>',
  "live-strip static baseline",
);
hub = replaceOnce(
  hub,
  'if(!LIVE){el.textContent="Live data is not loading just now. The season guide below still applies.";return;}',
  'if(!LIVE){el.textContent="Live feed unavailable just now. Use the dated statewide status above and the regional season bands below; neither will invent a live reading.";return;}',
  "live-strip fallback",
);

const statusRenderer = `
// ---- render: statewide direct answer ----
function renderStatewideStatus(){
  const heading=document.getElementById("statewideStatusHeading");
  const body=document.getElementById("statewideStatusBody");
  const updated=document.getElementById("statewideStatusUpdated");
  if(!heading||!body||!updated)return;
  if(!LIVE||!Object.keys(LIVE).length)return;
  const ranked=REGIONS.map(r=>({r,d:todayStage(r)})).sort((a,b)=>b.d.pct-a.d.pct);
  const lead=ranked[0];
  const peaks=ranked.filter(x=>x.d.phase==="peak"||x.d.pct>=85);
  if(peaks.length){
    heading.textContent=peaks.length===1
      ? peaks[0].r.name+" is at or near peak now."
      : "Peak color is strongest in "+listNames(peaks.slice(0,3).map(x=>x.r.name))+".";
  }else if(lead.d.pct<20){
    heading.textContent="Michigan is still mostly green. "+lead.r.name+" is leading the season.";
  }else{
    heading.textContent=lead.r.name+" is leading Michigan's fall color at about "+lead.d.pct+"%.";
  }
  body.textContent="The live model puts "+lead.r.name+" at about "+lead.d.pct+"% of peak, with its current peak window "+fmt(lead.d.ps)+" to "+fmt(lead.d.pe)+". The map and regional bands below show how the rest of Michigan compares.";
  const stamp=new Date();
  updated.textContent="Updated "+stamp.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  updated.setAttribute("datetime",stamp.toISOString().slice(0,10));
}
`;
hub = replaceOnce(hub, '\n\n// ---- map ----', `\n${statusRenderer}\n// ---- map ----`, "statewide live renderer");
hub = replaceOnce(hub, '  buildMap(); renderAll();', '  renderStatewideStatus(); buildMap(); renderAll();', "initial statewide render");
hub = replaceOnce(
  hub,
  '    computeLiveOffsets();\n    renderLiveStrip(); renderAll(); if(nearId)renderNearMe();',
  '    computeLiveOffsets();\n    renderStatewideStatus(); renderLiveStrip(); renderAll(); if(nearId)renderNearMe();',
  "live statewide render",
);
hub = replaceOnce(hub, '  }).catch(()=>{renderLiveStrip();});', '  }).catch(()=>{renderStatewideStatus();renderLiveStrip();});', "live-failure statewide render");

await writeFile(hubPath, hub);

let sitemap = await readFile(sitemapPath, "utf8");
const sitemapPattern = /(<loc>https:\/\/chrisizworski\.com\/fall-color\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/;
if (!sitemapPattern.test(sitemap)) throw new Error("Fall hub sitemap entry not found");
sitemap = sitemap.replace(sitemapPattern, "$12026-08-21$2");
await writeFile(sitemapPath, sitemap);

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
baseline.benchmarkVersion = "1.1.0";
baseline.baselineCreated = "2026-08-21";
baseline.source = {
  gscRows: "Google Search Console export chrisizworski.com-Performance-on-Search-2026-08-21; page and query rows for 2026-08-13 through 2026-08-19",
  windowLabel: "GSC Aug 13-19, 2026 (7 complete days)",
  caution: "The fresh 7-day GSC window is directional. Low-volume page and query CTRs are volatile; use them to prioritize experiments, not as promises. The expected CTR curve remains modeled, not measured."
};
baseline.measuredPages = [
  { path: "/soo-locks/", persona: "boat-watcher", impressions: 2509, clicks: 81, ctr: 0.0323, position: 7.35, zeroClickRisk: "low" },
  { path: "/northern-lights-michigan/", persona: "tonight-checker", impressions: 1875, clicks: 15, ctr: 0.0080, position: 9.69, zeroClickRisk: "medium" },
  { path: "/fall-color/", persona: "weekend-planner", impressions: 716, clicks: 6, ctr: 0.0084, position: 14.27, zeroClickRisk: "low" },
  { path: "/mackinac-bridge-live/", persona: "boat-watcher", impressions: 736, clicks: 2, ctr: 0.0027, position: 10.69, zeroClickRisk: "low" },
  { path: "/when-to-plant-tomatoes-michigan/", persona: "local-grower", impressions: 290, clicks: 2, ctr: 0.0069, position: 8.18, zeroClickRisk: "high" },
  { path: "/saginaw-bay-ecology/", persona: "field-user", impressions: 192, clicks: 3, ctr: 0.0156, position: 8.18, zeroClickRisk: "high" },
  { path: "/michigan-frost-dates/", persona: "local-grower", impressions: 18, clicks: 0, ctr: 0, position: 13.28, zeroClickRisk: "high" }
];
baseline.seasonalWatchlist.note = "The Fall hub now has measured GSC data and moved into measuredPages. The remaining Fall detail pages stay on the hygiene watchlist while their individual query samples mature.";
baseline.seasonalWatchlist.paths = baseline.seasonalWatchlist.paths.filter((p) => p !== "/fall-color/");
baseline.priorityQuerySignals = {
  observedWindow: "2026-08-13/2026-08-19",
  fallColorHub: {
    page: { impressions: 716, clicks: 6, ctr: 0.0084, position: 14.27 },
    queries: [
      { query: "michigan fall color map 2026", impressions: 108, clicks: 0, ctr: 0, position: 8.86 },
      { query: "michigan peak fall colors 2026", impressions: 16, clicks: 0, ctr: 0, position: 10.81 },
      { query: "michigan fall colors 2026", impressions: 12, clicks: 0, ctr: 0, position: 9.17 },
      { query: "michigan fall foliage 2026", impressions: 5, clicks: 0, ctr: 0, position: 7.0 },
      { query: "peak fall colors michigan 2026", impressions: 3, clicks: 0, ctr: 0, position: 7.33 },
      { query: "fall color calendar michigan 2026", impressions: 3, clicks: 0, ctr: 0, position: 7.67 }
    ],
    experiment: {
      hypothesis: "A query-aligned title plus a crawlable dated statewide answer will raise click capture without adding near-duplicate landing pages.",
      primaryGuardrail: "Do not sacrifice canonical ownership, useful live data, or detail-page rankings to chase CTR.",
      nextCheckpoint: "Compare the next 7 complete GSC days after deployment once the hub has at least 500 impressions; treat 1.5% hub CTR as the first directional target, not a guarantee."
    }
  }
};
await writeFile(baselinePath, JSON.stringify(baseline, null, 2) + "\n");

let benchmarkScript = await readFile(benchmarkScriptPath, "utf8");
benchmarkScript = replaceOnce(
  benchmarkScript,
  'const G = baseline.gates;\n',
  'const G = baseline.gates;\nconst gscWindow = baseline.source?.windowLabel || "configured GSC window";\n',
  "CTR benchmark window label",
);
benchmarkScript = replaceOnce(
  benchmarkScript,
  'const sitemapFiles = ["sitemap.xml", "sitemap-beaches.xml", "sitemap-reputation.xml"];',
  'const sitemapFiles = ["sitemap.xml", "sitemap-fall.xml", "sitemap-beaches.xml", "sitemap-reputation.xml", "sitemap-winter.xml", "sitemap-manistee.xml"];',
  "CTR benchmark sitemap coverage",
);
benchmarkScript = replaceOnce(
  benchmarkScript,
  'console.log("\\nMEASURED PAGES  (impression weighted, GSC window 171 days)\\n");',
  'console.log(`\\nMEASURED PAGES  (impression weighted, ${gscWindow})\\n`);',
  "CTR benchmark measured heading",
);
benchmarkScript = replaceOnce(
  benchmarkScript,
  'console.log("\\nSEASONAL WATCHLIST  (no GSC history, hygiene only)\\n");',
  'console.log("\\nSEASONAL WATCHLIST  (hygiene for emerging seasonal pages)\\n");',
  "CTR benchmark watchlist heading",
);
await writeFile(benchmarkScriptPath, benchmarkScript);

const testSource = `const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("Fall hub exposes a query-aligned, crawlable 2026 statewide answer", () => {
  const html = read("public/fall-color/index.html");
  const title = html.match(/<title>([^<]+)<\\/title>/)?.[1] || "";
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || "";
  assert.equal(title, "Michigan Fall Color Map 2026: Where Color Is Now");
  assert.ok(title.length <= 60);
  assert.equal(description, "Michigan fall color map for 2026 with today's statewide status, regional peak dates, live canopy and weather signals, and a forecast from the U.P. south.");
  assert.ok(description.length >= 110 && description.length <= 158);
  assert.match(html, /<h1[^>]*>Michigan Fall Color Map 2026<\\/h1>/);
  assert.match(html, /id="statewideStatusHeading"[^>]*>Michigan is still predominantly green as the 2026 season begins\.<\\/h2>/);
  assert.match(html, /id="statewideStatusUpdated" datetime="2026-08-21">Updated Aug 21<\\/time>/);
  assert.doesNotMatch(html, />Reading the latest canopy and weather data\.<\\/div>/);
  assert.match(html, /function renderStatewideStatus\(\)/);
});

test("Fall hub reuses canonical site entities and correct breadcrumb ownership", () => {
  const html = read("public/fall-color/index.html");
  assert.match(html, /"@type": "WebSite",\\s*"@id": "https:\\/\\/chrisizworski\\.com\\/#website",\\s*"url": "https:\\/\\/chrisizworski\\.com\\/",\\s*"name": "Chris Izworski"/);
  assert.doesNotMatch(html, /https:\\/\\/chrisizworski\\.com\\/fall-color\\/#website/);
  assert.match(html, /"name": "Home",\\s*"item": "https:\\/\\/chrisizworski\\.com\\/"/);
  assert.match(html, /"mainEntity": \{\\s*"@id": "https:\\/\\/chrisizworski\\.com\\/fall-color\\/#dataset"/);
  assert.match(html, /"dateModified": "2026-08-21"/);
});

test("Fall search benchmark uses the fresh query-level GSC window", () => {
  const baseline = JSON.parse(read("benchmarks/ctr-surface-baseline.json"));
  assert.equal(baseline.benchmarkVersion, "1.1.0");
  assert.equal(baseline.baselineCreated, "2026-08-21");
  assert.match(baseline.source.gscRows, /page and query rows/);
  const hub = baseline.measuredPages.find((p) => p.path === "/fall-color/");
  assert.deepEqual(hub, { path: "/fall-color/", persona: "weekend-planner", impressions: 716, clicks: 6, ctr: 0.0084, position: 14.27, zeroClickRisk: "low" });
  assert.ok(!baseline.seasonalWatchlist.paths.includes("/fall-color/"));
  assert.equal(baseline.priorityQuerySignals.fallColorHub.queries[0].query, "michigan fall color map 2026");
  assert.equal(baseline.priorityQuerySignals.fallColorHub.queries[0].position, 8.86);
});

test("Fall hub schema date and sitemap freshness agree", () => {
  const sitemap = read("public/sitemap.xml");
  assert.match(sitemap, /<loc>https:\\/\\/chrisizworski\\.com\\/fall-color\\/<\\/loc>\\s*<lastmod>2026-08-21<\\/lastmod>/);
});
`;
await writeFile(testPath, testSource);

console.log("Applied Fall search lift: hub answer/snippet/schema, fresh CTR baseline, sitemap freshness, and regression tests.");
