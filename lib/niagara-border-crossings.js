const niagaraData = require("../data/niagara-border-crossings.json");
const {
  cleanText,
  emptyLane,
  normalizeCbpPort,
  parseAgencyTimestamp,
  parseCbsaCsv,
  parseWaitMinutes,
} = require("./border-crossings");

const CROSSINGS = Object.freeze(
  niagaraData.crossings.map((crossing) => Object.freeze({ ...crossing })),
);
const CROSSING_BY_ID = new Map(CROSSINGS.map((crossing) => [crossing.id, crossing]));
const DIVERSION_POLICY = Object.freeze(niagaraData.diversion_policy);

const FRESHNESS = Object.freeze({
  cbp: Object.freeze({ staleMinutes: 15, hardExpiryMinutes: 45 }),
  cbsa: Object.freeze({ staleMinutes: 20, hardExpiryMinutes: 60 }),
  nfbc: Object.freeze({ staleMinutes: 75, hardExpiryMinutes: 150 }),
});

function parseOperatorTimestamp(text) {
  const value = cleanText(text);
  const match = value.match(
    /(?:real-time traffic conditions as of:\s*)?(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\.?\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
  );
  if (!match) return null;
  const months = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const [, monthName, day, year, hourText, minute, meridiem] = match;
  const month = months[monthName.slice(0, 3)];
  if (!month) return null;
  let hour = Number(hourText) % 12;
  if (meridiem.toUpperCase() === "PM") hour += 12;
  // Niagara is in America/New_York. October is EDT; winter dates are EST.
  const monthNumber = Number(month);
  const offset = monthNumber >= 4 && monthNumber <= 10 ? "-04:00" : "-05:00";
  const parsed = new Date(
    `${year}-${month}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}:00${offset}`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function tableRows(html) {
  return [...String(html || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => cleanText(cell[1])),
  );
}

function normalizeOperatorCell(value) {
  const text = cleanText(value);
  const closed = /\bclosed\b/i.test(text);
  const unavailable = !text || /^(?:n\/?a|--|—|-|not available)$/i.test(text);
  const waitMinutes = parseWaitMinutes(text);
  return {
    available: !closed && !unavailable && waitMinutes != null,
    status: closed ? "closed" : unavailable ? "unavailable" : "reported",
    wait_minutes: waitMinutes,
    display: closed
      ? "Closed"
      : unavailable
        ? "Not reported"
        : waitMinutes === 0
          ? "No delay"
          : `${waitMinutes} min`,
    raw: text || null,
  };
}

function parseNfbcTrafficHtml(html) {
  const text = cleanText(html);
  const timestampMatch = text.match(/Real-time traffic conditions as of:\s*[^<]*?(?=To U\.S\.A\.|Lewiston|$)/i);
  const observedAt = parseOperatorTimestamp(timestampMatch ? timestampMatch[0] : text);
  const output = {
    observed_at: observedAt,
    note: /real-time technology is not currently available/i.test(text)
      ? "NFBC states real-time technology is not currently available at Whirlpool."
      : null,
    to_us: {},
    to_canada: {},
  };
  const ids = ["lewiston-queenston", "rainbow", "whirlpool", "peace"];
  let direction = null;
  for (const cells of tableRows(html)) {
    if (!cells.length) continue;
    const joined = cells.join(" ");
    if (/To U\.S\.A\./i.test(joined)) {
      direction = "to_us";
      continue;
    }
    if (/To Canada/i.test(joined)) {
      direction = "to_canada";
      continue;
    }
    const label = cells[0].toLowerCase();
    const laneType = label.includes("truck") ? "commercial" : label.includes("nexus") ? "nexus" : label.includes("auto") ? "passenger" : null;
    if (!direction || !laneType || cells.length < 5) continue;
    ids.forEach((id, index) => {
      output[direction][id] ||= {};
      output[direction][id][laneType] = normalizeOperatorCell(cells[index + 1]);
    });
  }
  return output;
}

function freshnessFromTimestamp(timestamp, source, now = new Date()) {
  if (!timestamp) return { state: "unknown", age_minutes: null };
  const observed = new Date(timestamp);
  if (Number.isNaN(observed.getTime())) return { state: "unknown", age_minutes: null };
  const ageMinutes = Math.max(0, (now.getTime() - observed.getTime()) / 60000);
  const thresholds = FRESHNESS[source];
  if (ageMinutes > thresholds.hardExpiryMinutes) {
    return { state: "expired", age_minutes: Math.round(ageMinutes) };
  }
  if (ageMinutes > thresholds.staleMinutes) {
    return { state: "stale", age_minutes: Math.round(ageMinutes) };
  }
  return { state: "current", age_minutes: Math.round(ageMinutes) };
}

function findCbsaRow(rows, crossing) {
  if (!crossing.cbsa_name) return null;
  const direct = rows.get(crossing.cbsa_name);
  if (direct) return direct;
  const target = crossing.cbsa_name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const [name, row] of rows) {
    const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (normalized === target || normalized.includes(target) || target.includes(normalized)) return row;
  }
  return null;
}

function laneWithFreshness(lane, source, now) {
  const copy = { ...(lane || emptyLane()) };
  copy.freshness = freshnessFromTimestamp(copy.updated_at, source, now);
  return copy;
}

function mergeNiagaraSources(cbpPayload, cbsaCsv, nfbcHtml = "", now = new Date()) {
  const cbpPorts = new Map(
    (Array.isArray(cbpPayload) ? cbpPayload : [])
      .filter((port) => port?.port_number)
      .map((port) => [String(port.port_number), normalizeCbpPort(port)]),
  );
  const cbsaRows = parseCbsaCsv(cbsaCsv);
  const operator = parseNfbcTrafficHtml(nfbcHtml);

  return CROSSINGS.map((crossing) => {
    const cbp = cbpPorts.get(crossing.cbp_port_number) || normalizeCbpPort();
    const cbsa = findCbsaRow(cbsaRows, crossing);
    const toCanadaPassenger = cbsa?.passenger ? { ...cbsa.passenger } : emptyLane();
    const toCanadaCommercial = cbsa?.commercial ? { ...cbsa.commercial } : emptyLane();
    if (cbsa?.updated_text) {
      const updatedAt = parseAgencyTimestamp(cbsa.updated_text);
      toCanadaPassenger.updated_text = cbsa.updated_text;
      toCanadaPassenger.updated_at = updatedAt;
      toCanadaCommercial.updated_text = cbsa.updated_text;
      toCanadaCommercial.updated_at = updatedAt;
    }

    const operatorCrossing = {
      to_us: operator.to_us[crossing.id] || {},
      to_canada: operator.to_canada[crossing.id] || {},
      observed_at: operator.observed_at,
      freshness: freshnessFromTimestamp(operator.observed_at, "nfbc", now),
      note: crossing.id === "whirlpool" ? crossing.dynamic_note || operator.note : operator.note,
      source_name: crossing.operator,
      source_url: crossing.traffic_url,
    };

    return {
      ...crossing,
      status: {
        to_us: cbp.port_status,
        to_us_text: cbp.port_status_text,
        hours: cbp.hours || crossing.hours,
        construction_notice: cbp.construction_notice || null,
      },
      waits: {
        to_us: {
          source_name: "U.S. Customs and Border Protection",
          source_url: crossing.official_wait_url,
          passenger: {
            standard: laneWithFreshness(cbp.passenger.standard, "cbp", now),
            nexus: laneWithFreshness(cbp.passenger.nexus, "cbp", now),
            ready: laneWithFreshness(cbp.passenger.ready, "cbp", now),
          },
          commercial: {
            standard: laneWithFreshness(cbp.commercial.standard, "cbp", now),
            fast: laneWithFreshness(cbp.commercial.fast, "cbp", now),
          },
        },
        to_canada: {
          source_name: "Canada Border Services Agency",
          source_url: "https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html",
          passenger: {
            standard: laneWithFreshness(toCanadaPassenger, "cbsa", now),
          },
          commercial: {
            standard: laneWithFreshness(toCanadaCommercial, "cbsa", now),
          },
        },
      },
      source_available: {
        to_us: cbp.available,
        to_canada: Boolean(cbsa),
        operator: Boolean(operator.observed_at || Object.keys(operatorCrossing.to_us).length || Object.keys(operatorCrossing.to_canada).length),
      },
      operator_validation: operatorCrossing,
    };
  });
}

function localHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value || 0);
}

