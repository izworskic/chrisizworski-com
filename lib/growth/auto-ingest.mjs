/* Server-side Google publisher ingestion. No client-side secrets, no Redis. */
import crypto from "node:crypto";
import { readServiceAccount } from "../gsc/google-auth.mjs";
import { getLatestReport } from "../gsc/state.mjs";
import { buildWindows } from "../gsc/search-console.mjs";
import privateState from "../tool-state.js";

const { stateCommand } = privateState;
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const GROWTH_KEY = "growth:command-center:latest";
const TTL_SECONDS = 400 * 86400;
const SITE = "chrisizworski.com";

const validNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const canonical = (value) => {
  try {
    const u = new URL(String(value).startsWith("/") ? "https://" + SITE + value : value);
    if (!["https:", "http:"].includes(u.protocol) || ![SITE, "www." + SITE].includes(u.hostname.toLowerCase())) return null;
    const path = u.pathname.replace(/\/+/g, "/");
    return "https://" + SITE + (path.endsWith("/") ? path : path + "/");
  } catch { return null; }
};
const source = (state, extra = {}) => ({ state, ...extra });
const pct = (n) => Math.round(n * 10000) / 100;
const dateParts = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error("invalid date format");
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
};
const numCell = (r, index) => validNum(r?.cells?.[index]?.value);
const cell = (r, index) => String(r?.cells?.[index]?.value || "");

export function reportRowsToSources(report) {
  if (!report || report.siteUrl !== "sc-domain:chrisizworski.com" || !report.windows?.current ||
    !Array.isArray(report.pages?.top)) throw new Error("native-gsc-report-invalid");
  const current = [], previous = [];
  for (const p of report.pages.top) {
    const page = canonical(p.page);
    if (!page) continue;
    const clicks = validNum(p.clicks), impressions = validNum(p.impressions), position = validNum(p.position);
    if (clicks === null || impressions === null) continue;
    current.push({ page, clicks, impressions, ctr: impressions ? 100 * clicks / impressions : 0, position });
    const prev = p.previous || {};
    const previousImpressions = validNum(prev.impressions);
    if (previousImpressions !== null) previous.push({
      page, clicks: validNum(prev.clicks) ?? 0, impressions: previousImpressions,
      ctr: previousImpressions ? 100 * (validNum(prev.clicks) ?? 0) / previousImpressions : 0,
      position: validNum(prev.position),
    });
  }
  return { current: { kind: "gsc", records: current, partialExport: true },
    previous: { kind: "gsc", records: previous, partialExport: true } };
}

