"use strict";

const { AsyncLocalStorage } = require("node:async_hooks");
const v10 = require("./route-v10.js");
const v9 = require("./route-v9.js");
const v8 = require("./route-v8.js");
const v7 = require("./route-v7.js");
const v6 = require("./route-v6.js");
const v5 = require("./route-v5.js");
const v4 = require("./route-v4.js");
const v3 = require("./route-v3.js");
const v2 = require("./route-v2.js");
const { decideClosedSet } = require("../mackinac-island/harness.js");

const V = v2._test;
const WRITER_MODEL = process.env.GATLINBURG_WRITER_MODEL || "claude-haiku-4-5-20251001";
const VOICE = "Gatlinburg Winter Desk Editor";
const PREPASS_PATCH = Symbol.for("gatlinburg.v12.prepass-patch");
const HARNESS_MATCH = "/api/harness";
const ANTHROPIC_MATCH = "api.anthropic.com/v1/messages";
const LIVE_ONLY_STATUS = new Set([
  "Great Smoky Mountains closures",
  "Gatlinburg SkyPark status",
  "Anakeesta status",
  "Ober Mountain status",
  "Ripley's Aquarium of the Smokies status"
]);
const FIVE_PERSONAS = new Set(["first", "family", "couple", "christmas", "snow"]);
const LIGHT_IDS = new Set(["winter-magic-walk", "parkway-lights", "riverwalk-lights", "moonshine-free-loop", "trolley-lights"]);
const SCENIC_IDS = new Set(["skypark", "anakeesta", "space-needle", "newfound-gap", "sugarlands"]);
const SNOW_IDS = new Set(["ober-mountain", "ober-snow-tubing"]);
const QUIETER_LIGHT_IDS = new Set(["riverwalk-lights", "trolley-lights", "moonshine-free-loop"]);
const OPS_LABELS = new Set(["How to move through this plan", "Trolley fit for your window", "Parking strategy", "Separate operating blocks"]);

