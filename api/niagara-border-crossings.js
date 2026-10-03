const {
  buildDecision,
  mergeNiagaraSources,
} = require("../lib/niagara-border-crossings");
const {
  cleanText,
  haversineMiles,
  normalizeNwsAlerts,
} = require("../lib/border-crossings");

const URLS = Object.freeze({
  cbp: "https://bwt.cbp.gov/api/bwtnew",
  cbsa: "https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv",
  nfbc: "https://www.niagarafallsbridges.com/services/traffic-conditions",
  nwsBuffalo: "https://api.weather.gov/alerts/active?point=42.8864,-78.8784",
  nwsNiagara: "https://api.weather.gov/alerts/active?point=43.0962,-79.0377",
  ny511: "https://511ny.org/api/getevents",
  on511: "https://511on.ca/api/v2/get/event",
});

const USER_AGENT =
  "NiagaraBorderCrossingDecision/1.0 (+https://chrisizworski.com/niagara-border-crossings/; contact: izworski@gmail.com)";

const ALLOWED = Object.freeze({
  direction: new Set(["to_canada", "to_us"]),
  vehicle: new Set(["passenger", "commercial", "pedestrian", "bicycle", "bus", "tow"]),
  program: new Set(["none", "nexus", "global_entry"]),
  approach_id: new Set(["peace", "rainbow", "whirlpool", "lewiston-queenston"]),
});

