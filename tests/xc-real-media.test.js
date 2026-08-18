const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = readFileSync(path.join(root, "public/michigan-cross-country-skiing/index.html"), "utf8");

test("XC guide has no static still-photo treatment", () => {
  assert.doesNotMatch(html, /<img\b/i);
  assert.doesNotMatch(html, /<figure\b/i);
  assert.doesNotMatch(html, /og:image/i);
  assert.doesNotMatch(html, /primaryImageOfPage/i);
  assert.doesNotMatch(html, /upload\.wikimedia\.org/i);
  assert.doesNotMatch(html, /commons\.wikimedia\.org/i);
});

test("XC guide keeps official webcam links and truthful regional camera context", () => {
  assert.ok(html.includes('href="https://www.forbushcorner.com/webcam.html"'));
  assert.match(html, /LIVE TRAIL-SIDE VIEW/);
  assert.match(html, /image is not copied or stored here/i);
  assert.doesNotMatch(html, /trilliumtrail\.net\/athwebpic/);

  assert.ok(html.includes('data-field-camera="i75-grayling"'));
  assert.ok(html.includes('src="/assets/field-camera.js"'));
  assert.match(html, /Regional snow context only, not a view of Forbush Corner, Tisdale Triangle, or trail grooming/);
});

test("XC visual cleanup preserves the measured search surface", () => {
  assert.match(html, /<title>Michigan Cross-Country Skiing: Trails &amp; Live Conditions<\/title>/);
  assert.match(html, /<h1>Michigan Cross-Country Skiing<\/h1>/);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-cross-country-skiing/">'));
  assert.ok(html.includes('"numberOfItems":8'));
  assert.match(html, /does not label a trail “open,” “groomed today,” or “excellent” from weather alone/i);
});
