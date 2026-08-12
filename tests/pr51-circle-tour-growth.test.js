const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const circleTour = read("public/lake-superior-circle-tour/index.html");

function sitemapLastmod(sitemap, route) {
  const loc = `<loc>https://chrisizworski.com${route}</loc>`;
  const offset = sitemap.indexOf(loc);
  assert.notEqual(offset, -1, `${route} is missing from sitemap.xml`);
  return (sitemap.slice(offset, offset + 220).match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/) || [])[1];
}

test("Circle Tour search framing is concise and preserves entity signals", () => {
  const titleMarkup = (circleTour.match(/<title>(.*?)<\/title>/s) || [])[1] || "";
  const title = titleMarkup.replaceAll("&amp;", "&");
  const description = (circleTour.match(/<meta name="description" content="([^"]+)">/) || [])[1] || "";

  assert.equal(title, "Lake Superior Circle Tour Itinerary & Map | Chris Izworski");
  assert.ok(title.length <= 60, `Circle Tour title is ${title.length} characters`);
  assert.ok(description.length <= 158, `Circle Tour description is ${description.length} characters`);
  assert.match(description, /three itineraries, 31 stops/);
  assert.ok(circleTour.includes("<h1>Lake Superior Circle Tour Itinerary &amp; Interactive Map</h1>"));
  assert.ok(circleTour.includes('<link rel="canonical" href="https://chrisizworski.com/lake-superior-circle-tour/">'));
});

test("the direct route answer appears before live conditions and gives honest durations", () => {
  const answerOffset = circleTour.indexOf('id="circle-tour-answer"');
  const liveOffset = circleTour.indexOf('class="live-strip"');

  assert.ok(answerOffset > 0, "Circle Tour direct answer is missing");
  assert.ok(answerOffset < liveOffset, "Circle Tour direct answer must precede live conditions");
  assert.ok(circleTour.includes("Plan on 7 to 15 days for the roughly 1,300-mile loop"));
  assert.ok(circleTour.includes("Seven days covers the highlights, 10 days gives most travelers a balanced trip"));
  assert.ok(circleTour.includes('href="#circle-tour-itineraries"'));
  assert.ok(circleTour.includes('href="#segTabs"'));
});

test("the visible and structured border answers use current official-source framing", () => {
  const answer = "The full route crosses the U.S.–Canada border at Pigeon River and Sault Ste. Marie. Entry documents depend on citizenship and direction. U.S. citizens returning by land need a WHTI-compliant document; Canada recommends a valid passport and publishes additional identification guidance. Verify current CBP and CBSA rules before departure. Declare every firearm and confirm its Canadian classification and authorization requirements.";

  assert.equal((circleTour.match(new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 2);
  assert.ok(circleTour.includes("https://www.cbp.gov/travel/us-citizens/western-hemisphere-travel-initiative"));
  assert.ok(circleTour.includes("https://www.cbsa-asfc.gc.ca/travel-voyage/td-dv-eng.html"));
  assert.ok(circleTour.includes("https://www.cbsa-asfc.gc.ca/import/iefw-iefa-eng.html"));
  assert.doesNotMatch(circleTour, /No handguns are permitted|No handguns permitted/);
  assert.doesNotMatch(circleTour, /Passport or passport card required for all adults/);
});

test("the 15-day label matches the actual itinerary without shrinking the tool", () => {
  assert.ok(circleTour.includes("Chris's Itineraries, 7-Day, 10-Day, and 15-Day"));
  assert.ok(circleTour.includes('data-itin="15"'));
  assert.ok(circleTour.includes('id="itin-15"'));
  assert.ok(circleTour.includes('<span class="day-label">Day 15, 230 mi</span>'));
  assert.doesNotMatch(circleTour, /14-Day Chris's Pick|id="itin-14"/);
  assert.equal((circleTour.match(/class="stop-card"/g) || []).length, 31);
  assert.equal((circleTour.match(/class="add-btn"/g) || []).length, 31);
  assert.ok(circleTour.includes("station=9099064"));
  assert.ok(circleTour.includes("datum=LWD"));
});

test("Circle Tour analytics measures planner use without browser storage", () => {
  const analytics = circleTour.indexOf('/_vercel/insights/script.js');
  const tracker = circleTour.indexOf('/assets/growth-cta.js');

  assert.ok(analytics >= 0, "Circle Tour is missing Vercel Web Analytics");
  assert.ok(circleTour.includes('/_vercel/speed-insights/script.js'));
  assert.ok(tracker > analytics, "Circle Tour must load Analytics before the CTA tracker");
  assert.ok(circleTour.includes('data-analytics-page="lake-superior-circle-tour"'));
  for (const action of [
    "planner-start",
    "stop-add",
    "region-filter",
    "activity-filter",
    "sample-itinerary",
    "print-itinerary",
  ]) {
    assert.ok(circleTour.includes(`'${action}'`), `Circle Tour is missing ${action} tracking`);
  }
  assert.doesNotMatch(circleTour, /localStorage|sessionStorage|document\.cookie/);
});

test("existing high-relevance inbound links are measurable and accurate", () => {
  const sources = [
    ["public/index.html", 'data-growth-cta="home-circle-tour"'],
    ["public/guides/index.html", 'data-growth-cta="guides-circle-tour"'],
    ["public/great-lakes/index.html", 'data-growth-cta="great-lakes-circle-tour"'],
  ];
  for (const [file, marker] of sources) {
    const html = read(file);
    assert.ok(html.includes(marker), `${file} is missing its Circle Tour measurement marker`);
    assert.ok(html.includes('/assets/growth-cta.js'), `${file} is missing the growth CTA tracker`);
  }
  assert.match(read("public/guides/index.html"), /itineraries \(7, 10, and 15 days\)/);
  assert.match(read("public/great-lakes/index.html"), /itineraries \(7, 10, 15 days\)/);
});

test("the Circle Tour experiment records search and pageview metrics separately", () => {
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  const experiment = ledger.experiments.find(
    (item) => item.id === "2026-08-12-lake-superior-circle-tour-intent",
  );

  assert.deepEqual(experiment.baseline, {
    impressions: 1005,
    clicks: 4,
    ctr: 0.004,
    averagePosition: 17.52,
  });
  assert.deepEqual(experiment.target, {
    ctr: 0.015,
    averagePosition: 15,
    plannerStartRate: 0.03,
    itinerarySelectionRate: 0.05,
  });
  assert.equal(experiment.engagementBaseline.measuredPageviews, null);
  assert.match(experiment.distributionMeasurement.measurement, /distinct from Search Console clicks and measured pageviews/);
  assert.equal(experiment.status, "pending-clean-window");
  assert.equal(experiment.releaseDate, null);
  assert.equal(experiment.evaluationWindow, null);
});

test("Circle Tour structured and sitemap freshness agree", () => {
  const jsonLd = JSON.parse(
    circleTour.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1],
  );
  const article = jsonLd["@graph"].find((node) => node["@type"] === "Article");
  const sitemap = read("public/sitemap.xml");

  assert.equal(article.dateModified, "2026-08-12");
  assert.equal(article.headline, "Lake Superior Circle Tour Itinerary and Interactive Map");
  assert.equal(sitemapLastmod(sitemap, "/lake-superior-circle-tour/"), article.dateModified);
});
