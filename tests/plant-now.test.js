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
    assert.equal(status('beans', s, K.toISO(open, 2026), { soilF: 60 }).code, 'WAIT_SOIL', s);
    assert.match(status('beans', s, K.toISO(open, 2026), { soilF: 62 }).detail, /frost is still possible/);
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
  for (const c of ['basil', 'cilantro', 'potatoes']) {
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

test('garlic guidance distinguishes hard freeze from first frost', () => {
  const r = status('garlic', 'bay-city', '2026-11-01');
  assert.equal(r.code, 'PLAN_GARLIC');
  assert.match(r.detail, /3 to 5 weeks before a hard freeze/);
  assert.equal(r.windows.length, 0);
});

const GY = require('../public/assets/garden-tools/garden-year.js');
test('fall planner uses the supplied year, packet value, buffer, and never invents a missing frost', () => {
 assert.equal(GY.fallTarget(2028, 'Oct 3', 50, 14), '2028-07-31');
 assert.equal(GY.fallTarget(2027, 'Oct 3', 50, 14), '2027-07-31');
 assert.equal(GY.fallTarget(2026, null, 50, 14), null);
 assert.equal(GY.fallTarget(2026, 'Oct 3', 0, 14), null);
 assert.equal(GY.seasonForMonth(12), 'winter');
 assert.equal(GY.seasonForMonth(8), 'summer');
});
test('fall crop planning is a conditional prompt, not a made-up deadline', () => {
 const r=status('kale','bay-city','2026-08-01');
 assert.equal(r.code,'PLAN_FALL'); assert.equal(r.windows.length,0);
 assert.match(r.detail,/not a forecast/);
 assert.match(status('kale','adrian','2026-08-01').detail,/unavailable/);
});

test('structured fall planner preserves source and date uncertainty', () => {
 const bay=F.station('bay-city'), adrian=F.station('adrian');
 const a=E.fallPlan(bay,{year:2028,maturityDays:50,bufferDays:14});
 assert.equal(a.planningDate,'2028-07-31');assert.equal(a.referenceBasis,'station_typical');assert.equal(a.source,'msuFall');
 assert.equal(E.fallPlan(adrian,{year:2028,maturityDays:50,bufferDays:14}).reason,'fall_frost_unavailable');
 const custom=E.fallPlan(adrian,{year:2028,maturityDays:50,bufferDays:14,frostISO:'2028-10-10'});
 assert.equal(custom.referenceBasis,'visitor_supplied');assert.equal(custom.planningDate,'2028-08-07');
 assert.equal(E.fallPlan(bay,{year:2028,maturityDays:50,bufferDays:14,frostISO:'2028-02-30'}).reason,'invalid_frost_date');
 assert.equal(E.fallPlan(bay,{year:2028,maturityDays:0,bufferDays:14}).reason,'invalid_input');
 assert.equal(E.fallReference('lettuce').basis,'days after germination');assert.equal(E.fallReference('tomatoes'),null);
});
test('spring soil rules do not issue a winter plant-now instruction', () => {
 assert.equal(status('peas','bay-city','2026-01-15',{workable:true}).code,'NEXT_SPRING');
 assert.equal(status('carrots','bay-city','2026-01-15',{soilF:45}).code,'NEXT_SPRING');
});
