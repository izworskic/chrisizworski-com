const {
  buildRegionalOutlook,
  parseCurrentKp,
  parseKpForecast,
  parseSolarWind,
} = require("../lib/aurora");

const URLS = Object.freeze({
  kpForecast: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json",
  kpCurrent: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  solarWindMag: "https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json",
  solarWindSpeed: "https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json",
  ovation: "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
});

const USER_AGENT =
  "MichiganAuroraForecast/1.0 (+https://chrisizworski.com/northern-lights-michigan/; contact: izworski@gmail.com)";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`NOAA SWPC returned ${response.status}`);
  return response.json();
}

function sourceState(result, name, url) {
  return { name, url, available: result.status === "fulfilled" };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const [forecastResult, currentResult, magneticResult, speedResult, ovationResult] =
    await Promise.allSettled([
      fetchJson(URLS.kpForecast),
      fetchJson(URLS.kpCurrent),
      fetchJson(URLS.solarWindMag),
      fetchJson(URLS.solarWindSpeed),
      fetchJson(URLS.ovation),
    ]);

  const forecast =
    forecastResult.status === "fulfilled"
      ? parseKpForecast(forecastResult.value)
      : { peak_24h: null, peak_24h_at: null, peak_72h: null, peak_72h_at: null, periods: [] };
  const currentKp =
    currentResult.status === "fulfilled" ? parseCurrentKp(currentResult.value) : null;
  const solarWind = parseSolarWind(
    magneticResult.status === "fulfilled" ? magneticResult.value : [],
    speedResult.status === "fulfilled" ? speedResult.value : [],
  );
  const regional = buildRegionalOutlook(
    ovationResult.status === "fulfilled" ? ovationResult.value : {},
    forecast.peak_24h,
  );

  const sources = {
    kp_forecast: sourceState(
      forecastResult,
      "NOAA Space Weather Prediction Center",
      "https://www.spaceweather.gov/products/3-day-forecast",
    ),
    kp_observed: sourceState(
      currentResult,
      "NOAA Space Weather Prediction Center",
      "https://www.spaceweather.gov/products/planetary-k-index",
    ),
    solar_wind: {
      name: "NOAA Space Weather Prediction Center",
      url: "https://www.spaceweather.gov/products/real-time-solar-wind",
      available: magneticResult.status === "fulfilled" || speedResult.status === "fulfilled",
    },
    ovation: sourceState(
      ovationResult,
      "NOAA Space Weather Prediction Center OVATION",
      "https://www.spaceweather.gov/products/aurora-30-minute-forecast",
    ),
  };

  return res.status(200).json({
    fetched_at: new Date().toISOString(),
    degraded: !forecast.periods.length || !regional.forecast_time,
    forecast: { ...forecast, current: currentKp },
    solar_wind: solarWind,
    ovation: regional,
    notes: {
      kp: "Kp is a broad geomagnetic forecast, not a local visibility guarantee.",
      ovation:
        "OVATION is a 30-to-90-minute model. Its grid value is a modeled aurora signal, not a cloud-adjusted viewing probability.",
      visibility:
        "Darkness, cloud cover, moonlight, light pollution, and a clear northern horizon determine what a person can actually see.",
    },
    sources,
  });
};

module.exports.URLS = URLS;
