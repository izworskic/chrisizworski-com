import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, OUT_OF_SCOPE_NOTE, regionByKey } from '../lib/snowmobile/regions.mjs';

test('statewide roster has seven regions with unique keys and non-overlapping counties', () => {
  assert.equal(REGIONS.length, 7);
  const keys = REGIONS.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length, 'region keys must be unique');
  const seenCounties = new Map();
  for (const region of REGIONS) {
    assert.ok(Array.isArray(region.counties) && region.counties.length > 0, `${region.key} must list real counties`);
    assert.ok(Number.isFinite(region.hubLat) && Number.isFinite(region.hubLon), `${region.key} needs a real hub coordinate`);
    for (const county of region.counties) {
      assert.ok(!seenCounties.has(county), `county "${county}" assigned to more than one region (${seenCounties.get(county)} and ${region.key})`);
      seenCounties.set(county, region.key);
    }
  }
});

test('exactly one region keeps the original bbox-based corridor build', () => {
  const legacy = REGIONS.filter((r) => r.legacyCorridor);
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].key, 'grayling-gaylord');
  assert.ok(legacy[0].clubs && legacy[0].clubs.grayling && legacy[0].clubs.gaylord, 'legacy region keeps its two verified club sources');
  assert.equal(legacy[0].cameraId, 'i75-grayling');
});

test('regions without a configured club source or camera say so rather than inheriting the legacy ones', () => {
  for (const region of REGIONS) {
    if (region.legacyCorridor) continue;
    assert.ok(!region.clubs, `${region.key} must not carry a fabricated club source`);
    assert.ok(!region.cameraId, `${region.key} must not carry a fabricated camera id`);
  }
});

test('regionByKey resolves a known region and returns null for an unknown one', () => {
  assert.equal(regionByKey('eastern-up').hubTown, 'Sault Ste. Marie');
  assert.equal(regionByKey('nonexistent-region'), null);
});

test('out-of-scope note is a real, non-empty disclosure string', () => {
  assert.equal(typeof OUT_OF_SCOPE_NOTE, 'string');
  assert.ok(OUT_OF_SCOPE_NOTE.length > 40);
});

test('normalizeOpenTrailFeature treats the DNR "-1" placeholder network id as absent, not as a display name', async () => {
  const { normalizeOpenTrailFeature } = await import('../lib/snowmobile/sources.mjs');
  // Reproduces the exact shape the live DNR feed returns for a real
  // segment: TrailNetwork is the literal string "-1" (an unassigned-network
  // placeholder, and truthy in JS) while the real, human-readable name sits
  // in TrailNamePrimary/SnowmobileName. Before this fix, "-1" won the
  // fallback chain and segments displayed "-1" as their trail name.
  const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-84.7, 44.7], [-84.6, 44.8]] }, properties: {
    OBJECTID: 1, GlobalID: '{ABC}', TrailNetwork: '-1', TrailNamePrimary: 'LP 7', SnowmobileName: 'LP 7', County: 'Crawford'
  }};
  const normalized = normalizeOpenTrailFeature(feature);
  assert.equal(normalized.properties.Trail_Netw, 'LP 7');
  assert.notEqual(normalized.properties.Trail_Netw, '-1');
});

test('normalizeOpenTrailFeature keeps a real TrailNetwork value when the DNR actually provides one', async () => {
  const { normalizeOpenTrailFeature } = await import('../lib/snowmobile/sources.mjs');
  const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [[-84.7, 44.7], [-84.6, 44.8]] }, properties: {
    OBJECTID: 2, GlobalID: '{DEF}', TrailNetwork: 'Trail 8 Network', TrailNamePrimary: 'UP 8', County: 'Chippewa'
  }};
  const normalized = normalizeOpenTrailFeature(feature);
  assert.equal(normalized.properties.Trail_Netw, 'Trail 8 Network');
});

test('sources module exposes the statewide fetch helpers used by the API', async () => {
  const sources = await import('../lib/snowmobile/sources.mjs');
  assert.equal(typeof sources.fetchDnrTrailsByCounty, 'function');
  assert.equal(typeof sources.fetchDnrClosures, 'function');
  assert.equal(typeof sources.fetchWeatherFor, 'function');
  assert.equal(typeof sources.fetchWeatherForHubs, 'function');
});
