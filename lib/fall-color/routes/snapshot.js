// /api/fall-color?view=snapshot -- normalized model snapshots for reuse by destination tools.
const { getConditions } = require("../data.js");
const { REGIONS } = require("../regions.js");
const { snapshotFor, inSeason } = require("../model.js");

function serializeSnapshot(conditions, options = {}) {
  const safeConditions = conditions && typeof conditions === "object" ? conditions : {};
  const byId = new Map((safeConditions.regions || []).map((region) => [region.id, region]));
  const anchor = safeConditions.anchor || null;
  const regions = REGIONS.map((region) => snapshotFor(region, byId.get(region.id) || null, anchor));
  return {
    schemaVersion: 1,
    updated: safeConditions.updated || new Date().toISOString(),
    inSeason: inSeason(),
    model: "shared-fall-color-regional-snapshot-v1",
    degraded: options.degraded === true,
    sourceHealth: {
      conditions: options.degraded === true ? "degraded" : "ok",
      fallback: options.degraded === true ? "regional-climatology" : null
    },
    anchor: anchor ? {
      shift: Number.isFinite(anchor.shift) ? anchor.shift : 0,
      confidence: anchor.confidence || "none"
    } : { shift: 0, confidence: "none" },
    regions,
    ...(options.error ? { error: options.error } : {})
  };
}

module.exports = async (req, res) => {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  res.setHeader("Content-Type", "application/json");
  try {
    const conditions = await getConditions();
    res.status(200).json(serializeSnapshot(conditions));
  } catch (error) {
    // Weather or another optional live input can fail while the regional seasonal
    // model remains usable. Preserve a truthful climatology-only snapshot rather
    // than erasing every region and making destination tools lose fall context.
    res.status(200).json(serializeSnapshot(null, {
      degraded: true,
      error: String((error && error.message) || error)
    }));
  }
};

module.exports.serializeSnapshot = serializeSnapshot;
