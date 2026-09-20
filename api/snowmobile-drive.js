"use strict";

const DESTINATION = { name: "Grayling trail access", lat: 44.6614, lon: -84.7148 };
const UA = "ChrisIzworskiSnowmobile/1.0 (+https://chrisizworski.com/snowmobile/)";
const cache = new Map();

const PRESET_ORIGINS = new Map([
  ["bay city", { displayName:"Bay City, MI", lat:43.5945, lon:-83.8889 }],
  ["saginaw", { displayName:"Saginaw, MI", lat:43.4195, lon:-83.9508 }],
  ["midland", { displayName:"Midland, MI", lat:43.6156, lon:-84.2472 }],
  ["lansing", { displayName:"Lansing, MI", lat:42.7325, lon:-84.5555 }],
  ["detroit", { displayName:"Detroit, MI", lat:42.3314, lon:-83.0458 }],
  ["grand rapids", { displayName:"Grand Rapids, MI", lat:42.9634, lon:-85.6681 }],
  ["traverse city", { displayName:"Traverse City, MI", lat:44.7631, lon:-85.6206 }],
  ["cadillac", { displayName:"Cadillac, MI", lat:44.2519, lon:-85.4012 }]
]);

function cleanQuery(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
}

function normalizedCityKey(value) {
  return cleanQuery(value)
    .toLowerCase()
    .replace(/,?\s*michigan\b/g, "")
    .replace(/,?\s*mi\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function presetOrigin(origin) {
  const row = PRESET_ORIGINS.get(normalizedCityKey(origin));
  return row ? { ...row, source:"preset" } : null;
}

function mapboxMichiganFeature(feature) {
  if (!feature?.center || feature.center.length < 2) return null;
  const [lon,lat] = feature.center.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 41.5 || lat > 49.6 || lon < -90.6 || lon > -82.0) return null;
  const context = [feature, ...(feature.context || [])];
  const region = context.find(x => String(x.id || "").startsWith("region."));
  const regionText = String(region?.short_code || region?.text || "").toLowerCase();
  if (regionText && !/us-mi|michigan/.test(regionText)) return null;
  return {
    displayName: feature.place_name || feature.text || "Michigan origin",
    lat, lon, source:"mapbox"
  };
}

async function geocode(origin) {
  const preset = presetOrigin(origin);
  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    if (preset) return preset;
    throw new Error("Custom geocoding is unavailable because MAPBOX_TOKEN is not configured");
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(origin)}.json?country=US&types=place,postcode,locality&limit=5&proximity=-84.6,44.7&access_token=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    headers: { accept:"application/json", "user-agent":UA },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Mapbox geocoder returned ${response.status}`);
  const payload = await response.json();
  for (const feature of payload.features || []) {
    const row = mapboxMichiganFeature(feature);
    if (row) return row;
  }
  return preset;
}

async function route(origin) {
  const token = process.env.MAPBOX_TOKEN;
  const coordStr = `${Number(origin.lon)},${Number(origin.lat)};${DESTINATION.lon},${DESTINATION.lat}`;
  let url;
  let provider;

  if (token) {
    provider = "mapbox";
    url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?overview=false&access_token=${encodeURIComponent(token)}`;
  } else if (process.env.ALLOW_PUBLIC_OSRM === "1") {
    provider = "osrm";
    url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false`;
  } else {
    throw new Error("Road routing is unavailable because MAPBOX_TOKEN is not configured");
  }

  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/json" },
    signal: AbortSignal.timeout(9000)
  });
  if (!response.ok) throw new Error(`Routing returned ${response.status}`);
  const payload = await response.json();
  const r = payload.routes?.[0];
  if (!r) throw new Error("No route returned");
  return {
    provider,
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
        displayName: row.displayName || origin,
        lat: Number(row.lat),
        lon: Number(row.lon),
        geocodeProvider: row.source
      },
      destination: DESTINATION,
      ...routing,
      geocodingAttribution: row.source === "mapbox" ? "Geocoding via Mapbox" : "Preset Michigan city coordinates",
      routeAttribution: routing.provider === "mapbox" ? "Routing via Mapbox" : "Routing via OSRM / OpenStreetMap"
    };
    cache.set(key, { savedAt: Date.now(), payload });
    return res.status(200).json(payload);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ ok: false, error: "Drive-time lookup unavailable", detail: String(error?.message || error) });
  }
};

module.exports._test = { cleanQuery, normalizedCityKey, presetOrigin, mapboxMichiganFeature, DESTINATION };
