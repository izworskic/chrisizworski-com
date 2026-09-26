const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

function title(html) {
  return html.match(/<title>(.*?)<\/title>/s)?.[1] || "";
}

test("Mackinac toll page leads with the page-one passenger-car answer", () => {
  const html = read("public/mackinac-bridge-tolls/index.html");
  const tollExperiment = JSON.parse(read("benchmarks/transport-365-growth.json")).experiments[0];
  assert.equal(title(html), "Mackinac Bridge Toll 2026: $4 for a Passenger Car");
  assert.ok(title(html).replaceAll("&amp;", "&").length <= 60);
  const tollDescription = /<meta name="description" content="([^"]+)"/.exec(html)?.[1] ?? "";
  assert.equal(tollDescription, tollExperiment.treatment.metaDescription);
  assert.match(tollDescription, /\$4 one way/i);
  assert.match(tollDescription, /\$8 round trip/i);
  assert.match(tollDescription, /cash/i);
  assert.match(tollDescription, /Apple Pay/i);
  assert.match(tollDescription, /Google Pay/i);
  assert.match(tollDescription, /MacPass/i);
  assert.match(html, /<h1>Mackinac Bridge Toll 2026: \$4 for a Passenger Car<\/h1>/);
  assert.match(html, /The Mackinac Bridge toll is \$4 one way for a standard two-axle passenger car in 2026, or \$8 round trip at the standard rate\./i);
  assert.match(html, /Passenger vehicles are \$2 per axle/i);
  assert.match(html, /Motorhomes and other vehicles outside the passenger classification are \$5 per axle/i);
  assert.match(html, /credit\/debit cards carry a 2\.3% fee/i);
  assert.match(html, /passenger vehicles not towing a trailer.*\$0 return crossing.*within 36 hours/is);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/mackinac-bridge-tolls/">'));
});

test("Gordie Howe treatment captures camera intent without inventing an operator camera", () => {
  const html = read("public/gordie-howe-bridge-wait-time/index.html");
  assert.equal(title(html), "Gordie Howe Bridge Wait Times &amp; Live Approach Camera");
  assert.ok(title(html).length <= 60);
  assert.match(html, /<h1>Gordie Howe Bridge Wait Times &amp; Live Approach Camera<\/h1>/);
  assert.match(html, /nearest live Highway 401 approach camera/i);
  assert.match(html, /operator still lists its own live camera feeds as coming soon/i);
  assert.match(html, /Ontario 511 live approach view/i);
  assert.doesNotMatch(html, /official Gordie Howe (?:live )?camera/i);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/gordie-howe-bridge-wait-time/">'));
});

test("365 transport experiment records observed baselines and the focused toll follow-up", () => {
  const benchmark = JSON.parse(read("benchmarks/transport-365-growth.json"));
  const toll = benchmark.experiments.find((item) => item.id === "mackinac-toll-price-led-ctr");
  const gordie = benchmark.experiments.find((item) => item.id === "gordie-howe-wait-camera-ctr");
  assert.equal(toll.baseline.impressions, 637);
  assert.equal(toll.baseline.clicks, 1);
  assert.equal(toll.latestLeadingSignal.page.impressions, 490);
  assert.equal(toll.latestLeadingSignal.page.clicks, 0);
  assert.equal(toll.latestLeadingSignal.page.averagePosition, 7.44);
  assert.equal(toll.latestObservedSignal.page.currentImpressions, 5463);
  assert.equal(toll.latestObservedSignal.page.currentClicks, 17);
  assert.equal(toll.latestObservedSignal.page.currentAveragePosition, 8.14);
  assert.equal(toll.latestObservedSignal.exactQuery.query, "mackinac bridge toll");
  assert.equal(toll.latestObservedSignal.exactQuery.impressions, 778);
  assert.equal(toll.latestObservedSignal.exactQuery.clicks, 1);
  assert.equal(toll.latestObservedSignal.exactQuery.ctr, 0.0013);
  assert.equal(toll.latestObservedSignal.exactQuery.averagePosition, 9.98);
  assert.equal(toll.target.ctr, 0.02);
  assert.deepEqual(toll.freezeDuringWindow, ["title", "metaDescription", "h1", "firstAnswer", "structuredData", "canonical", "indexability"]);
  assert.equal(gordie.baseline.impressions, 498);
  assert.equal(gordie.baseline.clicks, 17);
  assert.equal(gordie.supportingQuery.impressions, 79);
  assert.equal(benchmark.protectedSurface.path, "/mackinac-bridge-live/");
  assert.match(benchmark.protectedSurface.reason, /Separate canonical owner/i);
});

test("Mackinac flagship search surface preserves its separate live-conditions decision contract", () => {
  const html = read("public/mackinac-bridge-live/index.html");
  assert.match(html, /<title>Mackinac Bridge Conditions Today: Live Status &amp; Cameras<\/title>/);
  assert.match(html, /<h1>Mackinac Bridge Conditions Today<\/h1>/);
  assert.ok(html.includes('id="mackinac-conditions-answer"'));
  assert.match(html, /Is the Mackinac Bridge open today\?/i);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/mackinac-bridge-live/">'));
});
