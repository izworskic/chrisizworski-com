'use strict';

const ADSB_BASE = 'https://api.adsb.lol';
const VRS_ROUTES_BASE = 'https://vrs-standing-data.adsb.lol/routes';
const POSITION_MAX_AGE_SECONDS = 90;
const CACHE_SECONDS = 5;

const IATA_TO_CALLSIGNS = Object.freeze({
  AA: ['AAL'],
  DL: ['DAL'],
  UA: ['UAL'],
  WN: ['SWA'],
  AS: ['ASA'],
  B6: ['JBU'],
  NK: ['NKS'],
  F9: ['FFT'],
  G4: ['AAY'],
  HA: ['HAL'],
  SY: ['SCX'],
  MX: ['MXY'],
  XP: ['VXP'],
  AC: ['ACA'],
  WS: ['WJA'],
  '3M': ['SIL']
});

const AIRLINE_NAMES = Object.freeze({
  AA: 'American Airlines',
  DL: 'Delta Air Lines',
  UA: 'United Airlines',
  WN: 'Southwest Airlines',
  AS: 'Alaska Airlines',
  B6: 'JetBlue',
  NK: 'Spirit Airlines',
  F9: 'Frontier Airlines',
  G4: 'Allegiant Air',
  HA: 'Hawaiian Airlines',
  SY: 'Sun Country Airlines',
  MX: 'Breeze Airways',
  XP: 'Avelo Airlines',
  AC: 'Air Canada',
  WS: 'WestJet',
  '3M': 'Silver Airways'
});

function cleanFlightInput(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeFlightInput(value) {
  const compact = cleanFlightInput(value);
  const iata = compact.match(/^([A-Z0-9]{2})([0-9]{1,4}[A-Z]?)$/);
  if (iata) {
    const prefix = iata[1];
    const suffix = iata[2];
    const operators = IATA_TO_CALLSIGNS[prefix];
    if (!operators) return { ok:false, code:'unsupported-airline', input:compact };
    return {
      ok:true,
      input:compact,
      display: prefix + suffix,
      marketingCode: prefix,
      number: suffix,
      airline: AIRLINE_NAMES[prefix] || prefix,
      callsigns: operators.map(code => code + suffix)
    };
  }

  const icao = compact.match(/^([A-Z]{3})([0-9]{1,4}[A-Z]?)$/);
  if (icao) {
    return {
      ok:true,
      input:compact,
      display: compact,
      marketingCode:null,
      number:icao[2],
      airline:null,
      callsigns:[compact]
    };
  }

  return { ok:false, code:'invalid-flight', input:compact };
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function actualPosition(ac) {
  const lat = finiteNumber(ac?.lat);
  const lon = finiteNumber(ac?.lon);
  const age = finiteNumber(ac?.seen_pos);
  if (lat === null || lon === null) return null;
  return { lat, lon, ageSeconds:age };
}

function sanitizeAircraft(ac, callsign) {
  const position = actualPosition(ac);
  if (!position) return null;
  const altitudeRaw = typeof ac.alt_baro === 'number' ? ac.alt_baro : finiteNumber(ac.alt_geom);
  return {
    callsign: String(ac.flight || callsign || '').trim() || callsign,
    hex: String(ac.hex || '').trim() || null,
    registration: String(ac.r || '').trim() || null,
    aircraftType: String(ac.t || '').trim() || null,
    lat: position.lat,
    lon: position.lon,
    altitudeFeet: altitudeRaw,
    onGround: ac.alt_baro === 'ground' || ac.on_ground === true,
    speedKnots: finiteNumber(ac.gs),
    trackDegrees: finiteNumber(ac.track ?? ac.true_heading ?? ac.mag_heading),
    verticalRateFpm: finiteNumber(ac.baro_rate ?? ac.geom_rate),
    positionAgeSeconds: position.ageSeconds,
    sourceType: String(ac.type || '').trim() || null
  };
}

async function getJson(url, options = {}, timeoutMs = 5500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        accept:'application/json',
        'user-agent':'ChrisIzworski-FlightTracker/1.0 (+https://chrisizworski.com/flight-tracker/)',
        ...(options.headers || {})
      },
      signal:controller.signal
    });
    if (!response.ok) throw new Error('upstream ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function lookupCallsign(callsign) {
  try {
    const data = await getJson(ADSB_BASE + '/v2/callsign/' + encodeURIComponent(callsign));
    const aircraft = Array.isArray(data?.ac) ? data.ac : [];
    const live = aircraft
      .map(ac => sanitizeAircraft(ac, callsign))
      .filter(Boolean)
      .sort((a,b) => (a.positionAgeSeconds ?? 9999) - (b.positionAgeSeconds ?? 9999));
    return live[0] || null;
  } catch {
    return null;
  }
}

