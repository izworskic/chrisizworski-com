const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public", "niagara-border-crossing", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "assets", "niagara-persona-polish.20261003.css"), "utf8");

test("Niagara asks for the trip before showing the mobile answer", () => {
  assert.match(css, /@media\(max-width:620px\)[\s\S]*\.trip-controls\{order:1!important/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*\.trip-answer\{order:2!important/);
  assert.match(css, /\.niagara-hero \.lede\{display:none\}/);
});

test("Niagara corridor prompt uses traveler language and warns against fake mode waits", () => {
  assert.match(html, /Which corridor already fits your trip\?/);
  assert.match(html, /We do not substitute a car wait for walking, bicycles, buses or trailers\./);
  assert.match(html, /Choose the area you are already headed toward/);
});

test("Niagara puts camera, map and rules actions directly beside the decision", () => {
  assert.match(html, /class="decision-shortcuts"/);
  assert.match(html, /href="#bridgeCameras"[^>]*>Live cameras/);
  assert.match(html, /href="#bridgeMap"[^>]*>Bridge map/);
  assert.match(html, /href="#eligibilityRules"[^>]*>Rules &amp; tolls/);
  assert.match(html, /id="bridgeMap"/);
  assert.match(html, /id="eligibilityRules"/);
});
