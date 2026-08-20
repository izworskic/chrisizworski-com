#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const baseline = JSON.parse(await read("benchmarks/search-growth-engine-2026-08-15.json"));
const failures = [];
let score = 0;

function check(name, passed, points, detail = "") {
  if (passed) score += points;
  else failures.push(detail ? `${name}: ${detail}` : name);
}
function near(a, b, tolerance = 0.000001) { return Math.abs(a - b) <= tolerance; }

const current = baseline.current28Days;
check(
  "28-day Search Console baseline reconciles",
  current.days === 28 &&
    current.impressions === 27042 &&
    current.clicks === 407 &&
    near(current.ctr, current.clicks / current.impressions) &&
    near(current.dailyImpressions, current.impressions / current.days),
  10,
);

const clickHeadroom = baseline.pages.reduce(
  (sum, page) => sum + Math.max(0, Math.round(page.impressions * page.targetCtr) - page.clicks),
  0,
);
check(
  "Same-impression click headroom clears the execution threshold",
  clickHeadroom >= baseline.goals.sameImpressionIncrementalClickGoal,
  10,
  `${clickHeadroom} modeled clicks`,
);

const frozen = baseline.pages.filter((page) => page.state === "frozen-active-experiment");
check("Existing search experiments are explicitly frozen", frozen.length >= 5, 10, `${frozen.length} pages`);

const exactTitles = {
  "/northern-lights-michigan/": ["public/northern-lights-michigan/index.html", "Northern Lights Michigan Tonight: Aurora | Chris Izworski"],
  "/soo-locks/": ["public/soo-locks/index.html", "Soo Locks Schedule Today: Ships &amp; Map | Chris Izworski"],
  "/when-to-plant-tomatoes-michigan/": ["public/when-to-plant-tomatoes-michigan/index.html", "When to Plant Tomatoes in Michigan: 2026 Dates by Region"],
  "/michigan-frost-dates/": ["public/michigan-frost-dates/index.html", "Michigan Last Frost Dates by City: 2026 Planting Calendar"],
  "/great-lakes-freighter-tracking/": ["public/great-lakes-freighter-tracking/index.html", "Great Lakes Ship Tracker Live: AIS Map | Chris Izworski"],
};
let frozenTitles = 0;
for (const page of frozen) {
  const spec = exactTitles[page.path];
  if (!spec) continue;
  const html = await read(spec[0]);
  if (html.includes(`<title>${spec[1]}</title>`)) frozenTitles += 1;
}
check("Frozen treatments retain their exact titles", frozenTitles === frozen.length, 10, `${frozenTitles}/${frozen.length}`);

const weekend = await read("public/fall-color/this-weekend/index.html");
check(
  "Weekend intent page is query-led, canonical and crawlable",
  weekend.includes("<title>Michigan Fall Color This Weekend 2026 | Where to Go</title>") &&
    weekend.includes('<link rel="canonical" href="https://chrisizworski.com/fall-color/this-weekend/">') &&
    weekend.includes("Where are Michigan fall colors best this weekend?") &&
    weekend.includes('data-search-growth-query="michigan fall color this weekend"') &&
    !weekend.includes("noindex"),
  15,
);
check(
  "Weekend page uses the existing live fall data and fails soft",
  weekend.includes("/api/fall-color-conditions") &&
    weekend.includes("seasonal timing model") &&
    weekend.includes("Weather and camera inputs are not presented as a statewide leaf count"),
  10,
);
check(
  "Weekend page closes the existing fall planning loop",
  [
    "/fall-color/",
    "/fall-color/when-do-leaves-peak-in-michigan/",
    "/fall-color/michigan-fall-color-drives/",
    "/fall-color/michigan-leaf-peeping-planner/",
  ].every((href) => weekend.includes(`href="${href}"`)),
  5,
);
check(
  "Chris Izworski entity is defined on the new page",
  weekend.includes('"@id":"https://chrisizworski.com/#person"') &&
    weekend.includes('"name":"Chris Izworski"') &&
    weekend.includes("© 2026 Chris Izworski"),
  5,
);

const fallSitemap = await read("lib/fall-color/routes/sitemap.js");
const llms = await read("public/llms.txt");
const fieldCamera = await read("public/assets/field-camera.js");
check("Fall sitemap discovers the weekend decision page", fallSitemap.includes('base + "/this-weekend/"'), 5);
check(
  "AI discovery describes the fall decision flow",
  llms.includes("Michigan Fall Color This Weekend") && llms.includes("best region this weekend"),
  5,
);
check(
  "Live fall hub distributes the weekend decision page",
  fieldCamera.includes("/fall-color/this-weekend/") && fieldCamera.includes("data-search-growth-weekend"),
  5,
);

const docs = await read("docs/search-growth-engine-fall-2026.md");
check(
  "Execution plan commits goals, measurement and stop-loss rules",
  docs.includes("October 1, 2026") &&
    docs.includes("Do not reset active experiments") &&
    docs.includes("2,500") &&
    docs.includes("2.5%") &&
    docs.includes("Stop-loss"),
  5,
);

const packageJson = JSON.parse(await read("package.json"));
check(
  "Search growth benchmark is part of the full release gate",
  packageJson.scripts["benchmark:search-growth"] === "node scripts/benchmark-search-growth-engine.mjs" &&
    packageJson.scripts["verify:all"].includes("benchmark:search-growth"),
  5,
);

console.log("\nSEARCH GROWTH ENGINE BENCHMARK");
console.log("=".repeat(72));
console.log(`Score: ${score}/100`);
console.log(`28-day baseline: ${current.impressions.toLocaleString()} impressions · ${current.clicks} clicks · ${(current.ctr * 100).toFixed(2)}% CTR`);
console.log(`Same-impression modeled click headroom: +${clickHeadroom}`);
console.log(`Frozen active experiments protected: ${frozen.length}`);
if (failures.length) {
  console.log("Failures:");
  for (const failure of failures) console.log(` - ${failure}`);
}

if (process.argv.includes("--check")) {
  if (score < 95 || failures.length) process.exitCode = 1;
  else console.log("benchmark:search-growth PASS\n");
}
