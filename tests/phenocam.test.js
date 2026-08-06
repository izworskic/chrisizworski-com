const test = require("node:test");
const assert = require("node:assert");
const { _internal } = require("../lib/fall-color/phenocam.js");
const { ndviWeight, snapshotFor } = require("../lib/fall-color/model.js");
const { REGIONS } = require("../lib/fall-color/regions.js");

test("satellite weight decays with age and is zero at the latency we actually see", () => {
  assert.equal(ndviWeight(10), 1);
  assert.equal(ndviWeight(20), 1);
  assert.ok(ndviWeight(30) > 0 && ndviWeight(30) < 1);
  assert.equal(ndviWeight(45), 0);
  assert.equal(ndviWeight(74), 0, "ORNL runs 65-75 days behind; a reading that old must not move the number");
  assert.equal(ndviWeight(NaN), 0);
});

test("a stale satellite reading contributes nothing and says so", () => {
  const s = snapshotFor(REGIONS[0], { ndvi: { senescence: 0.8, date: "2026-05-25", ageDays: 74 } }, null);
  assert.equal(s.source.satelliteWeight, 0);
  assert.ok(!s.source.drivers.includes("MODIS canopy greenness"));
});

test("a fresh satellite reading does contribute", () => {
  const s = snapshotFor(REGIONS[0], { ndvi: { senescence: 0.8, date: "2026-10-01", ageDays: 4 } }, null);
  assert.equal(s.source.satelliteWeight, 1);
  assert.ok(s.source.drivers.includes("MODIS canopy greenness"));
});

test("the canopy camera anchor shifts the curve and is recorded", () => {
  // Pinned to early October: in August the curve is flat at full green, so a shift
  // correctly changes nothing and would prove nothing.
  const Real = Date;
  global.Date = class extends Real {
    constructor(...a) { return a.length ? new Real(...a) : new Real("2026-10-05T15:00:00Z"); }
    static now() { return new Real("2026-10-05T15:00:00Z").getTime(); }
  };
  const none = snapshotFor(REGIONS[0], {}, null);
  const late = snapshotFor(REGIONS[0], {}, { shift: 6, confidence: "good" });
  global.Date = Real;
  assert.notEqual(none.pct, late.pct, "a six day anchor shift must move the number");
  assert.equal(late.source.anchorShiftDays, 6);
  assert.ok(late.source.drivers.includes("canopy camera anchor"));
  assert.equal(none.source.anchorShiftDays, 0);
});

test("a missing or malformed anchor never breaks the snapshot", () => {
  for (const a of [null, undefined, {}, { shift: null }, { shift: "x" }]) {
    const s = snapshotFor(REGIONS[0], {}, a);
    assert.ok(Number.isFinite(s.pct), "pct must stay a number");
    assert.equal(s.source.anchorShiftDays, 0);
  }
});

test("offsetForSite refuses to guess before senescence starts", () => {
  const rows = [];
  for (let y = 2022; y <= 2026; y += 1) for (let d = 190; d <= 320; d += 1) {
    rows.push({ date: `${y}-01-01`, gcc: d < 250 ? 0.40 : 0.40 - (d - 250) * 0.0012, y, doy: d });
  }
  const early = _internal.offsetForSite(rows, 200, 2026);
  assert.equal(early.shift, null, "no offset before the canopy starts turning");
});
