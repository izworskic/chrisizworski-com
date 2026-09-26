'use strict';

// Michigan snow totals: official NWS Local Storm Reports (snow) for Michigan,
// served from the Iowa Environmental Mesonet LSR archive, plus active NWS
// winter alerts. Every number is a reported measurement or estimate with its
// time, place, source and the reporter's remark. Nothing here is modeled.
//
// A report's inches are what the observer reported at that time. The duration
// behind it varies (since snow began, 24 hours, storm total), and the remark
// usually says which, so it is never relabeled as a 24-hour total.

const IEM_LSR = 'https://mesonet.agron.iastate.edu/geojson/lsr.php';
const NWS_ALERTS = 'https://api.weather.gov/alerts/active?area=MI';
const HEADERS = {
  Accept: 'application/geo+json,application/json',
  'User-Agent': 'chrisizworski.com Michigan snow totals (https://chrisizworski.com/michigan-snow-totals/)',
};
const WINTER_EVENT = /winter|snow|blizzard|lake effect|ice storm|freezing|wind chill|cold/i;
const HOUR = 3600e3;

// NWS forecast offices that report for Michigan, with the part of the state each covers.
const OFFICES = {
  MQT: { name: 'NWS Marquette', area: 'central and western Upper Peninsula' },
  APX: { name: 'NWS Gaylord', area: 'northern Lower Peninsula and eastern Upper Peninsula' },
  GRR: { name: 'NWS Grand Rapids', area: 'west and central Lower Michigan' },
  DTX: { name: 'NWS Detroit/Pontiac', area: 'southeast Michigan and the Thumb' },
  IWX: { name: 'NWS Northern Indiana', area: 'far southwest Michigan' },
};

async function fetchJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const iso = d => new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z');

async function lsrWindow(fromMs, toMs) {
  const url = `${IEM_LSR}?states=MI&sts=${iso(fromMs)}&ets=${iso(toMs)}`;
  const data = await fetchJson(url, 15000);
  return (data.features || []).map(f => f.properties || {}).filter(p => String(p.typetext).toUpperCase() === 'SNOW');
}

function normalize(p) {
  const inches = Number.parseFloat(p.magnitude);
  const valid = Date.parse(p.valid);
  if (!Number.isFinite(inches) || inches < 0 || !Number.isFinite(valid)) return null;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return null;
  return {
    inches,
    reportedAt: new Date(valid).toISOString(),
    place: String(p.city || '').trim(),
    county: String(p.county || '').trim(),
    lat: p.lat,
    lon: p.lon,
    office: String(p.wfo || '').toUpperCase(),
    source: String(p.source || '').trim(),
    measured: p.qualifier === 'M',
    remark: String(p.remark || '').replace(/\s+/g, ' ').trim().slice(0, 240),
    productId: p.product_id || null,
    productUrl: p.product_id ? `https://mesonet.agron.iastate.edu/p.php?pid=${encodeURIComponent(p.product_id)}` : null,
  };
}

// One row per location: its largest report inside the window. Spotters update the
// same spot through a storm, so ranking raw rows would repeat towns.
function largestPerPlace(reports) {
  const best = new Map();
  for (const r of reports) {
    const key = `${r.place}|${r.county}`.toLowerCase();
    const prior = best.get(key);
    if (!prior || r.inches > prior.inches || (r.inches === prior.inches && r.reportedAt > prior.reportedAt)) best.set(key, r);
  }
  return [...best.values()].sort((a, b) => b.inches - a.inches || b.reportedAt.localeCompare(a.reportedAt));
}

function summarize(reports, nowMs) {
  const windows = {};
  for (const hours of [24, 48, 72, 168]) {
    const inWindow = reports.filter(r => nowMs - Date.parse(r.reportedAt) <= hours * HOUR);
    const ranked = largestPerPlace(inWindow);
    const byOffice = {};
    for (const r of ranked) {
      const o = byOffice[r.office] ||= { office: r.office, ...OFFICES[r.office], places: 0, largest: null };
      o.places += 1;
      if (!o.largest || r.inches > o.largest.inches) o.largest = r;
    }
    windows[`${hours}h`] = {
      hours,
      reportCount: inWindow.length,
      placeCount: ranked.length,
      largest: ranked[0] || null,
      ranked: ranked.slice(0, 60),
      byOffice: Object.values(byOffice).sort((a, b) => (b.largest?.inches || 0) - (a.largest?.inches || 0)),
    };
  }
  return windows;
}

// When nothing has fallen in a week, find the most recent reported snow so the
// page can say when and where it last happened instead of implying winter is on.
async function lastSnow(nowMs) {
  for (const days of [30, 120, 240]) {
    const found = (await lsrWindow(nowMs - days * 24 * HOUR, nowMs)).map(normalize).filter(Boolean);
    if (!found.length) continue;
    found.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
    const latest = found[0];
    const day = latest.reportedAt.slice(0, 10);
    const sameDay = largestPerPlace(found.filter(r => r.reportedAt.slice(0, 10) === day)).slice(0, 5);
    return { reportedAt: latest.reportedAt, latest, sameDay, searchedDays: days };
  }
  return null;
}

async function winterAlerts() {
  const data = await fetchJson(NWS_ALERTS, 8000);
  return (data.features || [])
    .map(f => f.properties || {})
    .filter(a => WINTER_EVENT.test(a.event || ''))
    .map(a => ({
      event: a.event,
      headline: a.headline || null,
      areas: String(a.areaDesc || '').slice(0, 400),
      onset: a.onset || a.effective || null,
      ends: a.ends || a.expires || null,
      office: a.senderName || null,
      url: a['@id'] || a.id || null,
    }))
    .slice(0, 12);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const nowMs = Date.now();
  const errors = [];
  let reports = [];
  let alerts = [];
  const [lsr, alertResult] = await Promise.allSettled([lsrWindow(nowMs - 168 * HOUR, nowMs), winterAlerts()]);
  if (lsr.status === 'fulfilled') reports = lsr.value.map(normalize).filter(Boolean);
  else errors.push('snow-reports');
  if (alertResult.status === 'fulfilled') alerts = alertResult.value;
  else errors.push('winter-alerts');

  let previous = null;
  if (!errors.includes('snow-reports') && reports.length === 0) {
    try { previous = await lastSnow(nowMs); } catch { errors.push('last-snow'); }
  }

  const body = {
    ok: !errors.includes('snow-reports'),
    generatedAt: new Date(nowMs).toISOString(),
    degraded: errors.length > 0,
    errors,
    windows: summarize(reports, nowMs),
    lastSnow: previous,
    alerts,
    offices: OFFICES,
    notes: {
      reports: 'Each figure is snowfall as reported to the National Weather Service at the stated time by a spotter, CoCoRaHS or co-op observer, NWS staff or the public. The period it covers varies; read the remark.',
      ranking: 'Rankings show each location once, at its largest report inside the selected window.',
      measured: 'Measured means the observer measured it; estimated means it was not directly measured.',
    },
    sources: {
      reports: 'NWS Local Storm Reports via the Iowa Environmental Mesonet archive (mesonet.agron.iastate.edu)',
      alerts: 'National Weather Service active alerts (api.weather.gov)',
    },
  };
  const hasSnow = reports.length > 0;
  res.setHeader('Cache-Control', hasSnow ? 's-maxage=600, stale-while-revalidate=1800' : 's-maxage=3600, stale-while-revalidate=7200');
  return res.status(body.ok ? 200 : 503).json(body);
};

module.exports._test = { normalize, largestPerPlace, summarize, OFFICES };