function evaluateEligibility(crossing, selection = {}, now = new Date()) {
  const vehicle = selection.vehicle || "passenger";
  const direction = selection.direction === "to_us" ? "to_us" : "to_canada";
  const program = selection.program || "none";
  const allowed = crossing.eligibility?.[vehicle];
  if (!allowed) {
    return { eligible: false, state: "CROSSING_INELIGIBLE", reason: crossing.restrictions?.[0] || `${vehicle} traffic is not permitted.` };
  }

  if (crossing.id === "whirlpool") {
    const trusted = program === "nexus" || (direction === "to_us" && program === "global_entry");
    if (!trusted) {
      return {
        eligible: false,
        state: "CROSSING_INELIGIBLE",
        reason: direction === "to_us"
          ? "Whirlpool requires NEXUS; Global Entry is accepted U.S.-bound only."
          : "Whirlpool requires NEXUS for Canada-bound travel.",
      };
    }
    const hour = localHour(now);
    if (hour < 7 || hour >= 23) {
      return { eligible: false, state: "CROSSING_CLOSED", reason: "Whirlpool operates 7:00 AM–11:00 PM." };
    }
  }

  if (selection.oversize && !["peace", "lewiston-queenston"].includes(crossing.id)) {
    return { eligible: false, state: "CROSSING_INELIGIBLE", reason: "Oversize/commercial loads require an authorized truck crossing." };
  }

  if (selection.oversize && ["peace", "lewiston-queenston"].includes(crossing.id)) {
    return { eligible: true, state: "RESTRICTION_ACTIVE", requires_approval: true, reason: "Operator approval is required before an oversize crossing." };
  }

  return { eligible: true, state: "ELIGIBLE", reason: null };
}

