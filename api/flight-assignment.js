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
let sourceConflictCount = 0;

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
  const marker = '__NEXT_DATA__ = ';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('Flight status page did not contain structured data');
  const jsonStart = start + marker.length;
  const endMarker = ';__NEXT_LOADED_PAGES__';
  const end = html.indexOf(endMarker, jsonStart);
  if (end < 0) throw new Error('Flight status structured data was incomplete');
  return JSON.parse(html.slice(jsonStart, end));
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
    operatingCarrier:flight?.operatedBy ? {
      name:String(flight.operatedBy.name || '').trim() || null,
      code:String(flight.operatedBy.fs || '').trim() || null
    } : null,
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

function strongStatusState(assignment) {
  if (assignment?.flightStatus?.canceled === true) return 'canceled';
  if (assignment?.flightStatus?.landed === true) return 'landed';
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
  } else if (!assignment?.tailNumber) {
    renderedState = 'unassigned';
  } else if (observation.fresh) {
    renderedState = observation.onGround ? 'ground-live' : 'airborne-live';
    renderSource = 'adsb-fresh';
  } else if (assignment?.flightStatus?.airborne === true) {
    renderedState = 'airborne-status';
  } else if (assignment?.flightStatus?.landed === true) {
    renderedState = 'landed-status';
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

async function resolveRecentInbound(assignment,date,nowMs = Date.now()) {
  if (!dateIsNearNow(date,nowMs)) return null;
  const tail = assignment?.tailNumber;
  const airport = airportCode(assignment?.origin);
  const carrier = carrierCode(assignment?.flightNumber);
  if (!tail || !airport || !carrier) return null;
  try {
    const result = await lookupRecentArrivalByTail({tail,airport,carrier,nowMs});
    return result?.status === 'found-inbound-occurrence' ? result.occurrence || null : null;
  } catch {
    return null;
  }
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

async function buildUnifiedFlightState({flight,date,flightId,nowMs = Date.now()}) {
  const assignment = await lookupAssignment({flight,date,flightId});
  if (assignment?.status !== 'found') return assignment;
  if (!assignment.tailNumber) {
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
    buildAdsbRegistrationSnapshot(assignment.tailNumber),
    resolveRecentInbound(assignment,date,nowMs)
  ]);
  const confirmedOperatingOccurrence = await resolveOperatingOccurrence(assignment,live,date);
  if (confirmedOperatingOccurrence && live && typeof live === 'object') {
    live.confirmedOperatingOccurrence = confirmedOperatingOccurrence;
  }
  const reconciliation = reconcileFlightState({assignment,live,recentInboundOccurrence,nowMs});
  return {
    status:'found',
    generatedAt:new Date(nowMs).toISOString(),
    assignment,
    live,
    recentInboundOccurrence,
    confirmedOperatingOccurrence,
    ...reconciliation,
    observability:logUnifiedRender(assignment,reconciliation)
  };
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
  const baseHtml = await fetchText(baseUrl);
  const baseData = parseNextData(baseHtml);
  const options = optionsForDate(baseData, normalizedDate);

  if (!options.length) {
    return {
      status:'not-found',
      flightNumber:normalized.display,
      date:normalizedDate.raw,
      message:'No scheduled occurrence of that flight was found for this date.',
      source:{ name:'FlightStats public flight tracker', url:baseUrl }
    };
  }

  let selected = null;
  if (flightId) selected = options.find(option => option.flightId === String(flightId)) || null;
  if (!selected && options.length === 1) selected = options[0];

  if (!selected) {
    return {
      status:'choose-flight',
      flightNumber:normalized.display,
      date:normalizedDate.raw,
      message:'More than one flight uses this number today. Choose your route.',
      options:options.map(({sourcePath,...option}) => option),
      source:{ name:'FlightStats public flight tracker', url:baseUrl }
    };
  }

  const detailUrl = FLIGHTSTATS_BASE + selected.sourcePath;
  const detailHtml = await fetchText(detailUrl);
  const detailData = parseNextData(detailHtml);
  const flightData = detailData?.props?.initialState?.flightTracker?.flight;
  if (!flightData || !flightData.flightId) throw new Error('Flight status detail was unavailable');

  const selectedFlight = sanitizeFlight(flightData, normalized, detailUrl);
  const previousOccurrence = await findPreviousAircraftOccurrence(options, selected, selectedFlight, normalized);
  if (previousOccurrence) {
    selectedFlight.previousAircraftOccurrence = previousOccurrenceSummary(previousOccurrence);
    if (isMatchingAirborneOccurrence(previousOccurrence, selectedFlight)) {
      selectedFlight.currentAircraftOccurrence = currentOccurrenceSummary(previousOccurrence);
    }
  }
  return selectedFlight;
}

module.exports = async function handler(req, res) {
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

  try {
    const body = unified
      ? await buildUnifiedFlightState({flight,date,flightId})
      : tail || airport || carrier
        ? await lookupRecentArrivalByTail({tail,airport,carrier})
        : await lookupAssignment({flight,date,flightId});
    res.statusCode = body.status === 'invalid' ? 400 : 200;
    return res.end(JSON.stringify(body));
  } catch (error) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      status:'source-unavailable',
      message:'Aircraft assignment data is temporarily unavailable. Live-flight tracking can still work after departure.',
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
  buildUnifiedFlightState
};
