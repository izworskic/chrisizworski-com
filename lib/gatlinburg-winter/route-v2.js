"use strict";

const base = require("./route.js");
const { decideClosedSet } = require("../mackinac-island/harness.js");

const T = base._test;
const USER_AGENT = "GatlinburgWinter/2.0 (+https://chrisizworski.com/gatlinburg-winter/)";
const WRITER_MODEL = process.env.GATLINBURG_WRITER_MODEL || "claude-haiku-4-5-20251001";
const CACHE = new Map();

const EXTRA_SOURCES = Object.freeze({
  transitland: "https://www.transit.land/operators/o-gatlinburg~tn~us",
  trolleyOfficial: "https://www.gatlinburg.com/trolley/",
  npsDatasets: "https://www.nps.gov/grsm/learn/nature/datasets.htm",
  npsConditions: "https://www.nps.gov/grsm/planyourvisit/conditions.htm",
  npsWebcams: "https://www.nps.gov/grsm/learn/photosmultimedia/webcams.htm",
  airdna: "https://www.airdna.co/vacation-rental-data/app/us/tennessee/gatlinburg/overview"
});

function safe(v, max = 320) {
  return String(v == null ? "" : v)
    .replace(/[<>\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
function mins(v) {
  const m = String(v || "").match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function hhmm(n) {
  n = Math.max(0, Math.min(1439, Math.round(n)));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
function fmt(v) { return T.formatTime(v); }
function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
async function fetchText(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
      redirect: "follow"
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
async function cached(key, ttlMs, loader) {
  const now = Date.now();
  const hit = CACHE.get(key);
  if (hit && now - hit.at < ttlMs) {
    return { ...hit.value, state: hit.value.state === "live" ? "cached" : hit.value.state };
  }
  try {
    const value = await loader();
    CACHE.set(key, { at: now, value });
    return value;
  } catch (error) {
    if (hit) return { ...hit.value, state: "stale", error: safe(error?.message || error) };
    return { state: "unavailable", fetchedAt: new Date().toISOString(), error: safe(error?.message || error) };
  }
}

async function fetchTransitContext() {
  return cached("transitland", 6 * 60 * 60 * 1000, async () => {
    const text = stripHtml(await fetchText(EXTRA_SOURCES.transitland));
    const hasStatic = /sourced from .*GTFS feed|GTFS Associated Feed|Source spec GTFS/i.test(text);
    const hasRealtime = /GTFS Realtime|GTFS-Realtime|GTFS RT/i.test(text);
    return {
      state: "live",
      fetchedAt: new Date().toISOString(),
      sourceUrl: EXTRA_SOURCES.transitland,
      officialUrl: EXTRA_SOURCES.trolleyOfficial,
      operator: "City of Gatlinburg Trolley",
      onestopId: "o-gatlinburg~tn~us",
      staticGtfs: hasStatic,
      realtimeGtfs: hasRealtime,
      note: hasRealtime
        ? "Transitland registers both static GTFS and GTFS-Realtime for the City of Gatlinburg Trolley."
        : hasStatic
          ? "Transitland registers a static GTFS feed for the City of Gatlinburg Trolley."
          : "Transitland operator record found; feed details were not confidently extracted."
    };
  });
}

async function fetchNpsMonitoringContext() {
  return cached("nps-monitoring", 60 * 60 * 1000, async () => {
    const [datasetsHtml, webcamsHtml, conditionsHtml] = await Promise.all([
      fetchText(EXTRA_SOURCES.npsDatasets),
      fetchText(EXTRA_SOURCES.npsWebcams).catch(() => ""),
      fetchText(EXTRA_SOURCES.npsConditions).catch(() => "")
    ]);
    const datasets = stripHtml(datasetsHtml);
    const webcams = stripHtml(webcamsHtml);
    const conditions = stripHtml(conditionsHtml);
    return {
      state: "live",
      fetchedAt: new Date().toISOString(),
      sourceUrl: EXTRA_SOURCES.npsDatasets,
      conditionsUrl: EXTRA_SOURCES.npsConditions,
      webcamsUrl: EXTRA_SOURCES.npsWebcams,
      openGis: /open source formats such as geoJSON|GIS Open Data|open data/i.test(datasets),
      hourlyMonitoring: /hourly data|near real-time air quality|meteorological data/i.test(`${datasets} ${webcams}`),
      webcams15m: /updated approximately every 15 minutes|updated every 15 minutes/i.test(webcams),
      highElevationWarning: /higher elevations|high elevation/i.test(`${conditions} ${webcams}`),
      note: "NPS provides park-specific open data plus current-condition and webcam monitoring that can differ from lower-elevation Gatlinburg conditions."
    };
  });
}

async function fetchMarketContext() {
  return cached("airdna-market", 24 * 60 * 60 * 1000, async () => {
    const text = stripHtml(await fetchText(EXTRA_SOURCES.airdna, 4200));
    const listings = text.match(/([\d,]+)\s+active short-term rental listings/i)?.[1] || null;
    const occupancy = text.match(/(\d+(?:\.\d+)?)%\s+average occupancy/i)?.[1] || null;
    const updated = text.match(/Updated\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)?.[1] || null;
    return {
      state: "live",
      fetchedAt: new Date().toISOString(),
      sourceUrl: EXTRA_SOURCES.airdna,
      activeListings: listings ? Number(listings.replace(/,/g, "")) : null,
      trailingOccupancyPct: occupancy ? Number(occupancy) : null,
      publishedUpdated: updated,
      usedForLiveCrowding: false,
      note: "Market-scale lodging context only. Trailing occupancy is not used as a live crowd estimate."
    };
  });
}

function candidateByName(name) {
  return T.CANDIDATES.find(c => c.name === name) || null;
}
function candidateById(id) {
  return T.CANDIDATES.find(c => c.id === id) || null;
}
function orderRank(c) {
  if (c.category === "event") return 3;
  if (c.bestTime === "before-sunset" || c.bestTime === "day") return 0;
  if (c.category === "food") return 2;
  if (c.bestTime === "dark") return 4;
  if (c.category === "indoor") return 5;
  return 1;
}
function scheduleIds(ids, input) {
  const candidates = ids.map(candidateById).filter(Boolean).sort((a, b) => orderRank(a) - orderRank(b));
  const sun = T.sunriseSunsetApprox(input.date);
  const sunset = mins(sun.sunset);
  const start = mins(input.start);
  const end = mins(input.end);
  if (start == null || end == null || end <= start) return { itinerary: [], dropped: ids.slice(), travelMinutes: 0, completion: 0 };

  let cursor = start;
  let previous = null;
  let travelTotal = 0;
  const itinerary = [];
  const dropped = [];

  for (const item of candidates) {
    const travel = previous ? T.travelMinutes(previous.zone, item.zone) : 0;
    let next = cursor + travel;
    if (item.bestTime === "dark" && sunset != null) next = Math.max(next, sunset + 15);
    if (item.exactStart) next = Math.max(next, mins(item.exactStart));
    if (item.category === "food" && next < 17 * 60) next = Math.max(next, 17 * 60);
    const dwell = Math.min(item.durationMinutes, input.duration === "evening" ? 105 : item.durationMinutes);
    const reserve = 20;
    if (next + dwell + reserve > end) {
      dropped.push(item.id);
      continue;
    }
    travelTotal += travel;
    itinerary.push({
      id: item.id,
      name: item.name,
      zone: item.zone,
      start: hhmm(next),
      end: hhmm(next + dwell),
      durationMinutes: dwell,
      officialUrl: item.officialUrl,
      verificationRequired: Boolean(item.reservation && input.date > new Date().toISOString().slice(0, 10))
    });
    cursor = next + dwell;
    previous = item;
  }

  return {
    itinerary,
    dropped,
    travelMinutes: travelTotal,
    completion: ids.length ? itinerary.length / ids.length : 0,
    windowMinutes: end - start
  };
}

function realizedOptions(baseDecision) {
  const input = baseDecision.input;
  const out = [];
  const sig = new Set();

  function add(id, label, ids, why, decisiveConstraint, deterministicScore, existingItinerary = null) {
    const clean = [...new Set(ids.filter(Boolean))];
    const scheduled = existingItinerary
      ? { itinerary: existingItinerary, dropped: [], travelMinutes: estimateTravel(existingItinerary), completion: 1, windowMinutes: mins(input.end) - mins(input.start) }
      : scheduleIds(clean, input);
    if (scheduled.itinerary.length < Math.min(2, clean.length || 2)) return;
    if (scheduled.dropped.length) return;
    const key = scheduled.itinerary.map(x => x.id).join("|");
    if (!key || sig.has(key)) return;
    sig.add(key);
    out.push({
      id,
      label,
      why,
      decisiveConstraint,
      deterministicScore: Number.isFinite(deterministicScore) ? deterministicScore : null,
      itinerary: scheduled.itinerary,
      travelMinutes: scheduled.travelMinutes,
      windowMinutes: scheduled.windowMinutes,
      stopCount: scheduled.itinerary.length
    });
  }

  if (baseDecision.itinerary?.length) {
    add(
      `realized-${baseDecision.decision.bundleId || "selected"}`,
      baseDecision.decision.label || "Best-fit plan",
      baseDecision.itinerary.map(x => x.id),
      baseDecision.decision.why,
      baseDecision.decision.decisiveConstraint,
      null,
      baseDecision.itinerary
    );
  }

  for (const alt of baseDecision.alternatives || []) {
    const ids = (alt.items || []).map(name => candidateByName(name)?.id).filter(Boolean);
    add(`realized-${alt.id}`, alt.label, ids, alt.why, "realistic sequence", alt.score);
  }

  return out;
}
function estimateTravel(itinerary) {
  let total = 0;
  for (let i = 1; i < itinerary.length; i++) {
    total += T.travelMinutes(itinerary[i - 1].zone, itinerary[i].zone);
  }
  return total;
}

function optionEvidence(option) {
  return {
    label: option.label,
    stops: option.itinerary.map(x => `${x.start} ${x.name}`),
    start: option.itinerary[0]?.start || null,
    end: option.itinerary.at(-1)?.end || null,
    stopCount: option.stopCount,
    travelMinutes: option.travelMinutes,
    why: option.why,
    decisiveConstraint: option.decisiveConstraint
  };
}

async function chooseRealizedPlan(options, baseDecision) {
  if (!options.length) {
    return { option: null, jev: { mode: "deterministic", confidence: 0, reason: "No fully schedulable plans" } };
  }
  if (options.length === 1) {
    return { option: options[0], jev: { mode: "deterministic", confidence: 1, reason: "Only one fully schedulable plan remained" } };
  }
  const optionMap = Object.fromEntries(options.map(o => [o.id, optionEvidence(o)]));
  const input = baseDecision.input;
  const jev = await decideClosedSet({
    task: "Choose the strongest fully schedulable Gatlinburg winter itinerary for this visitor. Every option is already time-feasible. Choose exactly one supplied option. Favor persona fit, seasonal distinctiveness, weather/daylight timing, geographic efficiency, low friction and useful sequencing. Do not invent stops or facts.",
    options: optionMap,
    context: {
      input,
      headline: baseDecision.headline,
      conditions: baseDecision.conditions,
      events: baseDecision.events?.map(e => ({ name: e.name, time: e.time })) || []
    },
    constraints: [
      "Choose only from the supplied fully schedulable options.",
      "Official closures and operating status outrank preference.",
      "Do not interpret market-level lodging occupancy as live crowding.",
      "Do not make road-safety or ticket-availability guarantees."
    ],
    evidence: options.map(optionEvidence),
    fallbackId: options[0].id,
    minConfidence: 0.55
  });
  return { option: options.find(o => o.id === jev.choiceId) || options[0], jev };
}

function planNarrative(plan, baseDecision) {
  if (!plan?.itinerary?.length) return "No fully schedulable plan fits this window yet.";
  const items = plan.itinerary;
  let text = `Start with ${items[0].name} at ${fmt(items[0].start)}.`;
  if (items.length > 1) text += ` Then ${items.slice(1).map(x => `${x.name} around ${fmt(x.start)}`).join(", then ")}.`;
  const light = items.find(x => /lights|Magic|Parkway/i.test(x.name));
  if (light && baseDecision.headline?.sunset) text += " The light-focused stop stays after sunset instead of using your better daylight.";
  if (plan.travelMinutes <= 20) text += " The sequence also keeps cross-town movement low.";
  return text;
}

async function writePlan(plan, baseDecision) {
  const fallback = planNarrative(plan, baseDecision);
  if (!process.env.ANTHROPIC_API_KEY || !plan) return { mode: "deterministic", text: fallback };
  const facts = {
    persona: baseDecision.input.persona,
    date: baseDecision.input.date,
    available: [baseDecision.input.start, baseDecision.input.end],
    selected: plan.itinerary.map(x => ({ name: x.name, start: x.start, end: x.end })),
    travelMinutes: plan.travelMinutes,
    headline: baseDecision.headline,
    conditions: baseDecision.conditions,
    why: plan.why
  };
  const system = "Write concise destination decision copy from sealed facts only. Use 2-3 short sentences. Explain sequence and tradeoff. Do not add attractions, hours, prices, closures, weather, traffic, tickets or safety claims. No promotional travel prose.";
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
        system,
        messages: [{ role: "user", content: `Sealed facts:\n${JSON.stringify(facts)}\nWrite the plan explanation.` }]
      })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    const text = safe((data?.content || []).find(x => x.type === "text")?.text, 700);
    if (!text) throw new Error("empty writer output");
    return { mode: "anthropic-haiku", model: WRITER_MODEL, text };
  } catch (error) {
    return { mode: "deterministic", text: fallback, reason: safe(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

function deriveInfluences(baseDecision, plan, extras) {
  const input = baseDecision.input;
  const rows = [];
  const names = (plan?.itinerary || []).map(x => x.name).join(" | ");
  const conditions = Object.fromEntries((baseDecision.conditions || []).map(x => [x.label, x.value]));

  if (T.inSeason(input.date)) {
    rows.push({ factor: "Season", effect: "kept", evidence: "Winter Magic is active on the selected date, so after-dark seasonal stops remain eligible." });
  } else {
    rows.push({ factor: "Season", effect: "changed", evidence: "The selected date is outside the published Winter Magic operating window." });
  }
  if (/lights|Magic|Parkway/i.test(names)) {
    rows.push({ factor: "Daylight", effect: "sequenced", evidence: `Sunset is ${baseDecision.headline?.sunset || "date-dependent"}; light-focused stops were pushed later instead of consuming daylight.` });
  }
  if (input.mustSnow) {
    rows.push({ factor: "Snow priority", effect: /Ober/i.test(names) ? "kept" : "limited", evidence: /Ober/i.test(names) ? "The plan preserves an Ober-centered winter activity block." : "No fully schedulable snow-first plan survived the selected window." });
  }
  if (input.budget === "low") {
    rows.push({ factor: "Budget", effect: "changed", evidence: "Ticket-heavy choices were penalized and free/low-cost winter atmosphere was favored." });
  }
  if (input.mobility !== "normal") {
    rows.push({ factor: "Walking", effect: "changed", evidence: input.mobility === "stroller" ? "Longer walking loops were penalized for stroller friction." : "Longer walking loops were penalized to reduce foot travel." });
  }
  if (input.crowds === "avoid") {
    rows.push({ factor: "Crowds", effect: "changed", evidence: `Crowd-sensitive choices were penalized; the current planning estimate is ${baseDecision.headline?.crowdPressure || "date-dependent"}.` });
  }
  if (conditions.Weather && !/unavailable|not yet/i.test(conditions.Weather)) {
    rows.push({ factor: "Weather", effect: "checked", evidence: conditions.Weather });
  }
  if ((plan?.itinerary || []).some(x => x.id === "trolley-lights") && extras.transit?.realtimeGtfs) {
    rows.push({ factor: "Transit", effect: "supported", evidence: "Transitland registers a GTFS-Realtime feed for the Gatlinburg Trolley; official city service information still governs the stop." });
  }
  if ((plan?.itinerary || []).some(x => /newfound|sugarlands|skypark|anakeesta|ober/.test(x.id)) && extras.nps?.hourlyMonitoring) {
    rows.push({ factor: "Mountain check", effect: "supported", evidence: "NPS exposes park-specific monitoring/webcams, so high-elevation conditions do not have to be inferred from downtown alone." });
  }
  return rows.slice(0, 5);
}

function assumptions(rawQuery, baseDecision) {
  const assumed = String(rawQuery?.assumed || "") === "1";
  if (!assumed) return { isDefault: false, summary: null, fields: [] };
  const input = baseDecision.input;
  const fields = [
    "First-visit profile",
    `${T.dateLabel(input.date)}`,
    `${fmt(input.start)}–${fmt(input.end)}`,
    "balanced weather preference",
    "normal crowd tolerance"
  ];
  return {
    isDefault: true,
    summary: `Starting point: ${fields.join(" · ")}. Change only what matters to you.`,
    fields
  };
}

function authorityFor(source) {
  const url = String(source?.url || source?.sourceUrl || "");
  if (/weather\.gov|nps\.gov|irma\.nps\.gov/i.test(url)) return { tier: 1, label: "Primary official" };
  if (/gatlinburg\.com|gatlinburgskypark\.com|anakeesta\.com|obermountain\.com|ripleys\.com/i.test(url)) return { tier: 2, label: "Official operator / destination" };
  if (/transit\.land/i.test(url)) return { tier: 3, label: "Transit registry" };
  if (/airdna\.co/i.test(url)) return { tier: 4, label: "Market context" };
  return { tier: 5, label: "Supporting / calculated" };
}
function enhancedSources(baseDecision, extras) {
  const rows = (baseDecision.sources || []).map(s => ({ ...s, authority: authorityFor(s) }));
  rows.push({
    name: "Gatlinburg Trolley network registry",
    state: extras.transit?.state || "unavailable",
    updatedAt: extras.transit?.fetchedAt || null,
    url: EXTRA_SOURCES.transitland,
    note: extras.transit?.note || "Transitland data unavailable.",
    authority: authorityFor({ url: EXTRA_SOURCES.transitland })
  });
  rows.push({
    name: "Smokies open data + monitoring",
    state: extras.nps?.state || "unavailable",
    updatedAt: extras.nps?.fetchedAt || null,
    url: EXTRA_SOURCES.npsDatasets,
    note: extras.nps?.note || "NPS monitoring context unavailable.",
    authority: authorityFor({ url: EXTRA_SOURCES.npsDatasets })
  });
  rows.push({
    name: "Gatlinburg lodging market context",
    state: extras.market?.state || "unavailable",
    updatedAt: extras.market?.fetchedAt || null,
    url: EXTRA_SOURCES.airdna,
    note: extras.market?.note || "AirDNA market context unavailable.",
    authority: authorityFor({ url: EXTRA_SOURCES.airdna })
  });
  return rows.sort((a, b) => a.authority.tier - b.authority.tier);
}

function marketContext(extras) {
  const m = extras.market;
  return {
    activeShortTermRentals: Number.isFinite(m?.activeListings) ? m.activeListings : null,
    trailingOccupancyPct: Number.isFinite(m?.trailingOccupancyPct) ? m.trailingOccupancyPct : null,
    sourceUpdated: m?.publishedUpdated || null,
    usedForLiveCrowding: false,
    note: m?.note || "Market-level data is not used as a live crowd estimate."
  };
}

function transitContext(extras) {
  const t = extras.transit;
  return {
    operator: t?.operator || "City of Gatlinburg Trolley",
    onestopId: t?.onestopId || "o-gatlinburg~tn~us",
    staticGtfs: Boolean(t?.staticGtfs),
    realtimeGtfs: Boolean(t?.realtimeGtfs),
    sourceUrl: EXTRA_SOURCES.transitland,
    officialUrl: EXTRA_SOURCES.trolleyOfficial,
    note: t?.note || "Transit registry data unavailable; use the official trolley page."
  };
}

async function buildDecision(rawQuery = {}) {
  const [baseDecision, transit, nps, market] = await Promise.all([
    base.buildDecision(rawQuery),
    fetchTransitContext(),
    fetchNpsMonitoringContext(),
    fetchMarketContext()
  ]);

  const options = realizedOptions(baseDecision);
  const { option: chosen, jev } = await chooseRealizedPlan(options, baseDecision);
  const writer = await writePlan(chosen, baseDecision);
  const extras = { transit, nps, market };
  const sources = enhancedSources(baseDecision, extras);
  const influences = deriveInfluences(baseDecision, chosen, extras);
  const assumptionState = assumptions(rawQuery, baseDecision);

  const finalItinerary = chosen?.itinerary || baseDecision.itinerary || [];
  const alternatives = options
    .filter(o => o.id !== chosen?.id)
    .slice(0, 3)
    .map(o => ({
      id: o.id,
      label: o.label,
      why: o.why,
      items: o.itinerary.map(x => x.name),
      window: o.itinerary.length ? `${fmt(o.itinerary[0].start)}–${fmt(o.itinerary.at(-1).end)}` : null
    }));

  const map = finalItinerary.map(x => {
    const c = candidateById(x.id);
    return { id: x.id, name: x.name, lat: c?.lat, lon: c?.lon, zone: x.zone, start: x.start };
  });

  return {
    ...baseDecision,
    version: "2.0",
    assumptions: assumptionState,
    decision: {
      bundleId: chosen?.id || baseDecision.decision?.bundleId || null,
      label: chosen?.label || baseDecision.decision?.label || "No feasible plan",
      summary: writer.text,
      why: chosen?.why || baseDecision.decision?.why || "No grounded plan fit the selected window.",
      decisiveConstraint: chosen?.decisiveConstraint || baseDecision.decision?.decisiveConstraint || null,
      jev: {
        mode: jev?.mode || "deterministic",
        confidence: jev?.confidence || 0,
        model: jev?.model || null,
        stage: "fully-scheduled-options"
      },
      writer: { mode: writer.mode, model: writer.model || null }
    },
    itinerary: finalItinerary,
    alternatives,
    map,
    whatChangedTheAnswer: influences,
    transit: transitContext(extras),
    parkMonitoring: {
      state: nps?.state || "unavailable",
      openGis: Boolean(nps?.openGis),
      hourlyMonitoring: Boolean(nps?.hourlyMonitoring),
      webcams15m: Boolean(nps?.webcams15m),
      sourceUrl: EXTRA_SOURCES.npsDatasets,
      conditionsUrl: EXTRA_SOURCES.npsConditions,
      webcamsUrl: EXTRA_SOURCES.npsWebcams,
      note: nps?.note || null
    },
    marketContext: marketContext(extras),
    sources,
    diagnostics: {
      ...(baseDecision.diagnostics || {}),
      realizedPlanOptions: options.length,
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
    const data = await buildDecision(req.query || {});
    return res.status(200).json(data);
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
  scheduleIds,
  realizedOptions,
  deriveInfluences,
  authorityFor,
  assumptions,
  enhancedSources,
  candidateById,
  candidateByName
};
