// /api/conditions -- live measured data per region (keyless, no Claude tokens)
const { getConditions } = require("../data.js");

module.exports = async (req, res) => {
  // Hub convention: API routes are never indexed.
  res.setHeader("X-Robots-Tag", "noindex");
  try {
    const data = await getConditions();
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(data);
  } catch (e) {
    res.status(200).json({ updated: new Date().toISOString(), regions: [], error: String((e && e.message) || e) });
  }
};
