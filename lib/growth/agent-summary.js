"use strict";
/* Private, read-only growth summary for coding agents.
   Reads the stored daily snapshot only; it never calls Google. The figures it returns are
   private: agents cite page paths and direction, never the numbers, in anything committed. */
const crypto = require("node:crypto");
const engine = require("../../ops/growth-command-center/engine.js");

const MIN_TOKEN_BYTES = 32;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
const FLAT_PCT = 10;
const STALE_HOURS = 36;
const CITATION_RULE = "Private figures. Cite page paths and direction (rising, falling, flat, top earner) only. " +
  "Never copy these numbers into commits, PRs, issues, docs, skill files or logs.";

const sha = (value) => crypto.createHash("sha256").update(String(value)).digest();

function agentConfigured(env = process.env) {
  const token = env.GROWTH_AGENT_TOKEN;
  if (typeof token !== "string" || Buffer.byteLength(token) < MIN_TOKEN_BYTES) return false;
  // The agent token must never double as the owner's dashboard password.
  return token !== env.GROWTH_DASHBOARD_PASSWORD;
}

function agentAuthorized(header, env = process.env) {
  if (!agentConfigured(env) || typeof header !== "string" || header.length > 1024) return false;
  const match = /^Bearer ([\x21-\x7e]+)$/.exec(header);
  if (!match) return false;
  return crypto.timingSafeEqual(sha(match[1]), sha(env.GROWTH_AGENT_TOKEN));
}

const num = (v, digits = 2) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10 ** digits) / 10 ** digits : null);
const pathOf = (url) => { try { return new URL(url).pathname; } catch { return null; } };
const trend = (pct) => (pct === null || !Number.isFinite(pct) ? "no-comparison"
  : pct >= FLAT_PCT ? "rising" : pct <= -FLAT_PCT ? "falling" : "flat");

function clampLimit(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(MAX_LIMIT, Math.max(1, n)) : DEFAULT_LIMIT;
}

function sourceStatus(status = {}) {
  const keep = ["state", "asOf", "code", "pages", "partial", "coverage", "pageAttribution"];
  return Object.fromEntries(Object.entries(status).map(([name, s]) => [name,
    Object.fromEntries(keep.filter((k) => s && s[k] !== undefined).map((k) => [k, s[k]]))]));
}

// Sitewide revenue direction inside the stored window: later half against earlier half, per day.
// AdSense can omit a zero-earning day, so a missing date inside a complete window counts as zero.
function revenueTrend(adsense, window) {
  const total = engine.days(window.adsStart, window.adsEnd);
  if (!adsense || !Array.isArray(adsense.daily) || window.adSenseComplete !== true || total === null || total < 14)
    return { direction: "not-available" };
  const firstDays = Math.floor(total / 2);
  const mid = new Date(Date.parse(window.adsStart + "T00:00:00Z") + firstDays * 86400000).toISOString().slice(0, 10);
  let early = 0, late = 0;
  for (const d of adsense.daily) {
    if (typeof d?.earnings !== "number" || d.date < window.adsStart || d.date > window.adsEnd) continue;
    if (d.date < mid) early += d.earnings; else late += d.earnings;
  }
  const earlyDaily = early / firstDays, lateDaily = late / (total - firstDays);
  const pct = earlyDaily > 0 ? (lateDaily / earlyDaily - 1) * 100 : lateDaily > 0 ? Infinity : 0;
  return { direction: pct === Infinity ? "rising" : trend(pct),
    figures: { earlierHalfDaily: num(earlyDaily), laterHalfDaily: num(lateDaily) } };
}

function buildAgentSummary(snapshot, { limit, now = new Date() } = {}) {
  if (!snapshot || typeof snapshot !== "object" || !snapshot.sources || !snapshot.window)
    throw new Error("growth-snapshot-invalid");
  const max = clampLimit(limit);
  const sources = snapshot.sources, window = snapshot.window;
  const analysis = engine.analyze(sources, window);
  const previous = new Map((sources.previous?.records || []).map((r) => [r.page, r]));

  const item = (row) => {
    const prior = previous.get(row.page);
    const change = analysis.comparisonValid && prior && row.impressions !== null ? row.impressions - prior.impressions : null;
    return {
      page: pathOf(row.page), family: row.family, searchTrend: trend(row.impressionChangePct), action: row.action,
      figures: {
        clicks: row.clicks, impressions: row.impressions, ctr: num(row.ctr), position: num(row.position, 1),
        expectedCtr: num(row.expectedCtr), potentialClicks: row.potentialClicks,
        previousImpressions: analysis.comparisonValid && prior ? prior.impressions : null,
        impressionChange: change, impressionChangePct: num(row.impressionChangePct, 1),
        views: row.views, earnings: num(row.earnings), pageRpm: num(row.pageRpm),
      },
    };
  };
  const top = (rows, key, dir = -1) => rows.filter((r) => typeof key(r) === "number")
    .sort((a, b) => dir * (key(a) - key(b)) || (b.impressions || 0) - (a.impressions || 0)).slice(0, max).map(item);
  const delta = (r) => {
    const prior = previous.get(r.page);
    return r.impressionChangePct === null || !prior || r.impressions === null ? null : r.impressions - prior.impressions;
  };
  const rows = analysis.rows;
  const generatedAt = Date.parse(snapshot.generatedAt);
  const ageHours = Number.isFinite(generatedAt) ? num((now.getTime() - generatedAt) / 3600000, 1) : null;

  return {
    version: 1,
    private: true,
    citationRule: CITATION_RULE,
    generatedAt: snapshot.generatedAt || null,
    ageHours,
    stale: ageHours === null || ageHours > STALE_HOURS,
    window: { start: window.start, end: window.end, prevStart: window.prevStart, prevEnd: window.prevEnd,
      comparisonValid: analysis.comparisonValid },
    sources: sourceStatus(snapshot.status),
    sitewide: {
      revenueTarget: snapshot.target || 300,
      revenueTrend: revenueTrend(sources.adsense, window),
      figures: {
        adsDaily: num(analysis.kpis.adsDaily), dailyGap: num(analysis.kpis.dailyGap),
        pageRpm: num(analysis.kpis.importedAdSensePageRpm),
        gscProperty: snapshot.status?.gsc?.propertyTotals || null,
      },
    },
    topEarners: top(rows, (r) => (r.earnings > 0 ? r.earnings : null)),
    topImpressions: top(rows, (r) => r.impressions),
    ctrGaps: top(rows, (r) => (r.potentialClicks > 0 ? r.potentialClicks : null)),
    risers: top(rows, (r) => (r.impressionChangePct >= FLAT_PCT ? delta(r) : null)),
    fallers: top(rows, (r) => (r.impressionChangePct <= -FLAT_PCT ? delta(r) : null), 1),
    caveats: [
      "GSC rows are the top 250 pages, not the property total.",
      "Page earnings exist only when AdSense page attribution is available; never sum them into sitewide revenue.",
      "GA4 sessions per page overlap; never add them up as visitors.",
      "Movement between windows is observation, not proof that a change caused it.",
    ],
  };
}

module.exports = { agentConfigured, agentAuthorized, buildAgentSummary, clampLimit, CITATION_RULE, MIN_TOKEN_BYTES };
