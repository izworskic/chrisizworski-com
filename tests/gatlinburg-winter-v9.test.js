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

test("structured writer JSON parser accepts clean, fenced and wrapped objects", () => {
  assert.deepEqual(T.parseJson('{"topRead":"a"}'), { topRead: "a" });
  assert.deepEqual(T.parseJson('```json\n{"topRead":"b"}\n```'), { topRead: "b" });
  assert.deepEqual(T.parseJson('Here is the object:\n{"topRead":"c"}\n'), { topRead: "c" });
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

test("deterministic editorial fallback is publishable and covers every selected stop", () => {
  const data = {
    input: { persona: "first" },
    headline: { dateLabel: "Thursday, November 5" },
    stopFacts: [
      { id: "one", name: "SkyPark", start: "14:00", end: "16:00", category: "mountain", zone: "skypark", whyHere: "Use daylight here.", operatorNote: "Confirm hours.", verificationRequired: true },
      { id: "two", name: "Winter Magic", start: "18:00", end: "19:15", category: "lights", zone: "downtown-core", whyHere: "Save this for after dark.", operatorNote: "Use the official map." }
    ],
    visitOperations: { movement: "Park once downtown after the mountain stop.", parking: "Use the official city parking information.", trolley: "Trolley service varies by route." },
    visitSnapshot: { route: "Drive once, then park downtown" },
    dateIntelligence: { whyThisDate: { summary: "Winter Magic is active on this date." } },
    commitChecks: [{ state: "recheck", label: "Hours" }]
  };
  const copy = T.fallbackCopy(data, { id: "orientation", brief: "INTERNAL PROMPT TEXT" });
  assert.match(copy.topRead, /SkyPark/);
  assert.match(copy.planRead, /2-stop plan/);
  assert.doesNotMatch(copy.planRead, /INTERNAL PROMPT TEXT/);
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

test("an unused attraction scrape cannot turn the selected plan red", () => {
  const data = {
    input: { date: "2026-12-12" },
    itinerary: [{ id: "ripley-aquarium", zone: "downtown-north" }],
    stopFacts: [{ id: "ripley-aquarium", zone: "downtown-north" }],
    diagnostics: { degradedSources: ["Gatlinburg SkyPark status"] }
  };
  const out = T.scopeDecisionHealth(data);
  assert.equal(out.decisionHealth.state, "ready");
  assert.deepEqual(out.diagnostics.degradedSources, []);
  assert.deepEqual(out.diagnostics.backgroundDegradedSources, ["Gatlinburg SkyPark status"]);
});

test("a degraded selected attraction remains a visible plan check", () => {
  const data = {
    input: { date: "2026-12-12" },
    itinerary: [{ id: "skypark", zone: "skypark" }],
    stopFacts: [{ id: "skypark", zone: "skypark" }],
    diagnostics: { degradedSources: ["Gatlinburg SkyPark status"] }
  };
  const out = T.scopeDecisionHealth(data);
  assert.equal(out.decisionHealth.state, "check");
  assert.deepEqual(out.diagnostics.degradedSources, ["Gatlinburg SkyPark status"]);
  assert.match(out.decisionHealth.label, /PLAN CHECK/i);
});

test("NPS source is critical only when the selected itinerary uses the park", () => {
  const nonPark = T.scopeDecisionHealth({
    input: { date: "2026-12-12" },
    stopFacts: [{ id: "winter-magic-walk", zone: "downtown-core" }],
    diagnostics: { degradedSources: ["Great Smoky Mountains closures"] }
  });
  assert.equal(nonPark.decisionHealth.state, "ready");
  const park = T.scopeDecisionHealth({
    input: { date: "2026-12-12" },
    stopFacts: [{ id: "newfound-gap", zone: "nps-newfound-gap" }],
    diagnostics: { degradedSources: ["Great Smoky Mountains closures"] }
  });
  assert.equal(park.decisionHealth.state, "check");
});
