const {
  finite,
  localDateKey,
  sourceMeta,
} = require("../lib/national-outdoor");

const GEOSERVER = "https://geoserver.usanpn.org/geoserver/ows";
const UA = "ChrisIzworskiNationalFallColor/2.0 (+https://chrisizworski.com/national-tools/fall-color/)";

async function json(url) {
  const r = await fetch(url, {
    headers: { accept: "application/geo+json, application/json", "user-agent": UA },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`${new URL(url).hostname} returned ${r.status}`);
  return r.json();
}
async function sample(layer, lat, lon) {
  const d = 0.03;
  const u = new URL(GEOSERVER);
  u.searchParams.set("service", "WMS");
  u.searchParams.set("version", "1.1.1");
  u.searchParams.set("request", "GetFeatureInfo");
  u.searchParams.set("layers", layer);
  u.searchParams.set("query_layers", layer);
  u.searchParams.set("styles", "");
  u.searchParams.set("srs", "EPSG:4326");
  u.searchParams.set("bbox", `${lon - d},${lat - d},${lon + d},${lat + d}`);
  u.searchParams.set("width", "101");
  u.searchParams.set("height", "101");
  u.searchParams.set("x", "50");
  u.searchParams.set("y", "50");
  u.searchParams.set("info_format", "application/json");
  u.searchParams.set("feature_count", "1");
  const data = await json(u);
  const props = data?.features?.[0]?.properties || {};
  const values = Object.values(props).map(Number).filter(Number.isFinite);
  return values.length ? values[0] : null;
}
function doyDate(doy, year = new Date().getFullYear()) {
  const value = finite(doy, 1, 366);
  if (value == null) return null;
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCDate(d.getUTCDate() + Math.round(value) - 1);
  return d.toISOString().slice(0, 10);
}
function doyFromKey(key) {
  const [year, month, day] = String(key || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  const start = Date.UTC(year, 0, 0);
  return Math.floor((Date.UTC(year, month - 1, day) - start) / 86400000);
}
function historicalWindow(median, mad, year) {
  const center = finite(median, 1, 366);
  const spread = finite(mad, 0, 60);
  if (center == null || spread == null) return null;
  const start = Math.max(1, Math.round(center - spread));
  const end = Math.min(366, Math.round(center + spread));
  return {
    start_day_of_year: start,
    end_day_of_year: end,
    start_date: doyDate(start, year),
    end_date: doyDate(end, year),
    basis: "historical median ± median absolute deviation",
  };
}
function timing(nowDoy, median, mad) {
  const center = finite(median, 1, 366);
  const spread = finite(mad, 0, 60);
  if (center == null) {
    return {
      stage: "Historical timing unavailable",
      trip_read: "No timing recommendation",
      confidence: "low",
      days_from_typical: null,
    };
  }
  const diff = Math.round(nowDoy - center);
  const early = spread == null ? center - 14 : center - spread;
  const late = spread == null ? center + 14 : center + spread;
  let stage;
  let tripRead;
  if (nowDoy < early - 14) {
    stage = "Well before the historical autumn transition";
    tripRead = "Too early to use this historical layer as a fall-color trip signal";
  } else if (nowDoy < early) {
    stage = "Approaching the historical transition window";
    tripRead = "Start scouting current local reports before committing to a color trip";
  } else if (nowDoy <= late) {
    stage = "Inside the historical mid-greendown window";
    tripRead = "Historically plausible timing for the main autumn transition";
  } else if (nowDoy <= late + 14) {
    stage = "Just beyond the historical transition window";
    tripRead = "Later color may persist locally, but the historical midpoint has passed";
  } else {
    stage = "Typically past the main historical transition";
    tripRead = "Use current observations rather than historical timing for a trip decision";
  }
  const confidence = spread == null ? "low" : spread <= 7 ? "medium-high" : spread <= 14 ? "medium" : "low";
  return {
    stage,
    trip_read: tripRead,
    confidence,
    days_from_typical: diff,
    median_absolute_deviation_days: spread,
  };
}
async function weatherContext(lat, lon) {
  const points = await json(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const url = points?.properties?.forecastHourly;
  if (!url) throw new Error("NWS point has no hourly forecast");
  const hourly = await json(url);
  const periods = (hourly?.properties?.periods || []).slice(0, 168).map((p) => ({
    time: p.startTime,
    temp_f: (() => { const value = finite(p.temperature); return value == null ? null : p.temperatureUnit === "C" ? value * 9 / 5 + 32 : value; })(),
    short_forecast: p.shortForecast || null,
  })).filter((p) => p.temp_f != null && Date.parse(p.time || ""));
  const low = periods.reduce((best, p) => !best || p.temp_f < best.temp_f ? p : best, null);
  const high = periods.reduce((best, p) => !best || p.temp_f > best.temp_f ? p : best, null);
  return {
    updated_at: hourly?.properties?.updateTime || null,
    timeZone: points?.properties?.timeZone || "UTC",
    min_7d_f: low == null ? null : Math.round(low.temp_f),
    min_7d_at: low?.time || null,
    max_7d_f: high == null ? null : Math.round(high.temp_f),
    freeze_hours: periods.filter((p) => p.temp_f <= 32).length,
    hard_freeze_hours: periods.filter((p) => p.temp_f <= 28).length,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lat = finite(req.query?.lat, 24, 50);
  const lon = finite(req.query?.lon, -125, -66);
  if (lat == null || lon == null) {
    return res.status(400).json({ error: "This beta currently covers the contiguous United States" });
  }

  const [med, mad, weatherResult] = await Promise.allSettled([
    sample("inca:midgdown_median_nad83_02deg", lat, lon),
    sample("inca:midgdown_mad_nad83_02deg", lat, lon),
    weatherContext(lat, lon),
  ]);

  const median = med.status === "fulfilled" ? finite(med.value, 1, 366) : null;
  const spread = mad.status === "fulfilled" ? finite(mad.value, 0, 60) : null;
  if (median == null) return res.status(502).json({ error: "Historical satellite timing is unavailable for this location" });

  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const timeZone = weather?.timeZone || "UTC";
  const localKey = localDateKey(new Date(), timeZone);
  const year = Number(localKey.slice(0, 4));
  const todayDoy = doyFromKey(localKey);
  const timingContext = timing(todayDoy, median, spread);

  return res.status(200).json({
    retrieved_at: new Date().toISOString(),
    mode: "historical-timing-beta",
    degraded: weatherResult.status === "rejected",
    location: { latitude: lat, longitude: lon, timeZone },
    typical_mid_greendown: {
      day_of_year: median,
      date_current_year: doyDate(median, year),
      mad_days: spread,
    },
    typical_window: historicalWindow(median, spread, year),
    timing_context: timingContext,
    current_weather_context: weather,
    method: {
      historical_layer: "USA-NPN MODIS Mid Green-down Median and median absolute deviation, 2001–2017.",
      current_weather: "NWS seven-day temperatures are displayed as separate context and do not mathematically shift the historical satellite date.",
      interpretation: "Mid green-down is a landscape greenness transition metric, not a direct measurement of leaf-color percentage or exact peak color.",
    },
    disclaimer: "This is historical satellite timing plus current weather context, not an observed 2026 leaf-color reading or a precise peak-color forecast. Species, drought, storms, elevation and local conditions can shift actual color.",
    sources: [
      sourceMeta({
        name: "USA National Phenology Network — Mid Green-down Median and MAD",
        url: "https://www.usanpn.org/data/maps/land_surface_phenology",
        available: true,
        status: "historical satellite phenology, MODIS 2001–2017",
      }),
      sourceMeta({
        name: "National Weather Service hourly forecast",
        url: "https://www.weather.gov/documentation/services-web-API",
        updatedAt: weather?.updated_at || null,
        staleAfterMinutes: 360,
        available: Boolean(weather),
        status: "current weather context only",
      }),
      sourceMeta({
        name: "USDA Forest Service — Fall Colors",
        url: "https://www.fs.usda.gov/visit/fall-colors",
        available: true,
        status: "current-observation planning reference where regional reports are available",
      }),
    ],
  });
};

module.exports._test = { doyDate, doyFromKey, historicalWindow, timing };
