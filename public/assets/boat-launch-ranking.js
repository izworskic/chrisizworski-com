/*
 * Boat launch ranking core.
 *
 * Straight-line distance is the wrong ranking key in a state made of water: a
 * launch 17 miles across Grand Traverse Bay is a 46 mile, 73 minute drive. This
 * module keeps straight-line distance only as a candidate filter, because it is
 * a strict lower bound on road distance, and ranks the shortlist on real driving
 * distance returned by the routing service.
 *
 * It is loaded as a plain browser script and is also require()-able in Node so
 * the ranking can be unit tested and exercised by the live acceptance smoke.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BoatLaunchRanking = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const EARTH_RADIUS_MILES = 3958.7613;
  const METERS_PER_MILE = 1609.344;
  const DEFAULT_POOL_SIZE = 12;
  const WIDE_POOL_SIZE = 24;
  const DEFAULT_LIMIT = 5;
  const MAX_ROAD_MILES = 60;
  const COMFORTABLE_MILES = 25;
  /*
   * Road distance is never shorter than straight-line distance, and in Michigan
   * it typically runs about a quarter longer once the road bends around water.
   * When routing is unavailable the straight-line cap is tightened by that ratio
   * so an unrouted fallback does not quietly admit launches that a real road
   * would have placed out of range.
   */
  const STRAIGHT_LINE_DETOUR_RATIO = 1.25;

  function toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  function distanceMiles(lat1, lon1, lat2, lon2) {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
  }

  function usableRecord(record) {
    return (
      record &&
      Number.isFinite(Number(record.latitude)) &&
      Number.isFinite(Number(record.longitude))
    );
  }

  /*
   * Nearest `poolSize` records by straight line, plus the straight-line distance
   * of the first record left out. Because straight-line distance can never
   * exceed road distance, that number is the proof that widening the pool is or
   * is not necessary.
   */
  function candidatePool(records, point, poolSize = DEFAULT_POOL_SIZE) {
    if (!point || !Array.isArray(records)) return { pool: [], nextStraightMiles: null };
    const ranked = records
      .filter(usableRecord)
      .map(record => ({
        ...record,
        distanceMiles: distanceMiles(
          point.latitude,
          point.longitude,
          Number(record.latitude),
          Number(record.longitude)
        ),
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
    return {
      pool: ranked.slice(0, poolSize),
      nextStraightMiles: ranked.length > poolSize ? ranked[poolSize].distanceMiles : null,
    };
  }

  /*
   * Turn a candidate pool plus an optional routing result into the shortlist.
   *
   * `drive` is { legs: [{ index, meters, seconds }] } from /api/boat-launch-drive,
   * or null when routing is unavailable. Routing failure never invents a number:
   * it falls back to straight-line order and reports routed:false so the page can
   * say which one the reader is looking at.
   */
  function finalizeShortlist(options) {
    const {
      pool = [],
      nextStraightMiles = null,
      drive = null,
      limit = DEFAULT_LIMIT,
      maxRoadMiles = MAX_ROAD_MILES,
    } = options || {};

    const legByIndex = new Map();
    if (drive && Array.isArray(drive.legs)) {
      for (const leg of drive.legs) {
        if (!leg || !Number.isFinite(Number(leg.meters))) continue;
        legByIndex.set(Number(leg.index), leg);
      }
    }
    const routed = legByIndex.size > 0;

    const measured = pool.map((record, index) => {
      const leg = legByIndex.get(index);
      if (!leg) return { ...record, driveMiles: null, driveMinutes: null };
      return {
        ...record,
        driveMiles: Number(leg.meters) / METERS_PER_MILE,
        driveMinutes: Number.isFinite(Number(leg.seconds)) ? Number(leg.seconds) / 60 : null,
      };
    });

    const rankable = routed ? measured.filter(x => x.driveMiles !== null) : measured;
    /*
     * Ordered on the drive time the reader is actually shown, so two launches
     * that both read "15 min" fall back to the shorter road distance rather
     * than to an invisible difference in seconds.
     */
    const shownMinutes = record =>
      record.driveMinutes === null || record.driveMinutes === undefined
        ? Infinity
        : Math.round(record.driveMinutes);
    const sorted = routed
      ? rankable.slice().sort((a, b) => {
          const byTime = shownMinutes(a) - shownMinutes(b);
          return byTime !== 0 ? byTime : a.driveMiles - b.driveMiles;
        })
      : rankable.slice().sort((a, b) => a.distanceMiles - b.distanceMiles);

    const reachOf = record => (routed && record.driveMiles !== null ? record.driveMiles : record.distanceMiles);
    const rangeCap = routed ? maxRoadMiles : maxRoadMiles / STRAIGHT_LINE_DETOUR_RATIO;
    const inRange = sorted.filter(record => reachOf(record) <= rangeCap);
    const items = inRange.slice(0, limit);

    /*
     * A record outside the pool can only beat a kept one if its straight-line
     * distance is already shorter than the worst reach we kept.
     */
    const worstKept = items.length ? reachOf(items[items.length - 1]) : null;
    const threshold = items.length >= limit ? worstKept : rangeCap;
    const needsWiderPool =
      nextStraightMiles !== null && threshold !== null && nextStraightMiles < threshold;

    let reason = null;
    if (!items.length) reason = pool.length ? 'out-of-range' : 'no-records';

    return {
      items,
      routed,
      reason,
      needsWiderPool,
      reach: items.length ? Math.max(...items.map(reachOf)) : null,
      within25: items.filter(record => reachOf(record) <= COMFORTABLE_MILES).length,
      unroutable: routed ? measured.filter(x => x.driveMiles === null).length : 0,
      droppedOutOfRange: sorted.length - inRange.length,
    };
  }

  return {
    EARTH_RADIUS_MILES,
    METERS_PER_MILE,
    DEFAULT_POOL_SIZE,
    WIDE_POOL_SIZE,
    DEFAULT_LIMIT,
    MAX_ROAD_MILES,
    COMFORTABLE_MILES,
    STRAIGHT_LINE_DETOUR_RATIO,
    distanceMiles,
    candidatePool,
    finalizeShortlist,
  };
});

/*
 * Optional near-me bridge for the statewide finder.
 *
 * Location is requested only after the visitor taps the button. The coordinate
 * stays in page memory: it is not written to the URL, browser storage, analytics,
 * this site's APIs, or a third-party geocoder. The existing finder still owns
 * all ranking, routing, map, source and result rendering.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (location.pathname !== '/michigan-boat-launches/') return;
  if (!navigator.geolocation || typeof window.fetch !== 'function') return;

  let currentPoint = null;
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    try {
      const raw = typeof input === 'string' ? input : input && input.url;
      const url = new URL(raw, location.href);
      if (
        currentPoint &&
        url.origin === location.origin &&
        url.pathname === '/api/boat-launch-geocode' &&
        String(url.searchParams.get('q') || '').trim().toLowerCase() === 'near me'
      ) {
        const point = currentPoint;
        currentPoint = null;
        return Promise.resolve(new Response(JSON.stringify({
          query: 'near me',
          displayName: 'Your location',
          latitude: point.latitude,
          longitude: point.longitude,
          type: 'device-location',
          osmType: null,
          osmId: null,
          attribution: 'Location used only in this page session',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        }));
      }
    } catch (_) {
      // Fall through to the unchanged fetch path.
    }
    return originalFetch(input, init);
  };

  function install() {
    const form = document.getElementById('launch-search-form');
    const input = document.getElementById('launch-search');
    const filters = form && form.parentElement && form.parentElement.querySelector('.filter-row');
    if (!form || !input || !filters || document.getElementById('launch-use-location')) return;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px';
    const button = document.createElement('button');
    button.id = 'launch-use-location';
    button.type = 'button';
    button.textContent = 'Use my location';
    button.style.cssText = 'min-height:38px;border:1px solid #bdc8c0;border-radius:9px;background:#fff;color:#173d26;padding:0 13px;font-weight:800;cursor:pointer';
    const note = document.createElement('span');
    note.textContent = 'Opt-in only · precise location is not stored or sent';
    note.style.cssText = 'font-size:10px;color:#647068';
    row.append(button, note);
    filters.parentElement.insertBefore(row, filters);

    button.addEventListener('click', function () {
      button.disabled = true;
      button.textContent = 'Finding you…';
      navigator.geolocation.getCurrentPosition(function (position) {
        const latitude = Number(position && position.coords && position.coords.latitude);
        const longitude = Number(position && position.coords && position.coords.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          button.disabled = false;
          button.textContent = 'Use my location';
          note.textContent = 'Location was unavailable. Search a city, lake, river or harbor instead.';
          return;
        }
        currentPoint = { latitude, longitude };
        input.value = 'near me';
        button.disabled = false;
        button.textContent = 'Use my location';
        note.textContent = 'Using your location for this search only';
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }, function () {
        currentPoint = null;
        button.disabled = false;
        button.textContent = 'Use my location';
        note.textContent = 'Location permission was not available. Search a Michigan place instead.';
      }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
