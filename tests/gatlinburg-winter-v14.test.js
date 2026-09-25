"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const route = require("../lib/gatlinburg-winter/route-v14.js");

const T = route._test;

function fallback(query = {}) {
  return T.fallbackDecision({ date: "2026-11-14", start: "14:00", end: "22:00", ...query }, "forced test fallback");
}

test("resilience fallback is customer-ready and never exposes global degraded state", () => {
  const data = fallback({ persona: "first", goal: "classic" });
  assert.equal(data.ok, true);
  assert.equal(data.decisionHealth.state, "ready");
  assert.match(data.decisionHealth.label, /PLAN READY/);
  assert.deepEqual(data.diagnostics.degradedSources, []);
  assert.equal(data.diagnostics.resilienceFallback, true);
  assert.ok(data.itinerary.length >= 2);
  assert.ok(data.decision.summary.length > 20);
});

test("family fallback materially changes the plan shape", () => {
  const data = fallback({ persona: "family", goal: "weather-proof", kids: "5,9" });
  assert.equal(data.input.persona, "family");
  assert.ok(data.itinerary.some(x => x.id === "ripley-aquarium"));
  assert.ok(data.itinerary.length <= 3);
  assert.match(data.decision.why, /family energy/i);
});

test("couple fallback uses a coherent scenic to evening rhythm", () => {
  const data = fallback({ persona: "couple", goal: "scenic" });
  assert.equal(data.input.persona, "couple");
  assert.ok(data.itinerary.some(x => ["skypark", "space-needle"].includes(x.id)));
  assert.ok(data.itinerary.some(x => x.category === "food"));
  assert.ok(data.itinerary.some(x => x.category === "lights"));
});

test("Christmas event fallback anchors December 4 to the parade", () => {
  const data = T.fallbackDecision({ date: "2026-12-04", start: "14:00", end: "22:30", persona: "christmas", goal: "event" }, "forced test fallback");
  assert.equal(data.input.persona, "christmas");
  assert.ok(data.itinerary.some(x => x.id === "parade"));
  assert.match(data.decision.why, /holiday event/i);
});

test("snow fallback requires a real Ober snow block for tubing", () => {
  const data = fallback({ persona: "snow", goal: "tubing" });
  assert.equal(data.input.persona, "snow");
  assert.ok(data.itinerary.some(x => x.id === "ober-snow-tubing"));
  assert.match(data.decision.why, /Ober/i);
  assert.match(data.headline.snow, /mountain-operations confirmation/i);
});

test("API entrypoint uses the resilience wrapper", () => {
  const api = fs.readFileSync(path.resolve(__dirname, "../api/gatlinburg-winter.js"), "utf8");
  assert.match(api, /route-v14\.js/);
});

test("response deadline stays below the repo-wide 10 second function ceiling", () => {
  assert.ok(T.RESPONSE_BUDGET_MS > 0);
  assert.ok(T.RESPONSE_BUDGET_MS < 9000);
});
