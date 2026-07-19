const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

test("Circle Tour requests NOAA water level with the station's supported datum", () => {
  const html = readFileSync(path.join(__dirname, "../public/lake-superior-circle-tour/index.html"), "utf8");
  assert.ok(html.includes("station=9099064"));
  assert.ok(html.includes("datum=LWD"));
  assert.ok(html.includes("ft above LWD at Duluth"));
  assert.ok(!html.includes("datum=IGLD85"));
});

test("Northern Lights falls back cleanly when the primary NOAA forecast is unavailable", () => {
  const html = readFileSync(path.join(__dirname, "../public/northern-lights-michigan/index.html"), "utf8");
  assert.ok(html.includes("if (kpRes.status !== 'fulfilled') throw new Error('NOAA Kp forecast unavailable')"));
  assert.ok(html.includes("Live feed temporarily unavailable"));
  assert.ok(html.includes("NOAA feed unavailable, see manual content below"));
});

test("Northern Lights handles current NOAA object responses without NaN cards", () => {
  const html = readFileSync(path.join(__dirname, "../public/northern-lights-michigan/index.html"), "utf8");
  assert.ok(html.includes("normalizeNoaaRows"));
  assert.ok(html.includes("['kp','Kp']"));
  assert.ok(html.includes("['Kp','kp']"));
  assert.ok(html.includes("temporarily unavailable"));
  assert.ok(!html.includes("const max72 = rows.slice(0,24)"));

  const helperStart = html.indexOf("function normalizeNoaaRows");
  const helperEnd = html.indexOf("// === Main data fetch ===");
  const helpers = new Function(
    `${html.slice(helperStart, helperEnd)}; return {normalizeNoaaRows, parseNoaaTime};`,
  )();
  const rows = helpers.normalizeNoaaRows(
    [
      { time_tag: "2026-07-19T21:00:00", kp: 1.67 },
      { time_tag: "2026-07-20T00:00:00", kp: 1.33 },
    ],
    [["time_tag"], ["kp", "Kp"]],
  );
  assert.deepEqual(rows, [
    ["2026-07-19T21:00:00", 1.67],
    ["2026-07-20T00:00:00", 1.33],
  ]);
  assert.equal(helpers.parseNoaaTime(rows[0][0]).toISOString(), "2026-07-19T21:00:00.000Z");
});

test("Soo Locks hands live tracking off cleanly instead of rendering a refused iframe", () => {
  const html = readFileSync(path.join(__dirname, "../public/soo-locks/index.html"), "utf8");
  assert.doesNotMatch(html, /<iframe[^>]+marinetraffic/i);
  assert.ok(html.includes("https://ais.boatnerd.com/"));
  assert.ok(html.includes("https://ais.boatnerd.com/passage/port/soo-locks"));
  assert.ok(html.includes("https://www.marinetraffic.com"));
});

test("Buoy copy stays accurate as the live reporting count changes", () => {
  const buoyHtml = readFileSync(path.join(__dirname, "../public/great-lakes-buoys/index.html"), "utf8");
  const toolsHtml = readFileSync(path.join(__dirname, "../public/tools/index.html"), "utf8");
  assert.doesNotMatch(buoyHtml, /115 NOAA|All 115 Stations|all 115 stations/i);
  assert.doesNotMatch(toolsHtml, /115 NOAA/i);
  assert.ok(buoyHtml.includes("All Reporting Great Lakes Stations"));
});

test("Great Lakes Gazette reads the latest public edition without a browser credential", () => {
  const html = readFileSync(path.join(__dirname, "../public/great-lakes-gazette/index.html"), "utf8");
  assert.ok(html.includes("https://gazette.chrisizworski.com/api/latest"));
  assert.ok(!/authorization/i.test(html));
  assert.ok(!html.includes("/api/generate"));
  assert.ok(!html.includes("great-lakes-gazette.vercel.app"));

  const projects = readFileSync(path.join(__dirname, "../public/projects/index.html"), "utf8");
  assert.ok(projects.includes("gazette.chrisizworski.com"));
  assert.ok(!projects.includes("great-lakes-gazette.vercel.app"));
});
