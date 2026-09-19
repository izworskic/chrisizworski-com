// /api/fall-color?view=snapshot -- normalized model snapshots for reuse by destination tools.
const { getConditions } = require("../data.js");
const { REGIONS } = require("../regions.js");
const { snapshotFor, inSeason } = require("../model.js");

module.exports = async (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  res.setHeader("Content-Type", "application/json");
  try {
    const conditions = await getConditions();
    const byId = new Map((conditions.regions || []).map(region => [region.id, region]));
    const regions = REGIONS.map(region => snapshotFor(region, byId.get(region.id), conditions.anchor));
    res.status(200).json({
      schemaVersion: 1,
      updated: conditions.updated || new Date().toISOString(),
      inSeason: inSeason(),
      model: "shared-fall-color-regional-snapshot-v1",
      anchor: conditions.anchor ? {
        shift: Number.isFinite(conditions.anchor.shift) ? conditions.anchor.shift : 0,
        confidence: conditions.anchor.confidence || "none"
      } : { shift: 0, confidence: "none" },
      regions
    });
  } catch (error) {
    res.status(200).json({
      schemaVersion: 1,
      updated: new Date().toISOString(),
      inSeason: inSeason(),
      model: "shared-fall-color-regional-snapshot-v1",
      regions: [],
      error: String((error && error.message) || error)
    });
  }
};
