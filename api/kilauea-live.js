'use strict';

const { buildDecision, classifyActivity, classifyForecastability, VIEWPOINTS } = require('../lib/kilauea-decision');

const HANS_URL = 'https://volcanoes.usgs.gov/hans-public/api/volcano/newestForVolcano/332010';
const HVO_UPDATES_URL = 'https://www.usgs.gov/volcanoes/kilauea/volcano-updates';
const HVO_MESSAGES_URL = 'https://www.usgs.gov/volcanoes/kilauea/volcano-updates/volcano-messages';
const NPS_CONDITIONS_URL = 'https://www.nps.gov/havo/planyourvisit/conditions.htm';
const NPS_ALERTS_URL = 'https://developer.nps.gov/api/v1/alerts?parkCode=havo&limit=50';
const NPS_VIEWING_URL = 'https://www.nps.gov/havo/planyourvisit/eruption-viewing.htm';
const NPS_PARKING_URL = 'https://www.nps.gov/havo/planyourvisit/parking.htm';
const NWS_POINT_URL = 'https://api.weather.gov/points/19.421,-155.287';
const HAWAII_DOH_AIR_URL = 'https://air.doh.hawaii.gov/home/text/118';
const OFFICIAL_CAM_URL = 'https://www.youtube.com/watch?v=tk0tfYDxrUA';

const UA = 'KilaueaLive/0.1 (https://chrisizworski.com/; visitor decision tool)';

function nowIso() { return new Date().toISOString(); }
function asArray(v) { return Array.isArray(v) ? v : v == null ? [] : [v]; }
function cleanText(v) { return String(v || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim(); }
function safeDate(v) { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }

async function fetchWithTimeout(url, options = {}, timeoutMs = 8500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'User-Agent': UA, Accept: '*/*', ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function walk(obj, fn, path = []) {
  if (obj == null) return;
  fn(obj, path);
  if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, fn, path.concat(i)));
  else if (typeof obj === 'object') Object.entries(obj).forEach(([k, v]) => walk(v, fn, path.concat(k)));
}

function joinedStrings(obj) {
  const out = [];
  walk(obj, (v, path) => {
    const key = String(path[path.length - 1] || '').toLowerCase();
    if (typeof v === 'string' && v.length > 2 && !/(url|link|id|code)$/.test(key)) out.push(v);
  });
  return [...new Set(out)].join(' ');
}

function firstByKeys(obj, keys) {
  const wanted = new Set(keys.map(k => k.toLowerCase()));
  let result = null;
  walk(obj, (v, path) => {
    if (result != null || !path.length) return;
    const key = String(path[path.length - 1]).toLowerCase();
    if (wanted.has(key) && (typeof v === 'string' || typeof v === 'number')) result = v;
  });
  return result;
}

function hansTimestamp(obj) {
  const raw = firstByKeys(obj, ['sent', 'sentUtc', 'sentDate', 'issued', 'issueDate', 'noticeDate', 'publishDate', 'published', 'date', 'updateTime', 'updated']);
  return safeDate(raw);
}

function detectAlertLevel(text, obj) {
  const raw = String(firstByKeys(obj, ['alertLevel', 'alert_level', 'alert']) || '');
  if (raw) return raw.toUpperCase();
  const m = String(text).match(/(?:volcano alert level|alert level)\s*[:\-]?\s*(NORMAL|ADVISORY|WATCH|WARNING)/i);
  return m ? m[1].toUpperCase() : null;
}

function detectColorCode(text, obj) {
  const raw = String(firstByKeys(obj, ['colorCode', 'color_code', 'aviationColorCode']) || '');
  if (raw) return raw.toUpperCase();
  const m = String(text).match(/(?:aviation color code|color code)\s*[:\-]?\s*(GREEN|YELLOW|ORANGE|RED)/i);
  return m ? m[1].toUpperCase() : null;
}

function parseUsDateFromText(text) {
  const m = String(text).match(/(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\s*,?\s*(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.|AM|PM)?\s*HST/i);
  if (!m) return null;
  const months = {january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
  let hour = Number(m[4]);
  const ap = String(m[6] || '').toLowerCase();
  if (ap.startsWith('p') && hour < 12) hour += 12;
  if (ap.startsWith('a') && hour === 12) hour = 0;
  // Hawaii Standard Time is UTC-10 year-round.
  const utc = Date.UTC(Number(m[3]), months[m[1].toLowerCase()], Number(m[2]), hour + 10, Number(m[5]));
  return new Date(utc).toISOString();
}

function parseHstIsoDate(dateText, timeText) {
  const m = String(dateText).match(/(20\d{2})-(\d{2})-(\d{2})/);
  const t = String(timeText).match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (!m || !t) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]) + 10, Number(t[2]), Number(t[3]))).toISOString();
}

