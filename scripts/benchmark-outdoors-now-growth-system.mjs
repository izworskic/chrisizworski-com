#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const read = (file) => readFile(path.join(root, file), "utf8");
const failures = [];
let score = 0;

function check(name, passed, points, detail = "") {
  if (passed) score += points;
  else failures.push(detail ? `${name}: ${detail}` : name);
}

const [
  contract,
  authority,
  registry,
  actions,
  experiments,
  owned,
  branded,
  strategy,
  doc,
] = await Promise.all([
  readJson("benchmarks/outdoors-now-growth-system.json"),
  readJson("benchmarks/search-authority-portfolio.json"),
  readJson("benchmarks/tool-network-registry.json"),
  readJson("benchmarks/tool-network-actions.json"),
  readJson("benchmarks/growth-experiments.json"),
  readJson("benchmarks/owned-domain-network.json"),
  readJson("benchmarks/name-serp-governance.json"),
  read("docs/SEARCH_STRATEGY.md"),
  read("docs/OUTDOORS_NOW_GROWTH_SYSTEM.md"),
]);

const authorityEntry = authority.focusPortfolio.find((item) => item.id === "outdoors-now");
const registryItems = registry.tools || registry.nodes || registry.entries || [];
const registryEntry = registryItems.find((item) => item.id === "outdoors-now");
const repair = actions.repairs.find((item) => item.id === "outdoors-now-growth-operating-system");
const experiment = experiments.experiments.find((item) => item.id === "2026-08-28-outdoors-now-growth-system");
const ownedRoot = owned.roots.find((item) => item.host === "michiganoutdoorsnow.chrisizworski.com");
const brandedSupport = branded.supportingControlledProperties.find(
  (item) => item.origin === "michiganoutdoorsnow.chrisizworski.com",
);

check(
  "Central contract pins the bounded launch",
  contract.tool.locationIntentPages === 54 &&
    contract.tool.originsCovered === 11 &&
    contract.tool.families.length === 5,
  15,
);

check(
  "Adjacent canonical owners remain protected",
  contract.canonicalOwnership.protectedAdjacentOwners.beaches ===
      "https://chrisizworski.com/great-lakes-beaches/" &&
    contract.canonicalOwnership.protectedAdjacentOwners.freighters ===
      "https://chrisizworski.com/great-lakes-freighter-tracking/" &&
    contract.canonicalOwnership.protectedAdjacentOwners.birding ===
      "https://michiganbirdingreport.com/",
  10,
);

check(
  "Search plus product evidence is required for family expansion",
  contract.decisionRules.expandFamilyRequires.impressions === 250 &&
    contract.decisionRules.expandFamilyRequires.clicks === 5 &&
    contract.decisionRules.expandFamilyRequires.plannerCompletions === 10 &&
    contract.decisionRules.expandFamilyRequires.directionsOpens === 3 &&
    contract.decisionRules.expandFamilyRequires.plusExistingNewCanonicalGate === true,
  15,
);

check(
  "Authority portfolio protects the measurement window",
  authorityEntry?.action === "PROTECT" &&
    authorityEntry?.measurementContract === "benchmarks/outdoors-now-growth-system.json" &&
    /54-page/.test(authorityEntry?.next || "") &&
    /28-day/.test(authorityEntry?.next || ""),
  15,
);

check(
  "Tool registry carries the attributed measurement contract",
  registryEntry?.searchTreatment?.status === "active-measurement-window" &&
    registryEntry?.searchTreatment?.launchPages === 54 &&
    registryEntry?.searchTreatment?.measurementContract ===
      "https://michiganoutdoorsnow.chrisizworski.com/growth-manifest.json" &&
    registryEntry?.measurement?.decisionWindowDays === 28,
  10,
);

check(
  "Network action registers the growth loop without pretending it is measured yet",
  repair?.implementationRepo === "izworskic/michigan-outdoors-now" &&
    repair?.implementationPr === 40 &&
    ["ready-for-release", "released-measuring"].includes(repair?.status),
  10,
);

check(
  "Experiment ledger records the clean attributed baseline",
  experiment?.target?.completeWindowDays === 28 &&
    experiment?.target?.familyExpansionGate?.impressions === 250 &&
    experiment?.baseline?.product?.status === "none-before-attribution-release" &&
    ["ready-for-release", "running"].includes(experiment?.status),
  10,
);

check(
  "Chris entity and owned property graph remain aligned",
  contract.canonicalOwnership.creator === "https://chrisizworski.com/#person" &&
    ownedRoot?.creatorEntity === "https://chrisizworski.com/#person" &&
    Boolean(brandedSupport),
  5,
);

check(
  "Documentation keeps one cross-repo operating model",
  strategy.includes("Useful decisions and durable authority, not page-count growth.") &&
    doc.includes("The two repos should not create independent SEO strategies.") &&
    doc.includes("measure → diagnose → improve the canonical owner"),
  5,
);

const packageJson = JSON.parse(await read("package.json"));
check(
  "Outdoors Now growth benchmark is a full release gate",
  packageJson.scripts["benchmark:outdoors-now-growth"] ===
      "node scripts/benchmark-outdoors-now-growth-system.mjs" &&
    packageJson.scripts["verify:all"].includes("benchmark:outdoors-now-growth"),
  5,
);

console.log("\nOUTDOORS NOW GROWTH OPERATING SYSTEM");
console.log("=".repeat(72));
console.log(`Score: ${score}/100`);
console.log(`Launch: ${contract.tool.locationIntentPages} pages · ${contract.tool.families.length} families · ${contract.tool.originsCovered} origins`);
console.log(`Portfolio action: ${authorityEntry?.action || "missing"}`);
console.log(`Experiment status: ${experiment?.status || "missing"}`);
if (failures.length) {
  console.log("Failures:");
  for (const failure of failures) console.log(` - ${failure}`);
}

if (process.argv.includes("--check")) {
  if (score < 95 || failures.length) process.exitCode = 1;
  else console.log("benchmark:outdoors-now-growth PASS\n");
}
