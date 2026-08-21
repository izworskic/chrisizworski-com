#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));

const governance = await readJson("benchmarks/search-strategy-governance.json");
const experiments = await readJson(governance.sourceOfTruth.experimentLedger);
const searchGrowth = await readJson(governance.sourceOfTruth.measuredOpportunity);
const toolNetwork = await readJson(governance.sourceOfTruth.toolNetwork);
const nameSerp = await readJson(governance.sourceOfTruth.nameSerp);
const ownedDomains = await readJson(governance.sourceOfTruth.ownedDomains);
const strategyDoc = await read(governance.sourceOfTruth.humanStrategy);
const robots = await read(governance.sourceOfTruth.robots);
const llms = await read(governance.sourceOfTruth.llms);
const packageJson = await readJson("package.json");

let score = 0;
const failures = [];

function check(name, passed, points, detail = "") {
  if (passed) score += points;
  else failures.push(detail ? `${name}: ${detail}` : name);
}

const pillarTotal = Object.values(governance.pillars).reduce((sum, value) => sum + value, 0);
check(
  "Strategy pillars form a 100-point operating model",
  pillarTotal === 100,
  5,
  `pillar total ${pillarTotal}`,
);

check(
  "Measurement cadence agrees with the experiment ledger",
  governance.measurement.primaryWindowDays === 28 &&
    experiments.measurementProtocol?.windowDays === governance.measurement.primaryWindowDays &&
    governance.measurement.leadingIndicatorWindowDays === 7 &&
    governance.measurement.doNotDeclareWinnerEarly === true,
  10,
);

const requiredFreezeSurfaces = [
  "title",
  "metaDescription",
  "h1",
  "firstAnswer",
  "structuredData",
  "canonical",
  "indexability",
];
check(
  "Protected experiments freeze every search-facing surface",
  requiredFreezeSurfaces.every((surface) => experiments.measurementProtocol?.freezeDuringWindow?.includes(surface)) &&
    governance.serpRules.protectRunningExperiments === true,
  10,
);

check(
  "Chris Izworski entity identity is stable across governance layers",
  governance.canonicalPersonId === "https://chrisizworski.com/#person" &&
    nameSerp.canonicalPersonId === governance.canonicalPersonId &&
    typeof nameSerp.rules?.entityConsistency === "string" &&
    typeof nameSerp.rules?.searchOwnership === "string",
  10,
);

check(
  "Canonical search ownership and network fit are governed",
  typeof toolNetwork.rules?.searchOwnership === "string" &&
    toolNetwork.rules.searchOwnership.includes("One canonical owner") &&
    typeof toolNetwork.rules?.newBuildRule === "string" &&
    toolNetwork.bestFitScoring?.cannibalizationSafety > 0 &&
    toolNetwork.bestFitScoring?.distinctSearchIntent > 0,
  10,
);

const canonicalGate = governance.newCanonicalGate;
check(
  "New canonical URLs require distinct value, evidence and cannibalization safety",
  canonicalGate.requiresDistinctIntentOrDecision === true &&
    canonicalGate.requiresDocumentedEvidenceOrUniqueUtility === true &&
    canonicalGate.requiresCannibalizationReview === true &&
    canonicalGate.requiresNetworkFit === true &&
    canonicalGate.requiresEntityIntegrity === true &&
    canonicalGate.requiresIntentionalDiscovery === true &&
    canonicalGate.requiresMeasurementPlan === true &&
    canonicalGate.doorwayVariantPagesAllowed === false,
  10,
);

check(
  "Technical and AI discovery surfaces are explicit",
  governance.technicalRules.singleIntendedCanonical === true &&
    governance.technicalRules.previewHostsNoindex === true &&
    governance.technicalRules.crawlableCoreAnswer === true &&
    governance.aiSearchRules.llmsTxtMustReflectRealCanonicals === true &&
    robots.includes("Sitemap: https://chrisizworski.com/sitemap.xml") &&
    robots.includes("sitemap-fall.xml") &&
    robots.includes("sitemap-winter.xml") &&
    llms.includes("Chris Izworski") &&
    llms.includes("Michigan"),
  10,
);

const seasonal = governance.seasonalPipeline;
check(
  "Seasonal search planning covers the full Michigan year",
  seasonal.leadTimeWeeks?.[0] === 6 &&
    seasonal.leadTimeWeeks?.[1] === 10 &&
    seasonal.lateSummerFall?.length >= 5 &&
    seasonal.fallWinter?.length >= 4 &&
    seasonal.lateWinterSpring?.length >= 5 &&
    seasonal.lateSpringSummer?.length >= 5,
  10,
);

check(
  "Measured opportunity remains the numeric growth source of truth",
  searchGrowth.current28Days?.days === 28 &&
    searchGrowth.current28Days?.impressions > 0 &&
    searchGrowth.pages?.length >= 8 &&
    searchGrowth.queryOpportunities?.length >= 10 &&
    searchGrowth.goals?.dailyImpressionsFloor > 0 &&
    searchGrowth.goals?.qualifiedSiteCtr > 0 &&
    searchGrowth.goals?.brandedChrisIzworskiPosition > 0,
  10,
);

check(
  "Human strategy documents the operating decisions",
  strategyDoc.includes("## New canonical URL gate") &&
    strategyDoc.includes("## SERP conversion rules") &&
    strategyDoc.includes("## Internal-link strategy") &&
    strategyDoc.includes("## Technical SEO standard") &&
    strategyDoc.includes("## AI-search and answer-engine readiness") &&
    strategyDoc.includes("## Measurement operating cadence") &&
    strategyDoc.includes("Useful decisions and durable authority"),
  10,
);

check(
  "Owned properties reinforce brand without duplicate search ownership",
  ownedDomains.canonicalPersonId === governance.canonicalPersonId &&
    typeof ownedDomains.objective === "string" &&
    ownedDomains.objective.length > 20 &&
    typeof nameSerp.rules?.distinctValue === "string" &&
    nameSerp.rules.distinctValue.includes("thin pages") &&
    nameSerp.rules.searchOwnership.includes("must not cause"),
  5,
);

check(
  "Search strategy benchmark is enforced by the full release gate",
  packageJson.scripts?.["benchmark:search-strategy"] === "node scripts/benchmark-search-strategy-governance.mjs" &&
    packageJson.scripts?.["verify:all"]?.includes("benchmark:search-strategy"),
  5,
);

console.log("\nSEARCH STRATEGY GOVERNANCE BENCHMARK");
console.log("=".repeat(72));
console.log(`Score: ${score}/100`);
console.log(`Primary measurement window: ${governance.measurement.primaryWindowDays} days`);
console.log(`Canonical person: ${governance.canonicalPersonId}`);
console.log(`New canonical network target: ${canonicalGate.preferredMinimumNetworkRelationships} relationships`);
if (failures.length) {
  console.log("Failures:");
  for (const failure of failures) console.log(` - ${failure}`);
}

if (process.argv.includes("--check")) {
  if (score < governance.releaseGate.minimumScore || (governance.releaseGate.noFatalFailures && failures.length)) {
    process.exitCode = 1;
  } else {
    console.log("benchmark:search-strategy PASS\n");
  }
}
