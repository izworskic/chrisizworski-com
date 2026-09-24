"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const v5 = require("../lib/gatlinburg-winter/route-v5.js");
const T = v5._test;

function fixture(overrides = {}) {
  return {
    input: { date: "2026-12-12", start: "14:00", end: "22:30", persona: "first" },
    headline: {
      sunset: "5:22 PM",
      mountainVisibility: "Mixed forecast signal"
    },
    itinerary: [
      { id: "skypark", name: "Gatlinburg SkyPark", zone: "skypark", start: "14:00", end: "16:00", verificationRequired: true, officialUrl: "https://www.gatlinburgskypark.com/hours" },
      { id: "winter-magic-walk", name: "Winter Magic downtown lights", zone: "downtown-core", start: "17:37", end: "18:52", verificationRequired: false, officialUrl: "https://www.gatlinburg.com/events/annual-events/winter-magic/" }
    ],
    alternatives: [
      { label: "Indoor anchor + lights", items: ["Ripley's Aquarium of the Smokies", "Winter Magic downtown lights"] }
    ],
    events: [],
    visitOperations: {
      movementMode: "downtown-cluster",
      downtownStops: 2,
      npsStops: 0,
      hasOber: false,
      hasMajorEvent: false,
      trolleyState: "late-finish",
      sources: { trolley: "https://www.gatlinburg.com/things-to-do/trolley/" }
    },
    ...overrides
  };
}

test("decision clock turns sunset into a light-use turning point", () => {
  const clock = T.deriveDecisionClock(fixture());
  const sunset = clock.points.find(p => p.id === "sunset");
  const lights = clock.points.find(p => p.id === "lights-ready");
  assert.equal(sunset.time, "17:22");
  assert.equal(lights.time, "17:37");
  assert.match(lights.effect, /light-focused stop after this point/i);
});

test("decision clock exposes trolley cutoff when visit runs later", () => {
  const clock = T.deriveDecisionClock(fixture());
  const trolley = clock.points.find(p => p.id === "trolley-cutoff");
  assert.ok(trolley);
  assert.equal(trolley.time, "22:00");
  assert.match(trolley.effect, /final movement cannot depend/i);
});

test("fixed published event times become hard clock anchors", () => {
  const f = fixture({
    input: { date: "2026-12-04", start: "14:00", end: "22:00", persona: "first" },
    events: [{ id: "fantasy-lights-parade", name: "Fantasy of Lights Christmas Parade", time: "7:30 PM", sourceUrl: "https://www.gatlinburg.com/events/annual-events/fantasy-of-lights-christmas-parade/" }],
    visitOperations: { ...fixture().visitOperations, hasMajorEvent: true, trolleyState: "window-fit" }
  });
  const clock = T.deriveDecisionClock(f);
  const event = clock.points.find(p => p.kind === "event");
  assert.ok(event);
  assert.equal(event.time, "19:30");
  assert.match(event.effect, /fixed published event time/i);
});

test("unverified attraction hours appear as an explicit operating gate", () => {
  const clock = T.deriveDecisionClock(fixture());
  const gate = clock.points.find(p => p.id === "verify-skypark");
  assert.ok(gate);
  assert.equal(gate.time, "14:00");
  assert.match(gate.effect, /official hours/i);
});

test("mixed visibility creates a grounded indoor pivot when one exists", () => {
  const clock = T.deriveDecisionClock(fixture());
  const pivot = clock.pivots.find(p => /visibility/i.test(p.trigger));
  assert.ok(pivot);
  assert.match(pivot.response, /Ripley's Aquarium/i);
});

test("signature reflects plan shape rather than a generic score", () => {
  const signature = T.deriveVisitSignature(fixture());
  assert.match(signature, /daylight-first mountain/i);
  assert.match(signature, /park once downtown/i);
  assert.match(signature, /trolley cutoff before finish/i);
});

test("no invented event clock point is created for vague event timing", () => {
  const f = fixture({ events: [{ id: "new-years", name: "New Year's Eve Celebration", time: "evening", sourceUrl: "https://www.gatlinburg.com/events/" }] });
  const clock = T.deriveDecisionClock(f);
  assert.equal(clock.points.some(p => p.kind === "event"), false);
});
