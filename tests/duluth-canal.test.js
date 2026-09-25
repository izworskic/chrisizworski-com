const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalize,
  buildCandidate,
  buildCandidates,
  deterministicPick,
  destinationPointsToDuluth
} = require('../lib/duluth-canal');
const { decisionPayload, MIN_CONFIDENCE, MAX_INJECTION_DEPENDENCY } = require('../lib/duluth-canal-jev');

const NOW = Date.parse('2026-09-25T01:30:00Z');

function feature(changes = {}, coordinates = [-91.8, 46.8]) {
  return {
    type: 'Feature',
    id: changes.mmsi || 366904910,
    geometry: { type: 'Point', coordinates },
    properties: {
      mmsi: changes.mmsi || 366904910,
      name: 'TEST FREIGHTER',
      seen: '2026-09-25T01:25:00Z',
      sog: 12,
      cog: 270,
      type: 70,
      destination: 'DULUTH MN',
      length: 300,
      source: 'aishub',
      ...changes
    }
  };
}

function collection(features) {
  return { type: 'FeatureCollection', features, attribution: { aishub: 'AISHub via Open Waters AIS' } };
}

test('normalizes fresh AIS and preserves visitor-relevant static particulars', () => {
  const data = normalize(collection([feature({ eta: '2026-09-25T05:00:00Z', beam: 32, draught: 8.7 })]), NOW);
  assert.equal(data.vessels.length, 1);
  assert.equal(data.vessels[0].destination, 'DULUTH MN');
  assert.equal(data.vessels[0].lengthMeters, 300);
  assert.equal(data.vessels[0].beamMeters, 32);
  assert.equal(data.vessels[0].eta.iso, '2026-09-25T05:00:00.000Z');
  assert.equal(data.attribution[0].credit, 'AISHub via Open Waters AIS');
});

test('drops stale and invalid AIS rather than converting it into anticipated traffic', () => {
  const stale = feature({ seen: '2026-09-25T00:30:00Z' });
  const badMmsi = feature({ mmsi: '123' });
  const data = normalize(collection([stale, badMmsi]), NOW);
  assert.equal(data.vessels.length, 0);
});

test('recognizes common Duluth destination forms but not Superior', () => {
  assert.equal(destinationPointsToDuluth('DULUTH MN'), true);
  assert.equal(destinationPointsToDuluth('USDLH'), true);
  assert.equal(destinationPointsToDuluth('DLH'), true);
  assert.equal(destinationPointsToDuluth('SUPERIOR WI'), false);
});

test('builds a supported arrival candidate only when Duluth destination and motion agree', () => {
  const vessel = normalize(collection([feature()]), NOW).vessels[0];
  const candidate = buildCandidate(vessel, NOW);
  assert.ok(candidate);
  assert.equal(candidate.direction, 'arrival');
  assert.equal(candidate.evidence.destinationPointsToDuluth, true);
  assert.equal(candidate.evidence.currentMotionSupportsCanalPassage, true);
  assert.ok(candidate.window.start < candidate.window.end);
  assert.ok(candidate.modeledMinutesToCanal > 0);
});

test('does not call an unrelated western Lake Superior vessel an anticipated Canal Park passage', () => {
  const vessel = normalize(collection([feature({ destination: 'THUNDER BAY', cog: 90 })]), NOW).vessels[0];
  assert.equal(buildCandidate(vessel, NOW), null);
});

test('recognizes a close-in harbor vessel moving toward the canal as a departure candidate', () => {
  const outbound = feature({ destination: 'TWO HARBORS', cog: 90, sog: 6, mmsi: 366904911 }, [-92.14, 46.7783]);
  const vessel = normalize(collection([outbound]), NOW).vessels[0];
  const candidate = buildCandidate(vessel, NOW);
  assert.ok(candidate);
  assert.equal(candidate.direction, 'departure');
  assert.equal(candidate.evidence.locallyApproachingCanal, true);
});

test('deterministic fallback prefers a materially sooner well-supported watch', () => {
  const vessels = normalize(collection([
    feature({ mmsi: 366904912, name: 'SOONER', sog: 12 }, [-91.95, 46.79]),
    feature({ mmsi: 366904913, name: 'LATER', sog: 10 }, [-90.9, 46.82])
  ]), NOW).vessels;
  const candidates = buildCandidates(vessels, NOW);
  const pick = deterministicPick(candidates);
  assert.ok(pick);
  assert.equal(pick.name, 'SOONER');
});

test('JEV payload is a sealed closed set and cannot create vessel choices', () => {
  const vessel = normalize(collection([feature()]), NOW).vessels[0];
  const candidate = buildCandidate(vessel, NOW);
  const payload = decisionPayload([candidate], new Date(NOW).toISOString());
  assert.deepEqual(Object.keys(payload.options), [candidate.id]);
  assert.match(payload.task, /supplied options are the complete valid candidate set/i);
  assert.ok(payload.constraints.some(x => /Never invent another ship/i.test(x)));
  assert.ok(payload.constraints.some(x => /more than one entrance/i.test(x)));
  assert.equal(MIN_CONFIDENCE, 0.52);
  assert.equal(MAX_INJECTION_DEPENDENCY, 0.45);
});

test('visitor page includes the decision, map, real image, live cameras, provenance and fallback surfaces', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/duluth-canal-park/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../public/assets/duluth-canal.js'), 'utf8');
  assert.match(html, /Duluth ship schedule &amp; Canal Park live watch/);
  assert.match(html, /id="watchPick"/);
  assert.match(html, /id="duluthVesselMap"/);
  assert.match(html, /Anticipated ships/);
  assert.match(html, /Live Canal Park cameras/);
  assert.match(html, /youtube-nocookie\.com\/embed\/HPS48TMmNag/);
  assert.match(html, /youtube-nocookie\.com\/embed\/H6cm5Hf-yFY/);
  assert.match(html, /harborlookout\.com/);
  assert.match(html, /duluthharborcam\.com/);
  assert.match(html, /Open Waters AIS/);
  assert.match(html, /Duluth%20Ship%20Canal-Lighthouse-1000%20footer\.jpg/);
  assert.match(html, /Chris Light/);
  assert.match(html, /CC BY-SA 4\.0/);
  assert.doesNotMatch(html + js, /utm_source=chatgpt\.com/i);
  assert.match(js, /This is not a zero-traffic report/);
  assert.match(js, /setInterval\(\(\) => \{ if \(!document\.hidden\) load\(\); \}, 60000\)/);
});

test('where-to-watch cards and map are causally linked in both directions', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/assets/duluth-canal.js'), 'utf8');
  assert.match(js, /const WATCH_SPOTS = \[/);
  assert.match(js, /North side \/ Visitor Center/);
  assert.match(js, /South side \/ Park Point/);
  assert.match(js, /Canal Park \/ Lakewalk/);
  assert.match(js, /46\.779847/);
  assert.match(js, /46\.778722/);
  assert.match(js, /46\.780067/);
  assert.match(js, /dataset\.watchSpot/);
  assert.match(js, /dataset\.watchFocus/);
  assert.match(js, /Show on map/);
  assert.match(js, /L\.divIcon/);
  assert.match(js, /marker\.on\('click', \(\) => setActiveWatchSpot\(spot\.id\)\)/);
  assert.match(js, /map\.setView\(\[spot\.lat, spot\.lon\], 16/);
  assert.match(js, /Green numbered markers match the three viewing cards below/);
});