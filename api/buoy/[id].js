const { parseRealtimeObservations } = require("../../lib/ndbc");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=7200");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawId = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = String(rawId || "").toUpperCase();
  if (!/^[A-Z0-9_-]{3,12}$/.test(id)) return res.status(400).json({ error: "Invalid station ID" });

  try {
    const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${encodeURIComponent(id)}.txt`, {
      headers: { "user-agent": "ChrisIzworskiGreatLakesBuoys/1.0 (+https://chrisizworski.com/great-lakes-buoys/)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) return res.status(404).json({ error: "Station history not found" });
    if (!response.ok) throw new Error(`NDBC returned ${response.status}`);
    const samples = parseRealtimeObservations(await response.text()).slice(-1000);
    return res.status(200).json({ id, samples, count: samples.length, fetched_at: new Date().toISOString() });
  } catch {
    return res.status(502).json({ error: "Station history is temporarily unavailable" });
  }
};
