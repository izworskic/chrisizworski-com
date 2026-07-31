const catalog = require("../data/beaches.json");
const fallbackBuoys = require("../data/buoy-fallback.json");
const { mergeLatestWithStationMetadata, parseLatestObservations } = require("../lib/ndbc");
const {
  chooseNearestStation,
  getSeasonStatus,
  matchAlertToBeach,
  matchNwsAlertsToBeach,
  matchNwsSwimRiskToBeach,
  normalizeBeachGuardAlerts,
  normalizeNwsAlerts,
  parseNwsSurfForecast,
  postedFlagStatus,
  scoreBeach,
} = require("../lib/beach-report");

const USER_AGENT =
  "ChrisIzworskiMichiganBeachReport/1.0 (+https://chrisizworski.com/great-lakes-beaches/)";
const BEACHGUARD_PAGE = "https://mienviro.michigan.gov/nsite/beach/map/results";
const BEACHGUARD_SETTINGS = "https://mienviro.michigan.gov/nsite/api/settings/getWslSettings";
const BEACHGUARD_SEARCH = "https://mienviro.michigan.gov/nsite/ss/explorersites";
const NDBC_LATEST = "https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt";
const NWS_ALERT_AREAS = ["MI", "LM", "LH", "LS", "LE", "LC"];
const NWS_SURF_OFFICES = ["APX", "GRR", "DTX", "MQT", "IWX", "DLH"];
const NWS_FORECAST_ZONES = "https://api.weather.gov/zones/forecast?area=MI&limit=500";
const NWS_BEACH_FORECAST = "https://www.weather.gov/greatlakes/beachhazards";
const DNR_BEACH_SAFETY = "https://www.michigan.gov/dnr/education/safety-info/beach-safety";

async function fetchWithTimeout(url, options = {}, timeout = 15_000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeout) });
}

function cookieHeader(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";")[0]).filter(Boolean).join("; ");
}

async function fetchBeachGuardAlerts() {
  const headers = { Referer: BEACHGUARD_PAGE, "User-Agent": USER_AGENT };
  const settingsResponse = await fetchWithTimeout(BEACHGUARD_SETTINGS, { headers });
  if (!settingsResponse.ok) throw new Error("BeachGuard settings returned " + settingsResponse.status);
  const cookie = cookieHeader(settingsResponse);
  await settingsResponse.text();

  const body = {
    insertUpdateList: [
      {
        displayHeight: 900,
        displayWidth: 1440,
        filterValuesJson: [
          { attributeName: "Advisory Type", attributeValue: "Contamination Advisory" },
          { attributeName: "Advisory Type", attributeValue: "Closed" },
          { attributeName: "Accessibility", attributeValue: "Private Owned, Public Access" },
          { attributeName: "Accessibility", attributeValue: "Public Owned, Public Access" },
        ],
        isIncludeUnmappable: "true",
        reportId: null,
        latitudeMax: "48.5",
        latitudeMin: "41.5",
        longitudeMax: "-82.0",
        longitudeMin: "-90.6",
        modeId: "BEACH",
        searchTerm: "",
        responseContentType: "application/json",
        filterString: "",
      },
    ],
  };
  const searchResponse = await fetchWithTimeout(BEACHGUARD_SEARCH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: BEACHGUARD_PAGE,
      "User-Agent": USER_AGENT,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!searchResponse.ok) throw new Error("BeachGuard search returned " + searchResponse.status);
  const payload = await searchResponse.json();
  return normalizeBeachGuardAlerts(payload);
}

