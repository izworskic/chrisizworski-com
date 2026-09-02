#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const upNorth = await read("public/up-north-michigan/index.html");
const circle = await read("public/lake-superior-circle-tour/index.html");
const targetPage = await read("public/fall-color/upper-peninsula-fall-color/index.html");
const benchmark = JSON.parse(await read("benchmarks/upper-peninsula-fall-rank-expansion.json"));
const ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));
const failures = [];
const check = (name, pass) => { if (!pass) failures.push(name); };
check("Up North link exists", upNorth.includes('href="/fall-color/upper-peninsula-fall-color/"'));
check("Circle Tour link exists", circle.includes('href="/fall-color/upper-peninsula-fall-color/"'));
check("destination title frozen", targetPage.includes('<title>Upper Peninsula Fall Color 2026 | Peak Dates &amp; Map</title>'));
check("destination H1 frozen", targetPage.includes('<h1>When does fall color peak in the Upper Peninsula?</h1>'));
check("destination canonical frozen", targetPage.includes('rel="canonical" href="https://chrisizworski.com/fall-color/upper-peninsula-fall-color/"'));
check("baseline exact", benchmark.baseline.impressions === 78 && benchmark.baseline.clicks === 1 && benchmark.baseline.averagePosition === 11.88);
check("top ten target", benchmark.targets.averagePositionAtOrBetterThan === 10 && benchmark.targets.stretchAveragePositionAtOrBetterThan === 8);
check("growth ledger is retired into ship-and-observe mode", ledger.status === "retired" && ledger.operatingMode === "ship-and-observe" && ledger.activeExperiments?.length === 0);
console.log("\nUPPER PENINSULA FALL RANK BENCHMARK");
console.log("=".repeat(72));
console.log("Baseline: 78 impressions, 1 click, position 11.88");
console.log("Target: top 10; stretch top 8; destination snippet frozen");
if (failures.length) { console.log("Failures:"); for (const failure of failures) console.log(" - " + failure); }
if (process.argv.includes("--check")) { if (failures.length) process.exitCode = 1; else console.log("benchmark:up-fall-rank PASS\n"); }
