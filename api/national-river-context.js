const {
  finite,
  forecastCrest,
  nwpsCategory,
  percentileBand,
  sourceMeta,
} = require("../lib/national-outdoor");

const STAT = "https://waterservices.usgs.gov/nwis/stat/";
const NWPS = "https://api.water.noaa.gov/nwps/v1";
const UA = "ChrisIzworskiNationalRiverContext/1.0 (+https://chrisizworski.com/national-tools/rivers/)";

async function fetchText(url, timeoutMs = 3000) {
  const response = await fetch(url, {
    headers: { accept: "text/plain", "user-agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.text();
}
async function fetchJson(url, timeoutMs = 1800, options = {}) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 404 && options.allow404) return null;
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.json();
}
function parseStatsRdb(body, now = new Date()) {
  const lines = String(body || "").split(/\r?\n/).filter(Boolean);
  const hi = lines.findIndex((line) => !line.startsWith("#") && line.includes("site_no") && line.includes("month_nu") && line.includes("day_nu"));
  if (hi < 0) return new Map();
  const headers = lines[hi].split("\t");
  const index = (name) => headers.indexOf(name);
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const out = new Map();
  for (const line of lines.slice(hi + 2)) {
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (Number(parts[index("month_nu")]) !== month || Number(parts[index("day_nu")]) !== day) continue;
    const id = parts[index("site_no")];
    if (!id) continue;
    out.set(id, {
      p10: finite(parts[index("p10_va")]),
      p25: finite(parts[index("p25_va")]),
      p50: finite(parts[index("p50_va")]),
      p75: finite(parts[index("p75_va")]),
      p90: finite(parts[index("p90_va")]),
      begin_year: finite(parts[index("begin_yr")]),
      end_year: finite(parts[index("end_yr")]),
      count: finite(parts[index("count_nu")]),
      month,
      day,
    });
  }
  return out;
}
async function dailyStatistics(ids) {
  if (!ids.length) return new Map();
  const url = new URL(STAT);
  url.searchParams.set("format", "rdb");
  url.searchParams.set("sites", ids.join(","));
  url.searchParams.set("parameterCd", "00060");
  url.searchParams.set("statReportType", "daily");
  url.searchParams.set("statTypeCd", "p10,p25,p50,p75,p90");
  return parseStatsRdb(await fetchText(url, 3000));
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
  const data = await fetchJson(`${NWPS}/gauges?${params}`, 1800);
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
async function nwpsContext(lat, lon, ids) {
  try {
    const index = await nwpsGaugeIndex(lat, lon);
    const byUsgs = new Map(index.filter((gauge) => gauge?.usgsId && gauge?.lid).map((gauge) => [String(gauge.usgsId), gauge]));
    const targets = ids.map((id) => ({ id, match: byUsgs.get(String(id)) })).filter((entry) => entry.match);
    const pairs = await Promise.all(targets.map(async ({ id, match }) => {
      try {
        const lid = match.lid;
        const [metadata, forecast] = await Promise.all([
          fetchJson(`${NWPS}/gauges/${encodeURIComponent(lid)}`, 1400),
          fetchJson(`${NWPS}/gauges/${encodeURIComponent(lid)}/stageflow/forecast`, 1400, { allow404: true }).catch(() => null),
        ]);
        return [id, normalizeNwps(metadata, forecast)];
      } catch {
        return [id, null];
      }
    }));
    return new Map(pairs);
  } catch {
    return new Map();
  }
}
function validSiteIds(value) {
  return [...new Set(String(value || "").split(",").map((id) => id.trim()).filter((id) => /^\d{5,15}$/.test(id)))].slice(0, 6);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lat = finite(req.query?.lat, -90, 90);
  const lon = finite(req.query?.lon, -180, 180);
  const ids = validSiteIds(req.query?.sites);
  if (lat == null || lon == null || !ids.length) {
    return res.status(400).json({ error: "Valid latitude, longitude and USGS site IDs are required" });
  }

  const [statsResult, nwpsResult] = await Promise.allSettled([
    dailyStatistics(ids),
    nwpsContext(lat, lon, ids),
  ]);
  const stats = statsResult.status === "fulfilled" ? statsResult.value : new Map();
  const nwps = nwpsResult.status === "fulfilled" ? nwpsResult.value : new Map();

  const context = {};
  for (const id of ids) {
    const historical = stats.get(id) || null;
    context[id] = {
      historical_daily_flow: historical,
      historical_comparison: historical ? null : {
        label: "Historical comparison unavailable",
        code: "unknown",
        confidence: "low",
      },
      nwps: nwps.get(id) || null,
    };
  }

  return res.status(200).json({
    retrieved_at: new Date().toISOString(),
    degraded: statsResult.status !== "fulfilled" || nwpsResult.status !== "fulfilled",
    context,
    historical: Object.fromEntries([...stats.entries()]),
    sources: [
      sourceMeta({
        name: "USGS approved daily statistics",
        url: "https://waterservices.usgs.gov/docs/statistics/",
        updatedAt: null,
        available: stats.size > 0,
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
  });
};

module.exports._test = {
  normalizeNwps,
  parseStatsRdb,
  validSiteIds,
};
