const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

test("Circle Tour requests NOAA water level with the station's supported datum", () => {
  const html = readFileSync(path.join(__dirname, "../public/lake-superior-circle-tour/index.html"), "utf8");
  const client = readFileSync(path.join(__dirname, "../public/assets/lake-superior-circle-tour.js"), "utf8");
  const integration = html + client;
  assert.ok(integration.includes("station=9099064"));
  assert.ok(integration.includes("datum=LWD"));
  assert.ok(integration.includes("ft above LWD at Duluth"));
  assert.ok(!integration.includes("datum=IGLD85"));
});

test("Northern Lights falls back cleanly when the primary NOAA forecast is unavailable", () => {
  const html = readFileSync(path.join(__dirname, "../public/northern-lights-michigan/index.html"), "utf8");
  assert.ok(html.includes("if (!response.ok) throw new Error('Aurora endpoint returned '+response.status)"));
  assert.ok(html.includes("Live NOAA feed temporarily unavailable"));
  assert.ok(html.includes("NOAA feed unavailable · manual guide active"));
  assert.ok(html.includes("official NOAA 30-minute forecast"));
});

test("Northern Lights uses the normalized same-origin NOAA endpoint without NaN cards", () => {
  const html = readFileSync(path.join(__dirname, "../public/northern-lights-michigan/index.html"), "utf8");
  assert.ok(html.includes("fetch('/api/aurora'"));
  assert.ok(html.includes("function asFiniteNumber(value)"));
  assert.ok(html.includes("value === null || value === undefined"));
  assert.ok(html.includes("Number.isFinite(max24)"));
  assert.ok(html.includes("renderRegionalOutlook"));
  assert.ok(html.includes("temporarily unavailable"));
  assert.ok(!html.includes("fetch(kpUrl)"));
  assert.ok(!html.includes("const max72 = rows.slice(0,24)"));
});

test("Soo Locks renders an official no-key vessel map without restoring the refused MarineTraffic iframe", () => {
  const html = readFileSync(path.join(__dirname, "../public/soo-locks/index.html"), "utf8");
  assert.doesNotMatch(html, /<iframe[^>]+marinetraffic/i);
  assert.ok(html.includes('id="sooVesselMap"'));
  assert.ok(html.includes("https://embed.myshiptracking.com/embed?myst"));
  assert.ok(html.includes("lat=46.5036"));
  assert.ok(html.includes("lng=-84.36"));
  assert.ok(html.includes('loading="lazy"'));
  assert.ok(html.includes("AIS positions are informational"));
  assert.ok(html.includes("https://ais.boatnerd.com/"));
  assert.ok(html.includes("https://ais.boatnerd.com/passage/port/soo-locks"));
  assert.ok(html.includes("https://www.marinetraffic.com"));
  assert.ok(!html.includes("AISSTREAM_API_KEY"));
  assert.ok(!html.includes("fetch('/api/soo-vessels'"));
  assert.ok(!html.includes("leaflet@1.9.4"));

  const toolsHtml = readFileSync(path.join(__dirname, "../public/tools/index.html"), "utf8");
  const guidesHtml = readFileSync(path.join(__dirname, "../public/guides/index.html"), "utf8");
  assert.ok(toolsHtml.includes("Interactive live AIS vessel map at the Soo Locks"));
  assert.ok(guidesHtml.includes("An interactive live AIS map for vessels near the Soo Locks"));
});

test("Buoy copy stays accurate as the live reporting count changes", () => {
  const buoyHtml = readFileSync(path.join(__dirname, "../public/great-lakes-buoys/index.html"), "utf8");
  const toolsHtml = readFileSync(path.join(__dirname, "../public/tools/index.html"), "utf8");
  assert.doesNotMatch(buoyHtml, /115 NOAA|All 115 Stations|all 115 stations/i);
  assert.doesNotMatch(toolsHtml, /115 NOAA/i);
  assert.ok(buoyHtml.includes("All Reporting Great Lakes Stations"));
});

test("Great Lakes Gazette reads the latest public edition without a browser credential", () => {
  const html = readFileSync(path.join(__dirname, "../public/great-lakes-gazette/index.html"), "utf8");
  assert.ok(html.includes("https://gazette.chrisizworski.com/api/latest"));
  assert.ok(!/authorization/i.test(html));
  assert.ok(!html.includes("/api/generate"));
  assert.ok(!html.includes("great-lakes-gazette.vercel.app"));

  const projects = readFileSync(path.join(__dirname, "../public/projects/index.html"), "utf8");
  assert.ok(projects.includes("gazette.chrisizworski.com"));
  assert.ok(!projects.includes("great-lakes-gazette.vercel.app"));
});

