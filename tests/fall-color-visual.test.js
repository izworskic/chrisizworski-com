const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = readFileSync(path.join(root, "public/fall-color/index.html"), "utf8");
const css = readFileSync(path.join(root, "public/assets/fall-color-visual.css"), "utf8");

test("fall color visual refresh preserves tool mounts and search semantics", () => {
  assert.match(html, /<body class="seasonal-fall" data-seasonal-tool="fall-color">/);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
  for (const id of [
    "todayLabel", "statewideStatus", "nearCard", "nearBtn", "liveStrip",
    "map", "scrub", "dateChips", "bands", "tab-now", "tab-paddle",
    "tab-plan", "tab-guide",
  ]) {
    assert.equal((html.match(new RegExp('id="' + id + '"', "g")) || []).length, 1, id);
  }
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/fall-color\/"/);
  assert.match(html, /<div class="fall-map-head">/);
  assert.match(html, /<link rel="stylesheet" href="\/assets\/fall-color-visual\.css\?v=20261009a"/);
  assert.match(html, /href="\/fall-color\/michigan-leaf-peeping-planner\/"/);
  assert.match(html, /href="#map"/);
});

test("Michigan fall visual design is lightweight, responsive and credits its actual photograph", () => {
  assert.match(html, /Photo: Aaron Burden \(CC0\)/);
  assert.match(html, /Road_curve_in_the_autumn_/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.match(css, /@media \(max-width:390px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /@import|font-face|url\(/);
  assert.doesNotMatch(html, /<script[^>]+(?:motion|chart\.js|lottie)/i);
});
