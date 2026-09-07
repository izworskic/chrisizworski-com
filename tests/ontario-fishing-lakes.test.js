const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../api/ontario-fishing-lakes.js')._test;

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'ontario-fishing-lake-finder', 'index.html'), 'utf8');

test('Ontario ARA query preserves source filters and escapes apostrophes', () => {
  const where = api.buildAraWhere({ species: 'Brook Trout', q: "O'Brien", fmz: '10', thermal: 'cold' });
  assert.match(where, /FISH_SPECIES_SUMMARY IS NOT NULL/);
  assert.match(where, /WATERBODY_LID IS NOT NULL/);
  assert.match(where, /Brook Trout/);
  assert.match(where, /O''Brien/);
  assert.match(where, /FISHERIES_MANAGEMENT_ZONE_ID=10/);
  assert.match(where, /THERMAL_REGIME LIKE 'cold%'/);
});

test('species parsing is deterministic and de-duplicates records', () => {
  assert.deepEqual(api.parseSpecies('Brook Trout; Lake Trout; Brook Trout'), ['Brook Trout', 'Lake Trout']);
});

test('ARA normalization keeps the joinable waterbody identifier and lake evidence', () => {
  const lake = api.normalizeAra({ attributes: {
    OBJECTID: 7,
    WATERBODY_LID: '12345678',
    OFFICIAL_WATERBODY_NAME: 'Test Lake',
    WATERBODY_TYPE: 'Lake',
    FISHERIES_MANAGEMENT_ZONE_ID: 10,
    THERMAL_REGIME: 'Coldwater',
    FISH_SPECIES_SUMMARY: 'Brook Trout; Lake Trout',
    SURFACE_AREA: 88.5,
    MAXIMUM_DEPTH: 19.2,
    MEAN_DEPTH: 8.1,
    SECCHI_DEPTH: 4.2
  }});
  assert.equal(lake.id, '12345678');
  assert.equal(lake.name, 'Test Lake');
  assert.equal(lake.fmz, 10);
  assert.equal(lake.maximumDepthM, 19.2);
  assert.ok(lake.species.includes('Brook Trout'));
});

test('duplicate ARA segments collapse to one waterbody and preserve species evidence', () => {
  const rows = [
    { id: '1', surfaceAreaHa: 20, species: ['Brook Trout'], speciesSummary: 'Brook Trout' },
    { id: '1', surfaceAreaHa: 30, species: ['Lake Trout'], speciesSummary: 'Lake Trout' }
  ];
  const [lake] = api.dedupeAra(rows);
  assert.equal(lake.surfaceAreaHa, 30);
  assert.deepEqual(new Set(lake.species), new Set(['Brook Trout', 'Lake Trout']));
});

test('brook-trout match score rewards recorded species, coldwater habitat and recent target stocking', () => {
  const currentYear = new Date().getUTCFullYear();
  const scored = api.matchScore({
    speciesSummary: 'Brook Trout; Lake Trout',
    species: ['Brook Trout', 'Lake Trout'],
    thermalRegime: 'Coldwater',
    maximumDepthM: 14,
    surfaceAreaHa: 40,
    latitude: 47.1,
    longitude: -83.2,
    stocking: [{ species: 'Brook Trout', year: currentYear - 1 }]
  }, 'Brook Trout');
  assert.equal(scored.score, 100);
  assert.ok(scored.reasons.some(r => /Brook Trout recorded/.test(r)));
  assert.ok(scored.reasons.some(r => /coldwater regime/.test(r)));
  assert.ok(scored.reasons.some(r => /stocked/.test(r)));
});

test('score does not fabricate target-species evidence', () => {
  const scored = api.matchScore({
    speciesSummary: 'Walleye; Northern Pike',
    species: ['Walleye', 'Northern Pike'],
    thermalRegime: 'Warmwater',
    maximumDepthM: 12,
    surfaceAreaHa: 80,
    latitude: 46,
    longitude: -82,
    stocking: []
  }, 'Brook Trout');
  assert.ok(scored.score < 50);
  assert.ok(scored.reasons.some(r => /not shown/.test(r)));
});

test('distance helper and lake classification are stable', () => {
  assert.equal(api.haversineKm(45, -80, 45, -80), 0);
  assert.equal(api.looksLikeLake('Lake'), true);
  assert.equal(api.looksLikeLake('Reservoir'), true);
  assert.equal(api.looksLikeLake('River'), false);
});

test('source manifest points to official Ontario-backed services', () => {
  const sources = api.sourceManifest();
  assert.match(sources.aquaticResourceAreas.url, /li[o]?services|lioservices/i);
  assert.match(sources.waterbodyIdentifier.url, /lioservices/i);
  assert.match(sources.fishingAccess.url, /lioservices/i);
  assert.match(sources.fishStocking.url, /arcgis/i);
  assert.match(sources.regulations.url, /ontario\.ca/);
});

test('frontend truth contract: one lake search, map-first UI, no catch-probability claim or guessed fallback', () => {
  assert.equal((html.match(/type="search"/g) || []).length, 1);
  assert.match(html, /Find the lake that fits the trip/);
  assert.match(html, /Match score = filter fit/);
  assert.match(html, /not a catch forecast/i);
  assert.match(html, /did not substitute guessed lake records/i);
  assert.match(html, /Ontario Lake Finder Search/);
  assert.doesNotMatch(html, /navigator\.geolocation|getCurrentPosition|localStorage|sessionStorage/);
  assert.doesNotMatch(html, /chance of catching|catch probability|guaranteed catch/i);
});

test('frontend exposes current regulation verification instead of hard-coding legal advice', () => {
  assert.match(html, /Check regulations/);
  assert.match(html, /waterbody-specific exceptions/);
  assert.match(html, /ontario\.ca\/document\/ontario-fishing-regulations-summary/);
});
