import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const snapshot = JSON.parse(
  await readFile(
    new URL("../benchmarks/name-serp-snapshot-2026-09-14.json", import.meta.url),
    "utf8",
  ),
);
const governance = JSON.parse(
  await readFile(
    new URL("../benchmarks/name-serp-governance.json", import.meta.url),
    "utf8",
  ),
);

const allowedClasses = new Set([
  "controlled",
  "supportingOwned",
  "favorableEarned",
  "other",
]);

function calculate(depth) {
  const results = snapshot.results.slice(0, depth);
  const controlled = results.filter((result) => result.class === "controlled");

  return {
    controlledOrSupportingResults: results.filter((result) =>
      ["controlled", "supportingOwned"].includes(result.class),
    ).length,
    uniqueControlledGroups: new Set(
      controlled.map((result) => result.controlledGroup),
    ).size,
    controlledGroups: [
      ...new Set(controlled.map((result) => result.controlledGroup)),
    ],
    favorableEarned: results.filter(
      (result) => result.class === "favorableEarned",
    ).length,
    other: results.filter((result) => result.class === "other").length,
    chrisAttributable: results.filter((result) => result.chrisAttributable)
      .length,
  };
}

test("dated name SERP snapshot contains one normalized Bing top 30", () => {
  assert.equal(snapshot.observed, "2026-09-14");
  assert.equal(snapshot.query, "Chris Izworski");
  assert.equal(snapshot.method.engines.bing.status, "measured");
  assert.equal(snapshot.method.engines.bing.depth, 30);
  assert.equal(snapshot.results.length, 30);
  assert.deepEqual(
    snapshot.results.map((result) => result.rank),
    Array.from({ length: 30 }, (_, index) => index + 1),
  );
  assert.equal(
    new Set(snapshot.results.map((result) => result.url)).size,
    snapshot.results.length,
  );

  for (const result of snapshot.results) {
    assert.match(result.url, /^https:\/\//);
    assert.ok(allowedClasses.has(result.class), `unexpected class at ${result.rank}`);
    if (result.class === "controlled" || result.class === "supportingOwned") {
      assert.ok(result.controlledGroup, `missing controlled group at ${result.rank}`);
    }
  }
});

test("stored depth summaries are derived from the observed result rows", () => {
  for (const depth of [10, 20, 30]) {
    const actual = calculate(depth);
    const stored = snapshot.summary[`top${depth}`];

    for (const [key, value] of Object.entries(actual)) {
      assert.deepEqual(stored[key], value, `top-${depth} ${key} drifted`);
    }
  }
});

test("independent control is not inflated by same-root or same-platform URLs", () => {
  const controlledRows = snapshot.results.filter(
    (result) => result.class === "controlled",
  );
  assert.equal(
    new Set(controlledRows.map((result) => result.controlledGroup)).size,
    controlledRows.length,
  );
  assert.equal(snapshot.summary.top10.uniqueControlledGroups, 4);
  assert.equal(snapshot.summary.top10.uniqueControlledGap, 4);
  assert.equal(snapshot.summary.top10.uniqueControlledTarget, 8);
});

test("governance points to the observation without inventing a Google rank", () => {
  assert.equal(
    governance.latestObservedSnapshot.file,
    "benchmarks/name-serp-snapshot-2026-09-14.json",
  );
  assert.equal(governance.latestObservedSnapshot.primarySitePosition, 2);
  assert.equal(
    governance.latestObservedSnapshot.controlledIndependentTop10,
    snapshot.summary.top10.uniqueControlledGroups,
  );
  assert.equal(snapshot.method.engines.google.status, "blocked-human-verification");
  assert.equal(snapshot.method.engines.google.depth, 0);
});
