const {
  finite,
  freshness,
  sourceMeta,
} = require("../lib/national-outdoor");

const SITE = "https://waterservices.usgs.gov/nwis/site/";
const IV = "https://waterservices.usgs.gov/nwis/iv/";
const UA = "ChrisIzworskiNationalRiverConditions/3.0 (+https://chrisizworski.com/national-tools/rivers/)";
const SEARCH_SPANS = Object.freeze([0.6, 1.5, 2.4]);

function haversine(a, b, c, d) {
  const r = 3958.7613;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(c - a);
  const dLon = toRad(d - b);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(q));
}
function roundCoord(value) {
  return Math.round(Number(value) * 1e7) / 1e7;
}
function bbox(lat, lon, span) {
  const north = roundCoord(Math.min(90, lat + span));
  const south = roundCoord(Math.max(-90, lat - span));
  const west = roundCoord(Math.max(-180, lon - span));
  const east = roundCoord(Math.min(180, lon + span));
  return {
    north,
    south,
    west,
    east,
    product: Math.abs(east - west) * Math.abs(north - south),
    value: `${west},${south},${east},${north}`,
  };
}
async function fetchText(url, timeoutMs = 3900) {
  const r = await fetch(url, {
    headers: { accept: "text/plain", "user-agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`${new URL(url).hostname} returned ${r.status}`);
  return r.text();
}
async function fetchJson(url, timeoutMs = 900) {
  const r = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`${new URL(url).hostname} returned ${r.status}`);
  const type = String(r.headers.get("content-type") || "").toLowerCase();
  const text = await r.text();
  if (!type.includes("json")) throw new Error(`${new URL(url).hostname} returned non-JSON content`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${new URL(url).hostname} returned invalid JSON`);
  }
}
function parseSiteRdb(body) {
  const lines = String(body || "").split(/\r?\n/).filter(Boolean);
  const hi = lines.findIndex((line) => !line.startsWith("#") && line.includes("site_no") && line.includes("station_nm"));
  if (hi < 0) return [];
  const headers = lines[hi].split("\t");
  const index = (name) => headers.indexOf(name);
  const idI = index("site_no");
  const nameI = index("station_nm");
  const latI = index("dec_lat_va");
  const lonI = index("dec_long_va");
  if ([idI, nameI, latI, lonI].some((i) => i < 0)) return [];
  return lines.slice(hi + 2)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("\t"))
    .map((parts) => ({
      id: parts[idI],
      name: parts[nameI],
      latitude: finite(parts[latI], -90, 90),
      longitude: finite(parts[lonI], -180, 180),
    }))
    .filter((site) => site.id && site.latitude != null && site.longitude != null);
}
async function siteSearch(lat, lon, span) {
  const box = bbox(lat, lon, span);
  if (box.product > 25.000001) return { span, ok: false, rows: [], error: "bbox exceeds USGS limit" };
  const u = new URL(SITE);
  u.searchParams.set("format", "rdb");
  u.searchParams.set("bBox", box.value);
  u.searchParams.set("siteType", "ST");
  u.searchParams.set("siteStatus", "active");
  u.searchParams.set("hasDataTypeCd", "iv");
  u.searchParams.set("parameterCd", "00060");
  try {
    return { span, ok: true, rows: parseSiteRdb(await fetchText(u, 3900)) };
  } catch (error) {
    return { span, ok: false, rows: [], error: String(error?.message || error) };
  }
}
async function findSites(lat, lon) {
  const results = await Promise.all(SEARCH_SPANS.map((span) => siteSearch(lat, lon, span)));
  const successful = results.filter((result) => result.ok).sort((a, b) => a.span - b.span);
  const match = successful.find((result) => result.rows.length);
  if (!match) {
    if (successful.length) return [];
    throw new Error(results.map((result) => `span ${result.span}: ${result.error || "failed"}`).join(" | "));
  }
  return match.rows
    .map((site) => ({
      ...site,
      distance_miles: haversine(lat, lon, site.latitude, site.longitude),
    }))
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, 10);
}
function code(series) {
  return series.variable?.variableCode?.[0]?.value || null;
}
function siteId(series) {
  return series.sourceInfo?.siteCode?.[0]?.value || null;
}
function validPoints(series) {
  return (series.values?.[0]?.value || [])
    .map((point) => ({ value: finite(point.value), time: point.dateTime, qualifiers: point.qualifiers || [] }))
    .filter((point) => point.value != null && point.value !== -999999 && Date.parse(point.time));
}
function atAgo(points, hours) {
  if (!points.length) return null;
  const target = Date.now() - hours * 3600000;
  return points.reduce((best, point) =>
    !best || Math.abs(Date.parse(point.time) - target) < Math.abs(Date.parse(best.time) - target) ? point : best, null);
}
function sampleSeries(points, maxPoints = 32) {
  if (points.length <= maxPoints) return points.map((point) => ({ time: point.time, value: point.value }));
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1)
    .map((point) => ({ time: point.time, value: point.value }));
}
function trendLabel(percent) {
  const value = finite(percent);
  if (value == null) return "Trend unavailable";
  if (Math.abs(value) < 3) return "Roughly steady";
  return value > 0 ? "Rising" : "Falling";
}
function normalize(payload, sites) {
  const by = new Map(sites.map((site) => [site.id, {
    ...site,
    discharge_cfs: null,
    gage_height_ft: null,
    water_temp_f: null,
    measured_at: null,
    flow_6h_ago: null,
    trend_percent_6h: null,
    flow_series_24h: [],
    qualifiers: [],
  }]));
  for (const series of payload?.value?.timeSeries || []) {
    const id = siteId(series);
    if (!by.has(id)) continue;
    const points = validPoints(series);
    if (!points.length) continue;
    const last = points.at(-1);
    const gauge = by.get(id);
    if (!gauge.measured_at || Date.parse(last.time) > Date.parse(gauge.measured_at)) gauge.measured_at = last.time;
    if (code(series) === "00060") {
      gauge.discharge_cfs = last.value;
      const old = atAgo(points, 6);
      gauge.flow_6h_ago = old?.value ?? null;
      if (old && old.value > 0) gauge.trend_percent_6h = Math.round(((last.value - old.value) / old.value) * 100);
      gauge.flow_series_24h = sampleSeries(points);
    }
    if (code(series) === "00065") gauge.gage_height_ft = last.value;
    if (code(series) === "00010") gauge.water_temp_f = Math.round((last.value * 9 / 5 + 32) * 10) / 10;
    gauge.qualifiers = [...new Set([...gauge.qualifiers, ...last.qualifiers])];
  }
  return [...by.values()]
    .filter((gauge) => gauge.discharge_cfs != null)
    .map((gauge) => {
      const age = freshness(gauge.measured_at, 180);
      return {
        ...gauge,
        ...age,
        fresh: age.status === "current",
        provisional: true,
        trend_label: trendLabel(gauge.trend_percent_6h),
        historical_daily_flow: null,
        historical_comparison: {
          label: "Historical comparison loading",
          code: "unknown",
          confidence: "low",
        },
        nwps: null,
      };
    });
}
async function observations(sites) {
  if (!sites.length) return [];
  const u = new URL(IV);
  u.searchParams.set("format", "json");
  u.searchParams.set("sites", sites.map((site) => site.id).join(","));
  u.searchParams.set("parameterCd", "00060,00065,00010");
  u.searchParams.set("period", "P1D");
  u.searchParams.set("siteStatus", "all");
  return normalize(await fetchJson(u, 900), sites);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const lat = finite(req.query?.lat, -90, 90);
  const lon = finite(req.query?.lon, -180, 180);
  if (lat == null || lon == null) return res.status(400).json({ error: "Valid latitude and longitude are required" });

  try {
    const sites = await findSites(lat, lon);
    const gauges = await observations(sites);
    const now = new Date().toISOString();
    const newestObserved = gauges.map((gauge) => gauge.measured_at).filter(Boolean).sort().at(-1) || null;
    return res.status(200).json({
      retrieved_at: now,
      degraded: false,
      context_pending: Boolean(gauges.length),
      discovery: "USGS Site Service metadata + exact-site instantaneous values",
      location: { latitude: lat, longitude: lon },
      gauges,
      sources: [
        sourceMeta({
          name: "USGS Water Data for the Nation — instantaneous values",
          url: "https://waterdata.usgs.gov/",
          updatedAt: newestObserved,
          staleAfterMinutes: 180,
          available: Boolean(gauges.length),
          status: "provisional observations",
        }),
      ],
      disclaimer: "USGS readings are provisional and subject to revision. Historical percentiles and NOAA forecast/flood context load separately so they cannot delay current observations. Flow or stage alone cannot determine whether paddling, swimming, wading, fishing, or boating is safe.",
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    const detail = String(error?.message || error).slice(0, 240);
    return res.status(502).json({
      error: "River observations unavailable from USGS · " + detail,
      detail,
    });
  }
};

module.exports._test = {
  SEARCH_SPANS,
  atAgo,
  bbox,
  findSites,
  haversine,
  normalize,
  parseSiteRdb,
  roundCoord,
  sampleSeries,
  siteSearch,
  trendLabel,
};
