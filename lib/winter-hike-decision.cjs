'use strict';
/**
 * Winter hiking / snowshoeing research-stage decision interpreter.
 * Modelled snow is NOT a trail-surface observation; a DNR point is NOT verified parking.
 * Numeric scores are internal provisional orderings, NOT publishable trip ratings.
 */
const HOURS = 36e5;
const SNOW_STALE_HOURS = 72;
const FORECAST_STALE_HOURS = 12;
const STOP_ALERTS = /\b(blizzard warning|ice storm warning|winter storm warning|avalanche warning|extreme cold warning|high wind warning)\b/i;
const status = v => String(v || 'unknown').toLowerCase();
const valid = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
function fresh(iso, now, maxHours) {
  const stamp = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(stamp) && stamp <= now + HOURS && now - stamp <= maxHours * HOURS;
}
function normalizePoint(raw) {
  if (!raw || !raw.ID || !raw.Title || !Number.isFinite(raw.Latitude) || !Number.isFinite(raw.Longitude)) return null;
  if (raw.Latitude < 41 || raw.Latitude > 49 || raw.Longitude < -91 || raw.Longitude > -82) return null;
  if (!String(raw.LocationTypeTags || '').split(',').map(x => x.trim()).includes('Nonmotorized trail')) return null;
  const tags = String(raw.ActivitiesTags || '').split(',').map(x => x.trim().toLowerCase());
  const hike = tags.includes('hiking'), snowshoe = tags.includes('snowshoeing');
  if (!hike && !snowshoe) return null;
  return {
    id: String(raw.ID), name: String(raw.Title).trim(), lat: raw.Latitude, lon: raw.Longitude,
    activities: { hike, snowshoe }, groomedXC: tags.includes('cross-country skiing (groomed)'),
    officialPageCandidate: typeof raw.PageURL === 'string' && raw.PageURL.startsWith('/recsearch/') ? 'https://www.michigan.gov' + raw.PageURL : null,
    source: 'Michigan DNR Recreation Search Points OPENDATA',
    winterParking: 'unverified', winterAccess: 'unverified', routeMiles: null,
    locationMeaning: 'DNR recreation destination reference point; winter vehicle access is unverified'
  };
}
function buildInventory(points) {
  const seen = new Set();
  return points.map(normalizePoint).filter(p => {
    if (!p || seen.has(p.id)) return false;
    seen.add(p.id); return true;
  });
}
function interpret(destination, inputs = {}, now = Date.now()) {
  const reasons = [], blockers = [], verification = [];
  const access = inputs.access || {};
  const forecast = inputs.forecast || {};
  const snow = inputs.snow || {};
  const closure = inputs.closure || {};
  const activity = inputs.activity || 'either';
  if (!destination || !destination.activities) return { state:'excluded', blockers:['Invalid destination'], reasons, verification };
  if (activity === 'snowshoe' && !destination.activities.snowshoe) blockers.push('Snowshoeing not documented as permitted');
  if (activity === 'hike' && !destination.activities.hike) blockers.push('Hiking not documented as permitted');
  if (status(access.trail) === 'closed') blockers.push('Official trail closure');
  if (status(access.parking) === 'closed') blockers.push('Winter parking reported closed');
  if (status(access.road) === 'closed') blockers.push('Access road reported closed');
  if (closure.active === true && closure.geometryVerified === true && closure.matchesDestination === true) blockers.push('Mapped active temporary closure');
  else if (closure.active === true && closure.matchesDestination === true) verification.push('Closure overlap requires geometry review');
  if (blockers.length) return {state:'excluded', blockers, reasons, verification, score:null, activity:null, confidence:'limited'};
  if (status(access.trail) !== 'open') verification.push('Current operator trail access not independently confirmed');
  if (status(access.parking) !== 'open') verification.push('Winter parking not verified');
  if (status(access.road) !== 'open') verification.push('Winter road access not verified');
  // Access may only be positively corroborated by a dated, trail-specific manager source.
  const accessVerified = access.managerConfirmed === true
    && fresh(access.checkedAt, now, 72)
    && typeof access.sourceUrl === 'string'
    && /^https:\/\//i.test(access.sourceUrl)
    && access.winterSpecific === true;
  if (!accessVerified) verification.push('Current winter trail, road, and parking access lack dated manager verification');
  if (Array.isArray(forecast.alerts) && forecast.alerts.some(a => STOP_ALERTS.test(String(a)))) {
    return {state:'weather-hold', activity:null, score:null, reasons:['Serious weather warning; routine recommendations suspended'], blockers:[], verification, confidence:'limited'};
  }
  if (forecast.freezingRain === true || forecast.windChillF <= -25 || forecast.windMph >= 40) {
    return {state:'weather-hold', activity:null, score:null, reasons:['Severe forecast conditions; routine recommendations suspended'], blockers:[], verification, confidence:'limited'};
  }
  const weatherFresh = fresh(forecast.updatedAt,now,FORECAST_STALE_HOURS) && forecast.targetCovered === true;
  const snowFresh = fresh(snow.validAt,now,SNOW_STALE_HOURS) && valid(snow.depthInches) && snow.kind === 'modeled';
  if (!weatherFresh) verification.push('Fresh NWS forecast covering the requested outing unavailable');
  if (!snowFresh) verification.push('Recent correctly labeled modeled snow depth unavailable');
  let mode = null, base = 0;
  if (snowFresh) {
    const depth = snow.depthInches;
    if (depth >= 6 && destination.activities.snowshoe && activity !== 'hike') {
      mode = 'snowshoe'; base = Math.min(70, 40 + depth * 1.5);
      reasons.push('Modeled snow depth supports investigating snowshoe conditions; surface is not observed');
    } else if (depth < 2 && destination.activities.hike && activity !== 'snowshoe') {
      mode = 'hike'; base = 48;
      reasons.push('Low modeled snow depth favors investigating a boot hike over a snowshoe outing');
    } else if (depth > 10 && activity === 'hike') {
      verification.push('Deep modeled snow makes a boot-only hike uncertain without a packed-trail report');
      reasons.push('Deep modeled snow does not establish a walkable surface');
    } else if (destination.activities.hike && activity !== 'snowshoe') {
      mode = 'hike'; base = 39;
      reasons.push('Mixed snow-depth signal; inspect packed snow and possible ice before choosing footwear');
    } else verification.push('Snow cover and requested activity do not make a clear match');
  }
  if (forecast.freezeThaw === true || forecast.rainOrFreezingRain === true) {
    reasons.push('Freeze-thaw or rain raises potential ice or slush concerns, not an observed trail-ice report');
    base -= 15;
  }
  if (Number.isFinite(forecast.windChillF) && forecast.windChillF <= -15) {
    reasons.push('Dangerously cold apparent temperature requires extra caution'); base -= 25;
  }
  if (Number.isFinite(forecast.windMph) && forecast.windMph >= 25) {
    reasons.push('High forecast wind exposure'); base -= 12;
  }
  if (destination.groomedXC && mode === 'snowshoe') verification.push('Stay clear of groomed ski tracks; confirm local trail restrictions');
  if (!weatherFresh || !snowFresh || !mode) return {state:'verify', score:null, activity:mode, reasons, blockers, verification, confidence:'limited'};
  const score = Math.max(0,Math.min(100,Math.round(base)));
  const verifiedAccess = ['trail','parking','road'].every(k=>status(access[k])==='open') && verification.length === 0;
  return {state:verifiedAccess ? 'candidate' : 'verify', score:verifiedAccess ? score : null, activity:mode,
    reasons, blockers, verification, confidence:verifiedAccess ? 'weather-screening-only' : 'limited'};
}
function rankDestinations(destinations, evidenceById={}, activity='either',now=Date.now()) {
  const order={candidate:0,verify:1,'weather-hold':2,excluded:3};
  return destinations.map(destination=>({destination,decision:interpret(destination,{...(evidenceById[destination.id]||{}),activity},now)}))
    .sort((a,b)=>order[a.decision.state]-order[b.decision.state] || (b.decision.score??-1)-(a.decision.score??-1) || a.destination.name.localeCompare(b.destination.name));
}
module.exports={normalizePoint,buildInventory,interpret,rankDestinations,fresh};
