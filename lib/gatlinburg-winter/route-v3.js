"use strict";

const base = require("./route.js");
const v2 = require("./route-v2.js");
const { decideClosedSet } = require("../mackinac-island/harness.js");

const T = base._test;
const V = v2._test;
const WRITER_MODEL = process.env.GATLINBURG_WRITER_MODEL || "claude-haiku-4-5-20251001";
const MAX_PLAN_OPTIONS = 16;
const CURRENT_STATUS_IDS = new Set([
  "skypark",
  "anakeesta",
  "ober-mountain",
  "ober-snow-tubing",
  "ripley-aquarium",
  "indoor-ripleys"
]);

const EXTRA_SOURCES = Object.freeze({
  transitland: "https://www.transit.land/operators/o-gatlinburg~tn~us",
  trolleyOfficial: "https://www.gatlinburg.com/things-to-do/trolley/",
  npsDatasets: "https://www.nps.gov/grsm/learn/nature/datasets.htm",
  npsConditions: "https://www.nps.gov/grsm/planyourvisit/conditions.htm",
  npsWebcams: "https://www.nps.gov/grsm/learn/photosmultimedia/webcams.htm",
  airdna: "https://www.airdna.co/vacation-rental-data/app/us/tennessee/gatlinburg/overview",
  ober: "https://obermountain.com/"
});

const SUPPORTING_CONTEXT = Object.freeze({
  transit: Object.freeze({
    state: "published",
    fetchedAt: null,
    sourceUrl: EXTRA_SOURCES.transitland,
    officialUrl: EXTRA_SOURCES.trolleyOfficial,
    operator: "City of Gatlinburg Trolley",
    onestopId: "o-gatlinburg~tn~us",
    staticGtfs: true,
    realtimeGtfs: true,
    note: "Transitland registers static GTFS and GTFS-Realtime for the City of Gatlinburg Trolley. Official Gatlinburg information governs actual routes, hours and service."
  }),
  nps: Object.freeze({
    state: "published",
    fetchedAt: null,
    sourceUrl: EXTRA_SOURCES.npsDatasets,
    conditionsUrl: EXTRA_SOURCES.npsConditions,
    webcamsUrl: EXTRA_SOURCES.npsWebcams,
    openGis: true,
    hourlyMonitoring: true,
    webcams15m: true,
    highElevationWarning: true,
    note: "NPS publishes park-specific open data plus approximately 15-minute webcam imagery and hourly environmental observations; high-elevation conditions can differ from downtown Gatlinburg."
  }),
  market: Object.freeze({
    state: "published",
    fetchedAt: null,
    sourceUrl: EXTRA_SOURCES.airdna,
    activeListings: 7317,
    trailingOccupancyPct: 57,
    publishedUpdated: "September 22, 2026",
    usedForLiveCrowding: false,
    note: "AirDNA public market snapshot: 7,317 active short-term rentals and 57% average occupancy, updated September 22, 2026. This is market context only, never a live crowd signal."
  })
});

