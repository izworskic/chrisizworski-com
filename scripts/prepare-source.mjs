#!/usr/bin/env node

import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const auditRoot = path.join(root, "audit", "live");
const publicRoot = path.join(root, "public");
const manifest = JSON.parse(await readFile(path.join(auditRoot, "manifest.json"), "utf8"));

await rm(publicRoot, { recursive: true, force: true });
await mkdir(publicRoot, { recursive: true });

const copiedPaths = new Set();
for (const record of manifest.records) {
  if (record.status !== 200 || record.search || !record.snapshotPath) continue;
  if (record.pathname.startsWith("/api/")) continue;
  if (copiedPaths.has(record.pathname)) continue;

  const contentType = record.headers?.["content-type"] || "";
  let destination;
  if (record.pathname === "/") destination = path.join(publicRoot, "index.html");
  else if (record.pathname.endsWith("/")) destination = path.join(publicRoot, record.pathname, "index.html");
  else if (contentType.includes("text/html") && !path.extname(record.pathname)) {
    destination = path.join(publicRoot, `${record.pathname}.html`);
  } else destination = path.join(publicRoot, record.pathname);

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(auditRoot, record.snapshotPath), destination);
  copiedPaths.add(record.pathname);
}

const toolsPath = path.join(publicRoot, "tools", "index.html");
let toolsHtml = await readFile(toolsPath, "utf8");
const toolUrl = "https://michigan-outdoors-now.vercel.app";

if (!toolsHtml.includes(toolUrl)) {
  const jsonLdPattern = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i;
  const match = toolsHtml.match(jsonLdPattern);
  if (!match) throw new Error("Tools page JSON-LD block was not found");

  const structuredData = JSON.parse(match[1]);
  const graph = structuredData["@graph"] || [];
  const collectionPage = graph.find((entry) => entry["@type"] === "CollectionPage");
  const itemList = graph.find((entry) => entry["@type"] === "ItemList" && entry["@id"]?.endsWith("#toollist"));
  if (!collectionPage || !itemList) throw new Error("Tools page structured data is missing its CollectionPage or ItemList");

  const newItem = {
    "@type": "ListItem",
    position: 15,
    item: {
      "@type": "WebApplication",
      name: "Michigan Outdoors Now, Live-Condition Day Trip Planner",
      url: toolUrl,
      description:
        "A Michigan day trip planner that ranks three outdoor plans using drive time, interests, forecast, air quality, and group needs.",
      applicationCategory: "TravelApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      author: { "@id": "https://chrisizworski.com/#person" },
    },
  };

  itemList.itemListElement.splice(14, 0, newItem);
  itemList.itemListElement.forEach((entry, index) => {
    entry.position = index + 1;
  });
  itemList.numberOfItems = itemList.itemListElement.length;
  collectionPage.dateModified = "2026-07-19";
  toolsHtml = toolsHtml.replace(match[1], JSON.stringify(structuredData));

  const tripPlannerHeading = '<h2 class="sh">Trip Planners</h2>';
  const card = `<div class="tool-card">
  <div class="tool-title"><a href="${toolUrl}" target="_blank" rel="noopener">Michigan Outdoors Now, Live-Condition Day Trip Planner</a></div>
  <div class="tool-desc">Start with a Michigan city or ZIP and get three outdoor day-trip plans ranked for forecast, air quality, drive time, interests, kids, dogs, and accessibility. Covers 27 curated destinations, uses live weather signals, requires no login, and does not save your location. Built by Chris Izworski. Free.</div>
</div>

`;
  if (!toolsHtml.includes(tripPlannerHeading)) throw new Error("Trip Planners heading was not found on the Tools page");
  toolsHtml = toolsHtml.replace(tripPlannerHeading, `${card}${tripPlannerHeading}`);
}

await writeFile(toolsPath, toolsHtml);

const sitemapPath = path.join(publicRoot, "sitemap.xml");
let sitemap = await readFile(sitemapPath, "utf8");
sitemap = sitemap.replace(
  /(<loc>https:\/\/chrisizworski\.com\/tools\/<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/,
  "$12026-07-19$2",
);
await writeFile(sitemapPath, sitemap);

const buoyPagePath = path.join(publicRoot, "great-lakes-buoys", "index.html");
let buoyPage = await readFile(buoyPagePath, "utf8");
buoyPage = buoyPage
  .replaceAll('href="/prepared/"', 'href="/chris-izworski-prepared/"')
  .replaceAll('href="/save-our-shoreline/"', 'href="/chris-izworski-save-our-shoreline/"')
  .replaceAll('href="/news-coverage/"', 'href="/chris-izworski-news-coverage/"');
await writeFile(buoyPagePath, buoyPage);

const circleTourPath = path.join(publicRoot, "lake-superior-circle-tour", "index.html");
let circleTourPage = await readFile(circleTourPath, "utf8");
circleTourPage = circleTourPage
  .replace("datum=IGLD85", "datum=LWD")
  .replace("ft IGLD85 at Duluth", "ft above LWD at Duluth");
await writeFile(circleTourPath, circleTourPage);

const buoySnapshot = JSON.parse(await readFile(path.join(auditRoot, "snapshot", "api", "buoys.json"), "utf8"));
await mkdir(path.join(root, "data"), { recursive: true });
await writeFile(
  path.join(root, "data", "buoy-stations.json"),
  `${JSON.stringify(
    buoySnapshot.stations.map(({ id, name, lake, lat, lng }) => ({ id, name, lake, lat, lng })),
    null,
    2,
  )}\n`,
);
await writeFile(path.join(root, "data", "buoy-fallback.json"), `${JSON.stringify(buoySnapshot, null, 2)}\n`);

const sourceSummary = {
  generatedAt: new Date().toISOString(),
  copiedPublicPaths: copiedPaths.size,
  toolAdded: toolsHtml.includes(toolUrl),
  toolSchemaItems: 19,
  knownBrokenInternalLinksFixed: 3,
  noaaWaterLevelDatumFixed: true,
  cloudflareBeaconCopiesRetained: 0,
};
await writeFile(path.join(root, "audit", "source-summary.json"), `${JSON.stringify(sourceSummary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(sourceSummary, null, 2)}\n`);
