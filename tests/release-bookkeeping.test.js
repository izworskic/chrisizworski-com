const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const readJson = (file) => JSON.parse(readFileSync(path.join(__dirname, "..", file), "utf8"));

test("affiliate placements are recorded as released and measured from complete days", () => {
  const ledger = readJson("benchmarks/affiliate-commerce.json");
  assert.equal(ledger.releasePolicy.releaseDate, "2026-08-13");
  assert.equal(ledger.releasePolicy.releaseCommit, "2c52f007d28afbe41df28cd0ee129fcb3c380f51");
  for (const placement of ledger.placements) {
    assert.equal(placement.status, "running", placement.id);
    assert.equal(placement.releaseDate, "2026-08-13", placement.id);
    assert.deepEqual(placement.evaluationWindow, { start: "2026-08-14", end: "2026-09-10" }, placement.id);
  }
});

test("deployment bookkeeping does not mistake preview validation for release", () => {
  const truth = readJson("benchmarks/deployment-truth.json");
  assert.equal(truth.rules.previewIsNotRelease, true);
  assert.equal(truth.rules.vercelProductionTargetIsNotSoleSourceOfTruth, true);
  assert.equal(truth.rules.mergeAloneIsNotSufficientWhenLiveVerificationIsPossible, true);
  assert.ok(truth.releaseEvidenceOrder[0].includes("merged main commit"));
  assert.ok(truth.releaseEvidenceOrder[1].includes("live custom-domain"));
});

test("composed intent has one owner and does not create cannibalizing URLs", () => {
  const ledger = readJson("benchmarks/composed-intent-opportunities.json");
  const ids = new Set();
  const owners = new Map();
  for (const family of ledger.queryFamilies) {
    assert.ok(!ids.has(family.id), `duplicate query-family id: ${family.id}`);
    ids.add(family.id);
    assert.ok(family.owner.startsWith("/"), family.id);
    assert.equal(family.newUrlAllowed, false, family.id);
    assert.ok(Array.isArray(family.composition) && family.composition.length >= 2, family.id);
    const prior = owners.get(family.owner) || [];
    prior.push(family.id);
    owners.set(family.owner, prior);
  }
  assert.equal(ids.size, ledger.queryFamilies.length);
  assert.equal(ledger.newUrlGate.forbidCannibalization, true);
});
