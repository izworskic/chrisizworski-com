"use strict";

const { AsyncLocalStorage } = require("node:async_hooks");
const v8 = require("./route-v8.js");
const v9 = require("./route-v9.js");

const WEATHER_SOURCE = "NWS Gatlinburg forecast";
const NPS_SOURCE = "Great Smoky Mountains closures";
const WRITER_MODEL = process.env.GATLINBURG_WRITER_MODEL || "claude-haiku-4-5-20251001";
const VOICE = "Gatlinburg Winter Desk Editor";
const HARNESS_MATCH = "/api/harness";
const ANTHROPIC_MATCH = "api.anthropic.com/v1/messages";
const FETCH_PATCH = Symbol.for("gatlinburg.v10.fetch-patch");
const LIVE_ONLY_STATUS = new Set([
  NPS_SOURCE,
  "Gatlinburg SkyPark status",
  "Anakeesta status",
  "Ober Mountain status",
  "Ripley's Aquarium of the Smokies status"
]);
const LENS_BRIEFS = Object.freeze({
  orientation: "First visit: explain the shape of the day, the geography and when moving the car costs more than it helps.",
  family: "Family trip: protect energy, reduce backtracking and keep weather exposure and walking realistic.",
  couple: "Couple trip: favor a clean day-to-evening rhythm instead of attraction count.",
  christmas: "Christmas trip: protect daylight for daylight-dependent stops and make Winter Magic earn the after-dark window.",
  snow: "Snow trip: keep downtown weather, mountain operations and NPS road status separate.",
  attractions: "Attraction trip: get value from paid stops without burning the visit on movement.",
  foodLights: "Food and lights: keep the evening compact and transition cleanly into the lights window.",
  budget: "Budget trip: make the free and lower-cost pieces carry the plan without filler.",
  evening: "One evening: protect scarce after-dark minutes from parking churn and cross-town movement.",
  fullDay: "Full day: use daylight where it matters, then make the evening block intentionally different.",
  multiDay: "Multi-day trip: group compatible pieces instead of overloading one day."
});

function installFetchPatch() {
  if (globalThis[FETCH_PATCH]) return globalThis[FETCH_PATCH];
  const storage = new AsyncLocalStorage();
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async function gatlinburgFetch(input, init) {
    const url = typeof input === "string" ? input : String(input?.url || input || "");
    const state = storage.getStore();
    const kind = classifyLegacyBypass(url, state);
    if (kind) {
      state.bypassed.push(kind);
      return new Response(JSON.stringify({ error: `${kind} intentionally bypassed by Gatlinburg v10` }), {
        status: 503,
        headers: { "content-type": "application/json" }
      });
    }
    return originalFetch(input, init);
  };
  globalThis[FETCH_PATCH] = { storage, originalFetch };
  return globalThis[FETCH_PATCH];
}

function classifyLegacyBypass(url, state) {
  if (!state) return null;
  if (state.skipHarness > 0 && String(url).includes(HARNESS_MATCH)) {
    state.skipHarness -= 1;
    return "legacy-base-jev";
  }
  if (state.skipAnthropic > 0 && String(url).includes(ANTHROPIC_MATCH)) {
    state.skipAnthropic -= 1;
    return "legacy-writer";
  }
  return null;
}

