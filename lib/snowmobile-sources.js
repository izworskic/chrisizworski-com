"use strict";

const DNR_BASE = "https://gisagoegle.state.mi.us/arcgis/rest/services/DNR/DNRTrailsOPENDATA/FeatureServer";
const UA = "MichiganSnowmobileConditions/1.0 (+https://chrisizworski.com/snowmobile/)";
const BBOX = "-84.82,44.55,-84.47,45.10";
const WEATHER_POINTS = [
  { id: "grayling", name: "Grayling", lat: 44.6614, lon: -84.7148 },
  { id: "frederic", name: "Frederic", lat: 44.7789, lon: -84.7545 },
  { id: "gaylord", name: "Gaylord", lat: 45.0275, lon: -84.6748 }
];

function timeoutSignal(ms = 6500) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, clear: () => clearTimeout(t) };
}

async function fetchText(url, ms = 6500) {
  const timer = timeoutSignal(ms);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/json;q=0.9,*/*;q=0.8" }, signal: timer.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
    return await r.text();
  } finally { timer.clear(); }
}

async function fetchJson(url, ms = 6500) {
  const text = await fetchText(url, ms);
  try { return JSON.parse(text); }
  catch { throw new Error(`Non-JSON response from ${url}`); }
}

function arcgisUrl(layer, outFields) {
  const p = new URLSearchParams({
    f: "geojson",
    where: "1=1",
    geometry: BBOX,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    outFields
  });
  return `${DNR_BASE}/${layer}/query?${p.toString()}`;
}

async function fetchDnr() {
  const retrievedAt = new Date().toISOString();
  const trailFields = [
    "OBJECTID","GlobalID","TrailNamePrimary","SnowmobileName","OpenClosedStatusSnowmobile",
    "TrailGroomType","TrailGrooming","SurfaceType","TrailOnRoad","SegmentLengthMiles",
    "PublicComments","County","last_edited_date"
  ].join(",");
  const [trails, closures, reroutes] = await Promise.all([
    fetchJson(arcgisUrl(15, trailFields)),
    fetchJson(arcgisUrl(0, "*")),
    fetchJson(arcgisUrl(1, "*"))
  ]);
  return { retrievedAt, trails, closures, reroutes, source: "Michigan DNR DNRTrailsOPENDATA" };
}

async function fetchNwsPoint(point) {
  const retrievedAt = new Date().toISOString();
  const meta = await fetchJson(`https://api.weather.gov/points/${point.lat},${point.lon}`);
  const hourlyUrl = meta?.properties?.forecastHourly;
  if (!hourlyUrl) throw new Error(`NWS hourly forecast unavailable for ${point.name}`);
  const hourly = await fetchJson(hourlyUrl);
  return {
    ...point,
    retrievedAt,
    source: "National Weather Service",
    office: meta?.properties?.cwa || null,
    hourly: (hourly?.properties?.periods || []).slice(0, 72)
  };
}

async function fetchWeather() {
  const results = await Promise.allSettled(WEATHER_POINTS.map(fetchNwsPoint));
  return results.map((r, i) => r.status === "fulfilled"
    ? r.value
    : { ...WEATHER_POINTS[i], retrievedAt: new Date().toISOString(), source: "National Weather Service", hourly: [], error: String(r.reason?.message || r.reason) });
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractDate(text) {
  const m = String(text).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+20\d{2}/i);
  if (!m) return null;
  const cleaned = m[0].replace(/(\d)(st|nd|rd|th)/i, "$1");
  const t = Date.parse(cleaned);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function conditionFromText(text) {
  const t = String(text).toLowerCase();
  if (/\bexcellent\b|\bawesome\b|\bgreat conditions\b|\btrails? (?:are|is) great\b/.test(t)) return "EXCELLENT";
  if (/\bgood\b|\bpretty darn good\b|\blooking great\b/.test(t)) return "GOOD";
  if (/\bfair\b|\bmarginal\b|\bthin\b/.test(t)) return "FAIR";
  if (/\bpoor\b|\bbare\b|\bmud\b|\bwater\b/.test(t)) return "POOR";
  return "UNKNOWN";
}

function groomingFromText(text) {
  const t = String(text).toLowerCase();
  if (/groomed overnight|fresh grooming|groomed last night/.test(t)) return "RECENT";
  if (/groomers? (?:are|were|out)|groomed/.test(t)) return "MENTIONED";
  return "UNKNOWN";
}

function makeReport({id,name,url,text,authorityWeight=1}) {
  const body = stripHtml(text).slice(0, 7000);
  return {
    id, name, url, sourceType: "local-trail-report", authorityWeight,
    available: true,
    retrievedAt: new Date().toISOString(),
    reportedAt: extractDate(body),
    condition: conditionFromText(body),
    grooming: groomingFromText(body),
    excerpt: body.slice(0, 2200)
  };
}

async function safeReport(spec) {
  try {
    const text = await fetchText(spec.url);
    return makeReport({ ...spec, text });
  } catch (error) {
    return {
      id: spec.id, name: spec.name, url: spec.url, sourceType: "local-trail-report",
      authorityWeight: spec.authorityWeight || 1, available: false,
      retrievedAt: new Date().toISOString(), reportedAt: null, condition: "UNKNOWN",
      grooming: "UNKNOWN", excerpt: "", error: String(error?.message || error)
    };
  }
}

async function fetchReports() {
  const specs = [
    {
      id: "gaylord-tourism",
      name: "Gaylord Area Snowmobile Trail Report",
      url: "https://www.gaylordmichigan.net/pick-your-season/winter/snowmobile/",
      authorityWeight: 1.15
    },
    {
      id: "sledheads-frederic",
      name: "Sledheads of Frederic",
      url: "https://frederic-mi.com/",
      authorityWeight: 0.9
    },
    {
      id: "misorva-gaylord",
      name: "MISORVA — Gaylord Area Snowmobile Trails Council",
      url: "https://misorva.org/trail-reports/gaylord-area-snowmobile-trials-council/",
      authorityWeight: 1.0
    }
  ];
  return Promise.all(specs.map(safeReport));
}

async function fetchBundle() {
  const [dnr, weather, reports] = await Promise.all([
    fetchDnr(),
    fetchWeather(),
    fetchReports()
  ]);
  return { dnr, weather, reports };
}

module.exports = {
  DNR_BASE, WEATHER_POINTS, BBOX,
  fetchDnr, fetchWeather, fetchReports, fetchBundle,
  stripHtml, extractDate, conditionFromText, groomingFromText
};
