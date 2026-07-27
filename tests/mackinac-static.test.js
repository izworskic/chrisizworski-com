const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = readFileSync(path.join(root, "public/mackinac-bridge-live/index.html"), "utf8");
const css = readFileSync(path.join(root, "public/assets/mackinac-bridge-live.css"), "utf8");
const js = readFileSync(path.join(root, "public/assets/mackinac-bridge-live.js"), "utf8");

test("Mackinac Bridge Live has indexable metadata and valid structured data", () => {
  assert.match(html, /<title>Mackinac Bridge Conditions Live \| Status &amp; Cameras<\/title>/);
  assert.ok(
    html.includes(
      '<link rel="canonical" href="https://chrisizworski.com/mackinac-bridge-live/">',
    ),
  );
  assert.match(html, /name="description" content="[^"]*official status/i);
  assert.ok(html.includes('"@type": "WebApplication"'));
  assert.ok(html.includes('"@type": "Offer"'));
  assert.doesNotMatch(html, /"@type": "FAQPage"/);
  assert.match(html, /og:image:alt" content="Photograph of the Mackinac Bridge/);
  assert.doesNotMatch(html, /Illustrated Mackinac Bridge/i);

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1);
  blocks.forEach((block) => assert.doesNotThrow(() => JSON.parse(block[1])));
});

