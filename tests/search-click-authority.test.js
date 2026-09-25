const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

const priorityPages = [
  ["public/soo-locks/index.html", "Soo Locks Schedule Today: Ships &amp; Map | Chris Izworski"],
  ["public/great-lakes-freighter-tracking/index.html", "Great Lakes Ship Tracker: Live AIS Map | Chris Izworski"],
  ["public/fall-color/index.html", "Michigan Fall Color Map 2026: Live Peak Color Forecast"],
  ["public/northern-lights-michigan/index.html", "Northern Lights Michigan Tonight: Aurora | Chris Izworski"],
  ["public/mackinac-bridge-live/index.html", "Mackinac Bridge Conditions Today: Live Status &amp; Cameras"],
  ["public/mackinac-bridge-tolls/index.html", "Mackinac Bridge Toll 2026: $4 for a Passenger Car"]
];

test("priority search pages keep their search promise and link the publisher to the canonical profile", () => {
  for (const [file, title] of priorityPages) {
    const html = read(file);
    assert.ok(html.includes(`<title>${title}</title>`), file);
    assert.ok(html.includes("https://chrisizworski.com/#person"), file);
    assert.ok(
      html.includes('href="/chris-izworski/"') ||
      html.includes('href="https://chrisizworski.com/chris-izworski/"'),
      file
    );
  }
});

test("canonical Chris Izworski profile remains a ProfilePage for the shared Person entity", () => {
  const html = read("public/chris-izworski/index.html");
  assert.ok(html.includes('"@type":"ProfilePage"'));
  assert.ok(html.includes('"mainEntity":{"@id":"https://chrisizworski.com/#person"}'));
  assert.ok(html.includes("<h1 class=\"page-title\">Chris Izworski: Profile</h1>"));
});

test("search click authority benchmark preserves the measured baseline and loss function", () => {
  const benchmark = JSON.parse(read("benchmarks/search-click-authority-2026-09-20.json"));
  assert.equal(benchmark.baseline.site.clicks, 65);
  assert.equal(benchmark.baseline.site.impressions, 3233);
  assert.equal(benchmark.baseline.site.clicksPer1000Impressions, 20.1);
  assert.equal(benchmark.targets.clicksPer1000Impressions, 40);
  assert.equal(benchmark.score.pass, 92);
  assert.match(benchmark.lossFunction.formula, /canonicalOrIndexingRegression/);
  for (const page of benchmark.baseline.pages) {
    assert.equal(page.action, "PROTECT", page.path);
  }
});
