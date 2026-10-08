'use strict';

const FR24_SEARCH_BASE = 'https://www.flightradar24.com/v1/search/web/find';
const FR24_SEARCH_READER_BASE = 'https://r.jina.ai/https://www.flightradar24.com/v1/search/web/find';
const SEARCH_TIMEOUT_MS = 5000;

function cleanFlight(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function exactResultScore(result, requested) {
  const detail = result?.detail || {};
  const flight = cleanFlight(detail.flight);
  const codeshare = cleanFlight(detail.codeshare);
  const id = cleanFlight(result?.id);
  const type = String(result?.type || '').toLowerCase();
  const match = String(result?.match || '').toLowerCase();

  let score = -Infinity;
  if (codeshare === requested) score = 1000;
  else if (flight === requested) score = 900;
  else if (id === requested && (type === 'schedule' || type === 'live')) score = 800;
  else return -Infinity;

  if (type === 'live') score += 200;
  if (match === 'codeshare') score += 80;
  if (match === 'exact') score += 40;
  if (detail.reg) score += 20;
  if (detail.callsign) score += 10;
  return score;
}

function pickExactIdentity(data, requestedFlight) {
  const requested = cleanFlight(requestedFlight);
  if (!requested) return null;
  const results = Array.isArray(data?.results) ? data.results : [];
  const candidates = results
    .map(result => ({result,score:exactResultScore(result,requested)}))
    .filter(item => Number.isFinite(item.score))
    .sort((a,b) => b.score - a.score);
  if (!candidates.length) return null;

  const result = candidates[0].result;
  const detail = result?.detail || {};
  const operatingFlight = cleanFlight(detail.flight || result.id || requested) || requested;
  const callsign = cleanFlight(detail.callsign) || null;
  const registration = String(detail.reg || '').trim().toUpperCase() || null;
  const origin = cleanFlight(detail.schd_from) || null;
  const destination = cleanFlight(detail.schd_to) || null;
  const lat = finite(detail.lat);
  const lon = finite(detail.lon);

  return {
    requestedFlight:requested,
    recognized:true,
    type:String(result?.type || '').toLowerCase() || null,
    match:String(result?.match || '').toLowerCase() || null,
    operatingFlight,
    codeshare:cleanFlight(detail.codeshare) === requested && operatingFlight !== requested,
    callsign,
    registration,
    aircraftType:cleanFlight(detail.ac_type) || null,
    origin,
    destination,
    route:String(detail.route || '').trim() || null,
    liveHint:Boolean(String(result?.type || '').toLowerCase() === 'live' && lat !== null && lon !== null),
    lat,
    lon,
    source:{
      name:'Flightradar24 public search',
      url:'https://www.flightradar24.com/',
      kind:'public-flight-identity'
    }
  };
}

function parseReaderJson(text) {
  const raw=String(text || '');
  const marker='Markdown Content:';
  const startMarker=raw.indexOf(marker);
  const start=raw.indexOf('{',startMarker >= 0 ? startMarker + marker.length : 0);
  const end=raw.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('public identity reader returned invalid content');
  return JSON.parse(raw.slice(start,end + 1));
}

async function fetchSearch(query, {fetchImpl=fetch, timeoutMs=SEARCH_TIMEOUT_MS}={}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),timeoutMs);
  try {
    const suffix = '?query=' + encodeURIComponent(cleanFlight(query)) + '&limit=100';
    const response = await fetchImpl(FR24_SEARCH_READER_BASE + suffix,{
      headers:{
        accept:'text/plain',
        'user-agent':'ChrisIzworski-FlightTracker/1.0 (+https://chrisizworski.com/flight-tracker/)'
      },
      signal:controller.signal
    });
    if (!response.ok) throw new Error('public identity source returned ' + response.status);
    return parseReaderJson(await response.text());
  } finally {
    clearTimeout(timer);
  }
}

async function resolvePublicFlightIdentity(requestedFlight, options={}) {
  const requested = cleanFlight(requestedFlight);
  if (!requested) return null;

  let first;
  try {
    first = pickExactIdentity(await fetchSearch(requested,options),requested);
  } catch {
    return null;
  }
  if (!first) return null;

  if (first.operatingFlight !== requested && !first.liveHint) {
    try {
      const operating = pickExactIdentity(
        await fetchSearch(first.operatingFlight,options),
        first.operatingFlight
      );
      if (operating?.liveHint) {
        return {
          ...first,
          callsign:operating.callsign || first.callsign,
          registration:operating.registration || first.registration,
          aircraftType:operating.aircraftType || first.aircraftType,
          origin:operating.origin || first.origin,
          destination:operating.destination || first.destination,
          route:operating.route || first.route,
          liveHint:true,
          lat:operating.lat,
          lon:operating.lon,
          operatingIdentitySource:operating.source
        };
      }
    } catch {}
  }

  return first;
}

module.exports = {
  cleanFlight,
  exactResultScore,
  pickExactIdentity,
  parseReaderJson,
  fetchSearch,
  resolvePublicFlightIdentity,
  FR24_SEARCH_BASE,
  FR24_SEARCH_READER_BASE
};
