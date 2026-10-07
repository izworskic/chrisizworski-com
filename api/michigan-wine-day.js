"use strict";

const { INTENTS, decideWineRegion } = require("../lib/michigan-wine-day/engine");
const {
  resolveOrigin,
  loadRegionContracts,
  travelMinutes,
  weatherByRegion,
} = require("../lib/michigan-wine-day/providers");
const { southwestPlan } = require("../lib/michigan-wine-day/regions");

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime());
}

function sendError(res, status, code, message) {
  return res.status(status).json({ ok: false, error: code, message });
}

module.exports = async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Use GET.");
  }

  if (req.query?.mode === "southwest-cluster") {
    const cluster = String(req.query.cluster || "");
    const intent = INTENTS[req.query.intent] ? req.query.intent : "first-trip";
    const plan = southwestPlan(cluster, intent);
    if (!plan) return sendError(res, 404, "UNKNOWN_CLUSTER", "That Southwest Michigan cluster is not modeled.");
    return res.status(200).json({ ok: true, plan });
  }

  const originInput = String(req.query?.origin || "");
  const date = String(req.query?.date || "");
  const intent = INTENTS[req.query?.intent] ? req.query.intent : "first-trip";
  const window = String(req.query?.window || "full");
  const start = String(req.query?.start || "");
  const end = String(req.query?.end || "");

  if (!validDate(date)) return sendError(res, 400, "BAD_DATE", "Choose a valid trip date.");
  if (!originInput.trim()) return sendError(res, 400, "ORIGIN_REQUIRED", "Enter a city or ZIP code.");

  let origin;
  try {
    origin = await resolveOrigin(originInput);
  } catch (error) {
    const code = String(error?.message || "origin_not_found");
    if (code === "city_or_zip_only") {
      return sendError(res, 400, "CITY_OR_ZIP_ONLY", "Use a city or ZIP code, not a street address.");
    }
    return sendError(res, 422, "ORIGIN_NOT_FOUND", "That city or ZIP code could not be resolved. Try a nearby city.");
  }

  const adapters = await loadRegionContracts({ intent, date });
  const contracts = adapters.map((row) => row.contract);
  const adapterStatuses = Object.fromEntries(adapters.map((row) => [row.contract.region.id, row.status]));
  const routing = await travelMinutes(origin, contracts);
  const weather = await weatherByRegion(contracts, date);

  const decision = decideWineRegion({
    contracts,
    adapterStatuses,
    date,
    intent,
    window: { window, start, end },
    travelByTarget: routing.values,
    weatherByRegion: weather,
  });

  const degraded = [];
  if (routing.fallbackUsed) degraded.push("routing");
  for (const row of adapters) {
    if (row.status !== "live" && row.status !== "local") degraded.push("adapter:" + row.contract.region.id);
  }
  if (Object.values(weather).some((row) => row.state === "unavailable")) degraded.push("weather");

  return res.status(200).json({
    ok: true,
    generatedAt: new Date().toISOString(),
    origin: {
      label: origin.label,
      class: origin.class,
      source: origin.source,
      attribution: origin.attribution || null,
    },
    date,
    decision,
    system: {
      routingMode: routing.mode,
      routingProvider: routing.provider,
      adapterStatus: adapterStatuses,
      degraded: [...new Set(degraded)],
    },
    sources: {
      weather: "National Weather Service",
      geocoding: origin.source === "nominatim-user-query" ? "OpenStreetMap Nominatim" : "curated city centroid",
      routing: routing.provider,
      oldMissionLeelanau: "Traverse City Wine Country regional adapter",
      petoskey: "Petoskey Wine Region owner export",
      southwest: "official winery, Lake Michigan Shore trail and winery-source evidence",
    },
    safety: "If the day includes multiple tastings, use a designated driver, shuttle or other sober transportation. The tool does not estimate safe alcohol consumption.",
  });
};
