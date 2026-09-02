#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const page = await read("public/fall-color/michigan-leaf-peeping-planner/index.html");
const hub = await read("public/fall-color/index.html");
const experiment = JSON.parse(await read("benchmarks/fall-weekend-planner-ctr-experiment.json"));
const ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));
const failures = [];
const check = (name, pass) => { if (!pass) failures.push(name); };
check("canonical preserved", page.includes('<link rel="canonical" href="https://chrisizworski.com/fall-color/michigan-leaf-peeping-planner/"'));
check("plain-language title", page.includes('<title>Michigan Fall Color Weekend Planner 2026 | Where to Go</title>'));
check("H1 aligned", page.includes('<h1>Michigan Fall Color Weekend Planner</h1>'));
check("weekend direct answer", page.includes('Choose your Michigan starting city and the weekend you can travel.'));
check("live tracker handoff", page.includes('href="/fall-color/"'));
check("product identity remains in app schema", page.includes('"name": "Michigan Leaf Peeping Planner"'));
check("statewide hub remains canonical to itself", hub.includes('rel="canonical" href="https://chrisizworski.com/fall-color/'));
check("baseline exact", experiment.baseline.impressions === 54 && experiment.baseline.clicks === 0 && experiment.baseline.averagePosition === 10.07);
check("CTR target explicit", experiment.targets.ctrAtOrAbove === 0.02 && experiment.targets.averagePositionAtOrBetterThan === 12);
// The ledger retired on 2026-09-02 and its experiments array went with it. Guard the lookup so
// this gate reports its own subject rather than crashing, and assert the rule that outlived the
// row: with nothing being measured, this page must not claim a freeze it cannot back.
const item = (ledger.experiments || []).find((entry) => entry.id === "2026-08-22-fall-weekend-planner-ctr") || null;
check("no unbacked freeze is claimed for this page", ledger.status === "retired" ? item === null : Boolean(item?.lastSearchFacingChangeDate));
console.log("\nFALL WEEKEND PLANNER CTR BENCHMARK");
console.log("=".repeat(72));
console.log("Baseline: 54 impressions, 0 clicks, position 10.07");
console.log("Target: CTR >= 2.0%; hold position <= 12");
if (failures.length) { console.log("Failures:"); for (const failure of failures) console.log(" - " + failure); }
if (process.argv.includes("--check")) { if (failures.length) process.exitCode = 1; else console.log("benchmark:fall-weekend-planner-ctr PASS\n"); }
