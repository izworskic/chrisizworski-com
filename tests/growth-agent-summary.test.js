const test = require("node:test");
const assert = require("node:assert/strict");
const { agentAuthorized, agentConfigured, buildAgentSummary, clampLimit, CITATION_RULE } = require("../lib/growth/agent-summary.js");

// Fixture tokens and figures only; none of these are real credentials or real site metrics.
const TOKEN = "fixture-agent-token-not-real-0123456789abcdef";
const PASSWORD = "fixture-owner-password-not-real-0123456789";
const page = (slug) => "https://chrisizworski.com/" + slug + "/";
const bearer = (t) => "Bearer " + t;
const basic = (user, pass) => "Basic " + Buffer.from(user + ":" + pass).toString("base64");

function fakeRes() {
  return {
    statusCode: null, body: null, headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function snapshot() {
  const start = "2026-10-26", end = "2026-11-22";
  const daily = [];
  for (let i = 0; i < 28; i++) {
    const date = new Date(Date.parse(start + "T00:00:00Z") + i * 86400000).toISOString().slice(0, 10);
    daily.push({ date, earnings: i < 14 ? 2 : 4, pageviews: 200 });
  }
  const gscRow = (slug, clicks, impressions, position) => ({ page: page(slug), clicks, impressions, ctr: 100 * clicks / impressions, position });
  return {
    version: 1, generatedAt: "2026-11-24T11:40:00Z", target: 300,
    window: { start, end, prevStart: "2026-09-28", prevEnd: "2026-10-25", adsStart: start, adsEnd: end, adSenseComplete: true },
    sources: {
      gsc: { kind: "gsc", partialExport: true, records: [
        gscRow("soo-locks", 30, 3000, 7), gscRow("welland-canal", 150, 3000, 8),
        gscRow("duluth-canal-park", 120, 2000, 7), gscRow("michigan-snow-totals", 100, 2500, 9),
      ] },
      previous: { kind: "gsc", partialExport: true, records: [
        gscRow("soo-locks", 20, 1500, 8), gscRow("welland-canal", 140, 2900, 8),
        gscRow("duluth-canal-park", 40, 1000, 9), gscRow("michigan-snow-totals", 300, 5000, 6),
      ] },
      ga4: { kind: "ga4", sourceProperty: "123456789", records: [{ page: page("soo-locks"), views: 900, sessions: 500 }] },
      adsense: { kind: "adsense", total: 84, totalPageviews: 5600, sitewide: false, siteComplete: true, partialAttribution: false,
        sourceAccount: "accounts/pub-0000000000000000", daily, records: [
          { page: page("welland-canal"), earnings: 20, adPageviews: 1000 },
          { page: page("soo-locks"), earnings: 35, adPageviews: 1500 },
        ] },
    },
    status: {
      gsc: { state: "ok", asOf: "2026-11-24T11:38:00Z", pages: 4, coverage: "top-250-capped", propertyTotals: { clicks: 400, impressions: 10500 } },
      ga4: { state: "ok", asOf: "2026-11-24T11:40:00Z", pages: 1, partial: false, property: "123456789" },
      adsense: { state: "ok", asOf: "2026-11-24T11:40:00Z", pageAttribution: "available", currency: "USD", window: { startDate: start, endDate: end } },
    },
  };
}

test("agent token is disabled when unset, short, or the same as the dashboard password", () => {
  assert.equal(agentConfigured({}), false);
  assert.equal(agentConfigured({ GROWTH_AGENT_TOKEN: "too-short" }), false);
  assert.equal(agentConfigured({ GROWTH_AGENT_TOKEN: PASSWORD, GROWTH_DASHBOARD_PASSWORD: PASSWORD }), false);
  assert.equal(agentConfigured({ GROWTH_AGENT_TOKEN: TOKEN, GROWTH_DASHBOARD_PASSWORD: PASSWORD }), true);
});

test("only the exact bearer token authorizes; owner Basic credentials do not", () => {
  const env = { GROWTH_AGENT_TOKEN: TOKEN, GROWTH_DASHBOARD_PASSWORD: PASSWORD };
  assert.equal(agentAuthorized(bearer(TOKEN), env), true);
  assert.equal(agentAuthorized(bearer(TOKEN + "x"), env), false);
  assert.equal(agentAuthorized(TOKEN, env), false);
  assert.equal(agentAuthorized(basic("owner", PASSWORD), env), false);
  assert.equal(agentAuthorized(basic("agent", TOKEN), env), false);
  assert.equal(agentAuthorized(bearer(TOKEN), {}), false);
  assert.equal(agentAuthorized(bearer("a".repeat(2000)), { GROWTH_AGENT_TOKEN: "a".repeat(2000) }), false);
});

test("agent view refuses without the token, keeps private headers and never accepts the owner password", async () => {
  const handler = require("../api/growth-command-center.js");
  const saved = { ...process.env };
  try {
    delete process.env.TOOL_STATE_URL;
    process.env.GROWTH_AGENT_TOKEN = TOKEN;
    process.env.GROWTH_DASHBOARD_PASSWORD = PASSWORD;
    for (const authorization of ["", basic("owner", PASSWORD), bearer(PASSWORD)]) {
      const res = fakeRes();
      await handler({ method: "GET", query: { view: "agent" }, headers: { authorization } }, res);
      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { error: "agent-token-required" });
      assert.match(res.headers["www-authenticate"], /^Bearer /);
      assert.match(res.headers["cache-control"], /no-store/);
      assert.match(res.headers["x-robots-tag"], /noindex/);
    }
    // A valid token with no private storage configured fails closed, without data.
    const res = fakeRes();
    await handler({ method: "GET", query: { view: "agent" }, headers: { authorization: bearer(TOKEN) } }, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: "growth-agent-summary-unavailable" });
    // The agent token cannot open the owner's report.
    const report = fakeRes();
    await handler({ method: "GET", query: { view: "report" }, headers: { authorization: bearer(TOKEN) } }, report);
    assert.equal(report.statusCode, 401);
    // The owner's health view says whether agent access is configured, never the token.
    const health = fakeRes();
    await handler({ method: "GET", query: { view: "health" }, headers: { authorization: basic("owner", PASSWORD) } }, health);
    assert.equal(health.statusCode, 200);
    assert.equal(health.body.agentAccessConfigured, true);
    assert.doesNotMatch(JSON.stringify(health.body), new RegExp(TOKEN));
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test("summary ranks earners, impressions, CTR gaps, risers and fallers from the stored snapshot", () => {
  const s = buildAgentSummary(snapshot(), { now: new Date("2026-11-24T18:00:00Z") });
  assert.equal(s.private, true);
  assert.equal(s.citationRule, CITATION_RULE);
  assert.equal(s.stale, false);
  assert.equal(s.window.comparisonValid, true);
  assert.deepEqual(s.topEarners.map((r) => r.page), ["/soo-locks/", "/welland-canal/"]);
  assert.deepEqual(s.topImpressions.slice(0, 2).map((r) => r.page).sort(), ["/soo-locks/", "/welland-canal/"]);
  assert.equal(s.ctrGaps[0].page, "/soo-locks/");
  assert.equal(s.ctrGaps[0].figures.potentialClicks, 105);
  assert.deepEqual(s.risers.map((r) => [r.page, r.searchTrend, r.figures.impressionChange]),
    [["/soo-locks/", "rising", 1500], ["/duluth-canal-park/", "rising", 1000]]);
  assert.deepEqual(s.fallers.map((r) => [r.page, r.searchTrend, r.figures.impressionChange]),
    [["/michigan-snow-totals/", "falling", -2500]]);
  assert.equal(s.topImpressions.find((r) => r.page === "/welland-canal/").searchTrend, "flat");
  assert.deepEqual(s.sitewide.revenueTrend, { direction: "rising", figures: { earlierHalfDaily: 2, laterHalfDaily: 4 } });
  assert.equal(s.sitewide.figures.adsDaily, 3);
  assert.equal(s.sitewide.figures.dailyGap, 297);
});

test("summary carries no account IDs, full URLs or extra status fields, and respects the limit", () => {
  const s = buildAgentSummary(snapshot(), { limit: "1", now: new Date("2026-11-27T12:00:00Z") });
  const text = JSON.stringify(s);
  assert.doesNotMatch(text, /pub-0000|accounts\/|123456789|https:\/\//);
  assert.deepEqual(Object.keys(s.sources.adsense).sort(), ["asOf", "pageAttribution", "state"]);
  assert.equal(s.topImpressions.length, 1);
  assert.equal(s.stale, true);
  assert.equal(clampLimit("500"), 25);
  assert.equal(clampLimit("0"), 1);
  assert.equal(clampLimit(undefined), 10);
});

test("missing comparisons and incomplete revenue are labelled, not invented", () => {
  const snap = snapshot();
  snap.window.prevStart = "2026-09-01"; // not consecutive: no window comparison
  snap.window.adSenseComplete = false;
  snap.sources.adsense.records = [];
  snap.sources.adsense.sitewide = true;
  snap.status.adsense.pageAttribution = "not-available";
  const s = buildAgentSummary(snap, { now: new Date("2026-11-24T18:00:00Z") });
  assert.equal(s.window.comparisonValid, false);
  assert.deepEqual(s.risers, []);
  assert.deepEqual(s.fallers, []);
  assert.deepEqual(s.topEarners, []);
  assert.ok(s.topImpressions.every((r) => r.searchTrend === "no-comparison" && r.figures.previousImpressions === null));
  assert.deepEqual(s.sitewide.revenueTrend, { direction: "not-available" });
  assert.equal(s.sitewide.figures.adsDaily, null);
  assert.throws(() => buildAgentSummary(null), /growth-snapshot-invalid/);
});
