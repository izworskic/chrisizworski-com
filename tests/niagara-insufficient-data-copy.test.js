const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "public", "assets", "niagara-decision-fallback.20261003.js"), "utf8");
const build = fs.readFileSync(path.join(root, "scripts", "add-niagara-border-discovery.mjs"), "utf8");

test("Niagara replaces generic insufficient-data headline with actionable guidance", () => {
  assert.match(js, /Live wait reports are incomplete right now/);
  assert.match(js, /Do not switch bridges based on incomplete numbers/);
  assert.match(js, /Live comparison limited/);
});

test("Niagara explains unsupported traveler modes without car-wait substitution", () => {
  assert.match(js, /No comparable live border wait is published for/);
  assert.match(js, /no passenger-car wait is being substituted/i);
});

test("Niagara preserves Whirlpool context-only meaning in traveler language", () => {
  assert.match(js, /Whirlpool's current wait is context, not a like-for-like comparison/);
  assert.match(js, /does not use the same real-time wait technology/);
});

test("Niagara build injects the fallback overlay after the visual layer", () => {
  assert.match(build, /niagara-decision-fallback\.20261003\.js/);
  assert.match(build, /patchDecisionFallback\(\)/);
});
