#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cfg = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
const sitemap = await readFile(path.join(root, "public/sitemap.xml"), "utf8");

const expected = new Map(Object.entries({
  "/api/national-geocode": "https://national-outdoor-core.vercel.app/api/national-geocode",
  "/api/national-aurora": "https://national-aurora.vercel.app/api/national-aurora",
  "/api/national-rivers": "https://national-rivers.vercel.app/api/national-rivers",
  "/api/national-river-context": "https://national-rivers.vercel.app/api/national-river-context",
  "/api/national-frost": "https://national-frost.vercel.app/api/national-frost",
  "/api/national-fall-color": "https://national-fall-color.vercel.app/api/national-fall-color",
  "/api/national-fall-observations": "https://national-fall-color.vercel.app/api/national-fall-observations",
  "/api/national-coastal": "https://national-coastal-water.vercel.app/api/national-coastal",
  "/api/national-snow": "https://national-snowpack-melt.vercel.app/api/national-snow",
  "/api/national-white-christmas": "https://national-white-christmas.vercel.app/api/national-white-christmas",
  "/api/isle-royale": "https://isle-royale-outdoors.vercel.app/api/isle-royale",
  "/api/isle-royale-route-weather": "https://isle-royale-outdoors.vercel.app/api/isle-royale-route-weather",
  "/api/isle-royale-water-intelligence": "https://isle-royale-outdoors.vercel.app/api/isle-royale-water-intelligence",
  "/assets/national-tools.css": "https://national-outdoor-core.vercel.app/assets/national-tools.css",
  "/assets/national-tools.js": "https://national-outdoor-core.vercel.app/assets/national-tools.js",
  "/assets/national-dashboard.js": "https://national-outdoor-tools-hub.vercel.app/assets/national-dashboard.js",
  "/assets/national-hubs.js": "https://national-outdoor-tools-hub.vercel.app/assets/national-hubs.js",
  "/assets/national-planting-engine.js": "https://national-planting.vercel.app/assets/national-planting-engine.js",
  "/assets/white-christmas.css": "https://national-white-christmas.vercel.app/assets/white-christmas.css",
  "/assets/isle-royale-map.js": "https://isle-royale-outdoors.vercel.app/assets/isle-royale-map.js",
  "/assets/isle-royale-water-intelligence.js": "https://isle-royale-outdoors.vercel.app/assets/isle-royale-water-intelligence.js",
  "/data/national-usgs-streamflow-sites.json": "https://national-rivers.vercel.app/data/national-usgs-streamflow-sites.json",
  "/data/national-planting-crops.json": "https://national-planting.vercel.app/data/national-planting-crops.json",
  "/national-tools": "https://national-outdoor-tools-hub.vercel.app/national-tools/",
  "/national-tools/": "https://national-outdoor-tools-hub.vercel.app/national-tools/",
  "/national-tools/aurora": "https://national-aurora.vercel.app/national-tools/aurora/",
  "/national-tools/aurora/": "https://national-aurora.vercel.app/national-tools/aurora/",
  "/national-tools/rivers": "https://national-rivers.vercel.app/national-tools/rivers/",
  "/national-tools/rivers/": "https://national-rivers.vercel.app/national-tools/rivers/",
  "/national-tools/frost": "https://national-frost.vercel.app/national-tools/frost/",
  "/national-tools/frost/": "https://national-frost.vercel.app/national-tools/frost/",
  "/national-tools/planting": "https://national-planting.vercel.app/national-tools/planting/",
  "/national-tools/planting/": "https://national-planting.vercel.app/national-tools/planting/",
  "/national-tools/fall-color": "https://national-fall-color.vercel.app/national-tools/fall-color/",
  "/national-tools/fall-color/": "https://national-fall-color.vercel.app/national-tools/fall-color/",
  "/national-tools/coastal": "https://national-coastal-water.vercel.app/national-tools/coastal/",
  "/national-tools/coastal/": "https://national-coastal-water.vercel.app/national-tools/coastal/",
  "/national-tools/snow": "https://national-snowpack-melt.vercel.app/national-tools/snow/",
  "/national-tools/snow/": "https://national-snowpack-melt.vercel.app/national-tools/snow/",
  "/national-tools/white-christmas": "https://national-white-christmas.vercel.app/national-tools/white-christmas/",
  "/national-tools/white-christmas/": "https://national-white-christmas.vercel.app/national-tools/white-christmas/",
  "/white-christmas-probability-map": "https://national-white-christmas.vercel.app/white-christmas-probability-map/",
  "/white-christmas-probability-map/": "https://national-white-christmas.vercel.app/white-christmas-probability-map/",
  "/white-christmas-michigan": "https://national-white-christmas.vercel.app/white-christmas-michigan/",
  "/white-christmas-michigan/": "https://national-white-christmas.vercel.app/white-christmas-michigan/",
  "/isle-royale-map": "https://isle-royale-outdoors.vercel.app/isle-royale-map/",
  "/isle-royale-map/": "https://isle-royale-outdoors.vercel.app/isle-royale-map/",
  "/national-tools/aurora/:path*": "https://national-aurora.vercel.app/national-tools/aurora/:path*",
  "/national-tools/rivers/:path*": "https://national-rivers.vercel.app/national-tools/rivers/:path*",
  "/national-tools/frost/:path*": "https://national-frost.vercel.app/national-tools/frost/:path*",
  "/national-tools/planting/:path*": "https://national-planting.vercel.app/national-tools/planting/:path*",
  "/national-tools/fall-color/:path*": "https://national-fall-color.vercel.app/national-tools/fall-color/:path*",
  "/national-tools/coastal/:path*": "https://national-coastal-water.vercel.app/national-tools/coastal/:path*",
  "/national-tools/snow/:path*": "https://national-snowpack-melt.vercel.app/national-tools/snow/:path*",
  "/national-tools/white-christmas/:path*": "https://national-white-christmas.vercel.app/national-tools/white-christmas/:path*",
  "/white-christmas-probability-map/:path*": "https://national-white-christmas.vercel.app/white-christmas-probability-map/:path*",
  "/white-christmas-michigan/:path*": "https://national-white-christmas.vercel.app/white-christmas-michigan/:path*",
  "/isle-royale-map/:path*": "https://isle-royale-outdoors.vercel.app/isle-royale-map/:path*",
  "/national-tools/:path*": "https://national-outdoor-tools-hub.vercel.app/national-tools/:path*"
}));

