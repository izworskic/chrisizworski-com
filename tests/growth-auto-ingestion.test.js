const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { authorized, configured } = require("../lib/growth/owner-auth.js");
const local = require("../ops/growth-command-center/engine.js");
const load = () => import("../lib/growth/auto-ingest.mjs");
const page = (path) => "https://chrisizworski.com/" + path + "/";

test("owner's Basic authentication requires a configured long password and exact username", () => {
  const env = { GROWTH_DASHBOARD_USER: "owner", GROWTH_DASHBOARD_PASSWORD: "a-secure-very-long-test-password-not-real" };
  const token = "Basic " + Buffer.from("owner:" + env.GROWTH_DASHBOARD_PASSWORD).toString("base64");
  assert.equal(configured(env), true);
  assert.equal(authorized(token, env), true);
  assert.equal(authorized(token, { ...env, GROWTH_DASHBOARD_PASSWORD: "" }), false);
  assert.equal(authorized("Bearer " + env.GROWTH_DASHBOARD_PASSWORD, env), false);
  assert.equal(authorized("Basic " + Buffer.from("owner:wrong").toString("base64"), env), false);
  assert.equal(authorized("Basic " + Buffer.from("stranger:" + env.GROWTH_DASHBOARD_PASSWORD).toString("base64"), env), false);
});

test("native GSC report is mapped to URL rows without exposing query dimensions", async () => {
  const { reportRowsToSources } = await load();
  const native = { siteUrl: "sc-domain:chrisizworski.com",
    windows: { current: { startDate: "2026-10-11", endDate: "2026-11-07" } },
    pages: { top: [
      { page: page("soo-locks"), clicks: 50, impressions: 1000, ctr: 5, position: 8, previous: { clicks: 20, impressions: 500, position: 9 } },
      { page: "https://unrelated.com/foreign/", clicks: 300, impressions: 4000, position: 5 },
    ] } };
  const rows = reportRowsToSources(native);
  assert.equal(rows.current.records.length, 1);
  assert.equal(rows.current.records[0].ctr, 5);
  assert.equal(rows.previous.records[0].impressions, 500);
  assert.equal(rows.current.partialExport, true);
  assert.throws(() => reportRowsToSources({ ...native, siteUrl: "sc-domain:other.com" }), /invalid/);
});

test("GA4 collector uses hostName filter and retains page-level views without deduplicating sessions", async () => {
  const { collectGa4 } = await load();
  let captured;
  const result = await collectGa4({
    env: { GROWTH_GA4_PROPERTY_ID: "123456789" },
    window: { startDate: "2026-10-11", endDate: "2026-11-07" },
    tokenProvider: async () => "mock-token",
    fetchImpl: async (_url, init) => {
      captured = JSON.parse(init.body);
      return { ok: true, json: async () => ({ rowCount: 3, rows: [
        { dimensionValues: [{ value: "chrisizworski.com" }, { value: "/soo-locks/" }],
          metricValues: [{ value: "200" }, { value: "100" }] },
        { dimensionValues: [{ value: "www.chrisizworski.com" }, { value: "/soo-locks/?utm_source=test" }],
          metricValues: [{ value: "50" }, { value: "20" }] },
        { dimensionValues: [{ value: "freighterviewfarms.com" }, { value: "/soo-locks/" }],
          metricValues: [{ value: "900" }, { value: "400" }] },
      ] }) };
    },
  });
  assert.deepEqual(captured.dimensionFilter.filter.inListFilter.values, ["chrisizworski.com", "www.chrisizworski.com"]);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].views, 250);
  assert.equal(result.records[0].sessions, 120);
  assert.equal(result.records[0].page, page("soo-locks"));
});

test("AdSense obtains verified site totals independently from optional page breakdown", async () => {
  const { collectAdsense } = await load();
  const requests = [];
  const fetched = async (url) => {
    const parsed = new URL(url);
    requests.push(parsed);
    const pageBreakdown = parsed.searchParams.getAll("dimensions").includes("PAGE_URL");
    const data = pageBreakdown
      ? { headers: [
          { name: "PAGE_URL", type: "DIMENSION" },
          { name: "ESTIMATED_EARNINGS", currencyCode: "USD" },
          { name: "PAGE_VIEWS" },
        ], totalMatchedRows: "2", rows: [
          { cells: [{ value: page("soo-locks") }, { value: "1.5" }, { value: "150" }] },
          { cells: [{ value: "https://evil.example/other/" }, { value: "100" }, { value: "20000" }] },
        ] }
      : { headers: [
          { name: "DATE", type: "DIMENSION" },
          { name: "ESTIMATED_EARNINGS", type: "METRIC_CURRENCY", currencyCode: "USD" },
          { name: "PAGE_VIEWS" },
        ], totalMatchedRows: "2", rows: [
          { cells: [{ value: "2026-11-06" }, { value: "7.25" }, { value: "900" }] },
          { cells: [{ value: "2026-11-07" }, { value: "8.75" }, { value: "1000" }] },
        ] };
    return { ok: true, json: async () => data };
  };
  const answer = await collectAdsense({
    env: { GROWTH_ADSENSE_ACCOUNT: "pub-1234567890123456", GROWTH_ADSENSE_CLIENT_ID: "test-client",
      GROWTH_ADSENSE_CLIENT_SECRET: "test-secret", GROWTH_ADSENSE_REFRESH_TOKEN: "test-refresh" },
    window: { startDate: "2026-11-06", endDate: "2026-11-07" },
    fetchImpl: fetched, tokenProvider: async () => "mock-token",
  });
  assert.equal(answer.total, 16);
  assert.equal(answer.totalPageviews, 1900);
  assert.equal(answer.currency, "USD");
  assert.equal(answer.records.length, 1);
  assert.equal(answer.records[0].earnings, 1.5);
  assert.equal(answer.siteComplete, true);
  assert.equal(local.analyze({ adsense: answer }, { adsStart: "2026-11-06", adsEnd: "2026-11-07", adSenseComplete: true }).kpis.adsDaily, 8);
  assert.ok(requests.every((u) => u.searchParams.getAll("filters").includes("OWNED_SITE_DOMAIN_NAME==chrisizworski.com")));
  assert.equal(requests[0].searchParams.get("startDate.month"), "11");
});

