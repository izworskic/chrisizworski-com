const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

function title(html) {
  return html.match(/<title>(.*?)<\/title>/s)?.[1] || "";
}

test("Mackinac toll page leads with the page-one price answer", () => {
  const html = read("public/mackinac-bridge-tolls/index.html");
  const tollExperiment = JSON.parse(read("benchmarks/transport-365-growth.json")).experiments[0];
  assert.equal(title(html), "Mackinac Bridge Toll Cost 2026: $4 Car Fare &amp; Calculator");
  assert.ok(title(html).replaceAll("&amp;", "&").length <= 60);
  // Revised pre-release 2026-09-01. The old description answered the query outright, so a searcher
  // asking what the toll costs had no reason to open the page: 1,190 impressions, 0.17% CTR, from
  // position 8.0. Assert the property that matters instead of the sentence — the description must
  // match the declared treatment, and must NOT hand over the flat fare that is the whole query.
  const tollDescription = /<meta name="description" content="([^"]+)"/.exec(html)?.[1] ?? "";
  assert.equal(tollDescription, tollExperiment.treatment.metaDescription);
  assert.doesNotMatch(tollDescription, /\$4 one way|\$8 round trip/);
  assert.match(tollDescription, /axle/i, "the description must promise the multi-axle answer a snippet cannot give");
  assert.match(html, /<h1>Mackinac Bridge Toll Cost: 2026 Fares &amp; Calculator<\/h1>/);
  assert.match(html, /The Mackinac Bridge toll is \$4 one way, or \$8 round trip, for a standard two-axle passenger car in 2026\./i);
  assert.match(html, /Passenger vehicles are \$2 per axle/i);
  assert.match(html, /Vehicles outside the passenger classification.*\$5 per axle/is);
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

test("365 transport experiment records observed baselines and a page-specific freeze", () => {
  const benchmark = JSON.parse(read("benchmarks/transport-365-growth.json"));
  const toll = benchmark.experiments.find((item) => item.id === "mackinac-toll-price-led-ctr");
  const gordie = benchmark.experiments.find((item) => item.id === "gordie-howe-wait-camera-ctr");
  assert.equal(toll.baseline.impressions, 637);
  assert.equal(toll.baseline.clicks, 1);
  assert.equal(toll.latestLeadingSignal.page.impressions, 490);
  assert.equal(toll.latestLeadingSignal.page.clicks, 0);
  assert.equal(toll.latestLeadingSignal.page.averagePosition, 7.44);
  assert.equal(toll.target.ctr, 0.02);
  assert.deepEqual(toll.freezeDuringWindow, ["title", "metaDescription", "h1", "firstAnswer", "structuredData", "canonical", "indexability"]);
  assert.equal(gordie.baseline.impressions, 498);
  assert.equal(gordie.baseline.clicks, 17);
  assert.equal(gordie.supportingQuery.impressions, 79);
  assert.equal(benchmark.protectedSurface.path, "/mackinac-bridge-live/");
});

test("Mackinac flagship search surface stays frozen while the companion pages run", () => {
  const html = read("public/mackinac-bridge-live/index.html");
  assert.match(html, /<title>Mackinac Bridge Conditions Today: Live Status &amp; Cameras<\/title>/);
  assert.match(html, /<h1>Mackinac Bridge Conditions Today<\/h1>/);
  assert.ok(html.includes('id="mackinac-conditions-answer"'));
  assert.match(html, /Is the Mackinac Bridge open today\?/i);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/mackinac-bridge-live/">'));
});
