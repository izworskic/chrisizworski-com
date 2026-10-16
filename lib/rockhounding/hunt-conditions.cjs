'use strict';
// Michigan rockhounding hunt conditions: a transparent, computed reading of
// whether waves have recently worked a beach and whether it is safe to walk now.
//
// The rule it encodes is EGLE's own rockhounding guidance: go immediately after a
// storm, as new material is washed up, and do not go during the storm or when there
// is high wave action. "Wave work" is estimated from the wind blowing onto each beach
// (onshore component of the hourly wind, scaled by the open-water fetch in front of
// it), because wind records exist everywhere, all year, while wave buoys come out of
// the lakes every fall. Live NDBC wave heights and NWS alerts are layered on top as
// independent checks. Nothing here predicts what any one person will find.

const MPH_BASE = 10;         // onshore wind below this barely moves beach gravel
const PRIME_LOAD = 30;       // 72 h wave work: a real blow has turned the beach over
const GOOD_LOAD = 8;         // 72 h wave work: a moderate stir
const STORM_NOW_MPH = 22;    // effective onshore wind that means high waves right now
const EASED_MPH = 15;        // effective onshore wind low enough to call the blow over
const BUOY_ROUGH_M = 2.0;    // open-lake significant wave height that means rough
const STALE_BUOY_H = 3;
const HOUR = 3600;

const STOP_EVENTS = [
  'Beach Hazards Statement', 'High Surf Advisory', 'High Surf Warning',
  'Lakeshore Flood Warning', 'Lakeshore Flood Advisory', 'Lakeshore Flood Watch',
  'Storm Warning', 'Hurricane Force Wind Warning', 'Hazardous Seas Warning',
  'Gale Warning', 'Storm Watch', 'Gale Watch', 'Hazardous Seas Watch'
];
const SHORE_EVENTS = new Set(['Beach Hazards Statement', 'High Surf Advisory', 'High Surf Warning',
  'Lakeshore Flood Warning', 'Lakeshore Flood Advisory']);
const MARINE_STORM = new Set(['Storm Warning', 'Hurricane Force Wind Warning', 'Hazardous Seas Warning', 'Gale Warning']);

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = deg => Number.isFinite(deg) ? COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16] : null;
const round = (x, d = 0) => Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null;

function fetchFactor(fetchKm) {
  if (!Number.isFinite(fetchKm) || fetchKm <= 0) return 0.35;
  return Math.max(0.35, Math.min(1, Math.sqrt(fetchKm / 150)));
}
// Effective onshore wind (mph) for one hour: the part of the wind blowing from the
// lake onto the beach, scaled by how much open water it has crossed.
function onshore(speedMph, fromDeg, facesDeg, fetchKm) {
  if (!Number.isFinite(speedMph) || !Number.isFinite(fromDeg) || !Number.isFinite(facesDeg)) return null;
  const c = Math.cos((fromDeg - facesDeg) * Math.PI / 180);
  return c > 0 ? speedMph * c * fetchFactor(fetchKm) : 0;
}
const work = u => Number.isFinite(u) ? Math.max(0, u - MPH_BASE) ** 2 / 40 : 0;

// hourly: {time:[unix s], wind_speed_10m:[mph], wind_direction_10m:[deg], wind_gusts_10m, precipitation:[in], temperature_2m:[F]}
function normalizeHours(hourly, shore) {
  const t = hourly?.time || [];
  return t.map((time, i) => {
    const speed = hourly.wind_speed_10m?.[i];
    const dir = hourly.wind_direction_10m?.[i];
    const u = shore ? onshore(speed, dir, shore.facesDeg, shore.fetchKm) : null;
    return {
      t: time, speed: Number.isFinite(speed) ? speed : null, dir: Number.isFinite(dir) ? dir : null,
      gust: Number.isFinite(hourly.wind_gusts_10m?.[i]) ? hourly.wind_gusts_10m[i] : null,
      precip: Number.isFinite(hourly.precipitation?.[i]) ? hourly.precipitation[i] : null,
      tempF: Number.isFinite(hourly.temperature_2m?.[i]) ? hourly.temperature_2m[i] : null,
      u, w: work(u)
    };
  });
}
function loadBetween(hours, from, to) {
  let load = 0, peak = null, n = 0;
  for (const h of hours) {
    if (h.t <= from || h.t > to || h.u == null) continue;
    n++; load += h.w;
    if (!peak || h.u > peak.u) peak = h;
  }
  return {load, peak, n};
}

