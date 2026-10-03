const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public/niagara-border-crossings/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "public/assets/niagara-border-crossings.css"), "utf8");
const js = fs.readFileSync(path.join(root, "public/assets/niagara-border-crossings.js"), "utf8");

test("Niagara page owns one canonical decision surface with useful search metadata", () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/niagara-border-crossings\/">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /Which Niagara border crossing should I use right now\?/i);
  assert.match(html, /Niagara Border Wait Times: Which Bridge Should I Take Now\?/);
  assert.match(html, /Peace, Rainbow, Whirlpool and Lewiston/i);
  assert.doesNotMatch(html, /"@type"\s*:\s*"FAQPage"/);
});

test("first decision surface asks only causal trip inputs", () => {
  assert.match(html, /data-direction="to_canada"/);
  assert.match(html, /data-direction="to_us"/);
  assert.match(html, /id="vehicleSelect"/);
  assert.match(html, /id="programSelect"/);
  assert.match(html, /id="approachSelect"/);
  assert.match(html, /id="oversizeCheck"/);
  assert.match(html, /conservative bridge-switch buffer/i);
});

test("all four crossings and catastrophic eligibility rules are crawlable without waiting for JS", () => {
  for (const name of ["Peace Bridge", "Rainbow Bridge", "Whirlpool Rapids", "Lewiston–Queenston"]) {
    assert.match(html, new RegExp(name.replace(/[–]/g, "[–-]"), "i"));
  }
  assert.match(html, /Rainbow does not allow commercial trucks/i);
  assert.match(html, /Whirlpool is NEXUS-only/i);
  assert.match(html, /prohibits trucks, pedestrians, bicycles and vehicles in tow/i);
});

test("frontend consumes the backend decision contract instead of inventing browser scoring", () => {
  assert.match(js, /\/api\/niagara-border-crossings/);
  assert.match(js, /payload\.decision\.results/);
  assert.match(js, /payload\.decision\.recommended_id/);
  assert.doesNotMatch(js, /minimum_net_benefit_minutes/);
  assert.doesNotMatch(js, /wait_minutes\s*[+\-]\s*.*diversion/);
});

test("camera surface is fail-soft and uses explicit official links", () => {
  assert.match(html, /peacebridge\.com\/media-room\/canadian-webcams/);
  assert.match(html, /niagarafallsbridges\.com\/services\/traffic-conditions/);
  assert.match(html, /nittec\.org\/cameras/);
  assert.match(html, /instead of forcing brittle embeds/i);
  assert.doesNotMatch(html, /<iframe/i);
});

test("390px-class layout collapses controls, comparison cards and source surfaces", () => {
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /\.niagara-controls,[\s\S]*\.niagara-grid,[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /\.niagara-page \.site-nav\s*\{\s*display:\s*none/);
  assert.match(css, /\.niagara-page \.hero h1\s*\{\s*font-size:\s*29px/);
});

test("map is decision context and remains useful when Leaflet is unavailable", () => {
  assert.match(html, /id="niagaraMap"/);
  assert.match(js, /Map tiles are unavailable/);
  assert.match(html, /not a routing engine/i);
  assert.match(html, /conservative fixed switch buffers/i);
});
