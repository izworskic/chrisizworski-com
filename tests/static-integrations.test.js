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
