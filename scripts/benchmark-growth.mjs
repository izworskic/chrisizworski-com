#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const exists = async (file) => {
  try {
    await stat(path.join(root, file));
    return true;
  } catch {
    return false;
  }
};

const benchmark = JSON.parse(await read("benchmarks/growth-100x-baseline.json"));
const ledger = JSON.parse(await read("benchmarks/growth-experiments.json"));
const gazetteBenchmark = JSON.parse(await read("benchmarks/gazette-daily-growth.json"));
const sitemap = await read("public/sitemap.xml");
const failures = [];

function check(name, passed, detail = "") {
  if (!passed) failures.push(detail ? `${name}: ${detail}` : name);
}

function nearlyEqual(a, b, tolerance = 0.000001) {
  return Math.abs(a - b) <= tolerance;
}

function daysBetween(start, end) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
}

const current = benchmark.measurement.current28Days;
const previous = benchmark.measurement.previous28Days;
const hundredX = benchmark.milestones.find((milestone) => milestone.name === "100x north star");

check(
  "Current 28-day daily impressions reconcile",
  nearlyEqual(current.dailyImpressions, current.impressions / current.days),
);
check(
  "Current 28-day daily clicks reconcile",
  nearlyEqual(current.dailyClicks, current.clicks / current.days),
);
check("Current CTR reconciles", nearlyEqual(current.ctr, current.clicks / current.impressions));
check(
  "Previous CTR reconciles",
  nearlyEqual(previous.ctr, previous.clicks / previous.impressions),
);
check(
  "100x target is derived from the verified daily baseline",
  hundredX.impressionsPerDay === Math.round(current.dailyImpressions * 100),
);
check(
  "100x monthly clicks reconcile",
  hundredX.monthlyGoogleClicks === Math.round(hundredX.impressionsPerDay * 30 * hundredX.ctr),
);
check(
  "Unverified 12,000-impression claim is not the benchmark baseline",
  current.dailyImpressions !== benchmark.measurement.unverifiedClaimedMaxDailyImpressions,
);
check(
  "Every priority page has one experiment",
  benchmark.priorityPages.every((page) =>
    ledger.experiments.some((experiment) => experiment.path === page.path),
  ),
);
check(
  "Experiment protocol requires a clean 28-day window",
  ledger.measurementProtocol?.windowDays === 28 &&
    ledger.measurementProtocol?.startOffsetDays === 1,
);
for (const experiment of ledger.experiments) {
  if (experiment.status === "running") {
    check(
      `${experiment.id} has a valid running window`,
      Boolean(experiment.releaseDate && experiment.evaluationWindow) &&
        daysBetween(experiment.releaseDate, experiment.evaluationWindow.start) === 1 &&
        daysBetween(experiment.evaluationWindow.start, experiment.evaluationWindow.end) + 1 === 28,
    );
  }
  if (experiment.status === "pending-clean-window") {
    check(
      `${experiment.id} does not claim an unreleased measurement window`,
      experiment.releaseDate === null &&
        experiment.evaluationWindow === null &&
        Boolean(experiment.lastSearchFacingChangeDate),
    );
  }
}
check(
  "Monetization sequence is ad-first",
  benchmark.revenueModel.sequence.join("|") === "search growth|Google AdSense|post-proof sponsorships",
);
check(
  "AdSense economic gate requires measured pageviews",
  benchmark.revenueModel.adsense.internalEconomicGate.measuredMonthlyPageviews === 10000 &&
    benchmark.revenueModel.adsense.internalEconomicGate.minimumSearchCtr === 0.025,
);
check(
  "Sponsorship is deferred until measured proof",
  benchmark.revenueModel.sponsorshipGate.status === "deferred-until-proof" &&
    benchmark.revenueModel.sponsorshipGate.measuredMonthlyPageviews === 25000 &&
    benchmark.revenueModel.sponsorshipGate.consecutiveMonths === 3,
);
for (const scenario of benchmark.revenueModel.modeledMonthlyScenarios) {
  const expected = [3, 8, 15].map((rpm) => Math.round((scenario.modeledPageviews * rpm) / 1000));
  check(
    `${scenario.milestone} page-RPM scenarios reconcile`,
    scenario.displayAdRevenue.low === expected[0] &&
      scenario.displayAdRevenue.base === expected[1] &&
      scenario.displayAdRevenue.high === expected[2],
  );
}

const pageChecks = [
  {
    file: "public/when-to-plant-tomatoes-michigan/index.html",
    path: "/when-to-plant-tomatoes-michigan/",
    title: "When to Plant Tomatoes in Michigan: 2026 Dates by Region",
    marker: 'id="tomato-quick-answer"',
  },
  {
    file: "public/michigan-frost-dates/index.html",
    path: "/michigan-frost-dates/",
    title: "Michigan Last Frost Dates by City: 2026 Planting Calendar",
    marker: 'id="frost-quick-answer"',
  },
  {
    file: "public/saginaw-bay-ecology/index.html",
    path: "/saginaw-bay-ecology/",
    title: "How Deep Is Saginaw Bay? Depth, Ecology &amp; Fishing",
    marker: 'id="saginaw-depth-answer"',
  },
  {
    file: "public/northern-lights-michigan/index.html",
    path: "/northern-lights-michigan/",
    title: "Northern Lights Michigan Tonight: Aurora | Chris Izworski",
    marker: 'id="aurora-static-answer"',
  },
  {
    file: "public/soo-locks/index.html",
    path: "/soo-locks/",
    title: "Soo Locks Schedule Today: Ships &amp; Map | Chris Izworski",
    marker: 'id="soo-schedule-answer"',
  },
  {
    file: "public/mackinac-bridge-live/index.html",
    path: "/mackinac-bridge-live/",
    title: "Is the Mackinac Bridge Open Today? Live Status &amp; Cameras",
    marker: 'id="mackinac-conditions-answer"',
  },
];

