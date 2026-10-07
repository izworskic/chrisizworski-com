'use strict';

const ADSB_BASE = 'https://api.adsb.lol';
const VRS_ROUTES_BASE = 'https://vrs-standing-data.adsb.lol/routes';
const POSITION_MAX_AGE_SECONDS = 90;
const CACHE_SECONDS = 5;
const FLIGHTSTATS_BASE = 'https://www.flightstats.com/v2';
const flightStatsTextCache = new Map();

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
  '3M': ['SIL'],
  AM: ['AMX'],
  AV: ['AVA'],
  CM: ['CMP'],
  PD: ['POE'],
  TS: ['TSC'],
  BA: ['BAW'],
  LH: ['DLH'],
  AF: ['AFR'],
  KL: ['KLM'],
  EI: ['EIN'],
  FI: ['ICE'],
  VS: ['VIR'],
  TK: ['THY'],
  EK: ['UAE'],
  QR: ['QTR'],
  NH: ['ANA'],
  JL: ['JAL'],
  SQ: ['SIA'],
  QF: ['QFA'],
  NZ: ['ANZ'],
  AI: ['AIC'],
  KE: ['KAL']
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
  '3M': 'Silver Airways',
  AM: 'Aeromexico',
  AV: 'Avianca',
  CM: 'Copa Airlines',
  PD: 'Porter Airlines',
  TS: 'Air Transat',
  BA: 'British Airways',
  LH: 'Lufthansa',
  AF: 'Air France',
  KL: 'KLM',
  EI: 'Aer Lingus',
  FI: 'Icelandair',
  VS: 'Virgin Atlantic',
  TK: 'Turkish Airlines',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  NH: 'ANA',
  JL: 'Japan Airlines',
  SQ: 'Singapore Airlines',
  QF: 'Qantas',
  NZ: 'Air New Zealand',
  AI: 'Air India',
  KE: 'Korean Air'
});

const AIRCRAFT_TYPE_NAMES = Object.freeze({
  A319:'Airbus A319',
  A320:'Airbus A320',
  A20N:'Airbus A320neo',
  A321:'Airbus A321',
  A21N:'Airbus A321neo',
  A332:'Airbus A330-200',
  A333:'Airbus A330-300',
  A338:'Airbus A330-800neo',
  A339:'Airbus A330-900neo',
  A359:'Airbus A350-900',
  A35K:'Airbus A350-1000',
  A388:'Airbus A380-800',
  BCS1:'Airbus A220-100',
  BCS3:'Airbus A220-300',
  B736:'Boeing 737-600',
  B737:'Boeing 737-700',
  B738:'Boeing 737-800',
  B739:'Boeing 737-900',
  B37M:'Boeing 737 MAX 7',
  B38M:'Boeing 737 MAX 8',
  B39M:'Boeing 737 MAX 9',
  B3XM:'Boeing 737 MAX 10',
  B752:'Boeing 757-200',
  B753:'Boeing 757-300',
  B762:'Boeing 767-200',
  B763:'Boeing 767-300',
  B764:'Boeing 767-400',
  B772:'Boeing 777-200',
  B77L:'Boeing 777-200LR/F',
  B773:'Boeing 777-300',
  B77W:'Boeing 777-300ER',
  B788:'Boeing 787-8',
  B789:'Boeing 787-9',
  B78X:'Boeing 787-10',
  E170:'Embraer E170',
  E75L:'Embraer E175',
  E75S:'Embraer E175',
  E190:'Embraer E190',
  E195:'Embraer E195',
  E290:'Embraer E190-E2',
  E295:'Embraer E195-E2',
  CRJ2:'Bombardier CRJ200',
  CRJ7:'Bombardier CRJ700',
  CRJ9:'Bombardier CRJ900',
  DH8D:'De Havilland Dash 8-400',
  AT76:'ATR 72-600'
});

function aircraftTypeName(code) {
  const key = String(code || '').trim().toUpperCase();
  return key ? (AIRCRAFT_TYPE_NAMES[key] || key) : null;
}

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
    aircraftTypeName: aircraftTypeName(ac.t),
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


async function getText(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        accept:'text/html,application/xhtml+xml',
        'user-agent':'Mozilla/5.0 (compatible; ChrisIzworski-FlightTracker/1.0; +https://chrisizworski.com/flight-tracker/)',
        ...(options.headers || {})
      },
      redirect:'follow',
      signal:controller.signal
    });
    if (!response.ok) throw new Error('upstream ' + response.status);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function getCachedText(url, ttlMs) {
  const now = Date.now();
  const cached = flightStatsTextCache.get(url);
  if (cached && now - cached.at < ttlMs) return cached.text;
  const text = await getText(url);
  flightStatsTextCache.set(url, {at:now,text});
  if (flightStatsTextCache.size > 40) {
    const oldest = [...flightStatsTextCache.entries()].sort((a,b) => a[1].at - b[1].at).slice(0,10);
    for (const [key] of oldest) flightStatsTextCache.delete(key);
  }
  return text;
}