function matchAlerts(features, site) {
  const zones = new Set([...(site.nws?.landZones || []), ...(site.nws?.marineZones || [])]);
  const out = [];
  for (const f of features || []) {
    const p = f?.properties || {};
    const ids = (p.affectedZones || []).map(z => String(z).split('/').pop());
    if (!ids.some(z => zones.has(z))) continue;
    if (!STOP_EVENTS.includes(p.event)) continue;
    out.push({event: p.event, ends: p.ends || p.expires || null, headline: String(p.headline || '').slice(0, 220),
      marine: ids.some(z => (site.nws?.marineZones || []).includes(z))});
  }
  const seen = new Set();
  return out.filter(a => !seen.has(a.event) && seen.add(a.event));
}

function pickBuoy(site, buoys, nowS) {
  for (const s of site.waveStations || []) {
    const b = buoys?.[s.id];
    if (!b || !Number.isFinite(b.wvhtM) || !Number.isFinite(b.t)) continue;
    const ageH = (nowS - b.t) / HOUR;
    if (ageH < -1 || ageH > STALE_BUOY_H) continue;
    return {id: s.id, km: s.km, wvhtM: b.wvhtM, wvhtFt: round(b.wvhtM * 3.281, 1), ageMin: Math.max(0, Math.round(ageH * 60)),
      dpdS: Number.isFinite(b.dpdS) ? b.dpdS : null, mwdDeg: Number.isFinite(b.mwdDeg) ? b.mwdDeg : null};
  }
  return null;
}

// Find the first forecast hour where the previous 72 h hold a prime load and the
// wind onto the beach has eased: the next "right after the storm" window.
function nextWindow(hours, nowS) {
  const future = hours.filter(h => h.t > nowS && h.u != null);
  for (const h of future) {
    const {load} = loadBetween(hours, h.t - 72 * HOUR, h.t);
    if (load >= PRIME_LOAD && h.u < EASED_MPH) {
      const {load: built} = loadBetween(hours, nowS, h.t);
      if (built >= GOOD_LOAD) return {t: h.t, load: round(load)};
    }
  }
  return null;
}

