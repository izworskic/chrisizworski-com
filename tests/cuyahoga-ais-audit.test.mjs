import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSnapshot, auditHistoricalSamples } from '../scripts/cuyahoga-ais-audit.mjs';

const clock = Date.parse('2026-11-22T10:00:00Z');
const feature = (mmsi, seen, lon = -81.70, lat = 41.50, source = 'fixture') => ({
  type: 'Feature', properties: { mmsi, seen, source }, geometry: { type: 'Point', coordinates: [lon, lat] }
});
const pt = (m, lon = -81.70, lat = 41.50) => ({ lon, lat, seen: new Date(clock + m * 60000).toISOString() });

test('snapshots distinguish freshness, future timestamps and positions outside the research box', () => {
  const result = auditSnapshot({ type: 'FeatureCollection', features: [
    feature('123456789', new Date(clock - 4 * 60000).toISOString()),
    feature('123456789', new Date(clock - 29 * 60000).toISOString()),
    feature('987654321', new Date(clock - 31 * 60000).toISOString()),
    feature('111111111', new Date(clock + 4 * 60000).toISOString()),
    feature('111111112', 'not a time'),
    feature('111111113', new Date(clock).toISOString(), -82),
  ]}, clock);
  assert.equal(result.counts.received, 6);
  assert.equal(result.counts.inResearchBox, 5);
  assert.equal(result.counts.distinctMmsi, 4);
  assert.equal(result.counts.fresh5m, 1);
  assert.equal(result.counts.fresh10m, 1);
  assert.equal(result.counts.fresh30m, 2);
  assert.equal(result.counts.futureTime, 1);
  assert.equal(result.counts.missingOrInvalidTime, 1);
  assert.equal(result.assessment, 'SNAPSHOT_ONLY_NOT_COVERAGE_PROOF');
});

test('empty snapshot is not interpreted as no vessels or sufficient coverage', () => {
  const result = auditSnapshot({ type: 'FeatureCollection', features: [] }, clock);
  assert.equal(result.counts.fresh30m, 0);
  assert.match(result.note, /does not mean no traffic/);
  assert.throws(() => auditSnapshot({ features: [] }, clock), /FeatureCollection/);
});

test('historical track audit surfaces gaps, truncation, duplicates and insufficient samples', () => {
  const result = auditHistoricalSamples({ schemaVersion: 1, tracks: [
    { mmsi: '123456789', points: [pt(0), pt(3), pt(6)] },
    { mmsi: '222222222', points: [pt(0), pt(15), pt(15)] },
    { mmsi: '333333333', points: [pt(0), pt(1)], truncated: true },
    { mmsi: '444444444', points: [pt(0), pt(1, -82)] },
    { mmsi: 'not-mmsi', points: [] },
  ]});
  assert.deepEqual(result.statusCounts, {
    GAPS_OVER_5_MINUTES: 1,
    INSUFFICIENT_SAMPLES: 1,
    INVALID_TRACK: 1,
    PASSAGE_CANDIDATE_ONLY: 1,
    TRUNCATED_SAMPLE: 1,
  });
  assert.equal(result.tracks[1].gapsOver10m, 1);
  assert.equal(result.tracks[1].excludedPoints, 1);
  assert.equal(result.tracks[0].bridgeEtaValidated, false);
  assert.equal(result.assessment, 'BRIDGE_ETA_NOT_VALIDATED');
});

test('strict schema rejects missing historical records', () => {
  assert.throws(() => auditHistoricalSamples({ tracks: [] }), /schemaVersion/);
  assert.throws(() => auditHistoricalSamples(null), /schemaVersion/);
});
