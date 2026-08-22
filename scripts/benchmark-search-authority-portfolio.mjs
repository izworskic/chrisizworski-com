#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));

const portfolio = await readJson("benchmarks/search-authority-portfolio.json");
const toolNetwork = await readJson(portfolio.sourceOfTruth.toolNetwork);
const ownedDomains = await readJson(portfolio.sourceOfTruth.ownedDomains);
const nameSerp = await readJson(portfolio.sourceOfTruth.nameSerp);
const experiments = await readJson(portfolio.sourceOfTruth.experiments);
const strategyGovernance = await readJson("benchmarks/search-strategy-governance.json");
const packageJson = await readJson("package.json");
const strategyDoc = await read(portfolio.sourceOfTruth.portfolioStrategy);
const agents = await read("AGENTS.md");

let score = 0;
const failures = [];
const validActions = new Set(["PROTECT", "PUSH", "EXPAND", "CONNECT", "REPAIR", "BUILD_NEXT", "RETIRE"]);

function check(name, passed, points, detail = "") {
  if (passed) score += points;
  else failures.push(detail ? `${name}: ${detail}` : name);
}

const scoringTotal = Object.values(portfolio.scoringModel)
  .filter((value) => typeof value === "number")
  .reduce((sum, value) => sum + value, 0) - portfolio.scoringModel.total;
check(
  "Opportunity scoring model is a true 100-point model",
  portfolio.scoringModel.total === 100 && scoringTotal === 100,
  10,
  `dimension total ${scoringTotal}`,
);

check(
  "Fresh leading Search Console signal is explicit and does not replace experiment windows",
  portfolio.measurement.latestLeadingSnapshot?.spreadsheetId === "1lrFEAxYT7whMAx2Gnrq-IRfUHr7cjshU542FWwJ7Kfw" &&
    portfolio.measurement.latestLeadingSnapshot?.exportedThrough === "2026-08-19" &&
    portfolio.measurement.latestLeadingSnapshot?.windowDays === 7 &&
    portfolio.measurement.decisionWindowDays === 28 &&
    experiments.measurementProtocol?.windowDays === 28,
  10,
);

check(
  "Branded #1 is protected as a site outcome, not forced onto the biography URL",
  portfolio.measurement.brandedExactName?.averagePosition <= 1 &&
    nameSerp.primaryBrandResult === "https://chrisizworski.com/" &&
    nameSerp.primaryIdentitySurface === "https://chrisizworski.com/chris-izworski/" &&
    nameSerp.occupancyTargets?.primarySitePosition === 1,
  10,
);

const focusIds = portfolio.focusPortfolio.map((item) => item.id);
const focusValid = new Set(focusIds).size === focusIds.length && portfolio.focusPortfolio.every((item) =>
  Number.isFinite(item.priorityScore) &&
  item.priorityScore >= 0 &&
  item.priorityScore <= 100 &&
  validActions.has(item.action) &&
  typeof item.surface === "string" &&
  item.surface.startsWith("https://") &&
  typeof item.next === "string" &&
  item.next.length > 20
);
check("Focus portfolio has unique, scored, actionable surfaces", focusValid, 10);

const focusByToolId = new Map(portfolio.focusPortfolio.filter((item) => item.toolId).map((item) => [item.toolId, item]));
const protectedTools = toolNetwork.tools.filter((tool) => tool.searchTreatment?.status === "protected");
check(
  "Protected search treatments remain PROTECT in the holistic portfolio",
  protectedTools.every((tool) => focusByToolId.get(tool.id)?.action === "PROTECT"),
  10,
  protectedTools.filter((tool) => focusByToolId.get(tool.id)?.action !== "PROTECT").map((tool) => tool.id).join(", "),
);

function inferredToolAction(tool) {
  const explicit = focusByToolId.get(tool.id)?.action;
  if (explicit) return explicit;
  if (tool.searchTreatment?.status === "protected") return "PROTECT";
  const evidence = tool.searchEvidence || {};
  if (evidence.status === "measured") {
    if (evidence.averagePosition > 30) return "REPAIR";
    if (evidence.averagePosition <= 15) return "PUSH";
    return "EXPAND";
  }
  if (["known-demand", "growing", "new", "preseason", "measured-query"].includes(evidence.status)) return "EXPAND";
  return "CONNECT";
}

