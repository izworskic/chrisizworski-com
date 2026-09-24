"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const v10 = require("../lib/gatlinburg-winter/route-v10.js");

const T = v10._test;

test("future selected attraction status is a commit-time check, not a degraded plan input", () => {
  const data = {
    input: { date: "2026-11-05" },
    decisionHealth: { state: "check", label: "1 PLAN CHECK NEEDED", criticalSources: ["Gatlinburg SkyPark status"] },
    diagnostics: { degradedSources: ["Gatlinburg SkyPark status"], backgroundDegradedSources: [] }
  };
  const out = T.normalizeFutureLiveHealth(data, "2026-09-24");
  assert.equal(out.decisionHealth.state, "ready");
  assert.deepEqual(out.diagnostics.degradedSources, []);
  assert.deepEqual(out.diagnostics.backgroundDegradedSources, ["Gatlinburg SkyPark status"]);
  assert.deepEqual(out.diagnostics.futureLiveStatusDeferred, ["Gatlinburg SkyPark status"]);
  assert.equal(out.benchmarkVersion, "3.9");
});

test("future NPS current-road status is deferred until closer to departure", () => {
  const data = {
    input: { date: "2026-12-12" },
    decisionHealth: { state: "check", label: "1 PLAN CHECK NEEDED", criticalSources: ["Great Smoky Mountains closures"] },
    diagnostics: { degradedSources: ["Great Smoky Mountains closures"] }
  };
  const out = T.normalizeFutureLiveHealth(data, "2026-09-24");
  assert.equal(out.decisionHealth.state, "ready");
  assert.deepEqual(out.diagnostics.degradedSources, []);
  assert.deepEqual(out.diagnostics.backgroundDegradedSources, ["Great Smoky Mountains closures"]);
});

test("near-term NWS failure remains decision-critical within forecast range", () => {
  const data = {
    input: { date: "2026-09-28" },
    decisionHealth: { state: "check", label: "1 PLAN CHECK NEEDED", criticalSources: ["NWS Gatlinburg forecast"] },
    diagnostics: { degradedSources: ["NWS Gatlinburg forecast"] }
  };
  const out = T.normalizeFutureLiveHealth(data, "2026-09-24");
  assert.deepEqual(out.diagnostics.degradedSources, ["NWS Gatlinburg forecast"]);
  assert.equal(out.decisionHealth.state, "check");
});

test("same-day selected attraction failure remains decision-critical", () => {
  const data = {
    input: { date: "2026-09-24" },
    decisionHealth: { state: "check", label: "1 PLAN CHECK NEEDED", criticalSources: ["Ober Mountain status"] },
    diagnostics: { degradedSources: ["Ober Mountain status"] }
  };
  const out = T.normalizeFutureLiveHealth(data, "2026-09-24");
  assert.deepEqual(out.diagnostics.degradedSources, ["Ober Mountain status"]);
  assert.equal(out.decisionHealth.state, "check");
});

test("future weather beyond seven days remains deferred", () => {
  const data = {
    input: { date: "2026-11-05" },
    decisionHealth: { state: "check", label: "1 PLAN CHECK NEEDED", criticalSources: ["NWS Gatlinburg forecast"] },
    diagnostics: { degradedSources: ["NWS Gatlinburg forecast"], futureWeatherExpected: true }
  };
  const out = T.normalizeFutureLiveHealth(data, "2026-09-24");
  assert.equal(out.decisionHealth.state, "ready");
  assert.deepEqual(out.diagnostics.degradedSources, []);
  assert.match(out.decisionHealth.label, /FORECAST LATER/);
});
