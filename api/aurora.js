const {
  buildRegionalOutlook,
  parseCurrentKp,
  parseKpForecast,
  parseMoon,
  parseSkyCover,
  parseSolarWind,
} = require("../lib/aurora");

const URLS = Object.freeze({
  kpForecast: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json",
  kpCurrent: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  solarWindMag: "https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json",
  solarWindSpeed: "https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json",
  ovation: "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
});

const WEATHER_URLS = Object.freeze({
  keweenaw: "https://api.weather.gov/gridpoints/MQT/135,113",
  marquette: "https://api.weather.gov/gridpoints/MQT/153,71",
  munising: "https://api.weather.gov/gridpoints/MQT/178,65",
  "sault-ste-marie": "https://api.weather.gov/gridpoints/APX/64,131",
  "mackinaw-city": "https://api.weather.gov/gridpoints/APX/55,96",
  "traverse-city": "https://api.weather.gov/gridpoints/APX/29,46",
  "bay-city": "https://api.weather.gov/gridpoints/DTX/33,89",
  detroit: "https://api.weather.gov/gridpoints/DTX/66,34",
});

const USER_AGENT =
  "MichiganAuroraForecast/1.0 (+https://chrisizworski.com/northern-lights-michigan/; contact: izworski@gmail.com)";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.json();
}

function sourceState(result, name, url) {
  return { name, url, available: result.status === "fulfilled" };
}

function michiganDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Detroit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function michiganUtcOffsetHours(date) {
  const reference = new Date(`${date}T17:00:00Z`);
  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    timeZoneName: "longOffset",
  })
    .formatToParts(reference)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = String(zone || "").match(/^GMT([+-])(\d{2}):?(\d{2})$/);
  if (!match) return -5;
  const offset = Number(match[2]) + Number(match[3]) / 60;
  return match[1] === "-" ? -offset : offset;
}

function moonUrl(date) {
  const offset = michiganUtcOffsetHours(date);
  return `https://aa.usno.navy.mil/api/rstt/oneday?date=${date}&coords=45.787,-84.76&tz=${offset}&dst=false&id=CIzw`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const date = michiganDateKey();
  const weatherEntries = Object.entries(WEATHER_URLS);
  const results = await Promise.allSettled([
    fetchJson(URLS.kpForecast),
    fetchJson(URLS.kpCurrent),
    fetchJson(URLS.solarWindMag),
    fetchJson(URLS.solarWindSpeed),
    fetchJson(URLS.ovation),
    fetchJson(moonUrl(date)),
    ...weatherEntries.map(([, url]) => fetchJson(url)),
  ]);
  const [forecastResult, currentResult, magneticResult, speedResult, ovationResult, moonResult] =
    results;
  const weatherResults = results.slice(6);

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
  const skyCoverByRegion = Object.fromEntries(
    weatherEntries.map(([id], index) => {
      const result = weatherResults[index];
      return [id, result?.status === "fulfilled" ? parseSkyCover(result.value) : { updated_at: null, periods: [] }];
    }),
  );
  regional.regions = regional.regions.map((region) => ({
    ...region,
    sky_cover: skyCoverByRegion[region.id] || { updated_at: null, periods: [] },
  }));
  const moon = moonResult.status === "fulfilled" ? parseMoon(moonResult.value, date) : null;
  const weatherAvailable = Object.values(skyCoverByRegion).filter(
    (skyCover) => skyCover.periods.length > 0,
  ).length;

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
    sky_cover: {
      name: "National Weather Service National Digital Forecast Database",
      url: "https://www.weather.gov/documentation/services-web-api",
      available: weatherAvailable > 0,
      regions_available: weatherAvailable,
      regions_requested: weatherEntries.length,
    },
    moon: {
      name: "U.S. Naval Observatory Astronomical Applications Department",
      url: "https://aa.usno.navy.mil/data/api",
      available: Boolean(moon),
    },
  };

  return res.status(200).json({
    fetched_at: new Date().toISOString(),
    degraded: !forecast.periods.length || !regional.forecast_time,
    weather_degraded: weatherAvailable < weatherEntries.length,
    forecast: { ...forecast, current: currentKp },
    solar_wind: solarWind,
    ovation: regional,
    moon,
    notes: {
      kp: "Kp is a broad geomagnetic forecast, not a local visibility guarantee.",
      ovation:
        "OVATION is a 30-to-90-minute model. Its grid value is a modeled aurora signal, not a cloud-adjusted viewing probability.",
      visibility:
        "Darkness, cloud cover, moonlight, light pollution, and a clear northern horizon determine what a person can actually see.",
      sky_cover:
        "Sky cover is an NWS digital forecast for the selected regional grid point, not an observation or a visibility probability.",
      moon:
        "The USNO phase and illuminated fraction are calculated for the Straits of Mackinac date and are supporting context, not an aurora forecast.",
    },
    sources,
  });
};

module.exports.URLS = URLS;
module.exports.WEATHER_URLS = WEATHER_URLS;
module.exports.michiganDateKey = michiganDateKey;
module.exports.michiganUtcOffsetHours = michiganUtcOffsetHours;
