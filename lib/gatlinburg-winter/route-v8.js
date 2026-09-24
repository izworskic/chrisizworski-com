"use strict";

const v7 = require("./route-v7.js");

const SOURCES = Object.freeze({
  trolley: "https://www.gatlinburg.com/things-to-do/trolley/",
  parking: "https://www.gatlinburg.com/plan/parking/",
  cityParking: "https://www.gatlinburgtn.gov/page/parking",
  winterMagic: "https://www.gatlinburg.com/events/seasonal-events/winter/wintermagic/",
  webcams: "https://www.gatlinburg.com/plan/webcams/",
  npsFees: "https://www.nps.gov/grsm/planyourvisit/fees.htm",
  npsWeather: "https://www.nps.gov/grsm/planyourvisit/weather.htm",
  npsConditions: "https://www.nps.gov/grsm/planyourvisit/conditions.htm",
  parade: "https://www.gatlinburg.com/events/holiday-events/christmas-parade/"
});

function durationMinutes(start, end) {
  const a = String(start || "").match(/^(\d{2}):(\d{2})$/);
  const b = String(end || "").match(/^(\d{2}):(\d{2})$/);
  if (!a || !b) return null;
  const x = Number(a[1]) * 60 + Number(a[2]);
  const y = Number(b[1]) * 60 + Number(b[2]);
  return y > x ? y - x : null;
}

