'use strict';

const FLIGHTSTATS_BASE = 'https://www.flightstats.com/v2';
const CACHE_SECONDS = 30;
const MAX_HTML_BYTES = 1_500_000;

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
      scheduledArrivalUTC:String(flight?.schedule?.scheduledArrivalUTC || '').trim() || null,
      estimatedArrivalUTC:String(flight?.schedule?.estimatedActualArrivalUTC || '').trim() || null
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

  return sanitizeFlight(flightData, normalized, detailUrl);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control',`public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`);
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow','GET');
    return res.end(JSON.stringify({status:'error',message:'Method not allowed'}));
  }

  const flight = Array.isArray(req.query?.flight) ? req.query.flight[0] : req.query?.flight;
  const date = Array.isArray(req.query?.date) ? req.query.date[0] : req.query?.date;
  const flightId = Array.isArray(req.query?.flightId) ? req.query.flightId[0] : req.query?.flightId;

  try {
    const body = await lookupAssignment({flight,date,flightId});
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
  lookupAssignment
};
