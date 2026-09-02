#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const page = await read("public/michigan-paddling/manistee-river/index.html");
const benchmark = JSON.parse(await read("benchmarks/manistee-page-one-push.json"));
const experiments = JSON.parse(await read("benchmarks/growth-experiments.json"));
const portfolio = JSON.parse(await read("benchmarks/search-authority-portfolio.json"));

const failures = [];
const check = (name, pass) => { if (!pass) failures.push(name); };
check("canonical preserved", page.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-paddling/manistee-river/">'));
check("page-one title treatment", page.includes('<title>Manistee River Paddling Guide: Map, Access &amp; Float Trips</title>'));
check("H1 aligned", page.includes('<h1 class="page-title">Manistee River Paddling Guide</h1>'));
check("direct answer exists", page.includes('id="manistee-trip-answer"'));
check("field map handoff exists", page.includes('href="/manistee-river-map/"'));
check("visible access FAQ exists", page.includes('Where are the Manistee River put-ins and take-outs?'));
check("structured access FAQ exists", page.includes('Is there a Manistee River map with put-ins and take-outs?'));
check("baseline is exact", benchmark.baseline.impressions === 72 && benchmark.baseline.clicks === 0 && benchmark.baseline.averagePosition === 11.4);
check("top ten target is explicit", benchmark.targets.averagePositionAtOrBetterThan === 10 && benchmark.targets.ctrAtOrAbove === 0.015);
check("growth ledger is retired into ship-and-observe mode", experiments.status === "retired" && experiments.operatingMode === "ship-and-observe" && experiments.activeExperiments?.length === 0);
const focus = portfolio.focusPortfolio.find((item) => item.id === "manistee");
check("portfolio points at actual Search Console owner", focus?.surface === "https://chrisizworski.com/michigan-paddling/manistee-river/" && focus?.action === "PROTECT" && !focus?.toolId);
check("Manistee leaves immediate queue", !portfolio.immediateQueue.join(" ").toLowerCase().includes("manistee"));
check("Manistee enters protected queue", portfolio.protectedQueue.join(" ").toLowerCase().includes("manistee river paddling"));

console.log("\nMANISTEE PAGE-ONE PUSH BENCHMARK");
console.log("=".repeat(72));
console.log("Baseline: " + benchmark.baseline.impressions + " impressions, " + benchmark.baseline.clicks + " clicks, position " + benchmark.baseline.averagePosition);
console.log("Target: top " + benchmark.targets.averagePositionAtOrBetterThan + ", CTR >= " + (benchmark.targets.ctrAtOrAbove * 100).toFixed(1) + "%");
if (failures.length) {
  console.log("Failures:");
  for (const failure of failures) console.log(" - " + failure);
}
if (process.argv.includes("--check")) {
  if (failures.length) process.exitCode = 1;
  else console.log("benchmark:manistee-page-one PASS\n");
}
