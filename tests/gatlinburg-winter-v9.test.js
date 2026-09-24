"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const v9 = require("../lib/gatlinburg-winter/route-v9.js");

const T = v9._test;

test("Gatlinburg desk editor keeps one voice while visitor intent changes the lens", () => {
  assert.equal(T.fallbackLens({ input: { persona: "first" } }), "orientation");
  assert.equal(T.fallbackLens({ input: { persona: "family" } }), "family");
  assert.equal(T.fallbackLens({ input: { persona: "snow" } }), "snow");
  assert.equal(T.fallbackLens({ input: { persona: "food-lights" } }), "foodLights");
  assert.equal(T.fallbackLens({ input: { persona: "unknown" } }), "orientation");
});

test("structured writer JSON parser accepts clean and wrapped objects", () => {
  assert.deepEqual(T.parseJson('{"topRead":"a"}'), { topRead: "a" });
  assert.deepEqual(T.parseJson('Here is the object:\n{"topRead":"b"}\n'), { topRead: "b" });
  assert.equal(T.parseJson("not json"), null);
});

test("writer sanitation keeps only selected stop ids and strips unsafe markup", () => {
  const fallback = {
    topRead: "fallback top",
    planRead: "fallback plan",
    operationsRead: "fallback ops",
    dateRead: "fallback date",
    commitRead: "fallback commit",
    stopReads: { a: "fallback a", b: "fallback b" }
  };
  const cleaned = T.cleanCopy({
    topRead: "<b>Top</b>",
    planRead: "Plan",
    operationsRead: "Ops",
    dateRead: "Date",
    commitRead: "Commit",
    stopReads: { a: "<script>alpha</script>", extra: "must not survive" }
  }, fallback, ["a", "b"]);
  assert.equal(cleaned.topRead.includes("<"), false);
  assert.equal(cleaned.stopReads.a.includes("<"), false);
  assert.equal(cleaned.stopReads.b, "fallback b");
  assert.deepEqual(Object.keys(cleaned.stopReads).sort(), ["a", "b"]);
});

test("editorial copy changes narrative fields without changing schedule or hard operational facts", () => {
  const data = {
    headline: { bestMove: "old top", weather: "cold" },
    decision: { summary: "old plan", label: "Plan" },
    itinerary: [{ id: "a", start: "14:00", end: "15:00", whyNow: "old stop", officialUrl: "https://example.com" }],
    visitOperations: { movement: "old movement", trolley: "published trolley fact", parking: "published parking fact" },
    dateIntelligence: { whyThisDate: { summary: "old date", reasons: [{ label: "Season", value: "fact" }] } }
  };
  const writer = { copy: {
    topRead: "new top",
    planRead: "new plan",
    operationsRead: "new movement read",
    dateRead: "new date read",
    commitRead: "new commit read",
    stopReads: { a: "new stop read" }
  } };
  const out = T.applyCopy(data, writer);
  assert.equal(out.headline.bestMove, "new top");
  assert.equal(out.headline.weather, "cold");
  assert.equal(out.decision.summary, "new plan");
  assert.equal(out.itinerary[0].whyNow, "new stop read");
  assert.equal(out.itinerary[0].start, "14:00");
  assert.equal(out.itinerary[0].officialUrl, "https://example.com");
  assert.equal(out.visitOperations.movement, "new movement read");
  assert.equal(out.visitOperations.trolley, "published trolley fact");
  assert.equal(out.visitOperations.parking, "published parking fact");
  assert.equal(out.dateIntelligence.whyThisDate.summary, "new date read");
  assert.equal(out.dateIntelligence.whyThisDate.reasons[0].value, "fact");
});

test("deterministic editorial fallback covers every selected stop", () => {
  const data = {
    input: { persona: "first" },
    stopFacts: [
      { id: "one", name: "One", start: "14:00", whyHere: "Why one.", operatorNote: "Check one." },
      { id: "two", name: "Two", start: "16:00", whyHere: "Why two.", operatorNote: "Check two." }
    ],
    visitOperations: { movement: "Park once.", trolley: "Check trolley." },
    dateIntelligence: { whyThisDate: { summary: "This date works." } },
    commitChecks: [{ state: "recheck", label: "Hours" }]
  };
  const copy = T.fallbackCopy(data, { brief: "First-visit orientation." });
  assert.ok(copy.topRead);
  assert.ok(copy.planRead);
  assert.ok(copy.stopReads.one);
  assert.ok(copy.stopReads.two);
});

test("future weather outside the forecast window is scheduled, not degraded", () => {
  const data = {
    input: { date: "2026-11-05" },
    headline: { weather: "Forecast unavailable for this date", snow: "Not yet verifiable" },
    conditions: [
      { label: "Weather", value: "Forecast unavailable for this date", state: "unavailable" },
      { label: "Snow", value: "Not yet verifiable", state: "unavailable" },
      { label: "Smokies access", value: "Available", state: "live" }
    ],
    sources: [
      { name: "NWS Gatlinburg forecast", state: "unavailable" },
      { name: "Great Smoky Mountains closures", state: "live" }
    ],
    diagnostics: { degradedSources: ["NWS Gatlinburg forecast"] }
  };
  const out = T.normalizeFutureWeatherState(data, "2026-09-24");
  assert.equal(out.sources[0].state, "scheduled");
  assert.equal(out.conditions[0].state, "scheduled");
  assert.equal(out.conditions[1].state, "scheduled");
  assert.equal(out.diagnostics.degradedSources.length, 0);
  assert.equal(out.diagnostics.futureWeatherExpected, true);
  assert.match(out.headline.weather, /not in range/i);
});

test("near-term weather failures remain degraded", () => {
  const data = {
    input: { date: "2026-09-28" },
    headline: { weather: "Forecast unavailable for this date", snow: "Not yet verifiable" },
    conditions: [{ label: "Weather", value: "Forecast unavailable", state: "unavailable" }],
    sources: [{ name: "NWS Gatlinburg forecast", state: "unavailable" }],
    diagnostics: { degradedSources: ["NWS Gatlinburg forecast"] }
  };
  const out = T.normalizeFutureWeatherState(data, "2026-09-24");
  assert.equal(out.sources[0].state, "unavailable");
  assert.deepEqual(out.diagnostics.degradedSources, ["NWS Gatlinburg forecast"]);
});
