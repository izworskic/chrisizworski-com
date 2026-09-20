"use strict";

const TZ = "America/Detroit";

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function round1(n) { return Math.round(Number(n) * 10) / 10; }

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const out = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
  return {
    ymd: `${out.year}-${out.month}-${out.day}`,
    year: Number(out.year), month: Number(out.month), day: Number(out.day),
    hour: Number(out.hour), minute: Number(out.minute)
  };
}

function seasonState(now = new Date()) {
  const p = localParts(now);
  const inSeason = (p.month === 12) || (p.month >= 1 && p.month <= 3);
  if (inSeason) return { state: "IN_SEASON", legal: "OPEN_SEASON", label: "Snowmobile season", opens: null };
  const year = p.month >= 4 ? p.year : p.year - 1;
  return {
    state: "PRESEASON",
    legal: "CLOSED_SEASON",
    label: "State-designated trails are outside the Dec. 1–Mar. 31 season",
    opens: `${year}-12-01`
  };
}

function parseTemp(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function summarizeWeather(points = []) {
  const hourly = points.flatMap(p => Array.isArray(p.hourly) ? p.hourly : []);
  if (!hourly.length) return {
    available: false, currentTempF: null, next24MinF: null, next24MaxF: null,
    hoursAbove32: null, rainLikely: null, snowLikely: null, thawRisk: "UNKNOWN"
  };
  const first24 = hourly.slice(0, 24);
  const temps = first24.map(h => parseTemp(h.temperature)).filter(Number.isFinite);
  const currentTempF = temps[0] ?? null;
  const next24MinF = temps.length ? Math.min(...temps) : null;
  const next24MaxF = temps.length ? Math.max(...temps) : null;
  const hoursAbove32 = temps.filter(t => t > 32).length;
  const text = first24.map(h => String(h.shortForecast || h.detailedForecast || "")).join(" ").toLowerCase();
  const rainLikely = /(rain|drizzle|showers)/.test(text);
  const snowLikely = /(snow|flurr)/.test(text);
  let thawRisk = "LOW";
  if (rainLikely) thawRisk = "HIGH";
  else if (hoursAbove32 >= 10 || (next24MaxF ?? 0) >= 42) thawRisk = "HIGH";
  else if (hoursAbove32 >= 4 || (next24MaxF ?? 0) >= 35) thawRisk = "MODERATE";
  return { available: true, currentTempF, next24MinF, next24MaxF, hoursAbove32, rainLikely, snowLikely, thawRisk };
}

function normalizeOfficial(features = []) {
  return features.map((f, idx) => {
    const a = f.properties || f.attributes || {};
    const status = String(a.OpenClosedStatusSnowmobile || "").trim();
    const groom = String(a.TrailGroomType || "").trim();
    return {
      id: a.GlobalID || a.OBJECTID || `segment-${idx + 1}`,
      name: a.TrailNamePrimary || a.SnowmobileName || "Snowmobile trail segment",
      county: a.County || null,
      status: status || "Unspecified",
      groomType: groom || "Unspecified",
      groomer: a.TrailGrooming || null,
      surface: a.SurfaceType || null,
      onRoad: a.TrailOnRoad || null,
      lengthMiles: Number.isFinite(Number(a.SegmentLengthMiles)) ? round1(a.SegmentLengthMiles) : null,
      comments: a.PublicComments || null,
      updatedAt: a.last_edited_date || null,
      geometry: f.geometry || null
    };
  });
}

function officialGate(segments, closures = [], season) {
  if (season.state !== "IN_SEASON") {
    return { state: "CLOSED", reason: "Michigan state-designated snowmobile trails are open Dec. 1–Mar. 31." };
  }
  const closed = segments.filter(s => /closed/i.test(s.status) && !/open/i.test(s.status));
  if (closed.length) return { state: "ROUTE_BROKEN", reason: `${closed.length} required official segment(s) report closed status.`, closed };
  if (closures.length) return { state: "CAUTION", reason: "Official DNR closure records intersect the proving corridor.", closures };
  if (!segments.length) return { state: "UNKNOWN", reason: "Official DNR trail geometry is unavailable; openness is not inferred." };
  return { state: "OPEN_NO_CLOSURE_FOUND", reason: "No required DNR segment in the loaded corridor reports closed status. This is not a guarantee of ride quality." };
}

function sourceFreshnessMinutes(iso, now = new Date()) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((now.getTime() - t) / 60000));
}

function freshnessState(minutes, kind) {
  if (minutes == null) return "UNKNOWN";
  const m = Number(minutes);
  if (kind === "geometry") return m < 10080 ? "RECENT" : "AGING";
  if (kind === "weather") return m < 90 ? "VERY_RECENT" : m < 360 ? "RECENT" : "STALE";
  if (kind === "club") return m < 360 ? "VERY_RECENT" : m < 1440 ? "RECENT" : m < 2880 ? "AGING" : "STALE";
  return m < 1440 ? "RECENT" : "AGING";
}

function reportSignal(reports = []) {
  const usable = reports.filter(r => r && r.available);
  const current = usable.filter(r => !["STALE","HISTORICAL"].includes(r.freshnessState));
  const ranked = current.map(r => {
    const c = String(r.condition || "UNKNOWN").toUpperCase();
    const score = c === "EXCELLENT" ? 90 : c === "GOOD" ? 80 : c === "FAIR" ? 62 : c === "POOR" ? 35 : null;
    return { ...r, signalScore: score };
  }).filter(r => Number.isFinite(r.signalScore));
  if (!ranked.length) return { score: null, count: current.length, label: "No fresh operator condition rating" };
  const weighted = ranked.reduce((s,r) => s + r.signalScore * (r.authorityWeight || 1), 0) /
    ranked.reduce((s,r) => s + (r.authorityWeight || 1), 0);
  return { score: Math.round(weighted), count: current.length, label: ranked.map(r => r.condition).join(" / ") };
}

