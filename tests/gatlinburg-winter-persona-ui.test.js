"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/gatlinburg-winter/index.html"), "utf8");
const controller = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter-personas.js"), "utf8");

test("five-persona controller loads before the legacy planner runtime", () => {
  const personaAt = html.indexOf('/assets/gatlinburg-winter-personas.js');
  const plannerAt = html.indexOf('/assets/gatlinburg-winter.js');
  assert.ok(personaAt >= 0, "persona controller must be present");
  assert.ok(plannerAt > personaAt, "persona controller must load before planner runtime");
});

test("traveler chooser exposes exactly five human personas", () => {
  assert.match(controller, /const FIVE = new Set\(\["first", "family", "couple", "christmas", "snow"\]\)/);
  for (const persona of ["first", "family", "couple", "christmas", "snow"]) {
    assert.match(controller, new RegExp(`${persona}: \\[`));
  }
  for (const pseudo of ["attractions", "food-lights", "budget", "evening", "full-day", "multi-day"]) {
    assert.ok(!new RegExp(`PERSONA_COPY[\\s\\S]{0,800}${pseudo}: \\[` ).test(controller), `${pseudo} must not be presented as a human persona`);
  }
});

test("persona controls send goal pace origin priority and dinner to the API", () => {
  for (const key of ["goal", "pace", "origin", "priority", "dinner"]) {
    assert.match(controller, new RegExp(`q\\.set\\("${key}"`));
  }
  for (const id of ["personaGoal", "personaPace", "tripOrigin", "tripPriority", "dinnerAnchor"]) {
    assert.match(controller, new RegExp(id));
  }
});

test("family mode never submits or leaves the fabricated 6,10 ages unless user supplied them", () => {
  assert.match(controller, /function removeInventedKids\(\)/);
  assert.match(controller, /field\.value = ""/);
  assert.match(controller, /url\.searchParams\.delete\("kids"\)/);
  assert.match(controller, /if \(!kidsExplicit\) q\.delete\("kids"\)/);
});

test("customer-facing health uses decisionHealth rather than raw degraded diagnostics", () => {
  assert.match(controller, /data\.decisionHealth/);
  assert.match(controller, /data\.decisionHealth\.label/);
  assert.doesNotMatch(controller, /diagnostics\?\.degradedSources/);
});
