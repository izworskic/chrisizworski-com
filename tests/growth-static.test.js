const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("100x benchmark reconciles to the supplied Search Console baseline", () => {
  const benchmark = JSON.parse(read("benchmarks/growth-100x-baseline.json"));
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  const current = benchmark.measurement.current28Days;
  const target = benchmark.milestones.find((item) => item.name === "100x north star");

  assert.equal(current.impressions, 21335);
  assert.equal(current.clicks, 284);
  assert.ok(Math.abs(current.ctr - current.clicks / current.impressions) < 0.000001);
  assert.equal(target.impressionsPerDay, Math.round((current.impressions / 28) * 100));
  assert.equal(target.monthlyGoogleClicks, Math.round(target.impressionsPerDay * 30 * target.ctr));
  assert.equal(benchmark.measurement.verifiedMaxDailyImpressions, 2056);
  assert.notEqual(current.dailyImpressions, benchmark.measurement.unverifiedClaimedMaxDailyImpressions);
  assert.equal(benchmark.benchmarkVersion, "1.2.0");
  assert.ok(benchmark.priorityPages.some((page) => page.path === "/mackinac-bridge-live/"));
  assert.equal(ledger.status, "retired");
  assert.equal(ledger.operatingMode, "ship-and-observe");
  assert.deepEqual(ledger.activeExperiments, []);
});

test("priority search pages preserve canonicals, direct answers, and internal depth", () => {
  const checks = [
    ["when-to-plant-tomatoes-michigan", "When to Plant Tomatoes in Michigan: 2026 Dates by Region", "tomato-quick-answer"],
    ["michigan-frost-dates", "Michigan Last Frost Dates by City: 2026 Planting Calendar", "frost-quick-answer"],
    ["saginaw-bay-ecology", "How Deep Is Saginaw Bay? Depth, Ecology &amp; Fishing", "saginaw-depth-answer"],
    ["northern-lights-michigan", "Northern Lights Michigan Tonight: Aurora | Chris Izworski", "aurora-static-answer"],
    ["soo-locks", "Soo Locks Schedule Today: Ships &amp; Map | Chris Izworski", "soo-schedule-answer"],
    ["mackinac-bridge-live", "Is the Mackinac Bridge Open Today? Live Status &amp; Cameras", "mackinac-conditions-answer"],
  ];

  for (const [route, title, answerId] of checks) {
    const html = read(`public/${route}/index.html`);
    assert.ok(html.includes(`<title>${title}</title>`), route);
    assert.ok(html.includes(`<link rel="canonical" href="https://chrisizworski.com/${route}/">`), route);
    assert.ok(html.includes(`id="${answerId}"`), route);
    assert.ok(html.includes("data-growth-cta="), route);
    assert.ok(!html.includes('href="/advertise/"'), `${route} should not solicit sponsors before proof`);
    assert.ok(html.includes('/assets/growth-cta.js'), route);
  }
});

test("Aurora and Soo answers remain useful and source-safe before or outside client data", () => {
  const aurora = read("public/northern-lights-michigan/index.html");
  assert.ok(aurora.includes("Kp below 5 usually means low odds"));
  assert.ok(aurora.includes("never treat a forecast as a visibility guarantee"));
  assert.ok(aurora.includes("Michigan aurora forecast by region tonight"));
  assert.ok(aurora.includes("fetch('/api/aurora'"));
  assert.ok(!aurora.includes('id="tonightHeadline" style="margin:0 0 10px;border:0;padding:0">Loading'));

  const soo = read("public/soo-locks/index.html");
  assert.ok(soo.includes("https://ais.boatnerd.com/passage/port/soo-locks"));
  assert.ok(soo.includes("tel:+19062021333"));
  assert.ok(soo.includes("does not copy or republish a third party's schedule") || soo.includes("rather than copying its named-vessel schedule"));
  assert.ok(!soo.includes("Soo-Locks-Schedule/"));
});

test("ad-first execution plan stays internal and measurable", () => {
  const benchmark = JSON.parse(read("benchmarks/growth-100x-baseline.json"));
  const plan = read("docs/adsense-launch-plan.md");
  const connect = read("public/connect/index.html");
  const sitemap = read("public/sitemap.xml");
  const tracker = read("public/assets/growth-cta.js");

  assert.deepEqual(benchmark.revenueModel.sequence, ["search growth", "Google AdSense", "post-proof sponsorships"]);
  assert.equal(benchmark.revenueModel.adsense.internalEconomicGate.measuredMonthlyPageviews, 10000);
  assert.equal(benchmark.revenueModel.sponsorshipGate.measuredMonthlyPageviews, 25000);
  assert.ok(plan.includes("10,000 measured pageviews"));
  assert.ok(plan.includes("25,000 measured monthly pageviews"));
  assert.ok(!plan.includes("ca-pub-"));
  assert.ok(!connect.includes("advertising roadmap"));
  for (const route of ["advertise", "disclosure", "privacy"]) {
    assert.ok(!existsSync(path.join(__dirname, "..", "public", route, "index.html")), route);
    assert.ok(!sitemap.includes(`https://chrisizworski.com/${route}/`), route);
  }
  assert.ok(tracker.includes('name: "Growth CTA"'));
  assert.ok(!tracker.includes("localStorage"));
  assert.ok(!tracker.includes("document.cookie"));
});

test("FVF and birding form measurable internal growth clusters", () => {
  const fvf = read("public/chris-izworski-freighter-view-farms/index.html");
  const gardening = read("public/michigan-gardening/index.html");
  const birding = read("public/great-lakes-birding/index.html");

  assert.ok(fvf.includes("Freighter View Farms: Michigan Zone 6a Garden"));
  assert.ok(fvf.includes('href="/michigan-gardening/"'));
  assert.ok(fvf.includes('href="/when-to-plant-tomatoes-michigan/"'));
  assert.ok(fvf.includes('href="/michigan-frost-dates/"'));
  assert.ok(gardening.includes('href="/chris-izworski-freighter-view-farms/"'));
  assert.ok(birding.includes('id="birding-quick-answer"'));
  assert.ok((birding.match(/href="https:\/\/birding\.chrisizworski\.com\/"/g) || []).length >= 2);
  assert.ok(fvf.includes('/assets/growth-cta.js'));
  assert.ok(birding.includes('/assets/growth-cta.js'));
});

test("JSON-LD remains valid on every changed page", () => {
  const routes = [
    "connect",
    "chris-izworski-freighter-view-farms",
    "michigan-gardening",
    "great-lakes-birding",
    "when-to-plant-tomatoes-michigan",
    "michigan-frost-dates",
    "saginaw-bay-ecology",
    "northern-lights-michigan",
    "soo-locks",
    "mackinac-bridge-live",
  ];

  for (const route of routes) {
    const html = read(`public/${route}/index.html`);
    const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(blocks.length > 0, `${route} needs JSON-LD`);
    for (const block of blocks) assert.doesNotThrow(() => JSON.parse(block[1]), route);
  }
});
