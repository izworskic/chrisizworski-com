const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "lib", "fall-color", "routes", "cron.js"), "utf8");

// The daily fall colour writer runs unattended from August 20 through the peak, which is the
// highest-traffic window of the year for this cluster. Every failure path in it used to return
// HTTP 200 with an error in the body, so Vercel's cron would report success every day while
// writing nothing. That is exactly the shape that let a dead token sit unnoticed on the phenology
// project for 45 days: the job went green while banking nothing.
test("failure paths in the fall colour cron return a 5xx, not a 200 with an error body", () => {
  assert.doesNotMatch(
    source,
    /res\.status\(200\)\.json\(\{\s*error/,
    "a failure path returns 200; the cron would go green while writing nothing",
  );
});

test("the only 200 responses are genuine skips and genuine success", () => {
  const twoHundreds = [...source.matchAll(/res\.status\(200\)\.json\(\{([^}]*)\}/g)].map((m) => m[1]);
  assert.equal(twoHundreds.length, 3, "expected exactly three 200 responses");
  const shapes = twoHundreds.map((body) => body.trim().split(":")[0].trim());
  assert.deepEqual(shapes.sort(), ["ok", "skipped", "skipped"], "200 is reserved for skips and success");
});

test("configuration and upstream failures are distinguished", () => {
  // A missing key or a failed write is ours (5xx). A failed upstream is theirs (502). Both are
  // failures, but the distinction is what makes the cron log worth reading at a glance.
  assert.match(source, /res\.status\(500\)\.json\(\{ error: "missing ANTHROPIC_API_KEY"/);
  assert.match(source, /res\.status\(500\)\.json\(\{ error: "redis-write"/);
  assert.match(source, /res\.status\(502\)\.json\(\{ error: "anthropic"/);
  assert.match(source, /res\.status\(502\)\.json\(\{ error: "empty-generation"/);
});

test("the writer refuses to generate a report from zero regions", () => {
  // Writing from an empty conditions payload would produce prose that reads like an assessment
  // with no observation behind it. The old code silently substituted { regions: [] } and wrote
  // anyway.
  assert.match(source, /conditions-empty/, "must refuse to write when no regions are returned");
  assert.doesNotMatch(
    source,
    /catch \(e\) \{ cond = \{ regions: \[\] \}; \}/,
    "must not silently fall back to an empty conditions payload",
  );
});
