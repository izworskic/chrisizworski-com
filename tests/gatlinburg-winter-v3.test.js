"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const v3 = require("../lib/gatlinburg-winter/route-v3.js");
const base = require("../lib/gatlinburg-winter/route.js");
const T = base._test;
const V = v3._test;

function fixture() {
  return {
    input: T.normalizeInput({ date: "2026-12-12", start: "12:00", end: "22:00", persona: "first" }),
    headline: {
      state: "A SOLID WINTER PLAN",
      bestWindow: "12:00 PM–6:50 PM",
      bestMove: "Legacy choice first.",
      sunset: "5:22 PM",
      weather: "42° → 30°",
      snow: "No downtown snow signal",
      mountainVisibility: "Mixed forecast signal",
      crowdPressure: "Moderate → Heavy evening"
    },
    itinerary: [
      { id: "skypark", name: "Gatlinburg SkyPark", zone: "skypark", start: "12:00", end: "14:00", durationMinutes: 120, officialUrl: "https://www.gatlinburgskypark.com/hours" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", zone: "downtown-core", start: "17:35", end: "18:50", durationMinutes: 75, officialUrl: "https://www.gatlinburg.com/events/annual-events/winter-magic/" }
    ],
    decision: {
      bundleId: "mountain-then-lights",
      why: "Use the daylight window first.",
      decisiveConstraint: "daylight"
    },
    alternatives: [
      {
        id: "easy-winter",
        items: ["Ripley's Aquarium of the Smokies", "Dinner in the downtown core", "Winter Magic downtown lights"]
      },
      {
        id: "mountain-two",
        items: ["Anakeesta", "Casual food stop downtown", "Winter Magic downtown lights"]
      }
    ],
    conditions: [
      { label: "Snow", value: "No downtown snow signal", state: "live", sourceUrl: "https://www.weather.gov/" },
      { label: "Smokies access", value: "No Newfound Gap closure phrase extracted", state: "live", sourceUrl: "https://www.nps.gov/grsm/" }
    ]
  };
}

test("v3 gives JEV a plan-level choice set, not a short attraction list", () => {
  const options = V.buildPlanOptions(fixture());
  assert.ok(options.length >= 8, `expected at least 8 complete plans, got ${options.length}`);
  assert.ok(options.length <= 16);
  for (const option of options) {
    assert.ok(option.itinerary.length >= 2);
    assert.ok(option.itinerary.every(stop => stop.end <= "22:00"));
    assert.ok(Number.isFinite(option.deterministicScore));
  }
});

test("v3 candidate universe is independent of the legacy preselected bundles", () => {
  const f = fixture();
  const legacy = new Set(V.legacyCandidatePool(f));
  const pool = V.independentCandidatePool(f);
  assert.ok(pool.length > legacy.size);
  assert.ok(pool.some(row => !legacy.has(row.id)), "expected independently eligible candidates outside the legacy bundle set");
});

test("v3 never seeds a date-invalid legacy stop into the scheduled plan set", () => {
  const f = fixture();
  f.itinerary.unshift({ id: "parade", name: "Fantasy of Lights Christmas Parade", zone: "downtown-core", start: "19:30", end: "21:30" });
  const options = V.buildPlanOptions(f);
  assert.ok(options.length > 0);
  assert.equal(options.some(option => option.itinerary.some(stop => stop.id === "parade")), false);
});

test("late arrival hard-gates daylight-only choices before plan generation", () => {
  const f = fixture();
  f.input = T.normalizeInput({ date: "2026-12-12", start: "20:00", end: "23:30", persona: "first" });
  const pool = new Set(V.independentCandidatePool(f).map(row => row.id));
  for (const id of ["skypark", "ober-mountain", "ober-snow-tubing", "arts-crafts", "sugarlands", "newfound-gap"]) {
    assert.equal(pool.has(id), false, `${id} should be removed before JEV for a late-evening arrival`);
  }
});

test("v3 removes redundant same-purpose stops inside a plan", () => {
  const options = V.buildPlanOptions(fixture());
  for (const option of options) {
    const ids = option.itinerary.map(x => x.id);
    const lightCount = ids.filter(id => ["winter-magic-walk", "parkway-lights", "riverwalk-lights", "moonshine-free-loop", "trolley-lights"].includes(id)).length;
    const foodCount = ids.filter(id => ["downtown-dinner", "casual-food"].includes(id)).length;
    assert.ok(lightCount <= 1);
    assert.ok(foodCount <= 1);
  }
});

test("final headline is rebuilt from the selected scheduled itinerary", () => {
  const f = fixture();
  const chosen = {
    itinerary: [
      { id: "ripley-aquarium", name: "Ripley's Aquarium of the Smokies", start: "13:00", end: "15:00" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", start: "17:40", end: "18:55" }
    ]
  };
  const h = V.finalHeadline(f, chosen);
  assert.equal(h.bestWindow, "1:00 PM–6:55 PM");
  assert.match(h.bestMove, /Ripley's Aquarium of the Smokies first/);
  assert.doesNotMatch(h.bestMove, /Legacy choice first/);
});

test("downtown snow and Ober mountain snow are separate evidence", () => {
  const rows = V.separatedConditions(fixture());
  assert.equal(rows.some(x => x.label === "Snow"), false);
  assert.ok(rows.some(x => x.label === "Downtown snow forecast"));
  const ober = rows.find(x => x.label === "Ober / mountain snow");
  assert.ok(ober);
  assert.match(ober.value, /separately from the downtown forecast/i);
  assert.match(ober.sourceUrl, /obermountain\.com/);
});