function confidenceScore({segments, reports, weather, closures, dnrRetrievedAt, now = new Date()}) {
  let score = 20;
  if (segments.length) score += 28;
  if (weather.available) score += 18;
  const reportCurrent = reports.filter(r => r.available && !["STALE","HISTORICAL"].includes(r.freshnessState)).length;
  score += Math.min(24, reportCurrent * 8);
  if (Array.isArray(closures)) score += 6;
  if (!segments.length) score -= 25;
  const dnrAge = sourceFreshnessMinutes(dnrRetrievedAt, now);
  if (dnrAge != null && dnrAge > 360) score -= 8;
  return clamp(Math.round(score), 5, 98);
}

function conditionBand(score) {
  if (score == null) return "UNKNOWN";
  if (score >= 88) return "EXCELLENT";
  if (score >= 75) return "GOOD";
  if (score >= 58) return "FAIR";
  if (score >= 40) return "MARGINAL";
  return "POOR";
}

function inSeasonScore({weather, reports}) {
  let score = 62;
  const rs = reportSignal(reports);
  if (rs.score != null) score = 0.62 * rs.score + 0.38 * score;
  if (weather.available) {
    if (weather.thawRisk === "HIGH") score -= 24;
    else if (weather.thawRisk === "MODERATE") score -= 10;
    else score += 5;
    if (weather.snowLikely) score += 4;
    if (weather.rainLikely) score -= 12;
  }
  return clamp(Math.round(score), 10, 95);
}

function bestWindow(weather, gate, now = new Date()) {
  if (gate.state === "CLOSED") return { label: "Season opens Dec. 1", start: null, end: null };
  if (gate.state === "ROUTE_BROKEN") return { label: "No ride window while required segment is closed", start: null, end: null };
  if (!weather.available) return { label: "Verify grooming/operator reports before departure", start: null, end: null };
  if (weather.thawRisk === "HIGH") return { label: "Earlier/coldest hours preferred; thaw risk is elevated", start: null, end: null };
  if ((weather.next24MinF ?? 99) <= 28 && (weather.next24MaxF ?? 99) <= 34) return { label: "Cold conditions favor the next morning window, pending grooming verification", start: null, end: null };
  return { label: "No strong weather-only window; operator evidence should control", start: null, end: null };
}

function buildDecision(bundle, now = new Date()) {
  const season = seasonState(now);
  const segments = normalizeOfficial(bundle.dnr?.trails?.features || []);
  const closures = bundle.dnr?.closures?.features || [];
  const reroutes = bundle.dnr?.reroutes?.features || [];
  const weather = summarizeWeather(bundle.weather || []);
  const gate = officialGate(segments, closures, season);
  const reports = (bundle.reports || []).map(r => {
    const age = sourceFreshnessMinutes(r.reportedAt || r.retrievedAt, now);
    return { ...r, freshnessMinutes: age, freshnessState: freshnessState(age, "club") };
  });

  const score = gate.state === "CLOSED" || gate.state === "ROUTE_BROKEN" ? null : inSeasonScore({weather, reports});
  const condition = gate.state === "ROUTE_BROKEN" ? "ROUTE BROKEN"
    : gate.state === "CLOSED" ? "PRESEASON"
    : conditionBand(score);
  const confidence = confidenceScore({
    segments, reports, weather, closures,
    dnrRetrievedAt: bundle.dnr?.retrievedAt, now
  });

  const reasons = [];
  if (gate.state === "CLOSED") reasons.push("The legal state trail season has not opened yet.");
  if (segments.length) reasons.push(`${segments.length} official DNR trail segments loaded for the Grayling–Gaylord corridor.`);
  if (closures.length) reasons.push(`${closures.length} DNR closure record(s) intersect the corridor.`);
  if (reroutes.length) reasons.push(`${reroutes.length} DNR reroute record(s) intersect the corridor.`);
  if (reports.some(r => r.freshnessState === "STALE")) reasons.push("At least one local trail report is stale and is not treated as current grooming evidence.");
  if (weather.available && season.state === "IN_SEASON") reasons.push(`24-hour thaw risk: ${weather.thawRisk.toLowerCase()}.`);

  const newestEvidence = [
    bundle.dnr?.retrievedAt,
    ...reports.map(r => r.retrievedAt),
    ...bundle.weather.map(w => w.retrievedAt)
  ].filter(Boolean).sort().at(-1) || null;

  return {
    generatedAt: now.toISOString(),
    corridor: {
      id: "grayling-gaylord",
      name: "Grayling → Gaylord",
      start: {name:"Grayling", lat:44.6614, lon:-84.7148},
      end: {name:"Gaylord", lat:45.0275, lon:-84.6748}
    },
    season,
    routeStatus: gate,
    condition: { label: condition, score },
    confidence: { score: confidence, label: confidence >= 80 ? "High" : confidence >= 60 ? "Moderate" : "Low" },
    bestWindow: bestWindow(weather, gate, now),
    weather,
    reports,
    segments,
    closures,
    reroutes,
    reasons,
    newestEvidence,
    semantics: {
      naturalSnowDepthIsTrailBase: false,
      forecastSnowIsObservedSnow: false,
      noClosureDataMeansConfirmedOpen: false,
      groomingUnknownMeansGroomed: false
    }
  };
}

module.exports = {
  TZ, seasonState, summarizeWeather, normalizeOfficial, buildDecision,
  freshnessState, sourceFreshnessMinutes, conditionBand
};