test("Mackinac Bridge Live contains the complete crossing decision flow", () => {
  assert.ok(html.includes("Will I have trouble crossing?"));
  assert.equal((html.match(/data-vehicle="/g) || []).length, 4);
  assert.equal((html.match(/data-direction="/g) || []).length, 2);
  assert.doesNotMatch(html, /Estimated best crossing window/i);
  assert.ok(html.includes("Mackinac Bridge Webcam"));
  assert.ok(html.includes("Straits of Mackinac Weather Radar"));
  assert.ok(html.includes("Mackinac Bridge Area Hourly Wind Forecast"));
  assert.ok(html.includes("RV, Camper and Trailer Guidance"));
  assert.ok(html.includes("Mackinac Bridge Traffic Today"));
  assert.ok(html.includes("Mackinac Bridge Toll Calculator"));
  assert.ok(html.includes("Nervous about crossing? Bridge staff can drive your vehicle."));
  assert.ok(html.includes("Approach-road incidents and construction"));
  assert.ok(html.includes("Status changes observed by this browser"));
});

test("the SMS text-alert link and share-report button are not present", () => {
  assert.ok(!html.includes("Share crossing report"));
  assert.ok(!html.includes("sms:67283?body=MacBridge"));
  assert.ok(!html.includes('id="shareButton"'));
  assert.ok(!html.includes('id="shareStatus"'));
});

test("the interface makes official status authoritative and nearby wind explicit", () => {
  assert.match(html, /Bridge Authority condition report is the controlling source/i);
  assert.match(html, /Nearby NOAA station/i);
  assert.match(html, /does not publish a real-time bridge-deck wind or gust reading/i);
  assert.doesNotMatch(html, /Official bridge wind/i);
  assert.ok(html.includes('id="windMismatchNotice"'));
  assert.match(html, /Planning aid, not an official safety decision/i);
  assert.ok(js.includes('var API_URL = "/api/mackinac"'));
  assert.ok(js.includes("showWindContextWarning"));
  assert.doesNotMatch(js, /bridge_wind/);
  assert.doesNotMatch(js, /bestWindow|showWindowButton|is-best/);
  assert.ok(js.includes("renderUnavailable"));
  assert.doesNotMatch(js, /title:\s*["']All Clear/i);
  assert.ok(js.includes("Notification.permission"));
});

test("Crossing Confidence is categorical, explainable, and does not use nearby weather as a score", () => {
  assert.ok(html.includes('id="confidenceScore">VERIFY</strong>'));
  assert.ok(html.includes('id="confidenceBasis"'));
  assert.doesNotMatch(html, /\/100/);
  assert.doesNotMatch(js, /confidence\.score|scores\s*=\s*highProfile|--confidence/);
  assert.ok(js.includes('code: "CLEAR"'));
  assert.ok(js.includes('code: "ESCORT"'));
  assert.match(js, /official condition report is unavailable, so this tool will not infer/i);
});

test("vehicle, toll, assistance, approach-road, and history differentiators are wired", () => {
  assert.equal((html.match(/data-vehicle-feature=/g) || []).length, 4);
  assert.equal((html.match(/data-comfort=/g) || []).length, 2);
  assert.ok(js.includes("classifyVehicleFeatures"));
  assert.ok(js.includes("calculateToll"));
  assert.ok(js.includes("renderApproachTraffic"));
  assert.ok(js.includes("recordStatusObservation"));
  assert.ok(js.includes("result.dataset.classification = vehicle"));
  assert.doesNotMatch(js, /result\.dataset\.vehicle\s*=/);
  assert.match(html, /device-local history, not an official Bridge Authority archive/i);
  assert.match(html, /does not publish a live crossing wait-time feed/i);
});

test("the sharing feature (SMS link and share button) was removed by design and stays removed", () => {
  assert.doesNotMatch(js, /navigator\.share|navigator\.clipboard|shareCrossingReport|shareUrl\(\)/);
});

test("the published toll formula handles passenger, trailer, motorhome, and auto-tow cases", () => {
  const start = js.indexOf("function calculateToll(");
  const end = js.indexOf("\n  function renderToll", start);
  const calculateToll = new Function(
    "clamp",
    `${js.slice(start, end)}; return calculateToll;`,
  )((value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value)));

  assert.equal(calculateToll("passenger", 2, 0, false).total, 4);
  assert.equal(calculateToll("passenger", 2, 2, false).total, 8);
  assert.equal(calculateToll("other", 2, 0, false).total, 10);
  assert.equal(calculateToll("other", 2, 2, true).total, 14);
  assert.equal(calculateToll("other", 2, 2, false).total, 20);
});

test("supporting search pages exist, cross-link, and use the real licensed photograph", () => {
  for (const route of [
    "mackinac-bridge-driver-assistance",
    "mackinac-bridge-rv-trailer-wind-rules",
    "mackinac-bridge-tolls",
  ]) {
    const page = readFileSync(path.join(root, "public", route, "index.html"), "utf8");
    assert.ok(page.includes(`https://chrisizworski.com/${route}/`));
    assert.ok(page.includes("/assets/search/mackinac-bridge-live.jpg"));
    assert.ok(page.includes('href="/mackinac-bridge-live/"'));
    assert.match(page, /Tammy Sue, CC0 public domain/);
    assert.doesNotMatch(page, /"@type": "FAQPage"/);
    for (const block of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(block[1]));
    }
  }
});

test("the tool includes official NWS area radar without presenting it as bridge conditions", () => {
  assert.ok(html.includes("https://radar.weather.gov/station/kapx/standard"));
  assert.match(html, /Radar shows precipitation, not bridge wind or crossing status/i);
  assert.ok(html.includes('id="radarImage"'));
  assert.ok(js.includes('/api/mackinac-media?asset=radar'));
  assert.ok(js.includes("The NWS radar loop is temporarily unavailable"));
});

test("northbound and southbound selections stay aligned with distinct camera feeds", () => {
  assert.match(
    js,
    /direction:\s*"northbound",\s*\n\s*camera:\s*"north"/,
  );
  assert.ok(js.includes('state.camera = direction === "southbound" ? "south" : "north"'));
  assert.match(
    html,
    /aria-selected="true"[^>]*data-camera="north">Northbound, Mackinaw City looking north/,
  );
  assert.match(
    html,
    /data-camera="south">Southbound, St\. Ignace looking south/,
  );
  assert.match(
    html,
    /Choosing Northbound or Southbound above selects the matching approach view\./,
  );
  const cameraUrls = [...js.matchAll(/\/api\/mackinac-media\?asset=camera&direction=(?:north|south)/g)].map(
    (match) => match[0],
  );
  assert.equal(new Set(cameraUrls).size, 2);
  assert.doesNotMatch(js, /mackinacbridge\.org\/wp-content\/camimages/);
});

test("the tool is responsive, reduced-motion aware, and analytics ready", () => {
  assert.ok(css.includes("@media (max-width: 680px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(html.includes('href="#main">Skip to bridge conditions</a>'));
  assert.ok(html.includes('/_vercel/insights/script.js'));
  assert.ok(html.includes('/_vercel/speed-insights/script.js'));
  assert.ok(js.includes('name: "Bridge Tool Interaction"'));
});
