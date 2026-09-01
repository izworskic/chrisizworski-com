const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const NWS_POINTS = "https://api.weather.gov/points";
const USER_AGENT = "ChrisIzworskiNationalOutdoorTools/2.1 (+https://chrisizworski.com/national-tools/)";

function cleanQuery(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
}
function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function roundCoord(value) {
  const n = finite(value);
  return n == null ? null : Math.round(n * 1000) / 1000;
}
function validCoordinates(latitude, longitude) {
  const lat = roundCoord(latitude);
  const lon = roundCoord(longitude);
  if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}
function isUsCandidate(row = {}) {
  const address = row.address || {};
  const countryCode = String(address.country_code || "").toLowerCase();
  const iso = String(address["ISO3166-2-lvl4"] || "").toUpperCase();
  return countryCode === "us" || iso.startsWith("US-");
}
function placeName(address = {}) {
  return address.city || address.town || address.village || address.hamlet || address.municipality || address.county || null;
}
function stateCode(address = {}) {
  return String(address["ISO3166-2-lvl4"] || "").replace(/^US-/, "") || null;
}
function queryLabel(address = {}, fallback = "Current location") {
  const place = placeName(address);
  const state = stateCode(address);
  if (place && state) return place + ", " + state;
  if (address.postcode) return String(address.postcode).slice(0, 10);
  if (place) return place;
  if (address.state) return address.state;
  return fallback;
}
function chooseCandidate(rows = []) {
  const valid = rows.filter((row) => isUsCandidate(row) && finite(row.lat) !== null && finite(row.lon) !== null);
  if (!valid.length) return null;
  const preferred = valid.find((row) => {
    const type = String(row.type || "").toLowerCase();
    return ["city", "town", "village", "hamlet", "administrative", "postcode"].some((x) => type.includes(x));
  });
  return preferred || valid[0];
}
async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/geo+json, application/json",
      "accept-language": "en-US,en;q=0.8",
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.json();
}
async function geocode(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "us",
    addressdetails: "1",
  });
  return chooseCandidate(await fetchJson(`${NOMINATIM_SEARCH}?${params}`));
}
async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    lat: latitude.toFixed(3),
    lon: longitude.toFixed(3),
    format: "jsonv2",
    zoom: "10",
    addressdetails: "1",
  });
  const row = await fetchJson(`${NOMINATIM_REVERSE}?${params}`);
  return isUsCandidate(row) ? row : null;
}
async function nwsContext(latitude, longitude) {
  try {
    const data = await fetchJson(`${NWS_POINTS}/${latitude.toFixed(3)},${longitude.toFixed(3)}`);
    return {
      timeZone: data?.properties?.timeZone || null,
      forecastOffice: data?.properties?.cwa || null,
      radarStation: data?.properties?.radarStation || null,
      forecastZone: data?.properties?.forecastZone || null,
      county: data?.properties?.county || null,
    };
  } catch {
    return { timeZone: null, forecastOffice: null, radarStation: null, forecastZone: null, county: null };
  }
}
function locationPayload(row, query, coordinates, context = {}, sourceMode = "manual") {
  const address = row?.address || {};
  const latitude = coordinates?.latitude ?? roundCoord(row?.lat);
  const longitude = coordinates?.longitude ?? roundCoord(row?.lon);
  return {
    query: cleanQuery(query || queryLabel(address)),
    displayName: row?.display_name || queryLabel(address),
    place: placeName(address),
    state: address.state || null,
    stateCode: stateCode(address),
    postcode: address.postcode || null,
    latitude,
    longitude,
    timeZone: context.timeZone || null,
    elevation_m: null,
    forecastOffice: context.forecastOffice || null,
    radarStation: context.radarStation || null,
    type: row?.type || null,
    sourceMode,
    coordinate_precision: sourceMode === "device" ? "rounded to 0.001° before lookup" : null,
    attribution: "Geocoding © OpenStreetMap contributors via Nominatim; timezone context from the National Weather Service.",
    retrieved_at: new Date().toISOString(),
  };
}
function bodyObject(req) {
  if (req?.body && typeof req.body === "object") return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch {}
  }
  return {};
}

module.exports = async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const method = String(req.method || "GET").toUpperCase();
  if (!["GET", "HEAD", "POST"].includes(method)) {
    res.setHeader("Allow", "GET, HEAD, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (method === "POST") {
      res.setHeader("Cache-Control", "no-store");
      const body = bodyObject(req);
      const coordinates = validCoordinates(body.latitude, body.longitude);
      if (!coordinates) return res.status(400).json({ error: "Valid U.S. coordinates are required" });

      const row = await reverseGeocode(coordinates.latitude, coordinates.longitude);
      if (!row) return res.status(404).json({ error: "Current location was not found in the United States" });

      const context = await nwsContext(coordinates.latitude, coordinates.longitude);
      return res.status(200).json(locationPayload(row, queryLabel(row.address), coordinates, context, "device"));
    }

    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    const q = cleanQuery(req.query?.q);
    if (q.length < 2) return res.status(400).json({ error: "Enter a U.S. city or ZIP code" });

    const row = await geocode(q);
    if (!row) return res.status(404).json({ error: "Location not found in the United States" });

    const coordinates = validCoordinates(row.lat, row.lon);
    const context = coordinates ? await nwsContext(coordinates.latitude, coordinates.longitude) : {};
    return res.status(200).json(locationPayload(row, q, coordinates, context, "manual"));
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "Location lookup unavailable",
      detail: String(error?.message || error),
    });
  }
};

module.exports._test = {
  bodyObject,
  chooseCandidate,
  cleanQuery,
  finite,
  isUsCandidate,
  locationPayload,
  placeName,
  queryLabel,
  roundCoord,
  stateCode,
  validCoordinates,
};
