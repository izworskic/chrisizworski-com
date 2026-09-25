"use strict";

const v13 = require("./route-v13.js");
const base = require("./route.js");
const v2 = require("./route-v2.js");

const T = base._test;
const V = v2._test;
const RESPONSE_BUDGET_MS = 7200;
const FIVE = new Set(["first", "family", "couple", "christmas", "snow"]);
const DOWNTOWN = new Set(["downtown-core", "downtown-north", "skypark", "anakeesta"]);

function safe(value, max = 220) {
  return String(value == null ? "" : value)
    .replace(/[<>\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function canonicalPersona(rawQuery = {}, input = {}) {
  const requested = String(rawQuery.persona || input.persona || "first");
  if (FIVE.has(requested)) return requested;
  if (requested === "food-lights") return "couple";
  return "first";
}

function canonicalGoal(persona, rawQuery = {}) {
  const requested = String(rawQuery.goal || "");
  const allowed = {
    first: ["classic", "mountains", "compact"],
    family: ["easy", "weather-proof", "lights"],
    couple: ["scenic", "festive", "low-key"],
    christmas: ["lights", "event", "low-crowd"],
    snow: ["activity", "tubing", "natural"]
  };
  if (allowed[persona]?.includes(requested)) return requested;
  return ({ first: "classic", family: "easy", couple: "scenic", christmas: "lights", snow: "activity" })[persona] || "classic";
}

function planTemplates(persona, goal, date) {
  if (persona === "family") {
    return goal === "weather-proof"
      ? [["ripley-aquarium", "casual-food", "winter-magic-walk"], ["ripley-aquarium", "winter-magic-walk"], ["the-village", "winter-magic-walk"]]
      : [["ripley-aquarium", "casual-food", "winter-magic-walk"], ["the-village", "casual-food", "winter-magic-walk"], ["the-village", "winter-magic-walk"]];
  }
  if (persona === "couple") {
    if (goal === "festive") return [["the-village", "downtown-dinner", "winter-magic-walk"], ["the-village", "riverwalk-lights"], ["downtown-dinner", "winter-magic-walk"]];
    if (goal === "low-key") return [["sugarlands", "downtown-dinner", "riverwalk-lights"], ["the-village", "downtown-dinner", "riverwalk-lights"], ["downtown-dinner", "riverwalk-lights"]];
    return [["skypark", "downtown-dinner", "winter-magic-walk"], ["space-needle", "downtown-dinner", "winter-magic-walk"], ["the-village", "downtown-dinner", "winter-magic-walk"]];
  }
  if (persona === "christmas") {
    if (goal === "event" && date === "2026-12-04") return [["the-village", "downtown-dinner", "parade"], ["downtown-dinner", "parade"], ["winter-magic-walk", "parade"]];
    if (goal === "event" && date === "2026-12-31") return [["the-village", "downtown-dinner", "new-years"], ["downtown-dinner", "new-years"], ["winter-magic-walk", "new-years"]];
    if (goal === "low-crowd") return [["the-village", "downtown-dinner", "riverwalk-lights"], ["trolley-lights", "riverwalk-lights"], ["the-village", "riverwalk-lights"]];
    return [["the-village", "downtown-dinner", "winter-magic-walk"], ["parkway-lights", "the-village"], ["winter-magic-walk", "trolley-lights"]];
  }
  if (persona === "snow") {
    if (goal === "tubing") return [["ober-snow-tubing", "casual-food", "winter-magic-walk"], ["ober-snow-tubing", "casual-food"], ["ober-mountain", "winter-magic-walk"]];
    if (goal === "natural") return [["sugarlands", "downtown-dinner", "winter-magic-walk"], ["sugarlands", "the-village", "winter-magic-walk"], ["sugarlands", "winter-magic-walk"]];
    return [["ober-mountain", "downtown-dinner", "winter-magic-walk"], ["ober-mountain", "casual-food"], ["ober-snow-tubing", "winter-magic-walk"]];
  }
  if (goal === "mountains") return [["skypark", "downtown-dinner", "winter-magic-walk"], ["anakeesta", "downtown-dinner", "winter-magic-walk"], ["skypark", "winter-magic-walk"]];
  if (goal === "compact") return [["ripley-aquarium", "the-village", "winter-magic-walk"], ["the-village", "casual-food", "winter-magic-walk"], ["the-village", "winter-magic-walk"]];
  return [["skypark", "downtown-dinner", "winter-magic-walk"], ["ripley-aquarium", "downtown-dinner", "winter-magic-walk"], ["the-village", "downtown-dinner", "winter-magic-walk"]];
}

function chooseScheduled(input, persona, goal) {
  const templates = planTemplates(persona, goal, input.date);
  for (const ids of templates) {
    const scheduled = V.scheduleIds(ids, input);
    if (scheduled.itinerary.length >= 2 && scheduled.dropped.length === 0) return { ids, ...scheduled };
  }
  const emergency = V.scheduleIds(["the-village", "winter-magic-walk"], input);
  return { ids: ["the-village", "winter-magic-walk"], ...emergency };
}

function labels(c) {
  const category = ({ lights: "Lights", mountain: "Mountain", snow: "Snow", indoor: "Indoor", culture: "Arts + culture", shopping: "Browse", park: "National park", scenic: "Scenic drive", food: "Food", view: "View", free: "Free downtown", event: "Event" })[c?.category] || "Stop";
  const cost = ({ free: "Free", "$": "Lower-cost", "$$": "Paid attraction" })[c?.cost] || "Cost varies";
  const walk = Number(c?.walk);
  const walking = Number.isFinite(walk) ? (walk <= 0.28 ? "Lower walking" : walk <= 0.62 ? "Moderate walking" : "More walking") : "Walking varies";
  const exposure = ({ none: "Weather-resilient", low: "Low weather exposure", medium: "Weather matters", high: "Weather-sensitive", "very-high": "Highly weather-sensitive" })[c?.weatherSensitivity] || "Weather varies";
  return { category, cost, walking, exposure };
}

function stopWhy(c, persona) {
  if (!c) return "This stop fits the available window and keeps the sequence coherent.";
  if (c.category === "lights" || c.category === "free") return "Keep this after dark, when the seasonal lighting earns the time instead of using up the better daylight window.";
  if (c.category === "food") return "Use this as the meal and pacing buffer so the rest of the visit does not turn into back-to-back attraction timing.";
  if (c.id === "ober-mountain" || c.id === "ober-snow-tubing") return "This is the actual mountain snow-operations block; downtown snowfall is not being used as proof that Ober is operating.";
  if (c.category === "mountain" || c.category === "view" || c.category === "park" || c.category === "scenic") return "Put the elevation or park-facing stop in the daylight window, then transition into the compact downtown evening.";
  if (c.category === "indoor") return persona === "family" ? "This gives the family a weather-resilient anchor without adding another long movement block." : "This is the weather-resilient anchor in the sequence.";
  if (c.category === "shopping") return "Keep this inside the downtown block so you do not burn time moving the car between nearby pieces of the visit.";
  return "This stop fits the available window without forcing unnecessary backtracking.";
}

function enrichItinerary(rows, persona) {
  return (rows || []).map(row => {
    const c = V.candidateById(row.id);
    const l = labels(c);
    return {
      ...row,
      category: c?.category || null,
      categoryLabel: l.category,
      costBand: c?.cost || null,
      costLabel: l.cost,
      reservationFlag: Boolean(c?.reservation),
      bookingLabel: c?.reservation ? "Book / confirm" : "No reservation flag",
      walkingLabel: l.walking,
      exposureLabel: l.exposure,
      bestTime: c?.bestTime || null,
      whyNow: stopWhy(c, persona),
      executionNote: c?.reservation
        ? "Confirm official hours and ticket or entry availability before committing."
        : c?.zone?.startsWith("nps-")
          ? "Recheck official NPS access and road conditions before this segment."
          : "Use the official source for final hours or access before committing."
    };
  });
}

function personaReason(persona, goal) {
  if (persona === "family") return "This fallback protects family energy first: fewer geographic jumps, a realistic meal buffer and an after-dark seasonal finish.";
  if (persona === "couple") return "This fallback favors a coherent daylight-to-dinner-to-evening rhythm instead of maximizing attraction count.";
  if (persona === "christmas") return goal === "event" ? "This fallback treats the published holiday event as the anchor and makes the rest of the evening serve it." : "This fallback makes Winter Magic the point of the evening instead of an afterthought.";
  if (persona === "snow") return goal === "natural" ? "This fallback keeps natural winter scenery separate from Ober snowmaking and operating status." : "This fallback uses an actual Ober snow-activity block; downtown weather is not treated as proof of mountain operations.";
  return "This fallback gives a first-time visitor a daylight-dependent anchor and a compact after-dark Gatlinburg block instead of a random attraction checklist.";
}

function buildOperations(itinerary) {
  const candidates = itinerary.map(x => V.candidateById(x.id)).filter(Boolean);
  const downtown = candidates.filter(c => DOWNTOWN.has(c.zone)).length;
  const outlying = candidates.length - downtown;
  const movementMode = outlying && downtown ? "mixed" : outlying ? "vehicle-led" : "downtown-cluster";
  const movement = movementMode === "mixed"
    ? "Treat the outlying stop as one driving block, then park once and keep the downtown pieces together."
    : movementMode === "vehicle-led"
      ? "This sequence depends on separated destinations, so keep the vehicle leg explicit and do not assume trolley coverage."
      : "This is a downtown-heavy plan. Park once and keep the core stops together instead of moving the car between them.";
  return {
    movementMode,
    movement,
    trolleyState: "recheck",
    trolley: "Use the official trolley page for route and same-day service. Published general hours are not a route guarantee.",
    parking: downtown ? "Check City of Gatlinburg parking before entering the core, then keep the downtown block parked once." : "Downtown parking is secondary to this sequence; check official city parking if the plan changes toward the core.",
    special: candidates.some(c => c.zone === "ober") ? "Ober remains a separate mountain-operations decision; verify tram, snow and activity status directly." : candidates.some(c => String(c.zone || "").startsWith("nps-")) ? "The Smokies segment is operationally separate from downtown; recheck NPS conditions before leaving." : "No separate park or mountain operating block is required beyond the selected attraction checks.",
    downtownStops: downtown,
    outlyingStops: outlying,
    npsStops: candidates.filter(c => String(c.zone || "").startsWith("nps-")).length,
    hasOber: candidates.some(c => c.zone === "ober"),
    hasMajorEvent: itinerary.some(x => ["parade", "new-years"].includes(x.id)),
    sources: {
      parking: "https://www.gatlinburg.com/plan/parking/",
      cityParking: "https://www.gatlinburgtn.gov/page/parking",
      trolley: "https://www.gatlinburg.com/things-to-do/trolley/",
      npsConditions: "https://www.nps.gov/grsm/planyourvisit/conditions.htm"
    }
  };
}

function fallbackDecision(rawQuery = {}, reason = "live enrichment deadline", meta = {}) {
  const normalized = v13._test.normalizeWinterQuery(rawQuery);
  const input0 = T.normalizeInput(normalized.query);
  const persona = canonicalPersona(rawQuery, input0);
  const goal = canonicalGoal(persona, rawQuery);
  const input = { ...input0, persona, personaGoal: goal };
  const scheduled = chooseScheduled(input, persona, goal);
  const itinerary = enrichItinerary(scheduled.itinerary, persona);
  const sun = T.sunriseSunsetApprox(input.date);
  const crowd = T.crowdPressure(input);
  const events = T.eventsForDate(input.date);
  const operations = buildOperations(itinerary);
  const first = itinerary[0];
  const last = itinerary.at(-1);
  const reasonText = personaReason(persona, goal);
  const inSeason = T.inSeason(input.date);
  const span = first && last ? `${T.formatTime(first.start)}–${T.formatTime(last.end)}` : "Adjust the available window";
  const map = itinerary.map(x => {
    const c = V.candidateById(x.id);
    return { id: x.id, name: x.name, lat: c?.lat, lon: c?.lon, zone: x.zone, start: x.start };
  });
  const verificationCount = itinerary.filter(x => x.verificationRequired).length;
  const commitChecklist = [
    { label: "Weather", state: "recheck", detail: "Live NWS enrichment did not finish inside this response budget. Recheck weather closer to the visit; no weather value was invented.", sourceUrl: "https://www.weather.gov/" },
    { label: "Selected attraction hours", state: verificationCount ? "recheck" : "checked", detail: verificationCount ? `${verificationCount} selected stop${verificationCount === 1 ? "" : "s"} need official future-date hours confirmation.` : "No selected stop is flagged for a future-hours confirmation in this fallback sequence.", sourceUrl: null },
    { label: "Downtown parking", state: "arrival-check", detail: "Check official City of Gatlinburg parking before entering the core; the planner does not invent stall availability.", sourceUrl: operations.sources.cityParking }
  ];
  if (operations.hasOber) commitChecklist.push({ label: "Ober mountain operations", state: "recheck", detail: "Confirm tram, mountain, snowmaking and tubing/activity status directly with Ober before committing.", sourceUrl: itinerary.find(x => x.id === "ober-mountain" || x.id === "ober-snow-tubing")?.officialUrl || null });
  if (operations.npsStops) commitChecklist.push({ label: "Smokies road / access conditions", state: "recheck", detail: "Use official NPS conditions before the park segment. Downtown conditions are not a road-safety signal.", sourceUrl: operations.sources.npsConditions });

  const alternatives = planTemplates(persona, goal, input.date).slice(1, 3).map((ids, i) => {
    const alt = V.scheduleIds(ids, input);
    return {
      id: `fallback-alt-${i + 1}`,
      label: i === 0 ? "More compact option" : "Different emphasis",
      why: "A deterministic alternative that still respects the selected time window.",
      window: alt.itinerary.length ? `${T.formatTime(alt.itinerary[0].start)}–${T.formatTime(alt.itinerary.at(-1).end)}` : null,
      items: alt.itinerary.map(x => x.name)
    };
  }).filter(x => x.items.length >= 2);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    destination: T.DESTINATION,
    input,
    mode: inSeason ? "winter-season" : input.date < T.SEASON.start ? "preseason" : "postseason",
    season: T.SEASON,
    benchmarkVersion: "5.2-resilient",
    personaEngineVersion: "1.2",
    personaPolicy: { persona, goal, mode: "deterministic-resilience" },
    requestNormalization: {
      requestedDate: normalized.requestedDate || meta.requestedDate || null,
      normalizedDate: normalized.normalizedDate || meta.normalizedDate || null,
      supportedWindow: ["2026-11-01", "2027-02-28"]
    },
    headline: {
      dateLabel: T.dateLabel(input.date),
      state: inSeason ? "WINTER PLAN READY" : "PRE-SEASON PLAN",
      bestWindow: span,
      winterMagic: inSeason ? "In season — strongest after dark" : `Begins ${T.SEASON.start}`,
      weather: "Live forecast enrichment did not finish — recheck closer to the visit",
      snow: persona === "snow" ? "Snow activity requires direct mountain-operations confirmation" : "Snow not assumed in fallback mode",
      mountainVisibility: itinerary.some(x => ["mountain", "snow", "scenic", "view", "park"].includes(x.category)) ? "Check closer to the visit — elevation conditions vary" : "Not central to this plan",
      crowdPressure: crowd.label,
      bestMove: first ? `${first.name} first. ${reasonText}` : "Adjust the visit window to build a complete sequence.",
      sunset: sun.sunset ? T.formatTime(sun.sunset) : "—"
    },
    decisionHealth: {
      state: itinerary.length >= 2 ? "ready" : "check",
      label: itinerary.length >= 2 ? "PLAN READY · LIVE ENRICHMENT LATER" : "NO COMPLETE PLAN YET",
      summary: itinerary.length >= 2 ? "A complete persona-specific plan is available. Live/JEV/Haiku enrichment missed this request deadline, so the page is using the grounded deterministic desk plan instead of failing." : "The selected time window is too short for a complete fallback sequence.",
      criticalSources: []
    },
    decision: {
      bundleId: "resilient-static",
      label: `${persona === "first" ? "First visit" : persona.charAt(0).toUpperCase() + persona.slice(1)} · ${goal.replace(/-/g, " ")}`,
      summary: `${reasonText} The sequence runs ${span}.`,
      why: reasonText,
      decisiveConstraint: `${persona} · ${goal} · response reliability`,
      jev: { mode: "deterministic-resilience", confidence: 1, model: null, stage: "response-deadline-fallback" },
      writer: { mode: "deterministic", model: null, voice: "Gatlinburg Winter Desk Editor", lens: persona }
    },
    itinerary,
    visitSnapshot: {
      stopCount: itinerary.length,
      stopLabel: `${itinerary.length} planned stop${itinerary.length === 1 ? "" : "s"}`,
      span,
      spend: itinerary.some(x => x.costBand === "$$") ? "Free + paid mix" : "Mostly free / lower-cost",
      walking: itinerary.some(x => x.walkingLabel === "More walking") ? "More walking" : "Moderate walking",
      booking: itinerary.some(x => x.reservationFlag) ? "At least 1 stop to book / confirm" : "No reservation flags",
      verification: verificationCount ? `${verificationCount} future-hours recheck${verificationCount === 1 ? "" : "s"}` : "No future-hours flags",
      route: operations.movementMode === "mixed" ? "Drive once, then park downtown" : operations.movementMode === "downtown-cluster" ? "Park once downtown" : "Vehicle-led plan",
      indoorShare: `${itinerary.filter(x => x.category === "indoor").length}/${Math.max(1, itinerary.length)} indoor`
    },
    visitOperations: operations,
    decisionClock: {
      signature: `${persona} fallback → ${operations.movementMode}`,
      points: sun.sunset ? [{ id: "sunset", time: sun.sunset, label: "Sunset", effect: itinerary.some(x => x.category === "lights") ? "The value shifts from daylight-dependent stops toward the downtown seasonal-light block." : "The usable daylight window closes for elevation and park-facing stops.", state: "calculated", sourceUrl: "https://gml.noaa.gov/grad/solcalc/" }] : [],
      pivots: [{ trigger: "Official attraction hours or mountain/park operations do not support the scheduled slot", response: "Rebuild the plan rather than forcing that stop into the day.", source: "Official operator / NPS sources" }],
      sourcePolicy: "Fallback timing uses published seasonal facts and calculated daylight only. No live condition is invented."
    },
    dateIntelligence: {
      selected: { date: input.date, selected: true, dateLabel: T.dateLabel(input.date), inSeason, crowdLabel: crowd.label, fixedEvents: events.map(e => ({ id: e.id, name: e.name, time: e.time, sourceUrl: e.sourceUrl })) },
      whyThisDate: { summary: `${T.dateLabel(input.date)} supports this deterministic ${persona} sequence inside the selected time window${inSeason ? " while Winter Magic is active" : ""}.`, reasons: [{ label: "Season", value: inSeason ? "Winter Magic is active on this date." : "This date is outside the active Winter Magic window." }, { label: "Daylight", value: sun.sunset ? `Calculated sunset is ${T.formatTime(sun.sunset)}.` : "Sunset calculation unavailable." }, { label: "Reliability", value: "This response uses the deterministic planner because live enrichment exceeded the response deadline." }] },
      nearby: [],
      nearbyAdvantage: null,
      comparisonWindow: "not run in resilience mode",
      sourcePolicy: "Nearby-date live comparison is skipped when the request falls back for reliability."
    },
    commitChecklist,
    commitChecks: commitChecklist,
    whatChangedTheAnswer: [
      { factor: "Persona", evidence: `${persona} · ${goal}`, effect: "Changed the required shape of the plan" },
      { factor: "Available time", evidence: `${T.formatTime(input.start)}–${T.formatTime(input.end)}`, effect: "Limited the complete schedule" },
      { factor: "Response reliability", evidence: safe(reason, 160), effect: "Switched from live enrichment to deterministic plan" }
    ],
    conditions: [
      { label: "Weather", value: "Live NWS enrichment missed this response deadline; recheck closer to the visit.", state: "scheduled", sourceUrl: "https://www.weather.gov/" },
      { label: "Downtown snow forecast", value: "Not inferred in resilience mode.", state: "scheduled", sourceUrl: "https://www.weather.gov/" },
      { label: "Smokies access", value: operations.npsStops ? "Official NPS conditions must be checked before this park segment." : "No NPS road segment is required by this fallback itinerary.", state: "published", sourceUrl: operations.sources.npsConditions },
      { label: "Daylight", value: `Sunset ${sun.sunset ? T.formatTime(sun.sunset) : "unavailable"}`, state: "calculated", sourceUrl: "https://gml.noaa.gov/grad/solcalc/" }
    ],
    events,
    alternatives,
    map,
    whatCouldChange: ["Official attraction hours and ticket availability", "Mountain visibility and cloud cover", "NPS road or weather closures", "Rain or snow timing", "Downtown parking and event-day circulation"],
    sources: [
      { name: "Winter Magic dates", state: "published", updatedAt: null, url: "https://www.gatlinburg.com/events/seasonal-events/winter/wintermagic/", note: "Published seasonal window." },
      { name: "NWS Gatlinburg forecast", state: "scheduled", updatedAt: null, url: "https://www.weather.gov/", note: "Live enrichment did not finish inside this request budget." },
      { name: "Great Smoky Mountains conditions", state: "published", updatedAt: null, url: operations.sources.npsConditions, note: "Official recheck before any park segment." },
      { name: "City of Gatlinburg parking", state: "published", updatedAt: null, url: operations.sources.cityParking, note: "Official parking information; no stall count is invented." }
    ],
    assumptions: { isDefault: String(rawQuery.assumed || "") === "1", summary: "The planner used the current selected date, time window and persona controls." },
    editorial: {
      voice: "Gatlinburg Winter Desk Editor",
      lens: { id: persona, brief: reasonText },
      selection: { mode: "deterministic-resilience", confidence: 1, model: null },
      writer: { mode: "deterministic", model: null, reason: safe(reason, 180) }
    },
    diagnostics: {
      degradedSources: [],
      backgroundDegradedSources: [],
      sourceWarnings: [safe(reason, 180)],
      customerHealthContract: "specific-checks-never-global-degraded",
      architecture: "response deadline -> deterministic persona fallback; live/JEV/Haiku are enhancements, never availability dependencies",
      resilienceFallback: true,
      responseBudgetMs: RESPONSE_BUDGET_MS
    }
  };
}

async function buildDecision(rawQuery = {}) {
  const normalized = v13._test.normalizeWinterQuery(rawQuery);
  let timer = null;
  const live = v13.buildDecision(normalized.query)
    .then(data => ({ kind: data?.ok ? "live" : "error", data, error: data?.ok ? null : new Error(data?.error || "live planner returned unusable response") }))
    .catch(error => ({ kind: "error", error }));
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => resolve({ kind: "timeout", error: new Error(`live planner exceeded ${RESPONSE_BUDGET_MS}ms response budget`) }), RESPONSE_BUDGET_MS);
  });
  const outcome = await Promise.race([live, deadline]);
  if (timer) clearTimeout(timer);
  if (outcome.kind === "live") {
    return {
      ...outcome.data,
      diagnostics: {
        ...(outcome.data.diagnostics || {}),
        resilienceFallback: false,
        responseBudgetMs: RESPONSE_BUDGET_MS
      }
    };
  }
  return fallbackDecision(normalized.query, outcome.error?.message || outcome.kind, normalized);
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
    const fallback = fallbackDecision(req.query || {}, error?.message || error);
    return res.status(200).json(fallback);
  }
}

module.exports = handler;
module.exports.buildDecision = buildDecision;
module.exports._test = { RESPONSE_BUDGET_MS, canonicalPersona, canonicalGoal, planTemplates, chooseScheduled, fallbackDecision, buildOperations };
