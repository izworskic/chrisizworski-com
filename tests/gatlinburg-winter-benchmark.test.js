"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/gatlinburg-winter/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter.css"), "utf8");
const js = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter.js"), "utf8");

function appearsBefore(a, b) {
  return html.indexOf(a) >= 0 && html.indexOf(b) >= 0 && html.indexOf(a) < html.indexOf(b);
}

test("first screen stays decision-first instead of becoming a giant tourism hero", () => {
  assert.match(html, /class="decision-top"/);
  assert.match(html, /id="stateHeadline"/);
  assert.match(html, /id="bestMove"/);
  assert.match(html, /See the plan/);
  const firstScreen = html.match(/<section class="decision-top"[\s\S]*?<\/section>/)?.[0] || "";
  const images = firstScreen.match(/<img\b[^>]*>/gi) || [];
  assert.equal(images.length, 1, "first decision surface should have only the compact title image");
  assert.match(firstScreen, /<figure class="title-visual">/);
  assert.doesNotMatch(firstScreen, /class="[^"]*\bhero\b/i);
});

test("official operational checks are one tap from the first decision surface", () => {
  assert.match(html, /class="official-checks"/);
  assert.match(html, /gatlinburg\.com\/plan\/parking/);
  assert.match(html, /gatlinburg\.com\/things-to-do\/trolley/);
  assert.match(html, /nps\.gov\/grsm\/learn\/photosmultimedia\/webcams/);
  assert.match(html, /nps\.gov\/grsm\/planyourvisit\/conditions/);
});

test("mobile and desktop users can jump through the actual decision journey", () => {
  for (const target of ["#plan", "#visitOperationsSection", "#decisionClockSection", "#dateIntelligenceSection", "#conditions", "#mapSection"]) {
    assert.ok(html.includes(`href="${target}"`), `missing decision-nav target ${target}`);
  }
  assert.match(css, /\.journey-nav\{[^}]*position:sticky/);
});

test("high-value dynamic layers receive distinct visual hierarchy", () => {
  assert.match(css, /#visitOperationsSection\{/);
  assert.match(css, /#decisionClockSection\{/);
  assert.match(css, /#dateIntelligenceSection\{/);
  assert.match(css, /#decisionClockSection[^}]*background:linear-gradient/);
  assert.match(css, /#dateIntelligenceSection[^}]*background:var\(--blue\)/);
});

test("nearby dates remain mobile-scannable rather than becoming a long card stack", () => {
  assert.match(css, /#dateIntelligenceSection \.alternative-rows\{display:flex;overflow-x:auto/);
  assert.match(css, /scroll-snap-type:x mandatory/);
});

test("crowd language is explicitly an estimate", () => {
  assert.match(html, /<dt>Crowd pressure estimate<\/dt>/);
  assert.match(html, /AirDNA is market context only and is not treated as a live crowd sensor/);
  assert.match(js, /Not used as a live crowd estimate/);
});

test("methodology and secondary market context stay below the visitor decision", () => {
  assert.ok(appearsBefore('id="sources"', 'id="data-context"'));
  assert.match(html, /<details class="supporting-data">/);
  assert.match(html, /AirDNA is market context only and is not treated as a live crowd sensor/);
});

test("plan remains the primary product object", () => {
  assert.match(css, /\.plan-section::before/);
  assert.match(css, /\.timeline\{counter-reset:stop/);
  assert.match(css, /\.timeline li::before\{content:counter\(stop\)/);
});

test("existing unique decision layers are still wired", () => {
  assert.match(js, /renderOperations\(d\.visitOperations\)/);
  assert.match(js, /renderDecisionClock\(d\.decisionClock\)/);
  assert.match(js, /renderDateIntelligence\(d\.dateIntelligence\)/);
  assert.match(js, /gatlinburg_nearby_date_selected/);
});