function safe(v, max = 700) {
  return String(v == null ? "" : v)
    .replace(/[<>\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
function fmt(v) { return T.formatTime(v); }
function candidate(id) { return V.candidateById(id); }
function mins(v) {
  const m = String(v || "").match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function dateInRange(date, start, end) { return Boolean(date && date >= start && date <= end); }
function destinationToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: T.DESTINATION.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

// Legacy pool is retained only as a conservative proof of same-day attraction status.
// It is never used as the planning universe or as JEV's choice set.
function legacyCandidatePool(baseDecision) {
  const ids = [];
  for (const row of baseDecision.itinerary || []) ids.push(row.id);
  for (const alt of baseDecision.alternatives || []) {
    for (const name of alt.items || []) {
      const c = V.candidateByName(name);
      if (c) ids.push(c.id);
    }
  }
  return [...new Set(ids)].filter(id => candidate(id));
}

function staticHardGate(cand, input, baseDecision) {
  const reasons = [];
  if (cand.season && !dateInRange(input.date, cand.season[0], cand.season[1])) {
    return { valid: false, reasons: ["outside seasonal window"] };
  }
  if (cand.exactDate && cand.exactDate !== input.date) {
    return { valid: false, reasons: ["date-specific event not happening"] };
  }
  if (cand.exactStart && mins(input.end) < mins(cand.exactStart) + 30) {
    return { valid: false, reasons: ["visit ends before event is usable"] };
  }

  const start = mins(input.start);
  const end = mins(input.end);
  const sun = T.sunriseSunsetApprox(input.date);
  const sunset = mins(sun?.sunset);
  if (start == null || end == null || end <= start) return { valid: false, reasons: ["invalid time window"] };
  if (end - start < Math.min(cand.durationMinutes, 90)) return { valid: false, reasons: ["not enough usable time"] };
  if (cand.bestTime === "day" && sunset !== null && start > sunset + 15) {
    return { valid: false, reasons: ["arrival is after the useful daylight window"] };
  }
  if (cand.bestTime === "before-sunset" && sunset !== null && start > sunset - 20) {
    return { valid: false, reasons: ["arrival is too late for the intended pre-sunset experience"] };
  }

  const nps = (baseDecision.conditions || []).find(row => row.label === "Smokies access");
  if (cand.id === "newfound-gap" && /closure.*Newfound Gap|affects Newfound Gap Road/i.test(String(nps?.value || ""))) {
    return { valid: false, reasons: ["official NPS closure affects Newfound Gap Road"] };
  }

  const severeHazard = /CONDITIONS NEED A CLOSER CHECK/i.test(String(baseDecision.headline?.state || ""));
  if (severeHazard && cand.weatherSensitivity === "very-high") {
    return { valid: false, reasons: ["severe weather context excludes very-high-sensitivity option"] };
  }

  if (input.date === destinationToday() && CURRENT_STATUS_IDS.has(cand.id)) {
    const proven = new Set(legacyCandidatePool(baseDecision));
    if (!proven.has(cand.id)) {
      return { valid: false, reasons: ["same-day operating state was not independently proven open"] };
    }
  }

  if (cand.reservation && input.date > destinationToday()) reasons.push("future-date hours require official verification");
  return { valid: true, reasons };
}

function candidatePriority(cand, input, gate) {
  const ctx = {
    weather: { state: "unavailable" },
    weatherFacts: {},
    crowd: T.crowdPressure(input),
    sun: T.sunriseSunsetApprox(input.date)
  };
  let score = T.scoreCandidate(cand, input, ctx);
  if (gate.reasons.includes("future-date hours require official verification")) score -= 12;
  if (cand.category === "event") score += 4;
  return Math.round(score * 10) / 10;
}

function independentCandidatePool(baseDecision) {
  const input = baseDecision.input;
  return T.CANDIDATES
    .map(cand => {
      const gate = staticHardGate(cand, input, baseDecision);
      return {
        id: cand.id,
        candidate: cand,
        valid: gate.valid,
        gateReasons: gate.reasons,
        score: gate.valid ? candidatePriority(cand, input, gate) : null
      };
    })
    .filter(row => row.valid)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function chooseCombinations(items, min = 2, max = 4) {
  const out = [];
  function walk(start, picked) {
    if (picked.length >= min) out.push(picked.slice());
    if (picked.length === max) return;
    for (let i = start; i < items.length; i++) {
      picked.push(items[i]);
      walk(i + 1, picked);
      picked.pop();
    }
  }
  walk(0, []);
  return out;
}

function isUsefulCombination(ids, input) {
  const cs = ids.map(candidate).filter(Boolean);
  if (cs.length !== ids.length) return false;
  if (new Set(cs.map(c => c.id)).size !== cs.length) return false;

  const groups = {
    light: cs.filter(c => ["winter-magic-walk", "parkway-lights", "riverwalk-lights", "moonshine-free-loop", "trolley-lights"].includes(c.id)).length,
    ripley: cs.filter(c => ["ripley-aquarium", "indoor-ripleys"].includes(c.id)).length,
    food: cs.filter(c => c.category === "food").length,
    paidMountain: cs.filter(c => ["skypark", "anakeesta", "space-needle"].includes(c.id)).length,
    ober: cs.filter(c => ["ober-mountain", "ober-snow-tubing"].includes(c.id)).length
  };
  if (groups.light > 1 || groups.ripley > 1 || groups.food > 1 || groups.paidMountain > 1 || groups.ober > 1) return false;
  if (input.mustLights && !cs.some(c => c.category === "lights" || c.category === "event")) return false;
  if (input.mustSnow && !cs.some(c => c.category === "snow")) return false;
  return true;
}

function optionLabel(itinerary) {
  const cs = itinerary.map(x => candidate(x.id)).filter(Boolean);
  const has = cat => cs.some(c => c.category === cat);
  if (has("event")) return "Event-anchored plan";
  if (has("snow")) return "Snow-first winter plan";
  if (cs.some(c => c.zone?.startsWith("nps-")) && has("lights")) return "Smokies daylight + downtown lights";
  if (cs.some(c => c.category === "mountain") && has("lights")) return "Mountain daylight + Winter Magic";
  if (has("indoor") && has("lights")) return "Indoor anchor + lights";
  if (cs.every(c => ["free", "$"].includes(c.cost))) return "Lower-cost winter plan";
  return itinerary.slice(0, 2).map(x => x.name).join(" + ");
}

function optionWhy(itinerary, travelMinutes) {
  const first = itinerary[0];
  const last = itinerary.at(-1);
  return `Fits ${fmt(first.start)}–${fmt(last.end)} without dropping a selected stop; planned cross-zone movement is about ${travelMinutes} minutes.`;
}

function optionScore(itinerary, poolById, travelMinutes) {
  const scores = itinerary.map(row => poolById.get(row.id)?.score ?? 45);
  const avg = scores.reduce((sum, n) => sum + n, 0) / Math.max(1, scores.length);
  const verificationPenalty = itinerary.filter(row => row.verificationRequired).length * 8;
  const travelPenalty = Math.min(14, travelMinutes * 0.18);
  const completionBonus = Math.min(5, itinerary.length * 1.25);
  return Math.round((avg - verificationPenalty - travelPenalty + completionBonus) * 10) / 10;
}

function addOption(target, seen, id, itinerary, input, poolById, why = null, decisiveConstraint = "time + fit") {
  if (!Array.isArray(itinerary) || itinerary.length < 2) return;
  const signature = itinerary.map(x => x.id).join("|");
  if (!signature || seen.has(signature)) return;
  const cs = itinerary.map(x => candidate(x.id)).filter(Boolean);
  if (!isUsefulCombination(cs.map(c => c.id), input)) return;
  seen.add(signature);
  const travelMinutes = itinerary.slice(1).reduce((sum, row, i) => sum + T.travelMinutes(itinerary[i].zone, row.zone), 0);
  target.push({
    id,
    label: optionLabel(itinerary),
    why: why || optionWhy(itinerary, travelMinutes),
    decisiveConstraint,
    itinerary,
    travelMinutes,
    stopCount: itinerary.length,
    deterministicScore: optionScore(itinerary, poolById, travelMinutes)
  });
}

function buildPlanOptions(baseDecision) {
  const input = baseDecision.input;
  const pool = independentCandidatePool(baseDecision);
  const poolById = new Map(pool.map(row => [row.id, row]));
  const raw = [];
  const seen = new Set();
  const ids = pool.map(row => row.id);

  for (const combination of chooseCombinations(ids, 2, Math.min(4, ids.length))) {
    if (!isUsefulCombination(combination, input)) continue;
    const scheduled = V.scheduleIds(combination, input);
    if (scheduled.dropped.length || scheduled.itinerary.length !== combination.length) continue;
    addOption(raw, seen, `plan-${raw.length + 1}`, scheduled.itinerary, input, poolById);
  }

  return raw
    .sort((a, b) => b.deterministicScore - a.deterministicScore || a.travelMinutes - b.travelMinutes || a.id.localeCompare(b.id))
    .slice(0, MAX_PLAN_OPTIONS);
}

function evidenceFor(option) {
  return {
    label: option.label,
    stops: option.itinerary.map(x => {
      const c = candidate(x.id);
      return {
        id: x.id,
        name: x.name,
        start: x.start,
        end: x.end,
        zone: x.zone,
        category: c?.category || null,
        cost: c?.cost || null,
        reservation: Boolean(c?.reservation),
        verificationRequired: Boolean(x.verificationRequired)
      };
    }),
    travelMinutes: option.travelMinutes,
    deterministicScore: option.deterministicScore,
    why: option.why,
    decisiveConstraint: option.decisiveConstraint
  };
}

function neutralHeadline(baseDecision) {
  const h = baseDecision.headline || {};
  return {
    dateLabel: h.dateLabel || null,
    weather: h.weather || null,
    snow: h.snow || null,
    mountainVisibility: h.mountainVisibility || null,
    crowdPressure: h.crowdPressure || null,
    sunset: h.sunset || null
  };
}

async function choosePlan(options, baseDecision) {
  if (!options.length) return { option: null, jev: { mode: "deterministic", confidence: 0, reason: "No fully schedulable plans" } };
  if (options.length === 1) return { option: options[0], jev: { mode: "deterministic", confidence: 1, reason: "Only one fully schedulable plan remained" } };

  const optionMap = Object.fromEntries(options.map(o => [o.id, evidenceFor(o)]));
  const jev = await decideClosedSet({
    task: "Choose the strongest complete Gatlinburg winter itinerary for this visitor. You are choosing among plans, not attractions. Every supplied option is already hard-gated and fully schedulable. Choose exactly one supplied plan. Favor persona fit, seasonal distinctiveness, daylight/weather timing, low friction, geographic coherence and the visitor's explicit priorities.",
    options: optionMap,
    context: {
      input: baseDecision.input,
      headline: neutralHeadline(baseDecision),
      conditions: baseDecision.conditions,
      events: (baseDecision.events || []).map(e => ({ name: e.name, time: e.time }))
    },
    constraints: [
      "Choose only a supplied complete itinerary.",
      "Do not add, remove or reorder stops.",
      "Official closures and operating status outrank preference.",
      "Downtown snow forecast is not a proxy for Ober Mountain snowmaking or snow-base conditions.",
      "Do not treat market-level lodging occupancy as live crowding.",
      "Do not make road-safety, trail-safety or ticket-availability guarantees."
    ],
    evidence: options.map(evidenceFor),
    fallbackId: options[0].id,
    minConfidence: 0.55
  });
  return { option: options.find(o => o.id === jev.choiceId) || options[0], jev };
}

function deterministicNarrative(plan, baseDecision) {
  if (!plan?.itinerary?.length) return "No complete plan fits this window yet.";
  const items = plan.itinerary;
  let text = `Start with ${items[0].name} at ${fmt(items[0].start)}.`;
  if (items.length > 1) text += ` Then ${items.slice(1).map(x => `${x.name} around ${fmt(x.start)}`).join(", then ")}.`;
  if (items.some(x => /Magic|lights|Parkway/i.test(x.name)) && baseDecision.headline?.sunset) {
    text += " The light-focused stop stays after sunset instead of consuming the better daylight window.";
  }
  return text;
}

async function writePlan(plan, baseDecision) {
  const fallback = deterministicNarrative(plan, baseDecision);
  if (!process.env.ANTHROPIC_API_KEY || !plan) return { mode: "deterministic", text: fallback };
  const facts = {
    persona: baseDecision.input.persona,
    date: baseDecision.input.date,
    available: [baseDecision.input.start, baseDecision.input.end],
    selected: plan.itinerary.map(x => ({ name: x.name, start: x.start, end: x.end })),
    travelMinutes: plan.travelMinutes,
    headline: neutralHeadline(baseDecision),
    conditions: baseDecision.conditions,
    reason: plan.why
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3600);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: WRITER_MODEL,
        max_tokens: 220,
        temperature: 0.2,
        system: "Write concise destination decision copy from sealed facts only. Use 2-3 short sentences. Explain sequence and tradeoff. Do not add attractions, hours, prices, closures, weather, traffic, tickets or safety claims. Do not change the selected itinerary. No promotional travel prose.",
        messages: [{ role: "user", content: `Sealed facts:\n${JSON.stringify(facts)}\nWrite the plan explanation.` }]
      })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const text = safe((data?.content || []).find(x => x.type === "text")?.text);
    if (!text) throw new Error("empty writer output");
    return { mode: "anthropic-haiku", model: WRITER_MODEL, text };
  } catch (error) {
    return { mode: "deterministic", text: fallback, reason: safe(error?.message || error, 180) };
  } finally {
    clearTimeout(timer);
  }
}

function separatedConditions(baseDecision) {
  const rows = (baseDecision.conditions || []).map(row => row.label === "Snow" ? { ...row, label: "Downtown snow forecast" } : row);
  rows.push({
    label: "Ober / mountain snow",
    value: "Treat Ober snowmaking, tubing and snow-base status separately from the downtown forecast; verify current mountain operations directly with Ober before committing.",
    state: "published",
    sourceUrl: EXTRA_SOURCES.ober
  });
  return rows;
}

function sourceContext() {
  return {
    transit: {
      operator: SUPPORTING_CONTEXT.transit.operator,
      onestopId: SUPPORTING_CONTEXT.transit.onestopId,
      staticGtfs: true,
      realtimeGtfs: true,
      sourceUrl: EXTRA_SOURCES.transitland,
      officialUrl: EXTRA_SOURCES.trolleyOfficial,
      note: SUPPORTING_CONTEXT.transit.note
    },
    parkMonitoring: {
      state: SUPPORTING_CONTEXT.nps.state,
      openGis: true,
      hourlyMonitoring: true,
      webcams15m: true,
      sourceUrl: EXTRA_SOURCES.npsDatasets,
      conditionsUrl: EXTRA_SOURCES.npsConditions,
      webcamsUrl: EXTRA_SOURCES.npsWebcams,
      note: SUPPORTING_CONTEXT.nps.note
    },
    marketContext: {
      activeShortTermRentals: SUPPORTING_CONTEXT.market.activeListings,
      trailingOccupancyPct: SUPPORTING_CONTEXT.market.trailingOccupancyPct,
      sourceUpdated: SUPPORTING_CONTEXT.market.publishedUpdated,
      usedForLiveCrowding: false,
      note: SUPPORTING_CONTEXT.market.note
    }
  };
}

function finalHeadline(baseDecision, chosen) {
  const h = { ...baseDecision.headline, snowLabel: "Downtown snow forecast" };
  if (!chosen?.itinerary?.length) return h;
  const first = chosen.itinerary[0];
  const last = chosen.itinerary.at(-1);
  h.bestWindow = `${fmt(first.start)}–${fmt(last.end)}`;
  h.bestMove = `${first.name} first. ${first.verificationRequired ? "Confirm official hours before you commit. " : ""}The rest of the sequence has already been checked against the selected time window.`;
  return h;
}

async function buildDecision(rawQuery = {}) {
  const baseDecision = await base.buildDecision(rawQuery);
  const pool = independentCandidatePool(baseDecision);
  const options = buildPlanOptions(baseDecision);
  const { option: chosen, jev } = await choosePlan(options, baseDecision);
  const writer = await writePlan(chosen, baseDecision);
  const finalItinerary = chosen?.itinerary || [];
  const extras = SUPPORTING_CONTEXT;
  const sources = V.enhancedSources(baseDecision, extras);
  const influenceDecision = { ...baseDecision, conditions: separatedConditions(baseDecision) };
  const influences = V.deriveInfluences(influenceDecision, chosen, extras);
  const assumptions = V.assumptions(rawQuery, baseDecision);
  const context = sourceContext();

  const alternatives = options
    .filter(o => o.id !== chosen?.id)
    .slice(0, 3)
    .map(o => ({
      id: o.id,
      label: o.label,
      why: o.why,
      window: `${fmt(o.itinerary[0].start)}–${fmt(o.itinerary.at(-1).end)}`,
      items: o.itinerary.map(x => x.name)
    }));

  const map = finalItinerary.map(x => {
    const c = candidate(x.id);
    return { id: x.id, name: x.name, lat: c?.lat, lon: c?.lon, zone: x.zone, start: x.start };
  });

  return {
    ...baseDecision,
    version: "3.1",
    assumptions,
    headline: finalHeadline(baseDecision, chosen),
    decision: {
      bundleId: chosen?.id || null,
      label: chosen?.label || "No feasible plan",
      summary: writer.text,
      why: chosen?.why || "No complete grounded plan fit the selected window.",
      decisiveConstraint: chosen?.decisiveConstraint || null,
      jev: {
        mode: jev?.mode || "deterministic",
        confidence: jev?.confidence || 0,
        model: jev?.model || null,
        stage: "fully-scheduled-independent-options"
      },
      writer: { mode: writer.mode, model: writer.model || null }
    },
    itinerary: finalItinerary,
    alternatives,
    conditions: separatedConditions(baseDecision),
    map,
    whatChangedTheAnswer: influences,
    transit: context.transit,
    parkMonitoring: context.parkMonitoring,
    marketContext: context.marketContext,
    sourcePolicy: [
      "official structured/live",
      "official webpage",
      "recently cached official value",
      "unknown rather than assumed"
    ],
    sources,
    diagnostics: {
      ...(baseDecision.diagnostics || {}),
      legacyCandidatePool: legacyCandidatePool(baseDecision).length,
      independentCandidatePool: pool.length,
      completePlanOptions: options.length,
      planOptionTarget: "8–16 when the independently hard-gated candidate pool supports it",
      preselectionDependency: false,
      fullyScheduledChoice: Boolean(chosen),
      jevFallback: jev?.mode !== "shared-harness-jev",
      writerFallback: writer.mode !== "anthropic-haiku",
      degradedSources: sources.filter(s => ["stale", "degraded", "unavailable"].includes(s.state)).map(s => s.name)
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
      detail: safe(error?.message || error, 220),
      generatedAt: new Date().toISOString()
    });
  }
}

module.exports = handler;
module.exports.buildDecision = buildDecision;
module.exports._test = {
  legacyCandidatePool,
  staticHardGate,
  independentCandidatePool,
  chooseCombinations,
  isUsefulCombination,
  buildPlanOptions,
  separatedConditions,
  neutralHeadline,
  finalHeadline,
  optionLabel
};
