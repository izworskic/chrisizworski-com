"use strict";

const v6 = require("./route-v6.js");
const v2 = require("./route-v2.js");

const V = v2._test;

function mins(v) {
  const m = String(v || "").match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function fmt(v) {
  const m = mins(v);
  if (m == null) return v || "—";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h % 12 || 12}:${String(mm).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function categoryLabel(category) {
  return ({
    lights: "Lights",
    mountain: "Mountain",
    snow: "Snow",
    indoor: "Indoor",
    culture: "Arts + culture",
    shopping: "Browse",
    park: "National park",
    scenic: "Scenic drive",
    food: "Food",
    view: "View",
    free: "Free downtown",
    event: "Event"
  })[category] || "Stop";
}

function costLabel(cost) {
  return ({ free: "Free", "$": "Lower-cost", "$$": "Paid attraction" })[cost] || "Cost varies";
}

function walkLabel(value) {
  if (!Number.isFinite(value)) return "Walking varies";
  if (value <= 0.28) return "Lower walking";
  if (value <= 0.62) return "Moderate walking";
  return "More walking";
}

function exposureLabel(value) {
  return ({
    none: "Weather-resilient",
    low: "Low weather exposure",
    medium: "Weather matters",
    high: "Weather-sensitive",
    "very-high": "Highly weather-sensitive"
  })[value] || "Weather varies";
}

function lightsReady(data) {
  return (data?.decisionClock?.points || []).find(p => p.id === "lights-ready")?.time || null;
}

function whyNow(c, row, data) {
  if (!c) return "Placed here because it fits the selected schedule and hard constraints.";
  if (c.exactStart) return `Fixed-time anchor at ${fmt(c.exactStart)}; the rest of the plan is scheduled around it.`;
  if (c.category === "lights" || c.category === "free") {
    const ready = lightsReady(data);
    return ready ? `Placed after the ${fmt(ready)} lights-ready pivot so daylight is not spent on an after-dark experience.` : "Placed in the after-dark portion of the visit, when the seasonal lights have value.";
  }
  if (["mountain", "snow", "scenic", "view"].includes(c.category)) {
    return "Placed earlier because daylight and mountain visibility have more value here than they do for the downtown evening block.";
  }
  if (c.category === "indoor") return "Used as the weather-resilient part of the sequence; it remains useful if mountain conditions deteriorate.";
  if (c.category === "park") return "Kept in daylight; official NPS road and closure status always outranks this itinerary.";
  if (c.category === "culture") return "Kept as a separate geographic block to avoid unnecessary downtown backtracking.";
  if (c.category === "shopping") return "Grouped with the downtown portion so the car does not need to move between nearby stops.";
  if (c.category === "food") return "Used as a realistic meal and timing buffer rather than pretending a specific restaurant is guaranteed.";
  if (c.category === "event") return "The published event time controls this part of the itinerary.";
  return "Placed here because it is the strongest feasible fit for this part of the selected time window.";
}

function executionNote(c) {
  if (!c) return "Use the official link before committing.";
  if (c.id === "ober-snow-tubing" || c.id === "ober-mountain") return "Mountain, tram and snow operations are separate from downtown weather; verify Ober directly before leaving.";
  if (c.zone === "nps-newfound-gap") return "Recheck official NPS road status immediately before the drive; weather in downtown Gatlinburg is not a road-safety signal.";
  if (c.zone === "nps-sugarlands") return "Official NPS operating and closure information governs this stop.";
  if (c.transitDependent) return "Use the official trolley route/locator at commit time; published general hours do not guarantee every route or stop.";
  if (c.category === "lights") return "Best executed as part of one downtown park-and-walk/trolley block rather than moving the car between displays.";
  if (c.zone === "arts-crafts") return "This is outside the downtown core; treat it as one driving block rather than a quick add-on.";
  if (c.category === "food") return "This is a dining category placeholder, not a claim that a particular restaurant has space.";
  if (c.reservation) return "Confirm official hours and ticket/entry availability before committing.";
  return "Use the official source for final hours or access before committing.";
}

function enrichItinerary(data) {
  return (data.itinerary || []).map(row => {
    const c = V.candidateById(row.id);
    if (!c) return { ...row, categoryLabel: "Stop", costLabel: "Cost varies", walkingLabel: "Walking varies", exposureLabel: "Weather varies", whyNow: whyNow(null, row, data), executionNote: executionNote(null) };
    return {
      ...row,
      category: c.category,
      categoryLabel: categoryLabel(c.category),
      costBand: c.cost,
      costLabel: costLabel(c.cost),
      reservationFlag: Boolean(c.reservation),
      bookingLabel: c.reservation ? "Book / confirm" : "No reservation flag",
      walkingLabel: walkLabel(c.walk),
      exposureLabel: exposureLabel(c.weatherSensitivity),
      bestTime: c.bestTime,
      whyNow: whyNow(c, row, data),
      executionNote: executionNote(c)
    };
  });
}

function buildVisitSnapshot(data, itinerary) {
  const candidates = itinerary.map(row => V.candidateById(row.id)).filter(Boolean);
  const freeCount = candidates.filter(c => c.cost === "free").length;
  const paidCount = candidates.filter(c => c.cost === "$$").length;
  const reservationCount = candidates.filter(c => c.reservation).length;
  const verificationCount = itinerary.filter(row => row.verificationRequired).length;
  const walkValues = candidates.map(c => c.walk).filter(Number.isFinite);
  const avgWalk = walkValues.length ? walkValues.reduce((a, b) => a + b, 0) / walkValues.length : null;
  const indoorCount = candidates.filter(c => c.category === "indoor").length;
  const first = itinerary[0];
  const last = itinerary.at(-1);
  const span = first && last ? `${fmt(first.start)}–${fmt(last.end)}` : "No complete schedule";

  let spend = "Cost varies";
  if (candidates.length && freeCount === candidates.length) spend = "Mostly free";
  else if (candidates.length && paidCount >= Math.ceil(candidates.length * 0.66)) spend = "Paid-attraction heavy";
  else if (candidates.length && freeCount && paidCount) spend = "Free + paid mix";
  else if (candidates.length) spend = "Mixed spend";

  const route = ({
    "downtown-cluster": "Park once downtown",
    mixed: "Drive once, then park downtown",
    "vehicle-led": "Vehicle-led plan",
    unknown: "Movement varies"
  })[data?.visitOperations?.movementMode] || "Movement varies";

  return {
    stopCount: itinerary.length,
    stopLabel: itinerary.length ? `${itinerary.length} planned stop${itinerary.length === 1 ? "" : "s"}` : "No complete plan",
    span,
    spend,
    walking: walkLabel(avgWalk),
    booking: reservationCount ? `${reservationCount} stop${reservationCount === 1 ? "" : "s"} to book / confirm` : "No reservation flags",
    verification: verificationCount ? `${verificationCount} future-hours recheck${verificationCount === 1 ? "" : "s"}` : "No future-hours flags",
    route,
    indoorShare: candidates.length ? `${indoorCount}/${candidates.length} indoor` : "—"
  };
}

function conditionState(data, pattern) {
  const row = (data.conditions || []).find(c => pattern.test(String(c.label || "")));
  return row || null;
}

function buildCommitChecklist(data, itinerary) {
  const weather = conditionState(data, /weather/i);
  const roads = conditionState(data, /(Smokies|road|closure|Newfound)/i);
  const verificationCount = itinerary.filter(row => row.verificationRequired).length;
  const ids = new Set(itinerary.map(row => row.id));
  const ops = data.visitOperations || {};
  const items = [];

  items.push({
    label: "Weather",
    state: weather?.state === "live" || weather?.state === "cached" ? "checked" : "recheck",
    detail: weather?.state === "live" || weather?.state === "cached"
      ? "Forecast data is available for this planning run; recheck close to departure because winter conditions can change."
      : "A trustworthy live forecast is not available for this selected date yet; the planner has not filled the gap with climatology.",
    sourceUrl: weather?.sourceUrl || null
  });

  items.push({
    label: "Smokies roads / closures",
    state: roads?.state === "live" || roads?.state === "cached" ? "checked" : "recheck",
    detail: roads?.value || "Use the official NPS conditions source before any park or Newfound Gap segment.",
    sourceUrl: roads?.sourceUrl || ops.sources?.npsConditions || null
  });

  items.push({
    label: "Selected attraction hours",
    state: verificationCount ? "recheck" : "checked",
    detail: verificationCount
      ? `${verificationCount} selected stop${verificationCount === 1 ? "" : "s"} still carry a future-hours verification flag. Confirm those operator pages before buying or leaving.`
      : "No selected stop is currently flagged by the planner for future-hours verification.",
    sourceUrl: null
  });

  items.push({
    label: "Downtown parking",
    state: "arrival-check",
    detail: "Check the official City of Gatlinburg parking information before entering the core. This planner does not invent live stall availability.",
    sourceUrl: ops.sources?.cityParking || ops.sources?.parking || null
  });

  if (ids.has("trolley-lights") || data.transit) {
    items.push({
      label: "Trolley service",
      state: "recheck",
      detail: "Confirm the route/stop you need and any event-day service changes. General published hours are not a route guarantee.",
      sourceUrl: ops.sources?.trolley || data.transit?.sourceUrl || null
    });
  }

  if (ids.has("ober-mountain") || ids.has("ober-snow-tubing")) {
    items.push({
      label: "Ober mountain operations",
      state: "recheck",
      detail: "Confirm tram, mountain and snow/tubing operations directly. Downtown snowfall or temperature is not used as proof that Ober snow activities are operating.",
      sourceUrl: itinerary.find(row => row.id === "ober-snow-tubing" || row.id === "ober-mountain")?.officialUrl || null
    });
  }

  if (ids.has("parade") || ids.has("new-years")) {
    items.push({
      label: "Event-day traffic",
      state: "recheck",
      detail: "Fixed downtown events can change circulation, parking and trolley behavior. Check the official event notice before arrival.",
      sourceUrl: itinerary.find(row => row.id === "parade" || row.id === "new-years")?.officialUrl || null
    });
  }

  return items;
}

async function buildDecision(rawQuery = {}) {
  const data = await v6.buildDecision(rawQuery);
  const itinerary = enrichItinerary(data);
  const visitSnapshot = buildVisitSnapshot(data, itinerary);
  const commitChecklist = buildCommitChecklist(data, itinerary);
  return {
    ...data,
    version: "3.5",
    itinerary,
    visitSnapshot,
    commitChecklist,
    diagnostics: {
      ...(data.diagnostics || {}),
      benchmarkLayer: true,
      enrichedStops: itinerary.length,
      commitChecks: commitChecklist.length
    }
  };
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
module.exports._test = {
  mins,
  fmt,
  categoryLabel,
  costLabel,
  walkLabel,
  exposureLabel,
  whyNow,
  executionNote,
  enrichItinerary,
  buildVisitSnapshot,
  buildCommitChecklist
};
