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
  const fvf = ledger.experiments.find((item) => item.id === "2026-08-03-fvf-gardening-authority");

  assert.equal(fvf.status, "running");
  assert.equal(fvf.releaseDate, "2026-08-12");
  assert.deepEqual(fvf.evaluationWindow, { start: "2026-08-13", end: "2026-09-09" });
  assert.equal(fvf.lastSearchFacingChangeDate, "2026-08-11");
  assert.deepEqual(fvf.invalidatedWindow.evaluationWindow, {
    start: "2026-08-04",
    end: "2026-08-31",
  });
  assert.match(fvf.invalidatedWindow.reason, /confounding/);
  assert.equal(fvf.distributionExpansion.status, "released");
  assert.equal(fvf.distributionExpansion.releaseDate, "2026-08-11");
  assert.deepEqual(fvf.distributionExpansion.evaluationWindow, {
    start: "2026-08-13",
    end: "2026-09-09",
  });
});

test("the Michigan Ice root freshness signal is generated and matches the sitemap", () => {
  const html = read("public/michigan-ice/index.html");
  const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(jsonLd, "Michigan Ice root is missing JSON-LD");
  const graph = JSON.parse(jsonLd[1])["@graph"];
  const page = graph.find((node) => node["@type"] === "WebPage");
  const sitemap = read("public/sitemap.xml");

  assert.equal(page.dateModified, "2026-08-12");
  assert.equal(sitemapLastmod(sitemap, "/michigan-ice/"), page.dateModified);
  assert.match(read("scripts/ice/gen_site.py"), /"dateModified": ICE_ROOT_DATE_MODIFIED/);
});

test("the reputation sitemap uses a pinned source hash, not a parity exemption", () => {
  const verifier = read("scripts/verify-source.mjs");
  const intentionalStart = verifier.indexOf("const intentionalChanges");
  const intentionalEnd = verifier.indexOf("// These files were already committed", intentionalStart);
  const intentionalChanges = verifier.slice(intentionalStart, intentionalEnd);
  const pinned = verifier.match(/\["\/sitemap-reputation\.xml", "([a-f0-9]{64})"\]/);
  const actual = createHash("sha256").update(readFileSync(path.join(root, "public/sitemap-reputation.xml"))).digest("hex");

  assert.doesNotMatch(intentionalChanges, /"\/sitemap-reputation\.xml"/);
  assert.ok(pinned, "sitemap-reputation.xml is missing its committed drift pin");
  assert.equal(pinned[1], actual);
});

test("Great Lakes Buoys matches live-buoy intent without regressing the tool", () => {
  const html = read("public/great-lakes-buoys/index.html");
  const titleMarkup = (html.match(/<title>(.*?)<\/title>/s) || [])[1] || "";
  const title = titleMarkup.replaceAll("&amp;", "&");
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  const experiment = ledger.experiments.find(
    (item) => item.id === "2026-08-12-great-lakes-buoys-live-intent",
  );

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

  assert.deepEqual(experiment.baseline, {
    impressions: 1276,
    clicks: 25,
    ctr: 0.0196,
    averagePosition: 14.54,
  });
  assert.deepEqual(experiment.target, { ctr: 0.025, averagePosition: 12 });
  assert.equal(experiment.status, "running");
  assert.equal(experiment.releaseDate, "2026-08-12");
  assert.deepEqual(experiment.evaluationWindow, { start: "2026-08-13", end: "2026-09-09" });
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
