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
const nameSerpPlaybook = await read(governance.sourceOfTruth.nameSerpPlaybook);
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

// The experiment ledger was retired on 2026-09-02 when the owner ended every Search Console
// experiment, so there is no measurementProtocol left to agree with. Governance still declares its
// own cadence, and the ledger must say plainly that it is retired rather than going quiet.
check(
  "Measurement cadence is declared, and the retired ledger says so",
  governance.measurement.primaryWindowDays === 28 &&
    governance.measurement.leadingIndicatorWindowDays === 7 &&
    governance.measurement.doNotDeclareWinnerEarly === true &&
    experiments.status === "retired" &&
    experiments.measurementProtocol === undefined,
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
// With no running experiments there is no freeze to enforce. The rule that still matters is that
// governance keeps the protection RULE on the books for the next experiment, and that the ledger is
// not claiming active experiments while saying it is retired.
check(
  "Protection rule survives the retirement, with nothing left frozen",
  requiredFreezeSurfaces.length === 7 &&
    governance.serpRules.protectRunningExperiments === true &&
    Array.isArray(experiments.activeExperiments) && experiments.activeExperiments.length === 0,
  10,
);

check(
  "Chris Izworski entity and branded SERP goals are stable across governance layers",
  governance.canonicalPersonId === "https://chrisizworski.com/#person" &&
    nameSerp.canonicalPersonId === governance.canonicalPersonId &&
    governance.brandedSerp?.primaryQuery === "Chris Izworski" &&
    governance.brandedSerp?.primarySitePositionTarget === 1 &&
    governance.brandedSerp?.operatingOccupancyTargets?.top10 >= 8 &&
    governance.brandedSerp?.operatingOccupancyTargets?.top20 >= 15 &&
    governance.brandedSerp?.operatingOccupancyTargets?.top30 >= 20 &&
    governance.brandedSerp?.stretchOccupancyTargets?.top30 === 30 &&
    governance.brandedSerp?.controlledIndependentTop10Floor === 7 &&
    governance.brandedSerp?.controlledIndependentTop10Target === 8 &&
    governance.brandedSerp?.favorableEarnedTop10Target === 2 &&
    governance.brandedSerp?.oneControlledSlotPerIndependentOrigin === true &&
    governance.brandedSerp?.coalesceSameRegistrableDomain === true &&
    governance.brandedSerp?.coalesceSamePlatformAccount === true &&
    governance.brandedSerp?.sameRootAdditionalSlotsCounted === 0 &&
    governance.brandedSerp?.samePlatformAdditionalSlotsCounted === 0 &&
    governance.brandedSerp?.distinctBrandedSurfacesAllowed === true &&
    governance.brandedSerp?.nonBrandedSingleCanonicalOwnerStillRequired === true &&
    nameSerp.occupancyTargets?.primarySitePosition === 1 &&
    nameSerp.occupancyTargets?.stretch?.top30 === 30 &&
    nameSerp.moatTargets?.controlledIndependentTop10Floor === 7 &&
    nameSerp.moatTargets?.controlledIndependentTop10Target === 8 &&
    nameSerp.moatTargets?.sameRootAdditionalSlotsCounted === 0 &&
    nameSerp.moatTargets?.samePlatformAdditionalSlotsCounted === 0 &&
    nameSerp.slotCountingRules?.oneControlledSlotPerIndependentOrigin === true &&
    nameSerp.slotCountingRules?.coalesceSameRegistrableDomain === true &&
    nameSerp.slotCountingRules?.coalesceSamePlatformAccount === true &&
    nameSerp.measurementProtocol?.depths?.includes(30) &&
    nameSerp.measurementProtocol?.countUniqueControlledOrigins === true &&
    nameSerp.measurementProtocol?.reportControlledAndEarnedSeparately === true &&
    nameSerp.entityGraphContract?.canonicalProfile === "https://chrisizworski.com/chris-izworski/" &&
    nameSerp.entityGraphContract?.requiredMainEntity === governance.canonicalPersonId &&
    nameSerp.entityGraphContract?.visibleMarkupParity === true &&
    nameSerp.entityGraphContract?.requiredIdentityProfiles?.length >= 7 &&
    typeof nameSerp.rules?.entityConsistency === "string" &&
    typeof nameSerp.rules?.searchOwnership === "string" &&
    typeof nameSerp.rules?.brandedOccupancy === "string" &&
    typeof nameSerp.rules?.controlledMoat === "string" &&
    typeof nameSerp.rules?.earnedAuthority === "string",
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
    strategyDoc.includes("Useful decisions and durable authority") &&
    nameSerpPlaybook.includes("## What counts as one controlled moat slot") &&
    nameSerpPlaybook.includes("7 of 10 as the minimum acceptable moat") &&
    nameSerpPlaybook.includes("8 of the top 10 results") &&
    nameSerpPlaybook.includes("same root domain") &&
    nameSerpPlaybook.includes("favorableEarned"),
  5,
);

check(
  "Owned properties reinforce brand without duplicate non-branded search ownership",
  ownedDomains.canonicalPersonId === governance.canonicalPersonId &&
    typeof ownedDomains.purpose === "string" &&
    ownedDomains.purpose.length > 20 &&
    typeof nameSerp.rules?.distinctValue === "string" &&
    nameSerp.rules.distinctValue.includes("thin pages") &&
    nameSerp.rules.searchOwnership.includes("non-branded") &&
    nameSerp.controlledOriginInventory?.length >= nameSerp.moatTargets?.controlledIndependentTop10Target &&
    nameSerp.knownEntityRepairs?.some((repair) => repair.status === "external-fix-required"),
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
console.log(`Branded SERP target: #${governance.brandedSerp.primarySitePositionTarget} primary; ${governance.brandedSerp.controlledIndependentTop10Target}/10 independently controlled; ${governance.brandedSerp.operatingOccupancyTargets.top30}/30 operating, ${governance.brandedSerp.stretchOccupancyTargets.top30}/30 stretch`);
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
