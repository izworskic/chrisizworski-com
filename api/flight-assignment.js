'use strict';

const FLIGHTSTATS_BASE = 'https://www.flightstats.com/v2';
const CACHE_SECONDS = 30;
const MAX_HTML_BYTES = 1_500_000;
const RECENT_ARRIVAL_LOOKBACK_MS = 12 * 60 * 60 * 1000;
const RECENT_ARRIVAL_LOOKAHEAD_MS = 2 * 60 * 60 * 1000;
const RECENT_ARRIVAL_MAX_DETAILS = 24;
const RECENT_ARRIVAL_BATCH_SIZE = 6;
const ADSB_BASE = 'https://api.adsb.lol';
const VRS_ROUTES_BASE = 'https://vrs-standing-data.adsb.lol/routes';
const POSITION_MAX_AGE_SECONDS = 15 * 60;
const FR24_READER_BASE = 'https://r.jina.ai/https://www.flightradar24.com/data/flights/';
const FR24_PUBLIC_BASE = 'https://www.flightradar24.com/data/flights/';
const FR24_AIRCRAFT_READER_BASE = 'https://r.jina.ai/https://www.flightradar24.com/data/aircraft/';
const FR24_AIRCRAFT_PUBLIC_BASE = 'https://www.flightradar24.com/data/aircraft/';
const FR24_FALLBACK_TIMEOUT_MS = 9500;
const ASSIGNMENT_CACHE_PREFIX = 'flight:assignment:v2:';
const ASSIGNMENT_CACHE_TTL_SECONDS = 18 * 60 * 60;
const INBOUND_CACHE_PREFIX = 'flight:inbound:v1:';
const INBOUND_CACHE_TTL_SECONDS = 12 * 60 * 60;
const CODESHARE_CACHE_PREFIX = 'flight:codeshare:v1:';
const CODESHARE_CACHE_TTL_SECONDS = 24 * 60 * 60;
const CODESHARE_READER_BASE = 'https://r.jina.ai/https://info.flightmapper.net/flight/';
const CODESHARE_TIMEOUT_MS = 6500;
const FLIGHTMAPPER_AIRLINE_SLUGS = Object.freeze({
  DL:'Delta_Air_Lines', VS:'Virgin_Atlantic', KL:'KLM', AF:'Air_France', WS:'WestJet', BA:'British_Airways',
  LH:'Lufthansa', AC:'Air_Canada', KE:'Korean_Air', QF:'Qantas', NZ:'Air_New_Zealand'
});
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
let sourceConflictCount = 0;

const REGIONAL_IATA_TO_ICAO = Object.freeze({
  OO:'SKW', '9E':'EDV', YX:'RPA', OH:'JIA', MQ:'ENY', YV:'ASH',
  QX:'QXE', G7:'GJS', ZW:'AWI', C5:'UCA', PT:'PDT'
});

const ICAO_TO_IATA = Object.freeze({
  AAL:'AA', DAL:'DL', UAL:'UA', SWA:'WN', ASA:'AS', JBU:'B6', NKS:'NK',
  FFT:'F9', AAY:'G4', HAL:'HA', SCX:'SY', MXY:'MX', VXP:'XP', ACA:'AC',
  WJA:'WS', SIL:'3M', AMX:'AM', AVA:'AV', CMP:'CM', POE:'PD', TSC:'TS',
  BAW:'BA', DLH:'LH', AFR:'AF', KLM:'KL', EIN:'EI', ICE:'FI', VIR:'VS',
  THY:'TK', UAE:'EK', QTR:'QR', ANA:'NH', JAL:'JL', SIA:'SQ', QFA:'QF',
  ANZ:'NZ', AIC:'AI', KAL:'KE'
});

