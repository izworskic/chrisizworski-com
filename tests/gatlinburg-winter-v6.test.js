"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const v6 = require("../lib/gatlinburg-winter/route-v6.js");
const T = v6._test;

function fixture(date = "2026-12-12", overrides = {}) {
  return {
    input: {
      date,
      start: "14:00",
      end: "22:00",
      persona: "first",
      kids: [],
      budget: "any",
      crowds: "normal",
      mobility: "normal",
      weatherPreference: "balanced",
      mustSnow: false,
      mustLights: false,
      firstVisit: true,
      duration: "custom"
    },
    headline: {
      state: "A SOLID WINTER PLAN",
      dateLabel: "Saturday, December 12",
      sunset: "5:22 PM",
      crowdPressure: "Moderate → Heavy evening",
      mountainVisibility: "Mixed forecast signal"
    },
    conditions: [
      { label: "Weather", value: "Forecast unavailable for this date", state: "unavailable" },
      { label: "Smokies access", value: "Official closure feed unavailable", state: "unavailable" }
    ],
    events: [
      { id: "winter-magic", name: "Gatlinburg Winter Magic", start: "2026-11-05", end: "2027-02-15", time: "after dark" }
    ],
    itinerary: [
      { id: "skypark", name: "Gatlinburg SkyPark", zone: "skypark", start: "14:00", end: "16:00", durationMinutes: 120, verificationRequired: true, officialUrl: "https://www.gatlinburgskypark.com/hours" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", zone: "downtown-core", start: "17:37", end: "18:52", durationMinutes: 75, verificationRequired: false, officialUrl: "https://www.gatlinburg.com/events/annual-events/winter-magic/" }
    ],
    alternatives: [],
    decision: { label: "Mountain daylight + Winter Magic" },
    decisionClock: { points: [{ id: "lights-ready", time: "17:37" }] },
    visitOperations: { movement: "Treat the mountain segment separately, then park once downtown.", movementMode: "mixed" },
    ...overrides
  };
}

test("date intelligence compares exactly three days on either side", () => {
  const intel = T.buildDateIntelligence(fixture());
  assert.equal(intel.nearby.length, 6);
  assert.equal(intel.selected.date, "2026-12-12");
  assert.equal(intel.nearby[0].date, "2026-12-09");
  assert.equal(intel.nearby.at(-1).date, "2026-12-15");
});

test("nearby dates are run through complete schedule generation", () => {
  const intel = T.buildDateIntelligence(fixture());
  for (const row of intel.nearby) {
    if (row.feasible) assert.ok(row.stopCount >= 2, `${row.date} exposed an incomplete plan`);
    assert.ok(Number.isInteger(row.completePlanOptions));
  }
});

test("parade date is recognized as a major event-specific date difference", () => {
  const data = fixture("2026-12-04", {
    headline: { state: "A SOLID WINTER PLAN", dateLabel: "Friday, December 4", sunset: "5:21 PM", crowdPressure: "Heavy", mountainVisibility: "Mixed forecast signal" },
    events: [
      { id: "winter-magic", name: "Gatlinburg Winter Magic", start: "2026-11-05", end: "2027-02-15", time: "after dark" },
      { id: "fantasy-lights-parade", name: "Fantasy of Lights Christmas Parade", start: "2026-12-04", end: "2026-12-04", time: "7:30 PM" }
    ],
    itinerary: [
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", zone: "downtown-core", start: "17:36", end: "18:51", durationMinutes: 75, verificationRequired: false },
      { id: "parade", name: "Fantasy of Lights Christmas Parade", zone: "downtown-core", start: "19:30", end: "21:30", durationMinutes: 120, verificationRequired: false }
    ],
    decision: { label: "Event-anchored plan" }
  });
  const intel = T.buildDateIntelligence(data);
  assert.match(intel.whyThisDate.summary, /event-shaped/i);
  const dec3 = intel.nearby.find(row => row.date === "2026-12-03");
  assert.equal(dec3.changeLevel, "major");
  assert.match(dec3.headline, /fixed event drops out/i);
});

test("a nearby lower-pressure day is surfaced without calling it live occupancy", () => {
  const intel = T.buildDateIntelligence(fixture());
  const sunday = intel.nearby.find(row => row.date === "2026-12-13");
  assert.ok(sunday);
  assert.match(sunday.details.join(" "), /crowd pressure estimate/i);
  assert.ok(T.crowdRank(sunday.crowdLevel) < T.crowdRank(intel.selected.crowdLevel));
  assert.match(intel.whyThisDate.reasons.find(r => r.label === "Crowd tradeoff").value, /not live occupancy/i);
});

test("late January remains in season without inventing a fixed holiday event", () => {
  const intel = T.buildDateIntelligence(fixture("2027-01-25", {
    headline: { state: "A SOLID WINTER PLAN", dateLabel: "Monday, January 25", sunset: "5:55 PM", crowdPressure: "Lighter → Moderate", mountainVisibility: "Mixed forecast signal" }
  }));
  assert.equal(intel.selected.inSeason, true);
  assert.equal(intel.selected.fixedEvents.length, 0);
  assert.match(intel.whyThisDate.reasons.find(r => r.label === "Date anchor").value, /No fixed date-specific event/i);
});

test("comparison policy refuses to copy weather and closure truth across dates", () => {
  const intel = T.buildDateIntelligence(fixture());
  assert.match(intel.sourcePolicy, /Weather, closures and same-day operating status are not copied across dates/i);
  assert.equal(intel.comparisonMode, "deterministic-calendar-grounded");
});

test("crossing the Winter Magic boundary is a major date change", () => {
  const data = fixture("2026-11-05", {
    headline: { state: "A SOLID WINTER PLAN", dateLabel: "Thursday, November 5", sunset: "5:35 PM", crowdPressure: "Lighter → Moderate", mountainVisibility: "Mixed forecast signal" }
  });
  const intel = T.buildDateIntelligence(data);
  const nov4 = intel.nearby.find(row => row.date === "2026-11-04");
  assert.equal(nov4.inSeason, false);
  assert.equal(nov4.changeLevel, "major");
  assert.match(nov4.headline, /Outside Winter Magic season/i);
});
