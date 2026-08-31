const {
  finite,
  forecastCrest,
  freshness,
  nwpsCategory,
  percentileBand,
  sourceMeta,
} = require("../lib/national-outdoor");

const IV = "https://waterservices.usgs.gov/nwis/iv/";
const STAT = "https://waterservices.usgs.gov/nwis/stat/";
const NWPS = "https://api.water.noaa.gov/nwps/v1";
const UA = "ChrisIzworskiNationalRiverConditions/2.1 (+https://chrisizworski.com/national-tools/rivers/)";
const SEARCH_SPANS = Object.freeze([0.6, 1.5, 2.4]);

function haversine(a, b, c, d) {
  const r = 3958.7613;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(c - a);
  const dLon = toRad(d - b);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(q));
}
function bbox(lat, lon, span) {
  const north = Math.min(90, lat + span);
  const south = Math.max(-90, lat - span);
  const west = Math.max(-180, lon - span);
  const east = Math.min(180, lon + span);
  return {
    north,
    south,
    west,
    east,
    product: Math.abs(east - west) * Math.abs(north - south),
    value: `${west},${south},${east},${north}`,
  };
}
async function fetchText(url, timeoutMs = 6000) {
  const r = await fetch(url, {
    headers: { accept: "text/plain", "user-agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`${new URL(url).hostname} returned ${r.status}`);
  return r.text();
}
async function fetchJson(url, timeoutMs = 6500, options = {}) {
  const r = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (r.status === 404 && options.allow404) return null;
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
function code(series) {
  return series.variable?.variableCode?.[0]?.value || null;
}
function siteId(series) {
  return series.sourceInfo?.siteCode?.[0]?.value || null;
}
function siteMeta(series) {
  const id = siteId(series);
  const geo = series.sourceInfo?.geoLocation?.geogLocation || {};
  const latitude = finite(geo.latitude, -90, 90);
  const longitude = finite(geo.longitude, -180, 180);
  if (!id || latitude == null || longitude == null) return null;
  return {
    id,
    name: series.sourceInfo?.siteName || id,
    latitude,
    longitude,
  };
}
function sitesFromPayload(payload) {
  const by = new Map();
  for (const series of payload?.value?.timeSeries || []) {
    if (code(series) !== "00060") continue;
    const meta = siteMeta(series);
    if (meta && !by.has(meta.id)) by.set(meta.id, meta);
  }
  return [...by.values()];
}
function validPoints(series) {
  return (series.values?.[0]?.value || [])
    .map((p) => ({ value: finite(p.value), time: p.dateTime, qualifiers: p.qualifiers || [] }))
    .filter((p) => p.value != null && p.value !== -999999 && Date.parse(p.time));
}
function atAgo(points, hours) {
  if (!points.length) return null;
  const target = Date.now() - hours * 3600000;
  return points.reduce((best, p) =>
    !best || Math.abs(Date.parse(p.time) - target) < Math.abs(Date.parse(best.time) - target) ? p : best, null);
}
function sampleSeries(points, maxPoints = 32) {
  if (points.length <= maxPoints) return points.map((p) => ({ time: p.time, value: p.value }));
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1)
    .map((p) => ({ time: p.time, value: p.value }));
}
function normalize(payload, sites) {
  const by = new Map(sites.map((x) => [x.id, {
    ...x,
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
    const last = points.at(-1), gauge = by.get(id);
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
  return [...by.values()].map((gauge) => {
    const fresh = freshness(gauge.measured_at, 180);
    return { ...gauge, ...fresh, fresh: fresh.status === "current", provisional: true };
  });
}
async function nearbyObservations(lat, lon) {
  const errors = [];
  let successfulWindows = 0;
  for (const span of SEARCH_SPANS) {
    const box = bbox(lat, lon, span);
    if (box.product > 25.000001) continue;
    const u = new URL(IV);
    u.searchParams.set("format", "json");
    u.searchParams.set("bBox", box.value);
    u.searchParams.set("siteType", "ST");
    u.searchParams.set("siteStatus", "active");
    u.searchParams.set("parameterCd", "00060,00065,00010");
    u.searchParams.set("period", "P1D");
    try {
      const payload = await fetchJson(u, 7000, { allow404: true });
      successfulWindows += 1;
      if (!payload) continue;
      const sites = sitesFromPayload(payload);
      if (!sites.length) continue;
      const gauges = normalize(payload, sites)
        .filter((gauge) => gauge.discharge_cfs != null)
        .map((gauge) => ({
          ...gauge,
          distance_miles: haversine(lat, lon, gauge.latitude, gauge.longitude),
        }))
        .sort((a, b) => a.distance_miles - b.distance_miles)
        .slice(0, 10);
      if (gauges.length) return gauges;
    } catch (error) {
      errors.push(`span ${span}: ${String(error?.message || error)}`);
    }
  }
  if (successfulWindows > 0) return [];
  throw new Error(errors.length ? errors.join(" | ") : "USGS instantaneous values unavailable");
}
function parseStatsRdb(body, now = new Date()) {
  const lines = String(body || "").split(/\r?\n/).filter(Boolean);
  const hi = lines.findIndex((x) => !x.startsWith("#") && x.includes("site_no") && x.includes("month_nu") && x.includes("day_nu"));
  if (hi < 0) return new Map();
  const headers = lines[hi].split("\t");
  const index = (name) => headers.indexOf(name);
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const out = new Map();
  for (const line of lines.slice(hi + 2)) {
    if (!line || line.startsWith("#")) continue;
    const p = line.split("\t");
    if (Number(p[index("month_nu")]) !== month || Number(p[index("day_nu")]) !== day) continue;
    const id = p[index("site_no")];
    if (!id) continue;
    out.set(id, {
      p10: finite(p[index("p10_va")]),
      p25: finite(p[index("p25_va")]),
      p50: finite(p[index("p50_va")]),
      p75: finite(p[index("p75_va")]),
      p90: finite(p[index("p90_va")]),
      begin_year: finite(p[index("begin_yr")]),
      end_year: finite(p[index("end_yr")]),
      count: finite(p[index("count_nu")]),
      month,
      day,
    });
  }
  return out;
}
async function dailyStatistics(sites) {
  const ids = sites.slice(0, 4).map((x) => x.id);
  if (!ids.length) return new Map();
  const u = new URL(STAT);
  u.searchParams.set("format", "rdb");
  u.searchParams.set("sites", ids.join(","));
  u.searchParams.set("parameterCd", "00060");
  u.searchParams.set("statReportType", "daily");
  u.searchParams.set("statTypeCd", "p10,p25,p50,p75,p90");
  return parseStatsRdb(await fetchText(u, 5500));
}
async function nwpsGaugeIndex(lat, lon) {
  const span = 2.4;
  const params = new URLSearchParams({
    "bbox.xmin": String(Math.max(-180, lon - span)),
    "bbox.ymin": String(Math.max(-90, lat - span)),
    "bbox.xmax": String(Math.min(180, lon + span)),
    "bbox.ymax": String(Math.min(90, lat + span)),
    srid: "EPSG_4326",
  });
  const data = await fetchJson(`${NWPS}/gauges?${params}`, 5500);
  return Array.isArray(data?.gauges) ? data.gauges : [];
}
function normalizeNwps(metadata, forecast) {
  const observed = metadata?.status?.observed || {};
  const categories = metadata?.flood?.categories || {};
  const forecastPoints = Array.isArray(forecast?.data) ? forecast.data : [];
  const crest = forecastCrest(forecastPoints);
  return {
    lid: metadata?.lid || null,
    usgs_id: metadata?.usgsId || null,
    name: metadata?.name || null,
    official_url: metadata?.lid ? `https://water.noaa.gov/gauges/${String(metadata.lid).toLowerCase()}` : null,
    observed_stage_ft: finite(observed.primary),
    observed_at: observed.validTime || null,
    observed_category: nwpsCategory(observed.primary, categories),
    categories,
    forecast_available: Boolean(forecastPoints.length),
    forecast_crest: crest,
    forecast_crest_category: crest ? nwpsCategory(crest.stage, categories) : null,
    impacts: Array.isArray(metadata?.flood?.impacts) ? metadata.flood.impacts.slice(0, 12) : [],
  };
}
async function nwpsEnrichment(lat, lon, gauges) {
  try {
    const index = await nwpsGaugeIndex(lat, lon);
    const byUsgs = new Map(index.filter((g) => g?.usgsId && g?.lid).map((g) => [String(g.usgsId), g]));
    const targets = gauges.slice(0, 4).map((gauge) => ({ gauge, match: byUsgs.get(String(gauge.id)) })).filter((x) => x.match);
    const results = await Promise.all(targets.map(async ({ gauge, match }) => {
      try {
        const lid = match.lid;
        const [metadata, forecast] = await Promise.all([
          fetchJson(`${NWPS}/gauges/${encodeURIComponent(lid)}`, 5000),
          fetchJson(`${NWPS}/gauges/${encodeURIComponent(lid)}/stageflow/forecast`, 5000, { allow404: true }).catch(() => null),
        ]);
        return [gauge.id, normalizeNwps(metadata, forecast)];
      } catch {
        return [gauge.id, null];
      }
    }));
    return new Map(results);
  } catch {
    return new Map();
  }
}
function trendLabel(percent) {
  const value = finite(percent);
  if (value == null) return "Trend unavailable";
  if (Math.abs(value) < 3) return "Roughly steady";
  return value > 0 ? "Rising" : "Falling";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const lat = finite(req.query?.lat, -90, 90), lon = finite(req.query?.lon, -180, 180);
  if (lat == null || lon == null) return res.status(400).json({ error: "Valid latitude and longitude are required" });

  try {
    const gauges = await nearbyObservations(lat, lon);
    const [statsResult, nwpsResult] = await Promise.allSettled([
      dailyStatistics(gauges),
      nwpsEnrichment(lat, lon, gauges),
    ]);
    const stats = statsResult.status === "fulfilled" ? statsResult.value : new Map();
    const nwps = nwpsResult.status === "fulfilled" ? nwpsResult.value : new Map();

    const enriched = gauges.map((gauge) => {
      const historical = stats.get(gauge.id) || null;
      return {
        ...gauge,
        trend_label: trendLabel(gauge.trend_percent_6h),
        historical_daily_flow: historical,
        historical_comparison: historical ? percentileBand(gauge.discharge_cfs, historical) : {
          label: "Historical comparison unavailable",
          code: "unknown",
          confidence: "low",
        },
        nwps: nwps.get(gauge.id) || null,
      };
    });

    const now = new Date().toISOString();
    const newestObserved = enriched.map((g) => g.measured_at).filter(Boolean).sort().at(-1) || null;
    return res.status(200).json({
      retrieved_at: now,
      degraded: statsResult.status === "rejected" || nwpsResult.status === "rejected",
      discovery: "USGS instantaneous-values bbox",
      location: { latitude: lat, longitude: lon },
      gauges: enriched,
      sources: [
        sourceMeta({
          name: "USGS Water Data for the Nation — instantaneous values",
          url: "https://waterdata.usgs.gov/",
          updatedAt: newestObserved,
          staleAfterMinutes: 180,
          available: Boolean(enriched.length),
          status: "provisional observations",
        }),
        sourceMeta({
          name: "USGS approved daily statistics",
          url: "https://waterservices.usgs.gov/docs/statistics/",
          updatedAt: null,
          available: statsResult.status === "fulfilled" && stats.size > 0,
          status: "historical climatology",
        }),
        sourceMeta({
          name: "NOAA National Water Prediction Service",
          url: "https://water.noaa.gov/",
          updatedAt: null,
          available: [...nwps.values()].some(Boolean),
          status: "official forecast/flood context where matched",
        }),
      ],
      disclaimer: "USGS readings are provisional and subject to revision. Historical percentiles describe this calendar date at the gauge; they are not recreation thresholds. NOAA flood categories and forecasts are shown only when an NWPS gauge can be confidently matched by USGS site ID. Flow or stage alone cannot determine whether paddling, swimming, wading, fishing, or boating is safe.",
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "River observations unavailable from USGS",
      detail: String(error?.message || error),
    });
  }
};

module.exports._test = {
  SEARCH_SPANS,
  atAgo,
  bbox,
  haversine,
  normalize,
  normalizeNwps,
  parseStatsRdb,
  sampleSeries,
  siteMeta,
  sitesFromPayload,
  trendLabel,
};