function extractFlightStatsState(html) {
  const marker = '__NEXT_DATA__ = ';
  const startMarker = String(html || '').indexOf(marker);
  if (startMarker < 0) return null;
  const start = startMarker + marker.length;
  const end = String(html).indexOf(';__NEXT_LOADED_PAGES__', start);
  if (end <= start) return null;
  try {
    const parsed = JSON.parse(String(html).slice(start, end));
    return parsed?.props?.initialState?.flightTracker || null;
  } catch {
    return null;
  }
}

function flattenFlightStatsCandidates(otherDays) {
  const out = [];
  for (const day of Array.isArray(otherDays) ? otherDays : []) {
    for (const flight of Array.isArray(day?.flights) ? day.flights : []) {
      const match = String(flight?.url || '').match(/[?&]year=(\d+)&month=(\d+)&date=(\d+)&flightId=(\d+)/);
      if (!match) continue;
      const sortMs = Date.parse(flight.sortTime || '');
      out.push({
        flightId:match[4],
        year:match[1],
        month:match[2],
        date:match[3],
        sortTime:flight.sortTime || null,
        sortMs:Number.isFinite(sortMs) ? sortMs : null,
        origin:{
          iata:flight?.departureAirport?.iata || flight?.departureAirport?.fs || null,
          city:flight?.departureAirport?.city || null,
          name:flight?.departureAirport?.name || null
        },
        destination:{
          iata:flight?.arrivalAirport?.iata || flight?.arrivalAirport?.fs || null,
          city:flight?.arrivalAirport?.city || null,
          name:flight?.arrivalAirport?.name || null
        }
      });
    }
  }
  return out;
}

function chooseScheduledCandidate(candidates, nowMs = Date.now(), requestedFlightId = null) {
  const valid = (Array.isArray(candidates) ? candidates : []).filter(c => Number.isFinite(c.sortMs));
  if (requestedFlightId) {
    return valid.find(c => String(c.flightId) === String(requestedFlightId)) || null;
  }
  const nearby = valid
    .map(c => ({...c, deltaMs:c.sortMs - nowMs}))
    .filter(c => c.deltaMs >= -6 * 3600000 && c.deltaMs <= 24 * 3600000)
    .sort((a,b) => Math.abs(a.deltaMs) - Math.abs(b.deltaMs));
  if (!nearby.length) return null;

  const close = nearby.filter(c => Math.abs(c.deltaMs) <= 3 * 3600000);
  const routeKeys = new Set(close.map(c => (c.origin?.iata || '') + '>' + (c.destination?.iata || '')));
  if (close.length > 1 && routeKeys.size > 1) {
    return {ambiguous:true, candidates:close.slice(0,4)};
  }
  return nearby[0];
}

function cleanFlightStatsAirport(ap) {
  return {
    iata:ap?.iata || ap?.fs || null,
    fs:ap?.fs || null,
    city:ap?.city || null,
    name:ap?.name || null,
    gate:ap?.gate || null,
    terminal:ap?.terminal || null
  };
}

function cleanScheduledFlight(flight) {
  if (!flight || typeof flight !== 'object' || !flight.flightId) return null;
  const flex = flight?.positional?.flexTrack || {};
  const equipment = flight?.additionalFlightInfo?.equipment || {};
  return {
    flightId:String(flight.flightId),
    status:flight?.status?.status || flight?.resultHeader?.status || null,
    statusDescription:flight?.status?.statusDescription || flight?.resultHeader?.statusDescription || null,
    delayMinutes:finiteNumber(flight?.status?.delayStatus?.minutes ?? flight?.status?.delay?.departure?.minutes),
    isScheduled:Boolean(flight.isScheduled),
    isTracking:Boolean(flight.isTracking),
    isLanded:Boolean(flight.isLanded),
    canceled:Boolean(flight?.flightNote?.canceled),
    scheduledDepartureUTC:flight?.schedule?.scheduledDepartureUTC || null,
    estimatedDepartureUTC:flight?.schedule?.estimatedActualDepartureUTC || null,
    scheduledArrivalUTC:flight?.schedule?.scheduledArrivalUTC || null,
    estimatedArrivalUTC:flight?.schedule?.estimatedActualArrivalUTC || null,
    origin:cleanFlightStatsAirport(flight.departureAirport),
    destination:cleanFlightStatsAirport(flight.arrivalAirport),
    operatedBy:flight?.operatedBy || null,
    equipment:equipment?.name || equipment?.iata || flex?.equipment || null,
    assignedTail:String(flex?.tailNumber || '').trim().toUpperCase() || null,
    source:{
      name:'FlightStats public flight tracker',
      url:'https://www.flightstats.com/v2/flight-tracker',
      note:'Airline status and aircraft assignment can change before departure.'
    }
  };
}

