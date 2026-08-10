#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const audit = JSON.parse(await readFile(path.join(root, "audit", "live", "manifest.json"), "utf8"));
const failures = [];
const intentionalChanges = new Set([


  // Aug 7 2026: the five Soo Locks photographs were AI generated. Replaced with real,
  // freely licensed photographs of the actual locks, each with visible attribution:
  // a panoramic aerial (CC BY 4.0), the MacArthur Lock (CC BY-SA 3.0), the 1,000-foot
  // Burns Harbor in the Poe Lock and freighters waiting above the locks (both public
  // domain, USACE), and the administration building (CC BY-SA 4.0).
  "/assets/soo-locks/hero.jpg",
  "/assets/soo-locks/lock-chamber.jpg",
  "/assets/soo-locks/freighter.jpg",
  "/assets/soo-locks/saltie.jpg",
  "/assets/soo-locks/observation-deck.jpg",
  // Aug 6 2026: entity integrity. The #person node carried three conflicting jobTitle
  // values under one @id ("Solutions Consultant", "Solutions Consultant at Prepared",
  // "Writer and Publisher"), which reads as one entity contradicting itself. Normalised
  // to the homepage canonical value. See benchmarks/entity-surface-baseline.json.
  "/chris-izworski-author/",
  "/chris-izworski-emergency-management/",
  // selected-tab fix and the seasonal map wash, Aug 5 2026. The selected tab and
  // chip states still carried the old theme colour in rgba form, which the hex
  // sweep missed, so the label vanished into its own pill.
  "/fall-color/",
  // light autumn palette, Aug 5 2026. The whole /fall-color/ section moved off the
  // near-black ground onto warm paper. Every page in the section is touched.
  "/fall-color/",
  "/fall-color/michigan-leaf-peeping-planner",
  "/fall-color/michigan-fall-color-drives",
  "/fall-color/when-do-leaves-peak-in-michigan",
  // palette repair, Aug 5 2026. The planner and the drives map were built with
  // flat white cards on the section's dark autumn ground. Both now use the same
  // tokens as the landing page and the field guides.
  "/fall-color/michigan-leaf-peeping-planner",
  "/fall-color/michigan-fall-color-drives",
  // leaf peeping planner, Aug 4 2026. New page plus a breadcrumb link to it from
  // every page in the fall color section.
  "/fall-color/",
  // fall color migration, Aug 4 2026. The property moved from
  // fallcolor.chrisizworski.com onto the hub at /fall-color/ with slugs preserved
  // 1:1. These pages carried links to the old subdomain and now point in-tree.
  "/",
  "/tools/",
  "/soo-locks/",
  "/northern-lights-michigan/",
  "/fall-color-northern-lights-michigan/",
  // query-gap pass, Aug 4 2026. Autocomplete shows the aurora page's demand is
  // dominated by "tonight time" and "this week", and the Soo demand splits into
  // visitor intent and "ships today / live cam" ship intent.
  "/northern-lights-michigan/",
  "/soo-locks/",
  "/great-lakes-freighter-tracking/",
  // ice section internal linking pass, Aug 4 2026. The Michigan Ice Report moved
  // onto the hub with exactly one inbound internal link (/tools/), which is thin
  // for a section that has to rank by December. These six add contextual links.
  "/",
  "/great-lakes/",
  "/great-lakes-buoys/",
  "/great-lakes-freighter-tracking/",
  "/saginaw-bay-ecology/",
  "/soo-locks/",
  // brand-entity + SERP-length pass, Aug 3 2026
  "/ai/",
  "/blog/",
  "/blog/ai-supporting-911-administrative-work/",
  "/case-studies/",
  "/chris-izworski-ai-911/",
  "/chris-izworski-bay-city-michigan/",
  "/chris-izworski-bay-city/",
  "/chris-izworski-emergency-management/",
  "/chris-izworski-mlive/",
  "/chris-izworski-news-coverage/",
  "/chris-izworski-prepared/",
  "/chris-izworski-public-records/",
  "/chris-izworski-publications/",
  "/chris-izworski-trout-fishing/",
  "/chris-izworski-trout-rivers/",
  "/chris-izworski/",
  "/citations/",
  "/companion-planting-zone-6a/",
  "/great-lakes-beaches/lake-michigan/",
  "/great-lakes-fish/",
  "/heirloom-variety-matchmaker/",
  "/media/",
  "/michigan-911-executive-director/",
  "/michigan-boat-launches/",
  "/michigan-boat-launches/lake-michigan/",
  "/michigan-boat-launches/saginaw-bay/",
  "/michigan-last-spring-freeze/",
  "/michigan-paddling/",
  "/michigan-paddling/manistee-river/",
  "/michigan-seed-libraries/",
  "/michigan-trout-streams/",
  "/press/",
  "/speaking/",
  "/start-here/",
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
  "/chris-izworski-freighter-view-farms/",
  "/michigan-gardening/",
  "/great-lakes-birding/",
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
  ["/au-sable-river/", "fa36c47fb8f61618e4f52f8db6ba56e6f3d630e178cc137499f00a6fc4dfef42"],
  ["/edmund-fitzgerald/", "a722575cbf373e9e66c874d48a61dafb089e19a79f2df5e261053940ec3f3f04"],
  ["/heirloom-seed-saving-guide/", "2e5d3c53110102a7f6784f3c7f6ac86b1f9be6840f297a515ead80111c1b6e87"],
  ["/michigan-paddling/pere-marquette/", "9f5d099de514fc829c4315ac3487500f8572761596ba797d66ca463d8df00ec2"],
  ["/sitemap-reputation.xml", "eb339d08e40191c4825feaf088a6bf0b02f67606431ab02d20315d8b505174c0"],
  ["/zone-6a-planting-calendar/", "3b34180a82558e2df887dc238ad31dc8d1995e465b3e5d81972ddec260414565"],
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

// Paths that legitimately have no source file: /api/ handlers, scripts Vercel injects at the edge
// (Web Analytics and Speed Insights), and feeds served by a rewrite rather than a static file.
// These appeared the first time the audit was re-crawled after the freshness fix; they are not
// drift, they are routes that were always dynamic.
const NO_SOURCE_FILE = [/^\/api\//, /^\/_vercel\//, /^\/fall-color\/rss\.xml$/];
const canonicalRecords = audit.records.filter(
  (record) => record.status === 200 && !record.search && record.snapshotPath
    && !NO_SOURCE_FILE.some((re) => re.test(record.pathname)),
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
// Shape, not a literal date: the value is derived and the agreement check above covers correctness.
if (!/<loc>https:\/\/chrisizworski\.com\/tools\/<\/loc>\s*<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap)) {
  failures.push("Tools sitemap entry is missing a lastmod");
}
// Every sitemap lastmod must equal the dateModified of the page it points at. This replaced a
// hardcoded map of about thirty route-to-date pairs that went stale on every legitimate edit and
// had to be hand-corrected each time. It caught a real bug before it was replaced: a page whose
// content changed while its sitemap entry did not. Both values are now derived from git by
// scripts/stamp-freshness.mjs, and this asserts they agree.
{
  const entries = [...sitemap.matchAll(
    /<loc>https:\/\/chrisizworski\.com\/([^<]*)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g,
  )];
  let mismatches = 0;
  for (const [, route, lastmod] of entries) {
    const pageFile = path.join(publicRoot, route, "index.html");
    let html;
    try { html = await readFile(pageFile, "utf8"); } catch { continue; }
    const stamp = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    if (!stamp) continue;
    if (stamp[1] !== lastmod) {
      mismatches += 1;
      if (mismatches <= 5) failures.push(`Sitemap lastmod ${lastmod} disagrees with dateModified ${stamp[1]} for /${route}`);
    }
  }
  if (mismatches > 5) failures.push(`...and ${mismatches - 5} more sitemap lastmod disagreements`);
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
// 9 since Aug 4 2026: the Michigan Ice Report card was added to the live grid.
if ((greatLakesHub.match(/data-featured-tool=/g) || []).length !== 9) {
  failures.push("Great Lakes hub does not contain exactly nine featured live tools");
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
const auroraApi = await readFile(path.join(root, "api", "aurora.js"), "utf8");
const auroraLib = await readFile(path.join(root, "lib", "aurora.js"), "utf8");
if (!aurora.includes("fetch('/api/aurora'") || !aurora.includes("NOAA feed unavailable")) {
  failures.push("Northern Lights is missing its same-origin NOAA request or visible fail-soft state");
}
if ((aurora.match(/<article[^>]+data-region-id=/g) || []).length !== 8 || !aurora.includes("Michigan aurora forecast by region tonight")) {
  failures.push("Northern Lights does not expose all eight crawlable Michigan regional answers");
}
if (!auroraApi.includes("Promise.allSettled") || !auroraApi.includes("stale-while-revalidate=900")) {
  failures.push("Aurora API is missing independent NOAA fallbacks or short CDN caching");
}
if (!auroraLib.includes("parseKpForecast") || !auroraLib.includes("parseOvation") || !auroraLib.includes("regionVerdict")) {
  failures.push("Aurora normalization does not preserve current NOAA formats or conditional regional verdicts");
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
if (!sooLocks.includes("tel:+19062021333") || sooLocks.includes("Soo-Locks-Schedule/")) {
  failures.push("Soo Locks is missing the current official schedule hotline or still links the obsolete USACE schedule path");
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