function clean(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeMarketingFlight(value) {
  const compact = clean(value);
  const match = compact.match(/^([A-Z0-9]{2})([0-9]{1,4}[A-Z]?)$/);
  if (!match) return { ok:false, code:'invalid-flight', input:compact };
  return {
    ok:true,
    input:compact,
    display:match[1] + match[2],
    carrier:match[1],
    number:match[2]
  };
}

function normalizeDate(value) {
  const raw = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year,month,day] = raw.split('-').map(Number);
  const d = new Date(Date.UTC(year,month - 1,day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return { raw,year,month,day };
}

function parseNextData(html) {
  const text = String(html || '');
  const marker = '__NEXT_DATA__ = ';
  const start = text.indexOf(marker);
  if (start >= 0) {
    const jsonStart = start + marker.length;
    const endMarker = ';__NEXT_LOADED_PAGES__';
    const end = text.indexOf(endMarker, jsonStart);
    if (end < 0) throw new Error('Flight status structured data was incomplete');
    return JSON.parse(text.slice(jsonStart, end));
  }

  const script = text.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (script?.[1]) return JSON.parse(script[1]);
  throw new Error('Flight status page did not contain structured data');
}

function redisReady() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function redisCommand(command) {
  if (!redisReady()) return null;
  const response = await fetch(REDIS_URL,{
    method:'POST',
    headers:{authorization:'Bearer ' + REDIS_TOKEN,'content-type':'application/json'},
    body:JSON.stringify(command),
    signal:AbortSignal.timeout(3500)
  });
  if (!response.ok) throw new Error('assignment cache ' + response.status);
  const body = await response.json();
  if (body?.error) throw new Error(String(body.error));
  return body?.result ?? null;
}

function assignmentCacheKey(flight,date,flightId=null) {
  return ASSIGNMENT_CACHE_PREFIX + [clean(flight),String(date || ''),String(flightId || 'route-list')].join(':');
}

async function readAssignmentCache(flight,date,flightId=null) {
  try {
    const raw = await redisCommand(['GET',assignmentCacheKey(flight,date,flightId)]);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !['found','choose-flight'].includes(parsed.status)) return null;
    return {
      ...parsed,
      fallback:{
        kind:'last-good-assignment-cache',
        stale:true,
        note:'The live assignment source is temporarily unavailable; this is the most recent confirmed assignment.'
      }
    };
  } catch {
    return null;
  }
}

async function writeAssignmentCache(flight,date,flightId,value) {
  if (!redisReady() || !value || !['found','choose-flight'].includes(value.status)) return;
  try {
    await redisCommand(['SET',assignmentCacheKey(flight,date,flightId),JSON.stringify(value),'EX',ASSIGNMENT_CACHE_TTL_SECONDS]);
  } catch {}
}

function inboundCacheKey(date,tail,airport) {
  return INBOUND_CACHE_PREFIX + [String(date || ''),clean(tail),clean(airport)].join(':');
}

async function readInboundCache(date,tail,airport) {
  try {
    const raw=await redisCommand(['GET',inboundCacheKey(date,tail,airport)]);
    if (!raw) return null;
    const parsed=JSON.parse(raw);
    return parsed?.flightNumber && parsed?.tailNumber ? parsed : null;
  } catch {
    return null;
  }
}

async function writeInboundCache(date,tail,airport,occurrence) {
  if (!redisReady() || !occurrence) return;
  try {
    await redisCommand(['SET',inboundCacheKey(date,tail,airport),JSON.stringify(occurrence),'EX',INBOUND_CACHE_TTL_SECONDS]);
  } catch {}
}

function codeshareCacheKey(marketingFlight,date,assignment) {
  return CODESHARE_CACHE_PREFIX + [
    clean(marketingFlight),String(date || ''),clean(assignment?.tailNumber),
    airportCode(assignment?.origin),airportCode(assignment?.destination)
  ].join(':');
}

async function readCodeshareCache(marketingFlight,date,assignment) {
  try {
    const raw=await redisCommand(['GET',codeshareCacheKey(marketingFlight,date,assignment)]);
    if (!raw) return null;
    const parsed=JSON.parse(raw);
    return parsed?.operatingFlight ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCodeshareCache(marketingFlight,date,assignment,value) {
  if (!redisReady() || !value?.operatingFlight) return;
  try {
    await redisCommand([
      'SET',codeshareCacheKey(marketingFlight,date,assignment),
      JSON.stringify(value),'EX',CODESHARE_CACHE_TTL_SECONDS
    ]);
  } catch {}
}

function operatingCarrierSummary(flight, flexTrack = {}) {
  const raw = flight?.operatedBy;
  const code = String(
    (raw && typeof raw === 'object' ? raw.fs : '') ||
    flexTrack?.carrierFsCode ||
    ''
  ).trim().toUpperCase() || null;
  let name = null;
  if (typeof raw === 'string') {
    const match = raw.match(/^Operated by\s+(.+?)(?:\s+on behalf of\s+.+)?$/i);
    name = String(match?.[1] || raw).trim() || null;
  } else if (raw && typeof raw === 'object') {
    name = String(raw.name || '').trim() || null;
  }
  if (!name && !code) return null;
  return {
    name,
    code,
    icaoCallsignPrefix:REGIONAL_IATA_TO_ICAO[code] || null
  };
}

function baseFlightMatchesDate(flightData, normalizedDate) {
  if (!flightData || !normalizedDate) return false;
  const localDate = String(flightData?.departureAirport?.date || flightData?.schedule?.scheduledDeparture || '').slice(0,10);
  if (localDate) return localDate === normalizedDate.raw;
  const utcDate = String(flightData?.schedule?.scheduledDepartureUTC || '').slice(0,10);
  return utcDate === normalizedDate.raw;
}

function optionDate(option) {
  const raw = String(option?.url || '');
  const match = raw.match(/[?&]year=(\d{4})&month=(\d{1,2})&date=(\d{1,2})&flightId=(\d+)/);
  if (!match) return null;
  return {
    year:Number(match[1]),
    month:Number(match[2]),
    day:Number(match[3]),
    flightId:String(match[4])
  };
}

function airportSummary(ap) {
  if (!ap) return null;
  return {
    iata:String(ap.iata || ap.fs || '').trim() || null,
    code:String(ap.fs || ap.iata || '').trim() || null,
    name:String(ap.name || '').trim() || null,
    city:String(ap.city || '').trim() || null,
    state:String(ap.state || '').trim() || null,
    country:String(ap.country || '').trim() || null,
    gate:String(ap.gate || '').trim() || null,
    terminal:String(ap.terminal || '').trim() || null,
    timezone:String(ap.timeZoneRegionName || '').trim() || null,
    localDateTime:String(ap.date || '').trim() || null,
    scheduledTime:ap?.times?.scheduled ? {
      time:String(ap.times.scheduled.time || '').trim() || null,
      ampm:String(ap.times.scheduled.ampm || '').trim() || null,
      time24:String(ap.times.scheduled.time24 || '').trim() || null,
      timezone:String(ap.times.scheduled.timezone || '').trim() || null
    } : null,
    estimatedTime:ap?.times?.estimatedActual ? {
      title:String(ap.times.estimatedActual.title || '').trim() || null,
      time:String(ap.times.estimatedActual.time || '').trim() || null,
      ampm:String(ap.times.estimatedActual.ampm || '').trim() || null,
      time24:String(ap.times.estimatedActual.time24 || '').trim() || null,
      timezone:String(ap.times.estimatedActual.timezone || '').trim() || null
    } : null
  };
}

function sanitizeOption(option) {
  const d = optionDate(option);
  if (!d) return null;
  return {
    flightId:d.flightId,
    date:`${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`,
    sourcePath:String(option.url || ''),
    sortTime:String(option.sortTime || '').trim() || null,
    origin:airportSummary(option.departureAirport),
    destination:airportSummary(option.arrivalAirport),
    departureTime:String(option.departureTime || '').trim() || null,
    departureAmPm:String(option.departureTimeAmPm || '').trim() || null,
    departureTimezone:String(option.departureTimezone || '').trim() || null,
    arrivalTime:String(option.arrivalTime || '').trim() || null,
    arrivalAmPm:String(option.arrivalTimeAmPm || '').trim() || null,
    arrivalTimezone:String(option.arrivalTimezone || '').trim() || null
  };
}

function optionsForDate(nextData, date) {
  const days = nextData?.props?.initialState?.flightTracker?.otherDays;
  if (!Array.isArray(days)) return [];
  const options = [];
  for (const day of days) {
    for (const item of (Array.isArray(day?.flights) ? day.flights : [])) {
      const parsed = sanitizeOption(item);
      if (!parsed) continue;
      if (parsed.date === date.raw) options.push(parsed);
    }
  }
  return options.sort((a,b) => String(a.sortTime || '').localeCompare(String(b.sortTime || '')));
}



function normalizeAirportCode(value) {
  const compact = clean(value);
  return /^[A-Z0-9]{3,4}$/.test(compact) ? compact : null;
}

function normalizeCarrierCode(value) {
  const compact = clean(value);
  return /^[A-Z0-9]{2}$/.test(compact) ? compact : null;
}

function recentArrivalCandidates(nextData, { carrier, airport, nowMs = Date.now() }) {
  const flights = nextData?.props?.initialState?.flightTracker?.route?.flights;
  if (!Array.isArray(flights)) return [];

  const seen = new Set();
  const candidates = [];
  for (const item of flights) {
    const itemCarrier = clean(item?.carrier?.fs);
    const number = clean(item?.carrier?.flightNumber);
    if (itemCarrier !== carrier || !number) continue;
    if (item?.operatedBy) continue;

    const d = optionDate(item);
    if (!d || seen.has(d.flightId)) continue;

    const sortMs = Date.parse(String(item?.sortTime || ''));
    if (!Number.isFinite(sortMs)) continue;
    const delta = sortMs - nowMs;
    if (delta < -RECENT_ARRIVAL_LOOKBACK_MS || delta > RECENT_ARRIVAL_LOOKAHEAD_MS) continue;

    seen.add(d.flightId);
    candidates.push({
      flightId:d.flightId,
      flightNumber:itemCarrier + number,
      sourcePath:String(item.url || ''),
      sortTime:String(item.sortTime || '').trim() || null,
      sortMs,
      origin:{
        iata:String(item?.airport?.fs || '').trim() || null,
        code:String(item?.airport?.fs || '').trim() || null,
        city:String(item?.airport?.city || '').trim() || null
      },
      destination:{iata:airport,code:airport}
    });
  }

  return candidates
    .sort((a,b) => Math.abs(a.sortMs - nowMs) - Math.abs(b.sortMs - nowMs))
    .slice(0, RECENT_ARRIVAL_MAX_DETAILS);
}

function recentArrivalMatchScore(occurrence, candidate, nowMs = Date.now()) {
  const stateScore = occurrence?.flightStatus?.landed === true
    ? 2
    : occurrence?.flightStatus?.airborne === true
      ? 3
      : 1;
  const distanceHours = Math.min(12, Math.abs((candidate?.sortMs || nowMs) - nowMs) / 3600000);
  return stateScore * 100 - distanceHours;
}

function recentArrivalSummary(occurrence, boardUrl) {
  if (!occurrence) return null;
  return {
    ...previousOccurrenceSummary(occurrence),
    evidence:{
      kind:'recent-arrival-same-tail-at-origin',
      note:'Confirmed from a recent arrival at the passenger departure airport with the same aircraft tail.'
    },
    source:{
      ...(occurrence.source || {}),
      boardUrl
    }
  };
}

async function lookupRecentArrivalByTail({ tail, airport, carrier, nowMs = Date.now() }) {
  const normalizedTail = clean(tail);
  const normalizedAirport = normalizeAirportCode(airport);
  const normalizedCarrier = normalizeCarrierCode(carrier);
  if (!/^[A-Z0-9-]{3,10}$/.test(normalizedTail) || !normalizedAirport || !normalizedCarrier) {
    return { status:'invalid', code:'invalid-inbound-recovery', message:'Invalid aircraft, airport, or airline code.' };
  }

  const boardUrl = `${FLIGHTSTATS_BASE}/flight-tracker/arrivals/${encodeURIComponent(normalizedAirport)}/${encodeURIComponent(normalizedCarrier)}`;
  const boardHtml = await fetchText(boardUrl);
  const boardData = parseNextData(boardHtml);
  const candidates = recentArrivalCandidates(boardData, {
    carrier:normalizedCarrier,
    airport:normalizedAirport,
    nowMs
  });

  const matches = [];
  for (let i = 0; i < candidates.length; i += RECENT_ARRIVAL_BATCH_SIZE) {
    const batch = candidates.slice(i, i + RECENT_ARRIVAL_BATCH_SIZE);
    const details = await Promise.all(batch.map(async candidate => {
      try {
        const detailUrl = FLIGHTSTATS_BASE + candidate.sourcePath;
        const detailHtml = await fetchText(detailUrl);
        const detailData = parseNextData(detailHtml);
        const flightData = detailData?.props?.initialState?.flightTracker?.flight;
        if (!flightData?.flightId) return null;
        const marketingFlight = {
          display:candidate.flightNumber,
          carrier:candidate.flightNumber.slice(0,2),
          number:candidate.flightNumber.slice(2)
        };
        const occurrence = sanitizeFlight(flightData, marketingFlight, detailUrl);
        if (!sameTail(occurrence.tailNumber, normalizedTail)) return null;
        if (clean(occurrence?.destination?.iata || occurrence?.destination?.code) !== normalizedAirport) return null;
        return {occurrence,candidate};
      } catch {
        return null;
      }
    }));

    for (const detail of details) if (detail) matches.push(detail);

    const strong = matches
      .filter(({occurrence}) => occurrence?.flightStatus?.landed === true ||
        (occurrence?.flightStatus?.airborne === true && occurrence?.flightStatus?.landed !== true))
      .sort((a,b) => recentArrivalMatchScore(b.occurrence,b.candidate,nowMs) - recentArrivalMatchScore(a.occurrence,a.candidate,nowMs));
    if (strong.length) {
      return {
        status:'found-inbound-occurrence',
        tailNumber:normalizedTail,
        airport:normalizedAirport,
        occurrence:recentArrivalSummary(strong[0].occurrence, boardUrl),
        source:{name:'FlightStats public arrivals tracker',url:boardUrl}
      };
    }
  }

  if (matches.length) {
    matches.sort((a,b) => recentArrivalMatchScore(b.occurrence,b.candidate,nowMs) - recentArrivalMatchScore(a.occurrence,a.candidate,nowMs));
    return {
      status:'found-inbound-occurrence',
      tailNumber:normalizedTail,
      airport:normalizedAirport,
      occurrence:recentArrivalSummary(matches[0].occurrence, boardUrl),
      source:{name:'FlightStats public arrivals tracker',url:boardUrl}
    };
  }

  return {
    status:'not-found',
    tailNumber:normalizedTail,
    airport:normalizedAirport,
    message:'No recent same-tail arrival was confirmed at the departure airport.',
    source:{name:'FlightStats public arrivals tracker',url:boardUrl}
  };
}

async function lookupRecentArrivalWithCache({tail,airport,carrier,date,nowMs = Date.now()}) {
  const normalizedTail = clean(tail);
  const normalizedAirport = normalizeAirportCode(airport);
  const normalizedCarrier = normalizeCarrierCode(carrier);
  const normalizedDate = normalizeDate(date);
  if (!/^[A-Z0-9-]{3,10}$/.test(normalizedTail) || !normalizedAirport || !normalizedCarrier) {
    return {status:'invalid',code:'invalid-inbound-recovery',message:'Invalid aircraft, airport, or airline code.'};
  }

  let liveResult = null;
  let liveError = null;
  try {
    liveResult = await lookupRecentArrivalByTail({
      tail:normalizedTail,
      airport:normalizedAirport,
      carrier:normalizedCarrier,
      nowMs
    });
    if (liveResult?.status === 'found-inbound-occurrence' && liveResult.occurrence) {
      if (normalizedDate) {
        await writeInboundCache(normalizedDate.raw,normalizedTail,normalizedAirport,liveResult.occurrence);
      }
      return liveResult;
    }
  } catch (error) {
    liveError = error;
  }

  if (normalizedDate) {
    const cached = await readInboundCache(normalizedDate.raw,normalizedTail,normalizedAirport);
    if (cached) {
      return {
        status:'found-inbound-occurrence',
        tailNumber:normalizedTail,
        airport:normalizedAirport,
        occurrence:cached,
        fallback:{
          kind:'last-confirmed-inbound-cache',
          stale:true,
          note:'The arrivals source is unavailable or no longer exposes this leg; using the last confirmed same-tail arrival for this travel date.'
        },
        source:{name:'Last confirmed inbound cache',kind:'durable-last-confirmed'}
      };
    }
  }

  if (liveResult) return liveResult;
  return {
    status:'source-unavailable',
    tailNumber:normalizedTail,
    airport:normalizedAirport,
    message:'Recent inbound-flight data is temporarily unavailable.',
    sourceError:String(liveError?.message || liveError || '')
  };
}


function sameTail(a, b) {
  return Boolean(a && b && clean(a) === clean(b));
}

function isMatchingAirborneOccurrence(candidate, selectedFlight) {
  return Boolean(
    candidate &&
    selectedFlight &&
    candidate.flightNumber === selectedFlight.flightNumber &&
    sameTail(candidate.tailNumber, selectedFlight.tailNumber) &&
    candidate.flightStatus?.airborne === true &&
    candidate.flightStatus?.landed !== true
  );
}


function isMatchingPreviousOccurrence(candidate, selectedFlight) {
  return Boolean(
    candidate &&
    selectedFlight &&
    candidate.flightNumber === selectedFlight.flightNumber &&
    sameTail(candidate.tailNumber, selectedFlight.tailNumber)
  );
}

function previousOccurrenceSummary(candidate) {
  if (!candidate) return null;
  return {
    flightNumber:candidate.flightNumber,
    flightId:candidate.flightId,
    tailNumber:candidate.tailNumber,
    origin:candidate.origin,
    destination:candidate.destination,
    schedule:candidate.schedule,
    flightStatus:candidate.flightStatus,
    assignmentState:candidate.assignmentState,
    note:candidate.note,
    evidence:{
      kind:'same-day-same-flight-same-tail-previous-occurrence',
      note:'Confirmed from the previous same-day occurrence with the same flight number and aircraft tail.'
    },
    source:candidate.source
  };
}

function currentOccurrenceSummary(candidate) {
  if (!candidate) return null;
  return {
    flightNumber:candidate.flightNumber,
    flightId:candidate.flightId,
    tailNumber:candidate.tailNumber,
    origin:candidate.origin,
    destination:candidate.destination,
    schedule:candidate.schedule,
    flightStatus:candidate.flightStatus,
    evidence:{
      kind:'same-day-same-flight-same-tail-airborne',
      note:'Confirmed from an earlier same-day occurrence with the same flight number and aircraft tail.'
    },
    source:candidate.source
  };
}

async function findCurrentAircraftOccurrence(options, selected, selectedFlight, marketingFlight) {
  if (!selectedFlight?.tailNumber || selectedFlight?.flightStatus?.airborne) return null;
  const selectedIndex = options.findIndex(option => option.flightId === selected.flightId);
  if (selectedIndex <= 0) return null;

  const candidates = options
    .slice(Math.max(0, selectedIndex - 3), selectedIndex)
    .reverse();

  for (const option of candidates) {
    try {
      const detailUrl = FLIGHTSTATS_BASE + option.sourcePath;
      const detailHtml = await fetchText(detailUrl);
      const detailData = parseNextData(detailHtml);
      const flightData = detailData?.props?.initialState?.flightTracker?.flight;
      if (!flightData?.flightId) continue;
      const occurrence = sanitizeFlight(flightData, marketingFlight, detailUrl);
      if (isMatchingAirborneOccurrence(occurrence, selectedFlight)) {
        return currentOccurrenceSummary(occurrence);
      }
    } catch {
      // Current-trip fusion is best effort. Never fail the selected flight lookup.
    }
  }
  return null;
}


async function findPreviousAircraftOccurrence(options, selected, selectedFlight, marketingFlight) {
  if (!selectedFlight?.tailNumber || selectedFlight?.flightStatus?.airborne) return null;
  const selectedIndex = options.findIndex(option => option.flightId === selected.flightId);
  if (selectedIndex <= 0) return null;

  const candidates = options
    .slice(Math.max(0, selectedIndex - 3), selectedIndex)
    .reverse();

  for (const option of candidates) {
    try {
      const detailUrl = FLIGHTSTATS_BASE + option.sourcePath;
      const detailHtml = await fetchText(detailUrl);
      const detailData = parseNextData(detailHtml);
      const flightData = detailData?.props?.initialState?.flightTracker?.flight;
      if (!flightData?.flightId) continue;
      const occurrence = sanitizeFlight(flightData, marketingFlight, detailUrl);
      if (isMatchingPreviousOccurrence(occurrence, selectedFlight)) return occurrence;
    } catch {
      // Previous-trip context is best effort. Never fail the selected flight lookup.
    }
  }
  return null;
}

function sanitizeFlight(flight, marketingFlight, detailUrl) {
  const note = flight?.flightNote || {};
  const status = flight?.status || {};
  const resultHeader = flight?.resultHeader || {};
  const flexTrack = flight?.positional?.flexTrack || {};
  const equipment = flight?.additionalFlightInfo?.equipment || {};
  const tail = String(
    flexTrack.tailNumber ||
    flight?.additionalFlightInfo?.tailNumber ||
    ''
  ).trim() || null;

  const canceled = note.canceled === true || /cancel/i.test(String(status.status || status.statusDescription || ''));
  const airborne = note.hasDepartedRunway === true || flight?.isTracking === true;
  const landed = flight?.isLanded === true || note.landed === true;

  let assignmentState = tail ? 'assigned' : 'unassigned';
  if (canceled) assignmentState = 'cancelled';
  else if (landed) assignmentState = 'landed';
  else if (airborne) assignmentState = 'airborne';

  return {
    status:'found',
    fetchedAt:new Date().toISOString(),
    flightNumber:marketingFlight.display,
    flightId:String(flight?.flightId || ''),
    assignmentState,
    tailNumber:tail,
    equipment:{
      code:String(equipment.iata || flexTrack.equipment || '').trim() || null,
      name:String(equipment.name || '').trim() || null,
      title:String(equipment.title || '').trim() || null
    },
    operatingCarrier:operatingCarrierSummary(flight, flexTrack),
    origin:airportSummary(flight?.departureAirport),
    destination:airportSummary(flight?.arrivalAirport),
    schedule:{
      scheduledDepartureUTC:String(flight?.schedule?.scheduledDepartureUTC || '').trim() || null,
      estimatedDepartureUTC:String(flight?.schedule?.estimatedActualDepartureUTC || '').trim() || null,
      actualDepartureUTC:String(flight?.schedule?.actualDepartureUTC || '').trim() ||
        ((airborne || landed)
          ? String(flight?.schedule?.estimatedActualDepartureUTC || '').trim() || null
          : null),
      scheduledArrivalUTC:String(flight?.schedule?.scheduledArrivalUTC || '').trim() || null,
      estimatedArrivalUTC:String(flight?.schedule?.estimatedActualArrivalUTC || '').trim() || null,
      actualArrivalUTC:landed
        ? String(flight?.schedule?.actualArrivalUTC || flight?.schedule?.estimatedActualArrivalUTC || '').trim() || null
        : null
    },
    flightStatus:{
      code:String(status.statusCode || '').trim() || null,
      label:String(status.status || '').trim() || null,
      description:String(status.statusDescription || status.delayStatus?.wording || '').trim() || null,
      departureDelayMinutes:Number.isFinite(Number(status?.delay?.departure?.minutes)) ? Number(status.delay.departure.minutes) : null,
      arrivalDelayMinutes:Number.isFinite(Number(status?.delay?.arrival?.minutes)) ? Number(status.delay.arrival.minutes) : null,
      lastUpdatedText:String(status.lastUpdatedText || '').trim() || null,
      canceled,
      airborne,
      landed
    },
    note:String(note.message || '').trim() || null,
    source:{
      name:'FlightStats public flight tracker',
      url:detailUrl,
      kind:'public-status-page',
      note:'Aircraft assignments can change before departure.'
    },
    sourceDebug:{
      resultCarrier:String(resultHeader?.carrier?.fs || '').trim() || null,
      resultFlightNumber:String(resultHeader.flightNumber || '').trim() || null
    }
  };
}


function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeTail(value) {
  const compact = String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g,'');
  return /^[A-Z0-9][A-Z0-9-]{2,9}$/.test(compact) ? compact : null;
}

function airportCode(ap) {
  return clean(ap?.iata || ap?.icao || ap?.code || '');
}

function carrierCode(flightNumber) {
  const compact = clean(flightNumber);
  return compact.length >= 2 ? compact.slice(0,2) : null;
}

function sameAirport(a,b) {
  const aa = airportCode(a);
  const bb = airportCode(b);
  return Boolean(aa && bb && aa === bb);
}

function marketingFlightFromCallsign(value) {
  const compact = clean(value);
  const match = compact.match(/^([A-Z]{3})([0-9]{1,4}[A-Z]?)$/);
  if (!match) return null;
  const iata = ICAO_TO_IATA[match[1]];
  return iata ? iata + match[2] : null;
}

async function fetchJson(url, timeoutMs = 5500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url,{
      headers:{
        accept:'application/json',
        'user-agent':'ChrisIzworski-FlightTracker/1.0 (+https://chrisizworski.com/flight-tracker/)'
      },
      signal:controller.signal
    });
    if (!response.ok) throw new Error('upstream ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeAdsbAircraft(ac, requestedTail) {
  const lat = finiteNumber(ac?.lat);
  const lon = finiteNumber(ac?.lon);
  if (lat === null || lon === null) return null;
  const altitudeRaw = typeof ac?.alt_baro === 'number' ? ac.alt_baro : finiteNumber(ac?.alt_geom);
  return {
    callsign:String(ac?.flight || '').trim() || null,
    hex:String(ac?.hex || '').trim() || null,
    registration:String(ac?.r || requestedTail || '').trim() || requestedTail || null,
    aircraftType:String(ac?.t || '').trim() || null,
    aircraftTypeName:null,
    lat,
    lon,
    altitudeFeet:altitudeRaw,
    onGround:ac?.alt_baro === 'ground' || ac?.on_ground === true,
    speedKnots:finiteNumber(ac?.gs),
    trackDegrees:finiteNumber(ac?.track ?? ac?.true_heading ?? ac?.mag_heading),
    verticalRateFpm:finiteNumber(ac?.baro_rate ?? ac?.geom_rate),
    positionAgeSeconds:finiteNumber(ac?.seen_pos),
    sourceType:String(ac?.type || '').trim() || null
  };
}

function sanitizeAdsbSeen(ac, requestedTail) {
  const altitudeRaw = typeof ac?.alt_baro === 'number' ? ac.alt_baro : finiteNumber(ac?.alt_geom);
  return {
    callsign:String(ac?.flight || '').trim() || null,
    hex:String(ac?.hex || '').trim() || null,
    registration:String(ac?.r || requestedTail || '').trim() || requestedTail || null,
    aircraftType:String(ac?.t || '').trim() || null,
    aircraftTypeName:null,
    altitudeFeet:altitudeRaw,
    onGround:ac?.alt_baro === 'ground' || ac?.on_ground === true,
    speedKnots:finiteNumber(ac?.gs),
    trackDegrees:finiteNumber(ac?.track ?? ac?.true_heading ?? ac?.mag_heading),
    verticalRateFpm:finiteNumber(ac?.baro_rate ?? ac?.geom_rate),
    lastSeenSeconds:finiteNumber(ac?.seen),
    sourceType:String(ac?.type || '').trim() || null
  };
}

function haversineNm(a,b) {
  const rad = degrees => degrees * Math.PI / 180;
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function routeLooksPlausible(aircraft,origin,destination) {
  const direct = haversineNm(origin,destination);
  const via = haversineNm(origin,aircraft) + haversineNm(aircraft,destination);
  if (!Number.isFinite(direct) || !Number.isFinite(via) || direct < 1) return false;
  return via <= direct + Math.max(250,direct * 0.30);
}

async function lookupAdsbRoute(aircraft) {
  try {
    const callsign = clean(aircraft?.callsign);
    if (!/^[A-Z0-9]{3,8}$/.test(callsign)) return null;
    const route = await fetchJson(
      VRS_ROUTES_BASE + '/' + encodeURIComponent(callsign.slice(0,2)) + '/' + encodeURIComponent(callsign) + '.json',
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
    const origin = cleanAirport(airports[0]);
    const destination = cleanAirport(airports[airports.length - 1]);
    if (origin.lat === null || origin.lon === null || destination.lat === null || destination.lon === null) return null;
    if (!routeLooksPlausible(aircraft,origin,destination)) return null;
    return {
      origin,
      destination,
      airportCodes:String(route._airport_codes_iata || route.airport_codes || '').trim() || null,
      plausible:true,
      source:{name:'VRS standing data via ADSB.lol',url:'https://github.com/adsblol/vrs-standing-data',license:'CC0 1.0'}
    };
  } catch {
    return null;
  }
}

function flightPhase(aircraft,positionFresh) {
  if (!positionFresh) return {code:'unknown',label:'Position not current'};
  if (aircraft?.onGround === true) return {code:'ground',label:'On ground'};
  const rate = aircraft?.verticalRateFpm;
  if (Number.isFinite(rate) && rate >= 400) return {code:'climbing',label:'Climbing'};
  if (Number.isFinite(rate) && rate <= -400) return {code:'descending',label:'Descending'};
  if (Number.isFinite(aircraft?.altitudeFeet) && aircraft.altitudeFeet >= 14000 &&
      Number.isFinite(aircraft?.speedKnots) && aircraft.speedKnots >= 250) {
    return {code:'cruising',label:'Cruising'};
  }
  if (Number.isFinite(aircraft?.speedKnots) && aircraft.speedKnots >= 100) return {code:'airborne',label:'In flight'};
  return {code:'unknown',label:'Phase unavailable'};
}

function bearingDegrees(a,b) {
  const rad = degrees => degrees * Math.PI / 180;
  const lat1 = rad(a.lat), lat2 = rad(b.lat);
  const dl = rad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dl);
  return (Math.atan2(y,x) * 180 / Math.PI + 360) % 360;
}

function flightProgress(aircraft,route,positionFresh) {
  const result = {
    phase:flightPhase(aircraft,positionFresh),
    remainingMiles:null,
    directDistanceMiles:null,
    directProgressPercent:null,
    remainingBasis:'straight-line',
    landingEstimate:null
  };
  if (!positionFresh || !route?.plausible || !route.destination) return result;
  const distanceNm = haversineNm(aircraft,route.destination);
  const directNm = route.origin ? haversineNm(route.origin,route.destination) : null;
  if (!Number.isFinite(distanceNm) || distanceNm < 0 || distanceNm > 7000) return result;
  result.remainingMiles = Math.round(distanceNm * 1.15077945 / 5) * 5;
  if (Number.isFinite(directNm) && directNm > 20) {
    result.directDistanceMiles = Math.round(directNm * 1.15077945 / 5) * 5;
    result.directProgressPercent = Math.round(Math.max(0,Math.min(1,1 - distanceNm / directNm)) * 20) * 5;
  }
  const speed = aircraft?.speedKnots;
  if (aircraft?.onGround === true || !Number.isFinite(speed) || speed < 150 || speed > 650 ||
      distanceNm < 20 || distanceNm > 5000) return result;
  if (Number.isFinite(aircraft?.trackDegrees)) {
    const divergence = Math.abs(((aircraft.trackDegrees - bearingDegrees(aircraft,route.destination) + 540) % 360) - 180);
    if (divergence > 100) return result;
  }
  const fastAverage = Math.min(600,Math.max(250,speed * 1.08));
  const slowAverage = Math.max(180,speed * 0.75);
  const fastestMinutes = distanceNm * 60 / fastAverage + 6;
  const slowestMinutes = distanceNm * 1.20 * 60 / slowAverage + 20;
  const step = distanceNm >= 500 ? 15 : 5;
  const earliest = Math.max(10,Math.floor(fastestMinutes / step) * step);
  const latest = Math.max(earliest + step * 2,Math.ceil(slowestMinutes / step) * step);
  const spread = latest - earliest;
  const maxUsefulSpread = Math.max(60,Math.min(120,Math.round(earliest * 0.45)));
  if (spread > maxUsefulSpread) return result;
  result.landingEstimate = {
    minMinutes:earliest,
    maxMinutes:latest,
    confidence:'rough',
    kind:'calculated-window',
    note:'Rough estimate from latest reported position and groundspeed; not an airline or ATC arrival time.'
  };
  return result;
}

async function buildAdsbRegistrationSnapshot(value) {
  const registration = normalizeTail(value);
  if (!registration) return {status:'invalid',code:'invalid-registration',message:'Invalid aircraft registration.'};
  try {
    const data = await fetchJson(ADSB_BASE + '/v2/reg/' + encodeURIComponent(registration));
    const aircraft = Array.isArray(data?.ac) ? data.ac : [];
    if (!aircraft.length) {
      return {
        status:'not-found',
        registration,
        message:'The assigned aircraft is not currently reporting a live ADS-B position.',
        source:{name:'ADSB.lol',url:'https://adsb.lol/',license:'ODbL 1.0'}
      };
    }
    const exact = aircraft.filter(ac => String(ac?.r || '').trim().toUpperCase() === registration);
    const candidates = exact.length ? exact : aircraft;
    candidates.sort((a,b) =>
      (finiteNumber(a?.seen_pos) ?? finiteNumber(a?.seen) ?? 9999) -
      (finiteNumber(b?.seen_pos) ?? finiteNumber(b?.seen) ?? 9999)
    );
    const raw = candidates[0];
    const positioned = sanitizeAdsbAircraft(raw,registration);
    if (!positioned) {
      return {
        status:'seen-no-position',
        registration,
        aircraft:sanitizeAdsbSeen(raw,registration),
        message:'The aircraft is being seen by the network, but no current position is available.',
        source:{name:'ADSB.lol',url:'https://adsb.lol/',license:'ODbL 1.0'}
      };
    }
    const age = positioned.positionAgeSeconds;
    const positionFresh = Number.isFinite(age) && age >= 0 && age <= POSITION_MAX_AGE_SECONDS;
    const route = await lookupAdsbRoute(positioned);
    return {
      status:'live',
      generatedAt:new Date().toISOString(),
      lookup:'registration',
      registration,
      aircraft:positioned,
      operatingFlightNumber:marketingFlightFromCallsign(positioned.callsign),
      route,
      focusAirportRelationship:null,
      positionFresh,
      progress:flightProgress(positioned,route,positionFresh),
      source:{
        name:'ADSB.lol',
        url:'https://adsb.lol/',
        api:'https://api.adsb.lol/',
        license:'ODbL 1.0',
        note:'Live ADS-B/MLAT position for the assigned aircraft registration.'
      }
    };
  } catch {
    return {status:'error',registration,message:'Live aircraft data is temporarily unavailable.'};
  }
}

function isDiverted(assignment) {
  const text = [assignment?.flightStatus?.label,assignment?.flightStatus?.description,assignment?.note]
    .filter(Boolean).join(' ');
  return /divert/i.test(text);
}

function positionObservation(live,nowMs = Date.now()) {
  const aircraft = live?.aircraft;
  const ageSeconds = Number(aircraft?.positionAgeSeconds);
  const hasPosition = Number.isFinite(Number(aircraft?.lat)) && Number.isFinite(Number(aircraft?.lon));
  if (!hasPosition) {
    return {
      hasPosition:false,fixTimestamp:null,fixAgeSeconds:null,displayAgeSeconds:null,
      fixAgeMinutes:null,fresh:false,onGround:null,source:'ADSB.lol'
    };
  }
  const validAge = Number.isFinite(ageSeconds) && ageSeconds >= 0 ? ageSeconds : null;
  const fixTimestamp = validAge === null ? null : new Date(nowMs - validAge * 1000).toISOString();
  const displayAgeSeconds = validAge === null ? null :
    validAge < 60 ? 0 :
    validAge < 90 * 60 ? Math.floor(validAge / 60) * 60 :
    Math.floor(validAge / 3600) * 3600;
  return {
    hasPosition:true,
    fixTimestamp,
    fixAgeSeconds:validAge,
    displayAgeSeconds,
    fixAgeMinutes:validAge === null ? null : Math.max(0,Math.round(validAge / 60)),
    fresh:validAge !== null && validAge <= POSITION_MAX_AGE_SECONDS,
    onGround:aircraft?.onGround === true,
    source:'ADSB.lol'
  };
}

function confirmedArrival(assignment) {
  if (assignment?.flightStatus?.landed === true) return true;
  return Boolean(String(assignment?.schedule?.actualArrivalUTC || '').trim());
}

function strongStatusState(assignment) {
  if (assignment?.flightStatus?.canceled === true) return 'canceled';
  if (confirmedArrival(assignment)) return 'landed';
  if (assignment?.flightStatus?.airborne === true) return 'airborne';
  return 'scheduled';
}

function departedOverHourAgo(assignment,nowMs = Date.now()) {
  const actual = Date.parse(assignment?.schedule?.actualDepartureUTC || '');
  return Number.isFinite(actual) && nowMs - actual >= 60 * 60 * 1000;
}

function recentInboundAtOrigin(assignment,occurrence) {
  return Boolean(
    occurrence &&
    occurrence?.flightStatus?.landed === true &&
    sameTail(occurrence?.tailNumber,assignment?.tailNumber) &&
    sameAirport(occurrence?.destination,assignment?.origin)
  );
}

function reconcileFlightState({assignment,live,recentInboundOccurrence,nowMs = Date.now()}) {
  const observation = positionObservation(live,nowMs);
  const statusState = strongStatusState(assignment);
  const adsbState = observation.fresh ? (observation.onGround ? 'ground' : 'airborne') : null;
  const sourceConflict = Boolean(
    adsbState &&
    ((statusState === 'airborne' && adsbState === 'ground') ||
     (statusState === 'landed' && adsbState === 'airborne'))
  );

  let renderedState = 'assigned-no-position';
  let renderSource = 'flight-status';
  if (assignment?.flightStatus?.canceled === true) {
    renderedState = 'canceled';
  } else if (confirmedArrival(assignment)) {
    renderedState = 'landed-status';
    renderSource = 'flight-status-arrival';
  } else if (!assignment?.tailNumber) {
    renderedState = 'unassigned';
  } else if (observation.fresh) {
    renderedState = observation.onGround ? 'ground-live' : 'airborne-live';
    renderSource = 'adsb-fresh';
  } else if (assignment?.flightStatus?.airborne === true) {
    renderedState = 'airborne-status';
  } else if (departedOverHourAgo(assignment,nowMs) &&
             !assignment?.flightStatus?.canceled && !isDiverted(assignment)) {
    renderedState = 'airborne-status';
    renderSource = 'confirmed-departure';
  } else if (recentInboundAtOrigin(assignment,recentInboundOccurrence)) {
    renderedState = 'parked-origin-confirmed';
    renderSource = 'same-tail-arrival';
  }
  return {renderedState,renderSource,sourceConflict,observation,statusState};
}

function operatingOccurrenceMatches(detail,assignment,live) {
  if (detail?.status !== 'found') return false;
  if (clean(detail?.flightNumber) !== clean(live?.operatingFlightNumber)) return false;
  if (!sameTail(detail?.tailNumber,assignment?.tailNumber)) return false;
  if (!sameTail(live?.aircraft?.registration,assignment?.tailNumber)) return false;
  if (detail?.flightStatus?.airborne !== true || detail?.flightStatus?.landed === true) return false;
  return sameAirport(detail?.destination,assignment?.origin);
}

async function resolveOperatingOccurrence(assignment,live,date) {
  const operatingFlight = clean(live?.operatingFlightNumber);
  const passengerFlight = clean(assignment?.flightNumber);
  if (!operatingFlight || operatingFlight === passengerFlight) return null;
  if (!live?.positionFresh || live?.aircraft?.onGround === true) return null;
  if (!assignment?.tailNumber || !assignment?.origin || !date) return null;
  try {
    const base = await lookupAssignment({flight:operatingFlight,date,flightId:null});
    if (operatingOccurrenceMatches(base,assignment,live)) return base;
    if (base?.status !== 'choose-flight') return null;
    const options = Array.isArray(base.options) ? base.options.slice(0,8) : [];
    const details = await Promise.all(options.map(option =>
      lookupAssignment({flight:operatingFlight,date,flightId:option.flightId}).catch(() => null)
    ));
    const matches = details.filter(detail => operatingOccurrenceMatches(detail,assignment,live));
    return matches.length === 1 ? matches[0] : null;
  } catch {
    return null;
  }
}

function dateIsNearNow(date,nowMs = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return false;
  const target = Date.parse(String(date) + 'T12:00:00Z');
  return Number.isFinite(target) && Math.abs(target - nowMs) <= 36 * 60 * 60 * 1000;
}

function embeddedInboundOccurrence(assignment) {
  for (const occurrence of [assignment?.recentInboundOccurrence,assignment?.previousAircraftOccurrence]) {
    if (!occurrence) continue;
    if (!sameTail(occurrence?.tailNumber,assignment?.tailNumber)) continue;
    if (!sameAirport(occurrence?.destination,assignment?.origin)) continue;
    return occurrence;
  }
  return null;
}

function fr24HistoryUtc(dateLabel,timeText) {
  const date=String(dateLabel || '').match(/^(\d{2})\s+([A-Z][a-z]{2})\s+(\d{4})$/);
  const clock=String(timeText || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!date || !clock) return null;
  const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const month=months[date[2]];
  if (!Number.isInteger(month)) return null;
  const ms=Date.UTC(Number(date[3]),month,Number(date[1]),Number(clock[1]),Number(clock[2]));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function parseFr24AircraftHistoryRows(markdown) {
  const rows=[];
  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (!line.includes('https://www.flightradar24.com/data/flights/')) continue;
    const match=line.match(/\b(\d{2}\s+[A-Z][a-z]{2}\s+\d{4})\b[\s\S]*?\[\(([A-Z0-9]{3})\)\]\([^)]+\)[\s\S]*?\[\(([A-Z0-9]{3})\)\]\([^)]+\)[\s\S]*?\[([A-Z0-9]{2,3}\s*[0-9]{1,4}[A-Z]?)\]\(https:\/\/www\.flightradar24\.com\/data\/flights\/[^)]+\)/i);
    if (!match) continue;
    const landedTime=String(line.match(/\bLanded\s+(\d{1,2}:\d{2})\b/i)?.[1] || '').trim() || null;
    rows.push({
      dateLabel:match[1],
      origin:match[2].toUpperCase(),
      destination:match[3].toUpperCase(),
      flightNumber:clean(match[4]),
      landed:Boolean(landedTime || /\bLanded\b/i.test(line)),
      actualArrivalUTC:landedTime ? fr24HistoryUtc(match[1],landedTime) : null,
      sourceLine:line
    });
  }
  return rows;
}

