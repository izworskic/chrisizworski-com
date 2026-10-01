const crypto = require('node:crypto');
const {
  FRESHNESS,
  OFFICIAL_RESTRICTION_RULES,
  PARSER_VERSION,
  TOLL_CLASSES,
  TOLL_EFFECTIVE_DATE,
  TOLL_SOURCE_URL,
  URLS,
} = require('./constants');

function decodeHtml(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_m, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#039;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function htmlToText(value) {
  return decodeHtml(
    String(value || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|h[1-6]|li|section|article|tr)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n+ */g, '\n')
    .trim();
}

function stableHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function isoOrNull(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function freshnessState(timestamp, thresholds, now = Date.now()) {
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(parsed)) return { state: 'unknown', ageMs: null, ageMinutes: null };
  const ageMs = Math.max(0, now - parsed);
  let state = 'fresh';
  if (ageMs > thresholds.staleMs) state = 'stale';
  else if (ageMs > thresholds.agingMs) state = 'aging';
  return { state, ageMs, ageMinutes: Math.round(ageMs / 60_000) };
}

function provenance({
  rawSourceText,
  normalizedValue,
  sourceName,
  sourceUrl,
  sourceTimestamp,
  retrievedAt,
  sourceId = null,
  effectiveStart = null,
  effectiveEnd = null,
  lastChangedAt = null,
  parseState = 'parsed',
}) {
  return {
    raw_source_text: rawSourceText ?? null,
    normalized_value: normalizedValue ?? null,
    source_name: sourceName,
    source_url: sourceUrl,
    source_timestamp: isoOrNull(sourceTimestamp),
    retrieved_at: retrievedAt,
    parser_version: PARSER_VERSION,
    confidence_or_parse_state: parseState,
    source_id: sourceId,
    effective_start: effectiveStart,
    effective_end: effectiveEnd,
    last_changed_at: lastChangedAt,
    checksum_hash: rawSourceText == null ? null : stableHash(rawSourceText),
  };
}

function unwrapWpPayload(payload) {
  const page = Array.isArray(payload) ? payload[0] : payload;
  if (!page || typeof page !== 'object') return null;
  const rendered = page?.content?.rendered;
  if (typeof rendered !== 'string') return null;
  return {
    html: rendered,
    sourceTimestamp: page.modified_gmt ? `${page.modified_gmt}Z` : null,
    sourceId: page.id != null ? String(page.id) : null,
    sourceUrl: page.link || null,
  };
}

function extractStatusSignal(text, { homepage = false } = {}) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return { state: 'UNKNOWN', restrictionLevel: 'UNKNOWN', matchedText: null, parseState: 'missing' };

  const level3 = compact.match(/\blevel\s*(?:3|iii)\b[^.\n]*/i) || compact.match(/closed to all traffic[^.\n]*/i);
  if (level3) return { state: 'CLOSED', restrictionLevel: 'LEVEL_3', matchedText: level3[0], parseState: 'parsed' };

  const closure = compact.match(/(?:cbbt|bridge[- ]tunnel|facility|all lanes?)\s+(?:is|are|remains?|now)?\s*closed\b[^.\n]*/i);
  if (closure) return { state: 'CLOSED', restrictionLevel: 'OTHER', matchedText: closure[0], parseState: 'parsed' };

  const level2 = compact.match(/\blevel\s*(?:2|ii)\b[^.\n]*/i);
  if (level2) return { state: 'OPEN_WITH_RESTRICTIONS', restrictionLevel: 'LEVEL_2', matchedText: level2[0], parseState: 'parsed' };

  const level1 = compact.match(/\blevel\s*(?:1|i)\b[^.\n]*/i);
  if (level1) return { state: 'OPEN_WITH_RESTRICTIONS', restrictionLevel: 'LEVEL_1', matchedText: level1[0], parseState: 'parsed' };

  const advisory = compact.match(/(?:wind|weather)\s+advisory\b[^.\n]*/i) || compact.match(/\badvisory\b[^.\n]*(?:45\s*mph|no passing)/i);
  if (advisory) return { state: 'OPEN_WITH_RESTRICTIONS', restrictionLevel: 'ADVISORY', matchedText: advisory[0], parseState: 'parsed' };

  const open = compact.match(/all lanes? (?:of the cbbt )?(?:are|is) (?:now )?open[^.\n]*/i) || compact.match(/cbbt (?:is )?open to (?:all )?traffic[^.\n]*/i);
  if (open) return { state: 'OPEN', restrictionLevel: 'NONE', matchedText: open[0], parseState: 'parsed' };

  // "No traffic delays" can coexist with a restriction; it is supporting context only.
  if (homepage && /no traffic delays/i.test(compact)) {
    return {
      state: 'UNKNOWN',
      restrictionLevel: 'UNKNOWN',
      matchedText: compact.match(/[^.\n]*no traffic delays[^.\n]*/i)?.[0] || null,
      parseState: 'supporting_only',
    };
  }

  return { state: 'UNKNOWN', restrictionLevel: 'UNKNOWN', matchedText: null, parseState: 'unrecognized' };
}

