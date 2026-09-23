"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const v4 = require("../lib/gatlinburg-winter/route-v4.js");
const T = v4._test;

function decision(stops, overrides = {}) {
  return {
    input: {
      date: "2026-12-12",
      start: "14:00",
      end: "21:30",
      persona: "first",
      ...overrides
    },
    itinerary: stops.map((id, i) => ({
      id,
      name: id,
      zone: ({
        "winter-magic-walk": "downtown-core",
        "ripley-aquarium": "downtown-north",
        "newfound-gap": "nps-newfound-gap",
        "ober-mountain": "ober",
        "arts-crafts": "arts-crafts",
        "parade": "downtown-core"
      })[id],
      start: i ? "17:30" : "14:00",
      end: i ? "18:30" : "16:00"
    }))
  };
}

test("downtown-heavy plans are explicitly park-once plans", () => {
  const ops = T.deriveOperations(decision(["ripley-aquarium", "winter-magic-walk"]));
  assert.equal(ops.movementMode, "downtown-cluster");
  assert.match(ops.movement, /Park once/i);
  assert.match(ops.parking, /live parking information/i);
});

test("mixed Smokies and downtown plans keep the outlying drive separate", () => {
  const ops = T.deriveOperations(decision(["newfound-gap", "winter-magic-walk"]));
  assert.equal(ops.movementMode, "mixed");
  assert.equal(ops.npsStops, 1);
  assert.match(ops.movement, /separate drive/i);
  assert.match(ops.special, /Smokies segment/i);
  assert.ok(ops.recheck.some(x => /NPS road and park conditions/i.test(x)));
});

test("planner warns when a visit runs past the published winter trolley window", () => {
  const ops = T.deriveOperations(decision(["ripley-aquarium", "winter-magic-walk"], { end: "22:45" }));
  assert.equal(ops.trolleyState, "late-finish");
  assert.match(ops.trolley, /past the published general winter trolley window/i);
  assert.match(ops.trolley, /10:30 AM–10:00 PM/);
});

test("planner recognizes a visit fully inside the published winter trolley window", () => {
  const ops = T.deriveOperations(decision(["ripley-aquarium", "winter-magic-walk"], { start: "12:00", end: "21:00" }));
  assert.equal(ops.trolleyState, "window-fit");
  assert.match(ops.trolley, /inside the published general winter trolley schedule/i);
});

test("Ober remains a separate mountain-operating decision", () => {
  const ops = T.deriveOperations(decision(["ober-mountain", "winter-magic-walk"]));
  assert.equal(ops.hasOber, true);
  assert.match(ops.special, /Ober is a separate mountain-operating decision/i);
  assert.ok(ops.recheck.some(x => /Ober mountain operations/i.test(x)));
});

test("major event plans add event-day operations rechecks", () => {
  const ops = T.deriveOperations(decision(["parade", "winter-magic-walk"]));
  assert.equal(ops.hasMajorEvent, true);
  assert.match(ops.special, /major downtown event/i);
  assert.ok(ops.recheck.some(x => /Event-day traffic/i.test(x)));
});

test("operational source rows are source-backed and duplicate safe", () => {
  const first = T.appendOperationalSources([]);
  assert.equal(first.length, 2);
  assert.ok(first.every(row => /^https:\/\//.test(row.url)));
  const second = T.appendOperationalSources(first);
  assert.equal(second.length, 2);
});
