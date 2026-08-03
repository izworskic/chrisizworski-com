#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const audit = JSON.parse(await readFile(path.join(root, "audit", "live", "manifest.json"), "utf8"));
const failures = [];
const intentionalChanges = new Set([
  "/",
  "/tools/",
  "/great-lakes/",
  "/great-lakes-beaches/",
  "/guides/",
  "/great-lakes-buoys/",
  "/great-lakes-freighter-tracking/",
  "/great-lakes-gazette/",
  "/mackinac-bridge-live/",
  "/mackinac-bridge-driver-assistance/",
  "/mackinac-bridge-rv-trailer-wind-rules/",
  "/mackinac-bridge-tolls/",
  "/michigan-border-wait-times/",
  "/gordie-howe-bridge-wait-time/",
  "/ambassador-bridge-wait-time/",
  "/detroit-windsor-tunnel-wait-time/",
  "/blue-water-bridge-wait-time/",
  "/sault-ste-marie-border-wait-time/",
  "/lake-superior-circle-tour/",
  "/northern-lights-michigan/",
  "/soo-locks/",
  "/when-to-plant-tomatoes-michigan/",
  "/michigan-frost-dates/",
  "/saginaw-bay-ecology/",
  "/connect/",
  "/projects/",
  "/sitemap.xml",
  "/image-sitemap.xml",
  "/llms.txt",
  "/robots.txt",
]);