function safe(value, max = 520) {
  return String(value == null ? "" : value).replace(/[<>\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function uniq(values) { return [...new Set((values || []).filter(Boolean))]; }
function candidate(id) { return V.candidateById(id); }
function todayISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function daysBetween(a, b) { return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000); }
function minutes(v) {
  const m = String(v || "").match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function installPrepassPatch() {
  if (globalThis[PREPASS_PATCH]) return globalThis[PREPASS_PATCH];
  const storage = new AsyncLocalStorage();
  const downstream = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async function gatlinburgPersonaFetch(input, init) {
    const url = typeof input === "string" ? input : String(input?.url || input || "");
    const state = storage.getStore();
    if (state?.skipHarness > 0 && url.includes(HARNESS_MATCH)) {
      state.skipHarness -= 1;
      state.bypassed.push("pre-persona-plan-jev");
      return new Response(JSON.stringify({ error: "pre-persona plan JEV intentionally bypassed" }), { status: 503, headers: { "content-type": "application/json" } });
    }
    if (state?.skipAnthropic > 0 && url.includes(ANTHROPIC_MATCH)) {
      state.skipAnthropic -= 1;
      state.bypassed.push("pre-persona-writer");
      return new Response(JSON.stringify({ error: "pre-persona writer intentionally bypassed" }), { status: 503, headers: { "content-type": "application/json" } });
    }
    return downstream(input, init);
  };
  globalThis[PREPASS_PATCH] = { storage, downstream };
  return globalThis[PREPASS_PATCH];
}

function prepassQuery(rawQuery = {}) {
  const naturalWinter = String(rawQuery.persona || "") === "snow" && String(rawQuery.goal || "") === "natural";
  if (!naturalWinter) return rawQuery;
  return { ...rawQuery, persona: "first", mustSnow: "0" };
}

async function buildPrepass(rawQuery) {
  const { storage } = installPrepassPatch();
  const state = { skipHarness: 1, skipAnthropic: 1, bypassed: [] };
  const query = prepassQuery(rawQuery);
  const data = await storage.run(state, () => v10.buildDecision(query));
  return { data, bypassed: state.bypassed.slice(), naturalWinterExpanded: query !== rawQuery };
}

function canonicalPersona(input = {}, rawQuery = {}) {
  const requested = String(rawQuery.persona || input.persona || "first");
  if (FIVE_PERSONAS.has(requested)) return requested;
  if (requested === "food-lights") return "couple";
  return "first";
}

function personaPolicy(data, rawQuery = {}) {
  const input = data?.input || {};
  const requested = String(rawQuery.persona || input.persona || "first");
  const persona = canonicalPersona(input, rawQuery);
  const legacyPriority = requested === "attractions" ? "attractions" : requested === "food-lights" ? "food-lights" : requested === "budget" ? "budget" : null;
  const priority = ["balanced", "attractions", "food-lights", "budget"].includes(String(rawQuery.priority || ""))
    ? String(rawQuery.priority)
    : legacyPriority || (input.budget === "low" ? "budget" : "balanced");
  const pace = ["easy", "balanced", "packed"].includes(String(rawQuery.pace || ""))
    ? String(rawQuery.pace)
    : (input.mobility === "low-walk" || input.mobility === "stroller" || input.crowds === "avoid" ? "easy" : "balanced");
  const origin = ["downtown", "arriving", "outside"].includes(String(rawQuery.origin || "")) ? String(rawQuery.origin) : "arriving";
  const dinner = String(rawQuery.dinner || "") === "1" || priority === "food-lights";
  const explicitGoal = String(rawQuery.goal || "");
  let goal;
  if (persona === "first") {
    goal = ["classic", "mountains", "compact"].includes(explicitGoal) ? explicitGoal : input.weatherPreference === "outdoor" ? "mountains" : input.mobility !== "normal" ? "compact" : "classic";
  } else if (persona === "family") {
    goal = ["easy", "weather-proof", "lights"].includes(explicitGoal) ? explicitGoal : input.weatherPreference === "indoor" ? "weather-proof" : input.mustLights ? "lights" : "easy";
  } else if (persona === "couple") {
    goal = ["scenic", "festive", "low-key"].includes(explicitGoal) ? explicitGoal : input.crowds === "avoid" ? "low-key" : input.mustLights ? "festive" : "scenic";
  } else if (persona === "christmas") {
    const hasFixedEvent = (data?.events || []).some(e => e.start === e.end);
    goal = ["lights", "event", "low-crowd"].includes(explicitGoal) ? explicitGoal : input.crowds === "avoid" ? "low-crowd" : (hasFixedEvent && input.crowds === "embrace" ? "event" : "lights");
  } else {
    goal = ["activity", "tubing", "natural"].includes(explicitGoal) ? explicitGoal : "activity";
  }
  return {
    persona,
    goal,
    pace,
    origin,
    priority,
    dinner,
    requestedPersona: requested,
    kids: input.kids || [],
    crowds: input.crowds || "normal",
    mobility: input.mobility || "normal",
    weatherPreference: input.weatherPreference || "balanced",
    budget: input.budget || "any"
  };
}

function optionFeatures(option, data) {
  const itinerary = option?.itinerary || [];
  const cs = itinerary.map(x => candidate(x.id)).filter(Boolean);
  const ids = new Set(cs.map(c => c.id));
  const categories = new Set(cs.map(c => c.category));
  const zones = cs.map(c => c.zone).filter(Boolean);
  const zoneChanges = zones.slice(1).reduce((n, zone, i) => n + (zone === zones[i] ? 0 : 1), 0);
  const avg = key => cs.length ? cs.reduce((sum, c) => sum + Number(c[key] || 0), 0) / cs.length : 0;
  const walkValues = cs.map(c => Number(c.walk)).filter(Number.isFinite);
  const walking = walkValues.length ? walkValues.reduce((a, b) => a + b, 0) / walkValues.length : 0.4;
  const paid = cs.filter(c => c.cost === "$$").length;
  const freeOrLow = cs.filter(c => c.cost === "free" || c.cost === "$").length;
  const hasLight = [...ids].some(id => LIGHT_IDS.has(id));
  const hasScenic = [...ids].some(id => SCENIC_IDS.has(id));
  const hasSnow = [...ids].some(id => SNOW_IDS.has(id));
  const hasTubing = ids.has("ober-snow-tubing");
  const hasEvent = categories.has("event");
  const hasFood = categories.has("food");
  const hasIndoor = categories.has("indoor");
  const hasShopping = categories.has("shopping");
  const hasNps = cs.some(c => String(c.zone || "").startsWith("nps-"));
  const daylightAnchor = hasScenic || hasSnow || hasNps || categories.has("mountain") || categories.has("view") || categories.has("park") || categories.has("scenic");
  const downtownStops = cs.filter(c => ["downtown-core", "downtown-north", "skypark", "anakeesta"].includes(c.zone)).length;
  const downtownShare = cs.length ? downtownStops / cs.length : 0;
  const first = cs[0] || null;
  const last = cs.at(-1) || null;
  const span = itinerary.length ? Math.max(0, (minutes(itinerary.at(-1)?.end) || 0) - (minutes(itinerary[0]?.start) || 0)) : 0;
  return {
    ids: [...ids],
    stopCount: cs.length,
    zoneChanges,
    travelMinutes: Number(option?.travelMinutes || 0),
    walking,
    paid,
    freeOrLow,
    hasLight,
    hasScenic,
    hasSnow,
    hasTubing,
    hasEvent,
    hasFood,
    hasIndoor,
    hasShopping,
    hasNps,
    daylightAnchor,
    downtownShare,
    firstId: first?.id || null,
    lastId: last?.id || null,
    spanMinutes: span,
    childFit: avg("childFit"),
    coupleFit: avg("coupleFit"),
    firstFit: avg("firstVisitFit"),
    christmasFit: avg("christmasFit"),
    snowFit: avg("snowFit"),
    verificationCount: itinerary.filter(x => x.verificationRequired).length,
    crowdLevel: data?.input ? data.headline?.crowdPressure || null : null
  };
}

function personaScore(option, data, policy) {
  const f = optionFeatures(option, data);
  let score = Number(option?.deterministicScore || 0);

  if (policy.pace === "easy") {
    score -= f.zoneChanges * 6;
    score -= f.travelMinutes * 0.12;
    score -= Math.max(0, f.walking - 0.45) * 28;
    score -= Math.max(0, f.stopCount - 3) * 5;
  } else if (policy.pace === "packed") {
    score += Math.min(10, f.stopCount * 2.5);
    score -= f.travelMinutes * 0.04;
  }
  if (policy.origin === "downtown") score += f.downtownShare * 8 - f.zoneChanges * 2;
  if (policy.origin === "outside" && f.daylightAnchor && f.hasLight) score += 5;
  if (policy.priority === "budget") score += f.freeOrLow * 6 - f.paid * 10;
  if (policy.priority === "attractions") score += f.paid * 6 + (f.hasScenic || f.hasIndoor ? 4 : 0);
  if (policy.priority === "food-lights") score += (f.hasFood ? 10 : -8) + (f.hasLight ? 10 : -8);
  if (policy.dinner) score += f.hasFood ? 10 : -10;

  if (policy.persona === "first") {
    score += (f.firstFit - 0.5) * 22;
    if (policy.goal === "classic") {
      score += f.daylightAnchor && f.hasLight ? 18 : -8;
      score += f.hasFood ? 4 : 0;
      score += f.stopCount === 3 ? 4 : 0;
    } else if (policy.goal === "mountains") {
      score += f.daylightAnchor ? 18 : -12;
      score += f.hasLight ? 7 : 0;
    } else {
      score += f.downtownShare >= 0.75 ? 16 : -8;
      score += f.hasLight ? 8 : 0;
      score -= f.zoneChanges * 4;
    }
  }

  if (policy.persona === "family") {
    const youngest = policy.kids.length ? Math.min(...policy.kids) : null;
    score += (f.childFit - 0.5) * 28;
    score -= f.zoneChanges * 7 + f.travelMinutes * 0.13;
    score -= Math.max(0, f.walking - 0.4) * 34;
    score -= Math.max(0, f.stopCount - 3) * 6;
    if (youngest != null && youngest <= 7) score += f.hasIndoor ? 7 : 0;
    if (policy.goal === "weather-proof") score += f.hasIndoor ? 18 : -12;
    if (policy.goal === "lights") score += f.hasLight ? 16 : -12;
    if (policy.goal === "easy") score += f.downtownShare >= 0.66 ? 10 : 0;
  }

  if (policy.persona === "couple") {
    score += (f.coupleFit - 0.5) * 26;
    if (policy.goal === "scenic") {
      score += f.hasScenic || f.daylightAnchor ? 16 : -10;
      score += f.hasFood ? 8 : 0;
      score += f.hasLight ? 6 : 0;
    } else if (policy.goal === "festive") {
      score += f.hasLight ? 16 : -10;
      score += f.hasFood ? 9 : 0;
      score += f.hasShopping ? 5 : 0;
    } else {
      score += (f.hasNps || f.hasScenic || f.hasShopping) ? 10 : 0;
      score += f.hasFood ? 8 : 0;
      score -= f.hasEvent ? 15 : 0;
      score -= Math.max(0, f.paid - 1) * 7;
    }
  }

  if (policy.persona === "christmas") {
    score += (f.christmasFit - 0.5) * 30;
    score += (f.hasLight || f.hasEvent) ? 18 : -20;
    if (policy.goal === "event") score += f.hasEvent ? 24 : -12;
    if (policy.goal === "lights") {
      score += f.hasLight ? 10 : -10;
      score += (f.hasShopping || f.freeOrLow) ? 5 : 0;
    }
    if (policy.goal === "low-crowd") {
      score -= f.hasEvent ? 22 : 0;
      score += f.ids.some(id => QUIETER_LIGHT_IDS.has(id)) ? 12 : 0;
      score -= Math.max(0, f.paid - 1) * 5;
    }
  }

  if (policy.persona === "snow") {
    score += (f.snowFit - 0.5) * 26;
    if (policy.goal === "natural") {
      score += (f.hasNps || f.hasScenic) ? 26 : -20;
      score -= f.hasSnow ? 8 : 0;
      score -= f.hasTubing ? 12 : 0;
      score += (f.firstId && !SNOW_IDS.has(f.firstId) && (f.hasNps || f.hasScenic)) ? 5 : 0;
    } else {
      score += f.hasSnow ? 22 : -24;
      if (policy.goal === "tubing") score += f.hasTubing ? 24 : -12;
      if (policy.goal === "activity") {
        const availableMinutes = Math.max(0, (minutes(data?.input?.end) || 0) - (minutes(data?.input?.start) || 0));
        if (availableMinutes <= 360) score += f.hasTubing ? 8 : 0;
        else score += f.ids.includes("ober-mountain") ? 8 : 0;
      }
      score += f.firstId && SNOW_IDS.has(f.firstId) ? 6 : 0;
    }
  }

  score -= f.verificationCount * 1.5;
  return Math.round(score * 10) / 10;
}

function preferredMatch(option, data, policy, universe) {
  const f = optionFeatures(option, data);
  if (policy.dinner && universe.some(o => optionFeatures(o, data).hasFood) && !f.hasFood) return false;
  if (policy.persona === "snow" && policy.goal !== "natural" && universe.some(o => optionFeatures(o, data).hasSnow) && !f.hasSnow) return false;
  if (policy.persona === "snow" && policy.goal === "natural" && universe.some(o => {
    const x = optionFeatures(o, data); return x.hasNps || x.hasScenic;
  }) && !(f.hasNps || f.hasScenic)) return false;
  if (policy.persona === "snow" && policy.goal === "tubing" && universe.some(o => optionFeatures(o, data).hasTubing) && !f.hasTubing) return false;
  if (policy.persona === "christmas" && policy.goal === "event" && universe.some(o => optionFeatures(o, data).hasEvent) && !f.hasEvent) return false;
  if (policy.persona === "first" && policy.goal === "classic" && universe.some(o => {
    const x = optionFeatures(o, data); return x.daylightAnchor && x.hasLight;
  }) && !(f.daylightAnchor && f.hasLight)) return false;
  if (policy.persona === "family" && policy.goal === "easy" && universe.some(o => {
    const x = optionFeatures(o, data); return x.stopCount <= 3 && x.zoneChanges <= 1;
  }) && !(f.stopCount <= 3 && f.zoneChanges <= 1)) return false;
  if (policy.persona === "couple" && policy.goal === "scenic" && universe.some(o => {
    const x = optionFeatures(o, data); return x.hasScenic && x.hasFood;
  }) && !(f.hasScenic && f.hasFood)) return false;
  return true;
}

function rankPersonaOptions(options, data, policy) {
  const preferred = options.filter(o => preferredMatch(o, data, policy, options));
  const pool = preferred.length ? preferred : options;
  return pool.map(option => ({ ...option, personaScore: personaScore(option, data, policy), personaFeatures: optionFeatures(option, data) }))
    .sort((a, b) => b.personaScore - a.personaScore || b.deterministicScore - a.deterministicScore || a.travelMinutes - b.travelMinutes);
}

function personaReason(policy, features) {
  if (policy.persona === "first") return policy.goal === "classic"
    ? "This plan gives a first-time visitor one daylight-dependent Gatlinburg/Smokies block and one after-dark seasonal block without treating the town like a checklist."
    : policy.goal === "mountains" ? "This plan protects the daylight/elevation part of a first visit, then uses downtown only where it adds something different." : "This plan keeps the first visit compact and minimizes unnecessary movement through the core.";
  if (policy.persona === "family") return `This plan is being judged on family energy first: ${features.stopCount} stops, ${features.zoneChanges} major zone change${features.zoneChanges === 1 ? "" : "s"}, and a ${features.walking <= 0.45 ? "lower" : "higher"}-walking mix.`;
  if (policy.persona === "couple") return policy.goal === "scenic" ? "This plan favors a scenic/daylight anchor, a meal buffer and an intentional after-dark finish instead of maximizing attraction count." : policy.goal === "festive" ? "This plan makes the evening atmosphere the point and keeps the transition into dinner/lights coherent." : "This plan avoids turning a lower-key couple trip into a crowded paid-attraction sprint.";
  if (policy.persona === "christmas") return policy.goal === "event" ? "This plan treats the fixed holiday event as the anchor and makes the rest of the day serve it." : policy.goal === "low-crowd" ? "This plan keeps Christmas atmosphere while penalizing the biggest event/crowd magnets." : "This plan makes the published Winter Magic window the reason for the evening instead of adding lights as an afterthought.";
  return policy.goal === "natural" ? "This plan treats natural snow as uncertain and keeps scenic access separate from Ober's snowmaking/operations decision." : "This plan requires an actual Ober snow-activity block when a feasible one exists; downtown snow is not used as proof that the mountain is operating.";
}

async function choosePersonaPlan(ranked, data, policy) {
  if (!ranked.length) return { option: null, jev: { mode: "deterministic", confidence: 0, reason: "No complete plans survive persona policy" } };
  if (ranked.length === 1) return { option: ranked[0], jev: { mode: "deterministic", confidence: 1, reason: "Only one persona-qualified complete plan remained" } };
  const shortlist = ranked.slice(0, 10);
  const options = Object.fromEntries(shortlist.map(o => [o.id, {
    label: o.label,
    itinerary: o.itinerary.map(x => ({ id: x.id, name: x.name, start: x.start, end: x.end, zone: x.zone })),
    personaScore: o.personaScore,
    deterministicScore: o.deterministicScore,
    travelMinutes: o.travelMinutes,
    features: o.personaFeatures,
    personaReason: personaReason(policy, o.personaFeatures)
  }]));
  const jev = await decideClosedSet({
    task: "Choose exactly one fully scheduled Gatlinburg winter plan for this visitor. Persona is a planning contract, not a writing style. Prefer the plan that best satisfies the supplied persona goal, pace, movement tolerance and explicit priorities. Do not add or remove stops and do not invent live conditions.",
    options,
    context: {
      personaPolicy: policy,
      visitor: data.input,
      health: data.decisionHealth,
      headline: { weather: data.headline?.weather, snow: data.headline?.snow, mountainVisibility: data.headline?.mountainVisibility, crowdPressure: data.headline?.crowdPressure, sunset: data.headline?.sunset }
    },
    constraints: [
      "Every option is already a complete hard-gated schedule.",
      "Family plans prioritize energy, walking and movement over attraction count.",
      "Snow plans must not treat downtown snowfall as proof of Ober operations.",
      "Christmas plans must make the seasonal component materially important.",
      "First-visit and couple plans should have a coherent day-to-evening shape rather than a random attraction stack."
    ],
    evidence: shortlist.map(o => ({ id: o.id, personaScore: o.personaScore, deterministicScore: o.deterministicScore, features: o.personaFeatures })),
    fallbackId: shortlist[0].id,
    minConfidence: 0.52
  });
  return { option: shortlist.find(o => o.id === jev.choiceId) || shortlist[0], jev };
}

function mapFor(itinerary = []) {
  return itinerary.map(x => {
    const c = candidate(x.id);
    return { id: x.id, name: x.name, lat: c?.lat, lon: c?.lon, zone: x.zone, start: x.start };
  });
}

function stripOperationalConditions(rows = []) { return rows.filter(row => !OPS_LABELS.has(row.label)); }

function deferFutureLiveHealth(data, today = todayISO()) {
  const selected = data?.input?.date;
  if (!selected) return data;
  const leadDays = daysBetween(today, selected);
  if (leadDays <= 0) return data;
  const current = [...(data.diagnostics?.degradedSources || [])];
  const moved = [];
  const kept = [];
  for (const name of current) {
    if (LIVE_ONLY_STATUS.has(name)) moved.push(name);
    else if (name === "NWS Gatlinburg forecast" && leadDays > 7) moved.push(name);
    else kept.push(name);
  }
  if (!moved.length) return data;
  const background = uniq([...(data.diagnostics?.backgroundDegradedSources || []), ...moved]);
  return {
    ...data,
    decisionHealth: kept.length ? {
      state: "check",
      label: kept.length === 1 ? "1 PLAN CHECK NEEDED" : `${kept.length} PLAN CHECKS NEEDED`,
      summary: `A source used by this itinerary needs a fresh check: ${kept.join(", ")}.`,
      criticalSources: kept
    } : {
      state: "ready",
      label: leadDays > 7 ? "PLAN READY · FORECAST LATER" : "PLAN READY",
      summary: "Current-day attraction and road status do not determine this future visit; those checks stay attached to the commit list.",
      criticalSources: []
    },
    diagnostics: { ...(data.diagnostics || {}), degradedSources: kept, backgroundDegradedSources: background, futureLiveStatusDeferred: moved }
  };
}

function rescopeHealth(data) {
  const all = uniq([...(data.diagnostics?.degradedSources || []), ...(data.diagnostics?.backgroundDegradedSources || [])]);
  const reset = { ...data, diagnostics: { ...(data.diagnostics || {}), degradedSources: all, backgroundDegradedSources: [] } };
  return deferFutureLiveHealth(v9._test.scopeDecisionHealth(reset));
}

function rebuildSelected(data, chosen, ranked, jev, policy) {
  if (!chosen) return { ...data, personaPolicy: policy, personaFit: { reason: "No complete persona-qualified plan survived the time and operating gates." } };
  const input = { ...data.input, persona: policy.persona, personaGoal: policy.goal, personaPace: policy.pace, tripOrigin: policy.origin, tripPriority: policy.priority, dinnerAnchor: policy.dinner };
  const chosenFeatures = chosen.personaFeatures || optionFeatures(chosen, data);
  const decision = {
    ...data.decision,
    bundleId: chosen.id,
    label: chosen.label,
    summary: "Building the persona-specific desk read…",
    why: personaReason(policy, chosenFeatures),
    decisiveConstraint: `${policy.persona} · ${policy.goal} · ${policy.pace}`,
    jev: { mode: jev?.mode || "deterministic", confidence: jev?.confidence || 0, model: jev?.model || null, stage: "five-persona-complete-plan-selection" }
  };
  let stage = {
    ...data,
    input,
    decision,
    itinerary: chosen.itinerary,
    map: mapFor(chosen.itinerary),
    alternatives: ranked.filter(o => o.id !== chosen.id).slice(0, 3).map(o => ({
      id: o.id,
      label: o.label,
      why: personaReason(policy, o.personaFeatures),
      window: o.itinerary.length ? `${o.itinerary[0].start}–${o.itinerary.at(-1).end}` : null,
      items: o.itinerary.map(x => x.name),
      personaScore: o.personaScore
    })),
    personaPolicy: policy,
    personaFit: { score: chosen.personaScore, reason: personaReason(policy, chosenFeatures), features: chosenFeatures }
  };
  stage = { ...stage, headline: v3._test.finalHeadline(stage, chosen) };
  const operations = v4._test.deriveOperations(stage);
  stage = { ...stage, visitOperations: operations, conditions: v4._test.appendOperationalConditions(stripOperationalConditions(stage.conditions || []), operations) };
  stage = { ...stage, decisionClock: v5._test.deriveDecisionClock(stage) };
  stage = { ...stage, dateIntelligence: v6._test.buildDateIntelligence(stage) };
  const enriched = v7._test.enrichItinerary(stage);
  const visitSnapshot = v7._test.buildVisitSnapshot(stage, enriched);
  const commitChecklist = v7._test.buildCommitChecklist(stage, enriched);
  stage = { ...stage, itinerary: enriched, visitSnapshot, commitChecklist, map: mapFor(enriched) };
  const planBrief = v8._test.buildPlanBrief(stage);
  const stopFacts = v8._test.buildStopFacts(stage);
  stage = {
    ...stage,
    planBrief,
    stopFacts,
    lookNow: v8._test.buildLookNow(stage),
    commitChecks: v8._test.buildCommitChecks(stage),
    seasonFacts: stage.seasonFacts || v8._test.buildSeasonFacts(),
    monthGuide: stage.monthGuide || v8._test.buildMonthGuide()
  };
  return rescopeHealth(stage);
}

function personaLens(policy) {
  const id = policy.persona === "first" ? "orientation" : policy.persona;
  const brief = {
    orientation: `First visit (${policy.goal}): make the visitor understand the shape of Gatlinburg, not just the attractions. Protect geography, daylight and a distinct after-dark block.`,
    family: `Family (${policy.goal}): protect energy, walking, weather resilience and low backtracking before adding another stop.`,
    couple: `Couple (${policy.goal}): build a clean scenic/daylight-to-dinner-to-evening rhythm instead of attraction count.`,
    christmas: `Christmas (${policy.goal}): make Winter Magic or the fixed holiday event the reason for the evening, with crowd preference changing the answer.`,
    snow: `Snow (${policy.goal}): separate Ober operations, natural snow, downtown forecast and NPS roads. Never collapse them into one snow signal.`
  }[id];
  return { id, brief };
}

async function finalPersonaWrite(data, lens) {
  const fallback = v9._test.fallbackCopy(data, lens);
  const ids = (data.stopFacts || []).map(x => x.id);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { mode: "deterministic", copy: fallback, reason: "ANTHROPIC_API_KEY unavailable" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2600);
  try {
    const sealed = { ...v9._test.facts(data, lens), personaContract: data.personaFit, personaPolicy: data.personaPolicy };
    const system = `You are the ${VOICE}. Write like an experienced Gatlinburg/Smokies trip editor briefing a smart traveler, not like a tourism bureau. The persona is a planning contract: explain why this sequence is useful for that person, including the friction the plan avoids. Use only supplied facts. Never invent traffic, waits, parking availability, weather, snow, road conditions, prices, hours, restaurants, ticket availability or firsthand anecdotes. Never change the selected itinerary. For snow, keep downtown forecast, natural snow, Ober operations and NPS road status separate. Do not mention prompts, models, JEV, sealed facts or internal process.`;
    const prompt = `FACTS:\n${JSON.stringify(sealed)}\nReturn JSON only with exactly this shape and every stop id once: {"topRead":"max 60 words","planRead":"max 95 words","operationsRead":"max 75 words","dateRead":"max 60 words","commitRead":"max 40 words","stopReads":{"STOP_ID":"max 48 words"}}. Make the persona-specific tradeoff obvious. No filler.`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: WRITER_MODEL, max_tokens: 760, temperature: 0.22, system, messages: [{ role: "user", content: prompt }] })
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const parsed = v9._test.parseJson((payload?.content || []).find(x => x.type === "text")?.text);
    if (!parsed) throw new Error("writer returned invalid JSON");
    return { mode: "anthropic-haiku", model: WRITER_MODEL, copy: v9._test.cleanCopy(parsed, fallback, ids) };
  } catch (error) {
    return { mode: "deterministic", copy: fallback, reason: safe(error?.message || error, 180) };
  } finally {
    clearTimeout(timer);
  }
}

async function buildDecision(rawQuery = {}) {
  const prepass = await buildPrepass(rawQuery);
  const policy = personaPolicy(prepass.data, rawQuery);
  const options = v3._test.buildPlanOptions(prepass.data);
  const ranked = rankPersonaOptions(options, prepass.data, policy);
  const { option: chosen, jev } = await choosePersonaPlan(ranked, prepass.data, policy);
  let data = rebuildSelected(prepass.data, chosen, ranked, jev, policy);
  const lens = personaLens(policy);
  const writer = await finalPersonaWrite(data, lens);
  const applied = v9._test.applyCopy(data, writer);
  data = {
    ...data,
    ...applied,
    benchmarkVersion: "5.1",
    personaEngineVersion: "1.1",
    decision: { ...applied.decision, writer: { mode: writer.mode, model: writer.model || null, voice: VOICE, lens: lens.id } },
    editorial: {
      voice: VOICE,
      lens,
      selection: { mode: jev?.mode || "deterministic", confidence: jev?.confidence || 0, model: jev?.model || null },
      writer: { mode: writer.mode, model: writer.model || null, reason: writer.reason || null },
      ...writer.copy
    },
    diagnostics: {
      ...(data.diagnostics || {}),
      architecture: "hard gates -> persona policy -> complete-plan JEV -> deterministic enrichment -> one final Haiku desk writer",
      fivePersonaEngine: true,
      persona: policy.persona,
      personaGoal: policy.goal,
      personaQualifiedOptions: ranked.length,
      prePersonaAiBypassed: prepass.bypassed,
      naturalWinterPrepassExpanded: prepass.naturalWinterExpanded,
      editorialWriterMode: writer.mode
    }
  };
  return data;
}

async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex");
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    return res.status(200).json(await buildDecision(req.query || {}));
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Gatlinburg winter planner failed", detail: safe(error?.message || error, 220), generatedAt: new Date().toISOString() });
  }
}

module.exports = handler;
module.exports.buildDecision = buildDecision;
module.exports._test = { prepassQuery, canonicalPersona, personaPolicy, optionFeatures, personaScore, preferredMatch, rankPersonaOptions, personaReason, personaLens, deferFutureLiveHealth };