const pages = {};
for (const page of pageChecks) {
  const html = await read(page.file);
  pages[page.path] = {
    titleReady: html.includes(`<title>${page.title}</title>`),
    firstAnswerReady: html.includes(page.marker),
    canonicalPreserved: html.includes(
      `<link rel="canonical" href="https://chrisizworski.com${page.path}">`,
    ),
    internalDepthReady: html.includes("data-growth-cta=") && !html.includes('href="/advertise/"'),
    growthTrackingReady: html.includes('/assets/growth-cta.js'),
  };
  for (const [key, passed] of Object.entries(pages[page.path])) {
    check(`${page.path} ${key}`, passed);
  }
}

check("Growth CTA tracker exists", await exists("public/assets/growth-cta.js"));
check("Aurora same-origin endpoint exists", await exists("api/aurora.js"));
check("Aurora source-normalization module exists", await exists("lib/aurora.js"));
const aurora = await read("public/northern-lights-michigan/index.html");
const auroraApi = await read("api/aurora.js");
const soo = await read("public/soo-locks/index.html");
check(
  "Aurora build exposes regional answers and fail-soft authoritative planning data",
  aurora.includes("Michigan aurora forecast by region tonight") &&
    aurora.includes('id="regionSelect"') &&
    aurora.includes('id="nextBestWindow"') &&
    aurora.includes("fetch('/api/aurora'") &&
    auroraApi.includes("Promise.allSettled") &&
    auroraApi.includes("api.weather.gov/gridpoints") &&
    auroraApi.includes("aa.usno.navy.mil/api") &&
    auroraApi.includes("stale-while-revalidate=900"),
);
check(
  "Soo schedule build uses legitimate current sources",
  soo.includes("https://ais.boatnerd.com/passage/port/soo-locks") &&
    soo.includes("tel:+19062021333") &&
    !soo.includes("Soo-Locks-Schedule/"),
);
const adsensePlan = await read("docs/adsense-launch-plan.md");
const fvf = await read("public/chris-izworski-freighter-view-farms/index.html");
const birding = await read("public/great-lakes-birding/index.html");
check(
  "AdSense execution plan stays internal and contains the measured gate",
  adsensePlan.includes("10,000 measured pageviews") && adsensePlan.includes("25,000 measured monthly pageviews"),
);
for (const route of ["advertise", "disclosure", "privacy"]) {
  check(`/${route}/ strategy page is not published`, !(await exists(`public/${route}/index.html`)));
  check(`/${route}/ is absent from the sitemap`, !sitemap.includes(`https://chrisizworski.com/${route}/`));
}
check("No placeholder Google publisher ID exists", !adsensePlan.includes("ca-pub-"));
check(
  "FVF authority page links the gardening cluster",
  ["/michigan-gardening/", "/when-to-plant-tomatoes-michigan/", "/michigan-frost-dates/"].every((href) =>
    fvf.includes(`href="${href}"`),
  ),
);
check(
  "Birding guide links the live birding tool and exposes a first answer",
  birding.includes('id="birding-quick-answer"') &&
    (birding.match(/href="https:\/\/birding\.chrisizworski\.com\/"/g) || []).length >= 2,
);

const gazetteExperiment = ledger.experiments.find(
  (experiment) => experiment.id === "2026-08-03-great-lakes-gazette-daily",
);
const gazetteLanding = await read("public/great-lakes-gazette/index.html");
const gazetteDistribution = await Promise.all(
  gazetteBenchmark.scope.distributionPages.map(async (route) => {
    const file = route === "/" ? "public/index.html" : `public${route}index.html`;
    return read(file);
  }),
);
check(
  "Gazette search baseline remains unknown rather than fabricated",
  gazetteBenchmark.baseline.searchConsole.landingPageImpressions === null &&
    gazetteBenchmark.baseline.searchConsole.status === "not-isolated-in-visible-export",
);
check(
  "Gazette landing matches daily shipping-news intent",
  gazetteLanding.includes("<title>Great Lakes Shipping News Today | Chris Izworski</title>") &&
    gazetteLanding.includes("A Newspaper, Not Another Dashboard") &&
    gazetteLanding.includes("https://gazette.chrisizworski.com/archive"),
);
check(
  "Gazette current headline is distributed across six relevant pages",
  gazetteDistribution.length === 6 &&
    gazetteDistribution.every((html) => html.includes("data-gazette-latest")),
);
check(
  "Gazette experiment gates reliability and engagement",
  gazetteExperiment?.target?.dailyAvailability === 1 &&
    gazetteExperiment?.target?.widgetEditionOpenRate === 0.02,
);

const report = {
  status: failures.length ? "failed" : "passed",
  baseline: {
    periodEnding: current.end,
    impressions: current.impressions,
    clicks: current.clicks,
    ctr: current.ctr,
    dailyImpressions: current.dailyImpressions,
  },
  northStar: hundredX,
  pages,
  experimentsReady: ledger.experiments.length,
  failures,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (process.argv.includes("--check") && failures.length) process.exitCode = 1;