test("AdSense site revenue survives a failed page breakdown; page revenue is not invented", async () => {
  const { collectAdsense } = await load();
  const answer = await collectAdsense({
    env: { GROWTH_ADSENSE_ACCOUNT: "pub-1234567890123456", GROWTH_ADSENSE_CLIENT_ID: "x",
      GROWTH_ADSENSE_CLIENT_SECRET: "x", GROWTH_ADSENSE_REFRESH_TOKEN: "x" },
    window: { startDate: "2026-11-06", endDate: "2026-11-06" },
    tokenProvider: async () => "t",
    fetchImpl: async (url) => {
      if (url.includes("PAGE_URL")) return { ok: false, status: 400, json: async () => ({}) };
      return { ok: true, json: async () => ({
        headers: [{ name: "DATE" }, { name: "ESTIMATED_EARNINGS", currencyCode: "USD" }, { name: "PAGE_VIEWS" }],
        totalMatchedRows: "1", rows: [{ cells: [{ value: "2026-11-06" }, { value: "5.40" }, { value: "500" }] }],
      }) };
    },
  });
  assert.equal(answer.siteComplete, true);
  assert.equal(answer.sitewide, true);
  assert.deepEqual(answer.records, []);
  assert.equal(answer.total, 5.4);
});

test("independent collector errors do not falsify or suppress another source", async () => {
  const { createGrowthSnapshot } = await load();
  const today = new Date("2026-11-09T17:00:00Z");
  const native = { siteUrl: "sc-domain:chrisizworski.com", generatedAt: today.toISOString(),
    windows: { current: { startDate: "2026-10-11", endDate: "2026-11-07" } },
    totals: { current: { clicks: 100, impressions: 5000 } },
    pages: { top: [{ page: page("soo-locks"), clicks: 50, impressions: 1000, position: 6, previous: { clicks: 10, impressions: 600, position: 9 } }] } };
  const payload = await createGrowthSnapshot({
    now: today, readGsc: async () => native,
    ga4Collector: async () => { throw Error("ga4-403"); },
    adsenseCollector: async () => ({ kind: "adsense", total: 42, siteComplete: true, sitewide: true,
      records: [], totalPageviews: 1200, currency: "USD" }),
  });
  assert.equal(payload.status.gsc.state, "ok");
  assert.equal(payload.status.ga4.state, "unavailable");
  assert.equal(payload.status.ga4.code, "ga4-403");
  assert.equal(payload.status.adsense.state, "ok");
  assert.equal(payload.window.adSenseComplete, true);
  assert.equal(payload.sources.gsc.records.length, 1);
  assert.equal(payload.sources.adsense.total, 42);
  assert.deepEqual(Object.keys(payload.sources), ["gsc", "previous", "ga4", "adsense"]);
});

test("private state command never returns a public URL or credentials", async () => {
  const { storeGrowthSnapshot, readGrowthSnapshot } = await load();
  const stored = new Map();
  const stateCommandImpl = async ([op, key, value]) => {
    if (op === "SET") { stored.set(key, value); return "OK"; }
    if (op === "GET") return stored.get(key) || null;
    throw Error("unsupported");
  };
  const snapshot = { generatedAt: "2026-11-09T12:00:00Z", version: 1, sources: {}, status: {} };
  const outcome = await storeGrowthSnapshot(snapshot, { stateCommandImpl });
  assert.equal(outcome.stored, true);
  assert.equal(stored.has("growth:command-center:latest"), true);
  assert.equal(stored.has("growth:command-center:2026-11-09"), true);
  assert.deepEqual(await readGrowthSnapshot({ stateCommandImpl }), snapshot);
});

test("dashboard is served behind server auth and never stored in public/", () => {
  const root = join(__dirname, "..");
  const hosted = readFileSync(join(root, "api/growth-dashboard.js"), "utf8");
  const api = readFileSync(join(root, "api/growth-command-center.js"), "utf8");
  const workflow = readFileSync(join(root, ".github/workflows/gsc-analytics.yml"), "utf8");
  assert.match(hosted, /requireOwner/);
  assert.match(hosted, /Revenue-Command-Center\.html/);
  assert.match(api, /requireOwner/);
  assert.match(api, /authorizeGscRequest/);
  assert.match(workflow, /Growth Command Center analytics/);
  assert.match(workflow, /--request POST/);
});