function extractLatestMessage(text) {
  const re = /Kilauea Message\s+(20\d{2}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2})\s+HST\s+([\s\S]*?)(?=Kilauea Message\s+20\d{2}-\d{2}-\d{2}|Hawaiian Volcano Observatory Message\s+20\d{2}-\d{2}-\d{2}|Was this page helpful\?|$)/i;
  const m = String(text).match(re);
  if (!m) return null;
  return { observedAt: parseHstIsoDate(m[1], m[2]), text: m[3].trim().slice(0, 6000) };
}

function extractDailyUpdate(text) {
  const full = String(text);
  const idx = full.search(/HAWAIIAN VOLCANO OBSERVATORY (?:DAILY )?UPDATE/i);
  const body = idx >= 0 ? full.slice(idx) : full;
  const observedAt = parseUsDateFromText(body);
  // The live page leads with the current update. Cap the extraction so archive/navigation text cannot dominate classification.
  return { observedAt, text: body.slice(0, 24000) };
}

async function loadHvo() {
  const fetchedAt = nowIso();
  const errors = [];
  let daily = null;
  let message = null;

  try {
    const [dailyResponse, messageResponse] = await Promise.all([
      fetchWithTimeout(HVO_UPDATES_URL, { headers: { Accept: 'text/html' } }),
      fetchWithTimeout(HVO_MESSAGES_URL, { headers: { Accept: 'text/html' } })
    ]);
    daily = extractDailyUpdate(cleanText(await dailyResponse.text()).slice(0, 80000));
    message = extractLatestMessage(cleanText(await messageResponse.text()).slice(0, 50000));
  } catch (err) {
    errors.push(`USGS current pages: ${err.message}`);
  }

  if (daily?.text?.length > 300 && daily.observedAt) {
    const dailyTime = new Date(daily.observedAt).getTime();
    const messageTime = message?.observedAt ? new Date(message.observedAt).getTime() : 0;
    const newerMessage = messageTime > dailyTime ? message : null;
    const text = newerMessage ? `LATEST HVO SHORT MESSAGE: ${newerMessage.text} LATEST HVO DAILY UPDATE: ${daily.text}` : daily.text;
    const observedAt = newerMessage?.observedAt || daily.observedAt;
    return {
      source: { name: 'USGS Hawaiian Volcano Observatory', status: 'ok', fetchedAt, observedAt, url: HVO_UPDATES_URL, note: newerMessage ? 'A newer HVO short message is layered over the latest daily update.' : 'Latest HVO daily update.' },
      eruption: {
        text,
        observedAt,
        dailyObservedAt: daily.observedAt,
        messageObservedAt: message?.observedAt || null,
        alertLevel: detectAlertLevel(daily.text, {}),
        colorCode: detectColorCode(daily.text, {}),
        activity: classifyActivity(text),
        forecastability: classifyForecastability(daily.text)
      }
    };
  }

  // Fallback to HANS when the USGS presentation pages are unavailable or their timestamp cannot be parsed.
  try {
    const r = await fetchWithTimeout(HANS_URL, { headers: { Accept: 'application/json' } });
    const json = await r.json();
    const text = joinedStrings(json);
    const observedAt = hansTimestamp(json) || parseUsDateFromText(text);
    if (text.length > 80) {
      return {
        source: { name: 'USGS Hawaiian Volcano Observatory', status: observedAt ? 'ok' : 'degraded', fetchedAt, observedAt, url: HANS_URL, note: observedAt ? `USGS current pages unavailable; using HANS. ${errors.join(' ')}` : `HVO content loaded, but an issuance timestamp could not be safely parsed. ${errors.join(' ')}` },
        eruption: {
          text,
          observedAt,
          alertLevel: detectAlertLevel(text, json),
          colorCode: detectColorCode(text, json),
          activity: classifyActivity(text),
          forecastability: classifyForecastability(text)
        }
      };
    }
    errors.push('HANS response did not contain usable notice text.');
  } catch (err) { errors.push(`HANS: ${err.message}`); }

  return { source: { name: 'USGS Hawaiian Volcano Observatory', status: 'offline', fetchedAt, observedAt: null, url: HVO_UPDATES_URL, note: errors.join(' ') || 'No current HVO input could be loaded.' }, eruption: { text: '', observedAt: null, activity: { state:'UNKNOWN', label:'Status unavailable', evidence:[] }, forecastability:{state:'NONE',label:'No official window stated'} } };
}

function localClosureWindow(text, name) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(name.toLowerCase());
  if (idx < 0) return false;
  const window = lower.slice(Math.max(0, idx - 220), idx + name.length + 260);
  return /\bclosed\b|\bclosure\b|not accessible|no access/.test(window);
}

