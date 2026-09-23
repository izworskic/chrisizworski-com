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
    conditions: [{ label: "Snow", value: "No downtown snow signal", state: "live", sourceUrl: "https://www.weather.gov/" }]
  };
}

test("v3 gives JEV a plan-level choice set, not a short attraction list", () => {
  const options = V.buildPlanOptions(fixture());
  assert.ok(options.length >= 8, `expected at least 8 complete plans, got ${options.length}`);
  assert.ok(options.length <= 16);
  for (const option of options) {
    assert.ok(option.itinerary.length >= 2);
    assert.ok(option.itinerary.every(stop => stop.end <= "22:00"));
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

test("downtown snow and Ober mountain snow are separate evidence", () => {
  const rows = V.separatedConditions(fixture());
  assert.equal(rows.some(x => x.label === "Snow"), false);
  assert.ok(rows.some(x => x.label === "Downtown snow forecast"));
  const ober = rows.find(x => x.label === "Ober / mountain snow");
  assert.ok(ober);
  assert.match(ober.value, /separately from the downtown forecast/i);
  assert.match(ober.sourceUrl, /obermountain\.com/);
});