function extractLaneStatusSignal(html) {
  const source = String(html || '');
  const match = source.match(/<div\b[^>]*class=["'][^"']*\blane-status\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!match) return { state: 'UNKNOWN', restrictionLevel: 'UNKNOWN', matchedText: null, parseState: 'widget_missing' };

  const openingTag = match[0].match(/^<div\b[^>]*>/i)?.[0] || '';
  const classValue = openingTag.match(/class=["']([^"']*)["']/i)?.[1] || '';
  const classes = new Set(classValue.toLowerCase().split(/\s+/).filter(Boolean));
  const label = htmlToText(match[1]).replace(/\s+/g, ' ').trim();

  // This is the CBBT's explicit live lane-status widget. Generic "no traffic delays"
  // language elsewhere on the page remains supporting-only and is never promoted to OPEN.
  if (classes.has('open') && /^open\b/i.test(label)) {
    return { state: 'OPEN', restrictionLevel: 'NONE', matchedText: label || 'Open', parseState: 'parsed_lane_status_widget' };
  }

  // If CBBT places an explicit restriction/closure phrase inside the same authoritative
  // widget, reuse the conservative text parser. Unknown widget states fail closed to UNKNOWN.
  const embedded = extractStatusSignal(label);
  if (embedded.state !== 'UNKNOWN') return { ...embedded, parseState: 'parsed_lane_status_widget' };

  return { state: 'UNKNOWN', restrictionLevel: 'UNKNOWN', matchedText: label || null, parseState: 'widget_unrecognized' };
}

function parseCbbtStatus(input, {
  sourceName = 'CBBT',
  sourceUrl = URLS.cbbtStatusHtml,
  sourceTimestamp = null,
  retrievedAt = new Date().toISOString(),
  sourceId = null,
  homepage = false,
  retrievalAgeMs = 0,
} = {}) {
  let html = input;
  const wp = typeof input === 'object' && input ? unwrapWpPayload(input) : null;
  if (wp) {
    html = wp.html;
    sourceTimestamp = sourceTimestamp || wp.sourceTimestamp;
    sourceId = sourceId || wp.sourceId;
    sourceUrl = wp.sourceUrl || sourceUrl;
  }
  const text = htmlToText(html);
  const textSignal = extractStatusSignal(text, { homepage });
  const widgetSignal = extractLaneStatusSignal(html);
  const signal = textSignal.state !== 'UNKNOWN' ? textSignal : widgetSignal;

  // CBBT pages do not consistently timestamp each operational state. A freshly retrieved
  // unchanged page is still the currently published state, so cache/retrieval age—not a
  // WordPress modified timestamp—is the live-freshness control.
  const ageMs = Math.max(0, Number(retrievalAgeMs) || 0);
  const freshness = {
    state: ageMs > FRESHNESS.cbbtStatus.staleMs ? 'stale' : ageMs > FRESHNESS.cbbtStatus.agingMs ? 'aging' : 'fresh',
    ageMs,
    ageMinutes: Math.round(ageMs / 60_000),
    basis: 'retrieval_age',
    sourceTimestamp: isoOrNull(sourceTimestamp),
  };

  return {
    state: signal.state,
    restrictionLevel: signal.restrictionLevel,
    officialText: signal.matchedText,
    sourceTimestamp: isoOrNull(sourceTimestamp),
    retrievedAt,
    freshness,
    provenance: provenance({
      rawSourceText: signal.matchedText || text.slice(0, 1800),
      normalizedValue: { state: signal.state, restrictionLevel: signal.restrictionLevel },
      sourceName,
      sourceUrl,
      sourceTimestamp,
      retrievedAt,
      sourceId,
      parseState: signal.parseState,
    }),
  };
}

function resolveOfficialStatus(statuses) {
  const usable = (statuses || []).filter((item) => item && item.state && item.state !== 'UNKNOWN' && item.freshness?.state !== 'stale');
  if (!usable.length) {
    return {
      state: 'UNKNOWN',
      restrictionLevel: 'UNKNOWN',
      reason: 'CBBT_SOURCE_UNAVAILABLE_OR_UNPARSEABLE',
      officialText: null,
      source: null,
      conflict: false,
    };
  }

  const distinct = [...new Set(usable.map((item) => `${item.state}:${item.restrictionLevel}`))];
  if (distinct.length === 1) {
    const dedicated = usable.find((item) => item.provenance?.source_url?.includes('/home/tunnel-traffic/'));
    return { ...(dedicated || usable[0]), reason: null, conflict: false };
  }

  // Source timestamps only break ties when every conflicting source has one and the newest
  // is strictly newer. Otherwise expose conflict rather than inventing precedence.
  const timestamped = usable
    .map((item) => ({ item, t: Date.parse(item.sourceTimestamp || '') }))
    .filter((row) => Number.isFinite(row.t))
    .sort((a, b) => b.t - a.t);
  if (timestamped.length === usable.length && timestamped.length >= 2 && timestamped[0].t > timestamped[1].t) {
    return { ...timestamped[0].item, reason: 'NEWEST_AUTHORITATIVE_CBBT_SOURCE', conflict: false };
  }

  return {
    state: 'OFFICIAL_STATUS_CONFLICT',
    restrictionLevel: 'UNKNOWN',
    reason: 'CBBT_OFFICIAL_SOURCES_DISAGREE',
    officialText: usable.map((item) => item.officialText).filter(Boolean).join(' | ') || null,
    conflict: true,
    conflictingSources: usable.map((item) => ({
      state: item.state,
      restrictionLevel: item.restrictionLevel,
      sourceUrl: item.provenance?.source_url,
      sourceTimestamp: item.sourceTimestamp,
      retrievedAt: item.retrievedAt,
    })),
  };
}

function parseIncidents(input, {
  sourceUrl = URLS.cbbtAlertsHtml,
  sourceTimestamp = null,
  retrievedAt = new Date().toISOString(),
  sourceId = null,
} = {}) {
  let html = input;
  const wp = typeof input === 'object' && input ? unwrapWpPayload(input) : null;
  if (wp) {
    html = wp.html;
    sourceTimestamp = sourceTimestamp || wp.sourceTimestamp;
    sourceId = sourceId || wp.sourceId;
    sourceUrl = wp.sourceUrl || sourceUrl;
  }
  const text = htmlToText(html);
  if (!text) return [];
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const candidates = lines.filter((line) => /\b(?:debris|crash|accident|stopped vehicle|disabled vehicle|lane (?:blocked|closed|closure)|incident|removed|cleared|delay(?:s|ed)?)\b/i.test(line));
  const unique = [...new Set(candidates)];
  return unique.slice(0, 12).map((raw, index) => {
    const cleared = /\b(?:removed|cleared|resolved|all lanes? (?:are|now )?open|no delays?)\b/i.test(raw);
    let category = 'other';
    if (/\b(?:crash|accident)\b/i.test(raw)) category = 'crash';
    else if (/\bdebris\b/i.test(raw)) category = 'debris';
    else if (/\b(?:stopped|disabled) vehicle\b/i.test(raw)) category = 'stopped_vehicle';
    else if (/\blane\b/i.test(raw)) category = 'lane_blockage';
    else if (/\btunnel\b/i.test(raw)) category = 'tunnel_issue';
    else if (/\bbridge\b/i.test(raw)) category = 'bridge_issue';
    return {
      id: sourceId ? `${sourceId}:${index}` : stableHash(raw).slice(0, 16),
      rawSourceText: raw,
      category,
      state: cleared ? 'cleared' : 'active',
      sourceTimestamp: isoOrNull(sourceTimestamp),
      retrievedAt,
      provenance: provenance({
        rawSourceText: raw,
        normalizedValue: { category, state: cleared ? 'cleared' : 'active' },
        sourceName: 'CBBT',
        sourceUrl,
        sourceTimestamp,
        retrievedAt,
        sourceId,
      }),
    };
  });
}

function parseAdvisories(input, {
  sourceUrl = URLS.cbbtAdvisoryHtml,
  sourceTimestamp = null,
  retrievedAt = new Date().toISOString(),
  sourceId = null,
} = {}) {
  let html = input;
  const wp = typeof input === 'object' && input ? unwrapWpPayload(input) : null;
  if (wp) {
    html = wp.html;
    sourceTimestamp = sourceTimestamp || wp.sourceTimestamp;
    sourceId = sourceId || wp.sourceId;
    sourceUrl = wp.sourceUrl || sourceUrl;
  }
  const text = htmlToText(html);
  if (!text) return [];
  const blocks = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const selected = [];
  for (const line of blocks) {
    if (/\b(?:roadwork|construction|maintenance|lane closure|speed reduction|anticipate .*delays?|delays?|overnight|tunnel work)\b/i.test(line) && !selected.includes(line)) {
      selected.push(line);
    }
  }
  return selected.slice(0, 12).map((raw, index) => ({
    id: sourceId ? `${sourceId}:advisory:${index}` : stableHash(raw).slice(0, 16),
    rawSourceText: raw,
    category: /roadwork|construction|maintenance/i.test(raw) ? 'maintenance' : /lane/i.test(raw) ? 'lane_closure' : /delay/i.test(raw) ? 'expected_delay' : 'travel_advisory',
    sourceTimestamp: isoOrNull(sourceTimestamp),
    retrievedAt,
    provenance: provenance({
      rawSourceText: raw,
      normalizedValue: raw,
      sourceName: 'CBBT',
      sourceUrl,
      sourceTimestamp,
      retrievedAt,
      sourceId,
    }),
  }));
}

function normalizeVehicle(input = {}) {
  return {
    type: String(input.type || 'other').toLowerCase(),
    exteriorCargo: Boolean(input.exteriorCargo),
    towing: Boolean(input.towing),
    trailerSubtype: input.trailerSubtype ? String(input.trailerSubtype).toLowerCase() : null,
    sixWheel: Boolean(input.sixWheel),
    payloadLb: input.payloadLb == null ? null : Number(input.payloadLb),
    heightFt: input.heightFt == null ? null : Number(input.heightFt),
    propaneCarried: input.propaneCarried == null ? null : Boolean(input.propaneCarried),
    propaneValveClosed: input.propaneValveClosed == null ? null : Boolean(input.propaneValveClosed),
    highProfile: input.highProfile == null ? null : Boolean(input.highProfile),
  };
}

function ruleResult(decision, reason, officialStatus, exactRule = null, ruleSource = URLS.cbbtWeather) {
  return {
    decision,
    reason,
    ruleSource,
    officialRestrictionLevel: officialStatus?.restrictionLevel || 'UNKNOWN',
    exactRule,
  };
}

function vehicleEligibility(officialStatus, vehicleInput = {}) {
  const vehicle = normalizeVehicle(vehicleInput);

  // Static CBBT facility rules remain determinable even when live status is unavailable.
  if (Number.isFinite(vehicle.heightFt) && vehicle.heightFt > 13.5) {
    return ruleResult('RESTRICTED', 'HEIGHT_EXCEEDS_13_FT_6_IN_CLEARANCE', officialStatus, null, URLS.cbbtFaq);
  }
  if (vehicle.propaneCarried === true && vehicle.propaneValveClosed !== true) {
    return ruleResult(vehicle.propaneValveClosed === false ? 'RESTRICTED' : 'UNKNOWN', vehicle.propaneValveClosed === false ? 'PROPANE_VALVE_MUST_BE_CLOSED' : 'PROPANE_VALVE_STATUS_REQUIRED', officialStatus, null, URLS.cbbtFaq);
  }
  if (vehicle.type === 'bicycle') {
    return ruleResult('RESTRICTED', 'CYCLISTS_MAY_NOT_PEDAL_ACROSS_SHUTTLE_REQUIRED', officialStatus, null, URLS.cbbtFaq);
  }
  if (['hazmat', 'oversize', 'other'].includes(vehicle.type)) {
    return ruleResult('UNKNOWN', 'MANUAL_REVIEW_REQUIRED_FOR_SPECIAL_VEHICLE', officialStatus, null, URLS.cbbtFaq);
  }
  if (!officialStatus || officialStatus.state === 'UNKNOWN' || officialStatus.state === 'OFFICIAL_STATUS_CONFLICT') {
    return ruleResult('UNKNOWN', 'OFFICIAL_STATUS_UNRESOLVED', officialStatus);
  }

  const level = officialStatus.restrictionLevel;
  if (level === 'LEVEL_3' || officialStatus.state === 'CLOSED') {
    return ruleResult('RESTRICTED', 'CBBT_CLOSED_TO_ALL_TRAFFIC', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_3);
  }
  if (level === 'LEVEL_2') {
    const allowed = new Set(['passenger_car', 'car', 'pickup', 'minivan', 'van', 'suv']);
    if (!allowed.has(vehicle.type)) return ruleResult('RESTRICTED', 'LEVEL_2_ALLOWED_VEHICLE_LIST_EXCLUDES_CONFIGURATION', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_2);
    if (vehicle.exteriorCargo || vehicle.towing) return ruleResult('RESTRICTED', 'LEVEL_2_REQUIRES_NO_EXTERIOR_CARGO_OR_TOWING', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_2);
    if (vehicle.type === 'van' && vehicle.highProfile === true) return ruleResult('RESTRICTED', 'LEVEL_2_EXCLUDES_HIGH_PROFILE_OR_CONVERSION_VANS', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_2);
    if (vehicle.type === 'van' && vehicle.highProfile == null) return ruleResult('UNKNOWN', 'LEVEL_2_VAN_PROFILE_REQUIRED', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_2);
    return ruleResult('ALLOWED', 'LEVEL_2_ALLOWED_VEHICLE_CONFIGURATION', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_2);
  }
  if (level === 'LEVEL_1') {
    const prohibitedTypes = new Set(['motorcycle', 'rv', 'large_pickup_camper', 'camper_trailer', 'house_trailer', 'box_truck', 'moving_van', 'rental_truck', 'bus']);
    const explicitEmptyTrailerExceptions = new Set(['empty_flatbed', 'empty_car_carrier', 'empty_lowboy', 'empty_logging']);
    if (prohibitedTypes.has(vehicle.type)) return ruleResult('RESTRICTED', 'LEVEL_1_PROHIBITED_VEHICLE_CLASS', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_1);
    if (vehicle.exteriorCargo) return ruleResult('RESTRICTED', 'LEVEL_1_EXTERIOR_CARGO_RESTRICTED', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_1);
    if (vehicle.sixWheel && vehicle.type !== 'pickup') return ruleResult('RESTRICTED', 'LEVEL_1_SIX_WHEEL_TRUCK_RESTRICTED', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_1);
    if (vehicle.towing && !explicitEmptyTrailerExceptions.has(vehicle.trailerSubtype)) return ruleResult('RESTRICTED', 'LEVEL_1_TOWED_CONFIGURATION_RESTRICTED', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_1);
    if (vehicle.type === 'tractor_trailer' || vehicle.type === 'tanker') {
      if (!Number.isFinite(vehicle.payloadLb)) return ruleResult('UNKNOWN', 'LEVEL_1_TRACTOR_TRAILER_PAYLOAD_REQUIRED', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_1);
      if (vehicle.payloadLb < 15000) return ruleResult('RESTRICTED', 'LEVEL_1_TRACTOR_TRAILER_PAYLOAD_UNDER_15000_LB', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_1);
    }
    return ruleResult('ALLOWED', 'LEVEL_1_RULES_ALLOW_CONFIGURATION', officialStatus, OFFICIAL_RESTRICTION_RULES.LEVEL_1);
  }
  if (level === 'ADVISORY') return ruleResult('ALLOWED', 'ADVISORY_DOES_NOT_PROHIBIT_THIS_CONFIGURATION', officialStatus, OFFICIAL_RESTRICTION_RULES.ADVISORY);
  if (level === 'NONE') return ruleResult('ALLOWED', 'NO_OFFICIAL_WIND_RESTRICTION_IDENTIFIED', officialStatus, OFFICIAL_RESTRICTION_RULES.NONE);
  return ruleResult('UNKNOWN', 'UNSUPPORTED_OFFICIAL_RESTRICTION_STATE', officialStatus);
}

function easternDateParts(date) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')), weekday: get('weekday'), hour: Number(get('hour')), minute: Number(get('minute')) };
}

function isPeakSeason(date) {
  const p = easternDateParts(date);
  if (!p) return null;
  const afterStart = p.month > 5 || (p.month === 5 && p.day >= 15);
  const beforeEnd = p.month < 9 || (p.month === 9 && p.day <= 15);
  return afterStart && beforeEnd && ['Fri', 'Sat', 'Sun'].includes(p.weekday);
}

function inferTollClass(input = {}) {
  if (input.officialClass != null && TOLL_CLASSES[input.officialClass]) return Number(input.officialClass);
  const type = String(input.vehicleType || input.type || '').toLowerCase();
  const trailerAxles = input.trailerAxles == null ? 0 : Number(input.trailerAxles);
  const axles = input.axles == null ? null : Number(input.axles);
  const tires = input.tires == null ? null : Number(input.tires);
  const heightFt = input.heightFt == null ? null : Number(input.heightFt);
  const weightLb = input.grossWeightLb == null ? null : Number(input.grossWeightLb);
  const widthFt = input.widthFt == null ? null : Number(input.widthFt);
  const lengthFt = input.lengthFt == null ? null : Number(input.lengthFt);

  if (type === 'school_bus') return 8;
  if (type === 'bus') {
    if (axles === 2) return 14;
    if (axles === 3) return 15;
    return null;
  }
  if (type === 'oversize' || input.specialOverDimension === true || input.cannotMaintain45Mph === true || (Number.isFinite(weightLb) && weightLb >= 84000) || (Number.isFinite(lengthFt) && lengthFt >= 100) || (Number.isFinite(widthFt) && widthFt >= 10.5)) return 16;

  const passenger = new Set(['passenger_car', 'car', 'pickup', 'suv', 'motorcycle', 'minivan', 'van', 'panel_truck', 'station_wagon']);
  if (passenger.has(type)) {
    if (trailerAxles === 1) return 2;
    if (trailerAxles === 2) return 3;
    if (trailerAxles === 3) return 4;
    if (trailerAxles > 3) return null;
    if (axles === 2 && tires === 6 && Number.isFinite(heightFt)) {
      if (heightFt < 8) return 1;
      if (heightFt > 8 && (!Number.isFinite(weightLb) || weightLb <= 42000)) return 9;
      return null;
    }
    return 1;
  }

  if (type === 'rv' && !Number.isFinite(axles)) return null;
  if (axles === 2 && tires === 6 && Number.isFinite(heightFt) && heightFt > 8 && (!Number.isFinite(weightLb) || weightLb <= 42000)) return 9;
  if (axles === 3 && (!Number.isFinite(weightLb) || weightLb <= 63000)) return 10;
  if (axles === 4 && (!Number.isFinite(weightLb) || weightLb <= 77700)) return 11;
  if (axles === 5 && (!Number.isFinite(weightLb) || weightLb < 84000)) return 12;
  if (axles === 6 && (!Number.isFinite(weightLb) || weightLb < 84000)) return 13;
  return null;
}

function calculateToll(input = {}) {
  const travelAt = input.travelAt ? new Date(input.travelAt) : new Date();
  if (!Number.isFinite(travelAt.getTime())) return { state: 'UNKNOWN', reason: 'INVALID_TRAVEL_TIME' };
  const classId = inferTollClass(input);
  if (!classId || !TOLL_CLASSES[classId]) {
    return { state: 'UNKNOWN', reason: 'TOLL_CLASS_UNRESOLVED', assumptions: [], source: TOLL_SOURCE_URL, effectiveDate: TOLL_EFFECTIVE_DATE };
  }
  const rule = TOLL_CLASSES[classId];
  const ezPass = Boolean(input.ezPass);
  const isReturn = Boolean(input.isReturnTrip);
  const returnWithin24h = Boolean(input.returnWithin24Hours);
  const peak = isPeakSeason(travelAt);
  const assumptions = [`Official CBBT class ${classId}`, peak ? 'Peak-season Friday-Sunday within May 15-September 15 (CBBT local time)' : 'Off-peak pricing period'];

  if (classId === 16) {
    return { state: 'ESTIMATE_REQUIRES_APPROVAL', amount: rule.initial, currency: 'USD', classId, assumptions: [...assumptions, 'Escort fee and prior approval required'], source: TOLL_SOURCE_URL, effectiveDate: TOLL_EFFECTIVE_DATE, rule };
  }

  if (classId === 75) {
    const priorTrips = Number(input.priorOneWayTripsLast720Hours ?? input.oneWayTripsLast30Days);
    if (!ezPass || !Number.isFinite(priorTrips) || priorTrips < 29) {
      return { state: 'UNKNOWN', reason: 'CLASS_75_REQUIRES_EZPASS_AND_29_PRIOR_TRIPS_IN_720_HOURS', classId, assumptions, source: TOLL_SOURCE_URL, effectiveDate: TOLL_EFFECTIVE_DATE, rule };
    }
    return { state: 'ESTIMATED', amount: rule.initial, currency: 'USD', classId, assumptions: [...assumptions, 'Current crossing is at least the 30th one-way trip in the 720-hour lookback'], source: TOLL_SOURCE_URL, effectiveDate: TOLL_EFFECTIVE_DATE, rule };
  }

  let amount;
  if (classId === 1) {
    if (isReturn && returnWithin24h && ezPass) {
      amount = peak ? rule.returnPeak : rule.returnOffPeak;
      assumptions.push('Eligible return trip within 24 hours using E-ZPass');
    } else {
      amount = peak ? rule.initialPeak : rule.initialOffPeak;
      if (isReturn && (!returnWithin24h || !ezPass)) assumptions.push('Return discount not applied: E-ZPass and 24-hour conditions were not both met');
    }
  } else if ([2, 3, 4].includes(classId)) {
    if (isReturn && returnWithin24h && ezPass) {
      amount = rule.return;
      assumptions.push('Eligible return trip within 24 hours using E-ZPass');
    } else {
      amount = rule.initial;
      if (isReturn && (!returnWithin24h || !ezPass)) assumptions.push('Return discount not applied: E-ZPass and 24-hour conditions were not both met');
    }
  } else {
    amount = rule.initial;
  }

  return { state: 'ESTIMATED', amount, currency: 'USD', classId, assumptions, source: TOLL_SOURCE_URL, effectiveDate: TOLL_EFFECTIVE_DATE, rule };
}

module.exports = {
  calculateToll,
  decodeHtml,
  easternDateParts,
  extractStatusSignal,
  freshnessState,
  htmlToText,
  inferTollClass,
  isPeakSeason,
  parseAdvisories,
  parseCbbtStatus,
  parseIncidents,
  provenance,
  resolveOfficialStatus,
  stableHash,
  unwrapWpPayload,
  vehicleEligibility,
};
