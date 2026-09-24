"use strict";

const v6 = require("./route-v6.js");
const base = require("./route.js");

const T = base._test;

const SOURCES = Object.freeze({
  trolley: "https://www.gatlinburg.com/things-to-do/trolley/",
  parking: "https://www.gatlinburg.com/plan/parking/",
  cityParking: "https://www.gatlinburgtn.gov/documents/departments/parking/479808",
  winterMagic: "https://www.gatlinburg.com/events/seasonal-events/winter/wintermagic/",
  npsFees: "https://www.nps.gov/grsm/planyourvisit/fees.htm",
  npsWeather: "https://www.nps.gov/grsm/planyourvisit/weather.htm",
  npsConditions: "https://www.nps.gov/grsm/planyourvisit/conditions.htm"
});

function mins(v) {
  const m = String(v || "").match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function durationLabel(start, end) {
  const a = mins(start), b = mins(end);
  if (a == null || b == null || b <= a) return "—";
  const total = b - a;
  const h = Math.floor(total / 60), m = total % 60;
  return h && m ? `${h} hr ${m} min` : h ? `${h} hr` : `${m} min`;
}

function walkingLabel(value) {
  if (!Number.isFinite(value)) return "Not classified";
  if (value >= 0.68) return "More walking";
  if (value >= 0.38) return "Moderate walking";
  return "Less walking";
}

function weatherLabel(value) {
  const map = {
    none: "Low weather sensitivity",
    low: "Low weather sensitivity",
    medium: "Weather can matter",
    high: "Weather-sensitive",
    "very-high": "Highly weather-sensitive"
  };
  return map[value] || "Weather effect varies";
}

function costLabel(value) {
  if (value === "free") return "Free";
  if (value === "$") return "Lower-cost";
  if (value === "$$") return "Paid attraction";
  return value || "Varies";
}

function bestTimeLabel(value) {
  const map = {
    dark: "Best after dark",
    "before-sunset": "Use daylight first",
    day: "Daylight stop",
    evening: "Evening stop",
    any: "Flexible timing",
    "day-or-evening": "Works day or evening",
    "late-afternoon-evening": "Late afternoon / evening"
  };
  return map[value] || value || "Flexible timing";
}

function stopWhy(data, candidate, stop) {
  if (!candidate) return "This stop survived the hard gates and fit the selected schedule.";
  const weatherText = String(data?.headline?.weather || "").toLowerCase();
  const visText = String(data?.headline?.mountainVisibility || "").toLowerCase();
  const persona = data?.input?.persona;

  if (candidate.category === "lights") return "Placed after useful daylight so the seasonal lights are not consuming the strongest daytime window.";
  if (candidate.category === "event") return "This is fixed to the selected date, so the rest of the itinerary is sequenced around it.";
  if (candidate.category === "indoor" && /(rain|precip|wet|snow)/.test(weatherText)) return "Provides a weather-tolerant block without wasting the evening light window.";
  if (["mountain", "view", "scenic"].includes(candidate.category)) {
    if (/poor|low|limited|cloud|mixed/.test(visText)) return "Kept only because it still fits the schedule; visibility remains a commit-time check.";
    return "Uses the better daylight portion of the visit before downtown lights become the stronger use of time.";
  }
  if (candidate.category === "snow") return "Included for the snow-focused visit, but mountain operations—not downtown snowfall—govern whether the snow activity is actually available.";
  if (candidate.category === "food") return "Placed as a recovery / meal block without creating a separate cross-town trip.";
  if (candidate.category === "culture") return "Adds a non-Parkway experience while there is still useful daylight.";
  if (candidate.category === "shopping") return persona === "christmas" ? "Adds Christmas atmosphere without requiring another vehicle move." : "Fits naturally inside the downtown walking cluster.";
  if (candidate.category === "park") return "Adds a Smokies stop while preserving a separate downtown block later in the visit.";
  return `This stop fits the ${data?.decision?.label || "selected"} plan without forcing another stop out of the clock.`;
}

function stopFacts(data) {
  return (data?.itinerary || []).map((stop, index) => {
    const c = T.candidateById(stop.id);
    const tags = [];
    if (c?.cost) tags.push(costLabel(c.cost));
    if (c?.bestTime) tags.push(bestTimeLabel(c.bestTime));
    if (Number.isFinite(c?.walk)) tags.push(walkingLabel(c.walk));
    if (c?.reservation) tags.push("Plan ahead / ticketed");
    if (c?.snowDependent) tags.push("Snow-operation dependent");
    if (c?.officialClosureSensitive) tags.push("Closure-sensitive");
    if (c?.visibilityDependent) tags.push("Visibility-sensitive");

    return {
      id: stop.id,
      order: index + 1,
      name: stop.name,
      start: stop.start,
      end: stop.end,
      durationMinutes: stop.durationMinutes,
      category: c?.category || null,
      zone: stop.zone || c?.zone || null,
      cost: costLabel(c?.cost),
      reservation: c?.reservation ? "Plan ahead / ticketed" : "No reservation flag in planner",
      bestTime: bestTimeLabel(c?.bestTime),
      walking: walkingLabel(c?.walk),
      weather: weatherLabel(c?.weatherSensitivity),
      whyHere: stopWhy(data, c, stop),
      tags,
      verificationRequired: Boolean(stop.verificationRequired),
      officialUrl: stop.officialUrl || c?.officialUrl || null
    };
  });
}

function buildPlanBrief(data, cards) {
  const first = data?.itinerary?.[0];
  const last = data?.itinerary?.at?.(-1) || data?.itinerary?.[data.itinerary.length - 1];
  const free = cards.filter(x => x.cost === "Free").length;
  const paid = cards.filter(x => ["Paid attraction", "Lower-cost"].includes(x.cost)).length;
  const moreWalking = cards.some(x => x.walking === "More walking");
  const indoor = cards.filter(x => x.category === "indoor").length;
  const outdoor = cards.filter(x => !["indoor", "food", "shopping"].includes(x.category)).length;
  const verify = cards.filter(x => x.verificationRequired).length;
  const fixed = data?.dateIntelligence?.selected?.fixedEvents || [];
  const mode = data?.visitOperations?.movementMode;

  return {
    totalTime: first && last ? durationLabel(first.start, last.end) : "No complete plan",
    stopCount: cards.length,
    costMix: paid === 0 ? "Mostly / entirely free" : free ? `${free} free + ${paid} paid/lower-cost` : `${paid} paid/lower-cost stops`,
    walking: moreWalking ? "More walking in this version" : cards.some(x => x.walking === "Moderate walking") ? "Moderate walking" : "Lower-walk plan",
    exposure: indoor && outdoor ? "Indoor + outdoor mix" : indoor ? "Mostly indoor" : outdoor ? "Mostly outdoors" : "Mixed",
    movement: mode === "downtown-cluster" ? "Park once downtown" : mode === "mixed" ? "Separate drive + downtown cluster" : mode === "vehicle-led" ? "Vehicle-led" : "Movement varies",
    verification: verify ? `${verify} stop${verify === 1 ? "" : "s"} still need official-hours verification` : "No selected stop carries a future-hours flag",
    eventAnchor: fixed.length ? fixed.map(x => x.name).join(" + ") : "No fixed-date event controls the plan"
  };
}

function buildCommitChecks(data, cards) {
  const checks = [];
  const nps = cards.some(x => String(x.zone || "").startsWith("nps-"));
  const downtown = cards.some(x => ["downtown-core", "downtown-north", "skypark", "anakeesta"].includes(x.zone));
  const lights = cards.some(x => x.category === "lights");
  const mountain = cards.some(x => ["mountain", "snow", "scenic", "view", "park"].includes(x.category));
  const verify = cards.filter(x => x.verificationRequired);
  const end = mins(data?.input?.end);

  if (downtown) {
    checks.push({
      priority: "before-arrival",
      label: "Check live city parking",
      detail: "The City of Gatlinburg publishes live information for its municipal garages. Use that before entering the downtown core; this planner does not invent stall counts.",
      sourceUrl: SOURCES.cityParking,
      sourceLabel: "City parking"
    });
  }

  checks.push({
    priority: "before-arrival",
    label: "Know the trolley cutoff",
    detail: end != null && end > 22 * 60
      ? "Your visit runs past the published general winter trolley schedule of 10:30 AM–10:00 PM, so the last leg needs another movement plan."
      : "General winter trolley service is published for 10:30 AM–10:00 PM from November 1 through April 30; route-specific and event service still need a same-day check.",
    sourceUrl: SOURCES.trolley,
    sourceLabel: "Official trolley"
  });

  if (nps) {
    checks.push({
      priority: "before-park",
      label: "Get the Smokies parking tag if you will park",
      detail: "Great Smoky Mountains National Park requires a parking tag for vehicles parked longer than 15 minutes. A tag does not guarantee a space.",
      sourceUrl: SOURCES.npsFees,
      sourceLabel: "NPS fees"
    });
  }

  if (mountain) {
    checks.push({
      priority: "same-day",
      label: "Recheck mountain conditions separately from downtown",
      detail: "NPS notes temperatures can differ by 10–20°F from mountain base to top, and clear lower-elevation weather does not guarantee similar conditions higher up.",
      sourceUrl: SOURCES.npsWeather,
      sourceLabel: "NPS weather"
    });
  }

  if (lights) {
    checks.push({
      priority: "optional-extra",
      label: "Use the official Winter Magic map if you want to keep wandering",
      detail: "The official Winter Magic page links the self-guided lights map and the snowpeople scavenger hunt, which can extend the downtown portion without adding another paid attraction.",
      sourceUrl: SOURCES.winterMagic,
      sourceLabel: "Winter Magic"
    });
  }

  if (verify.length) {
    checks.push({
      priority: "before-paying",
      label: "Verify future-date attraction hours",
      detail: `${verify.map(x => x.name).join(", ")} ${verify.length === 1 ? "still has" : "still have"} an official-hours verification flag. Confirm the operator's own page before buying or committing.`,
      sourceUrl: verify[0].officialUrl,
      sourceLabel: "Operator check"
    });
  }

  return checks;
}

function buildSeasonFacts(data) {
  return [
    {
      label: "Winter Magic",
      value: "Nov 5, 2026–Feb 15, 2027",
      note: "Official seasonal lights window used by the planner.",
      sourceUrl: SOURCES.winterMagic
    },
    {
      label: "Winter trolley",
      value: "10:30 AM–10:00 PM",
      note: "General Nov 1–Apr 30 schedule; route/event details can vary.",
      sourceUrl: SOURCES.trolley
    },
    {
      label: "Smokies parking",
      value: "Tag required after 15 min",
      note: "Applies when parking inside Great Smoky Mountains National Park.",
      sourceUrl: SOURCES.npsFees
    },
    {
      label: "Mountain weather",
      value: "Can differ 10–20°F",
      note: "NPS base-to-top temperature guidance; not a forecast substitute.",
      sourceUrl: SOURCES.npsWeather
    }
  ];
}

async function buildDecision(rawQuery = {}) {
  const data = await v6.buildDecision(rawQuery);
  const cards = stopFacts(data);
  return {
    ...data,
    version: "3.5",
    planBrief: buildPlanBrief(data, cards),
    stopFacts: cards,
    commitChecks: buildCommitChecks(data, cards),
    seasonFacts: buildSeasonFacts(data),
    diagnostics: {
      ...(data.diagnostics || {}),
      benchmarkDetailLayer: true,
      stopFactCount: cards.length,
      commitCheckCount: buildCommitChecks(data, cards).length
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
  durationLabel,
  walkingLabel,
  weatherLabel,
  costLabel,
  bestTimeLabel,
  stopWhy,
  stopFacts,
  buildPlanBrief,
  buildCommitChecks,
  buildSeasonFacts
};
