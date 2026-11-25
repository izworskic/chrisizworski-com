'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { freshnessState } = require('../lib/cbbt/core');
const { FRESHNESS } = require('../lib/cbbt/constants');
const NOW = Date.parse('2026-12-10T12:00:00Z');
const stamp = offset => new Date(NOW + offset).toISOString();

test('future, missing and malformed source times are unknown in both domain classifiers', async () => {
  const { freshness } = await import('../lib/snowmobile/engine.mjs');
  for (const timestamp of [stamp(1), stamp(3600000), null, '', 'not a date']) {
    for (const kind of ['report','grooming','weather']) {
      assert.deepEqual(freshness(timestamp, kind, NOW), {minutes:null,state:'UNKNOWN'});
    }
    for (const thresholds of Object.values(FRESHNESS)) {
      assert.deepEqual(freshnessState(timestamp, thresholds, NOW), {state:'unknown',ageMs:null,ageMinutes:null});
    }
  }
  assert.equal(freshness(stamp(0),'report',NOW).state,'LIVE');
  assert.equal(freshnessState(stamp(0),FRESHNESS.noaaObservation,NOW).state,'fresh');
});

test('valid old source timestamps retain existing aging and stale boundaries', async () => {
  const { freshness } = await import('../lib/snowmobile/engine.mjs');
  assert.equal(freshness(stamp(-360*60000),'report',NOW).state,'LIVE');
  assert.equal(freshness(stamp(-360*60000-1),'report',NOW).state,'VERY_RECENT');
  assert.equal(freshness(stamp(-10080*60000-1),'report',NOW).state,'STALE');
  const policy = FRESHNESS.noaaObservation;
  assert.equal(freshnessState(stamp(-policy.staleMs),policy,NOW).state,'aging');
  assert.equal(freshnessState(stamp(-policy.staleMs-1),policy,NOW).state,'stale');
});

test('future trail-surface reports cannot supply ride quality or confidence; new valid reports recover', async () => {
  const { freshness, scoreSegment, confidence } = await import('../lib/snowmobile/engine.mjs');
  const future = {condition:'Excellent',freshness:freshness(stamp(3600000),'report',NOW)};
  const valid = {condition:'Excellent',freshness:freshness(stamp(-60000),'report',NOW)};
  const args = {season:true,weather:{maxTempF:24}};
  assert.equal(scoreSegment({officialStatus:'Open'},{...args,clubReport:future}).score,null);
  assert.equal(scoreSegment({officialStatus:'Open'},{...args,clubReport:future}).band,'UNKNOWN');
  assert.ok(Number.isFinite(scoreSegment({officialStatus:'Open'},{...args,clubReport:valid}).score));
  const confidenceArgs = {officialFresh:true,closureLayerVerified:true,weatherFresh:true,segmentCoverage:1};
  assert.equal(confidence({...confidenceArgs,clubReports:[future]}),confidence({...confidenceArgs,clubReports:[]}));
  assert.equal(scoreSegment({officialStatus:'Closed'},{...args,clubReport:valid}).band,'CLOSED');
});

test('regional evidence summary excludes future dates and does not call unknown grooming stale', async () => {
  const { newestIso, groomingSummary } = await import('../lib/snowmobile/build-region.mjs');
  assert.equal(newestIso([stamp(1),stamp(-60000),stamp(-120000)],NOW),stamp(-60000));
  assert.equal(newestIso([stamp(1),null,'bad'],NOW),null);
  assert.equal(newestIso([stamp(0)],NOW),stamp(0));
  const unknown={lastGroomedAt:stamp(3600000),groomingFreshness:{state:'UNKNOWN'}};
  assert.deepEqual(groomingSummary([unknown]),{state:'UNKNOWN',label:'Grooming not verified',known:0,recent:0});
  const recent={lastGroomedAt:stamp(-60000),groomingFreshness:{state:'LIVE'}};
  assert.equal(groomingSummary([unknown,recent]).known,1);
  assert.equal(groomingSummary([unknown,recent]).state,'RECENT');
  const stale={lastGroomedAt:stamp(-500000000),groomingFreshness:{state:'STALE'}};
  assert.equal(groomingSummary([unknown,stale]).state,'STALE');
});
