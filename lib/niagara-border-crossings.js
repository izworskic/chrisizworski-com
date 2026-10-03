const niagaraData = require("../data/niagara-border-crossings.json");
const {
  cleanText,
  emptyLane,
  normalizeCbpPort,
  parseAgencyTimestamp,
  parseCbsaCsv,
} = require("./border-crossings");

const CROSSINGS = Object.freeze(
  niagaraData.crossings.map((c) => Object.freeze({
    ...c,
    eligibility: Object.freeze({ ...c.eligibility }),
    nexus: Object.freeze({ ...c.nexus }),
    restrictions: Object.freeze([...(c.restrictions || [])]),
    toll: Object.freeze({ ...c.toll }),
    cameras: Object.freeze((c.cameras || []).map((x) => Object.freeze({ ...x }))),
  })),
);
const CROSSING_BY_ID = new Map(CROSSINGS.map((c) => [c.id, c]));
const CROSSING_ORDER = ["lewiston-queenston", "rainbow", "whirlpool", "peace"];
const DIRECTIONS = new Set(["to_us", "to_canada"]);
const TRAVELERS = new Set(["passenger", "nexus", "commercial", "pedestrian", "bicycle", "bus", "tow"]);
const FRESHNESS_POLICY = Object.freeze({
  cbp: Object.freeze({ stale_after_minutes: 30, hard_expiry_minutes: 120 }),
  cbsa: Object.freeze({ stale_after_minutes: 45, hard_expiry_minutes: 120 }),
  operator: Object.freeze({ stale_after_minutes: 90, hard_expiry_minutes: 180 }),
});

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—");
}

function htmlCellText(value) {
  return cleanText(decodeEntities(String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ")));
}

function parseOperatorTimestamp(text) {
  const match = htmlCellText(text).match(
    /Real-time traffic conditions as of:\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\.?\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
  );
  if (!match) return null;
  const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const month = months[match[1].slice(0, 3)];
  if (!month) return null;
  let hour = Number(match[4]) % 12;
  if (match[6].toUpperCase() === "PM") hour += 12;
  const midday = new Date(Date.UTC(Number(match[3]), month - 1, Number(match[2]), 12));
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "short" })
    .formatToParts(midday).find((p) => p.type === "timeZoneName")?.value === "EST" ? "EST" : "EDT";
  return parseAgencyTimestamp(
    `${match[3]}-${String(month).padStart(2, "0")}-${String(match[2]).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${match[5]} ${tz}`,
  );
}

function parseOperatorWait(value) {
  const raw = htmlCellText(value);
  if (!raw || /^N\/?A$/i.test(raw)) return emptyLane();
  const lanes = raw.match(/(\d+)\s*\/\s*(\d+)\s*Open/i);
  const lanesOpen = lanes ? Number(lanes[1]) : null;
  if (/\bCLOSED\b/i.test(raw)) return { ...emptyLane("Closed"), status: "closed", display: "Closed", raw, lanes_open: lanesOpen };
  let wait = null;
  if (/\bNo Delay\b/i.test(raw)) wait = 0;
  else {
    const match = raw.match(/(\d+)\s*(?:min|minute)/i);
    if (match) wait = Number(match[1]);
  }
  if (!Number.isFinite(wait)) return { ...emptyLane(), raw, lanes_open: lanesOpen };
  return {
    available: true,
    status: "reported",
    wait_minutes: wait,
    display: wait === 0 ? "No delay" : `${wait} min`,
    raw,
    lanes_open: lanesOpen,
    updated_text: null,
    updated_at: null,
  };
}

