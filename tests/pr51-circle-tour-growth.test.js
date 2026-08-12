const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const circleTour = read("public/lake-superior-circle-tour/index.html");
const planner = read("public/assets/lake-superior-circle-tour.js");
const mapModule = read("public/assets/lake-superior-circle-tour-map.js");

function sitemapLastmod(sitemap, route) {
  const loc = `<loc>https://chrisizworski.com${route}</loc>`;
  const offset = sitemap.indexOf(loc);
  assert.notEqual(offset, -1, `${route} is missing from sitemap.xml`);
  return (sitemap.slice(offset, offset + 220).match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/) || [])[1];
}

function itineraryDays(days) {
  const start = circleTour.indexOf(`id="itin-${days}"`);
  const next = days === 7 ? circleTour.indexOf('id="itin-10"') : days === 10 ? circleTour.indexOf('id="itin-15"') : circleTour.indexOf('<div class="section-note">', start);
  assert.ok(start > 0 && next > start, `${days}-day itinerary boundaries are missing`);
  return Array.from(circleTour.slice(start, next).matchAll(/class="itin-day" data-day="(\d+)" data-stops="([\d,]+)" data-miles="(\d+)"/g), (match) => ({
    day: Number(match[1]),
    stops: match[2].split(","),
    miles: Number(match[3]),
  }));
}

