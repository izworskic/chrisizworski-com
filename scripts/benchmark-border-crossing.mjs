import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const benchmark = JSON.parse(
  await readFile(path.join(root, "benchmarks/michigan-border-crossing-live.json"), "utf8"),
);
const crossingData = JSON.parse(
  await readFile(path.join(root, "data/border-crossings.json"), "utf8"),
);

const read = (file) => readFile(path.join(root, file), "utf8");
const exists = async (file) => {
  try {
    await stat(path.join(root, file));
    return true;
  } catch {
    return false;
  }
};

const [
  main,
  client,
  css,
  library,
  liveApi,
  trendApi,
  mediaApi,
  sitemap,
  imageSitemap,
  llms,
  tools,
  greatLakes,
  home,
] = await Promise.all([
  read("public/michigan-border-wait-times/index.html"),
  read("public/assets/michigan-border-crossings.js"),
  read("public/assets/michigan-border-crossings.css"),
  read("lib/border-crossings.js"),
  read("api/border-crossings.js"),
  read("api/border-trends.js"),
  read("api/border-media.js"),
  read("public/sitemap.xml"),
  read("public/image-sitemap.xml"),
  read("public/llms.txt"),
  read("public/tools/index.html"),
  read("public/great-lakes/index.html"),
  read("public/index.html"),
]);

const detailRoutes = crossingData.crossings.map((crossing) =>
  crossing.detail_path.replace(/^\/|\/$/g, ""),
);
const detailPages = await Promise.all(
  detailRoutes.map((route) => read(`public/${route}/index.html`)),
);
const jsBytes = (await stat(path.join(root, "public/assets/michigan-border-crossings.js"))).size;
const cssBytes = (await stat(path.join(root, "public/assets/michigan-border-crossings.css"))).size;
const image = await readFile(path.join(root, "public/assets/search/michigan-border-crossings.jpg"));

const areas = {
  immediateCrossingDecision: [],
  dataIntegrityAndSafety: [],
  liveReliability: [],
  searchAndAnswerReadiness: [],
  experienceAndMeasurement: [],
};
const safetyGates = [];

function check(area, name, passed, points) {
  areas[area].push({ name, passed: Boolean(passed), points });
}

function gate(name, passed) {
  safetyGates.push({ name, passed: Boolean(passed) });
}

const crossingIds = crossingData.crossings.map((crossing) => crossing.id);
const configuredCameraIds = crossingData.crossings.flatMap((crossing) =>
  crossing.cameras.map((camera) => camera.id),
);

check(
  "immediateCrossingDecision",
  "All five Michigan–Ontario crossings are configured",
  benchmark.inventory.crossings.every((id) => crossingIds.includes(id)) && crossingIds.length === 5,
  6,
);
check(
  "immediateCrossingDecision",
  "Detroit comparison contains Gordie Howe, Ambassador, and tunnel only",
  crossingData.crossings.filter((crossing) => crossing.detroit_comparison).length === 3 &&
    benchmark.inventory.detroitComparison.every((id) =>
      crossingData.crossings.some(
        (crossing) => crossing.id === id && crossing.detroit_comparison,
      ),
    ),
  5,
);
check(
  "immediateCrossingDecision",
  "Direction, vehicle, and lane controls are present",
  (main.match(/data-direction=/g) || []).length === 2 &&
    (main.match(/data-vehicle=/g) || []).length === 2 &&
    main.includes('id="laneSelect"'),
  5,
);
check(
  "immediateCrossingDecision",
  "Tie-safe Detroit result cards are implemented",
  (main.match(/data-crossing-result=/g) || []).length === 3 &&
    client.includes("comparison.fastest_ids.includes") &&
    client.includes("comparison.is_tie"),
  5,
);
check(
  "immediateCrossingDecision",
  "Blue Water and Upper Peninsula live answers are one tap away",
  main.includes('data-corridor-card="blue-water"') &&
    main.includes('data-corridor-card="sault-ste-marie"') &&
    main.includes("/sault-ste-marie-border-wait-time/"),
  4,
);

