const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createHash } = require("node:crypto");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const capture = (html, pattern, label) => {
  const match = html.match(pattern);
  assert.ok(match, `${label} is missing`);
  return match[1];
};
const text = (value) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function searchSurface(html) {
  return {
    title: capture(html, /<title>([^<]+)<\/title>/, "title"),
    description: capture(html, /<meta name="description" content="([^"]+)"/, "description"),
    canonical: capture(html, /<link rel="canonical" href="([^"]+)"/, "canonical"),
    h1: text(capture(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/, "H1")),
  };
}

test("high-performing Fall snippets stay unchanged during the Tunnel experiment", () => {
  const winners = [
    {
      file: "public/fall-color/index.html",
      expected: {
        title: "Michigan Fall Color Map 2026 | Live Peak Conditions",
        description: "See where Michigan's fall color is peaking now on a live map built from canopy camera and weather data, with regional peak dates and a forecast.",
        canonical: "https://chrisizworski.com/fall-color/",
        h1: "Michigan Fall Color",
      },
    },
    {
      file: "public/fall-color/porcupine-mountains-fall-color/index.html",
      expected: {
        title: "Porcupine Mountains Fall Color 2026 | Peak Dates",
        description: "When the Porcupine Mountains peak, plus the Lake of the Clouds overlook and the Escarpment Trail. Among the first and most intense color in Michigan.",
        canonical: "https://chrisizworski.com/fall-color/porcupine-mountains-fall-color/",
        h1: "When does fall color peak in the Porcupine Mountains?",
      },
    },
    {
      file: "public/fall-color/upper-peninsula-fall-color/index.html",
      expected: {
        title: "Upper Peninsula Fall Color 2026 | Peak Dates &amp; Map",
        description: "When fall color peaks across Michigan's Upper Peninsula, west to east, plus a live map. The U.P. turns first, late September into mid-October.",
        canonical: "https://chrisizworski.com/fall-color/upper-peninsula-fall-color/",
        h1: "When does fall color peak in the Upper Peninsula?",
      },
    },
    {
      file: "public/fall-color/mackinac-island-fall-color/index.html",
      expected: {
        title: "Mackinac Island Fall Color 2026 | Peak Dates",
        description: "When Mackinac Island and the Straits peak, plus Arch Rock and the bluffs. Fall color without cars, where Lakes Michigan and Huron meet.",
        canonical: "https://chrisizworski.com/fall-color/mackinac-island-fall-color/",
        h1: "When does fall color peak on Mackinac Island?",
      },
    },
  ];

  for (const { file, expected } of winners) {
    assert.deepEqual(searchSurface(read(file)), expected, file);
  }
});

test("Tunnel of Trees changes only the measured peak-date description surface", () => {
  const html = read("public/fall-color/tunnel-of-trees-fall-color/index.html");
  const description = "Tunnel of Trees fall color typically peaks October 5–13. See the 2026 outlook, live regional conditions, and M-119 stops from Harbor Springs north.";
  assert.deepEqual(searchSurface(html), {
    title: "Tunnel of Trees Fall Color 2026 | M-119 Peak Dates",
    description,
    canonical: "https://chrisizworski.com/fall-color/tunnel-of-trees-fall-color/",
    h1: "When does the Tunnel of Trees peak?",
  });
  assert.equal(capture(html, /<meta property="og:description" content="([^"]+)"/, "OG description"), description);
  assert.equal(capture(html, /<meta name="twitter:description" content="([^"]+)"/, "Twitter description"), description);
  assert.ok(description.length <= 158);

  const graphs = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]))
    .flatMap((block) => block["@graph"] || [block]);
  assert.equal(graphs.find((node) => node["@type"] === "WebPage")?.description, description);
  assert.match(html, /Most years the Tunnel of Trees peaks around October 5 to 13\./);
});

