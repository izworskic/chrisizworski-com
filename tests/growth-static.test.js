const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("100x benchmark reconciles to the supplied Search Console baseline", () => {
  const benchmark = JSON.parse(read("benchmarks/growth-100x-baseline.json"));
  const current = benchmark.measurement.current28Days;
  const target = benchmark.milestones.find((item) => item.name === "100x north star");

  assert.equal(current.impressions, 21335);
  assert.equal(current.clicks, 284);
  assert.ok(Math.abs(current.ctr - current.clicks / current.impressions) < 0.000001);
  assert.equal(target.impressionsPerDay, Math.round((current.impressions / 28) * 100));
  assert.equal(target.monthlyGoogleClicks, Math.round(target.impressionsPerDay * 30 * target.ctr));
  assert.equal(benchmark.measurement.verifiedMaxDailyImpressions, 2056);
  assert.notEqual(current.dailyImpressions, benchmark.measurement.unverifiedClaimedMaxDailyImpressions);
});

test("priority search pages preserve canonicals and expose direct first answers", () => {
  const checks = [
    ["when-to-plant-tomatoes-michigan", "When to Plant Tomatoes in Michigan: 2026 Dates by Region", "tomato-quick-answer"],
    ["michigan-frost-dates", "Michigan Last Frost Dates by City: 2026 Planting Calendar", "frost-quick-answer"],
    ["saginaw-bay-ecology", "How Deep Is Saginaw Bay? Inner &amp; Outer Bay Depths", "saginaw-depth-answer"],
    ["northern-lights-michigan", "Northern Lights Michigan Tonight | Chris Izworski", "aurora-static-answer"],
    ["soo-locks", "Soo Locks Ship Schedule Today | Chris Izworski", "soo-schedule-answer"],
  ];

  for (const [route, title, answerId] of checks) {
    const html = read(`public/${route}/index.html`);
    assert.ok(html.includes(`<title>${title}</title>`), route);
    assert.ok(html.includes(`<link rel="canonical" href="https://chrisizworski.com/${route}/">`), route);
    assert.ok(html.includes(`id="${answerId}"`), route);
    assert.ok(html.includes('href="/advertise/"'), route);
    assert.ok(html.includes('href="/disclosure/"'), route);
    assert.ok(html.includes('/assets/growth-cta.js'), route);
  }
});

test("Aurora and Soo answers remain useful and source-safe before or outside client data", () => {
  const aurora = read("public/northern-lights-michigan/index.html");
  assert.ok(aurora.includes("Kp below 5 usually means low odds"));
  assert.ok(aurora.includes("never treat a forecast as a visibility guarantee"));
  assert.ok(!aurora.includes('id="tonightHeadline" style="margin:0 0 10px;border:0;padding:0">Loading'));

  const soo = read("public/soo-locks/index.html");
  assert.ok(soo.includes("https://ais.boatnerd.com/passage/port/soo-locks"));
  assert.ok(soo.includes("official USACE visitor schedule"));
  assert.ok(soo.includes("does not copy or republish a third party's schedule"));
});

test("commercial foundation is crawlable, labeled, and measurable", () => {
  const advertise = read("public/advertise/index.html");
  const disclosure = read("public/disclosure/index.html");
  const connect = read("public/connect/index.html");
  const sitemap = read("public/sitemap.xml");
  const tracker = read("public/assets/growth-cta.js");

  assert.ok(advertise.includes("21,335"));
  assert.ok(advertise.includes("Founding tool sponsor"));
  assert.ok(advertise.includes("$500"));
  assert.ok(advertise.includes("Never included"));
  assert.ok(disclosure.includes("labeled near the placement"));
  assert.ok(disclosure.includes("Sponsors do not receive personally identifying visitor data"));
  assert.ok(connect.includes("Sponsorships and Partnerships"));
  assert.ok(sitemap.includes("https://chrisizworski.com/advertise/"));
  assert.ok(sitemap.includes("https://chrisizworski.com/disclosure/"));
  assert.ok(tracker.includes('name: "Growth CTA"'));
  assert.ok(!tracker.includes("localStorage"));
  assert.ok(!tracker.includes("document.cookie"));
});

test("JSON-LD remains valid on every changed page", () => {
  const routes = [
    "advertise",
    "disclosure",
    "connect",
    "when-to-plant-tomatoes-michigan",
    "michigan-frost-dates",
    "saginaw-bay-ecology",
    "northern-lights-michigan",
    "soo-locks",
  ];

  for (const route of routes) {
    const html = read(`public/${route}/index.html`);
    const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(blocks.length > 0, `${route} needs JSON-LD`);
    for (const block of blocks) assert.doesNotThrow(() => JSON.parse(block[1]), route);
  }
});
