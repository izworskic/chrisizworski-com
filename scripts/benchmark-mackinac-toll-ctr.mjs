#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));

const transport = await readJson("benchmarks/transport-365-growth.json");
const experiment = transport.experiments.find((item) => item.id === "mackinac-toll-price-led-ctr");
const html = await read("public/mackinac-bridge-tolls/index.html");
const packageJson = await readJson("package.json");

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
const h1Match = html.match(/<h1>([^<]+)<\/h1>/i);

check(Boolean(experiment), "Mackinac toll experiment is missing from the 365 transport ledger");
check(experiment?.status === "ready-for-release", "experiment must remain ready-for-release until production merge");
check(experiment?.baseline?.impressions === 637, "original pre-release baseline impressions changed unexpectedly");
check(experiment?.baseline?.clicks === 1, "original pre-release baseline clicks changed unexpectedly");
check(experiment?.latestLeadingSignal?.page?.impressions === 490, "fresh leading-signal impressions changed unexpectedly");
check(experiment?.latestLeadingSignal?.page?.clicks === 0, "fresh leading-signal clicks changed unexpectedly");
check(experiment?.latestLeadingSignal?.page?.averagePosition === 7.44, "fresh leading-signal position changed unexpectedly");
check(experiment?.latestLeadingSignal?.purpose?.includes("original pre-release baseline remains"), "fresh signal must not replace the original experiment baseline");

check(titleMatch?.[1] === experiment?.treatment?.title.replace("&", "&amp;"), `title mismatch: ${titleMatch?.[1] || "missing"}`);
check(descMatch?.[1] === experiment?.treatment?.metaDescription, "meta description no longer matches treatment");
check(h1Match?.[1] === experiment?.treatment?.h1.replace("&", "&amp;"), `H1 mismatch: ${h1Match?.[1] || "missing"}`);
check(html.includes(experiment?.treatment?.firstAnswer || "__missing__"), "first answer no longer matches the experiment treatment");
check(html.includes('<link rel="canonical" href="https://chrisizworski.com/mackinac-bridge-tolls/">'), "canonical changed");
check(html.includes(experiment?.officialFareGuardrail?.source || "__missing__"), "official Mackinac Bridge Authority fare source is missing");
check(html.includes("$4 one way") && html.includes("$8 round trip"), "one-way and round-trip passenger fares are not both explicit");
check(html.includes("$2 per axle") && html.includes("$5 per axle"), "official axle rates are not both explicit");
check(Array.isArray(experiment?.freezeDuringWindow) && experiment.freezeDuringWindow.includes("title") && experiment.freezeDuringWindow.includes("canonical"), "measurement freeze is incomplete");

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
console.log(`Original baseline: ${experiment?.baseline?.impressions} impressions / ${experiment?.baseline?.clicks} clicks / position ${experiment?.baseline?.averagePosition}`);
console.log(`Fresh leading signal: ${experiment?.latestLeadingSignal?.page?.impressions} impressions / ${experiment?.latestLeadingSignal?.page?.clicks} clicks / position ${experiment?.latestLeadingSignal?.page?.averagePosition}`);
console.log(`Treatment title: ${experiment?.treatment?.title}`);
console.log(`Target CTR: ${((experiment?.target?.ctr || 0) * 100).toFixed(1)}%`);

if (failures.length) {
  console.log("Failures:");
  failures.forEach((failure) => console.log(` - ${failure}`));
  process.exitCode = 1;
} else {
  console.log("benchmark:mackinac-toll-ctr PASS\n");
}