function assessSite(site, {hourly, alerts, buoys, nowS, sunrise, sunset}) {
  const result = {id: site.id, verdict: null, storm: null, now: null, buoy: null, alerts: [], notes: [], nextWindow: null, series: []};
  result.alerts = matchAlerts(alerts?.features, site);
  result.buoy = site.inland ? null : pickBuoy(site, buoys, nowS);
  const hours = normalizeHours(hourly, site.shore);
  const past = hours.filter(h => h.t <= nowS);
  const cur = past[past.length - 1] || null;
  const haveWind = !!cur && nowS - cur.t <= 2 * HOUR && cur.speed != null;
  if (haveWind) {
    result.now = {windMph: round(cur.speed), fromDeg: round(cur.dir), from: compass(cur.dir), gustMph: round(cur.gust),
      onshoreMph: cur.u == null ? null : round(cur.u), tempF: round(cur.tempF)};
  }
  const recentRain = past.filter(h => h.t > nowS - 6 * HOUR).reduce((a, h) => a + (h.precip || 0), 0);
  const last72 = past.filter(h => h.t > nowS - 72 * HOUR && h.tempF != null);
  const meanTemp = last72.length ? last72.reduce((a, h) => a + h.tempF, 0) / last72.length : null;
  const month = new Date(nowS * 1000).getUTCMonth() + 1;
  const iceSeason = [12, 1, 2, 3, 4].includes(month) && meanTemp != null && meanTemp < 28;
  if (recentRain >= 0.01) result.notes.push({code: 'WET', text: 'Rain in the last few hours: wet stones show their color and pattern best.'});
  if (iceSeason) result.notes.push({code: 'ICE', text: 'Shelf ice season. Never walk out on shelf ice or ice ridges along the shore.'});
  if (sunrise) result.sunrise = sunrise;
  if (sunset) result.sunset = sunset;

  if (site.inland) {
    const wet = recentRain >= 0.05;
    result.verdict = haveWind ? (wet
      ? {code: 'ANYTIME', label: 'Not wave-dependent', headline: 'Quarry hunting: wait for it to dry out', detail: 'Rain in the last few hours. Loose quarry rock is slick when wet, but nothing here depends on the lake.'}
      : {code: 'ANYTIME', label: 'Not wave-dependent', headline: 'Quarry hunting works any dry day', detail: 'Fossils here weather out of the old quarry floor and spoil piles, not out of the surf, so storms do not matter.'})
      : {code: 'UNAVAILABLE', label: 'Weather unavailable', headline: 'Current weather could not be loaded', detail: 'Quarry hunting does not depend on waves; check the local forecast before you go.'};
    result.series = seriesOf(hours, nowS);
    return result;
  }
  if (!haveWind) {
    result.verdict = {code: 'UNAVAILABLE', label: 'Conditions unavailable', headline: 'Wind data could not be loaded', detail: 'Without recent wind we cannot tell whether waves have worked this beach. Check NWS marine alerts before you go.'};
    return result;
  }
  const {load, peak} = loadBetween(hours, nowS - 72 * HOUR, nowS);
  const {load: load24} = loadBetween(hours, nowS - 24 * HOUR, nowS);
  result.storm = {load72: round(load), load24: round(load24), peakOnshoreMph: peak ? round(peak.u) : null,
    peakWindMph: peak && peak.u > MPH_BASE ? round(peak.speed) : null, peakFrom: peak && peak.u > MPH_BASE ? compass(peak.dir) : null,
    peakAt: peak && peak.u > MPH_BASE ? peak.t : null};
  // Hours since the onshore wind last blew hard.
  const lastHard = [...past].reverse().find(h => h.u != null && h.u >= EASED_MPH);
  result.storm.easedForH = lastHard ? Math.max(0, round((nowS - lastHard.t) / HOUR)) : null;
  result.nextWindow = nextWindow(hours, nowS);
  result.series = seriesOf(hours, nowS);

  const shoreAlert = result.alerts.find(a => SHORE_EVENTS.has(a.event));
  const marineStorm = result.alerts.find(a => MARINE_STORM.has(a.event));
  // Open-lake waves only count against this beach when they are headed at it: by the
  // buoy's own wave direction when reported, otherwise by the wind direction here.
  const towardBeach = result.buoy && (result.buoy.mwdDeg != null
    ? Math.cos((result.buoy.mwdDeg - site.shore.facesDeg) * Math.PI / 180) > 0.5
    : result.now.onshoreMph >= 8);
  const buoyRough = !!(result.buoy && result.buoy.wvhtM >= BUOY_ROUGH_M && towardBeach);
  const blowingNow = result.now.onshoreMph >= STORM_NOW_MPH;
  if (shoreAlert || blowingNow || buoyRough || (marineStorm && result.now.onshoreMph >= EASED_MPH)) {
    const why = shoreAlert ? `NWS ${shoreAlert.event} in effect for this shore.`
      : blowingNow ? `Wind is driving waves straight onto this beach (${result.now.windMph} mph from the ${result.now.from}).`
      : buoyRough ? `The nearest open-lake buoy reads ${result.buoy.wvhtFt} ft waves headed toward this shore${marineStorm ? `, with an NWS ${marineStorm.event} on the nearshore water` : ''}.`
      : `NWS ${marineStorm.event} on the nearshore water, with wind blowing onto the beach.`;
    result.verdict = {code: 'STORM', label: 'Storm on: stay off', headline: 'Waves are working the beach right now', detail: `${why} EGLE's advice is to wait: go right after the storm, not during it.`};
    return result;
  }
  const easing = result.storm.easedForH != null && result.storm.easedForH <= 36;
  if (load >= PRIME_LOAD) {
    result.verdict = {code: 'PRIME', label: 'Freshly worked: go', headline: easing ? 'The blow just eased: fresh stones on the beach' : 'Worked over by a recent blow',
      detail: `A ${result.storm.peakWindMph} mph wind from the ${result.storm.peakFrom} drove waves onto this beach in the last three days, and it has settled down. This is the after-the-storm window EGLE recommends.`};
  } else if (load >= GOOD_LOAD) {
    result.verdict = {code: 'GOOD', label: 'Recently stirred', headline: 'Some fresh material',
      detail: `Moderate onshore wind in the last three days (peak ${result.storm.peakWindMph} mph from the ${result.storm.peakFrom}) gave the gravel a stir. Walk the waterline and any new windrows.`};
  } else {
    result.verdict = {code: 'QUIET', label: 'Quiet: picked over', headline: 'No real wave action in three days',
      detail: 'The beach has not been turned over recently, so the obvious stones are likely picked. Go early, hunt the wet edge, or watch for the next blow.'};
  }
  if (marineStorm && result.verdict.code !== 'STORM') {
    result.notes.push({code: 'MARINE', text: `NWS ${marineStorm.event} offshore. The wind is not blowing onto this beach right now, but stay off breakwalls and wet rock edges.`});
  }
  return result;
}

