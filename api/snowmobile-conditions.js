"use strict";

const { fetchBundle } = require("../lib/snowmobile-sources.js");
const { buildDecision } = require("../lib/snowmobile-engine.js");
const { interpretReports } = require("../lib/snowmobile-harness.js");

let cache = null;
const CACHE_MS = 5 * 60 * 1000;
const STALE_MS = 6 * 60 * 60 * 1000;

function send(res, status, payload) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.json(payload);
}

function compactWeatherLocations(points = []) {
  return points.map(point => ({
    id: point.id,
    name: point.name,
    lat: point.lat,
    lon: point.lon,
    source: point.source,
    office: point.office || null,
    retrievedAt: point.retrievedAt,
    error: point.error || null,
    hourly: Array.isArray(point.hourly)
      ? point.hourly.slice(0, 36).map(period => ({
          startTime: period.startTime,
          temperature: period.temperature,
          temperatureUnit: period.temperatureUnit,
          probabilityOfPrecipitation: period.probabilityOfPrecipitation?.value ?? null,
          shortForecast: period.shortForecast
        }))
      : []
  }));
}

async function fresh(now) {
  const bundle = await fetchBundle();
  const reports = await interpretReports(bundle.reports);
  const product = buildDecision({ ...bundle, reports }, now);
  const harnessModes = reports.map(r => r.jev?.mode).filter(Boolean);
  return {
    ...product,
    weatherLocations: compactWeatherLocations(bundle.weather),
    operational: {
      dataState: "fresh",
      dnrSource: "Michigan DNR DNRTrailsOPENDATA FeatureServer",
      weatherSource: "National Weather Service",
      reportSources: reports.map(r => ({ name: r.name, url: r.url, available: r.available })),
      jevMode: harnessModes.includes("shared-harness-jev") ? "shared-harness-jev" : "deterministic-fallback",
      modelBoundary: "JEV may classify explicit local report language only. Legal status, geometry, timestamps, closures, weather and scores remain deterministic.",
      sourceSemantics: "Natural snow depth is never labeled trail base. Forecast snow is not observed snow. Missing closure data is not confirmed openness."
    }
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
  const now = new Date();

  if (cache && now.getTime() - cache.savedAt < CACHE_MS) {
    return send(res, 200, {
      ...cache.payload,
      operational: {
        ...cache.payload.operational,
        dataState: "cached-fresh",
        cacheAgeMinutes: Math.round((now.getTime() - cache.savedAt) / 60000)
      }
    });
  }

  try {
    const payload = await fresh(now);
    cache = { savedAt: now.getTime(), payload };
    return send(res, 200, payload);
  } catch (error) {
    if (cache && now.getTime() - cache.savedAt < STALE_MS) {
      return send(res, 200, {
        ...cache.payload,
        operational: {
          ...cache.payload.operational,
          dataState: "stale-last-known",
          cacheAgeMinutes: Math.round((now.getTime() - cache.savedAt) / 60000),
          staleReason: String(error?.message || error)
        }
      });
    }
    return send(res, 503, {
      error: "Live snowmobile condition bundle unavailable",
      generatedAt: now.toISOString(),
      live: false,
      detail: String(error?.message || error),
      truthBoundary: "No trail condition, grooming or legal openness is inferred when source retrieval fails."
    });
  }
};
