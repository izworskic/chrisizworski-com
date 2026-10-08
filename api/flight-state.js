'use strict';

const assignmentApi = require('./flight-assignment.js')._test;
const trackerApi = require('./flight-tracker.js')._test;

const POSITION_MAX_AGE_SECONDS = 15 * 60;
const CACHE_SECONDS = 5;
let sourceConflictCount = 0;

function clean(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

function airportCode(ap) {
  return clean(ap?.iata || ap?.icao || ap?.code || '');
}

function carrierCode(flightNumber) {
  const compact = clean(flightNumber);
  return compact.length >= 2 ? compact.slice(0, 2) : null;
}

function sameAirport(a, b) {
  const aa = airportCode(a);
  const bb = airportCode(b);
  return Boolean(aa && bb && aa === bb);
}

function sameTail(a, b) {
  const aa = clean(a);
  const bb = clean(b);
  return Boolean(aa && bb && aa === bb);
}

function isDiverted(assignment) {
  const text = [
    assignment?.flightStatus?.label,
    assignment?.flightStatus?.description,
    assignment?.note
  ].filter(Boolean).join(' ');
  return /divert/i.test(text);
}

function positionObservation(live, nowMs = Date.now()) {
  const aircraft = live?.aircraft;
  const ageSeconds = Number(aircraft?.positionAgeSeconds);
  const hasPosition = Number.isFinite(Number(aircraft?.lat)) && Number.isFinite(Number(aircraft?.lon));
  if (!hasPosition) {
    return {
      hasPosition:false,
      fixTimestamp:null,
      fixAgeSeconds:null,
      fixAgeMinutes:null,
      fresh:false,
      onGround:null,
      source:'ADSB.lol'
    };
  }

  const validAge = Number.isFinite(ageSeconds) && ageSeconds >= 0 ? ageSeconds : null;
  const fixTimestamp = validAge === null
    ? null
    : new Date(nowMs - validAge * 1000).toISOString();
  const displayAgeSeconds = validAge === null
    ? null
    : validAge < 60
      ? 0
      : validAge < 90 * 60
        ? Math.floor(validAge / 60) * 60
        : Math.floor(validAge / 3600) * 3600;
  return {
    hasPosition:true,
    fixTimestamp,
    fixAgeSeconds:validAge,
    displayAgeSeconds,
    fixAgeMinutes:validAge === null ? null : Math.max(0, Math.round(validAge / 60)),
    fresh:validAge !== null && validAge <= POSITION_MAX_AGE_SECONDS,
    onGround:aircraft?.onGround === true,
    source:'ADSB.lol'
  };
}

function strongStatusState(assignment) {
  if (assignment?.flightStatus?.canceled === true) return 'canceled';
  if (assignment?.flightStatus?.landed === true) return 'landed';
  if (assignment?.flightStatus?.airborne === true) return 'airborne';
  return 'scheduled';
}

function departedOverHourAgo(assignment, nowMs = Date.now()) {
  const actual = Date.parse(assignment?.schedule?.actualDepartureUTC || '');
  if (!Number.isFinite(actual)) return false;
  return nowMs - actual >= 60 * 60 * 1000;
}

function recentInboundAtOrigin(assignment, occurrence) {
  return Boolean(
    occurrence &&
    occurrence?.flightStatus?.landed === true &&
    sameTail(occurrence?.tailNumber, assignment?.tailNumber) &&
    sameAirport(occurrence?.destination, assignment?.origin)
  );
}

function reconcileFlightState({assignment, live, recentInboundOccurrence, nowMs = Date.now()}) {
  const observation = positionObservation(live, nowMs);
  const statusState = strongStatusState(assignment);
  const adsbState = observation.fresh
    ? (observation.onGround ? 'ground' : 'airborne')
    : null;

  const strongConflict = Boolean(
    adsbState &&
    (
      (statusState === 'airborne' && adsbState === 'ground') ||
      (statusState === 'landed' && adsbState === 'airborne')
    )
  );

  let renderedState = 'assigned-no-position';
  let renderSource = 'flight-status';

  if (assignment?.flightStatus?.canceled === true) {
    renderedState = 'canceled';
    renderSource = 'flight-status';
  } else if (!assignment?.tailNumber) {
    renderedState = 'unassigned';
    renderSource = 'flight-status';
  } else if (observation.fresh) {
    renderedState = observation.onGround ? 'ground-live' : 'airborne-live';
    renderSource = 'adsb-fresh';
  } else if (assignment?.flightStatus?.airborne === true) {
    renderedState = 'airborne-status';
    renderSource = 'flight-status';
  } else if (assignment?.flightStatus?.landed === true) {
    renderedState = 'landed-status';
    renderSource = 'flight-status';
  } else if (
    departedOverHourAgo(assignment, nowMs) &&
    !assignment?.flightStatus?.canceled &&
    !isDiverted(assignment)
  ) {
    // A confirmed departure more than an hour ago cannot become "parked at gate"
    // without a fresh on-ground aircraft fix or a landed flight-status state.
    renderedState = 'airborne-status';
    renderSource = 'confirmed-departure';
  } else if (recentInboundAtOrigin(assignment, recentInboundOccurrence)) {
    renderedState = 'parked-origin-confirmed';
    renderSource = 'same-tail-arrival';
  }

  return {
    renderedState,
    renderSource,
    sourceConflict:strongConflict,
    observation,
    statusState
  };
}

function operatingOccurrenceMatches(detail, assignment, live) {
  if (detail?.status !== 'found') return false;
  if (clean(detail?.flightNumber) !== clean(live?.operatingFlightNumber)) return false;
  if (!sameTail(detail?.tailNumber, assignment?.tailNumber)) return false;
  if (!sameTail(live?.aircraft?.registration, assignment?.tailNumber)) return false;
  if (detail?.flightStatus?.airborne !== true || detail?.flightStatus?.landed === true) return false;
  if (!sameAirport(detail?.destination, assignment?.origin)) return false;
  return true;
}

async function resolveOperatingOccurrence(assignment, live, date) {
  const operatingFlight = clean(live?.operatingFlightNumber);
  const passengerFlight = clean(assignment?.flightNumber);
  if (!operatingFlight || operatingFlight === passengerFlight) return null;
  if (!live?.positionFresh || live?.aircraft?.onGround === true) return null;
  if (!assignment?.tailNumber || !assignment?.origin || !date) return null;

  try {
    const base = await assignmentApi.lookupAssignment({flight:operatingFlight,date,flightId:null});
    if (operatingOccurrenceMatches(base, assignment, live)) return base;
    if (base?.status !== 'choose-flight') return null;

    const options = Array.isArray(base.options) ? base.options.slice(0, 8) : [];
    const details = await Promise.all(options.map(option =>
      assignmentApi.lookupAssignment({
        flight:operatingFlight,
        date,
        flightId:option.flightId
      }).catch(() => null)
    ));
    const matches = details.filter(detail => operatingOccurrenceMatches(detail, assignment, live));
    return matches.length === 1 ? matches[0] : null;
  } catch {
    return null;
  }
}

function dateIsNearNow(date, nowMs = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return false;
  const target = Date.parse(String(date) + 'T12:00:00Z');
  return Number.isFinite(target) && Math.abs(target - nowMs) <= 36 * 60 * 60 * 1000;
}

async function resolveRecentInbound(assignment, date, nowMs = Date.now()) {
  if (!dateIsNearNow(date, nowMs)) return null;
  const tail = assignment?.tailNumber;
  const airport = airportCode(assignment?.origin);
  const carrier = carrierCode(assignment?.flightNumber);
  if (!tail || !airport || !carrier) return null;
  try {
    const result = await assignmentApi.lookupRecentArrivalByTail({tail,airport,carrier,nowMs});
    if (result?.status !== 'found-inbound-occurrence') return null;
    return result.occurrence || null;
  } catch {
    return null;
  }
}

function logRender({assignment, reconciliation}) {
  if (reconciliation.sourceConflict) sourceConflictCount += 1;
  const record = {
    event:'flight-state-render',
    tail:assignment?.tailNumber || null,
    flightNumber:assignment?.flightNumber || null,
    fixTimestamp:reconciliation?.observation?.fixTimestamp || null,
    fixAgeSeconds:reconciliation?.observation?.fixAgeSeconds ?? null,
    source:reconciliation?.renderSource || null,
    renderedState:reconciliation?.renderedState || null,
    statusState:reconciliation?.statusState || null,
    sourceConflict:reconciliation?.sourceConflict === true,
    sourceConflictCount
  };
  console.log(JSON.stringify(record));
  return record;
}

async function buildUnifiedFlightState({flight, date, flightId, nowMs = Date.now()}) {
  const assignment = await assignmentApi.lookupAssignment({flight,date,flightId});
  if (assignment?.status !== 'found') return assignment;

  if (!assignment.tailNumber) {
    const reconciliation = reconcileFlightState({assignment,live:null,recentInboundOccurrence:null,nowMs});
    const observability = logRender({assignment,reconciliation});
    return {
      status:'found',
      generatedAt:new Date(nowMs).toISOString(),
      assignment,
      live:null,
      recentInboundOccurrence:null,
      confirmedOperatingOccurrence:null,
      ...reconciliation,
      observability
    };
  }

  const focusAirport = airportCode(assignment.origin);
  const [live, recentInboundOccurrence] = await Promise.all([
    trackerApi.buildRegistrationSnapshot(assignment.tailNumber, focusAirport),
    resolveRecentInbound(assignment, date, nowMs)
  ]);

  const confirmedOperatingOccurrence = await resolveOperatingOccurrence(assignment, live, date);
  if (confirmedOperatingOccurrence && live && typeof live === 'object') {
    live.confirmedOperatingOccurrence = confirmedOperatingOccurrence;
  }

  const reconciliation = reconcileFlightState({
    assignment,
    live,
    recentInboundOccurrence,
    nowMs
  });
  const observability = logRender({assignment,reconciliation});

  return {
    status:'found',
    generatedAt:new Date(nowMs).toISOString(),
    assignment,
    live,
    recentInboundOccurrence,
    confirmedOperatingOccurrence,
    ...reconciliation,
    observability
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control','private, no-store');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow','GET');
    return res.end(JSON.stringify({status:'error',message:'Method not allowed'}));
  }

  const flight = Array.isArray(req.query?.flight) ? req.query.flight[0] : req.query?.flight;
  const date = Array.isArray(req.query?.date) ? req.query.date[0] : req.query?.date;
  const flightId = Array.isArray(req.query?.flightId) ? req.query.flightId[0] : req.query?.flightId;

  try {
    const body = await buildUnifiedFlightState({flight,date,flightId});
    res.statusCode = body.status === 'invalid' ? 400 : 200;
    return res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      status:'source-unavailable',
      message:'Flight state data is temporarily unavailable.',
      detail:process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined
    }));
  }
};

module.exports._test = {
  clean,
  airportCode,
  sameAirport,
  sameTail,
  isDiverted,
  positionObservation,
  strongStatusState,
  departedOverHourAgo,
  recentInboundAtOrigin,
  reconcileFlightState,
  operatingOccurrenceMatches,
  dateIsNearNow,
  buildUnifiedFlightState
};
