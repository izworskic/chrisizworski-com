"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const mustBeGone = [
  "public/gatlinburg-winter/index.html",
  "api/gatlinburg-winter.js",
  "lib/gatlinburg-winter",
  "public/assets/gatlinburg-winter.js",
  "public/assets/gatlinburg-winter.css",
  "public/assets/gatlinburg-winter-personas.js"
];

for (const rel of mustBeGone) {
  if (fs.existsSync(path.join(ROOT, rel))) {
    throw new Error(`Retired Gatlinburg surface still exists: ${rel}`);
  }
}

const sitemap = fs.readFileSync(path.join(ROOT, "public/sitemap.xml"), "utf8");
if (sitemap.includes("/gatlinburg-winter/")) {
  throw new Error("Retired Gatlinburg URL is still advertised in sitemap.xml");
}

const sitemapWriter = fs.readFileSync(path.join(ROOT, "scripts/add-yosemite-firefall-to-sitemap.mjs"), "utf8");
if (sitemapWriter.includes("gatlinburg-winter")) {
  throw new Error("Sitemap generator can re-advertise retired Gatlinburg tool");
}

console.log("gatlinburg winter retirement checks passed");
