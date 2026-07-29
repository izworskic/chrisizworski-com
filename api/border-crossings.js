const {
  compareDetroitCrossings,
  mergeWaitSources,
  normalizeNwsAlerts,
  normalizeOntarioAlerts,
  normalizeOntarioEvents,
} = require("../lib/border-crossings");

const URLS = Object.freeze({
  cbp: "https://bwt.cbp.gov/api/bwtnew",
  cbsa: "https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv",
  ontarioEvents: "https://511on.ca/api/v2/get/event",
  ontarioAlerts: "https://511on.ca/api/v2/get/alerts",
  nwsDetroit: "https://api.weather.gov/alerts/active?point=42.3314,-83.0458",
  nwsPortHuron: "https://api.weather.gov/alerts/active?point=42.9709,-82.4249",
  nwsSault: "https://api.weather.gov/alerts/active?point=46.4953,-84.3453",
});

const USER_AGENT =
  "MichiganBorderCrossingLive/1.0 (+https://chrisizworski.com/michigan-border-wait-times/; contact: izworski@gmail.com)";

async function fetchSource(url, type) {
  const response = await fetch(url, {
    headers: {
      accept:
        type === "text"
          ? "text/csv, text/plain"
          : "application/geo+json, application/json",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return type === "text" ? response.text() : response.json();
}

function sourceState(result, name, url) {
  return {
    name,
    url,
    available: result.status === "fulfilled",
  };
}

function buildComparisons(crossings) {
  const selections = [
    ["to_canada", "passenger", "standard"],
    ["to_canada", "commercial", "standard"],
    ["to_us", "passenger", "standard"],
    ["to_us", "passenger", "nexus"],
    ["to_us", "passenger", "ready"],
    ["to_us", "commercial", "standard"],
    ["to_us", "commercial", "fast"],
  ];
  return Object.fromEntries(
    selections.map(([direction, vehicle, lane]) => [
      `${direction}:${vehicle}:${lane}`,
      compareDetroitCrossings(crossings, { direction, vehicle, lane }),
    ]),
  );
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
    cbpResult,
    cbsaResult,
    ontarioEventsResult,
    ontarioAlertsResult,
    nwsDetroitResult,
    nwsPortHuronResult,
    nwsSaultResult,
  ] = await Promise.allSettled([
    fetchSource(URLS.cbp, "json"),
    fetchSource(URLS.cbsa, "text"),
    fetchSource(URLS.ontarioEvents, "json"),
    fetchSource(URLS.ontarioAlerts, "json"),
    fetchSource(URLS.nwsDetroit, "json"),
    fetchSource(URLS.nwsPortHuron, "json"),
    fetchSource(URLS.nwsSault, "json"),
  ]);

  const crossings = mergeWaitSources(
    cbpResult.status === "fulfilled" ? cbpResult.value : [],
    cbsaResult.status === "fulfilled" ? cbsaResult.value : "",
  );
  const approachEvents =
    ontarioEventsResult.status === "fulfilled"
      ? normalizeOntarioEvents(ontarioEventsResult.value)
      : Object.fromEntries(crossings.map((crossing) => [crossing.id, []]));

  const crossingsWithEvents = crossings.map((crossing) => ({
    ...crossing,
    approach_traffic: {
      available: ontarioEventsResult.status === "fulfilled",
      radius_miles: 25,
      events: approachEvents[crossing.id] || [],
      note: "Ontario 511 events within 25 miles of the crossing. These are approach-road conditions, not border-processing wait times.",
      source_name: "Ontario 511",
      source_url: "https://511on.ca/",
    },
  }));

  const weatherAlerts = [
    ...(nwsDetroitResult.status === "fulfilled"
      ? normalizeNwsAlerts(nwsDetroitResult.value, "detroit", "Detroit–Windsor")
      : []),
    ...(nwsPortHuronResult.status === "fulfilled"
      ? normalizeNwsAlerts(nwsPortHuronResult.value, "port-huron", "Port Huron–Sarnia")
      : []),
    ...(nwsSaultResult.status === "fulfilled"
      ? normalizeNwsAlerts(nwsSaultResult.value, "sault-ste-marie", "Sault Ste. Marie")
      : []),
  ];
  const ontarioAlerts =
    ontarioAlertsResult.status === "fulfilled"
      ? normalizeOntarioAlerts(ontarioAlertsResult.value)
      : [];

  const sources = {
    to_us_waits: sourceState(
      cbpResult,
      "U.S. Customs and Border Protection",
      "https://bwt.cbp.gov/",
    ),
    to_canada_waits: sourceState(
      cbsaResult,
      "Canada Border Services Agency",
      "https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html",
    ),
    ontario_approaches: {
      name: "Ontario 511",
      url: "https://511on.ca/",
      available:
        ontarioEventsResult.status === "fulfilled" ||
        ontarioAlertsResult.status === "fulfilled",
      events_available: ontarioEventsResult.status === "fulfilled",
      alerts_available: ontarioAlertsResult.status === "fulfilled",
    },
    weather_alerts: {
      name: "National Weather Service",
      url: "https://www.weather.gov/",
      available:
        nwsDetroitResult.status === "fulfilled" ||
        nwsPortHuronResult.status === "fulfilled" ||
        nwsSaultResult.status === "fulfilled",
      complete:
        nwsDetroitResult.status === "fulfilled" &&
        nwsPortHuronResult.status === "fulfilled" &&
        nwsSaultResult.status === "fulfilled",
    },
  };

  const body = {
    fetched_at: new Date().toISOString(),
    degraded:
      cbpResult.status !== "fulfilled" ||
      cbsaResult.status !== "fulfilled" ||
      ontarioEventsResult.status !== "fulfilled",
    crossings: crossingsWithEvents,
    comparisons: buildComparisons(crossingsWithEvents),
    warnings: {
      weather: weatherAlerts,
      ontario: ontarioAlerts,
      note: "Weather and approach-road warnings are shown separately. They do not change or predict the official border-processing wait.",
    },
    sources,
    definitions: {
      wait_time:
        "The reporting agency's estimated border-processing delay for the selected direction, vehicle and lane program.",
      excluded_delay:
        "Approach-road traffic, toll-plaza queues, parking and travel time between crossings are not included.",
      no_delay:
        "No Delay is an official report, not a guarantee that every vehicle will cross immediately.",
    },
  };

  if (req.method === "HEAD" && typeof res.end === "function") {
    return res.status(200).end();
  }
  return res.status(200).json(body);
};

module.exports.URLS = URLS;
module.exports.buildComparisons = buildComparisons;
