const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const rank = require('../public/assets/boat-launch-ranking.js');
const drive = require('../api/boat-launch-drive.js');
const launches = require('../api/boat-launches.js');

const finderJs = fs.readFileSync('public/assets/boat-launch-finder.js', 'utf8');
const finderHtml = fs.readFileSync('public/michigan-boat-launches/index.html', 'utf8');

const METERS = rank.METERS_PER_MILE;

/*
 * Real geometry, measured against live routing on 2026-08-19.
 *
 * Bay City sits at the bottom of Saginaw Bay. Saginaw River Mouth is the
 * nearest launch as the crow flies (3.6 mi) but a 17 minute drive, while Jones
 * Road is farther in a straight line (4.5 mi) and a 15 minute drive. Ranking on
 * straight-line distance therefore puts the slower launch first.
 */
const BAY_CITY = { latitude: 43.5945, longitude: -83.8889 };
const RIVER_MOUTH = { id: 'river-mouth', name: 'Saginaw River Mouth', latitude: 43.64049421, longitude: -83.85056922 };
const JONES_ROAD = { id: 'jones-road', name: 'Jones Road', latitude: 43.63491636, longitude: -83.81635599 };

/* Northport to Elk Rapids is 18.7 miles across Grand Traverse Bay and a 46.5 mile drive around it. */
const NORTHPORT = { latitude: 45.1281, longitude: -85.6206 };
const ACROSS_THE_BAY = { id: 'across', name: 'Elk Rapids', latitude: 44.900213, longitude: -85.41724063 };
const ROUND_THE_SHORE = { id: 'shore', name: 'West Arm', latitude: 44.90642479, longitude: -85.63008252 };

test('straight-line distance still measures the crow flight', () => {
  const acrossWater = rank.distanceMiles(NORTHPORT.latitude, NORTHPORT.longitude, ACROSS_THE_BAY.latitude, ACROSS_THE_BAY.longitude);
  assert.ok(acrossWater > 17 && acrossWater < 20, `unexpected straight-line distance ${acrossWater}`);
});

test('the shortlist is ordered by drive distance, not by straight line', () => {
  const { pool, nextStraightMiles } = rank.candidatePool([RIVER_MOUTH, JONES_ROAD], BAY_CITY);
  assert.equal(pool[0].id, 'river-mouth', 'straight-line order puts the slower launch first');
  const driveResult = { legs: [
    { index: 0, meters: 6.5 * METERS, seconds: 17 * 60 },
    { index: 1, meters: 6.6 * METERS, seconds: 15 * 60 },
  ]};
  const result = rank.finalizeShortlist({ pool, nextStraightMiles, drive: driveResult });
  assert.equal(result.routed, true);
  assert.equal(result.items[0].id, 'jones-road', 'the launch you reach first must rank first');
  assert.equal(Math.round(result.items[0].driveMinutes), 15);
});

test('a launch across open water does not outrank one you can drive to', () => {
  const { pool, nextStraightMiles } = rank.candidatePool([ACROSS_THE_BAY, ROUND_THE_SHORE], NORTHPORT);
  const result = rank.finalizeShortlist({
    pool,
    nextStraightMiles,
    drive: { legs: pool.map((record, index) => record.id === 'across'
      ? { index, meters: 46.5 * METERS, seconds: 73 * 60 }
      : { index, meters: 18.0 * METERS, seconds: 27 * 60 }) },
  });
  assert.equal(result.items[0].id, 'shore');
  assert.ok(result.items[0].driveMiles < result.items[1].driveMiles);
});

test('a routing outage falls back to straight line and says it is not routed', () => {
  const { pool, nextStraightMiles } = rank.candidatePool([RIVER_MOUTH, JONES_ROAD], BAY_CITY);
  const result = rank.finalizeShortlist({ pool, nextStraightMiles, drive: null });
  assert.equal(result.routed, false);
  assert.equal(result.items[0].id, 'river-mouth', 'without routing the page must not pretend to know the drive');
  assert.equal(result.items[0].driveMiles, null);
});

test('nothing beyond the road-distance cap is presented as a nearby choice', () => {
  const far = { id: 'far', name: 'Far launch', latitude: 44.0, longitude: -85.6 };
  const { pool, nextStraightMiles } = rank.candidatePool([far], NORTHPORT);
  const result = rank.finalizeShortlist({ pool, nextStraightMiles, drive: { legs: [{ index: 0, meters: 95 * METERS, seconds: 120 * 60 }] } });
  assert.equal(result.items.length, 0);
  assert.equal(result.reason, 'out-of-range');
  assert.equal(result.droppedOutOfRange, 1);
});

test('the pool widens when a launch outside it could still win on road distance', () => {
  const pool = [{ id: 'a', distanceMiles: 4, latitude: 45, longitude: -85 }];
  const kept = rank.finalizeShortlist({ pool, nextStraightMiles: 9, limit: 1, drive: { legs: [{ index: 0, meters: 40 * METERS, seconds: 60 * 60 }] } });
  assert.equal(kept.needsWiderPool, true, '9 straight-line miles can beat a 40 mile drive, so the pool must widen');
  const settled = rank.finalizeShortlist({ pool, nextStraightMiles: 55, limit: 1, drive: { legs: [{ index: 0, meters: 12 * METERS, seconds: 20 * 60 }] } });
  assert.equal(settled.needsWiderPool, false, 'no excluded launch can beat a 12 mile drive from 55 straight-line miles');
});

