const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

test("Gazette landing matches current shipping-news intent and opens the real newspaper", () => {
  const html = read("public/great-lakes-gazette/index.html");

  assert.ok(html.includes("<title>Great Lakes Shipping News Today | Great Lakes Gazette</title>"));
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-gazette/">'));
  assert.ok(html.includes("Looking for Great Lakes shipping news today?"));
  assert.ok(html.includes("https://gazette.chrisizworski.com/api/latest"));
  assert.ok(html.includes("https://gazette.chrisizworski.com/archive"));
  assert.ok(html.includes("https://gazette.chrisizworski.com/feed.xml"));
  assert.ok(html.includes("A Newspaper, Not Another Dashboard"));
  assert.ok(!html.includes("audience roadmap"));
  assert.ok(!html.includes('href="/advertise/"'));

  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(blocks.length, 1);
  assert.doesNotThrow(() => JSON.parse(blocks[0][1]));
});

test("latest-edition widget is safe, date-aware, and useful without the API", () => {
  const script = read("public/assets/gazette-latest.js");
  const css = read("public/assets/gazette-latest.css");
  const html = read("public/great-lakes-gazette/index.html");

  assert.ok(script.includes('timeZone: "America/Detroit"'));
  assert.ok(script.includes('ORIGIN + "/issue/" + date'));
  assert.ok(script.includes("textContent = value"));
  assert.ok(script.includes("is-fallback"));
  assert.ok(!script.includes("innerHTML"));
  assert.ok(!script.includes("localStorage"));
  assert.ok(!script.includes("document.cookie"));
  assert.ok(css.includes('@media(max-width:640px)'));
  assert.ok(html.includes('data-gazette-headline>Open the latest Great Lakes shipping edition</a>'));
});

test("current Gazette headline is distributed across six relevant owned pages", () => {
  const pages = [
    ["public/index.html", "home-daily"],
    ["public/great-lakes/index.html", "great-lakes-hub"],
    ["public/great-lakes-freighter-tracking/index.html", "freighter-tracker"],
    ["public/soo-locks/index.html", "soo-schedule"],
    ["public/mackinac-bridge-live/index.html", "mackinac-conditions"],
    ["public/chris-izworski-freighter-view-farms/index.html", "freighter-view-farms"],
  ];

  for (const [file, placement] of pages) {
    const html = read(file);
    assert.ok(html.includes('data-gazette-latest'), file);
    assert.ok(html.includes('/assets/gazette-latest.css'), file);
    assert.ok(html.includes('/assets/gazette-latest.js'), file);
    assert.ok(html.includes(`data-gazette-placement="${placement}"`), file);
    assert.ok(html.includes('data-track-tool="great-lakes-gazette-edition"'), file);
  }

  const birding = read("public/great-lakes-birding/index.html");
  assert.ok(birding.includes('data-growth-cta="birding-great-lakes-gazette"'));
});

test("Gazette benchmark records unknown search metrics honestly and gates reliability", () => {
  const benchmark = JSON.parse(read("benchmarks/gazette-daily-growth.json"));
  const ledger = JSON.parse(read("benchmarks/growth-experiments.json"));
  const experiment = ledger.experiments.find((item) => item.id === "2026-08-03-great-lakes-gazette-daily");

  assert.equal(benchmark.baseline.searchConsole.landingPageImpressions, null);
  assert.equal(benchmark.baseline.searchConsole.status, "not-isolated-in-visible-export");
  assert.equal(benchmark.baseline.publication.aisHealthyPortsLatestEdition, 0);
  assert.equal(benchmark.targets.first28Days.dailyEditionAvailability, 1);
  assert.equal(benchmark.targets.first28Days.editionsWithAtLeastFiveHealthyAisPorts, 0.95);
  assert.ok(experiment);
  assert.equal(experiment.status, "ready-for-review");
  assert.equal(experiment.target.widgetEditionOpenRate, 0.02);
});
