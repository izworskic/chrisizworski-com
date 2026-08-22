#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));

const portfolio = await readJson("benchmarks/search-authority-portfolio.json");
const snapshot = await readJson(portfolio.sourceOfTruth.freshSearchConsole);
const strategy = await readJson(portfolio.sourceOfTruth.searchStrategy);
const experiments = await readJson(portfolio.sourceOfTruth.experiments);
const toolNetwork = await readJson(portfolio.sourceOfTruth.toolNetwork);
const ownedDomains = await readJson(portfolio.sourceOfTruth.ownedDomains);
const entity = await readJson(portfolio.sourceOfTruth.entitySurface);
const nameSerp = await readJson(portfolio.sourceOfTruth.nameSerp);
const citation = await readJson(portfolio.sourceOfTruth.citationReadiness);
const humanPlan = await read(portfolio.sourceOfTruth.humanPlan);
const packageJson = await readJson("package.json");

let score = 0;
const failures = [];

function check(name, passed, points, detail = "") {
  if (passed) score += points;
  else failures.push(detail ? `${name}: ${detail}` : name);
}

const scoreTotal = Object.values(portfolio.scoreModel).reduce((sum, value) => sum + value, 0);
check(
  "Portfolio uses a complete 100-point opportunity-cost model",
  scoreTotal === 100 && Object.keys(portfolio.scoreModel).length >= 9,
  10,
  `score total ${scoreTotal}`,
);

check(
  "Fresh Search Console leading snapshot is explicit and observed",
  snapshot.window?.days === 7 &&
    snapshot.window?.start === "2026-08-13" &&
    snapshot.window?.end === "2026-08-19" &&
    snapshot.window?.clicks === 207 &&
    snapshot.window?.impressions === 12567 &&
    snapshot.source?.spreadsheetId === "1lrFEAxYT7whMAx2Gnrq-IRfUHr7cjshU542FWwJ7Kfw" &&
    snapshot.interpretationRules?.some((rule) => rule.includes("leading indicator")),
  10,
);

const requiredActions = [
  "protect",
  "protect-then-push",
  "push-rank",
  "repair-serp-conversion",
  "diagnose-zero-click",
  "expand-authority",
  "connect",
  "seasonal-build",
  "launch-gated",
  "deprioritize",
];
check(
  "Every portfolio action class is defined",
  requiredActions.every((action) => typeof portfolio.actionTaxonomy?.[action] === "string") &&
    portfolio.hardGates?.technicalHealthIsGateNotTradeoff === true &&
    portfolio.hardGates?.newBuildRequiresPortfolioFit === true,
  10,
);

const priorities = portfolio.portfolioPriorities || [];
const p0 = priorities.filter((item) => item.tier === "P0");
const priorityCanonicals = new Set(priorities.map((item) => item.canonical));
const expectedLeverage = [
  "https://chrisizworski.com/soo-locks/",
  "https://chrisizworski.com/northern-lights-michigan/",
  "https://chrisizworski.com/great-lakes-freighter-tracking/",
  "https://chrisizworski.com/mackinac-bridge-live/",
  "https://chrisizworski.com/fall-color/",
  "https://ausable.chrisizworski.com/",
  "https://chrisizworski.com/great-lakes-beaches/",
  "https://chrisizworski.com/great-lakes-buoys/",
  "https://chrisizworski.com/michigan-border-wait-times/",
  "https://chrisizworski.com/michigan-boat-launches/",
];
check(
  "Fresh near-page-one leverage is represented in the priority queue",
  priorities.length >= 20 &&
    p0.length >= 10 &&
    expectedLeverage.every((url) => priorityCanonicals.has(url)) &&
    priorities.every((item) => requiredActions.includes(item.action)),
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
  "Portfolio authority work cannot override clean experiment windows",
  portfolio.hardGates?.protectActiveExperiments === true &&
    experiments.measurementProtocol?.windowDays === 28 &&
    requiredFreezeSurfaces.every((surface) => experiments.measurementProtocol?.freezeDuringWindow?.includes(surface)) &&
    strategy.serpRules?.protectRunningExperiments === true,
  10,
);