// These files were already committed on main after the crawl manifest was captured.
// Pin their exact source hashes so the known drift passes without broadly exempting
// the routes from future parity checks.
const committedDriftHashes = new Map([
  ["/au-sable-river/", "99499a50cf3e4f276e4e6fcdde2def5a77be75130d44aa3873549836bf942098"],
  ["/edmund-fitzgerald/", "2152a6ecf6c9ef063f145629471c7d8e797f85c0afb0807fcb611101c056158c"],
  ["/heirloom-seed-saving-guide/", "cc9a0e6b16d134edb5f024985931a9260c18347f48b42ef30b8c832d8c5daaf4"],
  ["/michigan-paddling/pere-marquette/", "e742bf252a6f4f55c4600484c314269d3efbc1af51e7acee6f4d114a3fc84944"],
  ["/sitemap-reputation.xml", "f12f909b7fd67a864bb957e544a6901455924fa6452b815fcb6c191a9b7c6034"],
  ["/zone-6a-planting-calendar/", "6d3fd834dd15dd9e3098607ba88f75d0d2eec15e089f69259b3bb8e25c7d0580"],
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function publicPathFor(record) {
  const contentType = record.headers?.["content-type"] || "";
  if (record.pathname === "/") return path.join(publicRoot, "index.html");
  if (record.pathname.endsWith("/")) return path.join(publicRoot, record.pathname, "index.html");
  if (contentType.includes("text/html") && !path.extname(record.pathname)) {
    return path.join(publicRoot, `${record.pathname}.html`);
  }
  return path.join(publicRoot, record.pathname);
}

const canonicalRecords = audit.records.filter(
  (record) => record.status === 200 && !record.search && !record.pathname.startsWith("/api/") && record.snapshotPath,
);

for (const record of canonicalRecords) {
  const target = publicPathFor(record);
  try {
    const body = await readFile(target);
    if (intentionalChanges.has(record.pathname)) continue;
    if (committedDriftHashes.get(record.pathname) === sha256(body)) continue;
    const expectedHash = record.headers?.["content-type"]?.includes("text/html")
      ? record.fingerprint.cleanBodySha256
      : record.rawBodySha256;
    if (sha256(body) !== expectedHash) failures.push(`${record.pathname}: body differs from the clean live snapshot`);
  } catch {
    failures.push(`${record.pathname}: missing source file ${path.relative(root, target)}`);
  }
}

const htmlFiles = canonicalRecords.filter((record) => record.headers?.["content-type"]?.includes("text/html"));
let validJsonLdBlocks = 0;
let beaconReferences = 0;
let brokenLegacyLinks = 0;
for (const record of htmlFiles) {
  const html = await readFile(publicPathFor(record), "utf8");
  beaconReferences += (html.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) || []).length;
  brokenLegacyLinks += (html.match(/href=["'](?:https:\/\/chrisizworski\.com)?\/(?:news-coverage|prepared|save-our-shoreline)\/?["']/g) || []).length;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
      validJsonLdBlocks += 1;
    } catch (error) {
      failures.push(`${record.pathname}: invalid JSON-LD (${error.message})`);
    }
  }
}

if (beaconReferences !== 0) failures.push(`Cloudflare beacon was copied ${beaconReferences} time(s)`);
if (brokenLegacyLinks !== 0) failures.push(`${brokenLegacyLinks} internal link(s) still point to known 404 URLs`);

const toolsHtml = await readFile(path.join(publicRoot, "tools", "index.html"), "utf8");
const toolLinkCount = (toolsHtml.match(/https:\/\/michiganoutdoorsnow\.chrisizworski\.com/g) || []).length;
if (toolLinkCount < 2) failures.push("Michigan Outdoors Now is missing from either visible Tools content or structured data");
if (!toolsHtml.includes("Built by Chris Izworski")) failures.push("The new Tools card is missing Chris Izworski attribution");
const toolsJsonLdMatch = toolsHtml.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
const toolsJsonLd = toolsJsonLdMatch ? JSON.parse(toolsJsonLdMatch[1]) : null;
const toolsItemList = toolsJsonLd?.["@graph"]?.find((entry) => entry["@type"] === "ItemList");
if (toolsItemList?.numberOfItems !== 36 || toolsItemList?.itemListElement?.length !== 36) {
  failures.push("Tools ItemList does not contain exactly 36 entries");
}
if (!toolsHtml.includes("Free Michigan and Great Lakes Tools") || !toolsHtml.includes("Start with the live tools")) {
  failures.push("Tools discovery title or featured-tools section is missing");
}
if ((toolsHtml.match(/data-featured-tool=/g) || []).length !== 9 || (toolsHtml.match(/class="tool-cta"/g) || []).length !== 9) {
  failures.push("Tools page does not contain exactly nine featured tool cards and calls to action");
}
if ((toolsHtml.match(/data-track-cluster=/g) || []).length < 5) {
  failures.push("Tools page is missing category jump links");
}

const sitemap = await readFile(path.join(publicRoot, "sitemap.xml"), "utf8");
if (!/<loc>https:\/\/chrisizworski\.com\/tools\/<\/loc>\s*<lastmod>2026-07-28<\/lastmod>/.test(sitemap)) {
  failures.push("Tools sitemap last-modified date was not updated");
}
for (const [route, lastmod] of Object.entries({
  "": "2026-07-28",
  "great-lakes/": "2026-07-28",
  "mackinac-bridge-live/": "2026-07-28",
  "mackinac-bridge-driver-assistance/": "2026-07-27",
  "mackinac-bridge-rv-trailer-wind-rules/": "2026-07-27",
  "mackinac-bridge-tolls/": "2026-07-27",
  "soo-locks/": "2026-08-03",
  "northern-lights-michigan/": "2026-08-03",
  "great-lakes-buoys/": "2026-07-20",
  "great-lakes-beaches/": "2026-07-31",
  "lake-superior-circle-tour/": "2026-07-28",
  "michigan-border-wait-times/": "2026-07-28",
  "gordie-howe-bridge-wait-time/": "2026-07-28",
  "ambassador-bridge-wait-time/": "2026-07-28",
  "detroit-windsor-tunnel-wait-time/": "2026-07-28",
  "blue-water-bridge-wait-time/": "2026-07-28",
  "sault-ste-marie-border-wait-time/": "2026-07-28",
})) {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<loc>https:\\/\\/chrisizworski\\.com\\/${escapedRoute}<\\/loc>\\s*<lastmod>${lastmod}<\\/lastmod>`);
  if (!pattern.test(sitemap)) failures.push(`Sitemap last-modified date is stale for /${route}`);
}

const discoveryPages = [
  "index.html",
  "tools/index.html",
  "great-lakes/index.html",
  "soo-locks/index.html",
  "northern-lights-michigan/index.html",
  "great-lakes-buoys/index.html",
  "great-lakes-gazette/index.html",
  "great-lakes-freighter-tracking/index.html",
  "great-lakes-beaches/index.html",
  "mackinac-bridge-live/index.html",
  "mackinac-bridge-driver-assistance/index.html",
  "mackinac-bridge-rv-trailer-wind-rules/index.html",
  "mackinac-bridge-tolls/index.html",
  "michigan-border-wait-times/index.html",
  "gordie-howe-bridge-wait-time/index.html",
  "ambassador-bridge-wait-time/index.html",
  "detroit-windsor-tunnel-wait-time/index.html",
  "blue-water-bridge-wait-time/index.html",
  "sault-ste-marie-border-wait-time/index.html",
];
for (const relativePath of discoveryPages) {
  const html = await readFile(path.join(publicRoot, relativePath), "utf8");
  if (!html.includes('/_vercel/insights/script.js')) failures.push(`${relativePath}: Web Analytics script is missing`);
  if (!html.includes('/_vercel/speed-insights/script.js')) failures.push(`${relativePath}: Speed Insights script is missing`);
}

const greatLakesHub = await readFile(path.join(publicRoot, "great-lakes", "index.html"), "utf8");
if ((greatLakesHub.match(/data-featured-tool=/g) || []).length !== 8) {
  failures.push("Great Lakes hub does not contain exactly eight featured live tools");
}
const historySection = greatLakesHub.match(/<h2 class="sh">History and Heritage<\/h2>([\s\S]*?)<h2 class="sh">/)?.[1] || "";
if (/\/(?:soo-locks|northern-lights-michigan|great-lakes-buoys)\//.test(historySection)) {
  failures.push("A live Great Lakes tool remains misclassified under History and Heritage");
}

const borderRoutes = [
  "michigan-border-wait-times",
  "gordie-howe-bridge-wait-time",
  "ambassador-bridge-wait-time",
  "detroit-windsor-tunnel-wait-time",
  "blue-water-bridge-wait-time",
  "sault-ste-marie-border-wait-time",
];
for (const route of borderRoutes) {
  const html = await readFile(path.join(publicRoot, route, "index.html"), "utf8");
  if (!html.includes(`<link rel="canonical" href="https://chrisizworski.com/${route}/">`)) {
    failures.push(`${route}: canonical URL is missing or incorrect`);
  }
  if (!html.includes("/assets/michigan-border-crossings.js")) {
    failures.push(`${route}: shared live border client is missing`);
  }
  if (!sitemap.includes(`https://chrisizworski.com/${route}/`)) {
    failures.push(`${route}: sitemap entry is missing`);
  }
}
const borderMain = await readFile(path.join(publicRoot, "michigan-border-wait-times", "index.html"), "utf8");
if ((borderMain.match(/data-crossing-result=/g) || []).length !== 3) {
  failures.push("Michigan border tool does not contain all three Detroit comparison cards");
}
if (!borderMain.includes('data-corridor-card="blue-water"') || !borderMain.includes('data-corridor-card="sault-ste-marie"')) {
  failures.push("Michigan border tool is missing Blue Water or the Upper Peninsula crossing");
}
if ((borderMain.match(/data-camera="/g) || []).length !== 6) {
  failures.push("Michigan border tool does not expose all six fail-soft camera choices");
}
const borderClient = await readFile(path.join(publicRoot, "assets", "michigan-border-crossings.js"), "utf8");
if (/511on\.ca\/map\/Cctv|wtbwb\.ca\/approach/.test(borderClient)) {
  failures.push("Michigan border client bypasses the same-origin camera proxy");
}

const circleTour = await readFile(path.join(publicRoot, "lake-superior-circle-tour", "index.html"), "utf8");
if (!circleTour.includes("datum=LWD") || !circleTour.includes("ft above LWD at Duluth")) {
  failures.push("Lake Superior Circle Tour is missing the valid NOAA LWD water-level datum");
}
if (circleTour.includes("datum=IGLD85")) failures.push("Lake Superior Circle Tour still requests NOAA's invalid IGLD85 datum");

const aurora = await readFile(path.join(publicRoot, "northern-lights-michigan", "index.html"), "utf8");
if (!aurora.includes("if (kpRes.status !== 'fulfilled') throw new Error('NOAA Kp forecast unavailable')")) {
  failures.push("Northern Lights does not leave its loading state when the primary NOAA forecast is unavailable");
}
if (!aurora.includes("normalizeNoaaRows") || !aurora.includes("['kp','Kp']") || aurora.includes("const max72 = rows.slice(0,24)")) {
  failures.push("Northern Lights does not support NOAA's current object response or current 72-hour forecast window");
}
if (!aurora.includes("temporarily unavailable")) {
  failures.push("Northern Lights can leave optional solar-wind cards stuck in a loading state");
}

const buoys = await readFile(path.join(publicRoot, "great-lakes-buoys", "index.html"), "utf8");
if (/115 NOAA|All 115 Stations|all 115 stations/i.test(buoys)) {
  failures.push("Great Lakes Buoy Dashboard still publishes the stale 115-station claim");
}
if (!buoys.includes("All Reporting Great Lakes Stations")) {
  failures.push("Great Lakes Buoy Dashboard is missing its count-safe reporting-stations heading");
}

const sooLocks = await readFile(path.join(publicRoot, "soo-locks", "index.html"), "utf8");
if (/<iframe[^>]+marinetraffic/i.test(sooLocks)) {
  failures.push("Soo Locks still contains the refused MarineTraffic iframe");
}
if (!sooLocks.includes("https://ais.boatnerd.com/passage/port/soo-locks")) {
  failures.push("Soo Locks is missing the verified BoatNerd passage-list fallback");
}
if (!sooLocks.includes("https://embed.myshiptracking.com/embed?myst") || !sooLocks.includes("lat=46.5036") || !sooLocks.includes("lng=-84.36")) {
  failures.push("Soo Locks is missing the official no-key live map centered on the lock complex");
}
if (/AISSTREAM_API_KEY|\/api\/soo-vessels|leaflet@1\.9\.4/.test(sooLocks)) {
  failures.push("Soo Locks still depends on the retired keyed AIS implementation");
}

const gazette = await readFile(path.join(publicRoot, "great-lakes-gazette", "index.html"), "utf8");
if (!gazette.includes("https://gazette.chrisizworski.com/api/latest")) {
  failures.push("Great Lakes Gazette does not use its public read-only latest-edition endpoint");
}
if (/authorization|\/api\/generate|great-lakes-gazette\.vercel\.app/i.test(gazette)) {
  failures.push("Great Lakes Gazette still exposes a protected endpoint, authorization header, or legacy deployment URL");
}

const projects = await readFile(path.join(publicRoot, "projects", "index.html"), "utf8");
if (!projects.includes("gazette.chrisizworski.com") || projects.includes("great-lakes-gazette.vercel.app")) {
  failures.push("Projects page still identifies the Gazette by its legacy deployment hostname");
}

for (const forbidden of ["news-coverage", "prepared", "save-our-shoreline"]) {
  try {
    await access(path.join(publicRoot, forbidden, "index.html"));
    failures.push(`Known 404 path /${forbidden}/ was accidentally converted into a static 200 page`);
  } catch {
    // Expected: these paths are handled only by explicit redirects.
  }
}

const summary = {
  status: failures.length === 0 ? "passed" : "failed",
  sourceFilesChecked: canonicalRecords.length,
  htmlRoutesChecked: htmlFiles.length,
  validJsonLdBlocks,
  intentionalContentChanges: [...intentionalChanges],
  failures,
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
