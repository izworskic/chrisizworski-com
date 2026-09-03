const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mod = require('../api/national-white-christmas.js')._test;

function history(validYears, probability, distance, name='Station') {
  return {
    station: { name, distance_miles: distance, latitude: 44, longitude: -84 },
    history: {
      probability,
      valid_years: validYears,
      recent_probability: probability,
      definition: 'At least 1 inch of snow depth on December 25',
      normal_period: '1991-2020'
    }
  };
}

function snowRows(validYears, whiteYears) {
  const rows = [];
  for (let year = 1991; year <= 2020; year++) {
    const i = year - 1991;
    rows.push({ year, value: i < validYears ? (i < whiteYears ? 2 : 0) : null });
  }
  return rows;
}

test('historical summary accepts usable partial records but rejects truly sparse records', () => {
  const usable = mod.historicalSummary(snowRows(20, 12));
  assert.ok(usable);
  assert.equal(usable.valid_years, 20);
  assert.equal(usable.probability, 60);
  assert.equal(mod.historicalSummary(snowRows(14, 8)), null);
});

test('search radii deliberately expand local to regional', () => {
  assert.deepEqual(mod.HISTORY_SEARCH_RADII_MILES, [50, 100, 175]);
  assert.equal(mod.HISTORY_RADIUS_MILES, 175);
});

test('strong single station beats a merely closer moderate record', () => {
  const closer = history(20, 60, 8, 'Closer moderate');
  const stronger = history(29, 65, 32, 'Stronger complete');
  closer.quality_score = mod.stationQuality(closer);
  stronger.quality_score = mod.stationQuality(stronger);
  const chosen = mod.chooseSingleStation([closer, stronger]);
  assert.equal(chosen.station.name, 'Stronger complete');
});

test('staged search accumulates candidates before accepting a moderate fallback', () => {
  const source = fs.readFileSync(path.join(__dirname, '../api/national-white-christmas.js'), 'utf8');
  assert.match(source, /const allCandidates=new Map\(\)/);
  assert.match(source, /valid_years>=HISTORY_SINGLE_STRONG_YEARS/);
  assert.match(source, /const single=chooseSingleStation\(combined\);/);
  const strongReturn = source.indexOf('if(strong){');
  const finalModerate = source.indexOf('const single=chooseSingleStation(combined);');
  assert.ok(strongReturn >= 0 && finalModerate > strongReturn);
});

test('regional blend creates a finite transparent baseline from sparse usable stations', () => {
  const candidates = [
    history(18, 70, 24, 'A'),
    history(19, 55, 43, 'B'),
    history(17, 65, 67, 'C')
  ].map(c => ({ ...c, quality_score: mod.stationQuality(c) }));
  const blend = mod.weightedBlend(candidates);
  assert.ok(blend);
  assert.equal(blend.baseline_type, 'regional_blend');
  assert.equal(blend.station, null);
  assert.equal(blend.stations.length, 3);
  assert.ok(Number.isFinite(blend.history.probability));
  assert.ok(blend.history.probability >= 55 && blend.history.probability <= 70);
});

test('West Branch style station-gap fallback produces an estimate instead of unavailable', () => {
  const candidates = [
    history(18, 72, 26, 'Northern Lower A'),
    history(19, 61, 44, 'Northern Lower B'),
    history(17, 68, 69, 'Northern Lower C')
  ].map(c => ({ ...c, quality_score: mod.stationQuality(c) }));
  const blend = mod.weightedBlend(candidates);
  const hc = mod.historicalConfidence(blend);
  const target = new Date(Date.UTC(2026, 11, 25, 12));
  const now = new Date(Date.UTC(2026, 8, 2, 12));
  const model = mod.probabilityModel({
    history: blend.history,
    historyConfidence: hc,
    cpc: { temperature: null, precipitation: null },
    pack: null,
    forecast: null,
    target,
    now
  });
  assert.notEqual(model.confidence, 'unavailable');
  assert.ok(Number.isFinite(model.probability));
});

test('confidence reflects historical evidence quality', () => {
  const strong = { ...history(29, 70, 25), baseline_type: 'single_station' };
  const moderate = { ...history(21, 60, 70), baseline_type: 'single_station' };
  assert.equal(mod.historicalConfidence(strong).level, 'high');
  assert.equal(mod.historicalConfidence(moderate).level, 'moderate');
});

test('truly missing historical evidence still fails honestly', () => {
  const target = new Date(Date.UTC(2026, 11, 25, 12));
  const now = new Date(Date.UTC(2026, 8, 2, 12));
  const model = mod.probabilityModel({ history: null, cpc: {}, pack: null, forecast: null, target, now });
  assert.equal(model.probability, null);
  assert.equal(model.confidence, 'unavailable');
  assert.equal(model.confidence_reason, 'no_usable_history');
});

test('regional blend explanation is explicit', () => {
  const candidates = [history(18, 60, 20, 'A'), history(17, 65, 40, 'B')].map(c => ({...c, quality_score: mod.stationQuality(c)}));
  const blend = mod.weightedBlend(candidates);
  const reason = mod.historyReason(blend);
  assert.equal(reason.code, 'regional_blend');
  assert.match(reason.message, /blends 2 compatible nearby climate stations/i);
});

test('page handles regional blend rather than assuming a single station', () => {
  const page = fs.readFileSync(path.join(__dirname, '../public/national-tools/white-christmas/index.html'), 'utf8');
  assert.match(page, /c\.baseline_type==="regional_blend"/);
  assert.match(page, /Array\.isArray\(c\.stations\)/);
  assert.match(page, /history_reason/);
  assert.doesNotMatch(page, /c\?\(c\.station\.name/);
});