function parkWideClosure(text) {
  return /hawai[ʻ'i’\s]+volcanoes national park (?:is|will be|remains) closed|the (?:entire )?park (?:is|will be|remains) closed|all remaining park areas[^.]{0,120}\bclose|park-wide closure|closed to recreational activities/i.test(String(text || ''));
}

async function loadNps() {
  const fetchedAt = nowIso();
  let conditions = '';
  let viewing = '';
  const errors = [];

  try {
    const [conditionsResponse, viewingResponse] = await Promise.all([
      fetchWithTimeout(NPS_CONDITIONS_URL, { headers: { Accept: 'text/html' } }),
      fetchWithTimeout(NPS_VIEWING_URL, { headers: { Accept: 'text/html' } })
    ]);
    conditions = cleanText(await conditionsResponse.text()).slice(0, 60000);
    viewing = cleanText(await viewingResponse.text()).slice(0, 40000);
  } catch (err) {
    errors.push(`NPS pages: ${err.message}`);
  }

  let alerts = [];
  let alertApiVerified = false;
  if (process.env.NPS_API_KEY) {
    try {
      const response = await fetchWithTimeout(NPS_ALERTS_URL, { headers: { Accept: 'application/json', 'X-Api-Key': process.env.NPS_API_KEY } });
      const json = await response.json();
      alerts = asArray(json?.data);
      alertApiVerified = true;
    } catch (err) {
      errors.push(`NPS alerts API: ${err.message}`);
    }
  }

  const closureAlerts = alerts.filter(a => /closure/i.test(String(a?.category || '')));
  const alertText = closureAlerts.map(a => `${a?.title || ''} ${a?.description || ''}`).join(' ');
  const explicitParkClosed = parkWideClosure(alertText) || parkWideClosure(conditions);
  const closedViewpoints = [];
  const closureCorpus = `${alertText} ${conditions}`;
  if (localClosureWindow(closureCorpus, 'Uēkahuna')) closedViewpoints.push('uekahuna');
  if (localClosureWindow(closureCorpus, 'Kīlauea Overlook')) closedViewpoints.push('kilauea-overlook');
  if (localClosureWindow(closureCorpus, 'Keanakākoʻi')) closedViewpoints.push('keanakakoi');

  const webpageLoaded = conditions.length > 100;
  const closureUnknown = !explicitParkClosed && !alertApiVerified;
  const sourceStatus = alertApiVerified ? 'ok' : webpageLoaded ? 'degraded' : 'offline';
  const note = alertApiVerified
    ? 'Current NPS alerts API checked. The NPS API can lag park-site alert changes by up to roughly two hours.'
    : webpageLoaded
      ? 'NPS current-conditions page loaded, but the authenticated alerts API is not verified in this deployment; access is treated as unconfirmed.'
      : `NPS access could not be verified. ${errors.join(' ')}`;

  return {
    source: { name: 'National Park Service', status: sourceStatus, fetchedAt, observedAt: null, url: NPS_CONDITIONS_URL, note },
    access: {
      parkClosed: explicitParkClosed,
      closureUnknown,
      closureReason: explicitParkClosed ? 'National Park Service information indicates a park-wide closure. Follow NPS instructions before travel.' : null,
      closedViewpoints: [...new Set(closedViewpoints)],
      activeClosureAlerts: closureAlerts.map(a => ({ title:a?.title || null, category:a?.category || null, url:a?.url || null })).slice(0, 12),
      conditionsText: conditions.slice(0, 9000),
      viewingText: viewing.slice(0, 9000)
    }
  };
}

async function loadWeather() {
  const fetchedAt = nowIso();
  try {
    const point = await (await fetchWithTimeout(NWS_POINT_URL, { headers: { Accept: 'application/geo+json' } })).json();
    const hourlyUrl = point?.properties?.forecastHourly;
    if (!hourlyUrl) throw new Error('NWS point metadata did not contain forecastHourly.');
    const hourlyJson = await (await fetchWithTimeout(hourlyUrl, { headers: { Accept: 'application/geo+json' } })).json();
    const periods = asArray(hourlyJson?.properties?.periods).slice(0, 30).map(p => ({
      number: p.number,
      startTime: p.startTime,
      endTime: p.endTime,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
      probabilityOfPrecipitation: p.probabilityOfPrecipitation,
      precipProbability: p.probabilityOfPrecipitation?.value,
      windSpeed: p.windSpeed,
      windDirection: p.windDirection,
      shortForecast: p.shortForecast,
      isDaytime: p.isDaytime
    }));
    const observedAt = safeDate(hourlyJson?.properties?.updateTime || hourlyJson?.properties?.generatedAt);
    return { source: { name: 'National Weather Service', status: periods.length ? 'ok':'degraded', fetchedAt, observedAt, url: hourlyUrl, note: periods.length ? null : 'NWS feed returned no hourly periods.' }, weather: { hourly: periods } };
  } catch (err) {
    return { source: { name: 'National Weather Service', status: 'offline', fetchedAt, observedAt: null, url: NWS_POINT_URL, note: err.message }, weather: { hourly: [] } };
  }
}

async function loadAir() {
  const fetchedAt = nowIso();
  try {
    const response = await fetchWithTimeout(HAWAII_DOH_AIR_URL, { headers: { Accept: 'text/html,text/plain' } }, 7000);
    const raw = await response.text();
    const text = cleanText(raw).slice(0, 20000);
    const adverse = /hazardous|very unhealthy|unhealthy|sulfur dioxide[^.]{0,100}(?:elevated|high)|SO2[^.]{0,100}(?:elevated|high)/i.test(text);
    // We deliberately do not invent a numeric SO2 value when the public text page cannot be parsed reliably.
    return { source: { name: 'Hawaiʻi Department of Health air monitoring', status: text.length > 80 ? 'degraded':'offline', fetchedAt, observedAt: null, url: HAWAII_DOH_AIR_URL, note: text.length > 80 ? 'Air page reachable. Numeric summit SO₂ is not used until a stable machine-readable field is verified.' : 'Air page did not expose a usable current reading.' }, air: { advisoryDetected: adverse, text: text.slice(0, 1200), numericVerified: false } };
  } catch (err) {
    return { source: { name: 'Hawaiʻi Department of Health air monitoring', status: 'offline', fetchedAt, observedAt: null, url: HAWAII_DOH_AIR_URL, note: err.message }, air: { advisoryDetected: false, numericVerified: false } };
  }
}

function profileFromQuery(query = {}) {
  return { travel: query.travel, mobility: query.mobility, experience: query.experience, plan: query.plan };
}

function sourceStatus(sources) {
  const statuses = Object.values(sources).map(s => s?.status).filter(Boolean);
  if (statuses.includes('offline')) return 'degraded';
  if (statuses.includes('degraded')) return 'degraded';
  return 'ok';
}

function compactSnapshot({ eruption, access, weather, sources }) {
  const first = weather?.hourly?.[0] || null;
  return [
    eruption?.activity?.state || 'UNKNOWN',
    eruption?.forecastability?.state || 'NONE',
    eruption?.alertLevel || '-',
    eruption?.colorCode || '-',
    access?.parkClosed ? 'CLOSED' : access?.closureUnknown ? 'ACCESS_UNKNOWN' : 'ACCESS_OPEN_NOT_CONFIRMED',
    first?.shortForecast || '-',
    sources?.hvo?.observedAt || '-'
  ].join('|');
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  if (req.method && req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ ok:false, error:'Method not allowed' }); }

  const generatedAt = nowIso();
  const [hvo, nps, weather, air] = await Promise.all([loadHvo(), loadNps(), loadWeather(), loadAir()]);
  const sources = { hvo: hvo.source, nps: nps.source, weather: weather.source, air: air.source };
  const input = { eruption: hvo.eruption, access: nps.access, weather: weather.weather, air: air.air, sources };
  const profile = profileFromQuery(req.query || {});
  const decision = buildDecision(input, profile, new Date(generatedAt));

  // Access is unknown when NPS fails. Never let an attractive eruption state read as a fully cleared trip.
  if (nps.access?.closureUnknown && !['CLOSED','LIMITED'].includes(decision.state)) {
    decision.confidence = { level:'Limited data', why:'NPS access status could not be confirmed.', degraded:[...(decision.confidence?.degraded || []), 'National Park Service'] };
    if (/^GO/.test(decision.state)) decision.state = 'VERIFY ACCESS';
    decision.action = `Confirm NPS current conditions before travel. ${decision.action || ''}`.trim();
  }

  return res.status(200).json({
    ok: true,
    target: 'Kīlauea summit eruption viewing',
    generatedAt,
    sourceHealth: sourceStatus(sources),
    profile: decision.profile,
    decision,
    eruption: hvo.eruption,
    access: nps.access,
    weather: { hourly: weather.weather.hourly.slice(0, 18) },
    air: air.air,
    viewpoints: VIEWPOINTS,
    snapshot: compactSnapshot({ eruption:hvo.eruption, access:nps.access, weather:weather.weather, sources }),
    camera: { label:'USGS V1 Kīlauea summit livestream', url:OFFICIAL_CAM_URL, embedUrl:'https://www.youtube-nocookie.com/embed/tk0tfYDxrUA' },
    sources
  });
};