async function fetchWeather(beaches) {
  const params = new URLSearchParams({
    latitude: beaches.map((beach) => beach.lat).join(","),
    longitude: beaches.map((beach) => beach.lng).join(","),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
      "precipitation",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "precipitation_probability_max",
      "weather_code",
      "sunshine_duration",
      "wind_gusts_10m_max",
      "sunrise",
      "sunset",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "America/Detroit",
    forecast_days: "3",
  });
  const response = await fetchWithTimeout("https://api.open-meteo.com/v1/forecast?" + params.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error("Open-Meteo returned " + response.status);
  const payload = await response.json();
  const locations = Array.isArray(payload) ? payload : [payload];

  return beaches.map((beach, index) => {
    const location = locations[index];
    if (!location?.daily) return null;
    const daily = location.daily;
    const forecast = (daily.time || []).map((date, dayIndex) => ({
      date,
      temperature_max_f: daily.temperature_2m_max?.[dayIndex] ?? null,
      temperature_min_f: daily.temperature_2m_min?.[dayIndex] ?? null,
      apparent_temperature_max_f: daily.apparent_temperature_max?.[dayIndex] ?? null,
      precipitation_probability_max: daily.precipitation_probability_max?.[dayIndex] ?? null,
      weather_code: daily.weather_code?.[dayIndex] ?? null,
      sunshine_hours:
        daily.sunshine_duration?.[dayIndex] == null
          ? null
          : Math.round((daily.sunshine_duration[dayIndex] / 3600) * 10) / 10,
      wind_gusts_max_mph: daily.wind_gusts_10m_max?.[dayIndex] ?? null,
      sunrise: daily.sunrise?.[dayIndex] ?? null,
      sunset: daily.sunset?.[dayIndex] ?? null,
    }));
    return {
      current: {
        observed_at: location.current?.time || null,
        temperature_f: location.current?.temperature_2m ?? null,
        apparent_temperature_f: location.current?.apparent_temperature ?? null,
        weather_code: location.current?.weather_code ?? null,
        wind_mph: location.current?.wind_speed_10m ?? null,
        wind_gust_mph: location.current?.wind_gusts_10m ?? null,
        precipitation_in: location.current?.precipitation ?? null,
      },
      today: forecast[0] || null,
      forecast,
    };
  });
}

async function fetchBuoys() {
  const response = await fetchWithTimeout(NDBC_LATEST, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error("NDBC returned " + response.status);
  const observations = parseLatestObservations(await response.text());
  return {
    status: "live",
    stations: mergeLatestWithStationMetadata(observations, fallbackBuoys.stations),
  };
}

async function fetchNwsAlerts() {
  const payloads = await Promise.all(
    NWS_ALERT_AREAS.map(async (area) => {
      const response = await fetchWithTimeout(
        "https://api.weather.gov/alerts/active?area=" + encodeURIComponent(area),
        { headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" } },
      );
      if (!response.ok) throw new Error("NWS alerts for " + area + " returned " + response.status);
      return response.json();
    }),
  );
  const features = [];
  const seen = new Set();
  for (const payload of payloads) {
    for (const feature of payload?.features || []) {
      const id = feature?.id || feature?.properties?.id || JSON.stringify(feature);
      if (seen.has(id)) continue;
      seen.add(id);
      features.push(feature);
    }
  }
  return normalizeNwsAlerts({ features });
}

async function fetchNwsSwimRisks(now = new Date()) {
  const headers = { "User-Agent": USER_AGENT, Accept: "application/geo+json" };
  const [zoneResponse, officeResults] = await Promise.all([
    fetchWithTimeout(NWS_FORECAST_ZONES, { headers }),
    Promise.allSettled(
      NWS_SURF_OFFICES.map(async (office) => {
        const response = await fetchWithTimeout(
          "https://api.weather.gov/products/types/SRF/locations/" + office + "/latest",
          { headers },
        );
        if (!response.ok) throw new Error("NWS surf forecast for " + office + " returned " + response.status);
        return response.json();
      }),
    ),
  ]);
  if (!zoneResponse.ok) throw new Error("NWS forecast zones returned " + zoneResponse.status);

  const zonePayload = await zoneResponse.json();
  const zoneMetadata = new Map(
    (zonePayload?.features || [])
      .map((feature) => [
        feature?.properties?.id,
        { name: feature?.properties?.name, geometry: feature?.geometry || null },
      ])
      .filter(([id, metadata]) => id && metadata.name),
  );
  const forecasts = officeResults.flatMap((result) =>
    result.status === "fulfilled" ? parseNwsSurfForecast(result.value, zoneMetadata, now) : [],
  );
  const fulfilledCount = officeResults.filter((result) => result.status === "fulfilled").length;
  const issuedTimes = forecasts
    .map((forecast) => forecast.issued_at)
    .filter(Boolean)
    .sort();
  return {
    status: !forecasts.length
      ? "unavailable"
      : fulfilledCount === NWS_SURF_OFFICES.length
        ? "live"
        : "partial",
    forecasts,
    latest_issued_at: issuedTimes.at(-1) || null,
    office_status: NWS_SURF_OFFICES.map((office, index) => ({
      office,
      status: officeResults[index].status === "fulfilled" ? "live" : "unavailable",
    })),
  };
}

function sourceState(result, liveLabel) {
  if (result.status === "fulfilled") return { status: "live", label: liveLabel };
  return { status: "unavailable", label: liveLabel + " is temporarily unavailable" };
}

function buildWaterQuality(beach, beachGuardResult) {
  if (beachGuardResult.status !== "fulfilled") {
    return {
      state: "unavailable",
      label: "Official water-quality status unavailable",
      interpretation: "Do not interpret unavailable data as an all-clear.",
      official_url: BEACHGUARD_PAGE,
    };
  }
  const alert = matchAlertToBeach(beach, beachGuardResult.value);
  if (alert) return alert;
  return {
    state: "no-active-alert",
    label: "No active EGLE alert found",
    interpretation: "This is not a guarantee of safe water and does not mean a recent sample exists.",
    official_url: BEACHGUARD_PAGE,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawSlug = Array.isArray(req.query?.slug) ? req.query.slug[0] : req.query?.slug;
  const slug = rawSlug == null ? null : String(rawSlug).toLowerCase();
  if (slug && !/^[a-z0-9-]{2,80}$/.test(slug)) return res.status(400).json({ error: "Invalid beach slug" });

  const beaches = slug ? catalog.beaches.filter((beach) => beach.slug === slug) : catalog.beaches;
  if (!beaches.length) return res.status(404).json({ error: "Beach not found" });

  const now = new Date();
  const [beachGuardResult, weatherResult, buoyResult, nwsResult, swimRiskResult] = await Promise.allSettled([
    fetchBeachGuardAlerts(),
    fetchWeather(beaches),
    fetchBuoys(),
    fetchNwsAlerts(),
    fetchNwsSwimRisks(now),
  ]);

  const stations =
    buoyResult.status === "fulfilled" ? buoyResult.value.stations : fallbackBuoys.stations || [];
  const normalizedNwsAlerts = nwsResult.status === "fulfilled" ? nwsResult.value : [];
  const nwsSwimForecasts = swimRiskResult.status === "fulfilled" ? swimRiskResult.value.forecasts : [];
  const weatherRows = weatherResult.status === "fulfilled" ? weatherResult.value : beaches.map(() => null);
  const season = getSeasonStatus(now);

  const hydrated = beaches.map((beach, index) => {
    const weather = weatherRows[index];
    const lakeConditions = chooseNearestStation(beach, stations, now);
    const waterQuality = buildWaterQuality(beach, beachGuardResult);
    const hazards = matchNwsAlertsToBeach(beach, normalizedNwsAlerts);
    const matchedSwimRisk = matchNwsSwimRiskToBeach(beach, nwsSwimForecasts);
    const { geometry: _swimRiskGeometry, ...matchedSwimRiskFields } = matchedSwimRisk || {};
    const swimRisk = matchedSwimRisk
      ? matchedSwimRiskFields
      : {
          status: "unavailable",
          label: "NWS swim risk not available for this beach",
          interpretation:
            "No current NWS Surf Zone Forecast matched this beach. Do not treat missing swim-risk data as low risk.",
          official_url: NWS_BEACH_FORECAST,
        };
    const postedFlag = postedFlagStatus(beach);
    const rating = scoreBeach({
      beach,
      weather: weather?.today || null,
      lakeConditions,
      waterQuality,
      hazards,
      swimRisk,
    });
    return {
      ...beach,
      swimming: beach.swimming !== false,
      url: "/great-lakes-beaches/" + beach.slug + "/",
      weather,
      lake_conditions: lakeConditions,
      water_quality: waterQuality,
      hazards,
      swim_risk: swimRisk,
      posted_flag: postedFlag,
      rating,
    };
  });

  const rankingInputsLive =
    beachGuardResult.status === "fulfilled" &&
    weatherResult.status === "fulfilled" &&
    buoyResult.status === "fulfilled" &&
    nwsResult.status === "fulfilled" &&
    swimRiskResult.status === "fulfilled" &&
    swimRiskResult.value.forecasts.length > 0;
  const eligible = rankingInputsLive
    ? hydrated
        .filter((beach) => beach.swimming)
        .filter((beach) => beach.rating.eligible === true)
        .filter((beach) => beach.water_quality.state === "no-active-alert")
        .filter((beach) => !beach.hazards.length)
        .filter((beach) => beach.swim_risk.status === "low")
        .sort((first, second) => second.rating.score - first.rating.score || first.name.localeCompare(second.name))
    : [];

  const response = {
    version: catalog.version,
    generated_at: now.toISOString(),
    season,
    methodology_url: "/great-lakes-beaches/#methodology",
    sources: {
      beachguard: {
        ...sourceState(beachGuardResult, "Michigan EGLE BeachGuard"),
        official_url: BEACHGUARD_PAGE,
        active_alert_count: beachGuardResult.status === "fulfilled" ? beachGuardResult.value.length : null,
        truth_rule: "No active alert is not the same as a recent test or a guarantee of safe water.",
      },
      weather: {
        ...sourceState(weatherResult, "Open-Meteo forecast"),
        official_url: "https://open-meteo.com/en/docs",
      },
      buoys: {
        ...sourceState(buoyResult, "NOAA National Data Buoy Center observations"),
        official_url: "https://www.ndbc.noaa.gov/",
      },
      hazards: {
        ...sourceState(nwsResult, "National Weather Service land and Great Lakes alerts"),
        official_url: NWS_BEACH_FORECAST,
        active_alert_count: nwsResult.status === "fulfilled" ? nwsResult.value.length : null,
        truth_rule:
          "Relevant beach, severe-weather, marine, and lakeshore alerts are matched; unrelated advisories are excluded.",
      },
      swim_risk: {
        status: swimRiskResult.status === "fulfilled" ? swimRiskResult.value.status : "unavailable",
        label:
          swimRiskResult.status === "fulfilled" && swimRiskResult.value.status === "partial"
            ? "Some National Weather Service Surf Zone Forecast offices are unavailable"
            : swimRiskResult.status === "fulfilled" && swimRiskResult.value.status === "live"
              ? "National Weather Service Surf Zone Forecasts"
              : "National Weather Service swim-risk forecasts are unavailable",
        official_url: NWS_BEACH_FORECAST,
        latest_issued_at:
          swimRiskResult.status === "fulfilled" ? swimRiskResult.value.latest_issued_at : null,
        forecast_zone_count:
          swimRiskResult.status === "fulfilled" ? swimRiskResult.value.forecasts.length : null,
        office_status:
          swimRiskResult.status === "fulfilled" ? swimRiskResult.value.office_status : [],
        truth_rule:
          "Low, moderate, or high NWS swim risk is a forecast; it is not the posted flag at the beach.",
      },
      posted_flags: {
        status: "check-on-arrival",
        label: "Posted beach flags must be checked on arrival",
        official_url: DNR_BEACH_SAFETY,
        truth_rule:
          "Michigan park staff can change posted flags during the day, and this report does not claim a live statewide flag status.",
      },
    },
    active_alerts: beachGuardResult.status === "fulfilled" ? beachGuardResult.value : [],
    active_nws_alerts: nwsResult.status === "fulfilled" ? nwsResult.value : [],
    daily_ranking: {
      available: season.active && rankingInputsLive,
      state: !season.active ? "off-season" : rankingInputsLive ? "live" : "source-unavailable",
      explanation: !season.active
        ? "The daily ranking runs May 15 through September 15."
        : rankingInputsLive
          ? "Only beaches with complete score inputs, no matched official notice or alert, and an explicit low NWS swim risk are ranked."
          : "The daily ranking is withheld because an official notice, alert, weather, or swim-risk source did not return usable data.",
    },
    daily_top_slugs: season.active ? eligible.slice(0, 10).map((beach) => beach.slug) : [],
    count: hydrated.length,
    beaches: hydrated,
  };

  return res.status(200).json(response);
};

module.exports.fetchBeachGuardAlerts = fetchBeachGuardAlerts;
module.exports.fetchNwsAlerts = fetchNwsAlerts;
module.exports.fetchNwsSwimRisks = fetchNwsSwimRisks;
module.exports.fetchWeather = fetchWeather;
