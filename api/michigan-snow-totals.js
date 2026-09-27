'use strict';

// Michigan snow totals: official NWS Local Storm Reports (snow) for Michigan,
// served from the Iowa Environmental Mesonet LSR archive, plus active NWS
// winter alerts. Every number is a reported measurement or estimate with its
// time, place, source and the reporter's remark. Nothing here is modeled.
//
// A report's inches are what the observer reported at that time. The duration
// behind it varies (since snow began, 24 hours, storm total), and the remark
// usually says which, so it is never relabeled as a 24-hour total.
//
// ?view=season answers "how much this season, and is that a lot?" from NOAA
// ACIS daily snowfall at curated NWS climate stations, set against each
// station's 1991-2020 normal for the same dates. Last season's final figures
// and the first-snow climatology are precomputed by
// scripts/build-snow-reference-data.mjs into data/michigan-snow-climatology.json.

const core = require('../public/assets/snow-totals-core.js');
const climo = require('../data/michigan-snow-climatology.json');

const IEM_LSR = 'https://mesonet.agron.iastate.edu/geojson/lsr.php';
const NWS_ALERTS = 'https://api.weather.gov/alerts/active?area=MI';
const ACIS = 'https://data.rcc-acis.org/MultiStnData';
const HEADERS = {
  Accept: 'application/geo+json,application/json',
  'User-Agent': 'chrisizworski.com Michigan snow totals (https://chrisizworski.com/michigan-snow-totals/)',
};
const WINTER_EVENT = /winter|snow|blizzard|lake effect|ice storm|freezing|wind chill|cold/i;
const HOUR = 3600e3;
const DAY = 24 * HOUR;

// NWS forecast offices that report for Michigan, with the part of the state each covers.
const OFFICES = {
  MQT: { name: 'NWS Marquette', area: 'central and western Upper Peninsula' },
  APX: { name: 'NWS Gaylord', area: 'northern Lower Peninsula and eastern Upper Peninsula' },
  GRR: { name: 'NWS Grand Rapids', area: 'west and central Lower Michigan' },
  DTX: { name: 'NWS Detroit/Pontiac', area: 'southeast Michigan and the Thumb' },
  IWX: { name: 'NWS Northern Indiana', area: 'far southwest Michigan' },
};

