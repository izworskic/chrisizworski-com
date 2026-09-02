const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

function sitemapLastmod(sitemap, route) {
  const loc = `<loc>https://chrisizworski.com${route}</loc>`;
  const offset = sitemap.indexOf(loc);
  assert.notEqual(offset, -1, `${route} is missing from sitemap.xml`);
  return (sitemap.slice(offset, offset + 220).match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/) || [])[1];
}

test("FVF source-page CTA tracking loads Vercel Analytics before the tracker", () => {
  for (const file of ["public/about/index.html", "public/guides/index.html"]) {
    const html = read(file);
    const analytics = html.indexOf('/_vercel/insights/script.js');
    const tracker = html.indexOf('/assets/growth-cta.js');
    assert.ok(analytics >= 0, `${file} is missing the Vercel Analytics loader`);
    assert.ok(tracker > analytics, `${file} must load Analytics before the growth CTA tracker`);
  }
});

test("the FVF experiment runs on the clean post-PR-50 window", () => {
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  // The growth-experiment ledger was retired on 2026-09-02: the owner ended every Search Console
  // experiment early, so there is no experiments array and no active freeze to assert. What must
  // still hold is that the ledger says so plainly and keeps what was learned, rather than going
  // quiet and leaving a reader to assume a window is still running.
  assert.equal(ledger.status, "retired");
  assert.deepEqual(ledger.activeExperiments, []);
  assert.ok(Array.isArray(ledger.durableLearnings) && ledger.durableLearnings.length >= 4);
  assert.equal(ledger.experiments, undefined, "a retired ledger must not carry a stale experiments array");
});

test("the Michigan Ice root freshness signal is generated and matches the sitemap", () => {
  const html = read("public/michigan-ice/index.html");
  const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(jsonLd, "Michigan Ice root is missing JSON-LD");
  const graph = JSON.parse(jsonLd[1])["@graph"];
  const page = graph.find((node) => node["@type"] === "WebPage");
  const sitemap = read("public/sitemap.xml");
  const generator = read("scripts/ice/gen_site.py");
  const generatedDate = generator.match(/ICE_ROOT_DATE_MODIFIED = "(\d{4}-\d{2}-\d{2})"/)?.[1];

  assert.ok(generatedDate, "Michigan Ice generator is missing its root freshness date");
  assert.equal(page.dateModified, generatedDate);
  assert.equal(sitemapLastmod(sitemap, "/michigan-ice/"), page.dateModified);
  assert.match(generator, /"dateModified": ICE_ROOT_DATE_MODIFIED/);
});

test("the reputation sitemap uses a pinned source hash, not a parity exemption", () => {
  const verifier = read("scripts/verify-source.mjs");
  const intentionalStart = verifier.indexOf("const intentionalChanges");
  const intentionalEnd = verifier.indexOf("// These files were already committed", intentionalStart);
  const intentionalChanges = verifier.slice(intentionalStart, intentionalEnd);
  const pins = [...verifier.matchAll(/\["\/sitemap-reputation\.xml", "([a-f0-9]{64})"\]/g)];
  const actual = createHash("sha256").update(readFileSync(path.join(root, "public/sitemap-reputation.xml"))).digest("hex");

  assert.doesNotMatch(intentionalChanges, /"\/sitemap-reputation\.xml"/);
  assert.equal(pins.length, 1, "sitemap-reputation.xml must have exactly one committed drift pin");
  assert.equal(pins[0][1], actual);
});

test("Great Lakes Buoys matches live-buoy intent without regressing the tool", () => {
  const html = read("public/great-lakes-buoys/index.html");
  const titleMarkup = (html.match(/<title>(.*?)<\/title>/s) || [])[1] || "";
  const title = titleMarkup.replaceAll("&amp;", "&");
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));


  assert.equal(title, "Great Lakes Buoys Live: Waves & Water Temp | Chris Izworski");
  assert.ok(title.length <= 60, `buoy title is ${title.length} characters`);
  assert.ok(html.includes("<h1 class=\"page-title\">Great Lakes Buoys Live: Waves, Wind &amp; Water Temperature</h1>"));
  assert.ok(html.includes('id="great-lakes-buoy-answer"'));
  assert.ok(html.includes("latest available NOAA/NDBC readings"));
  assert.ok(html.includes("when that station reports them"));
  assert.ok(html.includes("Source observations are typically 5 to 30 minutes old"));
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-buoys/">'));
  assert.ok(html.includes('id="buoyMap"'));
  assert.ok(html.includes("fetch('/api/buoys')"));
  assert.ok(html.includes('id="activityPills"'));
  assert.ok(html.includes('id="stationList"'));

  // Ledger row gone with the retired experiment system; the page assertions above are the part
  // that still protects this tool.
});

test("PR 50 page freshness stamps match sitemap.xml", () => {
  const sitemap = read("public/sitemap.xml");
  for (const [route, file] of [
    ["/about/", "public/about/index.html"],
    ["/guides/", "public/guides/index.html"],
    ["/great-lakes-buoys/", "public/great-lakes-buoys/index.html"],
  ]) {
    const html = read(file);
    const dateModified = (html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1];
    assert.equal(sitemapLastmod(sitemap, route), dateModified, route);
  }
});