check(
  "The portfolio is an ecosystem, not a page list",
  toolNetwork.tools?.length >= 40 &&
    ownedDomains.roots?.length >= 5 &&
    portfolio.clusterStrategy?.length >= 7 &&
    portfolio.clusterStrategy?.some((cluster) => cluster.cluster === "great-lakes-shipping") &&
    portfolio.clusterStrategy?.some((cluster) => cluster.cluster === "gardening-and-natural-year") &&
    portfolio.clusterStrategy?.some((cluster) => cluster.cluster === "entity-and-earned-authority") &&
    portfolio.hardGates?.newBuildPreferredMinimumRelationships >= 2,
  10,
);

const independentOwned = entity.independentSurfaces?.filter((surface) => surface.status === "owned") || [];
const independentCandidates = entity.independentSurfaces?.filter((surface) => surface.status === "absent") || [];
check(
  "Independent authority is treated as a first-class growth channel",
  portfolio.canonicalPersonId === entity.canonicalPersonId &&
    independentOwned.length >= 7 &&
    independentCandidates.length >= 3 &&
    portfolio.externalAuthorityProgram?.alreadyOwned?.length >= 7 &&
    portfolio.externalAuthorityProgram?.nextCandidates?.filter((candidate) => candidate.priority === "high").length >= 3 &&
    portfolio.externalAuthorityProgram?.doNot?.some((rule) => rule.includes("mass-create")),
  10,
);

check(
  "AI answer readiness is tied to the existing citation ratchet",
  portfolio.aiSearchProgram?.currentCitationBaseline?.trackedTools === citation.tools &&
    portfolio.aiSearchProgram?.currentCitationBaseline?.answerBlocks === citation.answerBlocks &&
    portfolio.aiSearchProgram?.currentCitationBaseline?.selfContained === citation.selfContained &&
    portfolio.aiSearchProgram?.currentCitationBaseline?.pageDependent === citation.pageDependent &&
    portfolio.aiSearchProgram?.rule?.includes("human usefulness") &&
    portfolio.aiSearchProgram?.rule?.includes("no filler"),
  10,
);

check(
  "Branded #1 protects the winning site while preserving the identity page role",
  nameSerp.canonicalPersonId === portfolio.canonicalPersonId &&
    nameSerp.primarySiteSurface === "https://chrisizworski.com/" &&
    nameSerp.primaryIdentitySurface === "https://chrisizworski.com/chris-izworski/" &&
    nameSerp.occupancyTargets?.primarySitePosition === 1 &&
    nameSerp.observedLeadingSignal?.exactNameAveragePosition === 1.0 &&
    nameSerp.rules?.primarySitePriority?.includes("homepage") &&
    nameSerp.rules?.identitySurfaceRole?.includes("biographical"),
  10,
);

check(
  "The human operating plan and full release gate enforce portfolio thinking",
  humanPlan.includes("## Portfolio scoring") &&
    humanPlan.includes("## Branded SERP is a portfolio outcome") &&
    humanPlan.includes("## Independent authority program") &&
    humanPlan.includes("## Cluster flywheel") &&
    humanPlan.includes("## What this changes about future builds") &&
    packageJson.scripts?.["benchmark:authority-portfolio"] === "node scripts/benchmark-search-authority-portfolio.mjs" &&
    packageJson.scripts?.["verify:all"]?.includes("benchmark:authority-portfolio"),
  10,
);

console.log("\nSEARCH AUTHORITY PORTFOLIO BENCHMARK");
console.log("=".repeat(72));
console.log(`Score: ${score}/100`);
console.log(`Fresh Search Console window: ${snapshot.window.start} to ${snapshot.window.end}`);
console.log(`Fresh traffic: ${snapshot.window.impressions.toLocaleString()} impressions, ${snapshot.window.clicks} clicks, ${(snapshot.window.ctr * 100).toFixed(2)}% CTR`);
console.log(`Portfolio priorities: ${priorities.length} total, ${p0.length} P0`);
console.log(`Owned independent entity surfaces: ${independentOwned.length}`);
console.log(`Branded goal: first-party site #${nameSerp.occupancyTargets.primarySitePosition}; ${nameSerp.occupancyTargets.operating.top30}/30 operating, ${nameSerp.occupancyTargets.stretch.top30}/30 stretch`);

if (failures.length) {
  console.log("Failures:");
  for (const failure of failures) console.log(` - ${failure}`);
}

if (process.argv.includes("--check")) {
  if (score < portfolio.releaseGate.minimumScore || failures.length) {
    process.exitCode = 1;
  } else {
    console.log("benchmark:authority-portfolio PASS\n");
  }
}