function extractRows(html) {
  return [...String(html || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((m) => [...m[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((c) => htmlCellText(c[1])))
    .filter((cells) => cells.length);
}

function parseOperatorTrafficHtml(html, sourceName, sourceUrl) {
  const updatedAt = parseOperatorTimestamp(html);
  const waits = Object.fromEntries(CROSSING_ORDER.map((id) => [id, {
    to_us: { passenger: emptyLane(), commercial: emptyLane(), nexus: emptyLane() },
    to_canada: { passenger: emptyLane(), commercial: emptyLane(), nexus: emptyLane() },
  }]));
  const aliases = [
    [/^(?:peace(?: bridge)?|pb)$/i, "peace"],
    [/^(?:l\.?\s*queenston|lewiston(?:[-– ]queenston)?|lq)$/i, "lewiston-queenston"],
    [/^(?:rainbow(?: bridge)?|rb)$/i, "rainbow"],
    [/^(?:whirlpool(?: rapids)?(?: bridge)?|wp)(?:\s*\*\*)?$/i, "whirlpool"],
  ];
  let direction = null;
  for (const cells of extractRows(html)) {
    const joined = cells.join(" | ");
    if (/To\s+U\.?S\.?A\.?|\bU\.?S\.?\s+Flag\b|\bUSA\s+Flag\b/i.test(joined)) { direction = "to_us"; continue; }
    if (/To\s+Canada|\bCanada(?:dian)?\s+Flag\b/i.test(joined)) { direction = "to_canada"; continue; }
    if (!direction || cells.length < 2) continue;
    const label = cells[0].trim();
    const category = /^autos?/i.test(label) ? "passenger" : /^trucks?/i.test(label) ? "commercial" : /^nexus/i.test(label) ? "nexus" : null;
    if (category) {
      cells.slice(1, 5).forEach((value, i) => {
        const id = CROSSING_ORDER[i];
        if (!id) return;
        const lane = parseOperatorWait(value);
        if (updatedAt) lane.updated_at = updatedAt;
        waits[id][direction][category] = lane;
      });
      continue;
    }
    const id = aliases.find(([pattern]) => pattern.test(label))?.[1];
    if (!id) continue;
    ["passenger", "commercial", "nexus"].forEach((categoryName, i) => {
      if (cells[i + 1] == null) return;
      const lane = parseOperatorWait(cells[i + 1]);
      if (updatedAt) lane.updated_at = updatedAt;
      waits[id][direction][categoryName] = lane;
    });
  }
  return {
    source_name: sourceName,
    source_url: sourceUrl,
    updated_at: updatedAt,
    waits,
    technology_note: /Real-time technology is not currently available/i.test(htmlCellText(html))
      ? "Whirlpool values are operator-updated rather than real-time technology." : null,
  };
}

function hasOperatorData(operator, crossingId) {
  const item = operator?.waits?.[crossingId];
  if (!item) return false;
  return ["to_us", "to_canada"].some((d) => Object.values(item[d] || {}).some((lane) => lane.available || lane.status === "closed"));
}

function withCbsaTimestamp(lane, updatedText) {
  const next = { ...(lane || emptyLane()) };
  if (updatedText && !next.updated_text) next.updated_text = updatedText;
  if (!next.updated_at && updatedText) next.updated_at = parseAgencyTimestamp(updatedText);
  return next;
}

function source(kind, name, url, available, updatedAt = null) {
  return { kind, name, url, available: Boolean(available), updated_at: updatedAt };
}

function mergeNiagaraSources(cbpPayload, cbsaCsv, operatorSources = {}) {
  const cbpPorts = new Map((Array.isArray(cbpPayload) ? cbpPayload : []).filter((p) => p?.port_number).map((p) => [String(p.port_number), p]));
  const cbsaRows = parseCbsaCsv(cbsaCsv);
  return CROSSINGS.map((crossing) => {
    const cbpRaw = cbpPorts.get(crossing.cbp_port_number);
    const cbp = normalizeCbpPort(cbpRaw || {});
    const cbsa = crossing.cbsa_name ? cbsaRows.get(crossing.cbsa_name) : null;
    const preferredOperator = crossing.id === "peace" ? operatorSources.peace : operatorSources.nfbc;
    const fallbackOperator = crossing.id === "peace" ? operatorSources.nfbc : operatorSources.peace;
    const operator = hasOperatorData(preferredOperator, crossing.id) ? preferredOperator : hasOperatorData(fallbackOperator, crossing.id) ? fallbackOperator : preferredOperator || fallbackOperator || null;
    const operatorWaits = operator?.waits?.[crossing.id] || { to_us: {}, to_canada: {} };
    const caPassenger = cbsa ? withCbsaTimestamp(cbsa.passenger, cbsa.updated_text) : emptyLane();
    const caCommercial = cbsa ? withCbsaTimestamp(cbsa.commercial, cbsa.updated_text) : emptyLane();
    const usPassenger = cbp.passenger?.standard || emptyLane();
    const usCommercial = cbp.commercial?.standard || emptyLane();
    const usNexus = cbp.passenger?.nexus || emptyLane();
    const caNexus = ["peace", "whirlpool", "lewiston-queenston"].includes(crossing.id)
      ? operatorWaits.to_canada?.nexus || emptyLane() : emptyLane("No dedicated NEXUS wait published");
    const resolvedUsNexus = usNexus.available || usNexus.status === "closed" ? usNexus
      : crossing.id === "whirlpool" ? operatorWaits.to_us?.nexus || emptyLane() : emptyLane("No dedicated NEXUS wait published");
    const operatorSource = source("operator", operator?.source_name || crossing.operator, operator?.source_url || crossing.traffic_url, Boolean(operator), operator?.updated_at || null);
    return {
      id: crossing.id,
      name: crossing.name,
      short_name: crossing.short_name,
      operator: crossing.operator,
      operator_url: crossing.operator_url,
      traffic_url: crossing.traffic_url,
      hours: crossing.hours,
      route: crossing.route,
      eligibility: { ...crossing.eligibility },
      nexus_required: crossing.nexus_required,
      nexus: { ...crossing.nexus },
      restrictions: [...(crossing.restrictions || [])],
      toll: { ...crossing.toll },
      cameras: (crossing.cameras || []).map((x) => ({ ...x })),
      dynamic_note: crossing.dynamic_note || null,
      status: { to_us: cbp.port_status, cbp_text: cbp.port_status_text, cbp_hours: cbp.hours || crossing.hours, construction_notice: cbp.construction_notice },
      waits: {
        to_us: {
          source: source("cbp", "U.S. Customs and Border Protection", "https://bwt.cbp.gov/", cbp.available, usPassenger.updated_at || usNexus.updated_at || usCommercial.updated_at || null),
          operator_source: operatorSource,
          passenger: { standard: usPassenger, nexus: resolvedUsNexus },
          commercial: { standard: usCommercial },
          operator_validation: operatorWaits.to_us || {},
        },
        to_canada: {
          source: crossing.cbsa_name
            ? source("cbsa", "Canada Border Services Agency", "https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html", Boolean(cbsa), caPassenger.updated_at || caCommercial.updated_at || null)
            : operatorSource,
          operator_source: operatorSource,
          passenger: { standard: caPassenger, nexus: caNexus },
          commercial: { standard: caCommercial },
          operator_validation: operatorWaits.to_canada || {},
        },
      },
      source_available: { cbp: cbp.available, cbsa: Boolean(cbsa), operator: Boolean(operator) },
    };
  });
}

function normalizeSelection(selection = {}) {
  return {
    direction: DIRECTIONS.has(selection.direction) ? selection.direction : "to_canada",
    traveler: TRAVELERS.has(selection.traveler) ? selection.traveler : "passenger",
    preferred: CROSSING_BY_ID.has(selection.preferred) ? selection.preferred : "rainbow",
  };
}

function evaluateEligibility(crossing, selection = {}) {
  const { direction, traveler } = normalizeSelection(selection);
  if (!crossing) return { eligible: false, reason: "Unknown crossing" };
  if (crossing.nexus_required && traveler !== "nexus") return { eligible: false, reason: "Whirlpool Rapids is restricted to NEXUS cardholders; Global Entry is accepted only U.S.-bound." };
  const key = traveler === "nexus" ? "passenger" : traveler;
  if (!crossing.eligibility?.[key]) {
    const labels = { commercial: "commercial vehicles", pedestrian: "pedestrians", bicycle: "bicycles", bus: "buses", tow: "vehicles with something in tow" };
    return { eligible: false, reason: `${crossing.short_name} does not permit ${labels[traveler] || "this traveler type"}.` };
  }
  if (traveler === "nexus" && crossing.id === "whirlpool" && direction === "to_us") return { eligible: true, reason: "NEXUS cardholders are eligible; NFBC also permits Global Entry U.S.-bound only." };
  return { eligible: true, reason: "Eligible under the published crossing rules." };
}

function freshnessFor(lane, kind, now = new Date()) {
  const policy = FRESHNESS_POLICY[kind] || FRESHNESS_POLICY.operator;
  if (!lane?.updated_at) return { state: lane?.available ? "unknown" : "unavailable", age_minutes: null, usable_for_recommendation: false, ...policy };
  const age = Math.max(0, (now.getTime() - new Date(lane.updated_at).getTime()) / 60000);
  if (!Number.isFinite(age)) return { state: "unknown", age_minutes: null, usable_for_recommendation: false, ...policy };
  const state = age <= policy.stale_after_minutes ? "fresh" : age <= policy.hard_expiry_minutes ? "stale" : "expired";
  return { state, age_minutes: Math.round(age), usable_for_recommendation: state === "fresh", ...policy };
}

function operatorComparableLane(crossing, selection = {}) {
  const { direction, traveler } = normalizeSelection(selection);
  const v = crossing.waits?.[direction]?.operator_validation || {};
  if (traveler === "commercial") return v.commercial || emptyLane();
  if (traveler === "nexus") return (v.nexus?.available || v.nexus?.status === "closed") ? v.nexus : v.passenger || emptyLane();
  if (["pedestrian", "bicycle", "bus", "tow"].includes(traveler)) return emptyLane();
  return v.passenger || emptyLane();
}

function selectedObservation(crossing, selection = {}, now = new Date()) {
  const normalized = normalizeSelection(selection);
  const { direction, traveler } = normalized;
  const eligibility = evaluateEligibility(crossing, normalized);
  if (!eligibility.eligible) return { available: false, state: "CROSSING_INELIGIBLE", eligibility, wait_minutes: null, lane: emptyLane("Ineligible"), freshness: null, source: null, note: eligibility.reason };
  if (["pedestrian", "bicycle", "bus", "tow"].includes(traveler)) return {
    available: false, state: "INSUFFICIENT_DATA", eligibility, wait_minutes: null, lane: emptyLane("No comparable official wait"), freshness: null, source: null,
    note: "The crossing is eligible, but the official feeds do not provide a comparable current wait for this traveler type. Use the bridge's published rules and live traffic links rather than a passenger-car proxy.",
  };
  const d = crossing.waits?.[direction] || {};
  const operatorLane = operatorComparableLane(crossing, normalized);
  if (operatorLane.status === "closed") return {
    available: false, state: "CROSSING_CLOSED", eligibility, wait_minutes: null, lane: operatorLane,
    freshness: operatorLane.updated_at ? freshnessFor(operatorLane, "operator", now) : null,
    source: d.operator_source || null,
    note: "The bridge operator reports this crossing or lane closed, so it is removed from recommendation logic.",
  };
  let lane;
  let selectedSource = d.source || null;
  if (traveler === "commercial") lane = d.commercial?.standard || emptyLane();
  else if (traveler === "nexus") {
    lane = d.passenger?.nexus || emptyLane();
    const operatorNexus = (direction === "to_canada" && ["peace", "whirlpool", "lewiston-queenston"].includes(crossing.id)) || (direction === "to_us" && crossing.id === "whirlpool" && lane.available);
    if (operatorNexus) selectedSource = d.operator_source || selectedSource;
    if (!lane.available && lane.status !== "closed" && crossing.id !== "whirlpool") {
      const general = d.passenger?.standard || emptyLane();
      if (general.available) {
        lane = { ...general, lane_fallback: true, fallback_note: "No dedicated NEXUS wait is published here; using the general passenger wait only as crossing context." };
        selectedSource = d.source || selectedSource;
      }
    }
  } else lane = d.passenger?.standard || emptyLane();
  if (crossing.status?.[direction] === "closed" || lane.status === "closed") return { available: false, state: "CROSSING_CLOSED", eligibility, wait_minutes: null, lane, freshness: lane.updated_at ? freshnessFor(lane, selectedSource?.kind, now) : null, source: selectedSource, note: "The selected crossing or lane is reported closed." };
  if (!lane.available || !Number.isFinite(lane.wait_minutes)) return { available: false, state: "SOURCE_UNAVAILABLE", eligibility, wait_minutes: null, lane, freshness: freshnessFor(lane, selectedSource?.kind, now), source: selectedSource, note: lane.fallback_note || "No current comparable wait is available from the authoritative source." };
  const freshness = freshnessFor(lane, selectedSource?.kind, now);
  return { available: true, state: freshness.state === "fresh" ? "AVAILABLE" : "SOURCE_STALE", eligibility, wait_minutes: lane.wait_minutes, lane, freshness, source: selectedSource, note: lane.fallback_note || null };
}

function detectSourceConflict(crossing, selection = {}, now = new Date()) {
  const primary = selectedObservation(crossing, selection, now);
  if (!primary.source || primary.source.kind === "operator" || primary.state === "CROSSING_CLOSED") return { conflict: false, reason: null };
  const operatorLane = operatorComparableLane(crossing, selection);
  if (!operatorLane || (!operatorLane.available && operatorLane.status !== "closed")) return { conflict: false, reason: null };
  if (!freshnessFor(operatorLane, "operator", now).usable_for_recommendation) return { conflict: false, reason: null };
  if ((primary.lane?.status === "closed") !== (operatorLane.status === "closed")) return { conflict: true, reason: "The federal processing source and bridge-operator traffic report disagree about whether the selected lane is open." };
  if (primary.available && operatorLane.available && Math.abs(primary.wait_minutes - operatorLane.wait_minutes) >= 30) return { conflict: true, reason: "The current federal wait and bridge-operator wait differ by at least 30 minutes." };
  return { conflict: false, reason: null };
}

function diversionBuffer(preferredId, candidateId) {
  const value = niagaraData.diversion_policy?.buffers?.[preferredId]?.[candidateId];
  return Number.isFinite(value) ? value : candidateId === preferredId ? 0 : 999;
}

function compareNiagaraCrossings(crossings, selection = {}, now = new Date()) {
  const normalized = normalizeSelection(selection);
  const minBenefit = Number(niagaraData.diversion_policy?.minimum_net_benefit_minutes) || 10;
  const results = (crossings || []).map((crossing) => {
    const observation = selectedObservation(crossing, normalized, now);
    const conflict = detectSourceConflict(crossing, normalized, now);
    const buffer = diversionBuffer(normalized.preferred, crossing.id);
    const usable = observation.available && observation.freshness?.usable_for_recommendation && !conflict.conflict;
    return {
      id: crossing.id, name: crossing.name, short_name: crossing.short_name, route: crossing.route,
      eligibility: observation.eligibility, state: conflict.conflict ? "SOURCE_CONFLICT" : observation.state,
      wait_minutes: observation.wait_minutes, display: observation.lane?.display || "Not reported", lanes_open: observation.lane?.lanes_open ?? null,
      freshness: observation.freshness, source: observation.source, note: conflict.reason || observation.note,
      restrictions: [...(crossing.restrictions || [])], diversion_buffer_minutes: buffer,
      journey_index_minutes: usable ? observation.wait_minutes + buffer : null, usable_for_recommendation: usable,
    };
  });
  const usable = results.filter((r) => r.usable_for_recommendation).sort((a, b) => a.journey_index_minutes - b.journey_index_minutes || a.wait_minutes - b.wait_minutes);
  const preferred = results.find((r) => r.id === normalized.preferred);
  if (!usable.length) return { state: "INSUFFICIENT_DATA", recommended_id: null, headline: "Current crossing comparison is not reliable enough to choose a bridge", reason: "Static eligibility is still valid, but no fresh, conflict-free wait set is available for this traveler.", selection: normalized, results, minimum_net_benefit_minutes: minBenefit };
  const best = usable[0];
  if (!preferred?.eligibility?.eligible || preferred?.state === "CROSSING_CLOSED") return { state: "ALTERNATE_CROSSING_BETTER", recommended_id: best.id, headline: `Use ${best.short_name}`, reason: preferred?.eligibility?.eligible ? `${preferred.short_name} is closed for this selection; ${best.short_name} is the strongest fresh eligible option.` : `${preferred?.short_name || "Your normal crossing"} is not eligible for this traveler; ${best.short_name} is the strongest fresh eligible option.`, selection: normalized, results, minimum_net_benefit_minutes: minBenefit };
  if (best.id === normalized.preferred) return { state: "USE_PRIMARY_CROSSING", recommended_id: best.id, headline: `Stay with ${best.short_name}`, reason: "No eligible alternate clears the conservative detour buffer and required benefit.", selection: normalized, results, minimum_net_benefit_minutes: minBenefit };
  if (!preferred?.usable_for_recommendation) return { state: "ALTERNATE_CROSSING_BETTER", recommended_id: best.id, headline: `Use ${best.short_name}`, reason: `${preferred?.short_name || "Your normal crossing"} does not have fresh, conflict-free comparison data; ${best.short_name} does.`, selection: normalized, results, minimum_net_benefit_minutes: minBenefit };
  const netBenefit = preferred.journey_index_minutes - best.journey_index_minutes;
  if (netBenefit >= minBenefit) return { state: "ALTERNATE_CROSSING_BETTER", recommended_id: best.id, headline: `Use ${best.short_name}`, reason: `${best.short_name} clears the conservative bridge-switch buffer by about ${Math.round(netBenefit)} minutes.`, net_benefit_minutes: Math.round(netBenefit), selection: normalized, results, minimum_net_benefit_minutes: minBenefit };
  return { state: "COMPARABLE_OPTIONS", recommended_id: normalized.preferred, headline: `Stay with ${preferred.short_name}`, reason: `The alternatives do not beat your normal crossing by the required ${minBenefit}-minute margin after the conservative detour buffer.`, net_benefit_minutes: Math.max(0, Math.round(netBenefit)), selection: normalized, results, minimum_net_benefit_minutes: minBenefit };
}

module.exports = {
  CROSSINGS,
  CROSSING_BY_ID,
  FRESHNESS_POLICY,
  compareNiagaraCrossings,
  detectSourceConflict,
  diversionBuffer,
  evaluateEligibility,
  freshnessFor,
  mergeNiagaraSources,
  normalizeSelection,
  parseOperatorTimestamp,
  parseOperatorTrafficHtml,
  parseOperatorWait,
  selectedObservation,
};
