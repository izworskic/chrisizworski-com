"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../lib/gatlinburg-winter/route-v13.js")._test;

test("saved pre-season date is normalized into supported winter window", () => {
  const out = T.normalizeWinterQuery({ date: "2026-09-25", persona: "first" });
  assert.equal(out.requestedDate, "2026-09-25");
  assert.equal(out.normalizedDate, "2026-11-05");
  assert.equal(out.query.date, "2026-11-05");
});

test("in-window date is preserved", () => {
  const out = T.normalizeWinterQuery({ date: "2026-12-12" });
  assert.equal(out.query.date, "2026-12-12");
  assert.equal(out.normalizedDate, null);
});

test("background source failures never become legacy global degradation", () => {
  const out = T.customerContract({
    mode: "preseason",
    itinerary: [{ id: "winter-magic-walk" }],
    decisionHealth: { state: "ready", label: "PLAN READY", criticalSources: [] },
    diagnostics: {
      degradedSources: ["Gatlinburg lodging market context"],
      backgroundDegradedSources: ["Gatlinburg Trolley network registry"],
      futureWeatherExpected: true
    }
  });
  assert.deepEqual(out.diagnostics.degradedSources, []);
  assert.deepEqual(out.diagnostics.sourceWarnings.sort(), ["Gatlinburg Trolley network registry", "Gatlinburg lodging market context"].sort());
  assert.equal(out.decisionHealth.label, "PRE-SEASON PLAN");
  assert.equal(out.decisionHealth.state, "ready");
});

test("real selected-plan problem is specific, never called degraded", () => {
  const out = T.customerContract({
    mode: "live",
    itinerary: [{ id: "skypark" }],
    decisionHealth: {
      state: "check",
      label: "1 PLAN CHECK NEEDED",
      summary: "SkyPark hours need an official recheck.",
      criticalSources: ["Gatlinburg SkyPark status"]
    },
    diagnostics: { degradedSources: ["Gatlinburg SkyPark status"] }
  });
  assert.deepEqual(out.diagnostics.degradedSources, []);
  assert.equal(out.decisionHealth.label, "CHECK BEFORE COMMITTING");
  assert.equal(out.decisionHealth.state, "check");
  assert.doesNotMatch(out.decisionHealth.label, /degrad/i);
});
