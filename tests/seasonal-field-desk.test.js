const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("Fall and Ice use one seasonal decision system without changing their identity", () => {
  const fall = read("public/fall-color/index.html");
  const ice = read("public/michigan-ice/index.html");

  assert.match(fall, /<body class="seasonal-fall" data-seasonal-tool="fall-color">/);
  assert.match(ice, /<body class="seasonal-ice" data-seasonal-tool="michigan-ice">/);
  for (const html of [fall, ice]) {
    assert.equal((html.match(/\/assets\/seasonal-field-desk\.css/g) || []).length, 1);
    assert.equal((html.match(/\/assets\/seasonal-field-desk\.js/g) || []).length, 1);
    assert.equal((html.match(/data-seasonal-module="seasonal-tools"/g) || []).length, 1);
  }

  assert.equal((fall.match(/class="seasonal-choice(?: seasonal-choice--primary)?"/g) || []).length, 3);
  assert.equal((ice.match(/class="seasonal-choice(?: seasonal-choice--primary)?"/g) || []).length, 3);
  assert.equal((ice.match(/data-seasonal-placement="water-picker"/g) || []).length, 6);
  assert.ok(ice.indexOf('id="the-read-card"') < ice.indexOf('id="season-cold"'));
});

test("seasonal analytics measures intent without collecting precise location or URLs", () => {
  const js = read("public/assets/seasonal-field-desk.js");
  for (const event of ["Seasonal Module View", "Seasonal Decision", "Seasonal Selection", "Seasonal Tool Open"]) {
    assert.ok(js.includes(event), event);
  }
  assert.doesNotMatch(js, /coords|latitude|longitude|geolocation|getCurrentPosition/i);
  assert.doesNotMatch(js, /\.href|destinationUrl|weather|temperature/i);
});

test("XC adapter is fail-closed, non-overwriting, and preserves the live search surface", () => {
  const adapter = read("scripts/seasonal/inject-xcski-field-desk.mjs");
  assert.match(adapter, /output must differ from input/);
  assert.match(adapter, /XC source changed: required marker is missing/);
  assert.match(adapter, /data-xcski-filter="rentals"/);
  assert.match(adapter, /data-xcski-filter="groomed"/);
  assert.doesNotMatch(adapter, /<title>|meta name="description"|application\/ld\+json/);
});

test("seasonal benchmark separates observed data from internal targets", () => {
  const benchmark = JSON.parse(read("benchmarks/seasonal-field-desk.json"));
  assert.equal(benchmark.observed.device.mobile.impressions, 46870);
  assert.equal(benchmark.observed.fall.hub.ctr, 0.0243);
  assert.equal(benchmark.observed.ice.hub.impressions, 20);
  assert.match(benchmark.observed.xcSkiing.sourceStatus, /not available/);
  assert.equal(benchmark.measurement.internalDecisionThresholds.decisionRate, 0.12);
  assert.match(benchmark.source.windowCaution, /directional snapshot/);
});
