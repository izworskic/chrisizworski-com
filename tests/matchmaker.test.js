const test = require("node:test");
const assert = require("node:assert/strict");
const { chooseVarieties } = require("../lib/matchmaker");

test("matchmaker returns three unique, renderable varieties", () => {
  const result = chooseVarieties({
    zone: "Zone 6a: Bay City, Michigan area",
    sun: "Full sun: 8+ hours",
    space: "Medium in-ground garden",
    experience: "Beginner",
    goal: "Best flavor",
  });
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map((item) => item.name)).size, 3);
  for (const item of result) {
    assert.ok(item.name);
    assert.ok(item.type);
    assert.ok(item.why.length > 80);
    assert.ok(item.seed_saving.length > 80);
  }
});

test("small, shaded spaces receive container-capable recommendations", () => {
  const result = chooseVarieties({
    zone: "Zone 5",
    sun: "Partial shade: 4 to 6 hours",
    space: "Very small space: balcony or patio",
    experience: "Beginner",
    goal: "High yield",
  });
  assert.equal(result.length, 3);
  assert.ok(result.some((item) => ["Lettuce", "Kale", "Tomato", "Bean"].includes(item.type)));
});
