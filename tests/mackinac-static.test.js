const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = readFileSync(path.join(root, "public/mackinac-bridge-live/index.html"), "utf8");
const css = readFileSync(path.join(root, "public/assets/mackinac-bridge-live.css"), "utf8");
const js = readFileSync(path.join(root, "public/assets/mackinac-bridge-live.js"), "utf8");

test("Mackinac Bridge Live has indexable metadata and valid structured data", () => {
  assert.match(html, /<title>Mackinac Bridge Conditions Live:/);
  assert.ok(
    html.includes(
      '<link rel="canonical" href="https://chrisizworski.com/mackinac-bridge-live/">',
    ),
  );
  assert.match(html, /name="description" content="[^"]*official status/i);
  assert.ok(html.includes('"@type": "WebApplication"'));
  assert.ok(html.includes('"@type": "FAQPage"'));

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 2);
  blocks.forEach((block) => assert.doesNotThrow(() => JSON.parse(block[1])));
});

test("Mackinac Bridge Live contains the complete crossing decision flow", () => {
  assert.ok(html.includes("Will I have trouble crossing?"));
  assert.equal((html.match(/data-vehicle="/g) || []).length, 4);
  assert.equal((html.match(/data-direction="/g) || []).length, 2);
  assert.ok(html.includes("Estimated best crossing window"));
  assert.ok(html.includes("Mackinac Bridge Webcam"));
  assert.ok(html.includes("Hour-by-Hour Mackinac Bridge Wind Forecast"));
  assert.ok(html.includes("RV, Camper and Trailer Guidance"));
  assert.ok(html.includes("Mackinac Bridge Traffic Today"));
  assert.ok(html.includes("sms:67283?body=MacBridge"));
});

test("the interface makes official status authoritative and nearby wind explicit", () => {
  assert.match(html, /Bridge Authority report controls/i);
  assert.match(html, /Official bridge wind/i);
  assert.match(html, /Nearby NOAA context/i);
  assert.match(html, /exact bridge-deck wind or gust reading/i);
  assert.ok(html.includes('id="windMismatchNotice"'));
  assert.match(html, /Planning aid, not an official safety decision/i);
  assert.ok(js.includes('var API_URL = "/api/mackinac"'));
  assert.ok(js.includes("official?.bridge_wind"));
  assert.ok(js.includes("windMismatch"));
  assert.ok(js.includes("No confirmed crossing window"));
  assert.ok(js.includes("renderUnavailable"));
  assert.doesNotMatch(js, /title:\s*["']All Clear/i);
  assert.ok(js.includes("Notification.permission"));
});

test("the tool is responsive, reduced-motion aware, and analytics ready", () => {
  assert.ok(css.includes("@media (max-width: 680px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(html.includes('href="#main">Skip to bridge conditions</a>'));
  assert.ok(html.includes('/_vercel/insights/script.js'));
  assert.ok(html.includes('/_vercel/speed-insights/script.js'));
  assert.ok(js.includes('name: "Bridge Tool Interaction"'));
});