async function lookupScheduledFlight(normalized, requestedFlightId = null) {
  if (!normalized?.marketingCode || !normalized?.number) return {scheduled:null,candidates:[]};
  try {
    const rootUrl = FLIGHTSTATS_BASE + '/flight-tracker/' +
      encodeURIComponent(normalized.marketingCode) + '/' + encodeURIComponent(normalized.number);
    const rootHtml = await getCachedText(rootUrl, 5 * 60 * 1000);
    const rootState = extractFlightStatsState(rootHtml);
    if (!rootState) return {scheduled:null,candidates:[]};

    const candidates = flattenFlightStatsCandidates(rootState.otherDays);
    const chosen = chooseScheduledCandidate(candidates, Date.now(), requestedFlightId);
    if (chosen?.ambiguous) return {scheduled:null,candidates:chosen.candidates,ambiguous:true};
    if (!chosen) return {scheduled:null,candidates:[]};

    const instanceUrl = rootUrl + '?year=' + encodeURIComponent(chosen.year) +
      '&month=' + encodeURIComponent(chosen.month) +
      '&date=' + encodeURIComponent(chosen.date) +
      '&flightId=' + encodeURIComponent(chosen.flightId);
    const instanceHtml = await getCachedText(instanceUrl, 30 * 1000);
    const state = extractFlightStatsState(instanceHtml);
    const scheduled = cleanScheduledFlight(state?.flight);
    return {scheduled,candidates,ambiguous:false};
  } catch {
    return {scheduled:null,candidates:[]};
  }
}

async function lookupRegistration(registration) {
  const reg = String(registration || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,10}$/.test(reg)) return null;
  try {
    const data = await getJson(ADSB_BASE + '/v2/registration/' + encodeURIComponent(reg));
    const aircraft = Array.isArray(data?.ac) ? data.ac : [];
    const live = aircraft
      .map(ac => sanitizeAircraft(ac, ac?.flight || reg))
      .filter(Boolean)
      .sort((a,b) => (a.positionAgeSeconds ?? 9999) - (b.positionAgeSeconds ?? 9999));
    return live[0] || null;
  } catch {
    return null;
  }
}

function airportCode(ap) {
  return String(ap?.iata || ap?.fs || ap?.icao || '').trim().toUpperCase() || null;
}

