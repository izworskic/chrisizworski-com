const {
  WIND_THRESHOLDS,
  mergeNwsForecast,
  normalizeMdotApproachEvents,
  parseOfficialConditions,
  selectWindObservation,
} = require("../lib/mackinac");

const URLS = Object.freeze({
  official: "https://www.mackinacbridge.org/wp-json/wp/v2/pages/1439",
  officialPage: "https://www.mackinacbridge.org/fares-traffic/conditions/",
  mackinawCityWind: "https://www.ndbc.noaa.gov/data/realtime2/MACM4.txt",
  straitsWind: "https://www.ndbc.noaa.gov/data/realtime2/45175.txt",
  nwsHourly: "https://api.weather.gov/gridpoints/APX/55,96/forecast/hourly",
  nwsGrid: "https://api.weather.gov/gridpoints/APX/55,96",
  mdotIncidents: "https://mdotjboss.state.mi.us/MiDrive/incidents/AllForMap/",
  mdotConstruction: "https://mdotjboss.state.mi.us/MiDrive/construction/AllForMap/",
});

const USER_AGENT =
  "MackinacBridgeLive/1.0 (+https://chrisizworski.com/mackinac-bridge-live/; contact: izworski@gmail.com)";

async function fetchSource(url, type) {
  const response = await fetch(url, {
    headers: {
      accept: type === "json" ? "application/geo+json, application/json" : type === "html" ? "text/html" : "text/plain",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return type === "json" ? response.json() : response.text();
}

// Both representations are maintained by the Bridge Authority. A second
// request is made only when the primary report is missing or unrecognized.
async function fetchOfficialStatus() {
  let primary;
  try {
    primary = parseOfficialConditions(await fetchSource(URLS.official, "json"));
    if (primary.available) return { ...primary, retrieval_source: "authority-json" };
  } catch {}
  try {
    const page = await fetchSource(URLS.officialPage, "html");
    // Scope extraction to the full report, not a sidebar status or historic copy.
    const heading = /<h1\b[^>]*>\s*Current Bridge Conditions\s*<\/h1>/i.exec(page);
    if (heading) {
      const section = page.slice(heading.index + heading[0].length);
      const status = parseOfficialConditions(section);
      if (status.available) return { ...status, retrieval_source: "authority-page" };
    }
  } catch {}
  return { ...parseOfficialConditions(""), retrieval_source: "unavailable" };
}

function sourceState(result, name, url) {
  return {
    name,
    url,
    available: result.status === "fulfilled",
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=240");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const [
    officialResult,
    mackinawResult,
    straitsResult,
    hourlyResult,
    gridResult,
    incidentsResult,
    constructionResult,
  ] =
    await Promise.allSettled([
      fetchOfficialStatus(),
      fetchSource(URLS.mackinawCityWind, "text"),
      fetchSource(URLS.straitsWind, "text"),
      fetchSource(URLS.nwsHourly, "json"),
      fetchSource(URLS.nwsGrid, "json"),
      fetchSource(URLS.mdotIncidents, "json"),
      fetchSource(URLS.mdotConstruction, "json"),
    ]);

  const official =
    officialResult.status === "fulfilled"
      ? officialResult.value
      : parseOfficialConditions("");

  const stations = [
    {
      id: "MACM4",
      name: "Mackinaw City",
      latitude: 45.777,
      longitude: -84.721,
      text: mackinawResult.status === "fulfilled" ? mackinawResult.value : null,
    },
    {
      id: "45175",
      name: "Mackinac Straits West",
      latitude: 45.825,
      longitude: -84.772,
      text: straitsResult.status === "fulfilled" ? straitsResult.value : null,
    },
  ];
  const currentWind = selectWindObservation(stations);
  const forecast =
    hourlyResult.status === "fulfilled"
      ? mergeNwsForecast(
          hourlyResult.value,
          gridResult.status === "fulfilled" ? gridResult.value : {},
          36,
        )
      : [];
  const approachEvents = normalizeMdotApproachEvents(
    incidentsResult.status === "fulfilled" ? incidentsResult.value : [],
    constructionResult.status === "fulfilled" ? constructionResult.value : [],
  );

  const sources = {
    official_status: {
      name: "Mackinac Bridge Authority",
      url: URLS.officialPage,
      available: official.available,
      retrieval_source: official.retrieval_source || "unavailable",
    },
    current_wind: {
      name: "NOAA National Data Buoy Center",
      url: "https://www.ndbc.noaa.gov/station_page.php?station=macm4",
      available: Boolean(currentWind),
    },
    hourly_forecast: sourceState(
      hourlyResult,
      "National Weather Service",
      "https://forecast.weather.gov/MapClick.php?lat=45.779&lon=-84.726",
    ),
    approach_traffic: {
      name: "Michigan Department of Transportation Mi Drive",
      url: "https://mdotjboss.state.mi.us/MiDrive/",
      available:
        incidentsResult.status === "fulfilled" ||
        constructionResult.status === "fulfilled",
      complete:
        incidentsResult.status === "fulfilled" &&
        constructionResult.status === "fulfilled",
    },
  };

  return res.status(200).json({
    fetched_at: new Date().toISOString(),
    degraded: !official.available || !currentWind || forecast.length === 0,
    official,
    current_wind: currentWind,
    forecast: {
      location: "Mackinaw City south approach",
      generated_at:
        hourlyResult.status === "fulfilled"
          ? hourlyResult.value?.properties?.generatedAt || null
          : null,
      hours: forecast,
      note: "Forecast winds are for the Mackinaw City approach. The Bridge Authority uses its own bridge-mounted gauges.",
    },
    approach_traffic: {
      available: sources.approach_traffic.available,
      complete: sources.approach_traffic.complete,
      radius_miles: 25,
      events: approachEvents,
      note:
        "Mi Drive incidents and construction within 25 miles of the bridge. This is approach-road information, not a bridge wait-time feed.",
      source_name: sources.approach_traffic.name,
      source_url: sources.approach_traffic.url,
    },
    cameras: [
      {
        id: "north",
        label: "Mackinaw City looking north",
        image_url: "/api/mackinac-media?asset=camera&direction=north",
      },
      {
        id: "south",
        label: "St. Ignace looking south",
        image_url: "/api/mackinac-media?asset=camera&direction=south",
      },
    ],
    thresholds: WIND_THRESHOLDS,
    sources,
  });
};