async function fetchSource(url, type = "json") {
  const response = await fetch(url, {
    headers: {
      accept: type === "text" ? "text/html, text/csv, text/plain" : "application/geo+json, application/json",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return type === "text" ? response.text() : response.json();
}

function sourceState(result, name, url, extra = {}) {
  return {
    name,
    url,
    available: result?.status === "fulfilled",
    ...extra,
  };
}

function parseSelection(query = {}) {
  const selection = {
    direction: ALLOWED.direction.has(query.direction) ? query.direction : "to_canada",
    vehicle: ALLOWED.vehicle.has(query.vehicle) ? query.vehicle : "passenger",
    program: ALLOWED.program.has(query.program) ? query.program : "none",
    approach_id: ALLOWED.approach_id.has(query.approach_id) ? query.approach_id : "peace",
    oversize: query.oversize === "1" || query.oversize === "true",
  };
  return selection;
}

function normalizeRoadEvent(event, sourceName) {
  const latitude = Number(event.Latitude ?? event.latitude);
  const longitude = Number(event.Longitude ?? event.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    id: String(event.ID ?? event.Id ?? event.id ?? ""),
    source: sourceName,
    roadway: cleanText(event.RoadwayName ?? event.Roadway ?? event.roadway) || null,
    direction: cleanText(event.DirectionOfTravel ?? event.Direction ?? event.direction) || null,
    description: cleanText(event.Description ?? event.Message ?? event.description) || null,
    event_type: cleanText(event.EventType ?? event.eventType) || null,
    severity: cleanText(event.Severity ?? event.Impact ?? event.severity) || null,
    full_closure: Boolean(event.IsFullClosure),
    latitude,
    longitude,
    updated_at: Number.isFinite(Number(event.LastUpdated))
      ? new Date(Number(event.LastUpdated) * 1000).toISOString()
      : null,
  };
}

function attachNearbyEvents(crossings, nyEvents, onEvents) {
  const normalized = [
    ...(Array.isArray(nyEvents) ? nyEvents.map((event) => normalizeRoadEvent(event, "511NY")) : []),
    ...(Array.isArray(onEvents) ? onEvents.map((event) => normalizeRoadEvent(event, "Ontario 511")) : []),
  ].filter(Boolean);

  return crossings.map((crossing) => ({
    ...crossing,
    approach_traffic: normalized
      .map((event) => ({
        ...event,
        distance_miles: haversineMiles(crossing.latitude || 43.1, crossing.longitude || -79.05, event.latitude, event.longitude),
      }))
      .filter((event) => event.distance_miles <= 20)
      .sort((a, b) => Number(b.full_closure) - Number(a.full_closure) || a.distance_miles - b.distance_miles)
      .slice(0, 8),
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=240");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = new Date();
  const selection = parseSelection(req.query || {});
  const ny511Key = process.env.NY511_API_KEY || "";
  const on511Key = process.env.ONTARIO511_API_KEY || "";

  const tasks = [
    fetchSource(URLS.cbp),
    fetchSource(URLS.cbsa, "text"),
    fetchSource(URLS.nfbc, "text"),
    fetchSource(URLS.nwsBuffalo),
    fetchSource(URLS.nwsNiagara),
    ny511Key ? fetchSource(`${URLS.ny511}?key=${encodeURIComponent(ny511Key)}&format=json`) : Promise.resolve(null),
    on511Key ? fetchSource(`${URLS.on511}?key=${encodeURIComponent(on511Key)}&format=json&lang=en`) : Promise.resolve(null),
  ];

  const [cbpResult, cbsaResult, nfbcResult, nwsBuffaloResult, nwsNiagaraResult, ny511Result, on511Result] = await Promise.allSettled(tasks);

  const crossings = mergeNiagaraSources(
    cbpResult.status === "fulfilled" ? cbpResult.value : [],
    cbsaResult.status === "fulfilled" ? cbsaResult.value : "",
    nfbcResult.status === "fulfilled" ? nfbcResult.value : "",
    now,
  );
  const crossingsWithEvents = attachNearbyEvents(
    crossings,
    ny511Result.status === "fulfilled" ? ny511Result.value : null,
    on511Result.status === "fulfilled" ? on511Result.value : null,
  );
  const decision = buildDecision(crossingsWithEvents, selection, now);

  const weatherAlerts = [
    ...(nwsBuffaloResult.status === "fulfilled"
      ? normalizeNwsAlerts(nwsBuffaloResult.value, "buffalo", "Buffalo / Peace Bridge approaches")
      : []),
    ...(nwsNiagaraResult.status === "fulfilled"
      ? normalizeNwsAlerts(nwsNiagaraResult.value, "niagara", "Niagara Falls / Lewiston approaches")
      : []),
  ];

  const sources = {
    to_us_waits: sourceState(cbpResult, "U.S. Customs and Border Protection", "https://bwt.cbp.gov/"),
    to_canada_waits: sourceState(cbsaResult, "Canada Border Services Agency", "https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html"),
    bridge_operator_validation: sourceState(nfbcResult, "Niagara Falls Bridge Commission", URLS.nfbc, {
      role: "bridge operator / validation; Whirlpool context only",
    }),
    ny511: {
      name: "511NY",
      url: "https://511ny.org/",
      configured: Boolean(ny511Key),
      available: Boolean(ny511Key) && ny511Result.status === "fulfilled",
      note: ny511Key ? "Official approach events are enabled." : "Developer key not configured; the product does not scrape around the official API requirement.",
    },
    ontario511: {
      name: "Ontario 511",
      url: "https://511on.ca/",
      configured: Boolean(on511Key),
      available: Boolean(on511Key) && on511Result.status === "fulfilled",
      note: on511Key ? "Official approach events are enabled." : "Developer key not configured; the product does not bypass the official API requirement.",
    },
    weather_us: {
      name: "National Weather Service",
      url: "https://www.weather.gov/buf/",
      available: nwsBuffaloResult.status === "fulfilled" || nwsNiagaraResult.status === "fulfilled",
    },
    weather_canada: {
      name: "Environment and Climate Change Canada",
      url: "https://weather.gc.ca/warnings/index_e.html?prov=son",
      available: false,
      note: "Official Canadian warning link is exposed in V1; no undocumented feed is treated as structured decision data.",
    },
  };

  const body = {
    fetched_at: now.toISOString(),
    selection,
    degraded: cbpResult.status !== "fulfilled" || cbsaResult.status !== "fulfilled",
    decision,
    crossings: crossingsWithEvents,
    warnings: {
      weather: weatherAlerts,
      note: "Weather alerts are travel context. Bridge operators and border agencies remain authoritative for crossing status and processing.",
    },
    sources,
    definitions: {
      wait_time: "The responsible border agency's estimated processing delay for the selected direction and vehicle class.",
      diversion_buffer: "A conservative bridge-switch allowance used to avoid recommending a detour for a small posted wait difference. It is not a live navigation ETA.",
      freshness: "Dynamic waits may become stale or expire; static vehicle eligibility and bridge restrictions remain valid independently.",
      source_conflict: "A material disagreement between current authoritative/official observations is exposed rather than silently resolved.",
    },
  };

  if (req.method === "HEAD" && typeof res.end === "function") return res.status(200).end();
  return res.status(200).json(body);
};

module.exports.URLS = URLS;
module.exports.ALLOWED = ALLOWED;
module.exports.attachNearbyEvents = attachNearbyEvents;
module.exports.normalizeRoadEvent = normalizeRoadEvent;
module.exports.parseSelection = parseSelection;
