const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, existsSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const route = readFileSync(path.join(root, "lib/mackinac-island/route.js"), "utf8");

// /api/mackinac-island and /api/fall-color-conditions both rewrite to api/fall-color.js,
// so the fall-color read is a self-invocation of this very function. A cold start on that
// call used to abort at 7s and blank the foliage card for a whole cache window.
test("fall-color self-fetch gets headroom past a cold start", () => {
  assert.match(route, /FALL_COLOR_TIMEOUT_MS\s*=\s*(\d+)/);
  const ms = Number(route.match(/FALL_COLOR_TIMEOUT_MS\s*=\s*(\d+)/)[1]);
  assert.ok(ms >= 10000, `fall-color timeout ${ms}ms is tighter than a cold start`);

  // api/fall-color.js is configured for 60s, so the inner timeout must stay well inside it.
  const vercel = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
  const budget = vercel.functions["api/fall-color.js"].maxDuration;
  assert.ok(ms / 1000 < budget, `inner timeout ${ms}ms exceeds the ${budget}s function budget`);
});

test("a failed fall-color read falls back to the last good payload, never to invention", () => {
  assert.match(route, /fallColorCache/);
  assert.match(route, /FALL_COLOR_TTL_MS/);
  // Only a payload that actually carries regions may be cached.
  assert.match(route, /Array\.isArray\(value\.regions\)\s*&&\s*value\.regions\.length/);
  // The honest-degradation string must survive: no invented foliage estimate.
  assert.match(route, /no replacement foliage estimate is being invented/);
});

test("the fall-color source is read through the resilient wrapper, not raw", () => {
  assert.match(route, /fetchFallColor\(\)/);
  assert.doesNotMatch(route, /fetchSource\(SOURCE_URLS\.fallColor,\s*"json"\)/);
});

// Salvaged from PR #435: its 404 fix landed via #436/#437, but its regression guard did not.
test("every navigable Mackinac route is materialized in the repo", () => {
  const routes = [
    "plan", "ferry-planner", "where-to-stay", "dining", "things-to-do", "events",
    "around-the-straits", "day-trip", "with-kids", "2-day-itinerary",
    "from-detroit", "from-chicago", "from-traverse-city", "from-grand-rapids",
    "limited-walking", "bike-day", "fall",
  ];
  const base = path.join(root, "public/mackinac-island");
  assert.ok(existsSync(path.join(base, "index.html")), "missing /mackinac-island/index.html");
  for (const r of routes) {
    const file = path.join(base, r, "index.html");
    assert.ok(existsSync(file), `missing materialized route /mackinac-island/${r}/`);
  }
  const onDisk = readdirSync(base).filter((n) => !n.endsWith(".html"));
  for (const dir of onDisk) {
    assert.ok(routes.includes(dir), `unguarded Mackinac route on disk: ${dir}`);
  }
});
