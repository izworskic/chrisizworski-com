'use strict';

const ADSB_BASE = 'https://api.adsb.lol';
const POSITION_MAX_AGE_SECONDS = 90;
const CACHE_SECONDS = 5;

const IATA_TO_CALLSIGNS = Object.freeze({
  AA: ['AAL','JIA','ENY','RPA','SKW'],
  DL: ['DAL','EDV','SKW','RPA'],
  UA: ['UAL','SKW','RPA','GJS','ASH','AWI','UCA'],
  WN: ['SWA'],
  AS: ['ASA','QXE','SKW'],
  B6: ['JBU'],
  NK: ['NKS'],
  F9: ['FFT'],
  G4: ['AAY'],
  HA: ['HAL'],
  SY: ['SCX'],
  MX: ['MXY'],
  XP: ['VXP'],
  AC: ['ACA','JZA'],
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
  3M: 'Silver Airways'
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

async function lookupRoute(aircraft) {
  try {
    const data = await getJson(ADSB_BASE + '/api/0/routeset', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        planes:[{
          callsign:aircraft.callsign,
          lat:aircraft.lat,
          lng:aircraft.lon
        }]
      })
    }, 6500);

    const route = Array.isArray(data) ? data[0] : null;
    const airports = Array.isArray(route?._airports) ? route._airports.filter(Boolean) : [];
    if (!route || route.airport_codes === 'unknown' || airports.length < 2) return null;
    if (route.plausible === false) return null;

    const origin = airports[0];
    const destination = airports[airports.length - 1];
    const cleanAirport = ap => ({
      icao:String(ap?.icao || '').trim() || null,
      iata:String(ap?.iata || '').trim() || null,
      name:String(ap?.name || '').trim() || null,
      city:String(ap?.location || '').trim() || null,
      country:String(ap?.countryiso2 || '').trim() || null,
      lat:finiteNumber(ap?.lat),
      lon:finiteNumber(ap?.lon)
    });
    const from = cleanAirport(origin);
    const to = cleanAirport(destination);
    if (from.lat === null || from.lon === null || to.lat === null || to.lon === null) return null;

    return {
      origin:from,
      destination:to,
      airportCodes:String(route._airport_codes_iata || route.airport_codes || '').trim() || null,
      plausible:route.plausible !== false
    };
  } catch {
    return null;
  }
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
  return {
    status:'live',
    generatedAt:new Date().toISOString(),
    flightNumber:normalized.display,
    airline:normalized.airline,
    aircraft:resolved.aircraft,
    route,
    positionFresh:age === null || age <= POSITION_MAX_AGE_SECONDS,
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
  IATA_TO_CALLSIGNS
};