async function runCoreOnce(rawQuery) {
  const { storage } = installFetchPatch();
  const state = { skipHarness: 1, skipAnthropic: 2, bypassed: [] };
  const data = await storage.run(state, () => v8.buildDecision(rawQuery));
  return { data, bypassed: state.bypassed.slice() };
}

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
  if (!moved.length) return { ...data, diagnostics: { ...(data.diagnostics || {}), selectedLeadDays: leadDays } };

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
    summary: "Current-day attraction and road status do not determine a future visit. Those items remain on the commit checklist for a closer-to-departure recheck.",
    criticalSources: []
  };

  return {
    ...data,
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

function deskLens(data) {
  const id = v9._test.fallbackLens(data);
  return { id, brief: LENS_BRIEFS[id] || LENS_BRIEFS.orientation };
}

async function finalDeskWrite(data, lens) {
  const fallback = v9._test.fallbackCopy(data, lens);
  const ids = (data.stopFacts || []).map(x => x.id);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { mode: "deterministic", copy: fallback, reason: "ANTHROPIC_API_KEY unavailable" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2400);
  try {
    const system = `You are the ${VOICE}, a sharp destination-desk editor with deep working knowledge of Gatlinburg and Great Smoky Mountains winter trip logistics. Your job is not to sell Gatlinburg; it is to help a real visitor use limited time well. Think in terms of the Parkway core, parking and trolley friction, daylight, elevation differences, park access, mountain-attraction operations, walking, sequencing and the after-dark value of Winter Magic. Never claim you live there, were there, or know anything firsthand. Use only the sealed facts supplied. The selected itinerary, times, operating states, conditions and safety gates are immutable. Never invent traffic, waits, parking availability, snow, road status, prices, hours, ticket availability, restaurants or anecdotes. Do not mention JEV, prompts, models, sealed facts or internal process. Avoid tourism-brochure language. Write like an experienced trip editor briefing a smart friend: concrete, selective and useful.`;
    const prompt = `SEALED FACTS:\n${JSON.stringify(v9._test.facts(data, lens))}\nReturn JSON only with exactly this shape and every supplied stop id once: {"topRead":"max 55 words","planRead":"max 85 words","operationsRead":"max 70 words","dateRead":"max 55 words","commitRead":"max 35 words","stopReads":{"STOP_ID":"max 45 words"}}. Explain why the sequence works, what friction it avoids, and what the visitor should pay attention to. Do not repeat labels or write filler.`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: WRITER_MODEL,
        max_tokens: 700,
        temperature: 0.25,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const parsed = v9._test.parseJson((payload?.content || []).find(x => x.type === "text")?.text);
    if (!parsed) throw new Error("writer returned invalid JSON");
    return { mode: "anthropic-haiku", model: WRITER_MODEL, copy: v9._test.cleanCopy(parsed, fallback, ids) };
  } catch (error) {
    return { mode: "deterministic", copy: fallback, reason: String(error?.message || error).slice(0, 180) };
  } finally {
    clearTimeout(timer);
  }
}

async function buildDecision(rawQuery = {}) {
  const core = await runCoreOnce(rawQuery);
  let data = v9._test.normalizeFutureWeatherState(core.data);
  data = v9._test.scopeDecisionHealth(data);
  data = normalizeFutureLiveHealth(data);

  const lens = deskLens(data);
  const writer = await finalDeskWrite(data, lens);
  const applied = v9._test.applyCopy(data, writer);
  const planJev = applied.decision?.jev || data.decision?.jev || null;

  return {
    ...data,
    ...applied,
    benchmarkVersion: "4.0",
    decision: {
      ...applied.decision,
      writer: { mode: writer.mode, model: writer.model || null, voice: VOICE, lens: lens.id }
    },
    editorial: {
      voice: VOICE,
      lens,
      selection: {
        mode: planJev?.mode || "deterministic",
        confidence: planJev?.confidence || 0,
        model: planJev?.model || null
      },
      writer: { mode: writer.mode, model: writer.model || null, reason: writer.reason || null },
      ...writer.copy
    },
    diagnostics: {
      ...(data.diagnostics || {}),
      architecture: "hard-gates -> complete-plan JEV -> deterministic enrichment -> one final Haiku desk writer",
      legacyAiBypassed: core.bypassed,
      editorialDesk: true,
      editorialVoice: VOICE,
      editorialLens: lens.id,
      editorialWriterMode: writer.mode
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
module.exports._test = { todayISO, daysBetween, normalizeFutureLiveHealth, classifyLegacyBypass, deskLens };
