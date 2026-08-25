const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("Fall hub exposes a crawlable 2026 statewide answer without touching its protected snippet", () => {
  const html = read("public/fall-color/index.html");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || "";
  assert.equal(title, "Michigan Fall Color Map 2026 | Live Peak Conditions");
  assert.ok(title.length <= 60);
  assert.equal(description, "See where Michigan's fall color is peaking now on a live map built from canopy camera and weather data, with regional peak dates and a forecast.");
  assert.ok(description.length >= 110 && description.length <= 158);
  assert.match(html, /<h1[^>]*>Michigan Fall Color<\/h1>/);
  assert.match(html, /id="statewideStatusHeading"[^>]*>Michigan is still predominantly green as the 2026 season begins.<\/h2>/);
  assert.match(html, /id="statewideStatusUpdated" datetime="2026-08-21">Updated Aug 21<\/time>/);
  assert.doesNotMatch(html, />Reading the latest canopy and weather data.<\/div>/);
  assert.match(html, /function renderStatewideStatus()/);
});

test("Fall hub reuses canonical site entities and correct breadcrumb ownership", () => {
  const html = read("public/fall-color/index.html");
  assert.match(html, /"@type": "WebSite",\s*"@id": "https:\/\/chrisizworski\.com\/#website",\s*"url": "https:\/\/chrisizworski\.com\/",\s*"name": "Chris Izworski"/);
  assert.doesNotMatch(html, /https:\/\/chrisizworski\.com\/fall-color\/#website/);
  assert.match(html, /"name": "Home",\s*"item": "https:\/\/chrisizworski\.com\/"/);
  assert.match(html, /"mainEntity": {\s*"@id": "https:\/\/chrisizworski\.com\/fall-color\/#dataset"/);
  // Assert the PROPERTY, not a literal date. PR #45 converted four pinned-date tests for exactly
  // this reason: a literal breaks on the next legitimate edit, which is what happened on Aug 25
  // 2026 when the Person entity was consolidated and the stamper moved this page honestly.
  const stamp = html.match(/"dateModified": "(\d{4}-\d{2}-\d{2})"/);
  assert.ok(stamp, "fall hub carries a dateModified");
  assert.ok(stamp[1] <= new Date().toISOString().slice(0, 10), "fall hub dateModified is not in the future");
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
  assert.equal(baseline.priorityQuerySignals.fallColorHub.experiment.queuedSnippetTest.earliestDate, "2026-09-13");
  assert.equal(baseline.priorityQuerySignals.fallColorHub.experiment.queuedSnippetTest.proposedTitle, "Michigan Fall Color Map 2026: Where Color Is Now");
});

test("Fall hub schema date and sitemap freshness agree", () => {
  // The thing worth pinning is AGREEMENT between the page stamp and the sitemap entry, which is
  // what PR #44 caught drifting. Pinning a literal date asserts neither and breaks on every edit.
  const html = read("public/fall-color/index.html");
  const sitemap = read("public/sitemap.xml");
  const stamp = html.match(/"dateModified": "(\d{4}-\d{2}-\d{2})"/);
  const entry = sitemap.match(/<loc>https:\/\/chrisizworski\.com\/fall-color\/<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
  assert.ok(stamp, "fall hub carries a dateModified");
  assert.ok(entry, "fall hub has a sitemap lastmod");
  assert.equal(entry[1], stamp[1], "sitemap lastmod must equal the page dateModified");
});
