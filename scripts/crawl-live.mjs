#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceOrigin = new URL(process.env.SOURCE_ORIGIN || "https://chrisizworski.com");
const outputRoot = path.resolve(process.env.AUDIT_OUTPUT || "audit/live");
const maxUrls = Number.parseInt(process.env.MAX_URLS || "500", 10);
const maxBodyBytes = Number.parseInt(process.env.MAX_BODY_BYTES || String(20 * 1024 * 1024), 10);
const userAgent = "ChrisIzworskiSiteMigrationAudit/1.0 (+https://chrisizworski.com/)";

const seedPaths = [
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-reputation.xml",
  "/image-sitemap.xml",
  "/llms.txt",
  "/sources.json",
  "/favicon.ico",
  "/og-image.png",
  "/__migration-audit-not-found__",
];

const queue = [];
const queued = new Set();
const fetched = new Map();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeUrl(candidate, base = sourceOrigin) {
  try {
    const url = new URL(candidate, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (url.hostname !== sourceOrigin.hostname) return null;
    url.protocol = sourceOrigin.protocol;
    url.port = sourceOrigin.port;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function enqueue(candidate, base) {
  const url = normalizeUrl(candidate, base);
  if (!url) return;
  const key = url.href;
  if (queued.has(key) || fetched.has(key)) return;
  queued.add(key);
  queue.push(url);
}

function safeSnapshotPath(url, contentType) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  if (pathname === "") pathname = "/index.html";

  const finalSegment = pathname.split("/").pop() || "index";
  if (!finalSegment.includes(".")) {
    if (contentType.includes("text/html")) pathname += ".html";
    else if (contentType.includes("application/json")) pathname += ".json";
    else if (contentType.includes("xml")) pathname += ".xml";
    else if (contentType.includes("text/plain")) pathname += ".txt";
    else pathname += ".bin";
  }

  const safePath = pathname
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .join("/");
  const querySuffix = url.search ? `__q_${sha256(url.search).slice(0, 12)}` : "";
  return path.join(outputRoot, "snapshot", `${safePath}${querySuffix}`);
}

function stripCloudflareBeacon(html) {
  return html.replace(
    /<script\b[^>]*src=["']https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js[^>]*><\/script>\s*/gi,
    "",
  );
}

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function firstMatch(text, expression) {
  const match = expression.exec(text);
  return match ? decodeEntities(match[1].trim()) : null;
}

function allMatches(text, expression) {
  const values = [];
  let match;
  while ((match = expression.exec(text)) !== null) values.push(decodeEntities(match[1].trim()));
  return values;
}

function htmlFingerprint(html, url) {
  const cleanHtml = stripCloudflareBeacon(html);
  const jsonLd = allMatches(cleanHtml, /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const links = allMatches(cleanHtml, /<(?:a|link)\b[^>]*\bhref=["']([^"']+)["']/gi);
  const assets = [
    ...allMatches(cleanHtml, /<(?:script|img|source|iframe)\b[^>]*\bsrc=["']([^"']+)["']/gi),
    ...allMatches(cleanHtml, /\bsrcset=["']([^"']+)["']/gi).flatMap((value) =>
      value.split(",").map((part) => part.trim().split(/\s+/)[0]),
    ),
    ...allMatches(cleanHtml, /url\(\s*["']?([^"')]+)["']?\s*\)/gi),
  ];
  const formActions = allMatches(cleanHtml, /<form\b[^>]*\baction=["']([^"']+)["']/gi);
  const fetchTargets = [
    ...allMatches(cleanHtml, /\bfetch\(\s*["']([^"']+)["']/gi),
    ...allMatches(cleanHtml, /\b(?:axios\.(?:get|head)|XMLHttpRequest\s*\(.*?\.open)\s*\(\s*["'](?:GET|HEAD)?["']?\s*,?\s*["']([^"']+)["']/gi),
  ];

  for (const candidate of [...links, ...assets, ...fetchTargets]) enqueue(candidate, url);

  return {
    title: firstMatch(cleanHtml, /<title\b[^>]*>([\s\S]*?)<\/title>/i),
    description: firstMatch(
      cleanHtml,
      /<meta\b(?=[^>]*\bname=["']description["'])[^>]*\bcontent=["']([^"']*)["'][^>]*>/i,
    ),
    canonical: firstMatch(
      cleanHtml,
      /<link\b(?=[^>]*\brel=["'][^"']*canonical[^"']*["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i,
    ),
    robots: firstMatch(
      cleanHtml,
      /<meta\b(?=[^>]*\bname=["']robots["'])[^>]*\bcontent=["']([^"']*)["'][^>]*>/i,
    ),
    h1: firstMatch(cleanHtml, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null,
    jsonLdCount: jsonLd.length,
    jsonLdHashes: jsonLd.map((value) => sha256(value.replace(/\s+/g, " ").trim())),
    internalLinks: links.map((candidate) => normalizeUrl(candidate, url)?.href).filter(Boolean),
    sameOriginAssets: assets.map((candidate) => normalizeUrl(candidate, url)?.href).filter(Boolean),
    fetchTargets,
    formActions,
    cleanBodySha256: sha256(cleanHtml),
    cloudflareBeaconCopies: (html.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) || []).length,
  };
}

function textFingerprint(text, contentType, url) {
  if (contentType.includes("text/html")) return htmlFingerprint(text, url);

  if (contentType.includes("xml")) {
    const locations = allMatches(text, /<loc>([\s\S]*?)<\/loc>/gi);
    for (const candidate of locations) enqueue(candidate, url);
    return { locations };
  }

  if (contentType.includes("text/css") || contentType.includes("javascript")) {
    const referenced = [
      ...allMatches(text, /url\(\s*["']?([^"')]+)["']?\s*\)/gi),
      ...allMatches(text, /\bfetch\(\s*["']([^"']+)["']/gi),
      ...allMatches(text, /\bimport\s*(?:\(|)["']([^"']+)["']/gi),
    ];
    for (const candidate of referenced) enqueue(candidate, url);
    return { referenced };
  }

  return {};
}

function selectedHeaders(headers) {
  const names = [
    "cache-control",
    "content-disposition",
    "content-encoding",
    "content-length",
    "content-type",
    "etag",
    "last-modified",
    "location",
    "referrer-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "x-robots-tag",
  ];
  return Object.fromEntries(names.map((name) => [name, headers.get(name)]).filter(([, value]) => value !== null));
}

async function fetchOne(url) {
  const response = await fetch(url, {
    headers: { accept: "*/*", "user-agent": userAgent },
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const isText = /(?:text\/|json|javascript|xml|svg)/i.test(contentType);
  const text = isText ? buffer.toString("utf8") : null;
  const redirectTarget = response.headers.get("location");
  if (redirectTarget) enqueue(redirectTarget, url);

  let snapshotPath = null;
  if (buffer.length <= maxBodyBytes) {
    snapshotPath = safeSnapshotPath(url, contentType);
    await mkdir(path.dirname(snapshotPath), { recursive: true });
    const snapshotBody = contentType.includes("text/html") && text !== null ? stripCloudflareBeacon(text) : buffer;
    await writeFile(snapshotPath, snapshotBody);
  }

  return {
    url: url.href,
    pathname: url.pathname,
    search: url.search,
    status: response.status,
    headers: selectedHeaders(response.headers),
    rawBodyBytes: buffer.length,
    rawBodySha256: sha256(buffer),
    snapshotPath: snapshotPath ? path.relative(outputRoot, snapshotPath) : null,
    fingerprint: text === null ? {} : textFingerprint(text, contentType, url),
  };
}

for (const seed of seedPaths) enqueue(seed, sourceOrigin);

while (queue.length > 0 && fetched.size < maxUrls) {
  const batch = queue.splice(0, 8);
  for (const url of batch) queued.delete(url.href);
  const results = await Promise.all(
    batch.map(async (url) => {
      try {
        return await fetchOne(url);
      } catch (error) {
        return { url: url.href, pathname: url.pathname, search: url.search, error: String(error) };
      }
    }),
  );
  for (const result of results) fetched.set(result.url, result);
}

const records = [...fetched.values()].sort((a, b) => a.url.localeCompare(b.url));
const summary = {
  sourceOrigin: sourceOrigin.href,
  generatedAt: new Date().toISOString(),
  fetchedCount: records.length,
  queuedButNotFetchedCount: queue.length,
  statuses: records.reduce((counts, record) => {
    const key = record.error ? "error" : String(record.status);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}),
  htmlPages: records.filter((record) => record.headers?.["content-type"]?.includes("text/html")).length,
  redirects: records.filter((record) => record.status >= 300 && record.status < 400).length,
  errors: records.filter((record) => record.error).length,
};

await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify({ summary, records }, null, 2)}\n`);
await writeFile(path.join(outputRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
