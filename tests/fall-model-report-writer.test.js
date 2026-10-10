const test = require("node:test");
const assert = require("node:assert/strict");
const { writeModelReport } = require("../lib/fall-color/model-report-writer");
const { annotateReport, MODEL_DISCLOSURE, NOTE_DISCLOSURE } = require("../lib/fall-color/report-provenance");

const fixture = [
  { id: "wup", name: "Western Upper Peninsula", pct: 94, phase: "peak", label: "At peak",
    weatherFeel: "mixed skies, highs near 55, lows near 37", drive: "Lake of the Clouds",
    hike: "Presque Isle", paddle: "Ontonagon River",
    source: { drivers: ["regional climatology", "canopy camera anchor"] } },
  { id: "tip", name: "Tip of the Mitt", pct: 69, phase: "rising", label: "Approaching peak",
    weatherFeel: "mostly clear skies", source: { drivers: ["regional climatology"] } },
  { id: "sel", name: "Southeast Lower Michigan", pct: 17, phase: "green", label: "Still green",
    weatherFeel: null, source: { drivers: ["regional climatology"] } },
];

test("daily fall writer composes a meaningful, source-grounded note with no LLM", () => {
  const body = writeModelReport(fixture);
  assert.equal(typeof body, "string");
  assert.equal(body.split("\n\n").length, 3);
  assert.match(body, /Western Upper Peninsula/);
  assert.match(body, /Tip of the Mitt/);
  assert.match(body, /Southeast Lower Michigan/);
  assert.match(body, /94%/);
  assert.match(body, /model estimates, not counts of leaves observed/);
  assert.match(body, /mixed skies/);
  assert.match(body, /canopy camera anchor/);
  assert.match(body, /interactive map and date slider/);
  assert.equal(writeModelReport([]), null);
  assert.equal(writeModelReport([{ name: "Incorrect", pct: NaN }]), null);
});

test("new deterministic editions and legacy AI-written editions have different honest disclosures", () => {
  const fresh = annotateReport({ date: "2026-10-10", body: writeModelReport(fixture), generationMethod: "Deterministic model summary" });
  assert.equal(fresh.generationMethod, "Deterministic model summary");
  assert.equal(fresh.disclosure, MODEL_DISCLOSURE);
  assert.doesNotMatch(fresh.disclosure, /AI-generated/);
  const old = annotateReport({ date: "2026-10-09", body: "Older report" });
  assert.equal(old.generationMethod, "AI-generated model summary");
  assert.equal(old.disclosure, NOTE_DISCLOSURE);
});

test("partial data or old satellite dates never produce invented current observations", () => {
  const body = writeModelReport([{ id: "wup", name: "Western Upper Peninsula", pct: 40,
    phase: "rising", label: "Color starting", weatherFeel: null,
    source: { drivers: ["regional climatology"] } }]);
  assert.match(body, /reliable short-range weather description is not available/);
  assert.match(body, /source dates shown with the live readings/);
  assert.doesNotMatch(body, /observed today|definitely|guaranteed/);
});
