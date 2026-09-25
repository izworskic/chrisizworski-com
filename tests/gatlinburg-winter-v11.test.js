"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const v11 = require("../lib/gatlinburg-winter/route-v11.js");

test("Gatlinburg planner response cannot be resurrected from stale CDN cache", () => {
  const headers = new Map();
  v11._test.setFreshHeaders({ setHeader(name, value) { headers.set(name, value); } });
  assert.equal(headers.get("Cache-Control"), "no-store, max-age=0");
  assert.equal(headers.get("CDN-Cache-Control"), "no-store");
  assert.equal(headers.get("Vercel-CDN-Cache-Control"), "no-store");
  assert.equal(headers.get("X-Robots-Tag"), "noindex");
});

test("legacy degraded field mirrors only plan-critical decision health", () => {
  const out = v11._test.alignHealthContract({
    decisionHealth: { state: "ready", criticalSources: [] },
    diagnostics: {
      degradedSources: ["Unrelated attraction scrape"],
      backgroundDegradedSources: ["Unrelated attraction scrape"]
    }
  });
  assert.deepEqual(out.diagnostics.degradedSources, []);
  assert.deepEqual(out.diagnostics.backgroundDegradedSources, ["Unrelated attraction scrape"]);
  assert.equal(out.diagnostics.legacyDegradedFieldAligned, true);
});

test("a real plan-critical check remains visible to the legacy field", () => {
  const out = v11._test.alignHealthContract({
    decisionHealth: { state: "check", criticalSources: ["NWS Gatlinburg forecast", "NWS Gatlinburg forecast"] },
    diagnostics: { degradedSources: ["Something else"] }
  });
  assert.deepEqual(out.diagnostics.degradedSources, ["NWS Gatlinburg forecast"]);
});