test("Tools hub makes nine live tools prominent and indexes the expanded library", () => {
  const html = readFileSync(path.join(__dirname, "../public/tools/index.html"), "utf8");
  assert.ok(html.includes("<title>Free Michigan &amp; Great Lakes Tools | Chris Izworski</title>"));
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/tools/">'));
  assert.equal((html.match(/data-featured-tool=/g) || []).length, 9);
  assert.equal((html.match(/class="tool-cta"/g) || []).length, 9);
  assert.ok((html.match(/data-track-cluster=/g) || []).length >= 5);

  const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const itemList = jsonLd["@graph"].find((entry) => entry["@type"] === "ItemList");
  const collection = jsonLd["@graph"].find((entry) => entry["@type"] === "CollectionPage");
  assert.equal(itemList.numberOfItems, 36);
  assert.equal(itemList.itemListElement.length, 36);
  // Derived from git, so pin the shape not the day.
  assert.match(collection.dateModified, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Date.parse(collection.dateModified) <= Date.now(), "dateModified must not be in the future");
  assert.equal(collection.author["@id"], "https://chrisizworski.com/#person");
  assert.ok(
    itemList.itemListElement.some(
      (entry) => entry.item?.url === "https://chrisizworski.com/mackinac-bridge-live/",
    ),
  );
  assert.ok(
    itemList.itemListElement.some(
      (entry) => entry.item?.url === "https://chrisizworski.com/michigan-border-wait-times/",
    ),
  );
});

test("Great Lakes hub separates live conditions from history and gives each live tool a CTA", () => {
  const html = readFileSync(path.join(__dirname, "../public/great-lakes/index.html"), "utf8");
  assert.ok(html.includes("Live Great Lakes Conditions and Vessel Tools"));
  // 9 since Aug 4 2026: the Michigan Ice Report card was added to the live grid.
  assert.equal((html.match(/data-featured-tool=/g) || []).length, 9);
  assert.equal((html.match(/class="tool-cta"/g) || []).length, 9);

  const history = html.match(/<h2 class="sh">History and Heritage<\/h2>([\s\S]*?)<h2 class="sh">/)[1];
  assert.doesNotMatch(history, /\/(?:soo-locks|northern-lights-michigan|great-lakes-buoys)\//);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes/">'));
});

test("Measured tool funnel pages include privacy-conscious analytics and real-user performance hooks", () => {
  const files = [
    "index.html",
    "tools/index.html",
    "great-lakes/index.html",
    "lake-superior-circle-tour/index.html",
    "soo-locks/index.html",
    "northern-lights-michigan/index.html",
    "great-lakes-buoys/index.html",
    "great-lakes-gazette/index.html",
    "great-lakes-freighter-tracking/index.html",
    "great-lakes-beaches/index.html",
    "mackinac-bridge-live/index.html",
    "mackinac-bridge-driver-assistance/index.html",
    "mackinac-bridge-rv-trailer-wind-rules/index.html",
    "mackinac-bridge-tolls/index.html",
    "michigan-border-wait-times/index.html",
    "gordie-howe-bridge-wait-time/index.html",
    "ambassador-bridge-wait-time/index.html",
    "detroit-windsor-tunnel-wait-time/index.html",
    "blue-water-bridge-wait-time/index.html",
    "sault-ste-marie-border-wait-time/index.html",
  ];
  for (const file of files) {
    const html = readFileSync(path.join(__dirname, "../public", file), "utf8");
    assert.ok(html.includes('/_vercel/insights/script.js'), `${file} is missing Web Analytics`);
    assert.ok(html.includes('/_vercel/speed-insights/script.js'), `${file} is missing Speed Insights`);
  }

  const tracker = readFileSync(path.join(__dirname, "../public/assets/tool-engagement.js"), "utf8");
  assert.ok(tracker.includes('name: "Tool Open"'));
  assert.ok(tracker.includes('name: "Tool Cluster Open"'));
  assert.ok(!tracker.includes("localStorage"));
  assert.ok(!tracker.includes("document.cookie"));
  assert.ok(!tracker.includes("preventDefault"));
});

test("SEO scorecard records unknown Google metrics as null instead of manufacturing a baseline", () => {
  const baseline = JSON.parse(
    readFileSync(path.join(__dirname, "../benchmarks/seo-engagement-baseline.json"), "utf8"),
  );
  assert.equal(baseline.searchConsole.status, "awaiting-28-day-export");
  assert.equal(baseline.searchConsole.clicks, null);
  assert.equal(baseline.searchConsole.impressions, null);
  assert.equal(baseline.targets.day90To180.organicClicksMultiplier, 10);
  assert.equal(baseline.technicalGuardrails.canonicalUrlsChanged, 0);
});
