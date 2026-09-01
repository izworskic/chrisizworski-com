const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("Great Lakes ship tracker matches live search intent without changing the canonical", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");

  assert.ok(html.includes("<title>Great Lakes Ship Tracker Live: AIS Map | Chris Izworski</title>"));
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-freighter-tracking/">'));
  assert.ok(html.includes('id="freighter-tracker-answer"'));
  assert.ok(html.includes("Track Great Lakes Freighters Live"));
  assert.ok(html.includes('id="live-map"'));
  assert.ok(!html.includes('href="/advertise/"'));
});

test("ship tracker exposes seven useful map views on one crawlable page", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");
  const script = read("public/assets/freighter-tracker.js");
  const expectedViews = ["overview", "soo", "mackinac", "duluth", "port-huron", "detroit", "saginaw"];

  for (const view of expectedViews) {
    assert.ok(html.includes(`data-freighter-view="${view}"`), view);
    assert.ok(script.includes(`${view === "port-huron" ? '"port-huron"' : view}: {`) || script.includes(`${view}: {`), view);
  }
  assert.equal((html.match(/class="view-tab"/g) || []).length, 7);
  assert.ok(script.includes("window.history.replaceState"));
  assert.ok(script.includes('name: "Freighter Map View"'));
  assert.ok(!script.includes("localStorage"));
  assert.ok(!script.includes("document.cookie"));
});

test("ship tracker uses supported no-key AIS and existing same-origin NOAA data", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");
  const script = read("public/assets/freighter-tracker.js");

  assert.ok(html.includes("https://embed.myshiptracking.com/embed?myst"));
  assert.ok(html.includes("https://www.myshiptracking.com/more/embed-our-map"));
  assert.ok(html.includes("https://ais.boatnerd.com/passage/port/soo-locks"));
  assert.ok(html.includes("must not be used for navigation"));
  assert.ok(script.includes('fetch("/api/buoys"'));
  assert.ok(script.includes("distanceMiles"));
  assert.ok(script.includes("AIS coverage may be delayed or incomplete"));
  assert.ok(!html.includes("AISSTREAM_API_KEY"));
  assert.ok(!script.includes("AISSTREAM_API_KEY"));
  assert.ok(!script.includes("fetch(\"https://ais.boatnerd.com"));
});

test("ship tracker remains bounded on tablets and phones", () => {
  const css = read("public/assets/freighter-tracker.css");

  assert.ok(css.includes("#freighterMap,.map-stage{height:500px;min-height:500px}"));
  assert.ok(css.includes("#freighterMap,.map-stage{height:420px;min-height:420px}"));
  assert.ok(css.includes("#freighterMap,.map-stage{height:370px;min-height:370px}"));
  assert.ok(!css.includes("height:100vh"));
});

test("ship tracker structured data and internal discovery surfaces are aligned", () => {
  const html = read("public/great-lakes-freighter-tracking/index.html");
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const tools = read("public/tools/index.html");
  const greatLakes = read("public/great-lakes/index.html");
  const home = read("public/index.html");
  const sitemap = read("public/sitemap.xml");
  const llms = read("public/llms.txt");

  assert.equal(blocks.length, 1);
  assert.doesNotThrow(() => JSON.parse(blocks[0][1]));
  assert.ok(tools.includes('data-featured-tool="great-lakes-freighter-tracking"'));
  assert.ok(tools.includes("Great Lakes Ship Tracker Live, Freighters and AIS Map"));
  assert.ok(greatLakes.includes("Great Lakes Ship Tracker Live"));
  assert.ok(home.includes("Track freighters &rarr;"));
  // lastmod is derived from git by scripts/stamp-freshness.mjs, so assert its shape and keep
  // the priority pinned, which is the part this test is actually protecting.
  assert.match(sitemap, /great-lakes-freighter-tracking\/<\/loc>\s*<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>[\s\S]*?<priority>0\.9<\/priority>/);
  assert.ok(llms.includes("## Great Lakes Ship Tracking"));
});

test("freighter experiment is recorded as the released August 3 treatment", () => {
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  const experiment = ledger.experiments.find((item) => item.id === "2026-08-03-great-lakes-ship-tracker");

  assert.ok(experiment);
  assert.deepEqual(experiment.baseline, { impressions: 996, clicks: 1, ctr: 0.001, averagePosition: 23.87 });
  assert.equal(experiment.target.impressionsMultiple, 3);
  assert.equal(experiment.target.ctr, 0.015);
  assert.equal(experiment.target.averagePosition, 15);
  // Read and closed 2026-09-01 from the Search Console 28-day export. What matters now is that
  // the entry carries a recorded result, not that it is still frozen open.
  assert.equal(experiment.status, "evaluated");
  assert.ok(experiment.result?.measured, "read must record the measured page row");
  assert.ok(experiment.decisionDate, "read must record a decision date");
  assert.equal(experiment.releaseDate, "2026-08-03");
  assert.deepEqual(experiment.evaluationWindow, { start: "2026-08-04", end: "2026-08-31" });
});
