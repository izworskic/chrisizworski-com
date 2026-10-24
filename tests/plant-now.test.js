// What to Plant Now in Michigan: the brief's verification list, run against the shipped engine.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const E = require('../lib/plant-now');
const K = globalThis.GardenKit, F = globalThis.MIFrost;
const day = iso => K.fromISO(iso);
const status = (crop, st, iso, cond) => E.cropStatus(E.CROPS.find(c => c.id === crop), F.station(st), day(iso), cond);

// (a) Statuses match the cited MSU rules at stations across Michigan's zones: Sault Ste. Marie (UP, 4b-5a),
// Marquette (5a), Bay City (6a). Rules are frost-relative, so the check is against each station's own dates.
test('statuses follow the MSU rules at stations in zones 4b, 5a and 6a', () => {
  for (const s of ['sault-ste-marie', 'marquette-wso', 'bay-city']) {
    const st = F.station(s), open = K.parse(st.p25);
    // Transplants: indoors 6 to 8 weeks before the danger of frost is past; out from that date.
    assert.equal(status('tomatoes', s, K.toISO(open - 56, 2026)).code, 'START_INDOORS', s);
    assert.equal(status('tomatoes', s, K.toISO(open - 42, 2026)).code, 'START_INDOORS', s);
    assert.equal(status('tomatoes', s, K.toISO(open - 5, 2026)).code, 'HARDEN_OFF', s);
    assert.equal(status('peppers', s, K.toISO(open, 2026)).code, 'TRANSPLANT', s);
    // Warm-season seed: after the danger of frost, and not in soil under 60 F.
    assert.equal(status('beans', s, K.toISO(open - 1, 2026)).code, 'WAIT', s);
    assert.equal(status('beans', s, K.toISO(open, 2026), { soilF: 55 }).code, 'WAIT_SOIL', s);
    assert.equal(status('beans', s, K.toISO(open, 2026), { soilF: 62 }).code, 'PLANT', s);
    // Root crops at 40 F soil; hardy crops when the ground can be worked.
    assert.equal(status('carrots', s, '2026-04-15', { soilF: 38 }).code, 'WAIT_SOIL', s);
    assert.equal(status('carrots', s, '2026-04-15', { soilF: 41 }).code, 'PLANT', s);
    assert.equal(status('peas', s, '2026-04-15', { workable: true }).code, 'PLANT', s);
    assert.equal(status('peas', s, '2026-04-15').code, 'READY_WHEN', s);
  }
  assert.equal(K.fmt(K.parse(F.station('bay-city').p25)), 'May 9');
});

// (b) Moving the date moves crops across a season boundary on schedule.
test('a test date flips tomatoes from START INDOORS to TRANSPLANT on schedule', () => {
  const seq = ['2026-03-13', '2026-03-14', '2026-03-28', '2026-03-29', '2026-04-29', '2026-05-08', '2026-05-09'].map(d => status('tomatoes', 'bay-city', d).code);
  assert.deepEqual(seq, ['WAIT', 'START_INDOORS', 'START_INDOORS', 'WAIT', 'HARDEN_OFF', 'HARDEN_OFF', 'TRANSPLANT']);
  assert.equal(status('tomatoes', 'bay-city', '2026-10-05').code, 'DONE', 'killed by the first fall frost (Oct 3)');
});

// (c) No source, no date.
test('crops and stations without a Michigan source say NOT REPORTED, never a guessed date', () => {
  for (const c of ['basil', 'cilantro', 'garlic', 'potatoes', 'lettuce']) {
    const r = status(c, 'bay-city', '2026-05-15');
    assert.equal(r.code, 'NOT_REPORTED', c);
    assert.equal(r.windows.length, 0, c);
    assert.doesNotMatch(r.detail, /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d/, c);
  }
  // Adrian's first fall frost is not published, so no DONE date is claimed there.
  assert.equal(E.frostOf(F.station('adrian')).fall, null);
  assert.notEqual(status('tomatoes', 'adrian', '2026-10-20').code, 'DONE');
  assert.equal(E.FALL_PUBLISHED.length, 42);
});

// (d) No new URLs: the engine lives on the existing hub, listed once.
test('the sitemap lists the hub exactly once and no plant-now pages', () => {
  const sm = fs.readFileSync('public/sitemap.xml', 'utf8');
  assert.equal((sm.match(/<loc>https:\/\/chrisizworski\.com\/michigan-gardening\/<\/loc>/g) || []).length, 1);
  assert.doesNotMatch(sm, /michigan-gardening\/[a-z]/);
});

test('places: ZIPs and towns resolve to the nearest station', () => {
  assert.equal(E.locate('48706').station.s, 'bay-city');
  assert.equal(E.locate('49783').station.s, 'sault-ste-marie');
  assert.equal(E.locate('Traverse City').station.s, 'traverse-city');
  assert.equal(E.locate('Atlantis'), null);
  assert.ok(E.locate('49855').miles < 30, 'Marquette ZIP near the Marquette station');
});