function durationLabel(start, end) {
  const total = durationMinutes(start, end);
  if (!Number.isFinite(total)) return "No complete plan";
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

function buildPlanBrief(data) {
  const itinerary = data.itinerary || [];
  const first = itinerary[0];
  const last = itinerary.at(-1);
  const fixed = data?.dateIntelligence?.selected?.fixedEvents || [];
  return {
    totalTime: first && last ? durationLabel(first.start, last.end) : "No complete plan",
    stopCount: itinerary.length,
    costMix: data?.visitSnapshot?.spend || "Cost varies",
    walking: data?.visitSnapshot?.walking || "Walking varies",
    exposure: data?.visitSnapshot?.indoorShare || "Exposure varies",
    movement: data?.visitSnapshot?.route || "Movement varies",
    verification: data?.visitSnapshot?.verification || "No future-hours flags",
    eventAnchor: fixed.length ? fixed.map(x => x.name).join(" + ") : "No fixed-date event controls the plan"
  };
}

function buildStopFacts(data) {
  return (data.itinerary || []).map((row, index) => {
    const tags = [row.categoryLabel, row.costLabel, row.walkingLabel, row.exposureLabel].filter(Boolean);
    if (row.reservationFlag) tags.push("Plan ahead / ticketed");
    if (row.verificationRequired) tags.push("Future hours need verification");
    return {
      id: row.id,
      order: index + 1,
      name: row.name,
      start: row.start,
      end: row.end,
      durationMinutes: row.durationMinutes,
      category: row.category || null,
      zone: row.zone || null,
      cost: row.costLabel || "Cost varies",
      reservation: row.bookingLabel || (row.reservationFlag ? "Book / confirm" : "No reservation flag"),
      walking: row.walkingLabel || "Walking varies",
      weather: row.exposureLabel || "Weather varies",
      whyHere: row.whyNow || "This stop fits the selected schedule and hard constraints.",
      operatorNote: row.executionNote || "Use the official source before committing.",
      tags,
      verificationRequired: Boolean(row.verificationRequired),
      officialUrl: row.officialUrl || null
    };
  });
}

function buildSeasonFacts() {
  return [
    {
      label: "Winter Magic",
      value: "Nov 5, 2026–Feb 15, 2027",
      note: "Official seasonal lights window used by the planner.",
      sourceUrl: SOURCES.winterMagic
    },
    {
      label: "Christmas parade",
      value: "Fri Dec 4 · 7:30 PM",
      note: "Fixed event anchor for December 4 plans.",
      sourceUrl: SOURCES.parade
    },
    {
      label: "Winter trolley",
      value: "10:30 AM–10:00 PM",
      note: "General Nov 1–Apr 30 schedule; route and event service can vary.",
      sourceUrl: SOURCES.trolley
    },
    {
      label: "Smokies parking",
      value: "Tag required after 15 min",
      note: "Applies when parking inside Great Smoky Mountains National Park.",
      sourceUrl: SOURCES.npsFees
    }
  ];
}

function buildLookNow(data) {
  const itinerary = data.itinerary || [];
  const nps = Boolean(data?.visitOperations?.npsStops) || itinerary.some(x => String(x.zone || "").startsWith("nps-"));
  const downtown = itinerary.some(x => ["downtown-core", "downtown-north", "skypark", "anakeesta"].includes(x.zone)) || itinerary.some(x => ["lights", "free", "shopping", "food"].includes(x.category));
  const lights = itinerary.some(x => x.category === "lights" || x.id === "winter-magic-walk") || data?.input?.mustLights;
  const items = [];

  if (downtown) items.push({
    label: "See Gatlinburg now",
    note: "Official Gatlinburg webcam collection for downtown and attraction views.",
    sourceUrl: SOURCES.webcams,
    sourceLabel: "Official webcams"
  });
  if (nps) items.push({
    label: "Check the Smokies now",
    note: "Official NPS conditions and closure context. Higher elevations can differ sharply from downtown.",
    sourceUrl: SOURCES.npsConditions,
    sourceLabel: "NPS conditions"
  });
  if (lights) items.push({
    label: "Open the lights map",
    note: "Official Winter Magic self-guided tour and snowpeople scavenger-hunt information.",
    sourceUrl: SOURCES.winterMagic,
    sourceLabel: "Winter Magic"
  });
  if (downtown) items.push({
    label: "Check parking before the core",
    note: "Official City of Gatlinburg parking information. The planner does not invent stall counts.",
    sourceUrl: SOURCES.cityParking,
    sourceLabel: "City parking"
  });
  return items.slice(0, 4);
}

function sourceLabel(url) {
  if (!url) return "Official source";
  if (url.includes("nps.gov")) return "NPS";
  if (url.includes("gatlinburgtn.gov")) return "City parking";
  if (url.includes("gatlinburg.com")) return "Visit Gatlinburg";
  return "Official source";
}

function buildCommitChecks(data) {
  const mapped = (data.commitChecklist || []).map(row => ({
    state: row.state || "recheck",
    priority: row.state === "arrival-check" ? "before-arrival" : row.state === "checked" ? "already-checked" : "before-committing",
    label: row.label,
    detail: row.detail,
    sourceUrl: row.sourceUrl || null,
    sourceLabel: sourceLabel(row.sourceUrl)
  }));

  const nps = Boolean(data?.visitOperations?.npsStops) || (data.itinerary || []).some(x => String(x.zone || "").startsWith("nps-"));
  if (nps && !mapped.some(x => /parking tag/i.test(x.label))) {
    mapped.push({
      state: "arrival-check",
      priority: "before-park",
      label: "Carry a Smokies parking tag if you will park",
      detail: "Great Smoky Mountains National Park requires a parking tag for vehicles parked longer than 15 minutes. A tag does not guarantee a space.",
      sourceUrl: SOURCES.npsFees,
      sourceLabel: "NPS fees"
    });
  }

  if ((data.itinerary || []).some(x => x.category === "lights") && !mapped.some(x => /lights map/i.test(x.label))) {
    mapped.push({
      state: "recheck",
      priority: "optional-extra",
      label: "Use the official Winter Magic map if you want to keep wandering",
      detail: "The city map and snowpeople scavenger hunt can extend the evening without forcing another paid attraction into the core plan.",
      sourceUrl: SOURCES.winterMagic,
      sourceLabel: "Winter Magic"
    });
  }

  return mapped;
}

function buildMonthGuide() {
  return [
    {
      month: "November",
      headline: "Winter Magic starts Nov 5",
      detail: "Use early November for lights plus fall-to-winter shoulder-season flexibility; fixed holiday events begin to matter later in the month.",
      sourceUrl: SOURCES.winterMagic
    },
    {
      month: "December",
      headline: "Holiday events can control the whole day",
      detail: "The Fantasy of Lights Christmas Parade is Friday, Dec 4 at 7:30 PM. On fixed-event dates the planner schedules around the event instead of treating it as another optional stop.",
      sourceUrl: SOURCES.parade
    },
    {
      month: "January",
      headline: "Lights remain, snow decisions get more operational",
      detail: "Winter Magic continues, while snow-focused plans depend on mountain and operator status rather than downtown snowfall.",
      sourceUrl: SOURCES.winterMagic
    },
    {
      month: "February",
      headline: "Winter Magic runs through Feb 15",
      detail: "The first half of February still supports the lights-first winter product; later-February planning shifts away from Winter Magic.",
      sourceUrl: SOURCES.winterMagic
    }
  ];
}

async function buildDecision(rawQuery = {}) {
  const data = await v7.buildDecision(rawQuery);
  const stopFacts = buildStopFacts(data);
  const commitChecks = buildCommitChecks(data);
  const planBrief = buildPlanBrief(data);
  return {
    ...data,
    benchmarkVersion: "3.6",
    planBrief,
    stopFacts,
    seasonFacts: buildSeasonFacts(),
    lookNow: buildLookNow(data),
    commitChecks,
    monthGuide: buildMonthGuide(),
    diagnostics: {
      ...(data.diagnostics || {}),
      benchmarkFinishLayer: true,
      stopFactCount: stopFacts.length,
      commitCheckCount: commitChecks.length
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
  durationMinutes,
  durationLabel,
  buildPlanBrief,
  buildStopFacts,
  buildSeasonFacts,
  buildLookNow,
  buildCommitChecks,
  buildMonthGuide
};
