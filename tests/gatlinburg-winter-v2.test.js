"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const v2 = require("../lib/gatlinburg-winter/route-v2.js");
const base = require("../lib/gatlinburg-winter/route.js");
const T = base._test;
const V = v2._test;

function baseShape(overrides = {}) {
  const input = T.normalizeInput({
    date: "2026-12-12",
    start: "14:00",
    end: "22:00",
    persona: "first",
    ...overrides.input
  });
  return {
    input,
    itinerary: overrides.itinerary || [
      { id: "skypark", name: "Gatlinburg SkyPark", zone: "skypark", start: "14:00", end: "16:00", durationMinutes: 120, officialUrl: "https://www.gatlinburgskypark.com/hours" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", zone: "downtown-core", start: "17:35", end: "18:50", durationMinutes: 75, officialUrl: "https://www.gatlinburg.com/events/annual-events/winter-magic/" }
    ],
    decision: {
      bundleId: "mountain-then-lights",
      label: "Mountain before dark, lights after",
      why: "Spend visibility and daylight on elevation first; let darkness improve Winter Magic later.",
      decisiveConstraint: "daylight + visibility"
    },
    alternatives: overrides.alternatives || [
      {
        id: "easy-winter",
        label: "Lower-friction winter plan",
        why: "Keep walking and weather exposure manageable.",
        score: 72,
        items: ["Ripley's Aquarium of the Smokies", "Dinner in the downtown core", "Winter Magic downtown lights"]
      }
    ],
    headline: { sunset: "5:20 PM", crowdPressure: "Moderate", weather: "40° → 31°" },
    conditions: [
      { label: "Weather", value: "40° / 31° · precip up to 10%", state: "live", sourceUrl: "https://www.weather.gov/" }
    ],
    events: [],
    sources: [
      { name: "NWS Gatlinburg forecast", state: "live", updatedAt: "2026-12-12T15:00:00Z", url: "https://www.weather.gov/" },
      { name: "Gatlinburg SkyPark status", state: "published", updatedAt: null, url: "https://www.gatlinburgskypark.com/" }
    ]
  };
}

test("v2 scheduler only reports a complete option when every stop fits", () => {
  const input = T.normalizeInput({ date: "2026-12-12", start: "18:00", end: "21:00", persona: "first" });
  const result = V.scheduleIds(["ripley-aquarium", "downtown-dinner", "winter-magic-walk"], input);
  assert.ok(result.itinerary.length >= 1);
  assert.ok(result.dropped.length >= 1);
  assert.ok(result.itinerary.every(x => x.end <= "21:00"));
});

test("realized options exclude alternatives that silently drop stops", () => {
  const b = baseShape({
    input: { start: "18:00", end: "21:00" },
    itinerary: [
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", zone: "downtown-core", start: "18:00", end: "19:15", durationMinutes: 75, officialUrl: "https://www.gatlinburg.com/events/annual-events/winter-magic/" },
      { id: "casual-food", name: "Casual food stop downtown", zone: "downtown-core", start: "19:23", end: "20:13", durationMinutes: 50, officialUrl: "https://www.gatlinburg.com/food-drink/" }
    ],
    alternatives: [{
      id: "overscheduled",
      label: "Too much",
      why: "Should be filtered",
      score: 99,
      items: ["Gatlinburg SkyPark", "Anakeesta", "Dinner in the downtown core", "Winter Magic downtown lights"]
    }]
  });
  const options = V.realizedOptions(b);
  assert.ok(options.some(x => x.id.includes("selected") || x.id.includes("mountain-then-lights")));
  assert.equal(options.some(x => x.id === "realized-overscheduled"), false);
});

test("authority tiers put NWS/NPS ahead of destination and secondary sources", () => {
  assert.equal(V.authorityFor({ url: "https://www.weather.gov/" }).tier, 1);
  assert.equal(V.authorityFor({ url: "https://www.nps.gov/grsm/" }).tier, 1);
  assert.equal(V.authorityFor({ url: "https://www.gatlinburg.com/trolley/" }).tier, 2);
  assert.equal(V.authorityFor({ url: "https://www.transit.land/operators/o-gatlinburg~tn~us" }).tier, 3);
  assert.equal(V.authorityFor({ url: "https://www.airdna.co/" }).tier, 4);
});

test("AirDNA context is explicitly not a live crowd signal", () => {
  const sources = V.enhancedSources(baseShape(), {
    transit: { state: "live", fetchedAt: null, note: "GTFS", sourceUrl: "https://www.transit.land/" },
    nps: { state: "live", fetchedAt: null, note: "NPS" },
    market: { state: "live", fetchedAt: null, note: "Market context only" }
  });
  const market = sources.find(x => /lodging market/i.test(x.name));
  assert.ok(market);
  assert.equal(market.authority.label, "Market context");
});

test("what-changed layer explains season and daylight for light plans", () => {
  const b = baseShape();
  const plan = { itinerary: b.itinerary, travelMinutes: 10 };
  const rows = V.deriveInfluences(b, plan, {
    transit: { realtimeGtfs: true },
    nps: { hourlyMonitoring: true }
  });
  assert.ok(rows.some(x => x.factor === "Season"));
  assert.ok(rows.some(x => x.factor === "Daylight"));
});

test("zero-input assumptions are explicit instead of hidden", () => {
  const b = baseShape();
  const result = V.assumptions({ assumed: "1" }, b);
  assert.equal(result.isDefault, true);
  assert.match(result.summary, /Starting point:/);
  assert.ok(result.fields.length >= 4);
});