async function fetchJson(url, { timeoutMs = 9000, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, body
      ? { method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal }
      : { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const iso = d => new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z');

async function lsrWindow(fromMs, toMs, timeoutMs = 12000) {
  const url = `${IEM_LSR}?states=MI&sts=${iso(fromMs)}&ets=${iso(toMs)}`;
  const data = await fetchJson(url, { timeoutMs });
  return (data.features || []).map(f => f.properties || {}).filter(p => String(p.typetext).toUpperCase() === 'SNOW');
}

function normalize(p) {
  const inches = Number.parseFloat(p.magnitude);
  const valid = Date.parse(p.valid);
  if (!Number.isFinite(inches) || inches < 0 || !Number.isFinite(valid)) return null;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return null;
  const county = String(p.county || '').trim();
  return {
    inches,
    reportedAt: new Date(valid).toISOString(),
    place: String(p.city || '').trim(),
    county,
    region: core.regionOf(county),
    lat: p.lat,
    lon: p.lon,
    office: String(p.wfo || '').toUpperCase(),
    source: String(p.source || '').trim(),
    sourceLabel: core.sourceLabel(p.source),
    measured: p.qualifier === 'M',
    remark: String(p.remark || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    productUrl: p.product_id ? `https://mesonet.agron.iastate.edu/p.php?pid=${encodeURIComponent(p.product_id)}` : null,
  };
}

const largestPerPlace = core.largestPerPlace;

// Window statistics. The full per-place ranking is built in the browser from
// `reports`, so every place that reported can be searched, not just a top slice.
function summarize(reports, nowMs) {
  const windows = {};
  for (const key of core.WINDOWS) {
    const inWindow = core.inWindow(reports, key, nowMs);
    const ranked = largestPerPlace(inWindow);
    const byOffice = {};
    for (const r of ranked) {
      const o = byOffice[r.office] ||= { office: r.office, ...OFFICES[r.office], places: 0, largest: null };
      o.places += 1;
      if (!o.largest || r.inches > o.largest.inches) o.largest = r;
    }
    windows[key] = {
      hours: core.WINDOW_HOURS[key],
      reportCount: inWindow.length,
      placeCount: ranked.length,
      largest: ranked[0] || null,
      byOffice: Object.values(byOffice).sort((a, b) => (b.largest?.inches || 0) - (a.largest?.inches || 0)),
      byRegion: core.byRegion(ranked).map(r => ({ id: r.id, places: r.places, largest: r.largest ? { place: r.largest.place, inches: r.largest.inches } : null })),
    };
  }
  return windows;
}

// When nothing has fallen in a week, find the most recent reported snow so the
// page can say when and where it last happened instead of implying winter is on.
// 30-day slices walked newest first, stopping at the first with snow. Sequential
// on purpose: six parallel archive requests failed in production while one at a
// time returns in well under a second each. Each slice gets one retry; a slice
// that still fails ends the search, because skipping it could name an older
// snow as the most recent one.
async function lastSnow(nowMs) {
  let found = null;
  const deadline = Date.now() + 10000; // with the 12 s week fetch, stays inside the 25 s function limit
  for (let i = 1; i <= 6 && !found; i++) {
    if (Date.now() > deadline) throw new Error('last-snow search ran out of time');
    const from = nowMs - i * 30 * DAY, to = nowMs - (i - 1) * 30 * DAY;
    let rows;
    try { rows = await lsrWindow(from, to, 5000); }
    catch { rows = await lsrWindow(from, to, 5000); }
    rows = rows.map(normalize).filter(r => r && r.inches > 0);
    if (rows.length) found = rows;
  }
  if (!found) return null;
  found.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  const latest = found[0];
  // Group by the Michigan calendar day, not the UTC one, so an evening report keeps its afternoon neighbors.
  const day = core.detroitDate(Date.parse(latest.reportedAt));
  const sameDay = largestPerPlace(found.filter(r => core.detroitDate(Date.parse(r.reportedAt)) === day)).slice(0, 8);
  return { reportedAt: latest.reportedAt, latest, sameDay };
}

async function winterAlerts() {
  const data = await fetchJson(NWS_ALERTS, { timeoutMs: 8000 });
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

// ---- Season so far ----
function datesBetween(start, end) {
  const out = [];
  for (let t = Date.parse(start + 'T00:00:00Z'); t <= Date.parse(end + 'T00:00:00Z'); t += DAY) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}
function lastSeasonRows() {
  return climo.stations.map(s => ({ id: s.id, name: s.name, region: s.region, lat: s.lat, lon: s.lon, ...s.lastSeason }));
}

async function seasonView(nowMs) {
  // Daily co-op figures are filed each morning for the day before, so the season runs through yesterday.
  const through = core.detroitDate(nowMs - DAY);
  const start = core.seasonStart(new Date(through + 'T12:00:00Z'));
  const season = { label: core.seasonLabel(start), start, through, anySnow: false, firstOfSeason: null, stations: [] };
  let degraded = false;
  if (through >= start) {
    try {
      const data = await fetchJson(ACIS, { timeoutMs: 20000, body: {
        sids: climo.stations.map(s => s.id).join(','), sdate: start, edate: through,
        elems: [{ name: 'snow' }, { name: 'snow', normal: '1' }], meta: ['sids'],
      } });
      const dates = datesBetween(start, through);
      const byId = new Map((data.data || []).map(d => [String((d.meta.sids || []).find(x => / 2$/.test(x)) || '').split(' ')[0], d.data]));
      for (const s of climo.stations) {
        const rows = byId.get(s.id);
        if (!rows) continue;
        const stat = core.seasonStation(rows.map((row, i) => [dates[i], row[0], row[1]]));
        season.stations.push({ id: s.id, name: s.name, region: s.region, lat: s.lat, lon: s.lon, firstSnowNormal: s.firstSnow ? s.firstSnow.median : null, ...stat });
      }
      if (!season.stations.length) degraded = true;
    } catch {
      degraded = true;
    }
  }
  season.anySnow = season.stations.some(s => s.total >= 0.1);
  const firsts = season.stations.filter(s => s.first).sort((a, b) => a.first.date.localeCompare(b.first.date) || b.first.inches - a.first.inches);
  if (firsts.length) season.firstOfSeason = { station: firsts[0].name, date: firsts[0].first.date, inches: firsts[0].first.inches };
  return {
    ok: true,
    degraded,
    generatedAt: new Date(nowMs).toISOString(),
    season: degraded && !season.stations.length ? null : season,
    lastSeason: { label: climo.lastSeason.label, start: climo.lastSeason.start, end: climo.lastSeason.end, stations: lastSeasonRows() },
    notes: {
      season: 'Season snowfall is the sum of daily snowfall at NWS cooperative and airport climate stations since July 1, through yesterday. Normal is the 1991-2020 normal for the same dates. A station missing more than five snow-season days is marked incomplete and gets no percent of normal; until the normal to date reaches 2 inches the percent is withheld as too early to mean anything.',
    },
    sources: { season: climo.sources.snowfall, normals: climo.sources.normals },
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const nowMs = Date.now();
  const view = (req.query && req.query.view) || new URL(req.url || '/', 'https://chrisizworski.com').searchParams.get('view');

  if (view === 'season') {
    const body = await seasonView(nowMs);
    res.setHeader('Cache-Control', body.degraded ? 's-maxage=600, stale-while-revalidate=3600' : 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(body);
  }

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

  reports.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  const body = {
    ok: !errors.includes('snow-reports'),
    generatedAt: new Date(nowMs).toISOString(),
    degraded: errors.length > 0,
    errors,
    windows: summarize(reports, nowMs),
    reports,
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
  // A quiet week still refreshes every 15 minutes so the season's first storm shows up promptly;
  // an outage is cached for a minute only.
  res.setHeader('Cache-Control', !body.ok ? 's-maxage=60' : reports.length ? 's-maxage=600, stale-while-revalidate=1800' : 's-maxage=900, stale-while-revalidate=3600');
  return res.status(body.ok ? 200 : 503).json(body);
};

module.exports._test = { normalize, largestPerPlace, summarize, seasonView, OFFICES };
