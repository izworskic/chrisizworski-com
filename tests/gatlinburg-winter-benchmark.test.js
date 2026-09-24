"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/gatlinburg-winter/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter.css"), "utf8");
const benchmarkCss = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter-benchmark.css"), "utf8");
const js = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter.js"), "utf8");

function appearsBefore(a, b) {
  return html.indexOf(a) >= 0 && html.indexOf(b) >= 0 && html.indexOf(a) < html.indexOf(b);
}

test("first screen stays decision-first instead of becoming a giant tourism hero", () => {
  const firstScreen = html.match(/<section class="decision-top"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(firstScreen, /class="title-visual"/);
  assert.match(firstScreen, /<img\b[^>]*loading="eager"/i);
  assert.match(firstScreen, /id="stateHeadline"/);
  assert.match(firstScreen, /id="bestMove"/);
  assert.match(firstScreen, /See the plan/);
  assert.match(benchmarkCss, /\.title-visual\{[^}]*width:230px;[^}]*height:112px/);
  assert.match(benchmarkCss, /@media\(max-width:760px\)[\s\S]*?\.title-visual\{width:96px;height:72px/);
  assert.ok(appearsBefore('class="title-visual"', 'id="stateHeadline"'), "the title image should support, not replace, the live decision read");
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
