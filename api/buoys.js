const fallback = require("../data/buoy-fallback.json");
const { mergeLatestWithStationMetadata, parseLatestObservations } = require("../lib/ndbc");

const NDBC_LATEST = "https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(NDBC_LATEST, {
      headers: { "user-agent": "ChrisIzworskiGreatLakesBuoys/1.0 (+https://chrisizworski.com/great-lakes-buoys/)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`NDBC returned ${response.status}`);
    const observations = parseLatestObservations(await response.text());
    const stations = mergeLatestWithStationMetadata(observations, fallback.stations);
    return res.status(200).json({
      source: "NOAA National Data Buoy Center",
      fetched_at: new Date().toISOString(),
      count: stations.length,
      stations,
    });
  } catch {
    res.setHeader("X-Data-Fallback", "snapshot");
    return res.status(200).json({ ...fallback, source: `${fallback.source || "NOAA NDBC"} (cached snapshot)` });
  }
};
