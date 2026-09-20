"use strict";

const TZ = "America/Detroit";
const FRESH_REPORT_STATES = new Set(["LIVE","VERY_RECENT","RECENT"]);

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
  const hourly = points.flatMap(p => Array.isArray(p.hourly) ? p.hourly.slice(0, 24) : []);
  if (!hourly.length) return {
    available: false, currentTempF: null, next24MinF: null, next24MaxF: null,
    hoursAbove32: null, rainLikely: null, snowLikely: null, thawRisk: "UNKNOWN"
  };
  const temps = hourly.map(h => parseTemp(h.temperature)).filter(Number.isFinite);
  const currentTempF = temps[0] ?? null;
  const next24MinF = temps.length ? Math.min(...temps) : null;
  const next24MaxF = temps.length ? Math.max(...temps) : null;
  const hoursAbove32 = temps.filter(t => t > 32).length;
  const text = hourly.map(h => String(h.shortForecast || h.detailedForecast || "")).join(" ").toLowerCase();
  const rainLikely = /(rain|drizzle|showers)/.test(text);
  const snowLikely = /(snow|flurr)/.test(text);
  let thawRisk = "LOW";
  if (rainLikely) thawRisk = "HIGH";
  else if (hoursAbove32 >= 18 || (next24MaxF ?? 0) >= 42) thawRisk = "HIGH";
  else if (hoursAbove32 >= 8 || (next24MaxF ?? 0) >= 35) thawRisk = "MODERATE";
  return { available: true, currentTempF, next24MinF, next24MaxF, hoursAbove32, rainLikely, snowLikely, thawRisk };
}