test("Aurora search-facing surfaces stay frozen through its clean window", () => {
  const html = read("public/northern-lights-michigan/index.html");
  assert.deepEqual(searchSurface(html), {
    title: "Northern Lights Michigan Tonight: Aurora | Chris Izworski",
    description: "Will the aurora borealis be visible in Michigan tonight? Live NOAA Kp, solar wind, peak timing, and regional outlooks for the U.P. and northern Michigan.",
    canonical: "https://chrisizworski.com/northern-lights-michigan/",
    h1: "Northern Lights Michigan Tonight",
  });

  const firstAnswer = text(capture(
    html,
    /<div class="static-answer" id="aurora-static-answer">([\s\S]*?)<\/div>/,
    "Aurora first answer",
  ));
  assert.equal(
    firstAnswer,
    "Use this Michigan guide while the live NOAA verdict updates: Kp below 5 usually means low odds; Kp 5 to 6 favors dark northern Upper Peninsula locations; Kp 7 or higher can bring the aurora farther into the Lower Peninsula when skies are clear. Check cloud cover and the official NOAA watch before driving, and never treat a forecast as a visibility guarantee.",
  );

  const graphs = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]))
    .flatMap((block) => block["@graph"] || [block]);
  const webPage = graphs.find((node) => node["@type"] === "WebPage");
  assert.equal(webPage?.name, "Northern Lights Michigan Tonight: Live Aurora Forecast");
  assert.equal(
    webPage?.description,
    "Live NOAA Kp, solar-wind, OVATION nowcast, NWS cloud cover, moonlight, peak timing, and regional Michigan aurora outlooks for tonight.",
  );
  // Repinned 2026-08-18. The ONLY field that moved was WebPage.dateModified, 2026-08-14 ->
  // 2026-08-18, forced by the freshness gate after PR #63 committed a new answer block to this
  // page. Title, description, canonical, h1 and the static answer are all still asserted above and
  // all still match, so the search-facing surface this freeze exists to protect is intact.
  // If this hash ever changes again and one of those assertions ALSO moved, that is a real
  // contamination of the aurora measurement window and should be reverted, not repinned.
  assert.equal(
    createHash("sha256").update(JSON.stringify(graphs)).digest("hex"),
    "759c336a60f9acc8b4d42fbf712a69c615a800f871458db7028c273bad22ecbf",
    "Aurora structured data changed during its clean measurement window",
  );
});

test("seasonal experiments use page-specific windows instead of a site-wide pause", () => {
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  const aurora = ledger.experiments.find(
    (experiment) => experiment.id === "2026-08-03-aurora-resilient-answer",
  );
  const tunnel = ledger.experiments.find(
    (experiment) => experiment.id === "2026-08-15-tunnel-of-trees-peak-date-serp",
  );
  assert.equal(aurora?.status, "running");
  assert.equal(aurora?.releaseDate, "2026-08-14");
  assert.deepEqual(aurora?.evaluationWindow, { start: "2026-08-15", end: "2026-09-11" });
  assert.equal(tunnel?.status, "running");
  assert.equal(tunnel?.releaseDate, "2026-08-15");
  assert.deepEqual(tunnel?.evaluationWindow, { start: "2026-08-16", end: "2026-09-12" });
  assert.equal(tunnel?.lastSearchFacingChangeDate, "2026-08-15");
  assert.deepEqual(tunnel?.baseline, {
    impressions: 127,
    clicks: 1,
    ctr: 0.0079,
    averagePosition: 8.29,
  });
  assert.equal(tunnel?.target?.ctr, 0.025);
  assert.equal(tunnel?.treatment?.preserved.includes("canonical"), true);
  assert.match(ledger.measurementProtocol.parallelExecutionPolicy, /page-specific, not site-wide/);

  const plan = read("docs/ctr-serp-plan-2026-fall.md");
  assert.match(plan, /Page-specific measurement locks/);
  assert.match(plan, /Keep shipping/);
  assert.doesNotMatch(plan, /Ship nothing/);
});
