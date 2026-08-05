// /api/report -- serves the latest stored daily report. No Claude call, CDN cached.
async function redisGet(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "https://winning-dogfish-39241.upstash.io";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!token) return null;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(["GET", key]),
  });
  const j = await r.json();
  return j && j.result ? j.result : null;
}

module.exports = async (req, res) => {
  // Hub convention: API routes are never indexed.
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Content-Type", "application/json");
  try {
    const raw = await redisGet("fallcolor:report:latest");
    if (!raw) { res.status(200).json({ report: null }); return; }
    res.status(200).json(JSON.parse(raw));
  } catch (e) {
    res.status(200).json({ report: null });
  }
};
