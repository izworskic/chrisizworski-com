#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(root, "public");
const baseline = JSON.parse(
  await readFile(path.join(root, "benchmarks", "seo-engagement-baseline.json"), "utf8"),
);

const measuredPages = {
  home: "index.html",
  tools: "tools/index.html",
  greatLakes: "great-lakes/index.html",
  sooLocks: "soo-locks/index.html",
  northernLights: "northern-lights-michigan/index.html",
  buoys: "great-lakes-buoys/index.html",
  gazette: "great-lakes-gazette/index.html",
  freighterTracking: "great-lakes-freighter-tracking/index.html",
  beaches: "great-lakes-beaches/index.html",
};

const html = Object.fromEntries(
  await Promise.all(
    Object.entries(measuredPages).map(async ([key, file]) => [
      key,
      await readFile(path.join(publicRoot, file), "utf8"),
    ]),
  ),
);

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

function value(source, pattern) {
  return source.match(pattern)?.[1] || "";
}

function pageSummary(source) {
  const title = value(source, /<title>([\s\S]*?)<\/title>/i).replace(/&amp;/g, "&");
  const description =
    value(source, /<meta\s+name=["']description["']\s+content="([^"]*)"/i) ||
    value(source, /<meta\s+name=["']description["']\s+content='([^']*)'/i);
  return {
    title,
    titleCharacters: title.length,
    descriptionCharacters: description.length,
    canonical: value(source, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i),
    bytes: Buffer.byteLength(source),
  };
}

const combinedHubs = html.home + html.tools + html.greatLakes;
const historySection = value(
  html.greatLakes,
  /<h2 class="sh">History and Heritage<\/h2>([\s\S]*?)(?:<h2 class="sh">|<\/div>\s*<div class="footer">)/,
);

const current = {
  toolsListed: count(html.tools, /class="tool-card"/g),
  featuredToolCards: count(combinedHubs, /data-featured-tool=/g),
  explicitCallsToAction:
    count(combinedHubs, /class="tool-cta"/g) + count(combinedHubs, /class="all-tools-cta"/g),
  trackedToolLinks: count(combinedHubs, /data-track-tool=/g),
  toolCategoryJumpLinks: count(html.tools, /data-track-cluster=/g),
  liveToolsMisclassifiedUnderHistory: ["/soo-locks/", "/northern-lights-michigan/", "/great-lakes-buoys/"].filter(
    (href) => historySection.includes(`href="${href}"`),
  ).length,
  homeFeaturedToolLinks: count(html.home, /data-placement="home-featured"/g),
  webAnalyticsScriptOnMeasuredPages: Object.values(html).every((source) =>
    source.includes('/_vercel/insights/script.js'),
  ),
  speedInsightsScriptOnMeasuredPages: Object.values(html).every((source) =>
    source.includes('/_vercel/speed-insights/script.js'),
  ),
};

const expectedCanonicals = {
  home: "https://chrisizworski.com/",
  tools: "https://chrisizworski.com/tools/",
  greatLakes: "https://chrisizworski.com/great-lakes/",
  sooLocks: "https://chrisizworski.com/soo-locks/",
  northernLights: "https://chrisizworski.com/northern-lights-michigan/",
  buoys: "https://chrisizworski.com/great-lakes-buoys/",
  gazette: "https://chrisizworski.com/great-lakes-gazette/",
  freighterTracking: "https://chrisizworski.com/great-lakes-freighter-tracking/",
  beaches: "https://chrisizworski.com/great-lakes-beaches/",
};

const pages = Object.fromEntries(Object.entries(html).map(([key, source]) => [key, pageSummary(source)]));
const failures = [];

for (const [key, expected] of Object.entries(expectedCanonicals)) {
  if (pages[key].canonical !== expected) {
    failures.push(`${key}: canonical changed from ${expected} to ${pages[key].canonical || "missing"}`);
  }
  if (!pages[key].title.includes("Chris Izworski")) failures.push(`${key}: title is missing Chris Izworski attribution`);
  if (pages[key].titleCharacters > 60) failures.push(`${key}: title is likely to truncate at ${pages[key].titleCharacters} characters`);
  if (pages[key].descriptionCharacters < 120 || pages[key].descriptionCharacters > 160) {
    failures.push(`${key}: description is outside the 120-160 character benchmark at ${pages[key].descriptionCharacters}`);
  }
}

if (current.toolsListed !== baseline.structuralBaseline.toolsListed) {
  failures.push(`Tools list changed from ${baseline.structuralBaseline.toolsListed} entries to ${current.toolsListed}`);
}
if (current.featuredToolCards < 12) failures.push("Fewer than 12 featured tool cards are present across the hubs");
if (current.explicitCallsToAction < 13) failures.push("Fewer than 13 explicit tool calls to action are present");
if (current.trackedToolLinks < 25) failures.push("Fewer than 25 tool discovery links are instrumented");
if (current.toolCategoryJumpLinks < 5) failures.push("The Tools page is missing one or more category jump links");
if (current.liveToolsMisclassifiedUnderHistory !== 0) failures.push("A live Great Lakes tool remains under History and Heritage");
if (!current.webAnalyticsScriptOnMeasuredPages) failures.push("A measured page is missing Vercel Web Analytics");
if (!current.speedInsightsScriptOnMeasuredPages) failures.push("A measured page is missing Vercel Speed Insights");
if (!html.home.includes("Live Michigan and Great Lakes tools by Chris Izworski")) {
  failures.push("The homepage is missing the named tool discovery module");
}

const deltas = Object.fromEntries(
  Object.entries(current)
    .filter(([, valueNow]) => typeof valueNow === "number")
    .map(([key, valueNow]) => [key, valueNow - (baseline.structuralBaseline[key] || 0)]),
);

const report = {
  status: failures.length === 0 ? "passed" : "failed",
  baselineDate: baseline.baselineDate,
  searchConsoleStatus: baseline.searchConsole.status,
  baseline: baseline.structuralBaseline,
  current,
  deltas,
  pages,
  targets: baseline.targets,
  failures,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (process.argv.includes("--check") && failures.length > 0) process.exitCode = 1;
