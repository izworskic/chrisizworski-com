const {
  finite,
  freshness,
  sourceMeta,
} = require("../lib/national-outdoor");
const siteIndex = require("../public/data/national-usgs-streamflow-sites.json");

const IV = "https://waterservices.usgs.gov/nwis/iv/";
const UA = "ChrisIzworskiNationalRiverConditions/4.0 (+https://chrisizworski.com/national-tools/rivers/)";

function haversine(a, b, c, d) {
  const r = 3958.7613;
  const toRad = (x) => x * Math.PI / 180;
  const dLat = toRad(c - a);
  const dLon = toRad(d - b);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(q));
}
function nearestSites(lat, lon, limit = 10) {
  const sites = Array.isArray(siteIndex?.sites) ? siteIndex.sites : [];
  return sites
    .map((site) => ({
      id: site.id,
      name: site.name,
      latitude: finite(site.latitude, -90, 90),
      longitude: finite(site.longitude, -180, 180),
      distance_miles: haversine(lat, lon, Number(site.latitude), Number(site.longitude)),
    }))
    .filter((site) => site.id && site.latitude != null && site.longitude != null && Number.isFinite(site.distance_miles))
    .sort((a, b) => a.distance_miles - b.distance_miles)
    .slice(0, Math.max(1, Math.min(20, Number(limit) || 10)));
}
async function fetchJson(url, timeoutMs = 2500) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  const type = String(response.headers.get("content-type") || "").toLowerCase();
  const text = await response.text();
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
  const url = new URL(IV);
  url.searchParams.set("format", "json");
  url.searchParams.set("sites", sites.map((site) => site.id).join(","));
  url.searchParams.set("parameterCd", "00060,00065,00010");
  url.searchParams.set("period", "P1D");
  url.searchParams.set("siteStatus", "all");
  return normalize(await fetchJson(url, 2500), sites);
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
    const sites = nearestSites(lat, lon, 10);
    const gauges = await observations(sites);
    const now = new Date().toISOString();
    const newestObserved = gauges.map((gauge) => gauge.measured_at).filter(Boolean).sort().at(-1) || null;
    return res.status(200).json({
      retrieved_at: now,
      degraded: false,
      context_pending: Boolean(gauges.length),
      discovery: "Local USGS active-streamflow site index + exact-site instantaneous values",
      discovery_index: {
        generated_at: siteIndex.generated_at || null,
        site_count: finite(siteIndex.site_count),
        source_name: siteIndex.source_name || "USGS Site Service",
        source_url: siteIndex.source_url || "https://waterservices.usgs.gov/nwis/site/",
      },
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
      disclaimer: "Nearest-gauge discovery uses a periodically refreshed index of active USGS streamflow sites; displayed readings are fetched live from USGS by exact site ID and remain provisional. Historical percentiles and NOAA forecast/flood context load separately. Flow or stage alone cannot determine whether paddling, swimming, wading, fishing, or boating is safe.",
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
  atAgo,
  haversine,
  nearestSites,
  normalize,
  sampleSeries,
  trendLabel,
};
