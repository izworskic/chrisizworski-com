"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const v7 = require("../lib/gatlinburg-winter/route-v7.js");
const T = v7._test;

function fixture(overrides = {}) {
  return {
    input: { date: "2026-12-12", start: "14:00", end: "22:00", persona: "first" },
    headline: { weather: "Dry afternoon", mountainVisibility: "Good" },
    decision: { label: "Mountain daylight + Winter Magic" },
    visitOperations: { movementMode: "mixed" },
    dateIntelligence: { selected: { fixedEvents: [] } },
    itinerary: [
      { id: "skypark", name: "Gatlinburg SkyPark", zone: "skypark", start: "14:00", end: "16:00", durationMinutes: 120, verificationRequired: true, officialUrl: "https://www.gatlinburgskypark.com/hours" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", zone: "downtown-core", start: "17:30", end: "18:45", durationMinutes: 75, verificationRequired: false, officialUrl: "https://www.gatlinburg.com/events/seasonal-events/winter/wintermagic/" }
    ],
    ...overrides
  };
}

test("stop facts expose the practical fields missing from a bare timeline", () => {
  const cards = T.stopFacts(fixture());
  assert.equal(cards.length, 2);
  assert.equal(cards[0].cost, "Paid attraction");
  assert.equal(cards[0].reservation, "Plan ahead / ticketed");
  assert.match(cards[0].bestTime, /daylight|day/i);
  assert.match(cards[0].whyHere, /daylight/i);
  assert.equal(cards[1].cost, "Free");
  assert.match(cards[1].whyHere, /after useful daylight/i);
});

test("plan brief summarizes duration, movement, cost and verification burden", () => {
  const data = fixture();
  const brief = T.buildPlanBrief(data, T.stopFacts(data));
  assert.equal(brief.totalTime, "4 hr 45 min");
  assert.equal(brief.movement, "Separate drive + downtown cluster");
  assert.match(brief.costMix, /free/i);
  assert.match(brief.verification, /1 stop/i);
});

test("NPS itinerary surfaces parking-tag and mountain-weather checks", () => {
  const data = fixture({
    itinerary: [
      { id: "newfound-gap", name: "Newfound Gap scenic drive/view", zone: "nps-newfound-gap", start: "14:00", end: "16:30", durationMinutes: 150, verificationRequired: false, officialUrl: "https://www.nps.gov/grsm/planyourvisit/conditions.htm" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", zone: "downtown-core", start: "17:30", end: "18:45", durationMinutes: 75, verificationRequired: false, officialUrl: "https://www.gatlinburg.com/events/seasonal-events/winter/wintermagic/" }
    ]
  });
  const checks = T.buildCommitChecks(data, T.stopFacts(data));
  assert.ok(checks.some(x => /parking tag/i.test(x.label)));
  assert.ok(checks.some(x => /mountain conditions/i.test(x.label)));
  assert.ok(checks.some(x => /10–20°F/.test(x.detail)));
});

test("future-hours verification is explicit before paying", () => {
  const data = fixture();
  const checks = T.buildCommitChecks(data, T.stopFacts(data));
  const row = checks.find(x => x.priority === "before-paying");
  assert.ok(row);
  assert.match(row.detail, /Gatlinburg SkyPark/);
  assert.match(row.detail, /operator/i);
});

test("general winter trolley schedule is never presented as route-specific certainty", () => {
  const data = fixture();
  const checks = T.buildCommitChecks(data, T.stopFacts(data));
  const row = checks.find(x => /trolley/i.test(x.label));
  assert.ok(row);
  assert.match(row.detail, /10:30 AM–10:00 PM/);
  assert.match(row.detail, /route-specific/i);
});

test("visit beyond 10 PM gets a trolley return warning", () => {
  const data = fixture({ input: { date: "2026-12-12", start: "16:00", end: "23:00", persona: "evening" } });
  const checks = T.buildCommitChecks(data, T.stopFacts(data));
  const row = checks.find(x => /trolley/i.test(x.label));
  assert.match(row.detail, /past the published general winter trolley schedule/i);
});

test("season facts are source backed and avoid pretending they are forecasts", () => {
  const facts = T.buildSeasonFacts(fixture());
  assert.equal(facts.length, 4);
  assert.ok(facts.every(x => /^https:\/\//.test(x.sourceUrl)));
  assert.match(facts.find(x => x.label === "Mountain weather").note, /not a forecast substitute/i);
});
