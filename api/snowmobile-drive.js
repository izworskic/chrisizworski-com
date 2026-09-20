"use strict";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const MICHIGAN_VIEWBOX = "-90.6,49.6,-82.0,41.5";
const DESTINATION = { name: "Grayling trail access", lat: 44.6614, lon: -84.7148 };
const UA = "ChrisIzworskiSnowmobile/1.0 (+https://chrisizworski.com/snowmobile/)";
const cache = new Map();

function cleanQuery(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
}

function isMichiganCandidate(row = {}) {
  const a = row.address || {};
  const state = String(a.state || "").toLowerCase();
  const stateCode = String(a["ISO3166-2-lvl4"] || a.state_code || "").toUpperCase();
  const display = String(row.display_name || "").toLowerCase();
  return state === "michigan" || stateCode === "US-MI" || stateCode === "MI" || /(?:^|,\s*)michigan(?:,|$)/.test(display);
}

function chooseCandidate(rows = []) {
  const valid = rows.filter(row => {
    const lat = Number(row?.lat);
    const lon = Number(row?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) &&
      lat >= 41.5 && lat <= 49.6 && lon >= -90.6 && lon <= -82.0 &&
      isMichiganCandidate(row);
  });
  if (!valid.length) return null;
  return valid.find(row => /city|town|village|hamlet|administrative|postcode/i.test(`${row.type || ""} ${row.class || row.category || ""}`)) || valid[0];
}

async function geocode(origin) {
  const params = new URLSearchParams({
    q: origin,
    format: "jsonv2",
    limit: "5",
    countrycodes: "us",
    viewbox: MICHIGAN_VIEWBOX,
    bounded: "1",
    addressdetails: "1"
  });
  const response = await fetch(`${NOMINATIM}?${params}`, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.8",
      "user-agent": UA
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
  return chooseCandidate(await response.json());
}

async function route(origin) {
  const coordStr = `${Number(origin.lon)},${Number(origin.lat)};${DESTINATION.lon},${DESTINATION.lat}`;
  const token = process.env.MAPBOX_TOKEN;
  const url = token
    ? `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?overview=false&access_token=${encodeURIComponent(token)}`
    : `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false`;
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) throw new Error(`Routing returned ${response.status}`);
  const payload = await response.json();
  const r = payload.routes?.[0];
  if (!r) throw new Error("No route returned");
  return {
    provider: token ? "mapbox" : "osrm",
    durationMinutes: Math.round(Number(r.duration || 0) / 60),
    distanceMiles: Math.round(Number(r.distance || 0) / 1609.34)
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const origin = cleanQuery(req.query?.origin);
  if (origin.length < 2) return res.status(400).json({ ok: false, error: "Enter a Michigan city or ZIP code" });

  const key = origin.toLowerCase();
  const existing = cache.get(key);
  if (existing && Date.now() - existing.savedAt < 6 * 3600000) {
    return res.status(200).json({ ...existing.payload, cache: "memory" });
  }

  try {
    const row = await geocode(origin);
    if (!row) return res.status(404).json({ ok: false, error: "Origin not found in Michigan" });
    const routing = await route(row);
    const payload = {
      ok: true,
      origin: {
        query: origin,
        displayName: row.display_name || origin,
        lat: Number(row.lat),
        lon: Number(row.lon)
      },
      destination: DESTINATION,
      ...routing,
      geocodingAttribution: "© OpenStreetMap contributors via Nominatim",
      routeAttribution: routing.provider === "osrm" ? "Routing via OSRM / OpenStreetMap" : "Routing via Mapbox"
    };
    cache.set(key, { savedAt: Date.now(), payload });
    return res.status(200).json(payload);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ ok: false, error: "Drive-time lookup unavailable", detail: String(error?.message || error) });
  }
};

module.exports._test = { cleanQuery, chooseCandidate, isMichiganCandidate, DESTINATION };