function haversineNm(a, b) {
  const rad = degrees => degrees * Math.PI / 180;
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function routeLooksPlausible(aircraft, origin, destination) {
  const direct = haversineNm(origin, destination);
  const viaAircraft = haversineNm(origin, aircraft) + haversineNm(aircraft, destination);
  if (!Number.isFinite(direct) || !Number.isFinite(viaAircraft) || direct < 1) return false;
  const allowanceNm = Math.max(250, direct * 0.30);
  return viaAircraft <= direct + allowanceNm;
}

async function lookupRoute(aircraft) {
  try {
    const callsign = String(aircraft.callsign || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{3,8}$/.test(callsign)) return null;
    const prefix = callsign.slice(0, 2);
    const route = await getJson(
      VRS_ROUTES_BASE + '/' + encodeURIComponent(prefix) + '/' + encodeURIComponent(callsign) + '.json',
      {},
      4500
    );

    const airports = Array.isArray(route?._airports) ? route._airports.filter(Boolean) : [];
    if (!route || route.airport_codes === 'unknown' || airports.length < 2) return null;

    const cleanAirport = ap => ({
      icao:String(ap?.icao || '').trim() || null,
      iata:String(ap?.iata || '').trim() || null,
      name:String(ap?.name || '').trim() || null,
      city:String(ap?.location || '').trim() || null,
      country:String(ap?.countryiso2 || '').trim() || null,
      lat:finiteNumber(ap?.lat),
      lon:finiteNumber(ap?.lon)
    });

    const from = cleanAirport(airports[0]);
    const to = cleanAirport(airports[airports.length - 1]);
    if (from.lat === null || from.lon === null || to.lat === null || to.lon === null) return null;
    if (!routeLooksPlausible(aircraft, from, to)) return null;

    return {
      origin:from,
      destination:to,
      airportCodes:String(route._airport_codes_iata || route.airport_codes || '').trim() || null,
      plausible:true,
      source:{
        name:'VRS standing data via ADSB.lol',
        url:'https://github.com/adsblol/vrs-standing-data',
        license:'CC0 1.0',
        updateCadence:'hourly'
      }
    };
  } catch {
    return null;
  }
}


const NM_TO_MILES = 1.15077945;

/**
 * Aircraft telemetry is not airline flight status. A phase label requires
 * an actual recent aircraft position; on-ground is not equivalent to landed.
 */
function flightPhase(aircraft, positionFresh) {
  if (!positionFresh) return { code:'unknown', label:'Position not current' };
  if (aircraft.onGround === true) return { code:'ground', label:'On ground' };
  const rate = aircraft.verticalRateFpm;
  if (rate !== null && Number.isFinite(rate) && rate >= 400) return { code:'climbing', label:'Climbing' };
  if (rate !== null && Number.isFinite(rate) && rate <= -400) return { code:'descending', label:'Descending' };
  if (aircraft.altitudeFeet >= 14000 && aircraft.speedKnots >= 250) return { code:'cruising', label:'Cruising' };
  if (aircraft.speedKnots >= 100) return { code:'airborne', label:'In flight' };
  return { code:'unknown', label:'Phase unavailable' };
}

function bearingDegrees(a, b) {
  const rad = degrees => degrees * Math.PI / 180;
  const lat1 = rad(a.lat), lat2 = rad(b.lat);
  const dl = rad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Rough airborne landing window, not an airline ETA or ATC prediction.
 * Direct great-circle range understates vectors, holding, and arrival routing.
 * Suppress rather than manufacture an estimate with unreliable telemetry.
 */
function flightProgress(aircraft, route, positionFresh) {
  const phase = flightPhase(aircraft, positionFresh);
  const result = { phase, remainingMiles:null, remainingBasis:'straight-line', landingEstimate:null };
  if (!positionFresh || !route?.plausible || !route.destination ||
      !Number.isFinite(aircraft?.lat) || !Number.isFinite(aircraft?.lon) ||
      !Number.isFinite(route.destination.lat) || !Number.isFinite(route.destination.lon)) return result;

  const distanceNm = haversineNm(aircraft, route.destination);
  if (!Number.isFinite(distanceNm) || distanceNm < 0 || distanceNm > 7000) return result;
  result.remainingMiles = Math.round(distanceNm * NM_TO_MILES / 5) * 5;
  const speed = aircraft.speedKnots;
  if (aircraft.onGround === true || !Number.isFinite(speed) || speed < 150 || speed > 650 ||
      distanceNm < 20 || distanceNm > 5000) return result;

  if (Number.isFinite(aircraft.trackDegrees)) {
    const bearing = bearingDegrees(aircraft, route.destination);
    const divergence = Math.abs(((aircraft.trackDegrees - bearing + 540) % 360) - 180);
    // Aircraft flying materially away from the destination may be diverted,
    // holding, or following a route we cannot infer from open ADS-B.
    if (divergence > 100) return result;
  }
  const fastAverage = Math.min(600, Math.max(250, speed * 1.08));
  const slowAverage = Math.max(180, speed * 0.75);
  const fastestMinutes = distanceNm * 60 / fastAverage + 6;
  const slowestMinutes = distanceNm * 1.20 * 60 / slowAverage + 20;
  const step = distanceNm >= 500 ? 15 : 5;
  const earliest = Math.max(10, Math.floor(fastestMinutes / step) * step);
  const latest = Math.max(earliest + step * 2, Math.ceil(slowestMinutes / step) * step);
  result.landingEstimate = {
    minMinutes:earliest,
    maxMinutes:latest,
    confidence:'rough',
    kind:'calculated-window',
    note:'Rough estimate from latest reported position and groundspeed; not an airline or ATC arrival time.'
  };
  return result;
}

function chooseUnique(matches) {
  const live = matches.filter(Boolean);
  if (!live.length) return { status:'none', aircraft:null };
  if (live.length === 1) return { status:'unique', aircraft:live[0] };

  const fresh = live.filter(ac => ac.positionAgeSeconds === null || ac.positionAgeSeconds <= POSITION_MAX_AGE_SECONDS);
  if (fresh.length === 1) return { status:'unique', aircraft:fresh[0] };

  return { status:'ambiguous', aircraft:null, candidates:live.map(ac => ac.callsign) };
}

async function resolveFlight(normalized) {
  const results = await Promise.all(normalized.callsigns.map(lookupCallsign));
  const direct = chooseUnique(results);
  if (direct.status === 'unique') return direct;
  if (direct.status === 'none') return direct;

  const withRoutes = await Promise.all(
    results.filter(Boolean).map(async aircraft => ({ aircraft, route:await lookupRoute(aircraft) }))
  );
  const plausible = withRoutes.filter(item => item.route?.plausible);
  if (plausible.length === 1) {
    return { status:'unique', aircraft:plausible[0].aircraft, route:plausible[0].route };
  }

  return direct;
}

function buildNotFound(normalized) {
  return {
    status:'not-found',
    flightNumber:normalized.display,
    airline:normalized.airline,
    message:'No live aircraft position found. The flight may not be airborne yet, may have landed, or may be using a different operating callsign.',
    checkedCallsigns:normalized.callsigns,
    source:{
      name:'ADSB.lol',
      url:'https://adsb.lol/',
      license:'ODbL 1.0'
    }
  };
}

async function buildSnapshot(value) {
  const normalized = normalizeFlightInput(value);
  if (!normalized.ok) {
    return {
      status:'invalid',
      code:normalized.code,
      message:normalized.code === 'unsupported-airline'
        ? 'That airline code is not in the tracker yet.'
        : 'Enter a flight number like DL1234, AA86 or UAL2380.'
    };
  }

  const resolved = await resolveFlight(normalized);
  if (resolved.status === 'ambiguous') {
    return {
      status:'ambiguous',
      flightNumber:normalized.display,
      airline:normalized.airline,
      message:'More than one live aircraft matched this flight number, so the tracker will not guess.',
      checkedCallsigns:normalized.callsigns,
      matchedCallsigns:resolved.candidates || []
    };
  }
  if (resolved.status !== 'unique' || !resolved.aircraft) return buildNotFound(normalized);

  const route = resolved.route || await lookupRoute(resolved.aircraft);
  const age = resolved.aircraft.positionAgeSeconds;
  const positionFresh = Number.isFinite(age) && age >= 0 && age <= POSITION_MAX_AGE_SECONDS;
  return {
    status:'live',
    generatedAt:new Date().toISOString(),
    flightNumber:normalized.display,
    airline:normalized.airline,
    aircraft:resolved.aircraft,
    route,
    positionFresh,
    progress:flightProgress(resolved.aircraft, route, positionFresh),
    source:{
      name:'ADSB.lol',
      url:'https://adsb.lol/',
      api:'https://api.adsb.lol/',
      license:'ODbL 1.0',
      note:'Live ADS-B/MLAT position. Movement is never simulated between reports.'
    }
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control','public, s-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=15');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow','GET');
    return res.end(JSON.stringify({status:'error',message:'Method not allowed'}));
  }

  const value = Array.isArray(req.query?.flight) ? req.query.flight[0] : req.query?.flight;
  try {
    const body = await buildSnapshot(value);
    res.statusCode = body.status === 'invalid' ? 400 : 200;
    return res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 502;
    return res.end(JSON.stringify({
      status:'error',
      message:'Live aircraft data is temporarily unavailable.',
      detail:process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined
    }));
  }
};

module.exports._test = {
  cleanFlightInput,
  normalizeFlightInput,
  actualPosition,
  sanitizeAircraft,
  chooseUnique,
  buildSnapshot,
  haversineNm,
  routeLooksPlausible,
  flightPhase,
  flightProgress,
  bearingDegrees,
  IATA_TO_CALLSIGNS
};
