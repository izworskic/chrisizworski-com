const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

test("Michigan XC authority hub owns planning intent and hands live intent to the conditions tool", () => {
  const html = read("public/michigan-cross-country-skiing/index.html");
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] || "";
  const desc = html.match(/<meta name="description" content="([^"]+)/)?.[1] || "";
  assert.equal(title, "Michigan Cross-Country Skiing: Trails &amp; Live Conditions");
  assert.ok(title.length <= 60);
  assert.ok(desc.length <= 158);
  assert.match(html, /<h1>Michigan Cross-Country Skiing<\/h1>/);
  assert.ok(html.includes('href="https://xcski.chrisizworski.com/"'));
  assert.ok(html.includes('href="/michigan-ice/"'));
  assert.match(html, /Start with snow, then verify grooming/i);
  assert.match(html, /operator or groomer remains the final word/i);
  assert.doesNotMatch(html, /groomed today|open today|excellent today/i);
  assert.ok(html.includes('/_vercel/insights/script.js'));
  assert.ok(html.includes('/_vercel/speed-insights/script.js'));
  assert.equal(jsonLd(html).length, 1);
});

test("XC authority hub has a crawlable statewide trail set with distinct decision attributes", () => {
  const html = read("public/michigan-cross-country-skiing/index.html");
  for (const trail of [
    "Huron Meadows Metropark",
    "Forbush Corner Nordic",
    "Vasa Pathway",
    "Tisdale Triangle Pathway",
    "Cadillac Pathway",
    "Wildwood Hills Pathway",
    "Blueberry Ridge Pathway",
    "Algonquin Pathway",
  ]) assert.ok(html.includes(trail), trail);
  assert.match(html, /snowmaking/i);
  assert.match(html, /rentals/i);
  assert.match(html, /classic/i);
  assert.match(html, /skate/i);
  assert.match(html, /lighted/i);
  assert.ok(html.includes('"numberOfItems":8'));
});

test("winter sitemap exposes the new authority hub and the generated ice cluster", () => {
  const sitemap = read("public/sitemap-winter.xml");
  const robots = read("public/robots.txt");
  assert.ok(robots.includes("https://chrisizworski.com/sitemap-winter.xml"));
  assert.ok(sitemap.includes("https://chrisizworski.com/michigan-cross-country-skiing/"));
  assert.ok(sitemap.includes("https://chrisizworski.com/michigan-ice/"));
  for (const region of ["saginaw-bay","houghton-lake","lake-st-clair","little-bay-de-noc","grand-traverse-bay","burt-mullett"]) {
    assert.ok(sitemap.includes(`/michigan-ice/regions/${region}.html`), region);
  }
});

test("XC adapter stays fail-closed but can hand trip planners to the new authority hub", () => {
  const adapter = read("scripts/seasonal/inject-xcski-field-desk.mjs");
  assert.match(adapter, /output must differ from input/);
  assert.match(adapter, /XC source changed: required marker is missing/);
  assert.ok(adapter.includes("https://chrisizworski.com/michigan-cross-country-skiing/"));
  assert.ok(adapter.includes('data-seasonal-action="open-xc-guide"'));
  assert.doesNotMatch(adapter, /<title>|meta name="description"|application\/ld\+json/);
});

test("winter benchmark distinguishes observed preseason data from internal targets", () => {
  const benchmark = JSON.parse(read("benchmarks/winter-demand-capture.json"));
  assert.equal(benchmark.observed.xcLive.impressions, 36);
  assert.equal(benchmark.observed.xcLive.averagePosition, 22.14);
  assert.equal(benchmark.observed.iceHub.impressions, 20);
  assert.match(benchmark.source.windowCaution, /preseason|off-season/i);
  assert.match(benchmark.newAuthoritySurface.antiCannibalizationRule, /conditions-today intent/);
  assert.match(benchmark.safetyBoundary, /never become an unsupported claim/i);
});
