"use strict";

const base = require("./route.js");
const v2 = require("./route-v2.js");
const { decideClosedSet } = require("../mackinac-island/harness.js");

const T = base._test;
const V = v2._test;
const WRITER_MODEL = process.env.GATLINBURG_WRITER_MODEL || "claude-haiku-4-5-20251001";
const MAX_PLAN_OPTIONS = 16;

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

function safeCandidatePool(baseDecision) {
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

function addOption(target, seen, id, itinerary, input, why = null, decisiveConstraint = "time + fit") {
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
    stopCount: itinerary.length
  });
}

function buildPlanOptions(baseDecision) {
  const input = baseDecision.input;
  const options = [];
  const seen = new Set();

  if (baseDecision.itinerary?.length >= 2) {
    addOption(
      options,
      seen,
      `realized-${baseDecision.decision?.bundleId || "selected"}`,
      baseDecision.itinerary,
      input,
      baseDecision.decision?.why || null,
      baseDecision.decision?.decisiveConstraint || "overall fit"
    );
  }

  const pool = safeCandidatePool(baseDecision);
  for (const ids of chooseCombinations(pool, 2, Math.min(4, pool.length))) {
    if (!isUsefulCombination(ids, input)) continue;
    const scheduled = V.scheduleIds(ids, input);
    if (scheduled.dropped.length || scheduled.itinerary.length !== ids.length) continue;
    addOption(options, seen, `plan-${options.length + 1}`, scheduled.itinerary, input);
    if (options.length >= MAX_PLAN_OPTIONS) break;
  }

  return options.slice(0, MAX_PLAN_OPTIONS);
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
    why: option.why,
    decisiveConstraint: option.decisiveConstraint
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
      headline: baseDecision.headline,
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
    headline: baseDecision.headline,
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

async function buildDecision(rawQuery = {}) {
  const baseDecision = await base.buildDecision(rawQuery);
  const options = buildPlanOptions(baseDecision);
  const { option: chosen, jev } = await choosePlan(options, baseDecision);
  const writer = await writePlan(chosen, baseDecision);
  const finalItinerary = chosen?.itinerary || baseDecision.itinerary || [];
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
    version: "3.0",
    assumptions,
    headline: { ...baseDecision.headline, snowLabel: "Downtown snow forecast" },
    decision: {
      bundleId: chosen?.id || baseDecision.decision?.bundleId || null,
      label: chosen?.label || baseDecision.decision?.label || "No feasible plan",
      summary: writer.text,
      why: chosen?.why || baseDecision.decision?.why || "No complete grounded plan fit the selected window.",
      decisiveConstraint: chosen?.decisiveConstraint || baseDecision.decision?.decisiveConstraint || null,
      jev: {
        mode: jev?.mode || "deterministic",
        confidence: jev?.confidence || 0,
        model: jev?.model || null,
        stage: "complete-itinerary-options"
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
      safeCandidatePool: safeCandidatePool(baseDecision).length,
      completePlanOptions: options.length,
      planOptionTarget: "8–16 when the hard-gated candidate pool supports it",
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
  safeCandidatePool,
  chooseCombinations,
  isUsefulCombination,
  buildPlanOptions,
  separatedConditions,
  optionLabel
};