function normalizeOfficial(features = []) {
  return features.map((f, idx) => {
    const a = f.properties || f.attributes || {};
    const status = String(a.OpenClosedStatusSnowmobile || "").trim();
    const groom = String(a.TrailGroomType || "").trim();
    const trailNamePrimary = String(a.TrailNamePrimary || "").trim();
    const snowmobileName = String(a.SnowmobileName || "").trim();
    return {
      id: a.GlobalID || a.OBJECTID || `segment-${idx + 1}`,
      name: trailNamePrimary || snowmobileName || "Snowmobile trail segment",
      trailNamePrimary: trailNamePrimary || null,
      snowmobileName: snowmobileName || null,
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

function isTrail7Segment(segment) {
  const labels = [segment?.trailNamePrimary, segment?.snowmobileName, segment?.name]
    .filter(Boolean).map(v => String(v).trim());
  return labels.some(label => {
    if (/^7$/i.test(label)) return true;
    if (/^(?:lp\s*)?trail\s*#?\s*7(?:\b|\s|[-/])/i.test(label)) return true;
    if (/^(?:lp\s*)?#?\s*7(?:\b|\s|[-/])/i.test(label)) return true;
    return /\bsnowmobile\s+trail\s*#?\s*7\b/i.test(label);
  });
}

function featureMentionsTrail7(feature) {
  const p = feature?.properties || feature?.attributes || {};
  const text = Object.entries(p)
    .filter(([key]) => /trail|snowmobile|name|comment|description/i.test(key))
    .map(([, value]) => String(value ?? ""))
    .join(" ");
  return /\b(?:snowmobile\s+)?trail\s*#?\s*7\b/i.test(text) ||
    /\bLP\s*7\b/i.test(text) ||
    /(?:^|[^0-9])#?7(?:[^0-9]|$)/.test(String(p.SnowmobileName || ""));
}

function officialGate(segments, relevantClosures = [], season) {
  if (season.state !== "IN_SEASON") {
    return { state: "CLOSED", reason: "Michigan state-designated snowmobile trails are open Dec. 1–Mar. 31." };
  }
  if (!segments.length) {
    return { state: "UNKNOWN", reason: "Required Trail 7 geometry is not verified from the official DNR layer; openness is not inferred." };
  }
  const closed = segments.filter(s => /closed/i.test(s.status) && !/open/i.test(s.status));
  if (closed.length) return { state: "ROUTE_BROKEN", reason: `${closed.length} required Trail 7 segment(s) report closed status in the DNR layer.`, closed };
  if (relevantClosures.length) return {
    state: "ROUTE_BROKEN",
    reason: "An official DNR closure record identifies Trail 7 in the proving corridor.",
    closures: relevantClosures
  };
  return {
    state: "OPEN_NO_CLOSURE_FOUND",
    reason: "Loaded required Trail 7 segments do not report a closure. This is not a guarantee of trail quality or a substitute for on-trail signs."
  };
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
  const current = reports.filter(r => r?.available && FRESH_REPORT_STATES.has(r.freshnessState));
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

function confidenceScore({segments, reports, weather, dnrRetrievedAt, now = new Date()}) {
  let score = 14;
  if (segments.length) score += 34;
  if (weather.available) score += 18;
  const reportCurrent = reports.filter(r => r.available && FRESH_REPORT_STATES.has(r.freshnessState)).length;
  score += Math.min(24, reportCurrent * 8);
  if (!segments.length) score -= 20;
  if (!reportCurrent) score -= 12;
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
  const rs = reportSignal(reports);
  if (rs.score == null) return null;
  let score = rs.score;
  if (weather.available) {
    if (weather.thawRisk === "HIGH") score -= 24;
    else if (weather.thawRisk === "MODERATE") score -= 10;
    else score += 5;
    if (weather.rainLikely) score -= 12;
  }
  return clamp(Math.round(score), 10, 95);
}

function bestWindow(weather, gate, reports) {
  if (gate.state === "CLOSED") return { label: "Season opens Dec. 1", start: null, end: null };
  if (gate.state === "ROUTE_BROKEN") return { label: "No ride window while the required route is closed", start: null, end: null };
  if (gate.state === "UNKNOWN") return { label: "Verify official Trail 7 status before planning a ride", start: null, end: null };
  if (reportSignal(reports).score == null) return { label: "Fresh operator/grooming evidence required before recommending a ride window", start: null, end: null };
  if (!weather.available) return { label: "Fresh trail report available; weather timing unavailable", start: null, end: null };
  if (weather.thawRisk === "HIGH") return { label: "Earlier/coldest hours preferred; thaw risk is elevated", start: null, end: null };
  if ((weather.next24MinF ?? 99) <= 28 && (weather.next24MaxF ?? 99) <= 34) {
    return { label: "Cold conditions favor the next morning, pending grooming verification", start: null, end: null };
  }
  return { label: "No strong weather advantage; fresh operator evidence controls", start: null, end: null };
}

function buildDecision(bundle, now = new Date()) {
  const season = seasonState(now);
  const allSegments = normalizeOfficial(bundle.dnr?.trails?.features || []);
  const segments = allSegments.filter(isTrail7Segment);
  const nearbyClosures = bundle.dnr?.closures?.features || [];
  const nearbyReroutes = bundle.dnr?.reroutes?.features || [];
  const relevantClosures = nearbyClosures.filter(featureMentionsTrail7);
  const relevantReroutes = nearbyReroutes.filter(featureMentionsTrail7);
  const weather = summarizeWeather(bundle.weather || []);
  const gate = officialGate(segments, relevantClosures, season);
  const reports = (bundle.reports || []).map(r => {
    const age = sourceFreshnessMinutes(r.reportedAt, now);
    return { ...r, freshnessMinutes: age, freshnessState: freshnessState(age, "club") };
  });

  const score = ["CLOSED","ROUTE_BROKEN","UNKNOWN"].includes(gate.state)
    ? null
    : inSeasonScore({weather, reports});
  const condition = gate.state === "ROUTE_BROKEN" ? "ROUTE BROKEN"
    : gate.state === "CLOSED" ? "PRESEASON"
    : gate.state === "UNKNOWN" ? "STATUS UNKNOWN"
    : score == null ? "EVIDENCE GAP"
    : conditionBand(score);
  const confidence = confidenceScore({
    segments, reports, weather,
    dnrRetrievedAt: bundle.dnr?.retrievedAt, now
  });

  const reasons = [];
  if (gate.state === "CLOSED") reasons.push("The legal state trail season has not opened yet.");
  if (segments.length) reasons.push(`${segments.length} official DNR Trail 7 segment(s) loaded in the Grayling–Gaylord proving corridor.`);
  if (!segments.length) reasons.push("Trail 7 could not be isolated from the official DNR response, so route openness remains unknown.");
  if (relevantClosures.length) reasons.push(`${relevantClosures.length} DNR closure record(s) explicitly reference Trail 7.`);
  if (relevantReroutes.length) reasons.push(`${relevantReroutes.length} DNR reroute record(s) explicitly reference Trail 7.`);
  if (nearbyClosures.length > relevantClosures.length) {
    reasons.push("Additional DNR closure records are nearby but are not treated as Trail 7 closures without explicit route evidence.");
  }
  if (reports.some(r => r.freshnessState === "STALE")) reasons.push("At least one local trail report is stale and is not treated as current grooming evidence.");
  if (reports.some(r => r.freshnessState === "UNKNOWN")) reasons.push("At least one report has no reliable report timestamp and is not treated as fresh condition evidence.");
  if (season.state === "IN_SEASON" && reportSignal(reports).score == null) {
    reasons.push("Weather alone is not being converted into a favorable trail-condition score.");
  }
  if (weather.available && season.state === "IN_SEASON") reasons.push(`24-hour thaw risk: ${weather.thawRisk.toLowerCase()}.`);

  const newestEvidence = [
    bundle.dnr?.retrievedAt,
    ...reports.map(r => r.retrievedAt),
    ...(bundle.weather || []).map(w => w.retrievedAt)
  ].filter(Boolean).sort().at(-1) || null;

  return {
    generatedAt: now.toISOString(),
    corridor: {
      id: "grayling-gaylord",
      name: "Grayling → Gaylord",
      officialRoute: "Trail 7",
      start: {name:"Grayling", lat:44.6614, lon:-84.7148},
      end: {name:"Gaylord", lat:45.0275, lon:-84.6748}
    },
    season,
    routeStatus: gate,
    condition: { label: condition, score },
    confidence: { score: confidence, label: confidence >= 80 ? "High" : confidence >= 60 ? "Moderate" : "Low" },
    bestWindow: bestWindow(weather, gate, reports),
    weather,
    reports,
    segments,
    officialTrailCandidatesInBbox: allSegments.length,
    closures: relevantClosures,
    reroutes: relevantReroutes,
    nearbyClosureCount: nearbyClosures.length,
    nearbyRerouteCount: nearbyReroutes.length,
    reasons,
    newestEvidence,
    semantics: {
      naturalSnowDepthIsTrailBase: false,
      forecastSnowIsObservedSnow: false,
      noClosureDataMeansConfirmedOpen: false,
      groomingUnknownMeansGroomed: false,
      bboxClosureMeansRouteClosure: false,
      weatherAloneCreatesTrailCondition: false
    }
  };
}

module.exports = {
  TZ, seasonState, summarizeWeather, normalizeOfficial, isTrail7Segment,
  featureMentionsTrail7, buildDecision, freshnessState, sourceFreshnessMinutes,
  conditionBand, reportSignal
};