function seriesOf(hours, nowS) {
  return hours.filter(h => h.t > nowS - 72 * HOUR && h.t <= nowS + 48 * HOUR)
    .map(h => [h.t, h.u == null ? null : round(h.u, 1), round(h.speed, 1), h.dir == null ? null : Math.round(h.dir)]);
}

// NDBC latest_obs.txt -> {id:{t, wvhtM, dpdS, mwdDeg}}
function parseLatestObs(text) {
  const out = {};
  for (const line of String(text || '').split('\n')) {
    if (!line || line[0] === '#') continue;
    const p = line.trim().split(/\s+/);
    if (p.length < 15) continue;
    const num = v => v === 'MM' || v == null ? null : Number(v);
    const [Y, M, D, h, m] = p.slice(3, 8).map(Number);
    const t = Date.UTC(Y, M - 1, D, h, m) / 1000;
    if (!Number.isFinite(t)) continue;
    out[p[0]] = {t, wvhtM: num(p[11]), dpdS: num(p[12]), mwdDeg: num(p[14])};
  }
  return out;
}

const RANK = {PRIME: 0, GOOD: 1, ANYTIME: 2, QUIET: 3, STORM: 4, UNAVAILABLE: 5};
function assessAll(doc, inputs) {
  const {weather, alerts, buoys, nowS} = inputs;
  const sites = doc.sites.map((site, i) => {
    const w = weather?.[i] || null;
    const daily = w?.daily;
    const next = (arr) => (arr || []).find(x => x > nowS) || null;
    return assessSite(site, {hourly: w?.hourly, alerts, buoys, nowS, sunrise: next(daily?.sunrise), sunset: next(daily?.sunset)});
  });
  return sites;
}

module.exports = {assessSite, assessAll, parseLatestObs, onshore, fetchFactor, work, matchAlerts, compass, RANK,
  constants: {MPH_BASE, PRIME_LOAD, GOOD_LOAD, STORM_NOW_MPH, EASED_MPH, BUOY_ROUGH_M}};
