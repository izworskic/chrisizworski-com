const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

test("Circle Tour requests NOAA water level with the station's supported datum", () => {
  const html = readFileSync(path.join(__dirname, "../public/lake-superior-circle-tour/index.html"), "utf8");
  assert.ok(html.includes("station=9099064"));
  assert.ok(html.includes("datum=LWD"));
  assert.ok(html.includes("ft above LWD at Duluth"));
  assert.ok(!html.includes("datum=IGLD85"));
});

test("Northern Lights falls back cleanly when the primary NOAA forecast is unavailable", () => {
  const html = readFileSync(path.join(__dirname, "../public/northern-lights-michigan/index.html"), "utf8");
  assert.ok(html.includes("if (kpRes.status !== 'fulfilled') throw new Error('NOAA Kp forecast unavailable')"));
  assert.ok(html.includes("Live feed temporarily unavailable"));
  assert.ok(html.includes("NOAA feed unavailable, see manual content below"));
});

test("Northern Lights handles current NOAA object responses without NaN cards", () => {
  const html = readFileSync(path.join(__dirname, "../public/northern-lights-michigan/index.html"), "utf8");
  assert.ok(html.includes("normalizeNoaaRows"));
  assert.ok(html.includes("['kp','Kp']"));
  assert.ok(html.includes("['Kp','kp']"));
  assert.ok(html.includes("temporarily unavailable"));
  assert.ok(!html.includes("const max72 = rows.slice(0,24)"));

  const helperStart = html.indexOf("function normalizeNoaaRows");
  const helperEnd = html.indexOf("// === Main data fetch ===");
  const helpers = new Function(
    `${html.slice(helperStart, helperEnd)}; return {normalizeNoaaRows, parseNoaaTime};`,
  )();
  const rows = helpers.normalizeNoaaRows(
    [
      { time_tag: "2026-07-19T21:00:00", kp: 1.67 },
      { time_tag: "2026-07-20T00:00:00", kp: 1.33 },
    ],
    [["time_tag"], ["kp", "Kp"]],
  );
  assert.deepEqual(rows, [
    ["2026-07-19T21:00:00", 1.67],
    ["2026-07-20T00:00:00", 1.33],
  ]);
  assert.equal(helpers.parseNoaaTime(rows[0][0]).toISOString(), "2026-07-19T21:00:00.000Z");
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

test("Tools hub makes six live tools prominent without changing its canonical or library size", () => {
  const html = readFileSync(path.join(__dirname, "../public/tools/index.html"), "utf8");
  assert.ok(html.includes("<title>Free Michigan &amp; Great Lakes Tools | Chris Izworski</title>"));
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/tools/">'));
  assert.equal((html.match(/data-featured-tool=/g) || []).length, 6);
  assert.equal((html.match(/class="tool-cta"/g) || []).length, 6);
  assert.ok((html.match(/data-track-cluster=/g) || []).length >= 5);

  const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const itemList = jsonLd["@graph"].find((entry) => entry["@type"] === "ItemList");
  const collection = jsonLd["@graph"].find((entry) => entry["@type"] === "CollectionPage");
  assert.equal(itemList.numberOfItems, 19);
  assert.equal(itemList.itemListElement.length, 19);
  assert.equal(collection.dateModified, "2026-07-20");
  assert.equal(collection.author["@id"], "https://chrisizworski.com/#person");
});

test("Great Lakes hub separates live conditions from history and gives each live tool a CTA", () => {
  const html = readFileSync(path.join(__dirname, "../public/great-lakes/index.html"), "utf8");
  assert.ok(html.includes("Live Great Lakes Conditions and Vessel Tools"));
  assert.equal((html.match(/data-featured-tool=/g) || []).length, 6);
  assert.equal((html.match(/class="tool-cta"/g) || []).length, 6);

  const history = html.match(/<h2 class="sh">History and Heritage<\/h2>([\s\S]*?)<h2 class="sh">/)[1];
  assert.doesNotMatch(history, /\/(?:soo-locks|northern-lights-michigan|great-lakes-buoys)\//);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes/">'));
});

test("Measured tool funnel pages include privacy-conscious analytics and real-user performance hooks", () => {
  const files = [
    "index.html",
    "tools/index.html",
    "great-lakes/index.html",
    "soo-locks/index.html",
    "northern-lights-michigan/index.html",
    "great-lakes-buoys/index.html",
    "great-lakes-gazette/index.html",
    "great-lakes-freighter-tracking/index.html",
    "great-lakes-beaches/index.html",
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
