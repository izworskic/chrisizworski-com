"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const route = require("../lib/gatlinburg-winter/route-v12.js");

const T = route._test;

function row(id, start, end) {
  return { id, name: id, zone: undefined, start, end, durationMinutes: 60, verificationRequired: false };
}
function option(id, ids, deterministicScore = 65, travelMinutes = 20) {
  let cursor = 10 * 60;
  const itinerary = ids.map(stopId => {
    const start = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
    cursor += 90;
    const end = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
    return row(stopId, start, end);
  });
  return { id, label: id, itinerary, deterministicScore, travelMinutes };
}
function data(overrides = {}) {
  return {
    input: {
      persona: "first",
      date: "2026-12-12",
      start: "10:00",
      end: "22:00",
      kids: [],
      budget: "any",
      crowds: "normal",
      mobility: "normal",
      weatherPreference: "balanced",
      mustLights: false,
      mustSnow: false,
      ...overrides.input
    },
    headline: { crowdPressure: "Moderate", ...overrides.headline },
    events: overrides.events || []
  };
}

test("first visit prefers a representative daylight plus lights day over a generic indoor stack", () => {
  const d = data({ input: { persona: "first" } });
  const policy = T.personaPolicy(d, { persona: "first", goal: "classic" });
  const representative = option("representative", ["newfound-gap", "downtown-dinner", "winter-magic-walk"], 60, 65);
  const generic = option("generic", ["ripley-aquarium", "downtown-dinner", "winter-magic-walk"], 70, 15);
  const ranked = T.rankPersonaOptions([generic, representative], d, policy);
  assert.equal(ranked[0].id, "representative");
  assert.match(T.personaReason(policy, ranked[0].personaFeatures), /first-time visitor/i);
});

test("family persona values energy, walking and movement over attraction stacking", () => {
  const d = data({ input: { persona: "family", kids: [4, 8], mobility: "stroller" } });
  const policy = T.personaPolicy(d, { persona: "family", goal: "easy" });
  const compact = option("compact", ["ripley-aquarium", "casual-food", "winter-magic-walk"], 64, 12);
  const stacked = option("stacked", ["anakeesta", "ober-mountain", "winter-magic-walk"], 70, 58);
  const ranked = T.rankPersonaOptions([stacked, compact], d, policy);
  assert.equal(ranked[0].id, "compact");
  assert.ok(ranked[0].personaFeatures.zoneChanges <= ranked[1].personaFeatures.zoneChanges);
});

test("couple scenic persona favors a day-to-evening scenic meal and lights rhythm", () => {
  const d = data({ input: { persona: "couple" } });
  const policy = T.personaPolicy(d, { persona: "couple", goal: "scenic", dinner: "1" });
  const scenic = option("scenic", ["skypark", "downtown-dinner", "winter-magic-walk"], 61, 18);
  const indoor = option("indoor", ["ripley-aquarium", "downtown-dinner", "winter-magic-walk"], 70, 10);
  const ranked = T.rankPersonaOptions([indoor, scenic], d, policy);
  assert.equal(ranked[0].id, "scenic");
  assert.equal(ranked[0].personaFeatures.hasFood, true);
  assert.equal(ranked[0].personaFeatures.hasLight, true);
});

test("Christmas low-crowd persona penalizes event magnet plans while preserving seasonal atmosphere", () => {
  const d = data({ input: { persona: "christmas", crowds: "avoid", mustLights: true } });
  const policy = T.personaPolicy(d, { persona: "christmas", goal: "low-crowd" });
  const event = option("event", ["parade", "downtown-dinner", "winter-magic-walk"], 76, 15);
  const quieter = option("quieter", ["riverwalk-lights", "casual-food", "the-village"], 65, 10);
  const ranked = T.rankPersonaOptions([event, quieter], d, policy);
  assert.equal(ranked[0].id, "quieter");
  assert.equal(ranked[0].personaFeatures.hasLight, true);
  assert.equal(ranked[0].personaFeatures.hasEvent, false);
});

test("snow persona requires an Ober snow block when a complete one is feasible", () => {
  const d = data({ input: { persona: "snow", mustSnow: true } });
  const policy = T.personaPolicy(d, { persona: "snow", goal: "activity" });
  const snow = option("snow", ["ober-snow-tubing", "downtown-dinner", "winter-magic-walk"], 55, 30);
  const generic = option("generic", ["skypark", "downtown-dinner", "winter-magic-walk"], 78, 15);
  const ranked = T.rankPersonaOptions([generic, snow], d, policy);
  assert.equal(ranked[0].id, "snow");
  assert.equal(ranked[0].personaFeatures.hasSnow, true);
  assert.match(T.personaReason(policy, ranked[0].personaFeatures), /downtown snow/i);
});

test("legacy pseudo-personas collapse to five real personas and separate priorities", () => {
  const d = data({ input: { persona: "food-lights" } });
  const policy = T.personaPolicy(d, { persona: "food-lights" });
  assert.equal(policy.persona, "couple");
  assert.equal(policy.priority, "food-lights");
  assert.equal(T.canonicalPersona({ persona: "budget" }, { persona: "budget" }), "first");
});