test('an unroutable coordinate is dropped rather than counted as zero miles', () => {
  const pool = [
    { id: 'a', distanceMiles: 3, latitude: 45, longitude: -85 },
    { id: 'b', distanceMiles: 5, latitude: 45.1, longitude: -85.1 },
  ];
  const result = rank.finalizeShortlist({ pool, nextStraightMiles: null, drive: { legs: [{ index: 1, meters: 6 * METERS, seconds: 10 * 60 }] } });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'b');
  assert.equal(result.unroutable, 1);
});

test('the drive endpoint validates its input and caps the matrix', () => {
  const { parsePoint, parseDestinations, MAX_DESTINATIONS } = drive._test;
  assert.deepEqual(parsePoint('43.5945,-83.8889'), { lat: 43.5945, lon: -83.8889 });
  assert.equal(parsePoint('not,a,point'), null);
  assert.equal(parsePoint('91,-83'), null);
  assert.equal(parseDestinations(''), null);
  assert.equal(parseDestinations(Array(MAX_DESTINATIONS + 1).fill('43,-83').join(';')), null);
  assert.equal(parseDestinations('43,-83;44,-84').length, 2);
});

test('the drive endpoint answers a bad request with 400, never a 200 carrying an error', async () => {
  const res = { statusCode: 200, body: null, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await drive({ method: 'GET', query: { from: 'nonsense' } }, res);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.error);
});

test('Great Lakes connecting rivers and inland lakes coexist in the statewide inventory', () => {
  const { WHERE, CONNECTING_WATERS, waterScope, eligibleAttributes } = launches._test;
  assert.ok(!WHERE.includes("greatlakesaccess LIKE 'Yes%'"), 'statewide source query must not be Great-Lakes gated');
  assert.deepEqual(CONNECTING_WATERS, ['Detroit River', 'Saint Clair River', 'Saint Marys River']);

  const elizabethPark = {
    name: 'Elizabeth Park', facilityid: 'X1', latitude: 42.1361, longitude: -83.1746,
    waterbody: 'Detroit River', greatlakesaccess: 'No, greater than 2 miles or does not connect (inland lake, etc.)', flag: 'InProgress',
  };
  assert.equal(waterScope(elizabethPark), 'great-lakes');
  assert.equal(eligibleAttributes(elizabethPark), true);

  const inlandLake = { ...elizabethPark, facilityid: 'X2', waterbody: 'Houghton Lake' };
  assert.equal(waterScope(inlandLake), 'inland-or-other');
  assert.equal(eligibleAttributes(inlandLake), true, 'inland lakes must be admitted by the statewide finder');
});

test('an unlisted trailer-parking count never satisfies a minimum-parking filter', () => {
  assert.ok(
    /const listed=num\(a\.trailerParking\);\s*\n\s*if\(listed===null\|\|listed<minParking\)return false;/.test(finderJs),
    'parking refinement must explicitly reject an unlisted count rather than treating it as zero'
  );
  assert.match(finderHtml,/Trailer parking/);
  assert.match(finderHtml,/10\+ trailer spaces/);
});

test('the finder ranks on the shared drive-distance core and caps its reach', () => {
  assert.ok(/const DRIVE_API='\/api\/boat-launch-drive'/.test(finderJs));
  assert.ok(/RANK\.candidatePool/.test(finderJs) && /RANK\.finalizeShortlist/.test(finderJs));
  assert.ok(/driveMiles/.test(finderJs) && /driveMinutes/.test(finderJs), 'road distance and time must remain visible data');
  assert.ok(/straight line/.test(finderJs), 'the unrouted fallback must be labeled straight line');
  assert.ok(!/roundRadius/.test(finderJs), 'the uncapped radius expansion must be gone');
  assert.ok(finderHtml.includes('/assets/boat-launch-ranking.js'), 'the page must load the ranking core before the finder');
  assert.ok(finderHtml.indexOf('/assets/boat-launch-ranking.js') < finderHtml.indexOf('/assets/boat-launch-finder.js'), 'the ranking core must load first');
});

test('inland destinations are first-class statewide searches instead of out-of-scope cases', () => {
  assert.doesNotMatch(finderJs,/outOfScope|reason:'out-of-scope'/);
  assert.match(finderHtml,/Great Lakes and inland public launches are in the same tool/);
  assert.match(finderHtml,/All Michigan waters/);
  assert.match(finderJs,/rankNearDestination/);
});

test('county is a county, not the DNR display label', () => {
  const { countyName, bareCounty } = launches._test;

  /* The DNR label appends the county; mapping it straight through printed
     "Saginaw River (Bay Co.)" into a field named county. */
  assert.equal(countyName({ WaterbodyCounty: 'Saginaw River (Bay Co.)' }), 'Bay');
  assert.equal(countyName({ NameCounty: 'Sand Point (Huron Co.)' }), 'Huron');

  /* DNR cases the concatenated names correctly in the label; the lowercase
     controls_county slug does not, which is why the label is parsed first. */
  assert.equal(countyName({ WaterbodyCounty: 'Boardman River (Grand Traverse Co.)' }), 'Grand Traverse');
  assert.equal(countyName({ WaterbodyCounty: 'Saint Clair River (St. Clair Co.)' }), 'St. Clair');
  assert.equal(countyName({ WaterbodyCounty: 'Clear Lake (Van Buren Co.)' }), 'Van Buren');

  assert.equal(countyName({ controls_county: 'iosco' }), 'Iosco', 'slug fallback when no label parses');
  assert.equal(countyName({}), null, 'no county source means no county, not a guess');

  /* Hand-typed supplemental records must mean the same thing as DNR ones. */
  assert.equal(bareCounty('Van Buren County'), 'Van Buren');
  assert.equal(bareCounty('Bay Co.'), 'Bay');
  assert.equal(bareCounty('Ottawa'), 'Ottawa');
  assert.equal(bareCounty(''), null);
});
