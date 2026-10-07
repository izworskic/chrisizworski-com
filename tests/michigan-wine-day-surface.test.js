const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test("Michigan Wine Day has one indexable statewide canonical owner", () => {
  const html = read("public/michigan-wine-day/index.html");
  const southwest = read("public/michigan-wine-day/southwest/index.html");
  const sitemap = read("public/sitemap.xml");

  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-wine-day\/">/);
  assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(html, /"@type":"WebApplication"/);
  assert.match(html, /"@id":"https:\/\/chrisizworski\.com\/#person"/);
  assert.match(html, /twitter:card/);
  assert.match(html, /og:title/);

  assert.match(southwest, /<meta name="robots" content="noindex,follow">/);
  assert.equal((sitemap.match(/https:\/\/chrisizworski\.com\/michigan-wine-day\//g) || []).length, 1);
  assert.doesNotMatch(sitemap, /michigan-wine-day\/southwest/);
});

test("first-use surface stays four decisions with progressive custom time", () => {
  const html = read("public/michigan-wine-day/index.html");
  const form = html.match(/<form id="wineDecisionForm">([\s\S]*?)<\/form>/)?.[1] || "";
  assert.ok(form);
  assert.match(form, /name="origin"/);
  assert.match(form, /name="date"/);
  assert.match(form, /name="window"/);
  assert.match(form, /name="intent"/);
  assert.match(form, /id="customWindow"[^>]+hidden/);
  assert.doesNotMatch(form, /street address/i);
});

test("mobile baseline and result cards protect 390px layouts", () => {
  const css = read("public/assets/michigan-wine-day.css");
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /min-width:0/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /\.facts\{grid-template-columns:1fr\}/);
});

test("analytics stay bounded and do not transmit raw origin text", () => {
  const js = read("public/assets/michigan-wine-day.js");
  assert.match(js, /wine_region_engine_loaded/);
  assert.match(js, /wine_region_recommendation/);
  assert.match(js, /wine_region_planner_handoff/);
  assert.match(js, /origin_class:/);
  assert.doesNotMatch(js, /origin:\s*document\.getElementById/);
  assert.doesNotMatch(js, /latitude|longitude|street_address|free_text/i);
});

test("API is noindex and has explicit origin, adapter, routing and weather fallbacks", () => {
  const api = read("api/michigan-wine-day.js");
  const providers = read("lib/michigan-wine-day/providers.js");
  assert.match(api, /X-Robots-Tag/);
  assert.match(api, /CITY_OR_ZIP_ONLY/);
  assert.match(providers, /snapshot-fallback/);
  assert.match(providers, /fallbackTravelMinutes/);
  assert.match(providers, /National Weather Service/);
  assert.match(providers, /Nominatim/);
});

test("Tools hub and network registry expose statewide owner without stealing regional ownership", () => {
  const toolsHtml = read("public/tools/index.html");
  const registry = JSON.parse(read("benchmarks/tool-network-registry.json"));
  const statewide = registry.tools.find((row) => row.id === "michigan-wine-day");
  assert.ok(statewide);
  assert.equal(statewide.canonical, "https://chrisizworski.com/michigan-wine-day/");
  assert.match(toolsHtml, /data-tool-id="michigan-wine-day"/);
  assert.match(toolsHtml, /43 wineries, 22 breweries, 7 distilleries, and 5 cideries/);
  const ownership = registry.cannibalizationGroups.find((row) => row.owner === "michigan-wine-day");
  assert.ok(ownership);
  assert.deepEqual(ownership.supports.sort(), ["petoskey-wine", "tc-wine"]);
});

test("Southwest handoff is cluster-based, noindex and links users back to first-party winery sources", () => {
  const html = read("public/michigan-wine-day/southwest/index.html");
  const js = read("public/assets/michigan-wine-southwest.js");
  const regions = require("../lib/michigan-wine-day/regions");
  assert.match(html, /Southwest Michigan is too broad to fake as one loop/);
  assert.match(html, /noindex,follow/);
  assert.match(js, /Official winery site/);
  assert.equal(Object.keys(regions.SOUTHWEST_CONTRACT.region.clusters).length, 4);
  for (const cluster of Object.values(regions.SOUTHWEST_CONTRACT.region.clusters)) {
    assert.equal(cluster.presets["first-trip"].length, 3);
  }
});
