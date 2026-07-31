const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const catalog = JSON.parse(read("data/beaches.json"));

test("Michigan Beach Report main page has answer-ready metadata and honest fallbacks", () => {
  const html = read("public/great-lakes-beaches/index.html");
  assert.match(html, /<title>Michigan Beach Report:/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-beaches\/"/);
  assert.match(html, /"@type": \["WebApplication", "WebPage"\]/);
  assert.match(html, /"@type": "FAQPage"/);
  assert.match(html, /No active EGLE alert found/);
  assert.match(html, /does not mean a recent water sample exists/);
  assert.match(html, /<noscript>/);
  assert.match(html, /National Park Service/);
  assert.match(html, /score is N\/A and the beach is excluded/i);
  assert.match(html, /\/assets\/beach-report\.js/);
  assert.doesNotMatch(html, />[^<]*(water is safe|safe to swim|safe for swimming)[^<]*</i);
});

test("seasonal daily page is canonical but explains its automatic pause", () => {
  const html = read("public/best-michigan-beaches-today/index.html");
  assert.match(html, /<title>Best Michigan Beaches Today:/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/best-michigan-beaches-today\/"/);
  assert.match(html, /May 15/);
  assert.match(html, /September 15/);
  assert.match(html, /year-round Michigan Beach Report remains live/i);
  assert.match(html, /id="dailyList"/);
  assert.match(html, /Incomplete data is N\/A, never a fallback score/i);
});

test("every catalog beach has a structured, canonical detail page and sitemap entry", () => {
  const sitemap = read("public/sitemap-beaches.xml");
  assert.equal(catalog.beaches.length, 50);
  for (const beach of catalog.beaches) {
    const relative = `public/great-lakes-beaches/${beach.slug}/index.html`;
    assert.ok(fs.existsSync(path.join(root, relative)), `${relative} is missing`);
    const html = read(relative);
    assert.match(html, new RegExp(`data-beach-slug="${beach.slug}"`));
    assert.match(html, new RegExp(`https://chrisizworski\\.com/great-lakes-beaches/${beach.slug}/`));
    assert.match(html, /"@type": \[/);
    assert.match(html, /"GeoCoordinates"/);
    assert.match(sitemap, new RegExp(`/great-lakes-beaches/${beach.slug}/`));
  }
});

test("the report is discoverable across the site and has a dedicated sitemap", () => {
  assert.match(read("public/tools/index.html"), /Michigan Beach Report/);
  assert.match(read("public/great-lakes/index.html"), /Michigan Beach Report/);
  assert.match(read("public/index.html"), /Michigan Beach Report/);
  assert.match(read("public/llms.txt"), /## Michigan Beach Report/);
  assert.match(read("public/robots.txt"), /Sitemap: https:\/\/chrisizworski\.com\/sitemap-beaches\.xml/);
  assert.match(read("public/sitemap.xml"), /best-michigan-beaches-today/);
});

test("the browser client never renders missing lake observations as zero", () => {
  const client = read("public/assets/beach-report.js");
  assert.match(client, /value !== null && value !== undefined && value !== ""/);
  assert.match(client, /lake\.fresh \? formatMetric\(lake\.water_temp_f/);
  assert.match(client, /score != null \? String\(beach\.rating\.score\) : "N\/A"/);
  assert.match(client, /scoreMetricText/);
});
