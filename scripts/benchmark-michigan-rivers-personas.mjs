#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const root = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(root, "public/michigan-rivers-field-guide/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public/assets/michigan-rivers-field-guide.css"), "utf8");
const js = fs.readFileSync(path.join(root, "public/assets/michigan-rivers-field-guide.js"), "utf8");

const PERSONAS = [
  { id: "P1_TROUT_PURIST", name: "Dry-Fly Match-the-Hatch Trout Purist", keys: ["flies-only", "hatch", "brown trout", "brook"] },
  { id: "P2_FAMILY_PADDLER", name: "Beginner & Family Recreational Day-Tripper", keys: ["gentle", "family", "shallow", "restroom", "sand"] },
  { id: "P3_FLOAT_CAMPER", name: "Multi-Day Backcountry Float-Camper", keys: ["camp", "state forest campground", "rustic", "overnight"] },
  { id: "P4_TECHNICAL_KAYAKER", name: "Fast-Water & Whitewater Technical Kayaker", keys: ["rapid", "chute", "gradient", "usfs permit", "class"] },
  { id: "P5_SALMON_DRIFT_BOAT", name: "Big-Water Drift Boat Salmon & Steelhead Angler", keys: ["steelhead", "salmon", "drift boat", "dam", "tippy"] },
  { id: "P6_SUP_EXPLORER", name: "Stand-Up Paddleboarder (SUP River Explorer)", keys: ["sup", "paddleboard", "snag", "sand", "shallow"] },
  { id: "P7_WILDLIFE_ECOTOURIST", name: "Wilderness Eco-Tourist & Wildlife Observer", keys: ["eagle", "wildlife", "elk", "scenic", "quiet"] },
  { id: "P8_SELF_SHUTTLE_DRIVER", name: "Two-Vehicle Self-Shuttle Driver & Logistician", keys: ["shuttle", "drive", "miles", "parking", "gis"] },
  { id: "P9_HERITAGE_TRAVELER", name: "Hemingway & Michigan River Heritage Traveler", keys: ["hemingway", "mason", "historic", "lumber"] },
  { id: "P10_SAFETY_RESPONDER", name: "River Safety Official & First Responder", keys: ["usgs", "cfs", "sweeper", "strainer", "pfd", "hazard"] }
];

console.log("=== MICHIGAN RIVERS FIELD GUIDE: 10-PERSONA VALUE FUNCTION AUDIT ===");

let personaLoss = 0;
for (const p of PERSONAS) {
  const matches = p.keys.filter(k => html.toLowerCase().includes(k));
  const score = Math.round((matches.length / p.keys.length) * 100);
  console.log(`[${p.id}] ${p.name}: ${score}% value coverage (${matches.length}/${p.keys.length} signals)`);
  if (score < 80) {
    console.error(`FAIL: Persona ${p.id} scored below 80% (${score}%)`);
    personaLoss++;
  }
}

// 1. Audit Dual Put-In and Take-Out GIS Coordinates & Buttons
console.log("\n--- Auditing Dual Put-In & Take-Out GIS Buttons ---");
const floatIds = [
  "au-sable-holy-water", "au-sable-mason-tract", "au-sable-lower-river",
  "manistee-upper-deward", "manistee-middle-ccc-sharon", "manistee-lower-tippy-bear-creek",
  "pine-river-elm-flats", "pere-marquette-holy-water", "pere-marquette-gleasons-walhalla",
  "jordan-river-graves-crossing", "pigeon-river-elk-country", "two-hearted-river-mouth",
  "fox-river-seney", "platte-river-sleeping-bear"
];

let gisIssues = 0;
for (const id of floatIds) {
  const cardStart = html.indexOf(`id="${id}"`);
  if (cardStart === -1) {
    console.error(`FAIL: Missing float card ${id}`);
    gisIssues++;
    continue;
  }
  const cardEnd = html.indexOf('</article>', cardStart);
  const cardHtml = cardEnd > cardStart ? html.slice(cardStart, cardEnd) : html.slice(cardStart, cardStart + 8000);

  // Check put-in button and coordinates
  const hasPutInBtn = cardHtml.includes('class="wf-launch-btn wf-put-in-btn"') || cardHtml.includes('data-launch="put-in"');
  const hasTakeOutBtn = cardHtml.includes('class="wf-launch-btn wf-take-out-btn"') || cardHtml.includes('data-launch="take-out"');
  const hasCoordinatesGis = cardHtml.includes('maps.google.com/?q=') || cardHtml.includes('google.com/maps/search/?api=1&query=');
  const hasShuttleInfo = cardHtml.includes('Road Shuttle:') || cardHtml.includes('wf-shuttle-stat');

  if (!hasPutInBtn || !hasTakeOutBtn || !hasCoordinatesGis || !hasShuttleInfo) {
    console.error(`FAIL: ${id} missing dual GIS buttons or shuttle logistics`);
    gisIssues++;
  }
}

// 2. Audit Images: All 14 must be local files that exist on disk and are >20KB
console.log("\n--- Auditing Local Verified Photographs ---");
let imageIssues = 0;
for (const id of floatIds) {
  const localImgPath = path.join(root, `public/assets/michigan-rivers/${id}.jpg`);
  if (!fs.existsSync(localImgPath)) {
    console.error(`FAIL: Image missing on disk: ${localImgPath}`);
    imageIssues++;
  } else {
    const size = fs.statSync(localImgPath).size;
    if (size < 20000) {
      console.error(`FAIL: Image too small (${size} bytes): ${localImgPath}`);
      imageIssues++;
    }
  }

  // HTML must reference local image path
  const expectedImgSrc = `/assets/michigan-rivers/${id}.jpg`;
  if (!html.includes(expectedImgSrc)) {
    console.error(`FAIL: HTML does not reference local image ${expectedImgSrc}`);
    imageIssues++;
  }
}

// 3. Audit Light, Crisp Outdoor Color Palette
console.log("\n--- Auditing Crisp Daylight Color Palette ---");
let colorIssues = 0;
if (css.includes("background: #0b1d16") || css.includes("background:#0b1d16")) {
  console.error("FAIL: CSS contains dark murky page backgrounds");
  colorIssues++;
}
if (!css.includes("#f8faf9") && !css.includes("#f6f9f8")) {
  console.error("FAIL: CSS missing clean light stone background");
  colorIssues++;
}

// 4. Audit JS Map: Must support both Put-In and Take-Out markers
console.log("\n--- Auditing Dual Put-In/Take-Out Leaflet Mapping ---");
let mapIssues = 0;
if (!js.includes("putIn") || !js.includes("takeOut")) {
  console.error("FAIL: JS does not declare separate putIn and takeOut coordinates");
  mapIssues++;
}
if (!js.includes("fitBounds")) {
  console.error("FAIL: JS does not support fitBounds to view both put-in and take-out");
  mapIssues++;
}

console.log("\n=== AUDIT SUMMARY ===");
console.log(`Persona Loss: ${personaLoss}`);
console.log(`GIS Launch Issues: ${gisIssues}`);
console.log(`Image Issues: ${imageIssues}`);
console.log(`Color Palette Issues: ${colorIssues}`);
console.log(`Map Issues: ${mapIssues}`);

const totalIssues = personaLoss + gisIssues + imageIssues + colorIssues + mapIssues;
if (totalIssues > 0) {
  console.error(`\nFAILED with ${totalIssues} total issues.`);
  process.exit(1);
} else {
  console.log("\nALL 10 PERSONAS AND ARCHITECTURAL REQUIREMENTS PASS 100%!");
  process.exit(0);
}
