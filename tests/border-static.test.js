const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync, statSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const mainPath = path.join(root, "public/michigan-border-wait-times/index.html");
const main = readFileSync(mainPath, "utf8");
const css = readFileSync(path.join(root, "public/assets/michigan-border-crossings.css"), "utf8");
const js = readFileSync(path.join(root, "public/assets/michigan-border-crossings.js"), "utf8");
const detailRoutes = {
  "gordie-howe-bridge-wait-time": "gordie-howe",
  "ambassador-bridge-wait-time": "ambassador",
  "detroit-windsor-tunnel-wait-time": "detroit-windsor-tunnel",
  "blue-water-bridge-wait-time": "blue-water",
  "sault-ste-marie-border-wait-time": "sault-ste-marie",
};

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]),
  );
}

test("Michigan border flagship has indexable metadata and honest application schema", () => {
  assert.match(
    main,
    /<title>Michigan Border Wait Times Live \| All 5 Crossings<\/title>/,
  );
  assert.ok(
    main.includes(
      '<link rel="canonical" href="https://chrisizworski.com/michigan-border-wait-times/">',
    ),
  );
  assert.match(main, /name="description" content="[^"]*Gordie Howe[^"]*Sault Ste\. Marie/i);
  assert.ok(main.includes('"@type": "WebApplication"'));
  assert.ok(main.includes('"@type": "ItemList"'));
  assert.ok(main.includes('"numberOfItems": 5'));
  assert.doesNotMatch(main, /"@type"\s*:\s*"FAQPage"/);
  // Derived from git by scripts/stamp-freshness.mjs, so assert the shape rather than a
  // literal date that goes stale the next time this page is legitimately edited.
  const stamp = main.match(/dateModified": "(\d{4}-\d{2}-\d{2})"/);
  assert.ok(stamp, "dateModified must be present");
  assert.ok(Date.parse(stamp[1]) <= Date.now(), "dateModified must not be in the future");
  assert.match(main, /"creditText": "U\.S\. Environmental Protection Agency, public domain"/);
  assert.equal(jsonLd(main).length, 1);
});

test("flagship exposes the complete five-crossing decision flow and Upper Peninsula answer", () => {
  assert.equal((main.match(/data-direction=/g) || []).length, 2);
  assert.equal((main.match(/data-vehicle=/g) || []).length, 2);
  assert.equal((main.match(/data-crossing-result=/g) || []).length, 3);
  assert.equal((main.match(/data-camera="/g) || []).length, 6);
  assert.ok(main.includes('data-corridor-card="blue-water"'));
  assert.ok(main.includes('data-corridor-card="sault-ste-marie"'));
  assert.match(main, /Michigan’s Upper Peninsula crossing/);
  assert.match(main, /all five Michigan–Ontario crossings/i);
  assert.ok(main.includes("/sault-ste-marie-border-wait-time/"));
  assert.ok(main.includes("Today vs. Typical Hourly Waits"));
  assert.ok(main.includes("Michigan–Canada Border Crossing FAQ"));
});

test("wait, camera, weather, and approach-road meanings stay visibly separate", () => {
  assert.match(main, /Wait means border processing/);
  assert.match(main, /does not include approach traffic, toll queues/i);
  assert.match(main, /Camera views are visual context—not measured border wait times/i);
  assert.match(main, /Weather and approach-road warnings/i);
  assert.match(main, /not a forecast, “best time,” or guarantee/i);
  assert.match(main, /Unknown never becomes zero/);
  assert.doesNotMatch(main, /fastest total trip|predicted closure|guaranteed crossing/i);
});

test("client uses same-origin live APIs, tie-safe comparisons, and canonical query-state sharing", () => {
  assert.ok(js.includes('var API_URL = "/api/border-crossings"'));
  assert.ok(js.includes('var TREND_URL = "/api/border-trends"'));
  assert.ok(js.includes("comparison.fastest_ids.includes"));
  assert.ok(js.includes("comparison.is_tie"));
  assert.ok(js.includes("lane.status === \"closed\""));
  assert.ok(js.includes("if (!lane.available"));
  assert.ok(js.includes('window.history.replaceState'));
  assert.ok(js.includes('"&refresh="'));
  assert.ok(js.includes('name: "Border Tool Interaction"'));
  assert.doesNotMatch(js, /511on\.ca\/map\/Cctv|wtbwb\.ca\/approach/);
  assert.doesNotMatch(js, /bestWindow|predict(?:ed|ion)?Wait|fastestTotalTrip/i);
});

test("each crossing owns a substantial, unique, indexable live search page", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const [route, id] of Object.entries(detailRoutes)) {
    const html = readFileSync(path.join(root, "public", route, "index.html"), "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
    titles.add(title);
    descriptions.add(description);
    assert.ok(html.includes(`data-border-detail="${id}"`), `${route} lacks its live crossing ID`);
    assert.ok(
      html.includes(`<link rel="canonical" href="https://chrisizworski.com/${route}/">`),
      `${route} lacks its canonical`,
    );
    assert.ok(html.includes('id="detailWait"'));
    assert.ok(html.includes('id="detailCameraImage"'));
    assert.ok(html.includes('id="detailRoadEvents"'));
    assert.ok(html.includes('id="detailWeatherAlerts"'));
    assert.ok(html.includes('id="detailToll"'));
    assert.ok(html.includes('href="/michigan-border-wait-times/"'));
    assert.ok(html.includes("/_vercel/insights/script.js"));
    assert.ok(html.includes("/_vercel/speed-insights/script.js"));
    assert.doesNotMatch(html, /"@type"\s*:\s*"FAQPage"/);
    assert.ok(html.replace(/<[^>]+>/g, " ").split(/\s+/).length > 500, `${route} is too thin`);
    assert.equal(jsonLd(html).length, 1);
  }
  assert.equal(titles.size, 5);
  assert.equal(descriptions.size, 5);
});

test("the Sault page has operator live cameras and U.P.-specific travel context", () => {
  const html = readFileSync(
    path.join(root, "public/sault-ste-marie-border-wait-time/index.html"),
    "utf8",
  );
  assert.match(html, /Michigan’s Upper Peninsula border crossing/);
  assert.match(html, /I-75 ↔ Highway 17/);
  assert.match(html, /official live video/i);
  assert.ok(html.includes("https://www.saultbridge.com/live-cameras/"));
  assert.ok(html.includes('data-camera-id="sault-ontario-approach"'));
  assert.ok(html.includes('href="/mackinac-bridge-live/"'));
  assert.ok(html.includes('href="/soo-locks/"'));
});

test("the hero stays text-first while the public-domain photograph remains a social preview asset", () => {
  const imagePath = path.join(root, "public/assets/search/michigan-border-crossings.jpg");
  const image = readFileSync(imagePath);
  const hash = createHash("sha256").update(image).digest("hex");
  assert.equal(hash, "aa9eaba167b723c747f1438b42a4e70663ac7c90930490d461af7fde1815176e");
  assert.equal(image.length, 203972);
  for (const route of ["michigan-border-wait-times", ...Object.keys(detailRoutes)]) {
    const html = readFileSync(path.join(root, "public", route, "index.html"), "utf8");
    assert.doesNotMatch(html, /class="hero-figure"/, `${route} still has a visible hero photo`);
    assert.ok(
      html.includes(
        '<meta property="og:image" content="https://chrisizworski.com/assets/search/michigan-border-crossings.jpg">',
      ),
      `${route} lost its social preview image`,
    );
  }
  assert.doesNotMatch(css, /\.hero-figure/);
  assert.ok(statSync(path.join(root, "public/assets/michigan-border-crossings.js")).size < 75_000);
  assert.ok(statSync(path.join(root, "public/assets/michigan-border-crossings.css")).size < 90_000);
  assert.ok(css.includes("@media (max-width: 430px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
});

test("border cluster is discoverable from hubs, sitemaps, machine-readable guidance, and contextual pages", () => {
  const tools = readFileSync(path.join(root, "public/tools/index.html"), "utf8");
  const greatLakes = readFileSync(path.join(root, "public/great-lakes/index.html"), "utf8");
  const home = readFileSync(path.join(root, "public/index.html"), "utf8");
  const sitemap = readFileSync(path.join(root, "public/sitemap.xml"), "utf8");
  const imageSitemap = readFileSync(path.join(root, "public/image-sitemap.xml"), "utf8");
  const llms = readFileSync(path.join(root, "public/llms.txt"), "utf8");
  const soo = readFileSync(path.join(root, "public/soo-locks/index.html"), "utf8");

  assert.ok(tools.includes('data-featured-tool="michigan-border-wait-times"'));
  assert.ok(greatLakes.includes('data-featured-tool="michigan-border-wait-times"'));
  assert.ok(home.includes("/michigan-border-wait-times/"));
  assert.ok(soo.includes("/sault-ste-marie-border-wait-time/"));
  for (const route of ["michigan-border-wait-times", ...Object.keys(detailRoutes)]) {
    assert.ok(sitemap.includes(`https://chrisizworski.com/${route}/`), `${route} missing sitemap`);
    assert.ok(
      imageSitemap.includes(`https://chrisizworski.com/${route}/`),
      `${route} missing image sitemap`,
    );
    assert.ok(llms.includes(`https://chrisizworski.com/${route}/`), `${route} missing llms.txt`);
  }
});