test("Circle Tour search framing matches map and itinerary intent", () => {
  const titleMarkup = (circleTour.match(/<title>(.*?)<\/title>/s) || [])[1] || "";
  const title = titleMarkup.replaceAll("&amp;", "&");
  const description = (circleTour.match(/<meta name="description" content="([^"]+)">/) || [])[1] || "";

  assert.equal(title, "Lake Superior Circle Tour Map: 7–15 Days | Chris Izworski");
  assert.ok(title.length <= 60, `Circle Tour title is ${title.length} characters`);
  assert.ok(description.length <= 158, `Circle Tour description is ${description.length} characters`);
  assert.match(description, /interactive 1,300-mile.*7-, 10-, and 15-day.*31-stop trip without an account/);
  assert.ok(circleTour.includes("<h1>Lake Superior Circle Tour Map &amp; Itinerary Planner</h1>"));
  assert.ok(circleTour.includes('<link rel="canonical" href="https://chrisizworski.com/lake-superior-circle-tour/">'));
  assert.match(circleTour, /og:image" content="https:\/\/chrisizworski\.com\/assets\/search\/lake-superior-circle-tour-map\.png"/);
  assert.ok(read("public/assets/search/lake-superior-circle-tour-map.png").length > 50000);
});

test("the useful map and direct answer precede live conditions", () => {
  const answerOffset = circleTour.indexOf('id="circle-tour-answer"');
  const mapOffset = circleTour.indexOf('id="circleTourMap"');
  const liveOffset = circleTour.indexOf('class="live-strip"');

  assert.ok(answerOffset > 0, "Circle Tour direct answer is missing");
  assert.ok(answerOffset < mapOffset && mapOffset < liveOffset, "The planner and map must precede live conditions");
  assert.match(circleTour, /Plan on 7 to 15 days for the roughly 1,300-mile loop/);
  assert.ok(circleTour.includes('data-preset="7"'));
  assert.ok(circleTour.includes('data-preset="10"'));
  assert.ok(circleTour.includes('data-preset="15"'));
  assert.ok(circleTour.includes('data-direction="counterclockwise"'));
  assert.ok(circleTour.includes('data-direction="clockwise"'));
  assert.ok(circleTour.includes('href="#segTabs"'));
});

test("the map uses pinned, lazy, attribution-friendly resources and local route data", () => {
  const coordinates = JSON.parse(mapModule.match(/const STOP_COORDINATES = (\{[\s\S]*?\});/)[1]);
  const order = JSON.parse(mapModule.match(/const ROUTE_ORDER = (\[[^;]+\]);/)[1]);
  const geometry = JSON.parse(mapModule.match(/const ROUTE_GEOMETRY = (\[[\s\S]*?\]);/)[1]);

  assert.equal(Object.keys(coordinates).length, 31);
  assert.equal(order.length, 31);
  assert.equal(new Set(order).size, 31);
  assert.deepEqual(order.slice(0, 6), ["1", "2", "3", "4", "5", "6"]);
  assert.deepEqual(order.slice(-5), ["26", "27", "28", "29", "30"]);
  assert.ok(geometry.length > 100, "Route geometry is too coarse");
  assert.match(mapModule, /MAPLIBRE_VERSION = "6\.3\.0"/);
  assert.match(mapModule, /tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(mapModule, /cooperativeGestures: true/);
  assert.match(planner, /IntersectionObserver/);
  assert.match(planner, /import\("\/assets\/lake-superior-circle-tour-map\.js"\)/);
  assert.doesNotMatch(mapModule, /tile\.openstreetmap\.org|nominatim|router\.project-osrm/);
});

test("all written itineraries form a continuous full loop", () => {
  for (const expectedDays of [7, 10, 15]) {
    const days = itineraryDays(expectedDays);
    assert.equal(days.length, expectedDays);
    assert.deepEqual(days.map((day) => day.day), Array.from({length: expectedDays}, (_, index) => index + 1));
    assert.equal(days[0].stops[0], "1");
    assert.equal(days.at(-1).stops.at(-1), "30");
    for (let index = 1; index < days.length; index += 1) {
      assert.equal(days[index - 1].stops.at(-1), days[index].stops[0], `${expectedDays}-day route breaks between days ${index} and ${index + 1}`);
    }
    const routeStops = new Set(days.flatMap((day) => day.stops));
    assert.equal(routeStops.size, 31);
    assert.ok(days.reduce((sum, day) => sum + day.miles, 0) >= 1350);
  }
  assert.equal((circleTour.match(/class="stop-card"/g) || []).length, 31);
  assert.equal((circleTour.match(/class="add-btn"/g) || []).length, 31);
  assert.deepEqual(Array.from(circleTour.matchAll(/<article class="stop-card" id="stop-(\d+)"/g), (match) => match[1]),
    ["1","2","3","4","5","6","7","8","9","10","11","12","31","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"]);
});

test("visible and structured direction and border guidance agree", () => {
  const direction = "Counterclockwise from Duluth runs through Wisconsin, Michigan's Upper Peninsula, Ontario, and Minnesota before returning to Duluth. Clockwise reverses that order. Both work; the itineraries and map on this page default to counterclockwise.";
  const border = "The full route crosses the U.S.–Canada border at Pigeon River and Sault Ste. Marie. Entry documents depend on citizenship and direction. U.S. citizens returning by land need a WHTI-compliant document; Canada recommends a valid passport and publishes additional identification guidance. Verify current CBP and CBSA rules before departure. Declare every firearm and confirm its Canadian classification and authorization requirements.";

  assert.equal((circleTour.match(new RegExp(direction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 2);
  assert.equal((circleTour.match(new RegExp(border.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 2);
  assert.match(circleTour, /Duluth → Wisconsin → Michigan's Upper Peninsula → Ontario → Minnesota → Duluth/);
  assert.doesNotMatch(circleTour, /Duluth → Wisconsin → Minnesota|north through Minnesota|10–14 day/);
  assert.ok(circleTour.includes("https://www.cbp.gov/travel/us-citizens/western-hemisphere-travel-initiative"));
  assert.ok(circleTour.includes("https://www.cbsa-asfc.gc.ca/travel-voyage/td-dv-eng.html"));
  assert.ok(circleTour.includes("https://www.cbsa-asfc.gc.ca/import/iefw-iefa-eng.html"));
  assert.doesNotMatch(circleTour, /No handguns are permitted|Passport or passport card required for all adults/);
});

test("the planner remains usable on mobile and creates shareable plans without browser storage", () => {
  assert.ok(circleTour.includes('id="mobileTripTrigger"'));
  assert.ok(circleTour.includes('id="mobileTripSheet"'));
  assert.ok(circleTour.includes('id="mobileTripList"'));
  assert.match(circleTour, /\.map-frame\{[^}]*height:clamp\(380px,52vh,560px\)/);
  assert.match(circleTour, /height:clamp\(340px,46vh,480px\)/);
  assert.match(circleTour, /height:clamp\(300px,42vh,390px\)/);
  assert.match(circleTour, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(planner, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(planner, /history\.replaceState/);
  assert.match(planner, /navigator\.share/);
  assert.match(planner, /navigator\.clipboard/);
  assert.match(planner, /event\.key !== "Tab"/);
  assert.match(planner, /google\.com\/maps\/dir/);
  assert.doesNotMatch(circleTour + planner + mapModule, /localStorage|sessionStorage|document\.cookie/);
});

test("Circle Tour analytics separates meaningful planner actions", () => {
  const analytics = circleTour.indexOf('/_vercel/insights/script.js');
  const tracker = circleTour.indexOf('/assets/growth-cta.js');
  const scripts = planner + mapModule;

  assert.ok(analytics >= 0, "Circle Tour is missing Vercel Web Analytics");
  assert.ok(circleTour.includes('/_vercel/speed-insights/script.js'));
  assert.ok(tracker > analytics, "Circle Tour must load Analytics before the CTA tracker");
  assert.ok(circleTour.includes('data-analytics-page="lake-superior-circle-tour"'));
  for (const action of ["planner-start","stop-add","region-filter","activity-filter","sample-itinerary","map-marker-open","preset-use","direction-change","directions-open","trip-share","mobile-trip-open","print-itinerary"]) {
    assert.ok(scripts.includes(`"${action}"`), `Circle Tour is missing ${action} tracking`);
  }
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

test("the experiment records search and pageview metrics separately", () => {
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  const experiment = ledger.experiments.find((item) => item.id === "2026-08-12-lake-superior-circle-tour-intent");

  assert.deepEqual(experiment.baseline, {impressions: 1005, clicks: 4, ctr: 0.004, averagePosition: 17.52});
  assert.deepEqual(experiment.target, {
    ctr: 0.015,
    averagePosition: 15,
    mapInteractionRate: 0.15,
    plannerStartRate: 0.05,
    itinerarySelectionRate: 0.08,
    plannerCompletionRate: 0.02,
  });
  assert.equal(experiment.engagementBaseline.measuredPageviews, null);
  assert.equal(experiment.engagementBaseline.mapInteractions, null);
  assert.match(experiment.distributionMeasurement.measurement, /distinct from Search Console clicks and measured pageviews/);
  assert.equal(experiment.status, "pending-clean-window");
  assert.equal(experiment.releaseDate, null);
  assert.equal(experiment.evaluationWindow, null);
});

test("Circle Tour structured and sitemap freshness agree", () => {
  const jsonLd = JSON.parse(circleTour.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const article = jsonLd["@graph"].find((node) => node["@type"] === "Article");
  const sitemap = read("public/sitemap.xml");

  assert.equal(article.dateModified, "2026-08-12");
  assert.equal(article.headline, "Lake Superior Circle Tour Map and 7-, 10-, and 15-Day Itineraries");
  assert.equal(sitemapLastmod(sitemap, "/lake-superior-circle-tour/"), article.dateModified);
});