function jwtAssertion({ clientEmail, privateKey, scope, now = Date.now() }) {
  const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const payload = enc({ iss: clientEmail, scope, aud: TOKEN_URL,
    iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 3600 });
  const unsigned = enc({ alg: "RS256", typ: "JWT" }) + "." + payload;
  return unsigned + "." + crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url");
}
async function tokenRequest(body, fetchImpl) {
  const response = await fetchImpl(TOKEN_URL, { method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body), signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("oauth-" + response.status);
  return data.access_token;
}
export async function ga4ServiceToken({ env = process.env, fetchImpl = fetch } = {}) {
  const { clientEmail, privateKey } = readServiceAccount(env);
  return tokenRequest({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwtAssertion({ clientEmail, privateKey, scope: GA4_SCOPE }) }, fetchImpl);
}
export async function adsenseUserToken({ env = process.env, fetchImpl = fetch } = {}) {
  if (![env.GROWTH_ADSENSE_CLIENT_ID, env.GROWTH_ADSENSE_CLIENT_SECRET, env.GROWTH_ADSENSE_REFRESH_TOKEN].every(Boolean))
    throw new Error("adsense-not-configured");
  return tokenRequest({ grant_type: "refresh_token", client_id: env.GROWTH_ADSENSE_CLIENT_ID,
    client_secret: env.GROWTH_ADSENSE_CLIENT_SECRET, refresh_token: env.GROWTH_ADSENSE_REFRESH_TOKEN }, fetchImpl);
}

async function gaRunReport({ propertyId, token, payload, fetchImpl }) {
  const response = await fetchImpl("https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":runReport", {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(18000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("ga4-" + response.status);
  return data;
}

export async function collectGa4({ env = process.env, fetchImpl = fetch, window, tokenProvider = ga4ServiceToken } = {}) {
  const propertyId = String(env.GROWTH_GA4_PROPERTY_ID || "").trim();
  if (!/^\d{6,20}$/.test(propertyId)) throw new Error("ga4-not-configured");
  if (!window?.startDate || !window?.endDate) throw new Error("ga4-window-missing");
  const token = await tokenProvider({ env, fetchImpl });
  const filter = { filter: { fieldName: "hostName", inListFilter: { values: [SITE, "www." + SITE] } } };
  const records = new Map();
  let offset = 0, total = 0;
  const batch = 5000, cap = 15000;
  do {
    const data = await gaRunReport({ propertyId, token, fetchImpl, payload: {
      dateRanges: [{ startDate: window.startDate, endDate: window.endDate }],
      dimensions: [{ name: "hostName" }, { name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
      dimensionFilter: filter, limit: String(batch), offset: String(offset),
      keepEmptyRows: false,
    } });
    const rows = Array.isArray(data.rows) ? data.rows : [];
    total = Number(data.rowCount || rows.length);
    for (const row of rows) {
      const host = String(row.dimensionValues?.[0]?.value || "").toLowerCase();
      if (![SITE, "www." + SITE].includes(host)) continue;
      const path = String(row.dimensionValues?.[1]?.value || "");
      const page = canonical(path);
      if (!page) continue;
      const views = validNum(row.metricValues?.[0]?.value);
      const sessions = validNum(row.metricValues?.[1]?.value);
      if (views === null || sessions === null) continue;
      const prev = records.get(page) || { page, views: 0, sessions: 0, activeUsers: null, returningUsers: null };
      prev.views += views; prev.sessions += sessions;
      records.set(page, prev);
    }
    offset += rows.length;
    if (!rows.length || rows.length < batch) break;
  } while (offset < cap && offset < total);
  return {
    kind: "ga4", dimension: "page", records: [...records.values()], partialExport: total > offset,
    caveat: "Sessions per page are non-additive; do not sum them as sitewide unique sessions.",
    sourceProperty: propertyId,
    reportWindow: { ...window },
  };
}

function adsenseAccount(env) {
  const raw = String(env.GROWTH_ADSENSE_ACCOUNT || "");
  const value = raw.startsWith("accounts/") ? raw.slice(9) : raw;
  if (!/^pub-\d{10,22}$/.test(value)) throw new Error("adsense-not-configured");
  return "accounts/" + value;
}
async function adsenseReport({ account, token, window, dimensions, metrics, limit, fetchImpl }) {
  const url = new URL("https://adsense.googleapis.com/v2/" + account + "/reports:generate");
  const start = dateParts(window.startDate), end = dateParts(window.endDate);
  for (const [k, v] of Object.entries(start)) url.searchParams.set("startDate." + k, String(v));
  for (const [k, v] of Object.entries(end)) url.searchParams.set("endDate." + k, String(v));
  url.searchParams.set("dateRange", "CUSTOM");
  url.searchParams.set("currencyCode", "USD");
  dimensions.forEach((d) => url.searchParams.append("dimensions", d));
  metrics.forEach((m) => url.searchParams.append("metrics", m));
  url.searchParams.append("filters", "OWNED_SITE_DOMAIN_NAME==" + SITE);
  if (limit) url.searchParams.set("limit", String(limit));
  const response = await fetchImpl(url.toString(), {
    headers: { authorization: "Bearer " + token, accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("adsense-" + response.status);
  if (!Array.isArray(data.headers)) throw new Error("adsense-invalid-report");
  const names = data.headers.map((h) => h.name);
  for (const name of dimensions.concat(metrics)) if (!names.includes(name)) throw new Error("adsense-invalid-headers");
  const index = (n) => names.indexOf(n);
  const currency = data.headers.find((h) => h.name === "ESTIMATED_EARNINGS")?.currencyCode;
  if (currency && currency !== "USD") throw new Error("adsense-currency-not-usd");
  return { data, index };
}

export async function collectAdsense({ env = process.env, fetchImpl = fetch, window, tokenProvider = adsenseUserToken } = {}) {
  const account = adsenseAccount(env);
  if (![env.GROWTH_ADSENSE_CLIENT_ID, env.GROWTH_ADSENSE_CLIENT_SECRET, env.GROWTH_ADSENSE_REFRESH_TOKEN].every(Boolean))
    throw new Error("adsense-not-configured");
  if (!window?.startDate || !window?.endDate) throw new Error("adsense-window-missing");
  const token = await tokenProvider({ env, fetchImpl });
  const site = await adsenseReport({ account, token, fetchImpl, window,
    dimensions: ["DATE"], metrics: ["ESTIMATED_EARNINGS", "PAGE_VIEWS"], limit: 150, });
  const rows = Array.isArray(site.data.rows) ? site.data.rows : [];
  const expectedDays = Math.floor((Date.parse(window.endDate) - Date.parse(window.startDate)) / 86400000) + 1;
  if (expectedDays <= 0 || expectedDays > 100 || Number(site.data.totalMatchedRows || 0) > 150)
    throw new Error("adsense-date-window-invalid");
  let total = 0, totalPageviews = 0;
  const days = new Map();
  for (const r of rows) {
    const date = cell(r, site.index("DATE"));
    const earning = numCell(r, site.index("ESTIMATED_EARNINGS"));
    const views = numCell(r, site.index("PAGE_VIEWS"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || earning === null || views === null || days.has(date) || date < window.startDate || date > window.endDate)
      throw new Error("adsense-row-invalid");
    days.set(date, { date, earnings: earning, pageviews: views });
    total += earning; totalPageviews += views;
  }
  // A day with no earned revenue may be omitted by Google's report; the official date filter still determines the range.
  // A report warning or zero-day response cannot establish complete earnings.
  if (!rows.length || site.data.warnings?.length) throw new Error("adsense-report-incomplete");
  const answer = {
    kind: "adsense", total, totalPageviews, sitewide: true, siteComplete: true,
    partialAttribution: false, records: [], daily: [...days.values()],
    reportWindow: { ...window }, currency: "USD", sourceAccount: account,
  };

  // Page URL breakdown is independently optional. Never sum it to calculate sitewide revenue.
  if (env.GROWTH_ADSENSE_PAGE_BREAKDOWN === "off") return answer;
  try {
    const pageReport = await adsenseReport({ account, token, fetchImpl, window,
      dimensions: ["PAGE_URL"], metrics: ["ESTIMATED_EARNINGS", "PAGE_VIEWS"], limit: 10000 });
    const rowCount = Number(pageReport.data.totalMatchedRows || 0);
    const pageRows = pageReport.data.rows || [];
    const by = new Map();
    for (const r of pageRows) {
      const page = canonical(cell(r, pageReport.index("PAGE_URL")));
      if (!page) continue;
      const earning = numCell(r, pageReport.index("ESTIMATED_EARNINGS"));
      const views = numCell(r, pageReport.index("PAGE_VIEWS"));
      if (earning === null || views === null) continue;
      const prev = by.get(page) || { page, earnings: 0, adPageviews: 0 };
      prev.earnings += earning; prev.adPageviews += views;
      by.set(page, prev);
    }
    answer.records = [...by.values()];
    answer.sitewide = false;
    answer.partialAttribution = rowCount > pageRows.length || (pageReport.data.warnings || []).length > 0;
    answer.pageCoverage = { matched: rowCount, returned: pageRows.length, partial: answer.partialAttribution };
  } catch {
    answer.pageAttribution = "unavailable";
  }
  return answer;
}

function safeError(e, prefix) {
  const message = String(e?.message || "");
  const code = /^(ga4|adsense|oauth)-\d{3}$/.test(message) ? message
    : /not-configured/.test(message) ? "not-configured"
    : /currency/.test(message) ? "currency-mismatch" : prefix + "-unavailable";
  return { code };
}

export async function createGrowthSnapshot({
  env = process.env, fetchImpl = fetch, now = new Date(),
  readGsc = getLatestReport, ga4Collector = collectGa4, adsenseCollector = collectAdsense,
} = {}) {
  const windows = buildWindows({ now, finalLagDays: Number(env.GSC_FINAL_LAG_DAYS || 2) });
  const current = windows.current, previous = windows.previous;
  const auto = { version: 1, generatedAt: now.toISOString(), sources: {
    gsc: null, previous: null, ga4: null, adsense: null,
  }, window: { start: current.startDate, end: current.endDate,
    prevStart: previous.startDate, prevEnd: previous.endDate, adsStart: current.startDate, adsEnd: current.endDate,
    adSenseComplete: false },
    status: {}, sourceWindows: { current, previous }, target: 300,
  };
  try {
    const native = await readGsc();
    if (native?.windows?.current?.startDate !== current.startDate || native?.windows?.current?.endDate !== current.endDate)
      throw new Error("gsc-out-of-window");
    const parsed = reportRowsToSources(native);
    auto.sources.gsc = parsed.current; auto.sources.previous = parsed.previous;
    auto.status.gsc = source("ok", { asOf: native.generatedAt, pages: parsed.current.records.length,
      coverage: "top-250-capped", propertyTotals: native.totals?.current || null });
  } catch (e) { auto.status.gsc = source("unavailable", safeError(e, "gsc")); }
  const [ga, ads] = await Promise.allSettled([
    ga4Collector({ env, fetchImpl, window: current }),
    adsenseCollector({ env, fetchImpl, window: current }),
  ]);
  if (ga.status === "fulfilled") {
    auto.sources.ga4 = ga.value;
    auto.status.ga4 = source("ok", { asOf: now.toISOString(), pages: ga.value.records.length,
      partial: ga.value.partialExport, property: ga.value.sourceProperty });
  } else auto.status.ga4 = source("unavailable", safeError(ga.reason, "ga4"));

  if (ads.status === "fulfilled") {
    auto.sources.adsense = ads.value;
    auto.window.adSenseComplete = ads.value.siteComplete === true;
    auto.status.adsense = source("ok", { asOf: now.toISOString(), pageAttribution: ads.value.sitewide
      ? "not-available" : ads.value.partialAttribution ? "partial" : "available",
      currency: ads.value.currency, window: current });
  } else auto.status.adsense = source("unavailable", safeError(ads.reason, "adsense"));
  return auto;
}

export async function storeGrowthSnapshot(snapshot, { env = process.env, fetchImpl = fetch, stateCommandImpl = stateCommand } = {}) {
  const payload = JSON.stringify(snapshot);
  if (Buffer.byteLength(payload) > 8_000_000) throw new Error("growth-snapshot-too-large");
  const today = snapshot.generatedAt.slice(0, 10);
  await stateCommandImpl(["SET", GROWTH_KEY, payload], { env, fetchImpl });
  await stateCommandImpl(["SET", "growth:command-center:" + today, payload, "EX", TTL_SECONDS], { env, fetchImpl });
  return { stored: true, collectedAt: snapshot.generatedAt, statuses: Object.fromEntries(
    Object.entries(snapshot.status).map(([k, v]) => [k, v.state])) };
}

export async function readGrowthSnapshot({ env = process.env, fetchImpl = fetch, stateCommandImpl = stateCommand } = {}) {
  const raw = await stateCommandImpl(["GET", GROWTH_KEY], { env, fetchImpl });
  return raw ? JSON.parse(raw) : null;
}