check(
  "dataIntegrityAndSafety",
  "CBSA and CBP control their respective travel directions",
  liveApi.includes("bwt-eng.csv") &&
    liveApi.includes("bwt.cbp.gov/api/bwtnew") &&
    library.includes("to_canada") &&
    library.includes("to_us"),
  5,
);
check(
  "dataIntegrityAndSafety",
  "Missing and closed lane data cannot become a zero-minute report",
  library.includes('status: "unavailable"') &&
    library.includes('status: "closed"') &&
    client.includes('if (!lane.available') &&
    client.includes('lane.status === "closed"'),
  5,
);
check(
  "dataIntegrityAndSafety",
  "Only equivalent direction, vehicle, and lane reports are compared",
  library.includes("function selectedLane") &&
    library.includes("function compareDetroitCrossings") &&
    library.includes("crossing.detroit_comparison"),
  4,
);
check(
  "dataIntegrityAndSafety",
  "Wait meaning and non-prediction boundaries are visible",
  /Wait means border processing/.test(main) &&
    /does not include approach traffic, toll queues/i.test(main) &&
    /not a forecast, “best time,” or guarantee/i.test(main),
  4,
);
check(
  "dataIntegrityAndSafety",
  "Warnings and approach events stay separate from wait estimates",
  /Weather and approach-road warnings/i.test(main) &&
    library.includes("normalizeOntarioEvents") &&
    library.includes("normalizeNwsAlerts"),
  3,
);
check(
  "dataIntegrityAndSafety",
  "Agency freshness can be marked stale",
  library.includes("parseAgencyTimestamp") &&
    client.includes("stale report") &&
    main.includes('id="freshnessTime"'),
  2,
);
check(
  "dataIntegrityAndSafety",
  "Border documents and controlled-goods questions defer to official rules",
  main.includes("What documents do I need") &&
    /food, alcohol, cannabis or a firearm/i.test(main) &&
    main.includes("cbsa-asfc.gc.ca/travel-voyage/rpg-mrp-eng.html") &&
    main.includes("cbp.gov/travel/us-citizens/know-before-you-go"),
  2,
);

