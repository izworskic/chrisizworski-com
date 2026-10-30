'use strict';

/**
 * Sleeping Giant route-decision engine, v1.
 * Source-backed planning comparison, NOT a trail-open or safety service.
 * No geocoding, inferred trail connections, inferred cycling speeds, or live calls.
 */
const catalog = require('../../data/sleeping-giant/official-routes.json');

const MODES = new Set(['hike', 'bike-hike']);
const INTERESTS = new Set(['summit', 'short-walk', 'geology', 'beach', 'lake', 'challenge', 'lookout']);
const CLOSURE_HOST = 'www.ontarioparks.ca';

function finiteBetween(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function validateCatalog(data = catalog) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.routes) || !data.routes.length) {
    throw new TypeError('Sleeping Giant source catalog v1 required');
  }
  const ids = new Set();
  const access = new Set(data.accessPoints.map(a => a.id));
  for (const r of data.routes) {
    if (!r.id || ids.has(r.id) || !access.has(r.startingAccessId)) throw new Error('Duplicate route or missing named access');
    ids.add(r.id);
    if (!finiteBetween(r.roundTripKm, 0.1, 100)) throw new Error('Invalid official return distance: ' + r.id);
    if (!Array.isArray(r.officialBasis) || !r.officialBasis.length || r.officialBasis.some(key => !data.sources[key])) {
      throw new Error('Missing source: ' + r.id);
    }
    if (r.currentTrailStatus !== 'unverified') throw new Error('Only unverified current-status snapshots are allowed');
    if (r.bikePermission === 'official_documented') {
      if (!finiteBetween(r.bikeApproachRoundTripKm, 0, 100) ||
          !finiteBetween(r.bikeHikeRemainingRoundTripKm, 0, 100) ||
          Math.abs(r.roundTripKm - r.bikeApproachRoundTripKm - r.bikeHikeRemainingRoundTripKm) > 0.01) {
        throw new Error('Official bike/hike portions do not total return distance: ' + r.id);
      }
      if (!r.officialBasis.includes('bikeHike')) throw new Error('Bike portions require official bike source');
    }
    const d = r.officialDurationMinutes;
    if (d && (!finiteBetween(d.min, 1, 2000) || !finiteBetween(d.max, d.min, 2000))) {
      throw new Error('Invalid duration range: ' + r.id);
    }
  }
  return true;
}

function normalizedClosures(closures = []) {
  if (!Array.isArray(closures)) throw new TypeError('closures must be an array');
  return closures.filter(c => {
    if (c?.status !== 'closed' || !c.routeId || !/^\d{4}-\d{2}-\d{2}T/.test(c.checkedAt || '')) return false;
    try { return new URL(c.sourceUrl).hostname === CLOSURE_HOST && !Number.isNaN(Date.parse(c.checkedAt)); }
    catch { return false; }
  });
}

function evaluateDuration(route, mode, availableMinutes) {
  // The official 6–10h range describes the hike. Do not apply it to a mixed bike/hike trip.
  if (mode === 'bike-hike') return {status:'unknown_bike_duration',source:'no_official_bike_trip_time'};
  const range = route.officialDurationMinutes;
  if (!range) return {status:'unknown_duration',source:'no_official_trip_duration'};
  if (availableMinutes < range.min) return {status:'below_documented_minimum',minMinutes:range.min,maxMinutes:range.max};
  if (availableMinutes < range.max) return {status:'within_documented_range_not_assured',minMinutes:range.min,maxMinutes:range.max};
  return {status:'meets_documented_upper_duration',minMinutes:range.min,maxMinutes:range.max};
}

function evaluateDaylight(route, mode, remainingDaylightMinutes, reserveMinutes) {
  if (remainingDaylightMinutes == null) return {status:'not_supplied'};
  if (!finiteBetween(remainingDaylightMinutes, 0, 1440) || !finiteBetween(reserveMinutes, 0, 240)) {
    throw new RangeError('Daylight minutes or reserve out of range');
  }
  if (mode === 'bike-hike' || !route.officialDurationMinutes) return {status:'unknown_duration'};
  const usable = Math.max(0, remainingDaylightMinutes - reserveMinutes);
  const {min,max} = route.officialDurationMinutes;
  if (usable < min) return {status:'less_than_official_minimum',usableMinutes:usable};
  if (usable < max) return {status:'less_than_conservative_official_upper',usableMinutes:usable};
  return {status:'covers_official_upper_with_reserve',usableMinutes:usable};
}

