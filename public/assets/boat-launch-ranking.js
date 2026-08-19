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
