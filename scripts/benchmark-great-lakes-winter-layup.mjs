#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

const spec = JSON.parse(read("benchmarks/great-lakes-winter-layup-benchmark.json"));
const html = read("public/great-lakes-freighter-winter-layup/index.html");
const css = read("public/assets/freighter-winter-home.css");
const js = read("public/assets/freighter-layup.js");
const registry = JSON.parse(read("public/assets/freighter-layup-registry.json"));
const bios = JSON.parse(read("public/assets/freighter-vessel-biographies.json"));

const checks = [];
function score(name, weight, passed, detail) {
  checks.push({ name, weight, earned: passed ? weight : 0, passed, detail });
}

// 1. 100% Vessel Photo Coverage in Registry & Biographies (25 pts)
const s25 = registry.seasons.find(s => s.id === "2024-25");
const s26 = registry.seasons.find(s => s.id === "2025-26");
const s25Photos = (s25?.records || []).filter(r => r.photo?.file && r.photo?.page?.includes("commons.wikimedia.org")).length;
const s26Photos = (s26?.records || []).filter(r => r.photo?.file && r.photo?.page?.includes("commons.wikimedia.org")).length;
const bioPhotos = bios.profiles.filter(p => {
  const pageHtml = read(`public/great-lakes-freighter-winter-layup/vessels/${p.id}/index.html`);
  return pageHtml.includes('class="bio-photo"') && !pageHtml.includes('class="bio-no-photo"');
}).length;

score(
  "vesselPhotoCoverage",
  25,
  s25Photos === spec.dimensions.vesselPhotoCoverage.required2024_25VesselPhotos &&
    s26Photos === spec.dimensions.vesselPhotoCoverage.required2025_26VesselPhotos &&
    bioPhotos === spec.dimensions.vesselPhotoCoverage.requiredBiographyProfilesWithPhotos,
  `2024-25 photos: ${s25Photos}/2, 2025-26 photos: ${s26Photos}/12, Biography pages with verified photo: ${bioPhotos}/6`
);

// 2. 100% Illustrated Breakout Cards on Home Page (20 pts)
const featureStoryImgs = (html.match(/<a class="feature-story"[\s\S]*?<img /g) || []).length;
const bioRelatedImgs = (html.match(/<a class="bio-related[\s\S]*?<img class="bio-related-thumb"/g) || []).length;
const storyCardImgs = (html.match(/<article class="story-card-illustrated"[\s\S]*?<img /g) || []).length;
const portGuideImgs = (html.match(/<article class="port-guide-card"[\s\S]*?<img /g) || []).length;

score(
  "illustratedBreakoutCards",
  20,
  featureStoryImgs === 3 && bioRelatedImgs === 3 && storyCardImgs === 3 && portGuideImgs === 8,
  `feature-story: ${featureStoryImgs}/3, bio-related: ${bioRelatedImgs}/3, story-grid: ${storyCardImgs}/3, port-guide: ${portGuideImgs}/8 (total 17/17 breakout photos)`
);

// 3. Automatic 4-Season Maritime Calendar Engine in America/Detroit (20 pts)
const hasSeasonEngine =
  html.includes('id="layup-season-engine"') &&
  spec.dimensions.seasonalMaritimeEngine.requiredPhases.every(
    p => html.includes(`data-layup-phase-btn="${p}"`) && html.includes(`data-layup-phase-panel="${p}"`)
  ) &&
  js.includes("function detectLayupSeasonPhase") &&
  js.includes("timeZone:'America/Detroit'") &&
  js.includes("initSeasonalMaritimeEngine()");

score(
  "seasonalMaritimeEngine",
  20,
  hasSeasonEngine,
  `4-phase America/Detroit calendar engine active (${spec.dimensions.seasonalMaritimeEngine.requiredPhases.join(", ")})`
);

// 4. 8-Port Winter Layup & Viewing Field Guide with Region Filtering & Roster Jump (15 pts)
const hasPortGuide =
  html.includes('id="layup-port-guide"') &&
  portGuideImgs === 8 &&
  spec.dimensions.portViewingFieldGuide.requiredRegions.every(r => html.includes(`data-port-filter="${r}"`)) &&
  js.includes("function initPortViewingGuide") &&
  css.includes(".layup-home .port-guide-grid");

score(
  "portViewingFieldGuide",
  15,
  hasPortGuide,
  `8 winter layup & lock hubs with public shore-viewing rules, region filters, and one-click roster filter buttons`
);

// 5. SEO Schema & Cluster Routing across Soo Locks, Freighter Central & Ship Watching (20 pts)
const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const ldGraph = ldMatch ? JSON.parse(ldMatch[1])["@graph"] || [] : [];
const ldTypes = new Set(ldGraph.map(n => n["@type"]));
const hasAllSchemas = spec.dimensions.seoSchemaAndClusterRouting.requiredSchemas.every(t => ldTypes.has(t));
const inboundCount = spec.dimensions.seoSchemaAndClusterRouting.requiredInboundClusterPages.filter(p =>
  read(p).includes("/great-lakes-freighter-winter-layup/")
).length;

score(
  "seoSchemaAndClusterRouting",
  20,
  hasAllSchemas &&
    inboundCount === spec.dimensions.seoSchemaAndClusterRouting.requiredInboundClusterPages.length &&
    html.includes('property="og:image" content="https://chrisizworski.com/assets/freighter-winter-hero.jpg"'),
  `JSON-LD types: ${[...ldTypes].join(", ")} | Inbound cluster pages linking to winter layup: ${inboundCount}/${spec.dimensions.seoSchemaAndClusterRouting.requiredInboundClusterPages.length}`
);

const total = checks.reduce((acc, c) => acc + c.earned, 0);
console.log("=== GREAT LAKES WINTER LAYUP BREAKTHROUGH BENCHMARK ===");
for (const c of checks) {
  console.log(`  [${c.passed ? "PASS" : "FAIL"}] ${c.name} (${c.earned}/${c.weight}): ${c.detail}`);
}
console.log(`TOTAL SCORE: ${total}/100 (Target: >= ${spec.targetScore})`);

if (process.argv.includes("--check") && total < spec.targetScore) {
  process.exit(1);
}
