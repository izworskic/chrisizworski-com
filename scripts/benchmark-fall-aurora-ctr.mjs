#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const page = await read("public/fall-color-northern-lights-michigan/index.html");
const experiment = JSON.parse(await read("benchmarks/fall-aurora-ctr-experiment.json"));
const ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));
const failures = [];
const check = (name, pass) => { if (!pass) failures.push(name); };
check("canonical preserved", page.includes('<link rel="canonical" href="https://chrisizworski.com/fall-color-northern-lights-michigan/">'));
check("title treatment", page.includes('<title>Michigan Fall Color &amp; Northern Lights 2026: Best Overlap</title>'));
check("H1 treatment", page.includes('<h1>Michigan Fall Color and Northern Lights: Best Overlap Window</h1>'));
check("direct answer", page.includes('The best chance to combine Michigan fall color and northern lights is late September into early October in the Upper Peninsula.'));
check("live fall handoff", page.includes('href="/fall-color/"'));
check("live aurora handoff", page.includes('href="/northern-lights-michigan/"'));
check("baseline exact", experiment.baseline.impressions === 90 && experiment.baseline.clicks === 0 && experiment.baseline.averagePosition === 8.28);
check("CTR target explicit", experiment.targets.ctrAtOrAbove === 0.02 && experiment.targets.averagePositionAtOrBetterThan === 10);
// The ledger retired on 2026-09-02 and its experiments array went with it. Guard the lookup so
// this gate reports its own subject rather than crashing, and assert the rule that outlived the
// row: with nothing being measured, this page must not claim a freeze it cannot back.
const ledgerExperiment = (ledger.experiments || []).find((item) => item.id === "2026-08-22-fall-aurora-overlap-ctr") || null;
check("no unbacked freeze is claimed for this page", ledger.status === "retired" ? ledgerExperiment === null : Boolean(ledgerExperiment?.paths?.includes("/fall-color-northern-lights-michigan/")));
console.log("\nFALL + AURORA CTR BENCHMARK");
console.log("=".repeat(72));
console.log("Baseline: 90 impressions, 0 clicks, position 8.28");
console.log("Target: CTR >= 2.0%, position <= 10");
if (failures.length) { console.log("Failures:"); for (const failure of failures) console.log(" - " + failure); }
if (process.argv.includes("--check")) { if (failures.length) process.exitCode = 1; else console.log("benchmark:fall-aurora-ctr PASS\n"); }
