'use strict';
const SOURCE = 'https://www.panynj.gov/bin/portauthority/crossingtimesapi.json';
const IDS = { 'George Washington Bridge': 'gwb', 'Lincoln Tunnel': 'lincoln', 'Holland Tunnel': 'holland' };
// The authority publishes an Eastern clock time, not a date. Refuse old or ambiguous data.
function freshClock(clock, now) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock || '');
  if (!m || +m[1] < 1 || +m[1] > 12 || +m[2] > 59) return false;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', hour: 'numeric', minute: 'numeric' }).formatToParts(now);
  const current = +parts.find(p=>p.type==='hour').value * 60 + +parts.find(p=>p.type==='minute').value;
  const published = (+m[1] % 12 + (m[3].toUpperCase()==='PM' ? 12 : 0))*60 + +m[2];
  const age = (current - published + 1440) % 1440;
  return age <= 15;
}
function normalizeTraffic(rows, now = new Date()) {
  if (!Array.isArray(rows)) throw new Error('Invalid Port Authority traffic response');
  const routes = Object.entries(IDS).flatMap(([name, crossingId]) => {
    const lanes = rows.filter(r=>r.crossingDisplayName===name && r.travelDirection==='ToNY' && r.isDataAvailable===true && r.isCrossingClosed===false && freshClock(r.timeStamp, now) && typeof r.routeTravelTime==='number' && r.routeTravelTime>0 && r.routeTravelTime<=240);
    if (!lanes.length) return [];
    const fastest = lanes.reduce((a,b)=>a.routeTravelTime<=b.routeTravelTime?a:b);
    return [{ crossingId, etaMinutes: fastest.routeTravelTime, scope: 'CROSSING_APPROACH', source: SOURCE, reportedAt: fastest.timeStamp + ' ET', approach: fastest.routeName, lane: fastest.facilityModifier || null, incident: fastest.infomationalText || null }];
  });
  return { state: routes.length ? 'PARTIAL' : 'UNAVAILABLE', reason: 'Port Authority crossing and approach times toward New York only. Not door-to-door ETAs. Other crossings have no connected time feed.', scope: 'CROSSING_APPROACH', fetchedAt: now.toISOString(), source: SOURCE, routes };
}
async function fetchTraffic(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(SOURCE, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Traffic source HTTP ' + response.status);
    return normalizeTraffic(await response.json());
  } catch (_) {
    return { state: 'UNAVAILABLE', scope: 'CROSSING_APPROACH', reason: 'Port Authority times are unavailable or stale. No travel times are estimated.', routes: [] };
  }
}
module.exports = { SOURCE, freshClock, normalizeTraffic, fetchTraffic };
