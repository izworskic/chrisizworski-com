"use strict";

const v9 = require("./route-v9.js");

const WEATHER_SOURCE = "NWS Gatlinburg forecast";
const NPS_SOURCE = "Great Smoky Mountains closures";
const LIVE_ONLY_STATUS = new Set([
  NPS_SOURCE,
  "Gatlinburg SkyPark status",
  "Anakeesta status",
  "Ober Mountain status",
  "Ripley's Aquarium of the Smokies status"
]);

function todayISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
}

function normalizeFutureLiveHealth(data, today = todayISO()) {
  const selected = data?.input?.date;
  if (!selected) return data;
  const leadDays = daysBetween(today, selected);
  if (leadDays <= 0) return data;

  const currentCritical = [...(data.diagnostics?.degradedSources || [])];
  const moved = [];
  const kept = [];

  for (const name of currentCritical) {
    if (LIVE_ONLY_STATUS.has(name)) moved.push(name);
    else if (name === WEATHER_SOURCE && leadDays > 7) moved.push(name);
    else kept.push(name);
  }

  if (!moved.length) return data;

  const background = [...new Set([...(data.diagnostics?.backgroundDegradedSources || []), ...moved])];
  const scheduledWeather = Boolean(data.diagnostics?.futureWeatherExpected) || leadDays > 7;
  const health = kept.length ? {
    state: "check",
    label: kept.length === 1 ? "1 PLAN CHECK NEEDED" : `${kept.length} PLAN CHECKS NEEDED`,
    summary: `A source that can affect this visit window needs a fresh check: ${kept.join(", ")}.`,
    criticalSources: kept
  } : {
    state: "ready",
    label: scheduledWeather ? "PLAN READY · FORECAST LATER" : "PLAN READY",
    summary: "Current-day attraction and road status do not determine a future visit. Those items stay on the commit checklist and are rechecked closer to departure.",
    criticalSources: []
  };

  return {
    ...data,
    benchmarkVersion: "3.9",
    decisionHealth: health,
    diagnostics: {
      ...(data.diagnostics || {}),
      degradedSources: kept,
      backgroundDegradedSources: background,
      futureLiveStatusDeferred: moved,
      selectedLeadDays: leadDays
    }
  };
}

async function buildDecision(rawQuery = {}) {
  return normalizeFutureLiveHealth(await v9.buildDecision(rawQuery));
}

async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    return res.status(200).json(await buildDecision(req.query || {}));
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Gatlinburg winter planner failed",
      detail: String(error?.message || error).slice(0, 220),
      generatedAt: new Date().toISOString()
    });
  }
}

module.exports = handler;
module.exports.buildDecision = buildDecision;
module.exports._test = { todayISO, daysBetween, normalizeFutureLiveHealth };