function laneForSelection(crossing, selection = {}) {
  const direction = selection.direction === "to_us" ? "to_us" : "to_canada";
  const vehicle = selection.vehicle || "passenger";
  if (["pedestrian", "bicycle", "bus"].includes(vehicle)) return null;
  if (vehicle === "commercial") return crossing.waits?.[direction]?.commercial?.standard || null;

  if (crossing.id === "whirlpool") {
    const operatorLane = crossing.operator_validation?.[direction]?.nexus;
    if (operatorLane) {
      return {
        ...operatorLane,
        updated_at: crossing.operator_validation.observed_at,
        freshness: crossing.operator_validation.freshness,
        source_name: crossing.operator,
        source_url: crossing.traffic_url,
        context_only: true,
      };
    }
  }

  if (direction === "to_us" && selection.program === "nexus") {
    const nexus = crossing.waits?.to_us?.passenger?.nexus;
    if (nexus?.available) return nexus;
  }
  return crossing.waits?.[direction]?.passenger?.standard || null;
}

function operatorComparableLane(crossing, selection = {}) {
  const direction = selection.direction === "to_us" ? "to_us" : "to_canada";
  const vehicle = selection.vehicle || "passenger";
  if (vehicle === "commercial") return crossing.operator_validation?.[direction]?.commercial || null;
  if (vehicle !== "passenger" && vehicle !== "tow") return null;
  if (selection.program === "nexus") return crossing.operator_validation?.[direction]?.nexus || null;
  return crossing.operator_validation?.[direction]?.passenger || null;
}

function detectSourceConflict(crossing, lane, selection = {}) {
  if (!lane || lane.context_only || crossing.id === "whirlpool") return false;
  const operatorLane = operatorComparableLane(crossing, selection);
  const operatorFreshness = crossing.operator_validation?.freshness?.state;
  if (!operatorLane || operatorFreshness === "expired" || operatorFreshness === "unknown") return false;
  if (lane.status === "closed" && operatorLane.available) return true;
  if (operatorLane.status === "closed" && lane.available) return true;
  if (lane.available && operatorLane.available) {
    return Math.abs(lane.wait_minutes - operatorLane.wait_minutes) >= 30;
  }
  return false;
}

