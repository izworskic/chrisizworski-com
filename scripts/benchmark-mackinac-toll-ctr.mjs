#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));

const experiment = await readJson("benchmarks/mackinac-toll-ctr-experiment.json");
const html = await read("public/mackinac-bridge-tolls/index.html");
const packageJson = await readJson("package.json");

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
const h1Match = html.match(/<h1>([^<]+)<\/h1>/i);

check(experiment.status === "ready-for-release", "experiment must remain ready-for-release until production merge");
check(experiment.measurement?.windowDays === 28, "experiment must use a 28-day decision window");
check(experiment.evidence?.pageBaseline?.impressions === 490, "baseline impressions changed unexpectedly");
check(experiment.evidence?.pageBaseline?.clicks === 0, "baseline clicks changed unexpectedly");
check(experiment.evidence?.pageBaseline?.averagePosition === 7.44, "baseline position changed unexpectedly");

check(titleMatch?.[1] === experiment.treatment.title.replace("&", "&amp;"), `title mismatch: ${titleMatch?.[1] || "missing"}`);
check(descMatch?.[1] === experiment.treatment.metaDescription, "meta description no longer matches treatment");
check(h1Match?.[1] === experiment.treatment.h1.replace("&", "&amp;"), `H1 mismatch: ${h1Match?.[1] || "missing"}`);
check(html.includes(experiment.treatment.firstAnswer), "first answer no longer matches the experiment treatment");
check(html.includes(`<link rel="canonical" href="${experiment.canonical}">`), "canonical changed");
check(html.includes(experiment.factualGuardrails.officialSource), "official Mackinac Bridge Authority fare source is missing");
check(html.includes("$4 one way") && html.includes("$8 round trip"), "one-way and round-trip passenger fares are not both explicit");
check(html.includes("$2 per axle") && html.includes("$5 per axle"), "official axle rates are not both explicit");

const decodedTitle = (titleMatch?.[1] || "").replaceAll("&amp;", "&");
check(decodedTitle.length <= 60, `title is ${decodedTitle.length} characters; maximum is 60`);
check((descMatch?.[1] || "").length <= 158, `meta description is ${(descMatch?.[1] || "").length} characters; maximum is 158`);

check(
  packageJson.scripts?.["benchmark:mackinac-toll-ctr"] === "node scripts/benchmark-mackinac-toll-ctr.mjs",
  "package.json is missing benchmark:mackinac-toll-ctr",
);
check(
  packageJson.scripts?.["verify:all"]?.includes("benchmark:mackinac-toll-ctr"),
  "benchmark:mackinac-toll-ctr is not part of verify:all",
);

console.log("\nMACKINAC TOLL CTR EXPERIMENT");
console.log("=".repeat(72));
console.log(`Baseline: ${experiment.evidence.pageBaseline.impressions} impressions / ${experiment.evidence.pageBaseline.clicks} clicks / position ${experiment.evidence.pageBaseline.averagePosition}`);
console.log(`Treatment title: ${experiment.treatment.title}`);
console.log(`Target CTR: ${(experiment.measurement.targetCtr * 100).toFixed(1)}%`);

if (failures.length) {
  console.log("Failures:");
  failures.forEach((failure) => console.log(` - ${failure}`));
  process.exitCode = 1;
} else {
  console.log("benchmark:mackinac-toll-ctr PASS\n");
}