const toolCoverage = toolNetwork.tools.map((tool) => ({ id: tool.id, action: inferredToolAction(tool) }));
check(
  "Every registered tool resolves to one portfolio action",
  toolCoverage.length === toolNetwork.tools.length && toolCoverage.every((item) => validActions.has(item.action)),
  10,
);

function hostOf(url) {
  try { return new URL(url).host; } catch { return null; }
}
const focusHosts = new Map(portfolio.focusPortfolio.map((item) => [hostOf(item.surface), item.action]));
const ownedCoverage = ownedDomains.roots.map((rootEntry) => ({
  host: rootEntry.host,
  action: focusHosts.get(rootEntry.host) || (rootEntry.status === "active" ? "CONNECT" : "PROTECT"),
}));
const plannedCoverage = (ownedDomains.plannedSubproperties || []).map((entry) => ({
  host: entry.host,
  action: focusHosts.get(entry.host),
}));
check(
  "Every owned root and planned subproperty resolves to an authority action",
  ownedCoverage.every((item) => validActions.has(item.action)) &&
    plannedCoverage.every((item) => item.action === "BUILD_NEXT"),
  10,
);

const immediateText = portfolio.immediateQueue.join(" ").toLowerCase();
const protectedText = portfolio.protectedQueue.join(" ").toLowerCase();
check(
  "Immediate queue advances eligible leverage while protected work stays separate",
  immediateText.includes("mackinac-tolls") &&
    immediateText.includes("beach-report") &&
    immediateText.includes("border-waits") &&
    immediateText.includes("great-lakes-buoys") &&
    immediateText.includes("garden-planner") &&
    immediateText.includes("winter") &&
    protectedText.includes("northern lights") &&
    protectedText.includes("soo locks") &&
    protectedText.includes("ship tracker") &&
    protectedText.includes("fall color"),
  10,
);

check(
  "Holistic strategy is connected to global governance and agent instructions",
  strategyGovernance.sourceOfTruth?.authorityPortfolio === "benchmarks/search-authority-portfolio.json" &&
    strategyGovernance.sourceOfTruth?.authorityPortfolioStrategy === "docs/SEARCH_AUTHORITY_PORTFOLIO.md" &&
    strategyDoc.includes("## Five tracks") &&
    strategyDoc.includes("## Portfolio actions") &&
    strategyDoc.includes("## Cluster strategy") &&
    strategyDoc.includes("## Monthly portfolio review") &&
    agents.includes("SEARCH_AUTHORITY_PORTFOLIO.md") &&
    agents.includes("search-authority-portfolio.json"),
  10,
);

check(
  "Portfolio benchmark is part of the full release gate",
  packageJson.scripts?.["benchmark:search-authority"] === "node scripts/benchmark-search-authority-portfolio.mjs" &&
    packageJson.scripts?.["verify:all"]?.includes("benchmark:search-authority"),
  10,
);

console.log("\nSEARCH AUTHORITY PORTFOLIO BENCHMARK");
console.log("=".repeat(72));
console.log(`Score: ${score}/100`);
console.log(`Focus surfaces: ${portfolio.focusPortfolio.length}`);
console.log(`Registered tools covered: ${toolCoverage.length}/${toolNetwork.tools.length}`);
console.log(`Owned roots covered: ${ownedCoverage.length}/${ownedDomains.roots.length}`);
console.log(`Exact-name leading position: ${portfolio.measurement.brandedExactName.averagePosition}`);
console.log(`Immediate queue items: ${portfolio.immediateQueue.length}`);
if (failures.length) {
  console.log("Failures:");
  for (const failure of failures) console.log(` - ${failure}`);
}

if (process.argv.includes("--check")) {
  if (score < 100 || failures.length) process.exitCode = 1;
  else console.log("benchmark:search-authority PASS\n");
}
