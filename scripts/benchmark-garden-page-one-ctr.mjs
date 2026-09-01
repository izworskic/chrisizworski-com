#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const zone = await read("public/zone-6a-planting-calendar/index.html");
const heirloom = await read("public/heirloom-tomatoes-michigan/index.html");
const tomato = await read("public/when-to-plant-tomatoes-michigan/index.html");
const frost = await read("public/michigan-frost-dates/index.html");
const experiment = JSON.parse(await read("benchmarks/garden-page-one-ctr-experiment.json"));
const ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));
const portfolio = JSON.parse(await read("benchmarks/search-authority-portfolio.json"));
const sitemap = await read("public/sitemap.xml");
// A literal dateModified is duplicated state that fails the day a page legitimately changes. The
// snippet freeze that protects this window is the title/H1/canonical pin; assert the property that
// actually goes wrong instead — page stamp versus the lastmod the route publishes.
const freshnessAgrees = (html, route) => {
  const stamped = (html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1] || "";
  const published = (new RegExp(`<loc>https://chrisizworski\\.com${route.replace(/\//g, "\\/")}</loc>[\\s\\S]{0,200}?<lastmod>(\\d{4}-\\d{2}-\\d{2})`).exec(sitemap) || [])[1] || "";
  return Boolean(stamped) && stamped === published;
};
const failures = [];
const check = (name, pass) => { if (!pass) failures.push(name); };
check("zone title", zone.includes('<title>Michigan Zone 6a Planting Calendar by City | Chris Izworski</title>'));
check("zone H1", zone.includes('<h1>Michigan Zone 6a Planting Calendar by City</h1>'));
check("zone direct answer", zone.includes('Pick your nearest Michigan city and this calendar computes indoor seed-starting'));
check("zone canonical", zone.includes('<link rel="canonical" href="https://chrisizworski.com/zone-6a-planting-calendar/">'));
check("zone freshness matches sitemap", freshnessAgrees(zone, "/zone-6a-planting-calendar/"));
check("heirloom title", heirloom.includes('<title>Best Heirloom Tomatoes for Michigan | Chris Izworski</title>'));
check("heirloom H1", heirloom.includes('<h1>Best Heirloom Tomatoes for Michigan</h1>'));
check("heirloom direct answer", heirloom.includes('<strong>Best heirloom tomatoes for Michigan:</strong>'));
check("heirloom canonical", heirloom.includes('<link rel="canonical" href="https://chrisizworski.com/heirloom-tomatoes-michigan/">'));
check("heirloom freshness matches sitemap", freshnessAgrees(heirloom, "/heirloom-tomatoes-michigan/"));
check("tomato protected title", tomato.includes('<title>When to Plant Tomatoes in Michigan: 2026 Dates by Region</title>'));
check("tomato protected H1", tomato.includes('<h1>When to Plant Tomatoes in Michigan: 2026 Dates by Region</h1>'));
check("frost protected title", frost.includes('<title>Michigan Last Frost Dates by City: 2026 Planting Calendar</title>'));
check("frost protected H1", frost.includes('<h1>Michigan Last Frost Dates by City</h1>'));
check("zone baseline", experiment.pages[0].baseline.impressions === 34 && experiment.pages[0].baseline.clicks === 0 && experiment.pages[0].baseline.averagePosition === 8.26);
check("heirloom baseline", experiment.pages[1].baseline.impressions === 30 && experiment.pages[1].baseline.clicks === 0 && experiment.pages[1].baseline.averagePosition === 10.37);
check("targets not weakened", experiment.pages.every((p) => p.target.ctr >= 0.02 && p.target.stretchCtr >= 0.03));
const zoneLedger = ledger.experiments.find((e) => e.id === "2026-08-22-zone-6a-calendar-ctr");
const heirloomLedger = ledger.experiments.find((e) => e.id === "2026-08-22-heirloom-tomatoes-ctr");
check("zone ledger entry is declared and either open or read", (zoneLedger?.status === "pending-clean-window" || (zoneLedger?.status === "evaluated" && Boolean(zoneLedger?.result))) && Boolean(zoneLedger?.lastSearchFacingChangeDate));
check("heirloom ledger entry is declared and either open or read", (heirloomLedger?.status === "pending-clean-window" || (heirloomLedger?.status === "evaluated" && Boolean(heirloomLedger?.result))) && Boolean(heirloomLedger?.lastSearchFacingChangeDate));
check("latest snapshot advanced", portfolio.measurement?.latestLeadingSnapshot?.spreadsheetId === "1dm2AC6FN4lU9P0viRs3mhVtg098AuvwEdNbKw-PsEVw" && portfolio.measurement?.latestLeadingSnapshot?.exportedThrough === "2026-08-20");
console.log("\nGARDEN PAGE-ONE CTR SPRINT");
console.log("=".repeat(72));
console.log("Zone 6a calendar: 34 impressions / 0 clicks / position 8.26");
console.log("Heirloom tomatoes: 30 impressions / 0 clicks / position 10.37");
console.log("Target: >=2.0% CTR on each page while preserving protected tomato/frost treatments");
if (failures.length) { console.log("Failures:"); for (const failure of failures) console.log(" - " + failure); }
if (process.argv.includes("--check")) { if (failures.length) process.exitCode = 1; else console.log("benchmark:garden-page-one-ctr PASS\n"); }