check(
  "liveReliability",
  "Independent live sources fail softly",
  liveApi.includes("Promise.allSettled") &&
    liveApi.includes("degraded") &&
    liveApi.includes("const sources ="),
  5,
);
check(
  "liveReliability",
  "Live routes use bounded upstream requests and CDN caching",
  liveApi.includes("AbortSignal.timeout") &&
    trendApi.includes("AbortSignal.timeout") &&
    /s-maxage/.test(liveApi) &&
    /s-maxage/.test(trendApi),
  4,
);
check(
  "liveReliability",
  "Every still camera is same-origin and allowlisted",
  configuredCameraIds.length >= 5 &&
    crossingData.crossings.every((crossing) =>
      crossing.cameras.every((camera) => /^https:\/\//.test(camera.upstream_url)),
    ) &&
    mediaApi.includes("MEDIA_SOURCES") &&
    library.includes("/api/border-media?camera="),
  5,
);
check(
  "liveReliability",
  "Media responses validate image type and use short caching",
  mediaApi.includes("content-type") &&
    mediaApi.includes("image/") &&
    mediaApi.includes("Cache-Control") &&
    mediaApi.includes("AbortSignal.timeout"),
  3,
);
check(
  "liveReliability",
  "Unavailable live data retains direct official fallbacks",
  client.includes("Official wait comparison is temporarily unavailable") &&
    main.includes("official CBP U.S.-bound report") &&
    main.includes("official CBSA Canada-bound report"),
  3,
);

const detailMetadata = detailPages.every((html, index) => {
  const route = detailRoutes[index];
  return (
    html.includes(`<link rel="canonical" href="https://chrisizworski.com/${route}/">`) &&
    /"@type"\s*:\s*"WebPage"/.test(html) &&
    html.includes('id="detailWait"') &&
    !/"@type"\s*:\s*"FAQPage"/.test(html)
  );
});
const allRoutes = ["michigan-border-wait-times", ...detailRoutes];

check(
  "searchAndAnswerReadiness",
  "Flagship has intent-led metadata and honest structured data",
  main.includes("<title>Michigan Border Wait Times Live | All 5 Crossings</title>") &&
    main.includes('"@type": "WebApplication"') &&
    main.includes('"numberOfItems": 5') &&
    !/"@type"\s*:\s*"FAQPage"/.test(main),
  4,
);
check(
  "searchAndAnswerReadiness",
  "Five substantial crossing pages have unique live intent",
  detailPages.length === 5 &&
    detailMetadata &&
    new Set(detailPages.map((html) => html.match(/<title>([^<]+)/)?.[1])).size === 5 &&
    detailPages.every((html) => html.replace(/<[^>]+>/g, " ").split(/\s+/).length > 500),
  5,
);
check(
  "searchAndAnswerReadiness",
  "Sault Ste. Marie owns a U.P.-specific answer surface",
  detailPages.some(
    (html) =>
      /Michigan’s Upper Peninsula border crossing/.test(html) &&
      /I-75 ↔ Highway 17/.test(html) &&
      html.includes("saultbridge.com/live-cameras"),
  ),
  3,
);
check(
  "searchAndAnswerReadiness",
  "All six pages appear in web and image sitemaps plus llms.txt",
  allRoutes.every(
    (route) =>
      sitemap.includes(`https://chrisizworski.com/${route}/`) &&
      imageSitemap.includes(`https://chrisizworski.com/${route}/`) &&
      llms.includes(`https://chrisizworski.com/${route}/`),
  ),
  4,
);
check(
  "searchAndAnswerReadiness",
  "Tool is discoverable from home, Tools, and Great Lakes hubs",
  home.includes("/michigan-border-wait-times/") &&
    tools.includes('data-featured-tool="michigan-border-wait-times"') &&
    greatLakes.includes('data-featured-tool="michigan-border-wait-times"'),
  2,
);
check(
  "searchAndAnswerReadiness",
  "Public-domain photograph is reserved for social previews, not the live-tool hero",
  createHash("sha256").update(image).digest("hex") ===
    "aa9eaba167b723c747f1438b42a4e70663ac7c90930490d461af7fde1815176e" &&
    main.includes(
      '<meta property="og:image" content="https://chrisizworski.com/assets/search/michigan-border-crossings.jpg">',
    ) &&
    main.includes('"creditText": "U.S. Environmental Protection Agency, public domain"') &&
    ![main, ...detailPages].some((html) => html.includes('class="hero-figure"')),
  2,
);

check(
  "experienceAndMeasurement",
  "First-party JS and CSS stay within launch budgets",
  jsBytes < benchmark.budgets.javascriptUncompressedBytes &&
    cssBytes < benchmark.budgets.cssUncompressedBytes,
  2,
);
check(
  "experienceAndMeasurement",
  "Responsive and reduced-motion treatments are present",
  css.includes("@media (max-width: 430px)") &&
    css.includes("@media (prefers-reduced-motion: reduce)"),
  2,
);
check(
  "experienceAndMeasurement",
  "Controls expose pressed state and refresh/share actions",
  client.includes('setAttribute("aria-pressed"') &&
    main.includes('id="refreshButton"') &&
    main.includes('id="shareButton"'),
  2,
);
check(
  "experienceAndMeasurement",
  "Analytics events and Vercel measurement scripts cover the cluster",
  client.includes('name: "Border Tool Interaction"') &&
    [main, ...detailPages].every(
      (html) =>
        html.includes("/_vercel/insights/script.js") &&
        html.includes("/_vercel/speed-insights/script.js"),
    ),
  2,
);
check(
  "experienceAndMeasurement",
  "Core answer and failure guidance exist before JavaScript",
  main.includes("Loading official Detroit crossing waits") &&
    main.includes("Live comparison requires JavaScript") &&
    main.includes("official CBP U.S.-bound report"),
  2,
);

gate("All five crossings, including Sault Ste. Marie, are configured", crossingIds.length === 5);
gate(
  "Unknown waits cannot be compared as zero",
  library.includes("lane.available && Number.isFinite(lane.wait_minutes)"),
);
gate(
  "Closed ports and lanes cannot be recommended",
  library.includes('crossing.status?.port !== "closed"') &&
    library.includes('status: "closed"'),
);
gate(
  "Waits, cameras, incidents, and weather retain separate meanings",
  /Camera views are visual context—not measured border wait times/i.test(main) &&
    /Weather and approach-road warnings/i.test(main),
);
gate(
  "No best-time or total-trip prediction is presented",
  !/fastest total trip|predicted closure|guaranteed crossing/i.test(main) &&
    !/bestWindow|predict(?:ed|ion)?Wait|fastestTotalTrip/i.test(client),
);
gate(
  "All configured cameras use the allowlisted same-origin proxy",
  crossingData.crossings.every((crossing) =>
    crossing.cameras.every((camera) => configuredCameraIds.includes(camera.id)),
  ) && !/511on\.ca\/map\/Cctv|wtbwb\.ca\/approach/.test(client),
);
gate(
  "Every search page and required launch artifact exists",
  (
    await Promise.all([
      ...allRoutes.map((route) => exists(`public/${route}/index.html`)),
      exists("public/sitemap.xml"),
      exists("public/image-sitemap.xml"),
      exists("public/llms.txt"),
    ])
  ).every(Boolean),
);

const areaScores = Object.entries(areas).map(([area, checks]) => {
  const maximum = benchmark.weights[area];
  const points = checks.reduce((total, item) => total + (item.passed ? item.points : 0), 0);
  const configured = checks.reduce((total, item) => total + item.points, 0);
  if (configured !== maximum) {
    throw new Error(`${area} defines ${configured} points but benchmark weight is ${maximum}`);
  }
  return { area, score: points, maximum, checks };
});
const score = areaScores.reduce((total, area) => total + area.score, 0);
const gatesPassed = safetyGates.every((item) => item.passed);
const passed = score >= benchmark.launchThreshold && gatesPassed;
const runtimeGates = [
  "Live CBP, CBSA, Ontario 511, NWS, and every camera endpoint",
  "390 px, 768 px, and 1440 px browser interaction and overflow",
  "Zero serious or critical automated accessibility findings",
  "Vercel preview noindex and production-domain canonicals",
];

const report = {
  benchmark: benchmark.name,
  score,
  possible: 100,
  launchThreshold: benchmark.launchThreshold,
  staticGate: passed ? "PASS" : "FAIL",
  note: "This score covers deterministic repository checks. Runtime gates are verified separately before publication.",
  assetBytes: { javascript: jsBytes, css: cssBytes },
  areas: areaScores,
  safetyGates,
  runtimeGates,
};

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log(`${report.benchmark}: ${score}/100 — ${report.staticGate}`);
  for (const area of areaScores) {
    console.log(`  ${area.area}: ${area.score}/${area.maximum}`);
    for (const item of area.checks.filter((check) => !check.passed)) {
      console.log(`    FAIL: ${item.name} (-${item.points})`);
    }
  }
  for (const item of safetyGates.filter((check) => !check.passed)) {
    console.log(`  SAFETY GATE FAIL: ${item.name}`);
  }
  console.log(`  Assets: JS ${jsBytes} B / CSS ${cssBytes} B`);
  console.log("  Runtime gates remain separate and must pass before publication.");
}

if (process.argv.includes("--check") && !passed) process.exitCode = 1;
