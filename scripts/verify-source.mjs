#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const audit = JSON.parse(await readFile(path.join(root, "audit", "live", "manifest.json"), "utf8"));
const failures = [];
const intentionalChanges = new Set(["/tools/", "/great-lakes-buoys/", "/sitemap.xml"]);

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
const toolLinkCount = (toolsHtml.match(/https:\/\/michigan-outdoors-now\.vercel\.app/g) || []).length;
if (toolLinkCount < 2) failures.push("Michigan Outdoors Now is missing from either visible Tools content or structured data");
if (!toolsHtml.includes("Built by Chris Izworski")) failures.push("The new Tools card is missing Chris Izworski attribution");
const toolsJsonLdMatch = toolsHtml.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
const toolsJsonLd = toolsJsonLdMatch ? JSON.parse(toolsJsonLdMatch[1]) : null;
const toolsItemList = toolsJsonLd?.["@graph"]?.find((entry) => entry["@type"] === "ItemList");
if (toolsItemList?.numberOfItems !== 19 || toolsItemList?.itemListElement?.length !== 19) {
  failures.push("Tools ItemList does not contain exactly 19 entries");
}

const sitemap = await readFile(path.join(publicRoot, "sitemap.xml"), "utf8");
if (!/<loc>https:\/\/chrisizworski\.com\/tools\/<\/loc>\s*<lastmod>2026-07-19<\/lastmod>/.test(sitemap)) {
  failures.push("Tools sitemap last-modified date was not updated");
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
