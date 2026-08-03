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
const sitemap = await read("public/sitemap.xml");
const failures = [];

function check(name, passed, detail = "") {
  if (!passed) failures.push(detail ? `${name}: ${detail}` : name);
}

function nearlyEqual(a, b, tolerance = 0.000001) {
  return Math.abs(a - b) <= tolerance;
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
    title: "How Deep Is Saginaw Bay? Inner &amp; Outer Bay Depths",
    marker: 'id="saginaw-depth-answer"',
  },
  {
    file: "public/northern-lights-michigan/index.html",
    path: "/northern-lights-michigan/",
    title: "Northern Lights Michigan Tonight | Chris Izworski",
    marker: 'id="aurora-static-answer"',
  },
  {
    file: "public/soo-locks/index.html",
    path: "/soo-locks/",
    title: "Soo Locks Ship Schedule Today | Chris Izworski",
    marker: 'id="soo-schedule-answer"',
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

for (const route of ["advertise", "disclosure", "privacy"]) {
  const file = `public/${route}/index.html`;
  check(`/${route}/ page exists`, await exists(file));
  const html = await read(file);
  check(`/${route}/ canonical`, html.includes(`https://chrisizworski.com/${route}/`));
  check(`/${route}/ sitemap entry`, sitemap.includes(`https://chrisizworski.com/${route}/`));
  check(`/${route}/ analytics`, html.includes('/_vercel/insights/script.js'));
}

check("Growth CTA tracker exists", await exists("public/assets/growth-cta.js"));
const advertise = await read("public/advertise/index.html");
const disclosure = await read("public/disclosure/index.html");
const privacy = await read("public/privacy/index.html");
const fvf = await read("public/chris-izworski-freighter-view-farms/index.html");
const birding = await read("public/great-lakes-birding/index.html");
check("Roadmap states the exact 28-day baseline", advertise.includes("21,335"));
check("Roadmap is explicitly ad-first", advertise.includes("Audience first. Google ads next. Sponsors later."));
check("Roadmap states the measured ad gate", advertise.includes("10,000 measured monthly pageviews"));
check("Roadmap does not sell sponsor packages", !advertise.includes("$500") && !advertise.includes("Founding tool sponsor"));
check("No placeholder Google publisher ID exists", !advertise.includes("ca-pub-") && !privacy.includes("ca-pub-"));
check(
  "Disclosure defers sponsorship and promises visible labeling",
  disclosure.includes("25,000 measured monthly pageviews") && disclosure.includes("labeled near the placement"),
);
check("Privacy page states current no-ad status", privacy.includes("no Google AdSense or other programmatic display-ad network is active"));
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
