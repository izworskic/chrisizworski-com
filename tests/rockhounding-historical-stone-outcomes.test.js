'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const evidence=require('../data/rockhounding/historical-local-stone-availability-observations.json');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
test('real Grand Marais observer reports both exposure and depletion and never prove a 2026 Agate storm outcome',()=>{
 assert.equal(evidence.schemaVersion,'rockhounding-historical-ground-observations-2026-10-v1');
 assert.equal(evidence.observations.length,3);
 assert.equal(evidence.actualObserved2026OffshoreWaveRows,5243);
 assert.equal(evidence.verified2026MeasuredStoneExposureOutcomes,0);
 assert.equal(evidence.matching2026CameraPairs,0);
 const directions=new Set(evidence.observations.map(x=>x.directionOfRockAccessibility));
 assert.ok(directions.has('INCREASE_REPORTED_ON_SOME_SEGMENTS'));
 assert.ok(directions.has('DECREASE_REPORTED'));
 assert.ok(directions.has('MIXED_AND_SEASON_DEPENDENT'));
 for(const obs of evidence.observations){
  assert.ok(/^https:\/\/(?:www\.)?agatela(?:dy\.blogspot|dy\.com)/.test(obs.originalUrl));
  assert.equal(obs.agateBeachGrandMaraisSameSegmentVerified,false);
  assert.equal(obs.exactMaterialVolumeQuantified,false);
  assert.equal(obs.observationCausallyLinkedToGLOS2026,false);
  assert.equal(obs.provesNewAgateDeposit,false);
 }
 assert.ok(Object.values(evidence.unsupportedClaims).every(v=>v===false));
});
test('2013 negative report references Woodland Park, not a measured Agate Beach frame',()=>{
 const x=evidence.observations.find(x=>x.id==='woodland-park-august-2013-rock-depletion');
 assert.equal(x.namedReach,'Woodland Park shoreline, Grand Marais, Michigan');
 assert.equal(x.sourcePublishedDate,'2013-11');
 assert.match(x.reportSummary,/sand/);
 assert.equal(x.directionOfRockAccessibility,'DECREASE_REPORTED');
 assert.equal(evidence.unsupportedClaims.canPredictFreshAgates,false);
});
test('research page emphasizes non-monotonic actual rock exposure, sources, and no current forecast',()=>{
 assert.match(html,/id="historical-rock-availability"/);
 assert.match(html,/A storm doesn't always put more stones on the beach/);
 assert.match(html,/they can also carry rocks away or bury them under sand/);
 assert.match(html,/Original March 2012 field report/);
 assert.match(html,/Original 2013 local observation/);
 assert.match(html,/2009–2014 spring-beach comparison/);
 assert.match(html,/have not been calibrated against the 2026 GLOS events/);
 assert.match(html,/id="historicalRockInterpretation"/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