function buildDecision(crossings, selection = {}, now = new Date()) {
  const approachId = CROSSING_BY_ID.has(selection.approach_id) ? selection.approach_id : "peace";
  const vehicle = selection.vehicle || "passenger";
  const direction = selection.direction === "to_us" ? "to_us" : "to_canada";
  const buffers = DIVERSION_POLICY.buffers[approachId] || {};
  const results = (crossings || []).map((crossing) => {
    const eligibility = evaluateEligibility(crossing, selection, now);
    const lane = laneForSelection(crossing, selection);
    const sourceConflict = detectSourceConflict(crossing, lane, selection);
    const directionClosed = direction === "to_us" && crossing.status?.to_us === "closed";
    const laneClosed = lane?.status === "closed";
    const closed = eligibility.state === "CROSSING_CLOSED" || directionClosed || laneClosed;
    const buffer = Number(buffers[crossing.id] ?? 999);
    const fresh = lane?.freshness?.state === "current";
    const comparable = Boolean(
      eligibility.eligible &&
      !eligibility.requires_approval &&
      !closed &&
      !sourceConflict &&
      lane?.available &&
      Number.isFinite(lane.wait_minutes) &&
      fresh &&
      !lane.context_only,
    );
    return {
      id: crossing.id,
      name: crossing.name,
      eligible: eligibility.eligible,
      eligibility_state: eligibility.state,
      eligibility_reason: eligibility.reason,
      requires_approval: Boolean(eligibility.requires_approval),
      closed,
      wait: lane,
      source_conflict: sourceConflict,
      diversion_buffer_minutes: buffer,
      comparable,
      total_decision_minutes: comparable ? buffer + lane.wait_minutes : null,
    };
  });

  if (["pedestrian", "bicycle", "bus"].includes(vehicle)) {
    const eligible = results.filter((result) => result.eligible && !result.closed && !result.requires_approval);
    const recommended = eligible.sort((a, b) => a.diversion_buffer_minutes - b.diversion_buffer_minutes)[0] || null;
    return {
      state: recommended ? "ELIGIBILITY_ONLY" : "INSUFFICIENT_DATA",
      recommended_id: recommended?.id || null,
      advantage_minutes: null,
      headline: recommended
        ? `${recommended.name} fits this traveler from the selected approach`
        : "No eligible crossing is available for this traveler",
      note: "Federal vehicle wait feeds do not provide a defensible like-for-like wait comparison for this traveler type, so the engine uses authoritative eligibility and route proximity only.",
      results,
    };
  }

  const comparable = results.filter((result) => result.comparable).sort((a, b) =>
    a.total_decision_minutes - b.total_decision_minutes || a.diversion_buffer_minutes - b.diversion_buffer_minutes,
  );
  if (!comparable.length) {
    return {
      state: "INSUFFICIENT_DATA",
      recommended_id: null,
      advantage_minutes: null,
      headline: "Current crossing comparison is not reliable enough",
      note: "Static eligibility remains valid, but current wait data is unavailable, stale, conflicting, closed, or context-only.",
      results,
    };
  }

  const best = comparable[0];
  const second = comparable[1];
  const approach = results.find((result) => result.id === approachId);
  if (second && second.total_decision_minutes - best.total_decision_minutes <= 5) {
    return {
      state: "COMPARABLE_OPTIONS",
      recommended_id: best.id,
      advantage_minutes: second.total_decision_minutes - best.total_decision_minutes,
      headline: `${best.name} and ${second.name} are effectively comparable`,
      note: "After conservative diversion buffers, the current difference is too small to justify a strong bridge-switch recommendation.",
      results,
    };
  }

  if (!approach?.comparable) {
    return {
      state: "BEST_CURRENT_CROSSING",
      recommended_id: best.id,
      advantage_minutes: null,
      headline: `Use ${best.name} based on the current comparable evidence`,
      note: "The selected approach crossing cannot be compared confidently right now, so the engine is using the best eligible current alternative without claiming an exact time saved.",
      results,
    };
  }

  const advantage = approach.total_decision_minutes - best.total_decision_minutes;
  if (best.id !== approachId && advantage >= DIVERSION_POLICY.minimum_net_benefit_minutes) {
    return {
      state: "ALTERNATE_CROSSING_BETTER",
      recommended_id: best.id,
      advantage_minutes: advantage,
      headline: `Use ${best.name}`,
      note: `Its current border wait remains at least ${advantage} minutes better after the engine applies the conservative bridge-switch buffer.`,
      results,
    };
  }

  return {
    state: "USE_PRIMARY_CROSSING",
    recommended_id: approachId,
    advantage_minutes: Math.max(0, advantage),
    headline: `Stay with ${approach.name}`,
    note: best.id === approachId
      ? "It has the lowest current wait-plus-diversion result for this trip."
      : "Another bridge has a shorter posted border wait, but not enough to overcome the conservative diversion threshold.",
    results,
  };
}

module.exports = {
  CROSSINGS,
  CROSSING_BY_ID,
  DIVERSION_POLICY,
  FRESHNESS,
  buildDecision,
  detectSourceConflict,
  evaluateEligibility,
  freshnessFromTimestamp,
  laneForSelection,
  mergeNiagaraSources,
  normalizeOperatorCell,
  parseNfbcTrafficHtml,
  parseOperatorTimestamp,
  tableRows,
};
