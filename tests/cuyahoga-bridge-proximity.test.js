'use strict';
const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const refs = require('../data/cuyahoga/bridge-observation-references.json');
let analyzeReferenceProximity;
before(async () => ({ analyzeReferenceProximity } = await import('../scripts/cuyahoga-bridge-proximity.mjs')));
const fix=(seen,lat,lon)=>({seen,lat,lon});
// Twelve unmodified NOAA 2025-08-21 broadcast fixes of MARK W BARKER
// used as tiny CC0 regression evidence, not an entire recorded track or navigation guidance.
// Date/source: https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/index.html
const excerpt = [
 fix('2025-08-21T15:35:07.000Z',41.49562,-81.7026),
 fix('2025-08-21T15:36:17.000Z',41.4951,-81.7029),
 fix('2025-08-21T15:37:28.000Z',41.49462,-81.70315),
 fix('2025-08-21T15:38:39.000Z',41.49418,-81.70339),
 fix('2025-08-21T15:39:47.000Z',41.49383,-81.70366),
 fix('2025-08-21T15:40:58.000Z',41.4932,-81.70365),
 fix('2025-08-21T15:53:11.000Z',41.48843,-81.70181),
 fix('2025-08-21T15:54:15.000Z',41.4883,-81.70137),
 fix('2025-08-21T15:55:18.000Z',41.48824,-81.70089),
 fix('2025-08-21T15:56:21.000Z',41.48828,-81.70047),
 fix('2025-08-21T15:57:24.000Z',41.48843,-81.69987),
 fix('2025-08-21T15:58:31.000Z',41.48864,-81.69939)
];
const study=points=>({schemaVersion:1,observationKind:'historical',source:'NOAA 2025-08-21 AIS points',tracks:[{mmsi:'368251670',vesselNames:['MARK W BARKER'],points}]});
test('real NOAA excerpt yields two moving reference-area encounters in correct upriver order, not confirmed crossings',()=>{
 const result=analyzeReferenceProximity(study(excerpt),refs);
 assert.equal(result.bridgeEtasEnabled,false);
 assert.equal(result.bridgeCrossingsValidated,false);
 const checks=result.analyses[0].referenceChecks;
 assert.deepEqual(checks.map(c=>c.status),['MOVING_NEAR_REFERENCE_ONLY','MOVING_NEAR_REFERENCE_ONLY']);
 assert.equal(checks[0].episodes[0].nearestObservedAt,'2025-08-21T15:38:39.000Z');
 assert.equal(checks[1].episodes[0].nearestObservedAt,'2025-08-21T15:56:21.000Z');
 assert.equal(result.analyses[0].observedOrder[0].minutesBetweenNearestAisObservations,17.7);
 assert.equal(result.analyses[0].observedOrder[0].interpretation,'ORDER_CONSISTENT_WITH_UPRIVER_MOVEMENT');
 assert.match(checks[0].episodes[0].kind,/NOT_CONFIRMED_BRIDGE_CROSSING/);
});
test('stationary receiver jitter near reference must not create a moving-passage event',()=>{
 const pt=refs.references[0];
 const jitter=Array.from({length:40},(_,i)=>fix(new Date(Date.parse('2025-08-21T12:00:00Z')+i*60000).toISOString(),
   pt.latitude+(i%2)*.000005,pt.longitude));
 const result=analyzeReferenceProximity(study(jitter),refs);
 assert.equal(result.analyses[0].referenceChecks[0].status,'NEARBY_BUT_MOVEMENT_OR_GAP_INSUFFICIENT');
 assert.deepEqual(result.analyses[0].observedOrder,[]);
});
test('large reporting gaps around reference fail closed',()=>{
 const points=[
  fix('2025-08-15T17:20:00Z',41.495, -81.703),
  fix('2025-08-15T17:36:00Z',41.4942, -81.703),
  fix('2025-08-15T17:55:00Z',41.493, -81.703)];
 const result=analyzeReferenceProximity(study(points),refs);
 assert.equal(result.analyses[0].referenceChecks[0].status,'NEARBY_BUT_MOVEMENT_OR_GAP_INSUFFICIENT');
});
test('unknown or empty source evidence cannot make an ETA or a bridge opening claim',()=>{
 const result=analyzeReferenceProximity(study([]),refs);
 assert.equal(result.analyses[0].referenceChecks[0].status,'NO_NEARBY_OBSERVATIONS');
 assert.equal(result.bridgeOpeningTimesValidated,false);
 assert.throws(()=>analyzeReferenceProximity({...study(excerpt),observationKind:'live'},refs),/historical/);
});
test('unsourced bridge position or false precision classification is rejected',()=>{
 const invalid=structuredClone(refs);
 invalid.references[0].pointStatus='CONFIRMED_SPAN';
 assert.throws(()=>analyzeReferenceProximity(study(excerpt),invalid),/unsourced/);
});
