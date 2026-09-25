"use strict";

const v12 = require("./route-v12.js");

const WINDOW_START = "2026-11-01";
const DEFAULT_START = "2026-11-05";
const WINDOW_END = "2027-02-28";

function normalizeWinterQuery(rawQuery = {}) {
  const q = { ...rawQuery };
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(String(q.date || "")) ? String(q.date) : null;
  if (!requested) return { query: q, requestedDate: null, normalizedDate: null };
  if (requested < WINDOW_START) q.date = DEFAULT_START;
  else if (requested > WINDOW_END) q.date = WINDOW_END;
  return { query: q, requestedDate: requested, normalizedDate: q.date !== requested ? q.date : null };
}

function customerContract(data, meta = {}) {
  const diagnostics = data?.diagnostics || {};
  const rawWarnings = [...new Set([
    ...(diagnostics.degradedSources || []),
    ...(diagnostics.backgroundDegradedSources || []),
    ...(diagnostics.sourceWarnings || [])
  ].filter(Boolean))];
  const existing = data?.decisionHealth || {};
  const critical = Array.isArray(existing.criticalSources) ? existing.criticalSources.filter(Boolean) : [];
  const hasPlan = Array.isArray(data?.itinerary) && data.itinerary.length > 0;

  let health;
  if (!hasPlan) {
    health = {
      state: "check",
      label: "NO COMPLETE PLAN YET",
      summary: "The selected window does not produce a complete grounded itinerary. Change the date or available time instead of relying on a partial schedule.",
      criticalSources: []
    };
  } else if (critical.length) {
    health = {
      state: "check",
      label: "CHECK BEFORE COMMITTING",
      summary: existing.summary || `A selected-plan source still needs an official recheck: ${critical.join(", ")}.`,
      criticalSources: critical
    };
  } else if (data?.mode === "preseason") {
    health = {
      state: "ready",
      label: "PRE-SEASON PLAN",
      summary: "Future weather and same-day operating details are commit-time checks, not product failures.",
      criticalSources: []
    };
  } else {
    health = {
      state: "ready",
      label: diagnostics.futureWeatherExpected ? "PLAN READY · FORECAST LATER" : "PLAN READY",
      summary: existing.summary || "No unresolved source problem currently changes the selected itinerary.",
      criticalSources: []
    };
  }

  return {
    ...data,
    decisionHealth: health,
    requestNormalization: {
      requestedDate: meta.requestedDate || null,
      normalizedDate: meta.normalizedDate || null,
      supportedWindow: [WINDOW_START, WINDOW_END]
    },
    diagnostics: {
      ...diagnostics,
      // Legacy clients used this field to paint the entire page red. It is no longer a customer health signal.
      degradedSources: [],
      sourceWarnings: rawWarnings,
      customerHealthContract: "specific-checks-never-global-degraded"
    }
  };
}

async function buildDecision(rawQuery = {}) {
  const normalized = normalizeWinterQuery(rawQuery);
  const data = await v12.buildDecision(normalized.query);
  return customerContract(data, normalized);
}

async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
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
module.exports._test = { normalizeWinterQuery, customerContract };
