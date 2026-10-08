'use strict';

const { resolvePublicFlightIdentity } = require('../lib/flight-public-identity.js');

const ADSB_BASE = 'https://api.adsb.lol';
const VRS_ROUTES_BASE = 'https://vrs-standing-data.adsb.lol/routes';
const VRS_AIRPORTS_URL = 'https://vrs-standing-data.adsb.lol/airports.csv';
const POSITION_MAX_AGE_SECONDS = 15 * 60;
const AIRPORT_INDEX_MAX_BYTES = 4_000_000;
let airportIndexPromise = null;
const CACHE_SECONDS = 5;

const IATA_TO_CALLSIGNS = Object.freeze({
  AA: ['AAL'],
  DL: ['DAL','EDV','SKW'],
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

function marketingFlightFromCallsign(value) {
  const callsign = cleanFlightInput(value);
  const match = callsign.match(/^([A-Z]{3})([0-9]{1,4}[A-Z]?)$/);
  if (!match) return null;
  const operator = match[1];
  const suffix = match[2];
  const matches = Object.entries(IATA_TO_CALLSIGNS)
    .filter(([,callsigns]) => callsigns.includes(operator))
    .map(([iata]) => iata);
  if (matches.length !== 1) return null;
  return matches[0] + suffix;
}

function aircraftTypeName(code) {
  const key = String(code || '').trim().toUpperCase();
  return key ? (AIRCRAFT_TYPE_NAMES[key] || key) : null;
}

function cleanFlightInput(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const OPERATING_IATA_TO_ICAO = Object.freeze({
  OO:'SKW', '9E':'EDV', YX:'RPA', OH:'JIA', MQ:'ENY', YV:'ASH',
  QX:'QXE', G7:'GJS', ZW:'AWI', C5:'UCA', PT:'PDT'
});

function normalizeOperatingPrefix(value) {
  const compact = cleanFlightInput(value);
  if (/^[A-Z]{3}$/.test(compact)) return compact;
  if (/^[A-Z0-9]{2}$/.test(compact)) return OPERATING_IATA_TO_ICAO[compact] || null;
  return null;
}

function callsignSuffixVariants(value) {
  const suffix = String(value || '').trim().toUpperCase();
  if (!/^\d+$/.test(suffix)) return suffix ? [suffix] : [];
  if (suffix.length >= 3) return [suffix];
  return [...new Set([
    suffix,
    ...(suffix.length === 1 ? [suffix.padStart(2,'0')] : []),
    suffix.padStart(3,'0'),
    suffix.padStart(4,'0')
  ])];
}

function normalizeFlightInput(value, operatingCarrier = null) {
  const compact = cleanFlightInput(value);
  const iata = compact.match(/^([A-Z0-9]{2})([0-9]{1,4}[A-Z]?)$/);
  if (iata) {
    const prefix = iata[1];
    const suffix = iata[2];
    const operators = IATA_TO_CALLSIGNS[prefix];
    if (!operators) return { ok:false, code:'unsupported-airline', input:compact };
    const primary = operators[0];
    const paddedPrimary = callsignSuffixVariants(suffix).map(number => primary + number);
    const otherOperators = operators.slice(1).map(code => code + suffix);
    const operatingPrefix = normalizeOperatingPrefix(operatingCarrier);
    return {
      ok:true,
      input:compact,
      display: prefix + suffix,
      marketingCode: prefix,
      number: suffix,
      airline: AIRLINE_NAMES[prefix] || prefix,
      callsigns:[...new Set([
        ...paddedPrimary,
        ...otherOperators,
        ...(operatingPrefix ? [operatingPrefix + suffix] : [])
      ])]
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


async function getText(url, timeoutMs = 5500, maxBytes = AIRPORT_INDEX_MAX_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers:{
        accept:'text/csv,text/plain;q=0.9,*/*;q=0.1',
        'user-agent':'ChrisIzworski-FlightTracker/1.0 (+https://chrisizworski.com/flight-tracker/)'
      },
      signal:controller.signal
    });
    if (!response.ok) throw new Error('upstream ' + response.status);
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error('upstream file too large');
    const text = await response.text();
    if (!text || text.length > maxBytes) throw new Error('upstream file invalid');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function parseCsvLine(line) {
  const cells = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      cells.push(value);
      value = '';
    } else {
      value += ch;
    }
  }
  cells.push(value);
  return cells;
}

function buildAirportIndex(csvText) {
  const index = new Map();
  const lines = String(csvText || '').split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const row = parseCsvLine(lines[i]);
    if (row.length < 8) continue;
    const lat = finiteNumber(row[6]);
    const lon = finiteNumber(row[7]);
    if (lat === null || lon === null) continue;
    const airport = {
      code:String(row[0] || '').trim() || null,
      name:String(row[1] || '').trim() || null,
      icao:String(row[2] || '').trim() || null,
      iata:String(row[3] || '').trim() || null,
      city:String(row[4] || '').trim() || null,
      country:String(row[5] || '').trim() || null,
      lat,
      lon
    };
    for (const key of [airport.iata, airport.icao, airport.code]) {
      const normalized = String(key || '').trim().toUpperCase();
      if (normalized && !index.has(normalized)) index.set(normalized, airport);
    }
  }
  return index;
}

async function getAirportIndex() {
  if (!airportIndexPromise) {
    airportIndexPromise = (async () => buildAirportIndex(await getText(VRS_AIRPORTS_URL)))()
      .catch(error => {
        airportIndexPromise = null;
        throw error;
      });
  }
  return airportIndexPromise;
}

async function lookupAirportCoordinates(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(code)) return null;
  try {
    const index = await getAirportIndex();
    return index.get(code) || null;
  } catch {
    return null;
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

function normalizeRegistration(value) {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return /^[A-Z0-9][A-Z0-9-]{2,9}$/.test(compact) ? compact : null;
}

function sanitizeSeenAircraft(ac, requestedRegistration) {
  const altitudeRaw = typeof ac?.alt_baro === 'number' ? ac.alt_baro : finiteNumber(ac?.alt_geom);
  return {
    callsign:String(ac?.flight || '').trim() || null,
    hex:String(ac?.hex || '').trim() || null,
    registration:String(ac?.r || requestedRegistration || '').trim() || requestedRegistration || null,
    aircraftType:String(ac?.t || '').trim() || null,
    aircraftTypeName:aircraftTypeName(ac?.t),
    altitudeFeet:altitudeRaw,
    onGround:ac?.alt_baro === 'ground' || ac?.on_ground === true,
    speedKnots:finiteNumber(ac?.gs),
    trackDegrees:finiteNumber(ac?.track ?? ac?.true_heading ?? ac?.mag_heading),
    verticalRateFpm:finiteNumber(ac?.baro_rate ?? ac?.geom_rate),
    lastSeenSeconds:finiteNumber(ac?.seen),
    sourceType:String(ac?.type || '').trim() || null
  };
}

async function lookupRegistration(registration) {
  try {
    const data = await getJson(ADSB_BASE + '/v2/reg/' + encodeURIComponent(registration));
    const aircraft = Array.isArray(data?.ac) ? data.ac : [];
    if (!aircraft.length) return { status:'none', aircraft:null, seen:null };

    const exact = aircraft.filter(ac => String(ac?.r || '').trim().toUpperCase() === registration);
    const candidates = exact.length ? exact : aircraft;
    candidates.sort((a,b) => (finiteNumber(a?.seen_pos) ?? finiteNumber(a?.seen) ?? 9999) - (finiteNumber(b?.seen_pos) ?? finiteNumber(b?.seen) ?? 9999));

    const raw = candidates[0];
    const positioned = sanitizeAircraft(raw, String(raw?.flight || '').trim() || null);
    if (positioned) return { status:'positioned', aircraft:positioned, seen:sanitizeSeenAircraft(raw, registration) };
    return { status:'seen-no-position', aircraft:null, seen:sanitizeSeenAircraft(raw, registration) };
  } catch {
    return { status:'error', aircraft:null, seen:null };
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


function headingDifferenceDegrees(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(((a - b + 540) % 360) - 180);
}

function roundedRelationshipMiles(distanceNm) {
  const miles = distanceNm * NM_TO_MILES;
  if (!Number.isFinite(miles) || miles < 0) return null;
  if (miles < 10) return Math.max(0, Math.round(miles));
  return Math.round(miles / 5) * 5;
}

function aircraftAirportRelationship(aircraft, airport, positionFresh) {
  if (!positionFresh || !airport ||
      !Number.isFinite(aircraft?.lat) || !Number.isFinite(aircraft?.lon) ||
      !Number.isFinite(airport?.lat) || !Number.isFinite(airport?.lon)) return null;

  const distanceNm = haversineNm(aircraft, airport);
  if (!Number.isFinite(distanceNm) || distanceNm < 0 || distanceNm > 7000) return null;

  const distanceMiles = roundedRelationshipMiles(distanceNm);
  const bearing = bearingDegrees(aircraft, airport);
  const divergence = headingDifferenceDegrees(aircraft.trackDegrees, bearing);
  const headingRelation = divergence === null
    ? 'unknown'
    : divergence <= 60
      ? 'toward'
      : divergence >= 120
        ? 'away'
        : 'crossing';
  const phase = flightPhase(aircraft, positionFresh);
  const altitude = aircraft.altitudeFeet;

  let state = 'distance-only';
  if (aircraft.onGround === true && distanceMiles !== null && distanceMiles <= 5) {
    state = 'at-airport';
  } else if (aircraft.onGround !== true && distanceMiles !== null && distanceMiles <= 120 &&
      headingRelation === 'toward' &&
      (phase.code === 'descending' || (Number.isFinite(altitude) && altitude <= 12000))) {
    state = 'approaching';
  } else if (distanceMiles !== null && distanceMiles <= 35) {
    state = 'nearby';
  } else if (aircraft.onGround !== true && distanceMiles !== null && distanceMiles <= 200 &&
      headingRelation === 'toward') {
    state = 'moving-toward';
  }

  return {
    airport:{
      code:airport.iata || airport.icao || airport.code || null,
      iata:airport.iata || null,
      icao:airport.icao || null,
      name:airport.name || null,
      city:airport.city || null,
      country:airport.country || null,
      lat:airport.lat,
      lon:airport.lon
    },
    distanceMiles,
    headingRelation,
    phase,
    state,
    basis:'latest-reported-position'
  };
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
  const spreadMinutes = latest - earliest;
  const maxUsefulSpread = Math.max(60, Math.min(120, Math.round(earliest * 0.45)));
  if (spreadMinutes > maxUsefulSpread) return result;
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

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean).map(value => String(value).trim()).filter(Boolean))];
}

async function recoverLiveFromPublicIdentity(normalized, identity, {
  resolveFlightFn=resolveFlight,
  lookupCallsignFn=lookupCallsign,
  lookupRegistrationFn=lookupRegistration
}={}) {
  if (!identity?.recognized) return null;
  const checkedCallsigns = [...normalized.callsigns];

  const operatingFlight = cleanFlightInput(identity.operatingFlight);
  if (operatingFlight && operatingFlight !== normalized.display) {
    const operatingNormalized = normalizeFlightInput(operatingFlight);
    if (operatingNormalized.ok) {
      checkedCallsigns.push(...operatingNormalized.callsigns);
      const operatingResolved = await resolveFlightFn(operatingNormalized);
      if (operatingResolved.status === 'unique' && operatingResolved.aircraft) {
        return {
          resolved:operatingResolved,
          identity,
          checkedCallsigns:uniqueStrings(checkedCallsigns),
          recoveredBy:'operating-flight-callsign'
        };
      }
    }
  }

  if (identity.callsign) {
    checkedCallsigns.push(identity.callsign);
    const aircraft = await lookupCallsignFn(identity.callsign);
    if (aircraft) {
      return {
        resolved:{status:'unique',aircraft},
        identity,
        checkedCallsigns:uniqueStrings(checkedCallsigns),
        recoveredBy:'resolved-callsign'
      };
    }
  }

  const registration = normalizeRegistration(identity.registration);
  if (registration) {
    const byRegistration = await lookupRegistrationFn(registration);
    if (byRegistration.status === 'positioned' && byRegistration.aircraft) {
      return {
        resolved:{status:'unique',aircraft:byRegistration.aircraft},
        identity,
        checkedCallsigns:uniqueStrings(checkedCallsigns),
        recoveredBy:'resolved-registration'
      };
    }
  }

  return {
    resolved:null,
    identity,
    checkedCallsigns:uniqueStrings(checkedCallsigns),
    recoveredBy:null
  };
}

function buildNotFound(normalized, context={}) {
  return {
    status:'not-found',
    flightNumber:normalized.display,
    airline:normalized.airline,
    message:'No live aircraft position found. The flight may not be airborne yet, may have landed, or may be using a different operating callsign.',
    checkedCallsigns:uniqueStrings(context.checkedCallsigns || normalized.callsigns),
    operatingFlightNumber:context.identity?.operatingFlight && context.identity.operatingFlight !== normalized.display
      ? context.identity.operatingFlight
      : null,
    publicIdentity:context.identity ? {
      recognized:true,
      operatingFlight:context.identity.operatingFlight || normalized.display,
      callsign:context.identity.callsign || null,
      registration:context.identity.registration || null,
      codeshare:context.identity.codeshare === true,
      source:context.identity.source || null
    } : null,
    source:{
      name:'ADSB.lol',
      url:'https://adsb.lol/',
      license:'ODbL 1.0'
    }
  };
}

async function buildRegistrationSnapshot(value, focusAirportCode = null) {
  const registration = normalizeRegistration(value);
  if (!registration) {
    return { status:'invalid', code:'invalid-registration', message:'Invalid aircraft registration.' };
  }

  const resolved = await lookupRegistration(registration);
  if (resolved.status === 'error') {
    return { status:'error', registration, message:'Live aircraft data is temporarily unavailable.' };
  }
  if (resolved.status === 'none') {
    return {
      status:'not-found',
      registration,
      message:'The assigned aircraft is not currently reporting a live ADS-B position.',
      source:{name:'ADSB.lol',url:'https://adsb.lol/',license:'ODbL 1.0'}
    };
  }
  if (resolved.status === 'seen-no-position') {
    return {
      status:'seen-no-position',
      registration,
      aircraft:resolved.seen,
      message:'The aircraft is being seen by the network, but no current position is available.',
      source:{name:'ADSB.lol',url:'https://adsb.lol/',license:'ODbL 1.0'}
    };
  }

  const aircraft = resolved.aircraft;
  const route = await lookupRoute(aircraft);
  const age = aircraft.positionAgeSeconds;
  const positionFresh = Number.isFinite(age) && age >= 0 && age <= POSITION_MAX_AGE_SECONDS;
  const focusAirport = !route && focusAirportCode ? await lookupAirportCoordinates(focusAirportCode) : null;
  const focusAirportRelationship = focusAirport
    ? aircraftAirportRelationship(aircraft, focusAirport, positionFresh)
    : null;
  return {
    status:'live',
    generatedAt:new Date().toISOString(),
    lookup:'registration',
    registration,
    aircraft,
    operatingFlightNumber:marketingFlightFromCallsign(aircraft.callsign),
    route,
    focusAirportRelationship,
    positionFresh,
    progress:flightProgress(aircraft, route, positionFresh),
    source:{
      name:'ADSB.lol',
      url:'https://adsb.lol/',
      api:'https://api.adsb.lol/',
      license:'ODbL 1.0',
      note:'Live ADS-B/MLAT position for the assigned aircraft registration.'
    }
  };
}

async function buildSnapshot(value, operatingCarrier = null) {
  const normalized = normalizeFlightInput(value, operatingCarrier);
  if (!normalized.ok) {
    return {
      status:'invalid',
      code:normalized.code,
      message:normalized.code === 'unsupported-airline'
        ? 'That airline code is not in the tracker yet.'
        : 'Enter a flight number like DL1234, AA86 or UAL2380.'
    };
  }

  let resolved = await resolveFlight(normalized);
  let identity = null;
  let recovery = null;

  if (resolved.status !== 'unique' || !resolved.aircraft) {
    identity = await resolvePublicFlightIdentity(normalized.display);
    if (identity) recovery = await recoverLiveFromPublicIdentity(normalized,identity);
    if (recovery?.resolved?.status === 'unique' && recovery.resolved.aircraft) {
      resolved = recovery.resolved;
    }
  }

  if (resolved.status === 'ambiguous') {
    return {
      status:'ambiguous',
      flightNumber:normalized.display,
      airline:normalized.airline,
      message:'More than one live aircraft matched this flight number, so the tracker will not guess.',
      checkedCallsigns:uniqueStrings(recovery?.checkedCallsigns || normalized.callsigns),
      matchedCallsigns:resolved.candidates || [],
      publicIdentity:identity || null
    };
  }
  if (resolved.status !== 'unique' || !resolved.aircraft) {
    return buildNotFound(normalized,{
      identity,
      checkedCallsigns:recovery?.checkedCallsigns || normalized.callsigns
    });
  }

  const route = resolved.route || await lookupRoute(resolved.aircraft);
  const age = resolved.aircraft.positionAgeSeconds;
  const positionFresh = Number.isFinite(age) && age >= 0 && age <= POSITION_MAX_AGE_SECONDS;
  const operatingFlightNumber = identity?.operatingFlight && identity.operatingFlight !== normalized.display
    ? identity.operatingFlight
    : marketingFlightFromCallsign(resolved.aircraft?.callsign);
  const checkedCallsigns = uniqueStrings(recovery?.checkedCallsigns || normalized.callsigns);

  return {
    status:'live',
    generatedAt:new Date().toISOString(),
    flightNumber:normalized.display,
    airline:normalized.airline,
    checkedCallsigns,
    matchedCallsign:resolved.aircraft?.callsign || null,
    operatingFlightNumber:operatingFlightNumber || null,
    codeshare:identity?.codeshare === true ? {
      marketingFlightNumber:normalized.display,
      operatingFlightNumber:identity.operatingFlight,
      source:identity.source || null
    } : null,
    identityRecovery:recovery?.recoveredBy ? {
      kind:recovery.recoveredBy,
      source:identity?.source || null
    } : null,
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
  const registration = Array.isArray(req.query?.registration) ? req.query.registration[0] : req.query?.registration;
  const focusAirport = Array.isArray(req.query?.focusAirport) ? req.query.focusAirport[0] : req.query?.focusAirport;
  const operatingCarrier = Array.isArray(req.query?.operatingCarrier) ? req.query.operatingCarrier[0] : req.query?.operatingCarrier;
  try {
    const body = registration ? await buildRegistrationSnapshot(registration, focusAirport) : await buildSnapshot(value, operatingCarrier);
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
  callsignSuffixVariants,
  normalizeFlightInput,
  normalizeOperatingPrefix,
  normalizeRegistration,
  marketingFlightFromCallsign,
  actualPosition,
  sanitizeAircraft,
  sanitizeSeenAircraft,
  lookupRegistration,
  chooseUnique,
  recoverLiveFromPublicIdentity,
  buildSnapshot,
  buildRegistrationSnapshot,
  parseCsvLine,
  buildAirportIndex,
  lookupAirportCoordinates,
  aircraftAirportRelationship,
  headingDifferenceDegrees,
  roundedRelationshipMiles,
  haversineNm,
  routeLooksPlausible,
  flightPhase,
  flightProgress,
  bearingDegrees,
  aircraftTypeName,
  AIRCRAFT_TYPE_NAMES,
  IATA_TO_CALLSIGNS,
  OPERATING_IATA_TO_ICAO
};