const failures = [];
const rewrites = cfg.rewrites || [];
const bySource = new Map(rewrites.map(item => [item.source, item.destination]));
for (const [source, destination] of expected) {
  if (bySource.get(source) !== destination) {
    failures.push(`rewrite drift: ${source} -> ${bySource.get(source) || "missing"}; expected ${destination}`);
  }
}

const hubIndex = rewrites.findIndex(item => item.source === "/national-tools/:path*");
for (const source of [...expected.keys()].filter(x => x.startsWith("/national-tools/") && x !== "/national-tools/:path*")) {
  const i = rewrites.findIndex(item => item.source === source);
  if (i < 0 || hubIndex < 0 || i >= hubIndex) failures.push(`specific national route must precede hub catch-all: ${source}`);
}

const forbidden = [
  "api/national-aurora.js",
  "api/national-coastal.js",
  "api/national-fall-color.js",
  "api/national-fall-observations.js",
  "api/national-frost.js",
  "api/national-geocode.js",
  "api/national-river-context.js",
  "api/national-rivers.js",
  "api/national-snow.js",
  "api/national-white-christmas.js",
  "api/isle-royale.js",
  "api/isle-royale-route-weather.js",
  "api/isle-royale-water-intelligence.js",
  "lib/national-outdoor.js",
  "lib/isle-royale",
  "public/national-tools",
  "public/isle-royale-map",
  "public/white-christmas-probability-map",
  "public/white-christmas-michigan",
  "public/assets/national-tools.css",
  "public/assets/national-tools.js",
  "public/assets/national-dashboard.js",
  "public/assets/national-hubs.js",
  "public/assets/white-christmas.css",
  "public/assets/isle-royale-map.js",
  "public/assets/isle-royale-water-intelligence.js",
  "public/data/national-usgs-streamflow-sites.json",
  "public/data/national-planting-crops.json",
  "scripts/benchmark-national-outdoor-tools.mjs",
  "scripts/benchmark-national-search-hubs.mjs",
  "scripts/benchmark-isle-royale-map.mjs",
  "scripts/validate-national-production.mjs",
  "benchmarks/national-outdoor-tools.json",
  "benchmarks/national-search-hubs.json",
  "benchmarks/national-source-lifecycle.json",
  "benchmarks/national-location-admission.json",
  "benchmarks/national-intelligence-candidates-2026-09-02.json",
  "benchmarks/isle-royale-map.json",
  "docs/NATIONAL_OUTDOOR_TOOLS_MASTER_PROMPT.md",
  "docs/isle-royale-map-master-prompt.md",
  "docs/isle-royale-map-plan.md",
  ".github/workflows/isle-royale-context-data.yml",
  ".github/workflows/isle-royale-deep-data.yml"
];

for (const rel of forbidden) {
  try {
    await access(path.join(root, rel));
    failures.push(`extracted implementation returned to monolith: ${rel}`);
  } catch {
    // Expected.
  }
}

for (const repo of [
  "national-outdoor-core",
  "national-outdoor-tools-hub",
  "national-aurora",
  "national-rivers",
  "national-frost",
  "national-planting",
  "national-fall-color",
  "national-coastal-water",
  "national-snowpack-melt",
  "national-white-christmas",
  "isle-royale-outdoors"
]) {
  if (!agents.includes(`izworskic/${repo}`)) failures.push(`AGENTS.md missing authoritative repo: ${repo}`);
}

for (const route of [
  "/national-tools/",
  "/national-tools/aurora/",
  "/national-tools/rivers/",
  "/national-tools/frost/",
  "/national-tools/planting/",
  "/national-tools/fall-color/",
  "/national-tools/coastal/",
  "/national-tools/snow/",
  "/national-tools/white-christmas/",
  "/white-christmas-probability-map/",
  "/white-christmas-michigan/",
  "/isle-royale-map/"
]) {
  if (!sitemap.includes(`<loc>https://chrisizworski.com${route}</loc>`)) failures.push(`sitemap lost canonical route: ${route}`);
}

for (const localFunction of ["api/national-rivers.js", "api/isle-royale-water-intelligence.js"]) {
  if (cfg.functions?.[localFunction]) failures.push(`vercel.json still configures extracted local function: ${localFunction}`);
}

const result = { status: failures.length ? "failed" : "passed", rewritesChecked: expected.size, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
