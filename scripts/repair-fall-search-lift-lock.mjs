#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const hubPath = path.join(root, "public", "fall-color", "index.html");
const baselinePath = path.join(root, "benchmarks", "ctr-surface-baseline.json");
const testPath = path.join(root, "tests", "fall-search-lift.test.js");

function replaceAllRequired(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1;
  if (count !== expectedCount) throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`);
  return source.split(from).join(to);
}

function replaceOnce(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  return source.replace(from, to);
}

const protectedTitle = "Michigan Fall Color Map 2026 | Live Peak Conditions";
const protectedDescription = "See where Michigan's fall color is peaking now on a live map built from canopy camera and weather data, with regional peak dates and a forecast.";
const treatmentTitle = "Michigan Fall Color Map 2026: Where Color Is Now";
const treatmentDescription = "Michigan fall color map for 2026 with today's statewide status, regional peak dates, live canopy and weather signals, and a forecast from the U.P. south.";

let hub = await readFile(hubPath, "utf8");
hub = replaceAllRequired(hub, treatmentTitle, protectedTitle, 3, "protected Fall title surfaces");
hub = replaceAllRequired(hub, treatmentDescription, protectedDescription, 3, "protected Fall description surfaces");
hub = replaceOnce(
  hub,
  '"name": "Michigan Fall Color Map 2026: Where Color Is Now"',
  '"name": "Michigan Fall Color Map 2026: Live Peak Conditions and Forecast"',
  "protected Fall WebPage name",
);
hub = replaceOnce(
  hub,
  '<h1 style="margin-top:7px">Michigan Fall Color Map 2026</h1>',
  '<h1 style="margin-top:7px">Michigan Fall Color</h1>',
  "protected Fall H1",
);
await writeFile(hubPath, hub);

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
baseline.priorityQuerySignals.fallColorHub.experiment = {
  hypothesis: "A dated crawlable statewide answer plus schema cleanup can improve answer quality while the Fall hub snippet remains frozen during the active Tunnel of Trees experiment.",
  primaryGuardrail: "Preserve the Fall hub title, description, canonical, and H1 through the Tunnel of Trees evaluation window ending 2026-09-12.",
  appliedTreatment: [
    "crawlable dated statewide status before the interactive decision flow",
    "static non-JavaScript seasonal baseline in the live-readings block",
    "canonical WebSite entity reuse, correct Home breadcrumb, and Dataset mainEntity",
    "fresh Aug. 13-19 page/query GSC data in the CTR benchmark"
  ],
  queuedSnippetTest: {
    earliestDate: "2026-09-13",
    proposedTitle: treatmentTitle,
    proposedDescription: treatmentDescription,
    activationRule: "Re-evaluate after the Tunnel experiment closes; do not auto-ship if the current hub snippet has materially improved or the query mix changed."
  },
  nextCheckpoint: "Compare the next 7 complete GSC days after deployment once the hub has at least 500 impressions; keep the snippet frozen until 2026-09-12."
};
await writeFile(baselinePath, JSON.stringify(baseline, null, 2) + "\n");

let test = await readFile(testPath, "utf8");
test = replaceOnce(
  test,
  'test("Fall hub exposes a query-aligned, crawlable 2026 statewide answer", () => {',
  'test("Fall hub exposes a crawlable 2026 statewide answer without touching its protected snippet", () => {',
  "Fall lift test name",
);
test = replaceOnce(test, `assert.equal(title, "${treatmentTitle}");`, `assert.equal(title, "${protectedTitle}");`, "protected title assertion");
test = replaceOnce(test, `assert.equal(description, "${treatmentDescription}");`, `assert.equal(description, "${protectedDescription}");`, "protected description assertion");
test = replaceOnce(
  test,
  'assert.match(html, /<h1[^>]*>Michigan Fall Color Map 2026<\\/h1>/);',
  'assert.match(html, /<h1[^>]*>Michigan Fall Color<\\/h1>/);',
  "protected H1 assertion",
);
test = replaceOnce(
  test,
  '  assert.equal(baseline.priorityQuerySignals.fallColorHub.queries[0].position, 8.86);',
  '  assert.equal(baseline.priorityQuerySignals.fallColorHub.queries[0].position, 8.86);\n  assert.equal(baseline.priorityQuerySignals.fallColorHub.experiment.queuedSnippetTest.earliestDate, "2026-09-13");\n  assert.equal(baseline.priorityQuerySignals.fallColorHub.experiment.queuedSnippetTest.proposedTitle, "Michigan Fall Color Map 2026: Where Color Is Now");',
  "queued snippet assertion",
);
await writeFile(testPath, test);

console.log("Restored the protected Fall snippet and queued the query-aligned treatment until the active measurement lock ends.");