function independentInboundFromTailRows(rows,{dateLabel,passengerFlight,origin,destination}) {
  const sameDay=(rows || []).filter(row => row.dateLabel === dateLabel);
  const flight=clean(passengerFlight);
  const from=clean(origin);
  const to=clean(destination);
  const passengerIndex=sameDay.findIndex(row =>
    row.flightNumber === flight &&
    row.origin === from &&
    row.destination === to
  );
  if (passengerIndex < 0) return null;

  for (let i=passengerIndex + 1; i<sameDay.length; i++) {
    const row=sameDay[i];
    if (row.destination === from && row.landed) return row;
  }
  return null;
}

async function lookupIndependentInboundByTail(assignment,date) {
  const normalizedDate=normalizeDate(date);
  const tail=normalizeTail(assignment?.tailNumber);
  const origin=airportCode(assignment?.origin);
  const destination=airportCode(assignment?.destination);
  const passengerFlight=clean(assignment?.operatingFlightNumber || assignment?.flightNumber);
  if (!normalizedDate || !tail || !origin || !destination || !passengerFlight) return null;

  const controller=new AbortController();
  const timer=setTimeout(() => controller.abort(),FR24_FALLBACK_TIMEOUT_MS);
  try {
    const url=FR24_AIRCRAFT_READER_BASE + encodeURIComponent(tail.toLowerCase());
    const response=await fetch(url,{
      headers:{accept:'text/plain','user-agent':'ChrisIzworski-FlightTracker/1.0 (+https://chrisizworski.com/flight-tracker/)'},
      signal:controller.signal
    });
    if (!response.ok) return null;
    const text=await response.text();
    if (!text || text.length > 800000) return null;
    const row=independentInboundFromTailRows(parseFr24AircraftHistoryRows(text),{
      dateLabel:fr24DateLabel(normalizedDate),
      passengerFlight,
      origin,
      destination
    });
    if (!row) return null;
    return {
      flightNumber:row.flightNumber,
      flightId:['fr24tail',normalizedDate.raw,row.flightNumber,row.origin,row.destination].join(':'),
      tailNumber:tail,
      origin:minimalAirport(row.origin),
      destination:minimalAirport(row.destination),
      schedule:{
        scheduledDepartureUTC:null,
        estimatedDepartureUTC:null,
        actualDepartureUTC:null,
        scheduledArrivalUTC:null,
        estimatedArrivalUTC:row.actualArrivalUTC || null,
        actualArrivalUTC:row.actualArrivalUTC || null
      },
      flightStatus:{
        code:'L',
        label:'Landed',
        description:'Landed',
        departureDelayMinutes:null,
        arrivalDelayMinutes:null,
        lastUpdatedText:null,
        canceled:false,
        airborne:false,
        landed:true
      },
      assignmentState:'landed',
      note:'Recovered from the exact aircraft history immediately before this flight.',
      evidence:{
        kind:'independent-tail-history-same-aircraft',
        note:'Confirmed from the same aircraft registration and sequence immediately before the passenger flight.'
      },
      source:{
        name:'Flightradar24 public aircraft history via Jina Reader',
        url:FR24_AIRCRAFT_PUBLIC_BASE + tail.toLowerCase(),
        kind:'independent-tail-history-fallback'
      }
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveRecentInbound(assignment,date,nowMs = Date.now()) {
  if (!dateIsNearNow(date,nowMs)) return null;
  const tail = assignment?.tailNumber;
  const airport = airportCode(assignment?.origin);
  const carrier = carrierCode(assignment?.operatingFlightNumber || assignment?.flightNumber);
  if (!tail || !airport || !carrier) return null;

  const result = await lookupRecentArrivalWithCache({tail,airport,carrier,date,nowMs});
  if (result?.status === 'found-inbound-occurrence' && result.occurrence) {
    return result.occurrence;
  }

  const embedded=embeddedInboundOccurrence(assignment);
  if (embedded) {
    await writeInboundCache(date,tail,airport,embedded);
    return embedded;
  }

  const independent=await lookupIndependentInboundByTail(assignment,date);
  if (independent) {
    await writeInboundCache(date,tail,airport,independent);
    return independent;
  }

  return await readInboundCache(date,tail,airport);
}

async function fetchCodeshareText(marketingFlight) {
  const normalized=normalizeMarketingFlight(marketingFlight);
  if (!normalized.ok) return null;
  const slug=FLIGHTMAPPER_AIRLINE_SLUGS[normalized.carrier];
  if (!slug) return null;
  const controller=new AbortController();
  const timer=setTimeout(() => controller.abort(),CODESHARE_TIMEOUT_MS);
  try {
    const url=CODESHARE_READER_BASE + encodeURIComponent(slug + '_' + normalized.carrier + '_' + normalized.number);
    const response=await fetch(url,{
      headers:{accept:'text/plain','user-agent':'ChrisIzworski-FlightTracker/1.0 (+https://chrisizworski.com/flight-tracker/)'},
      signal:controller.signal
    });
    if (!response.ok) return null;
    const text=await response.text();
    return text && text.length <= 600000 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function codeshareScheduleApplies(segment,travelDate) {
  if (!travelDate || !normalizeDate(travelDate)) return true;
  // A flight page may contain several historical operator schedules.
  // Use the published validity range preceding this exact operator link.
  const descriptors=[...String(segment || '').matchAll(
    /Effective\s+(from\s+)?(\d{4}-\d{2}-\d{2})(?:\s+through\s+(\d{4}-\d{2}-\d{2}))?|Valid until\s+(\d{4}-\d{2}-\d{2})|Operates only on\s+(\d{4}-\d{2}-\d{2})/gi
  )];
  if (!descriptors.length) return true;
  const last=descriptors[descriptors.length-1];
  if (last[5]) return travelDate === last[5];
  if (last[4]) return travelDate <= last[4];
  return travelDate >= last[2] && (!last[3] || travelDate <= last[3]);
}

function parseCodeshareOperatingCandidates(markdown,marketingFlight,date=null) {
  const requested=clean(marketingFlight);
  const found=[];
  const seen=new Set();
  const content=String(markdown || '');
  const regex=/\(\[([A-Z0-9]{2})\s*([0-9]{1,4}[A-Z]?)\]\(https:\/\/info\.flightmapper\.net\/flight\/[^)]+\)\)/gi;
  let match,previousEnd=0;
  while ((match=regex.exec(content))) {
    const section=content.slice(previousEnd,match.index);
    previousEnd=regex.lastIndex;
    // Another marketed flight can appear later in the same schedule page.
    // Do not borrow its operating flight even when its validity dates match.
    const marketedLabels=[...section.matchAll(/\b([A-Z]{2})\s*([0-9]{1,4}[A-Z]?)\b/g)]
      .map(parts=>clean(parts[1] + parts[2]));
    if (marketedLabels.length && marketedLabels[marketedLabels.length-1] !== requested) continue;
    const flight=clean(match[1] + match[2]);
    if (!flight || flight === requested || seen.has(flight) ||
        !codeshareScheduleApplies(section,date)) continue;
    seen.add(flight);
    found.push(flight);
  }
  return found;
}

function codeshareAssignmentScore(assignment,nowMs = Date.now()) {
  if (assignment?.status !== 'found' || !assignment?.tailNumber) return -Infinity;
  let score=100;
  if (assignment?.flightStatus?.airborne === true && assignment?.flightStatus?.landed !== true) score += 700;
  if (confirmedArrival(assignment)) score += 600;
  const eventMs=Date.parse(
    assignment?.schedule?.actualArrivalUTC ||
    assignment?.schedule?.estimatedArrivalUTC ||
    assignment?.schedule?.actualDepartureUTC ||
    assignment?.schedule?.scheduledDepartureUTC || ''
  );
  if (Number.isFinite(eventMs)) score += Math.max(0,240 - Math.abs(nowMs - eventMs) / 3600000 * 20);
  return score;
}

async function cachedAssignmentsForFlight(flight,date) {
  const base=await readAssignmentCache(flight,date,null);
  if (!base) return [];
  if (base.status === 'found') return [base];
  if (base.status !== 'choose-flight') return [];
  const results=[];
  for (const option of (base.options || []).slice(0,8)) {
    const detail=await readAssignmentCache(flight,date,option.flightId);
    if (detail?.status === 'found') results.push(detail);
  }
  return results;
}

async function resolveCodeshareOperatingFlight(marketingFlight,date,nowMs = Date.now()) {
  const markdown=await fetchCodeshareText(marketingFlight);
  const candidates=parseCodeshareOperatingCandidates(markdown,marketingFlight,date);
  if (!candidates.length) return null;

  const cached=[];
  for (const candidate of candidates.slice(0,12)) {
    for (const assignment of await cachedAssignmentsForFlight(candidate,date)) {
      cached.push({operatingFlight:candidate,assignment,score:codeshareAssignmentScore(assignment,nowMs)});
    }
  }
  cached.sort((a,b) => b.score - a.score);
  if (cached[0] && Number.isFinite(cached[0].score)) {
    return {
      marketingFlight:clean(marketingFlight),
      operatingFlight:cached[0].operatingFlight,
      assignment:cached[0].assignment,
      candidates,
      source:{name:'FlightMapper public schedule via Jina Reader',url:'https://info.flightmapper.net/'}
    };
  }

  if (candidates.length === 1) {
    return {
      marketingFlight:clean(marketingFlight),
      operatingFlight:candidates[0],
      assignment:null,
      candidates,
      source:{name:'FlightMapper public schedule via Jina Reader',url:'https://info.flightmapper.net/'}
    };
  }
  return null;
}

async function candidateAssignmentsForCodeshare(flight,date) {
  const cached=await cachedAssignmentsForFlight(flight,date);
  if (cached.length) return cached;

  const base=await lookupAssignment({flight,date,flightId:null}).catch(() => null);
  if (base?.status === 'found') return [base];
  if (base?.status !== 'choose-flight') return [];

  const options=(base.options || []).slice(0,6);
  const details=await Promise.all(options.map(option =>
    lookupAssignment({flight,date,flightId:option.flightId}).catch(() => null)
  ));
  return details.filter(detail => detail?.status === 'found');
}

function codeshareOccurrenceMatchScore(marketingAssignment,operatorAssignment,nowMs=Date.now()) {
  if (operatorAssignment?.status !== 'found') return -Infinity;
  let score=0;
  const marketingTail=clean(marketingAssignment?.tailNumber);
  const operatorTail=clean(operatorAssignment?.tailNumber);
  if (marketingTail && operatorTail) {
    if (marketingTail !== operatorTail) return -Infinity;
    score += 2000;
  }
  if (sameAirport(marketingAssignment?.origin,operatorAssignment?.origin) &&
      sameAirport(marketingAssignment?.destination,operatorAssignment?.destination)) {
    score += 900;
  } else if (marketingAssignment?.origin && marketingAssignment?.destination) {
    return -Infinity;
  }

  const marketingTime=Date.parse(
    marketingAssignment?.schedule?.actualDepartureUTC ||
    marketingAssignment?.schedule?.estimatedDepartureUTC ||
    marketingAssignment?.schedule?.scheduledDepartureUTC || ''
  );
  const operatorTime=Date.parse(
    operatorAssignment?.schedule?.actualDepartureUTC ||
    operatorAssignment?.schedule?.estimatedDepartureUTC ||
    operatorAssignment?.schedule?.scheduledDepartureUTC || ''
  );
  if (Number.isFinite(marketingTime) && Number.isFinite(operatorTime)) {
    const diffMinutes=Math.abs(marketingTime - operatorTime) / 60000;
    if (diffMinutes > 180) return -Infinity;
    score += Math.max(0,600 - diffMinutes * 3);
  }
  score += codeshareAssignmentScore(operatorAssignment,nowMs) / 10;
  return score;
}

async function resolveCodeshareAgainstAssignment(marketingFlight,date,marketingAssignment,nowMs=Date.now()) {
  const cached=await readCodeshareCache(marketingFlight,date,marketingAssignment);
  if (cached?.operatingFlight) {
    return {
      marketingFlight:clean(marketingFlight),
      operatingFlight:cached.operatingFlight,
      assignment:marketingAssignment,
      candidates:cached.candidates || [cached.operatingFlight],
      source:cached.source || {name:'Codeshare resolution cache'}
    };
  }

  const markdown=await fetchCodeshareText(marketingFlight);
  const candidates=parseCodeshareOperatingCandidates(markdown,marketingFlight,date);
  if (!candidates.length) return null;

  const groups=await Promise.all(candidates.slice(0,12).map(async operatingFlight => ({
    operatingFlight,
    assignments:await candidateAssignmentsForCodeshare(operatingFlight,date)
  })));
  const matches=[];
  for (const group of groups) {
    for (const assignment of group.assignments) {
      const score=codeshareOccurrenceMatchScore(marketingAssignment,assignment,nowMs);
      if (Number.isFinite(score)) matches.push({operatingFlight:group.operatingFlight,assignment,score});
    }
  }
  matches.sort((a,b) => b.score - a.score);
  if (!matches.length || matches[0].score < 900) return null;
  if (matches[1] && matches[0].score - matches[1].score < 100 &&
      matches[0].operatingFlight !== matches[1].operatingFlight) return null;

  const resolved={
    marketingFlight:clean(marketingFlight),
    operatingFlight:matches[0].operatingFlight,
    assignment:matches[0].assignment,
    candidates,
    source:{name:'FlightMapper public schedule via Jina Reader',url:'https://info.flightmapper.net/'}
  };
  await writeCodeshareCache(marketingFlight,date,marketingAssignment,{
    operatingFlight:resolved.operatingFlight,
    candidates,
    source:resolved.source
  });
  return resolved;
}

function applyCodeshareAssignment(assignment,marketingFlight,operatingFlight,source=null) {
  if (!assignment) return null;
  return {
    ...assignment,
    flightNumber:clean(marketingFlight),
    marketingFlightNumber:clean(marketingFlight),
    operatingFlightNumber:clean(operatingFlight),
    codeshare:{
      marketingFlightNumber:clean(marketingFlight),
      operatingFlightNumber:clean(operatingFlight),
      source
    }
  };
}

function directLiveIsAirborne(live) {
  return Boolean(
    live?.status === 'live' &&
    live?.positionFresh === true &&
    live?.aircraft?.onGround !== true &&
    live?.aircraft?.registration
  );
}

async function directLiveSnapshot(flight) {
  try {
    const tracker=require('./flight-tracker.js')._test;
    return await tracker.buildSnapshot(flight);
  } catch {
    return null;
  }
}

function directLiveAssignment(marketingFlight,live,operatingFlight=null,codeshareSource=null) {
  const route=live?.route || null;
  const flightNumber=clean(marketingFlight);
  const operator=clean(operatingFlight || live?.operatingFlightNumber || live?.flightNumber || marketingFlight);
  return {
    status:'found',
    fetchedAt:new Date().toISOString(),
    flightNumber,
    marketingFlightNumber:flightNumber,
    operatingFlightNumber:operator !== flightNumber ? operator : null,
    flightId:'live:' + flightNumber + ':' + clean(live?.aircraft?.callsign || operator),
    assignmentState:'airborne',
    tailNumber:live?.aircraft?.registration || null,
    equipment:live?.aircraft?.aircraftType ? {
      code:live.aircraft.aircraftType,
      name:live.aircraft.aircraftTypeName || live.aircraft.aircraftType,
      title:'Live ADS-B'
    } : null,
    operatingCarrier:null,
    origin:route?.origin || null,
    destination:route?.destination || null,
    schedule:{
      scheduledDepartureUTC:null,estimatedDepartureUTC:null,actualDepartureUTC:null,
      scheduledArrivalUTC:null,estimatedArrivalUTC:null,actualArrivalUTC:null
    },
    flightStatus:{
      code:'A',label:'Airborne',description:'Fresh live aircraft position',
      departureDelayMinutes:null,arrivalDelayMinutes:null,lastUpdatedText:null,
      canceled:false,airborne:true,landed:false
    },
    note:'Tracked directly from the operating callsign because a fresh airborne position is available.',
    source:{name:'ADSB.lol direct operating callsign',url:'https://adsb.lol/',kind:'direct-live-callsign'},
    codeshare:operator !== flightNumber ? {
      marketingFlightNumber:flightNumber,
      operatingFlightNumber:operator,
      source:codeshareSource
    } : null
  };
}

function logUnifiedRender(assignment,reconciliation) {
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

function observedInboundFromLive(assignment,live) {
  // The current registration and its route may identify an inbound aircraft
  // even before public arrivals boards identify the previous flight number.
  // This is an observed route, NOT an airline-confirmed operating flight.
  if (!live?.positionFresh || live?.aircraft?.onGround === true ||
      !live?.route?.plausible || assignment?.flightStatus?.airborne === true ||
      !sameAirport(live.route.destination,assignment?.origin) ||
      !sameTail(live.aircraft.registration,assignment?.tailNumber)) return null;
  return {
    flightNumber:null,
    flightId:null,
    tailNumber:assignment.tailNumber,
    origin:live.route.origin,
    destination:live.route.destination,
    schedule:{scheduledArrivalUTC:null,estimatedArrivalUTC:null,actualArrivalUTC:null},
    flightStatus:{airborne:true,landed:false,canceled:false,arrivalDelayMinutes:null},
    evidence:{kind:'fresh-same-tail-adsb-route',note:'Aircraft registration and live position match a plausible route into the departure airport; operating flight identity is not independently confirmed.'},
    source:{name:'ADSB.lol + VRS standing route data',kind:'live-inbound-route'}
  };
}

async function buildUnifiedFromAssignment(assignment,date,nowMs = Date.now()) {
  if (!assignment?.tailNumber) {
    const reconciliation = reconcileFlightState({assignment,live:null,recentInboundOccurrence:null,nowMs});
    return {
      status:'found',
      generatedAt:new Date(nowMs).toISOString(),
      assignment,
      live:null,
      recentInboundOccurrence:null,
      confirmedOperatingOccurrence:null,
      ...reconciliation,
      observability:logUnifiedRender(assignment,reconciliation)
    };
  }

  const [live,recentInboundOccurrence] = await Promise.all([
    require('./flight-tracker.js').buildRegistrationSnapshot(assignment.tailNumber,airportCode(assignment.origin)),
    resolveRecentInbound(assignment,date,nowMs)
  ]);
  const confirmedOperatingOccurrence = await resolveOperatingOccurrence(assignment,live,date);
  const inbound = recentInboundOccurrence ||
    (confirmedOperatingOccurrence && sameAirport(confirmedOperatingOccurrence.destination,assignment.origin)
      ? confirmedOperatingOccurrence : null) ||
    observedInboundFromLive(assignment,live);
  if (confirmedOperatingOccurrence && live && typeof live === 'object') {
    live.confirmedOperatingOccurrence = confirmedOperatingOccurrence;
  }
  const reconciliation = reconcileFlightState({assignment,live,recentInboundOccurrence:inbound,nowMs});
  return {
    status:'found',
    generatedAt:new Date(nowMs).toISOString(),
    assignment,
    live,
    recentInboundOccurrence:inbound,
    confirmedOperatingOccurrence,
    ...reconciliation,
    observability:logUnifiedRender(assignment,reconciliation)
  };
}

async function buildUnifiedFromDirectLive(marketingFlight,live,operatingFlight=null,codeshareSource=null,nowMs=Date.now()) {
  const assignment=directLiveAssignment(marketingFlight,live,operatingFlight,codeshareSource);
  const reconciliation=reconcileFlightState({assignment,live,recentInboundOccurrence:null,nowMs});
  return {
    status:'found',
    generatedAt:new Date(nowMs).toISOString(),
    assignment,
    live,
    recentInboundOccurrence:null,
    confirmedOperatingOccurrence:null,
    ...reconciliation,
    observability:logUnifiedRender(assignment,reconciliation)
  };
}

async function buildUnifiedFlightState({flight,date,flightId,allowDirectLive=false,nowMs = Date.now()}) {
  const normalized=normalizeMarketingFlight(flight);
  const shouldResolveCodeshare=Boolean(normalized.ok && FLIGHTMAPPER_AIRLINE_SLUGS[normalized.carrier]);
  const assignmentPromise=lookupAssignment({flight,date,flightId});
  // Marketing-only Delta numbers can require two sequential independent lookups.
  // Begin their schedule resolution concurrently to avoid adding avoidable latency.
  const earlyCodesharePromise=shouldResolveCodeshare && normalized.carrier === 'DL' &&
    Number.parseInt(normalized.number,10) >= 5000
      ? resolveCodeshareOperatingFlight(flight,date,nowMs).catch(() => null)
      : null;
  const directPromise=allowDirectLive ? directLiveSnapshot(flight) : Promise.resolve(null);

  const direct=await directPromise;
  if (directLiveIsAirborne(direct)) {
    if (shouldResolveCodeshare && (normalized.carrier !== 'DL' || earlyCodesharePromise)) {
      const codeshare=earlyCodesharePromise
        ? await earlyCodesharePromise
        : await resolveCodeshareOperatingFlight(flight,date,nowMs);
      if (codeshare?.operatingFlight) {
        const operatingLive=await directLiveSnapshot(codeshare.operatingFlight);
        if (directLiveIsAirborne(operatingLive)) {
          return await buildUnifiedFromDirectLive(
            flight,operatingLive,codeshare.operatingFlight,codeshare.source,nowMs
          );
        }
      }
    }
    return await buildUnifiedFromDirectLive(flight,direct,null,null,nowMs);
  }

  const assignment=await assignmentPromise;
  let codeshare=null;
  // Normal Delta flights with a confirmed tail do not require a second lookup.
  // Unknown Delta occurrences, missing tails and explicitly foreign-operated
  // flights do: the ticket flight may only be a marketing codeshare.
  const operatingCode=clean(assignment?.operatingCarrier?.code);
  const operatingName=String(assignment?.operatingCarrier?.name || '');
  const needsCodeshareLookup=shouldResolveCodeshare && (
    normalized.carrier !== 'DL' ||
    assignment?.status !== 'found' || !assignment?.tailNumber ||
    (operatingCode && operatingCode !== 'DL') ||
    /Virgin Atlantic|Air France|KLM|WestJet|Korean Air|Aeromexico/i.test(operatingName)
  );
  if (assignment?.status === 'found') {
    if (needsCodeshareLookup) {
      codeshare=earlyCodesharePromise
        ? await earlyCodesharePromise
        : await resolveCodeshareAgainstAssignment(flight,date,assignment,nowMs);
      // When the marketing occurrence exists, validate an early candidate
      // against that occurrence instead of trusting an unrelated cached operator.
      if (codeshare?.operatingFlight && earlyCodesharePromise) {
        const verified=await resolveCodeshareAgainstAssignment(flight,date,assignment,nowMs);
        codeshare=verified || null;
      }
    }
    if (codeshare?.operatingFlight) {
      const resolvedAssignment=codeshare.assignment?.status === 'found'
        ? codeshare.assignment
        : assignment;
      const aliased=applyCodeshareAssignment(
        resolvedAssignment,flight,codeshare.operatingFlight,codeshare.source
      );
      return await buildUnifiedFromAssignment(aliased,date,nowMs);
    }
    return await buildUnifiedFromAssignment(assignment,date,nowMs);
  }

  if (!codeshare && needsCodeshareLookup) {
    codeshare=earlyCodesharePromise
      ? await earlyCodesharePromise
      : await resolveCodeshareOperatingFlight(flight,date,nowMs);
  }
  if (codeshare?.operatingFlight) {
    if (allowDirectLive) {
      const operatingLive=await directLiveSnapshot(codeshare.operatingFlight);
      if (directLiveIsAirborne(operatingLive)) {
        return await buildUnifiedFromDirectLive(
          flight,operatingLive,codeshare.operatingFlight,codeshare.source,nowMs
        );
      }
    }

    let operatingAssignment=codeshare.assignment;
    if (!operatingAssignment) {
      const candidate=await lookupAssignment({flight:codeshare.operatingFlight,date,flightId:null}).catch(() => null);
      if (candidate?.status === 'found') operatingAssignment=candidate;
    }
    if (operatingAssignment?.status === 'found') {
      const aliased=applyCodeshareAssignment(
        operatingAssignment,flight,codeshare.operatingFlight,codeshare.source
      );
      return await buildUnifiedFromAssignment(aliased,date,nowMs);
    }
    // A known operator is not proof of a tail number or a live ADS-B fix.
    // Never report an outage merely because the marketing or operating
    // occurrence is absent from the available public assignment records.
    const uncovered={
      status:'assignment-not-covered',
      flightNumber:clean(flight),
      date,
      marketingFlightNumber:clean(flight),
      operatingFlightNumber:codeshare.operatingFlight,
      codeshare:{
        marketingFlightNumber:clean(flight),
        operatingFlightNumber:codeshare.operatingFlight,
        source:codeshare.source
      },
      message:'This flight is marketed as ' + clean(flight) + ' and operated as ' +
        codeshare.operatingFlight + '. We can identify its operating flight, but cannot confirm a tail-number assignment for this date. This is a coverage gap, not a source outage.',
      checkedFallbacks:['marketing-flight-status','operating-flight-status','independent-public-history'],
      source:codeshare.source
    };
    if (allowDirectLive) {
      uncovered.liveCoverage={
        status:direct?.status || 'not-found',
        checkedCallsigns:Array.isArray(direct?.checkedCallsigns) ? direct.checkedCallsigns : []
      };
    }
    return uncovered;
  }

  if (allowDirectLive && assignment && typeof assignment === 'object') {
    return {
      ...assignment,
      liveCoverage:{
        status:direct?.status || 'not-found',
        message:direct?.message || 'No fresh live aircraft position was observed for the checked operating callsigns.',
        checkedCallsigns:Array.isArray(direct?.checkedCallsigns) ? direct.checkedCallsigns : [],
        source:direct?.source || {name:'ADSB.lol',url:'https://adsb.lol/'}
      }
    };
  }
  return assignment;
}


function fr24DateLabel(normalizedDate) {
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(normalizedDate.day).padStart(2,'0')} ${months[normalizedDate.month - 1]} ${normalizedDate.year}`;
}

function parseFr24HistoryRows(markdown) {
  const rows=[];
  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const dateMatch=line.match(/\b(\d{2}\s+[A-Z][a-z]{2}\s+\d{4})\b/);
    const routeMatch=line.match(/FROM\s+[^|]*?\[\(([A-Z0-9]{3})\)\]\([^)]+\)\s+TO\s+[^|]*?\[\(([A-Z0-9]{3})\)\]\([^)]+\)/i);
    const registrationMatch=line.match(/\[([A-Z0-9-]{3,10})\]\(https:\/\/www\.flightradar24\.com\/data\/aircraft\/[a-z0-9-]+/i);
    if (!dateMatch || !routeMatch || !registrationMatch) continue;

    let equipmentCode=null;
    const aircraftColumn=line.match(/\|\s*([A-Z0-9]{3,4})\s+\[\([A-Z0-9-]{3,10}\)\]\(https:\/\/www\.flightradar24\.com\/data\/aircraft\//i);
    if (aircraftColumn) equipmentCode=aircraftColumn[1].toUpperCase();

    const std=line.match(/\bSTD\s+([0-9]{1,2}:[0-9]{2}(?:\s*[AP]M)?)/i);
    rows.push({
      dateLabel:dateMatch[1],
      origin:routeMatch[1].toUpperCase(),
      destination:routeMatch[2].toUpperCase(),
      registration:registrationMatch[1].toUpperCase(),
      equipmentCode,
      scheduledDepartureText:std?.[1]?.trim() || null,
      landed:/\bLanded\b/i.test(line),
      sourceLine:line
    });
  }
  return rows;
}

function fr24SyntheticFlightId(date,origin,destination,index=0) {
  return ['fr24',String(date || ''),clean(origin),clean(destination),String(index)].join(':');
}

function fr24RouteHintFromFlightId(flightId) {
  const match=String(flightId || '').match(/^fr24:(\d{4}-\d{2}-\d{2}):([A-Z0-9]{3}):([A-Z0-9]{3}):(\d+)$/);
  if (!match) return null;
  return {date:match[1],origin:{iata:match[2],code:match[2]},destination:{iata:match[3],code:match[3]},index:Number(match[4])};
}

async function cachedRouteHint(flight,date,flightId) {
  if (!flightId) return null;
  const synthetic=fr24RouteHintFromFlightId(flightId);
  if (synthetic) return synthetic;
  const routeList=await readAssignmentCache(flight,date,null);
  if (routeList?.status === 'choose-flight') {
    return (routeList.options || []).find(option => String(option.flightId) === String(flightId)) || null;
  }
  if (routeList?.status === 'found' && String(routeList.flightId || '') === String(flightId)) {
    return {origin:routeList.origin,destination:routeList.destination,sortTime:routeList.schedule?.scheduledDepartureUTC || null,flightId:routeList.flightId};
  }
  return null;
}

async function fetchFr24History(marketingFlight) {
  const url=FR24_READER_BASE + encodeURIComponent(marketingFlight);
  const controller=new AbortController();
  const timer=setTimeout(() => controller.abort(),FR24_FALLBACK_TIMEOUT_MS);
  try {
    const response=await fetch(url,{
      headers:{accept:'text/plain','user-agent':'ChrisIzworski-FlightTracker/1.0 (+https://chrisizworski.com/flight-tracker/)'},
      signal:controller.signal
    });
    if (!response.ok) throw new Error('Independent assignment source returned ' + response.status);
    const text=await response.text();
    if (!text || text.length > 600000) throw new Error('Independent assignment source returned invalid content');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function minimalAirport(code,existing=null) {
  return existing || {iata:code,code,name:null,city:null,state:null,country:null,gate:null,terminal:null,timezone:null,localDateTime:null,scheduledTime:null,estimatedTime:null};
}

function fr24AssignmentFromRow({normalized,normalizedDate,row,routeHint,flightId}) {
  const resolvedFlightId=String(routeHint?.flightId || flightId || fr24SyntheticFlightId(normalizedDate.raw,row.origin,row.destination,0));
  const scheduledDepartureUTC=routeHint?.sortTime && Number.isFinite(Date.parse(routeHint.sortTime))
    ? new Date(Date.parse(routeHint.sortTime)).toISOString()
    : null;
  return {
    status:'found',
    fetchedAt:new Date().toISOString(),
    flightNumber:normalized.display,
    flightId:resolvedFlightId,
    assignmentState:'assigned',
    tailNumber:row.registration,
    equipment:row.equipmentCode ? {code:row.equipmentCode,name:row.equipmentCode,title:'Fallback source'} : null,
    operatingCarrier:null,
    origin:minimalAirport(row.origin,routeHint?.origin || null),
    destination:minimalAirport(row.destination,routeHint?.destination || null),
    schedule:{
      scheduledDepartureUTC,
      estimatedDepartureUTC:null,
      actualDepartureUTC:null,
      scheduledArrivalUTC:null,
      estimatedArrivalUTC:null,
      actualArrivalUTC:null
    },
    flightStatus:{
      code:row.landed ? 'L' : 'S',
      label:row.landed ? 'Landed' : 'Scheduled',
      description:row.landed ? 'Landed' : 'Aircraft assignment confirmed; airline timing source unavailable',
      departureDelayMinutes:null,
      arrivalDelayMinutes:null,
      lastUpdatedText:null,
      canceled:false,
      airborne:false,
      landed:row.landed
    },
    note:row.landed ? null : 'Tracking will begin when a fresh aircraft position is available',
    source:{
      name:'Flightradar24 public flight history via Jina Reader',
      url:FR24_PUBLIC_BASE + normalized.display.toLowerCase(),
      kind:'independent-public-history-fallback',
      note:'Used only when the primary assignment source is unavailable.'
    },
    fallback:{
      kind:'independent-public-history',
      stale:false,
      note:'Assigned registration confirmed from an independent public flight-history source because FlightStats was unavailable.'
    }
  };
}

async function lookupIndependentAssignmentFallback({normalized,normalizedDate,flightId,routeHint=null}) {
  const markdown=await fetchFr24History(normalized.display);
  const dateLabel=fr24DateLabel(normalizedDate);
  const rows=parseFr24HistoryRows(markdown).filter(row => row.dateLabel === dateLabel);
  if (!rows.length) return null;

  const effectiveHint=routeHint || fr24RouteHintFromFlightId(flightId);
  const origin=clean(effectiveHint?.origin?.iata || effectiveHint?.origin?.code || effectiveHint?.origin || '');
  const destination=clean(effectiveHint?.destination?.iata || effectiveHint?.destination?.code || effectiveHint?.destination || '');
  let matches=rows;
  if (origin && destination) matches=rows.filter(row => row.origin === origin && row.destination === destination);

  if (matches.length === 1) {
    return fr24AssignmentFromRow({normalized,normalizedDate,row:matches[0],routeHint:effectiveHint,flightId});
  }
  if (matches.length > 1 && origin && destination) {
    return fr24AssignmentFromRow({normalized,normalizedDate,row:matches[0],routeHint:effectiveHint,flightId});
  }
  if (!effectiveHint && rows.length > 1) {
    const seen=new Set();
    const options=[];
    rows.forEach((row,index) => {
      const key=row.origin + '>' + row.destination;
      if (seen.has(key)) return;
      seen.add(key);
      options.push({
        flightId:fr24SyntheticFlightId(normalizedDate.raw,row.origin,row.destination,index),
        date:normalizedDate.raw,
        sortTime:null,
        origin:minimalAirport(row.origin),
        destination:minimalAirport(row.destination),
        departureTime:row.scheduledDepartureText,
        departureAmPm:null,
        departureTimezone:null,
        arrivalTime:null,
        arrivalAmPm:null,
        arrivalTimezone:null
      });
    });
    if (options.length > 1) {
      return {
        status:'choose-flight',
        flightNumber:normalized.display,
        date:normalizedDate.raw,
        message:'More than one flight uses this number today. Choose your route.',
        options,
        source:{name:'Flightradar24 public flight history via Jina Reader',url:FR24_PUBLIC_BASE + normalized.display.toLowerCase()},
        fallback:{kind:'independent-public-history',stale:false,note:'Route choices recovered because the primary assignment source is unavailable.'}
      };
    }
  }
  if (rows.length === 1) {
    return fr24AssignmentFromRow({normalized,normalizedDate,row:rows[0],routeHint:effectiveHint,flightId});
  }
  return null;
}

function assignmentSourceIsUnreachable(error) {
  const message=String(error?.message || error || '');
  // Missing records, HTTP 404/403 and malformed HTML are not proof of outage.
  return /(?:fetch failed|network|ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|abort|timeout|timed out|source returned (?:429|5\\d\\d))/i.test(message);
}

async function fetchText(url, timeoutMs = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect:'follow',
      headers:{
        accept:'text/html,application/xhtml+xml',
        'user-agent':'Mozilla/5.0 (compatible; ChrisIzworskiFlightTracker/1.0; +https://chrisizworski.com/flight-tracker/)'
      },
      signal:controller.signal
    });
    if (!response.ok) throw new Error('Flight status source returned ' + response.status);
    const text = await response.text();
    if (!text || text.length > MAX_HTML_BYTES) throw new Error('Flight status source returned invalid content');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupAssignment({ flight, date, flightId }) {
  const normalized = normalizeMarketingFlight(flight);
  if (!normalized.ok) {
    return { status:'invalid', code:'invalid-flight', message:'Enter a flight number like DL1234 or AA86.' };
  }
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return { status:'invalid', code:'invalid-date', message:'Choose a valid travel date.' };
  }

  const baseUrl = `${FLIGHTSTATS_BASE}/flight-tracker/${encodeURIComponent(normalized.carrier)}/${encodeURIComponent(normalized.number)}`;
  let baseData;
  try {
    const baseHtml = await fetchText(baseUrl);
    baseData = parseNextData(baseHtml);
  } catch (error) {
    const cached = await readAssignmentCache(normalized.display,normalizedDate.raw,flightId);
    if (cached) return cached;
    const routeHint = await cachedRouteHint(normalized.display,normalizedDate.raw,flightId);
    let independentReachable=false;
    try {
      const independent = await lookupIndependentAssignmentFallback({normalized,normalizedDate,flightId,routeHint});
      independentReachable=true;
      if (independent) {
        await writeAssignmentCache(normalized.display,normalizedDate.raw,flightId,independent);
        if (!flightId || independent.status === 'choose-flight') {
          await writeAssignmentCache(normalized.display,normalizedDate.raw,null,independent);
        }
        return independent;
      }
    } catch {}
    // An unknown flight is not evidence of a provider-wide outage.
    // Confirm a failure against a separate, known published flight page before
    // using outage language. HTTP 403/404, missing records or bad markup are
    // per-flight coverage gaps even if a data scraper cannot resolve them.
    let verifiedFeedUnreachable=false;
    if (!independentReachable && assignmentSourceIsUnreachable(error) &&
        !(normalized.carrier === 'DL' && Number(normalized.number) >= 5000)) {
      // Marketing codeshares that cannot be resolved are coverage gaps.
      // A missing DL6xxx record is not proof that the entire feed is down.
      try {
        await fetchText(FLIGHTSTATS_BASE + '/flight-tracker/DL/445',3000);
      } catch (probeError) {
        verifiedFeedUnreachable=assignmentSourceIsUnreachable(probeError);
      }
    }
    return verifiedFeedUnreachable ? {
      status:'assignment-source-unavailable',
      flightNumber:normalized.display,
      date:normalizedDate.raw,
      message:'The flight-assignment source is unreachable even for a separate control flight. We cannot confirm the assigned aircraft right now.',
      checkedFallbacks:['last-good-assignment-cache','independent-public-history','control-flight-source-check'],
      source:{name:'FlightStats public flight tracker',url:baseUrl}
    } : {
      status:'assignment-not-covered',
      flightNumber:normalized.display,
      date:normalizedDate.raw,
      message:'We could not resolve a published aircraft assignment for this flight and date. This is a coverage gap; no source-wide outage was verified.',
      checkedFallbacks:['last-good-assignment-cache','independent-public-history','control-flight-source-check'],
      source:{name:'Public flight assignment sources',url:baseUrl}
    };
  }

  const options = optionsForDate(baseData, normalizedDate);
  const baseFlightData = baseData?.props?.initialState?.flightTracker?.flight;
  const baseFlight = baseFlightMatchesDate(baseFlightData,normalizedDate)
    ? sanitizeFlight(baseFlightData,normalized,baseUrl)
    : null;

  if (!options.length) {
    if (baseFlight?.flightId) {
      await writeAssignmentCache(normalized.display,normalizedDate.raw,baseFlight.flightId,baseFlight);
      await writeAssignmentCache(normalized.display,normalizedDate.raw,null,baseFlight);
      return {
        ...baseFlight,
        fallback:{kind:'flightstats-base-occurrence',stale:false,note:'Resolved from the primary flight page because the occurrence list was unavailable.'}
      };
    }

    const cached = await readAssignmentCache(normalized.display,normalizedDate.raw,flightId);
    if (cached) return cached;
    let independentReachable=false;
    try {
      const routeHint=await cachedRouteHint(normalized.display,normalizedDate.raw,flightId);
      const independent=await lookupIndependentAssignmentFallback({normalized,normalizedDate,flightId,routeHint});
      independentReachable=true;
      if (independent) {
        await writeAssignmentCache(normalized.display,normalizedDate.raw,flightId,independent);
        if (!flightId || independent.status === 'choose-flight') {
          await writeAssignmentCache(normalized.display,normalizedDate.raw,null,independent);
        }
        return independent;
      }
    } catch {}

    return {
      status:'assignment-not-covered',
      flightNumber:normalized.display,
      date:normalizedDate.raw,
      message:independentReachable
        ? 'The public assignment sources responded, but no aircraft-assignment coverage is published for this flight and date. This is a coverage gap, not a temporary outage.'
        : 'The primary public source responded without a usable occurrence or aircraft assignment for this flight and date. This is an assignment coverage gap, not proof that the passenger flight does not exist.',
      checkedFallbacks:independentReachable
        ? ['last-good-assignment-cache','independent-public-history']
        : ['last-good-assignment-cache'],
      source:{name:'Public flight assignment sources',url:baseUrl}
    };
  }

  let selected = null;
  if (flightId) selected = options.find(option => option.flightId === String(flightId)) || null;
  if (!selected && options.length === 1) selected = options[0];

  if (!selected) {
    const choice = {
      status:'choose-flight',
      flightNumber:normalized.display,
      date:normalizedDate.raw,
      message:'More than one flight uses this number today. Choose your route.',
      options:options.map(({sourcePath,...option}) => option),
      source:{ name:'FlightStats public flight tracker', url:baseUrl }
    };
    await writeAssignmentCache(normalized.display,normalizedDate.raw,null,choice);
    return choice;
  }

  const detailUrl = FLIGHTSTATS_BASE + selected.sourcePath;
  let flightData = null;
  try {
    const detailHtml = await fetchText(detailUrl);
    const detailData = parseNextData(detailHtml);
    flightData = detailData?.props?.initialState?.flightTracker?.flight || null;
  } catch {}

  if (!flightData?.flightId && baseFlightData?.flightId && String(baseFlightData.flightId) === String(selected.flightId)) {
    flightData = baseFlightData;
  }
  if (!flightData?.flightId) {
    const cached = await readAssignmentCache(normalized.display,normalizedDate.raw,selected.flightId);
    if (cached) return cached;
    let independentReachable=false;
    try {
      const independent = await lookupIndependentAssignmentFallback({
        normalized,normalizedDate,flightId:selected.flightId,routeHint:selected
      });
      independentReachable=true;
      if (independent?.status === 'found') {
        await writeAssignmentCache(normalized.display,normalizedDate.raw,selected.flightId,independent);
        return independent;
      }
    } catch {}
    if (independentReachable) {
      return {
        status:'assignment-not-covered',
        flightNumber:normalized.display,
        date:normalizedDate.raw,
        flightId:selected.flightId,
        message:'The scheduled flight exists, but no public aircraft-assignment coverage is available for this occurrence.',
        route:{origin:selected.origin,destination:selected.destination},
        checkedFallbacks:['flightstats-base-occurrence','last-good-assignment-cache','independent-public-history'],
        source:{name:'Independent public flight history',url:FR24_PUBLIC_BASE + normalized.display.toLowerCase()}
      };
    }
    return {
      status:'assignment-not-covered',
      flightNumber:normalized.display,
      date:normalizedDate.raw,
      flightId:selected.flightId,
      message:'The scheduled flight exists, but its aircraft-assignment detail is not covered by the available public records. This is not a verified source outage.',
      route:{origin:selected.origin,destination:selected.destination},
      checkedFallbacks:['flightstats-base-occurrence','last-good-assignment-cache','independent-public-history','live-operating-callsigns'],
      source:{name:'FlightStats public flight tracker',url:detailUrl}
    };
  }

  const selectedFlight = sanitizeFlight(flightData, normalized, detailUrl);
  const previousOccurrence = await findPreviousAircraftOccurrence(options, selected, selectedFlight, normalized);
  if (previousOccurrence) {
    selectedFlight.previousAircraftOccurrence = previousOccurrenceSummary(previousOccurrence);
    if (isMatchingAirborneOccurrence(previousOccurrence, selectedFlight)) {
      selectedFlight.currentAircraftOccurrence = currentOccurrenceSummary(previousOccurrence);
    }
  }
  await writeAssignmentCache(normalized.display,normalizedDate.raw,selected.flightId,selectedFlight);
  if (options.length === 1) await writeAssignmentCache(normalized.display,normalizedDate.raw,null,selectedFlight);
  return selectedFlight;
}

module.exports = async function handler(req, res) {
  const flightV3 = String(Array.isArray(req.query?.flightV3) ? req.query.flightV3[0] : req.query?.flightV3 || '') === '1';
  if (flightV3) {
    const v3Handler = require('../lib/flight-v3.js');
    return v3Handler(req,res);
  }
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const unified = String(Array.isArray(req.query?.unified) ? req.query.unified[0] : req.query?.unified || '') === '1';
  res.setHeader('Cache-Control', unified ? 'private, no-store' : `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`);
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow','GET');
    return res.end(JSON.stringify({status:'error',message:'Method not allowed'}));
  }

  const flight = Array.isArray(req.query?.flight) ? req.query.flight[0] : req.query?.flight;
  const date = Array.isArray(req.query?.date) ? req.query.date[0] : req.query?.date;
  const flightId = Array.isArray(req.query?.flightId) ? req.query.flightId[0] : req.query?.flightId;
  const tail = Array.isArray(req.query?.tail) ? req.query.tail[0] : req.query?.tail;
  const airport = Array.isArray(req.query?.airport) ? req.query.airport[0] : req.query?.airport;
  const carrier = Array.isArray(req.query?.carrier) ? req.query.carrier[0] : req.query?.carrier;
  const allowDirectLive = String(Array.isArray(req.query?.liveNow) ? req.query.liveNow[0] : req.query?.liveNow || '') === '1';

  try {
    const body = unified
      ? await buildUnifiedFlightState({flight,date,flightId,allowDirectLive})
      : tail || airport || carrier
        ? await lookupRecentArrivalWithCache({tail,airport,carrier,date})
        : await lookupAssignment({flight,date,flightId});
    res.statusCode = body.status === 'invalid' ? 400 : 200;
    return res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      status:'assignment-not-covered',
      message:'We could not resolve a usable aircraft assignment for this flight and date. No source-wide outage is verified; treat this as an assignment coverage gap.',
      detail:process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined
    }));
  }
};

module.exports._test = {
  clean,
  normalizeMarketingFlight,
  normalizeDate,
  parseNextData,
  optionDate,
  optionsForDate,
  sanitizeOption,
  sanitizeFlight,
  normalizeAirportCode,
  normalizeCarrierCode,
  recentArrivalCandidates,
  recentArrivalMatchScore,
  recentArrivalSummary,
  lookupRecentArrivalByTail,
  lookupRecentArrivalWithCache,
  sameTail,
  isMatchingAirborneOccurrence,
  isMatchingPreviousOccurrence,
  previousOccurrenceSummary,
  currentOccurrenceSummary,
  findCurrentAircraftOccurrence,
  findPreviousAircraftOccurrence,
  lookupAssignment,
  finiteNumber,
  normalizeTail,
  airportCode,
  sameAirport,
  marketingFlightFromCallsign,
  sanitizeAdsbAircraft,
  positionObservation,
  strongStatusState,
  departedOverHourAgo,
  recentInboundAtOrigin,
  reconcileFlightState,
  operatingOccurrenceMatches,
  dateIsNearNow,
  embeddedInboundOccurrence,
  fr24HistoryUtc,
  parseFr24AircraftHistoryRows,
  independentInboundFromTailRows,
  lookupIndependentInboundByTail,
  observedInboundFromLive,
  readInboundCache,
  writeInboundCache,
  readCodeshareCache,
  writeCodeshareCache,
  parseCodeshareOperatingCandidates,
  codeshareAssignmentScore,
  cachedAssignmentsForFlight,
  resolveCodeshareOperatingFlight,
  candidateAssignmentsForCodeshare,
  codeshareOccurrenceMatchScore,
  resolveCodeshareAgainstAssignment,
  applyCodeshareAssignment,
  directLiveIsAirborne,
  directLiveAssignment,
  buildUnifiedFromAssignment,
  buildUnifiedFlightState,
  operatingCarrierSummary,
  baseFlightMatchesDate,
  confirmedArrival,
  readAssignmentCache,
  writeAssignmentCache,
  REGIONAL_IATA_TO_ICAO,
  fr24DateLabel,
  parseFr24HistoryRows,
  fr24SyntheticFlightId,
  fr24RouteHintFromFlightId,
  fr24AssignmentFromRow,
  lookupIndependentAssignmentFallback
};
