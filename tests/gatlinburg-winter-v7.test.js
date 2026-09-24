"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const v7 = require("../lib/gatlinburg-winter/route-v7.js");
const T = v7._test;

function fixture(overrides = {}) {
  return {
    itinerary: [
      { id: "skypark", name: "Gatlinburg SkyPark", start: "14:00", end: "16:00", durationMinutes: 120, verificationRequired: true, officialUrl: "https://www.gatlinburgskypark.com/hours" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", start: "17:40", end: "18:55", durationMinutes: 75, verificationRequired: false, officialUrl: "https://www.gatlinburg.com/events/annual-events/winter-magic/" }
    ],
    decisionClock: { points: [{ id: "lights-ready", time: "17:35" }] },
    visitOperations: {
      movementMode: "mixed",
      sources: {
        parking: "https://www.gatlinburg.com/plan/parking/",
        cityParking: "https://www.gatlinburgtn.gov/page/parking",
        trolley: "https://www.gatlinburg.com/things-to-do/trolley/",
        npsConditions: "https://www.nps.gov/grsm/planyourvisit/conditions.htm"
      }
    },
    conditions: [
      { label: "Weather", state: "unavailable", value: "Forecast outside current horizon", sourceUrl: "https://api.weather.gov/" },
      { label: "Smokies access", state: "live", value: "No selected closure surfaced", sourceUrl: "https://www.nps.gov/grsm/planyourvisit/conditions.htm" }
    ],
    transit: null,
    ...overrides
  };
}

test("itinerary enrichment adds practical metadata without invented prices", () => {
  const rows = T.enrichItinerary(fixture());
  assert.equal(rows.length, 2);
  assert.equal(rows[0].costLabel, "Paid attraction");
  assert.equal(rows[0].bookingLabel, "Book / confirm");
  assert.match(rows[0].whyNow, /daylight and mountain visibility/i);
  assert.equal(rows[1].costLabel, "Free");
  assert.match(rows[1].whyNow, /5:35 PM lights-ready pivot/i);
  assert.ok(!rows.some(row => /\$\d/.test(row.costLabel || "")));
});

test("visit snapshot is concise and plan-specific", () => {
  const data = fixture();
  const rows = T.enrichItinerary(data);
  const snap = T.buildVisitSnapshot(data, rows);
  assert.equal(snap.stopCount, 2);
  assert.equal(snap.span, "2:00 PM–6:55 PM");
  assert.equal(snap.spend, "Free + paid mix");
  assert.equal(snap.route, "Drive once, then park downtown");
  assert.match(snap.booking, /1 stop to book/i);
  assert.match(snap.verification, /1 future-hours recheck/i);
});

test("commit checklist never claims live parking availability", () => {
  const data = fixture();
  const rows = T.enrichItinerary(data);
  const checks = T.buildCommitChecklist(data, rows);
  const parking = checks.find(row => row.label === "Downtown parking");
  assert.ok(parking);
  assert.equal(parking.state, "arrival-check");
  assert.match(parking.detail, /does not invent live stall availability/i);
  assert.doesNotMatch(parking.detail, /available spaces|spaces available|parking is available/i);
});

test("outside forecast horizon remains a recheck, not a synthetic weather pass", () => {
  const data = fixture();
  const rows = T.enrichItinerary(data);
  const weather = T.buildCommitChecklist(data, rows).find(row => row.label === "Weather");
  assert.equal(weather.state, "recheck");
  assert.match(weather.detail, /has not filled the gap with climatology/i);
});

test("Ober snow remains separate from downtown weather", () => {
  const data = fixture({
    itinerary: [
      { id: "ober-snow-tubing", name: "Ober Mountain snow tubing", start: "13:00", end: "15:00", durationMinutes: 120, verificationRequired: true, officialUrl: "https://tickets.obermountain.com/" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", start: "17:40", end: "18:55", durationMinutes: 75, verificationRequired: false, officialUrl: "https://www.gatlinburg.com/events/annual-events/winter-magic/" }
    ]
  });
  const rows = T.enrichItinerary(data);
  assert.match(rows[0].executionNote, /separate from downtown weather/i);
  const ober = T.buildCommitChecklist(data, rows).find(row => row.label === "Ober mountain operations");
  assert.ok(ober);
  assert.match(ober.detail, /not used as proof/i);
});