function evaluateRoute(route, request, closedSet) {
  const mode = request.mode;
  const wantedBike = mode === 'bike-hike';
  const legalBikeSplit = route.bikePermission === 'official_documented';
  const duration = evaluateDuration(route, mode, request.hours * 60);
  const daylight = evaluateDaylight(route, mode, request.remainingDaylightMinutes, request.reserveMinutes);
  const closedByOfficialNotice = closedSet.has(route.id);
  const bikeUnverified = wantedBike && !legalBikeSplit;
  const timeTooShort = duration.status === 'below_documented_minimum';
  const daylightTooShort = daylight.status === 'less_than_official_minimum';
  let classification = 'needs_verification';
  if (closedByOfficialNotice || bikeUnverified || timeTooShort || daylightTooShort) classification = 'not_suitable';
  else if (duration.status === 'meets_documented_upper_duration' &&
           (daylight.status === 'not_supplied' || daylight.status === 'covers_official_upper_with_reserve')) {
    classification = 'planning_candidate';
  }
  // A planning candidate never means that the trail, road or parking is currently open.
  const interestMatched = route.interestTags.includes(request.interest);
  const rank = (classification === 'planning_candidate' ? 100 : classification === 'needs_verification' ? 40 : 0) +
    (interestMatched ? 25 : 0) + (route.difficulty === 'moderate' && request.interest === 'short-walk' ? 10 : 0) -
    route.roundTripKm / 100;
  const warnings = ['Current trail and parking access unverified; check Ontario Parks alerts before travel.'];
  if (bikeUnverified) warnings.push('Cycling split not officially documented for this complete route.');
  if (wantedBike && legalBikeSplit) warnings.push('Only the documented approach permits cycling; summit sections must be walked. Bike-trip duration is unknown.');
  if (duration.status === 'unknown_duration' || duration.status === 'unknown_bike_duration') warnings.push('No source-certified full-trip duration for the chosen travel mode.');
  if (duration.status === 'within_documented_range_not_assured') warnings.push('Your time budget is inside the reported hiking range, not above its conservative upper end.');
  if (daylight.status === 'not_supplied') warnings.push('No daylight window supplied; this is not a departure-time recommendation.');
  if (daylight.status === 'less_than_conservative_official_upper') warnings.push('Remaining daylight does not cover the upper official duration plus reserve.');
  if (closedByOfficialNotice) warnings.push('A dated official closure was supplied; route excluded.');
  return {
    id:route.id,name:route.name,classification,rank,interestMatched,roundTripKm:route.roundTripKm,
    difficulty:route.difficulty,mode,officialDurationMinutes:route.officialDurationMinutes,
    cycling:{officiallyVerified:legalBikeSplit,roundTripBikeKm:legalBikeSplit?route.bikeApproachRoundTripKm:null,
      roundTripFootKm:legalBikeSplit?route.bikeHikeRemainingRoundTripKm:null,stop:legalBikeSplit?route.bikeStop:null,
      storage:legalBikeSplit?route.bikeStorage:null},
    duration,daylight,currentAccess:'unverified',parkingPinVerified:false,
    sourceUrls:route.officialBasis.map(key => catalog.sources[key]),warnings,readiness:'planning_only'
  };
}

function plan(request = {}) {
  validateCatalog();
  if (!finiteBetween(request.hours, 0.25, 24)) throw new RangeError('hours must be 0.25 through 24');
  if (!MODES.has(request.mode)) throw new TypeError('mode must be hike or bike-hike');
  if (!INTERESTS.has(request.interest)) throw new TypeError('unsupported visitor interest');
  const options = {...request,reserveMinutes:request.reserveMinutes == null ? 60 : request.reserveMinutes};
  const closed = new Set(normalizedClosures(request.closures).map(c => c.routeId));
  const results = catalog.routes.map(r => evaluateRoute(r, options, closed))
    .sort((a,b) => b.rank - a.rank || a.name.localeCompare(b.name));
  return {
    reviewedAt:catalog.reviewedAt,planningOnly:true,liveTrailStatus:false,
    bestCandidate:results.find(r => r.classification === 'planning_candidate') || null,
    results,sourceUrls:catalog.sources,
    disclaimer:'Planning comparison only. Not a safety, trail-open, parking, or travel-time certification.'
  };
}

module.exports = {catalog,validateCatalog,plan,evaluateDuration,evaluateDaylight,normalizedClosures};
