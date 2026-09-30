"use strict";

// Circle Tour adapter for the existing National Smoke & Outdoor Air Window.
// This does not duplicate the smoke model. It forwards one route sample to the
// canonical national engine and returns the planning fields the Circle Tour needs.

const SOURCE = "https://national-outdoor-core.vercel.app/api/national-smoke-window";

function finite(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

module.exports = async function circleTourSmoke(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const lat = finite(req.query?.lat ?? req.query?.latitude, -90, 90);
  const lon = finite(req.query?.lon ?? req.query?.longitude, -180, 180);
  if (lat == null || lon == null) {
    return res.status(400).json({ error: "Valid lat and lon are required" });
  }

  try {
    const url = new URL(SOURCE);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "ChrisIzworskiCircleTour/1.0 (+https://chrisizworski.com/lake-superior-circle-tour/)",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Smoke engine returned ${response.status}`);
    const data = await response.json();

    return res.status(200).json({
      generated_at: data.generated_at || null,
      status: data.status || "unknown",
      current: data.current ? {
        pm25_aqi: data.current.pm25_aqi ?? null,
        aqi_category: data.current.aqi_category || null,
        reporting_area: data.current.reporting_area || null,
        distance_miles: data.current.distance_miles ?? null,
        valid_date: data.current.valid_date || null,
        valid_time: data.current.valid_time || null,
      } : null,
      decision: data.decision ? {
        headline: data.decision.headline || null,
        category: data.decision.category || null,
        confidence: data.decision.confidence || null,
      } : null,
      best_window: data.best_window ? {
        start_time: data.best_window.start_time || null,
        end_time: data.best_window.end_time || null,
        average_pm25_ug_m3: data.best_window.average_pm25_ug_m3 ?? null,
      } : null,
      trend: data.trend || null,
      fire_context: data.fire_context ? {
        available: Boolean(data.fire_context.available),
        detection_count_within_150_miles: data.fire_context.detection_count_within_150_miles ?? null,
      } : null,
      degraded_families: Array.isArray(data.degraded_families) ? data.degraded_families : [],
      source: {
        product: "Wildfire Smoke & Outdoor Air Window",
        url: "https://chrisizworski.com/national-tools/smoke/",
        engine: SOURCE,
      },
      caveat: "PM2.5 is used as route-planning evidence. This adapter does not claim that a nearby fire caused the measured air quality and does not provide individualized health advice.",
    });
  } catch (error) {
    return res.status(200).json({
      status: "unavailable",
      current: null,
      source: {
        product: "Wildfire Smoke & Outdoor Air Window",
        url: "https://chrisizworski.com/national-tools/smoke/",
      },
      error: "Smoke evidence temporarily unavailable",
      detail: String(error?.message || error).slice(0, 160),
    });
  }
};

module.exports.SOURCE = SOURCE;