function buildJourneyState(scheduled, assignedAircraft, currentRoute, positionFresh, directAircraft) {
  if (directAircraft) {
    return {
      state:'your-flight-live',
      headline:'Your flight is airborne.',
      detail:'Showing the aircraft operating your flight now.'
    };
  }
  if (!scheduled) return null;
  if (!scheduled.assignedTail) {
    return {
      state:'assignment-unavailable',
      headline:'Your flight has not left yet.',
      detail:'The airline has not published a usable aircraft assignment yet.'
    };
  }
  if (!assignedAircraft) {
    return {
      state:'assigned-aircraft-not-visible',
      headline:'Your aircraft is assigned, but it is not currently visible airborne.',
      detail:'The assigned aircraft is ' + scheduled.assignedTail + '. It may be at a gate, outside coverage, or between reports.'
    };
  }

  const inboundToDeparture = airportCode(currentRoute?.destination) &&
    airportCode(currentRoute.destination) === airportCode(scheduled.origin);
  const routeText = currentRoute?.origin && currentRoute?.destination
    ? [currentRoute.origin.city || airportCode(currentRoute.origin), currentRoute.destination.city || airportCode(currentRoute.destination)]
        .filter(Boolean).join(' → ')
    : assignedAircraft.callsign || 'another flight';
  return {
    state:inboundToDeparture ? 'inbound-aircraft' : 'assigned-aircraft-live',
    headline:inboundToDeparture
      ? 'Your plane is still inbound to ' + (scheduled.origin?.city || airportCode(scheduled.origin) || 'your departure airport') + '.'
      : 'We found the aircraft assigned to your flight.',
    detail:'Assigned aircraft ' + scheduled.assignedTail + ' is currently ' +
      (assignedAircraft.onGround ? 'on the ground' : 'flying') + (routeText ? ' on ' + routeText + '.' : '.'),
    positionFresh
  };
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
  const result = {
    phase,
    remainingMiles:null,
    directDistanceMiles:null,
    directProgressPercent:null,
    remainingBasis:'straight-line',
    landingEstimate:null
  };
  if (!positionFresh || !route?.plausible || !route.destination ||
      !Number.isFinite(aircraft?.lat) || !Number.isFinite(aircraft?.lon) ||
      !Number.isFinite(route.destination.lat) || !Number.isFinite(route.destination.lon)) return result;

  const distanceNm = haversineNm(aircraft, route.destination);
  const directNm = route.origin ? haversineNm(route.origin, route.destination) : null;
  if (!Number.isFinite(distanceNm) || distanceNm < 0 || distanceNm > 7000) return result;
  result.remainingMiles = Math.round(distanceNm * NM_TO_MILES / 5) * 5;
  if (Number.isFinite(directNm) && directNm > 20) {
    result.directDistanceMiles = Math.round(directNm * NM_TO_MILES / 5) * 5;
    const fraction = Math.max(0, Math.min(1, 1 - distanceNm / directNm));
    result.directProgressPercent = Math.round((fraction * 100) / 5) * 5;
  }
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

async function buildSnapshot(value, options = {}) {
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

  const [resolved, scheduleLookup] = await Promise.all([
    resolveFlight(normalized),
    lookupScheduledFlight(normalized, options.flightId || null)
  ]);

  if (scheduleLookup?.ambiguous && !options.flightId && resolved.status !== 'unique') {
    return {
      status:'choose-flight',
      flightNumber:normalized.display,
      airline:normalized.airline,
      message:'Which flight do you mean?',
      candidates:scheduleLookup.candidates.map(c => ({
        flightId:c.flightId,
        sortTime:c.sortTime,
        origin:c.origin,
        destination:c.destination
      }))
    };
  }

  const scheduled = scheduleLookup?.scheduled || null;

  if (resolved.status === 'ambiguous') {
    return {
      status:'ambiguous',
      flightNumber:normalized.display,
      airline:normalized.airline,
      message:'More than one live aircraft matched this flight number, so the tracker will not guess.',
      checkedCallsigns:normalized.callsigns,
      matchedCallsigns:resolved.candidates || [],
      scheduledFlight:scheduled
    };
  }

  if (resolved.status === 'unique' && resolved.aircraft) {
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
      scheduledFlight:scheduled,
      journey:buildJourneyState(scheduled, null, null, positionFresh, resolved.aircraft),
      source:{
        name:'ADSB.lol',
        url:'https://adsb.lol/',
        api:'https://api.adsb.lol/',
        license:'ODbL 1.0',
        note:'Live ADS-B/MLAT position. Movement is never simulated between reports.'
      }
    };
  }

  if (scheduled) {
    const assignedAircraft = scheduled.assignedTail ? await lookupRegistration(scheduled.assignedTail) : null;
    const currentRoute = assignedAircraft ? await lookupRoute(assignedAircraft) : null;
    const age = assignedAircraft?.positionAgeSeconds;
    const positionFresh = Number.isFinite(age) && age >= 0 && age <= POSITION_MAX_AGE_SECONDS;
    const currentProgress = assignedAircraft
      ? flightProgress(assignedAircraft, currentRoute, positionFresh)
      : null;

    return {
      status:'scheduled',
      generatedAt:new Date().toISOString(),
      flightNumber:normalized.display,
      airline:normalized.airline,
      scheduledFlight:scheduled,
      aircraft:assignedAircraft,
      route:currentRoute,
      positionFresh,
      progress:currentProgress,
      journey:buildJourneyState(scheduled, assignedAircraft, currentRoute, positionFresh, null),
      source:{
        name:'ADSB.lol + FlightStats public flight tracker',
        url:'https://adsb.lol/',
        license:'ADSB position ODbL 1.0',
        note:'Aircraft assignments can change before departure. Live position is shown only when the assigned tail is currently reported.'
      }
    };
  }

  return buildNotFound(normalized);
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
  const flightId = Array.isArray(req.query?.flightId) ? req.query.flightId[0] : req.query?.flightId;
  try {
    const body = await buildSnapshot(value, {flightId});
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
  extractFlightStatsState,
  flattenFlightStatsCandidates,
  chooseScheduledCandidate,
  cleanScheduledFlight,
  lookupScheduledFlight,
  lookupRegistration,
  buildJourneyState,
  haversineNm,
  routeLooksPlausible,
  flightPhase,
  flightProgress,
  bearingDegrees,
  aircraftTypeName,
  AIRCRAFT_TYPE_NAMES,
  IATA_TO_CALLSIGNS
};
