"use strict";

// Spot-level sky cover for two aurora landing pages. Uses NWS /points discovery,
// never guessed NWS grid coordinates. NOAA Kp and OVATION stay on /api/aurora.
const { parseSkyCover } = require("../lib/aurora");

const TOWNS = Object.freeze({
  "paradise-whitefish-point": Object.freeze({ latitude: 46.77, longitude: -84.96, label: "Whitefish Point shoreline" }),
  "sleeping-bear-dunes": Object.freeze({ latitude: 44.88, longitude: -86.06, label: "Sleeping Bear Dunes lakeshore" }),
});
const MAX_NWS_AGE_MS = 12 * 60 * 60 * 1000;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": "ChrisIzworskiAurora/1.0 (+https://chrisizworski.com/northern-lights-michigan/)",
    },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("NWS request failed");
  return response.json();
}
function safeGridUrl(pointsPayload) {
  const raw = pointsPayload?.properties?.forecastGridData;
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "api.weather.gov" ||
        !/^\/gridpoints\/[A-Za-z]{3}\/\d+,\d+$/.test(url.pathname)) return null;
    return url.toString();
  } catch { return null; }
}
function freshNwsSky(sky, now = Date.now()) {
  const updated = Date.parse(sky?.updated_at);
  return Number.isFinite(updated) && updated <= now + 10 * 60 * 1000 &&
    now - updated <= MAX_NWS_AGE_MS && Array.isArray(sky.periods) && sky.periods.length > 0;
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=600");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({error:"Method not allowed"});
  }
  const town = req.query?.town;
  const site = typeof town === "string" ? TOWNS[town] : null;
  if (!site) return res.status(400).json({error:"Unknown town"});
  const source = "National Weather Service";
  try {
    const points = await fetchJson(`https://api.weather.gov/points/${site.latitude},${site.longitude}`);
    const gridUrl = safeGridUrl(points);
    if (!gridUrl) throw new Error("NWS grid URL unavailable");
    const grid = await fetchJson(gridUrl);
    const sky = parseSkyCover(grid);
    if (!freshNwsSky(sky)) throw new Error("NWS data unavailable or stale");
    return res.status(200).json({
      town, label:site.label, source, available:true,
      location:{latitude:site.latitude,longitude:site.longitude},
      sky_cover:sky, fetched_at:new Date().toISOString(),
      note:"NWS forecast sky cover at a nearby grid point, not an observation or aurora sighting probability.",
    });
  } catch {
    return res.status(200).json({
      town, label:site.label, source, available:false,
      location:{latitude:site.latitude,longitude:site.longitude},
      sky_cover:{updated_at:null,periods:[]}, fetched_at:new Date().toISOString(),
      note:"NWS local sky cover is unavailable or stale; do not infer clear skies.",
    });
  }
}
module.exports = handler;
module.exports.TOWNS = TOWNS;
module.exports.safeGridUrl = safeGridUrl;
module.exports.freshNwsSky = freshNwsSky;
