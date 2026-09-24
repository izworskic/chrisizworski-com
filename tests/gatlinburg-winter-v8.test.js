"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const v8 = require("../lib/gatlinburg-winter/route-v8.js");
const T = v8._test;

function fixture(overrides = {}) {
  return {
    input: { mustLights: true },
    itinerary: [
      {
        id: "sugarlands",
        name: "Sugarlands Visitor Center",
        start: "12:00",
        end: "13:00",
        durationMinutes: 60,
        category: "park",
        categoryLabel: "National park",
        zone: "nps-sugarlands",
        costLabel: "Free",
        bookingLabel: "No reservation flag",
        walkingLabel: "Lower walking",
        exposureLabel: "Weather matters",
        whyNow: "Kept in daylight.",
        executionNote: "NPS conditions govern.",
        officialUrl: "https://www.nps.gov/grsm/",
        verificationRequired: false
      },
      {
        id: "winter-magic-walk",
        name: "Winter Magic walk",
        start: "18:00",
        end: "19:30",
        durationMinutes: 90,
        category: "lights",
        categoryLabel: "Lights",
        zone: "downtown-core",
        costLabel: "Free",
        bookingLabel: "No reservation flag",
        walkingLabel: "Moderate walking",
        exposureLabel: "Weather matters",
        whyNow: "Placed after dark.",
        executionNote: "Park once downtown.",
        officialUrl: "https://www.gatlinburg.com/events/seasonal-events/winter/wintermagic/",
        verificationRequired: false
      }
    ],
    visitSnapshot: {
      spend: "Mostly free",
      walking: "Moderate walking",
      indoorShare: "0/2 indoor",
      route: "Drive once, then park downtown",
      verification: "No future-hours flags"
    },
    visitOperations: { npsStops: true },
    dateIntelligence: { selected: { fixedEvents: [] } },
    commitChecklist: [
      { label: "Weather", state: "checked", detail: "Forecast checked.", sourceUrl: "https://weather.gov/" },
      { label: "Downtown parking", state: "arrival-check", detail: "Check city parking.", sourceUrl: "https://www.gatlinburgtn.gov/page/parking" }
    ],
    ...overrides
  };
}

test("benchmark finish exposes a compact plan brief", () => {
  const brief = T.buildPlanBrief(fixture());
  assert.equal(brief.totalTime, "7 hr 30 min");
  assert.equal(brief.stopCount, 2);
  assert.equal(brief.costMix, "Mostly free");
  assert.match(brief.movement, /downtown/i);
});

test("selected stops get need-to-know detail without inventing availability", () => {
  const rows = T.buildStopFacts(fixture());
  assert.equal(rows.length, 2);
  assert.equal(rows[1].name, "Winter Magic walk");
  assert.match(rows[1].whyHere, /after dark/i);
  assert.equal(rows[1].officialUrl.includes("gatlinburg.com"), true);
  assert.equal(rows[1].verificationRequired, false);
});

test("commit checks add Smokies parking-tag and optional lights map context", () => {
  const rows = T.buildCommitChecks(fixture());
  assert.ok(rows.some(row => /parking tag/i.test(row.label)));
  assert.ok(rows.some(row => /Winter Magic map/i.test(row.label)));
  assert.ok(rows.some(row => row.priority === "before-arrival"));
});

test("season facts and month guide preserve exact 2026-27 anchors", () => {
  const facts = T.buildSeasonFacts();
  assert.ok(facts.some(row => row.value.includes("Nov 5, 2026–Feb 15, 2027")));
  assert.ok(facts.some(row => row.value.includes("Dec 4")));
  const months = T.buildMonthGuide();
  assert.deepEqual(months.map(row => row.month), ["November", "December", "January", "February"]);
});

test("live-look shortcuts stay official and plan-specific", () => {
  const rows = T.buildLookNow(fixture());
  assert.ok(rows.length >= 3);
  assert.ok(rows.every(row => /^https:\/\//.test(row.sourceUrl)));
  assert.ok(rows.some(row => /parking/i.test(row.label)));
  assert.ok(rows.some(row => /Smokies/i.test(row.label)));
});

test("benchmark visual layer is additive and the proven planner runtime stays canonical", () => {
  const root = path.resolve(__dirname, "..");
  const planner = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter.js"), "utf8");
  const benchmarkCss = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter-benchmark.css"), "utf8");
  const finishCss = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter-finish.css"), "utf8");
  assert.match(planner, /gatlinburg_plan_generated/);
  assert.match(planner, /renderOperations\(d\.visitOperations\)/);
  assert.match(benchmarkCss, /gatlinburg-winter-benchmark-core\.css/);
  assert.match(benchmarkCss, /gatlinburg-winter-finish\.css/);
  assert.match(finishCss, /\.plan-brief/);
  assert.match(finishCss, /\.stop-fact/);
});
