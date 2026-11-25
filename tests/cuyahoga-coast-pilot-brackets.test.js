'use strict';
const {before,test}=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../data/cuyahoga/noaa-coast-pilot-bridge-references.json');
const odot=require('../data/cuyahoga/odot-bridge-inventory-points.json');
let analyzeCoastPilotStudy,validateCoastPilot,separationMeters;
before(async()=>({analyzeCoastPilotStudy,validateCoastPilot,separationMeters}=await import('../scripts/cuyahoga-coast-pilot-brackets.mjs')));
const p=(t,lat,lon)=>({seen:'2025-08-21T'+t+'.000Z',lat,lon});
const barker=[
 p('15:22:38',41.49883,-81.70664),p('15:23:47',41.4987,-81.7058),p('15:24:58',41.49821,-81.70505),
 p('15:37:28',41.49462,-81.70315),p('15:38:39',41.49418,-81.70339),p('15:39:47',41.49383,-81.70366),
 p('15:55:18',41.48824,-81.70089),p('15:56:21',41.48828,-81.70047),p('15:57:24',41.48843,-81.69987),
 p('16:12:15',41.49376,-81.69883),p('16:13:18',41.49406,-81.69825),p('16:14:28',41.49423,-81.69769),
 p('16:15:37',41.49438,-81.69742),
 p('16:32:44',41.49404,-81.69206),p('16:33:49',41.49349,-81.69224),p('16:34:58',41.49291,-81.69257)
];
const study=(points,mmsi='368251670')=>({schemaVersion:1,observationKind:'historical',source:'NOAA one-minute historic AIS 2025-08-21',tracks:[{mmsi,vesselNames:['MARK W BARKER'],points}]});
const find=(x,id)=>x.vessels[0].bridgeReferenceEvents.find(e=>e.id===id);
test('NOAA Coast Pilot rounded coordinates, Old River fork, official conflict and uniqueness remain enforced',()=>{
 assert.equal(validateCoastPilot(catalog),true);
 assert.equal(catalog.bridges.filter(x=>x.channel==='old').length,2);
 const invalid=structuredClone(catalog);
 invalid.bridges.find(x=>x.id==='center-st-139').riverMile=1.28;
 assert.throws(()=>validateCoastPilot(invalid),/increasing/);
 const altered=structuredClone(catalog);
 altered.bridges.find(x=>x.id==='center-st-139').longitude+=.0003;
 assert.throws(()=>validateCoastPilot(altered),/transcription/);
 const bad=structuredClone(catalog);
 bad.knownConflicts=[];
 assert.throws(()=>validateCoastPilot(bad),/discrepancy/);
});
test('real Mark W. Barker NOAA fixes produce conservative reference-time brackets, not exact bridge times',()=>{
 const result=analyzeCoastPilotStudy(study(barker),catalog,odot);
 const center=find(result,'center-st-139'),columbus=find(result,'columbus-193');
 assert.equal(center.status,'OBSERVED_NEAR_CHART_POINT_WITH_BRACKET');
 assert.equal(center.bracket.nearestObservedAt,'2025-08-21T15:38:39.000Z');
 assert.equal(center.bracket.observedBracketStart,'2025-08-21T15:37:28.000Z');
 assert.equal(center.bracket.observedBracketEnd,'2025-08-21T15:39:47.000Z');
 assert.ok(center.bracket.nearestReferenceDistanceMeters<15);
 assert.equal(columbus.status,'OBSERVED_NEAR_CHART_POINT_WITH_BRACKET');
 assert.equal(columbus.bracket.nearestObservedAt,'2025-08-21T15:56:21.000Z');
 assert.equal(result.futureArrivalPredictionEnabled,false);
 assert.equal(result.surveyedBridgeAxisValidated,false);
 assert.deepEqual(result.excludedOldRiverReferences.sort(),['old-csx-089','willow-102'].sort());
 const interval=result.vessels[0].sourceObservedReferenceIntervals.find(x=>x.from==='center-st-139'&&x.to==='columbus-193');
 assert.ok(interval);
 assert.equal(interval.direction,'INCREASING_COAST_PILOT_MILES');
 assert.equal(interval.label,'OBSERVED_NEARBY_REFERENCE_INTERVAL_NOT_BRIDGE_TO_BRIDGE_TIME');
 assert.ok(interval.minimumMinutesBetweenReferenceBrackets<interval.maximumMinutesBetweenReferenceBrackets);
});
test('one NOAA and one conflicting Ohio DOT reference refuse joint Main Avenue point identity',()=>{
 const result=analyzeCoastPilotStudy(study(barker),catalog,odot);
 const main=find(result,'main-avenue-101');
 assert.equal(main.status,'OFFICIAL_POSITION_CONFLICT');
 assert.ok(main.crossAgency.odotDistanceMeters>180);
 assert.equal(main.bracket,null);
});
test('close City of Cleveland Railroad and Carter Road locations may not be calibrated independently',()=>{
 const report=analyzeCoastPilotStudy(study(barker),catalog,odot);
 const c=find(report,'city-rr-242'),r=find(report,'carter-243');
 assert.equal(c.status,'OBSERVED_NEAR_CHART_POINT_WITH_BRACKET');
 assert.equal(r.status,'OBSERVED_NEAR_CHART_POINT_WITH_BRACKET');
 assert.equal(c.useForIndividualBridgeCalibration,false);
 assert.equal(r.useForIndividualBridgeCalibration,false);
 assert.match(c.collocatedFeatureWarning,/INSUFFICIENT/);
 const link=report.vessels[0].sourceObservedReferenceIntervals.find(x=>
   x.from==='city-rr-242'&&x.to==='carter-243');
 if(link)assert.equal(link.calibrationEligible,false);
});
test('stationary AIS jitter must not become a bridge passage',()=>{
 const ref=catalog.bridges.find(x=>x.id==='center-st-139');
 const pts=Array.from({length:35},(_,i)=>({
  lat:ref.latitude+(i%2)*.000002,lon:ref.longitude,seen:new Date(Date.parse('2025-08-21T12:00:00Z')+i*60000).toISOString()
 }));
 const result=analyzeCoastPilotStudy(study(pts),catalog,odot);
 assert.equal(find(result,'center-st-139').status,'NEARBY_BUT_GAP_OR_MOVEMENT_INSUFFICIENT');
 assert.equal(result.vessels[0].sourceObservedReferenceIntervals.length,0);
});
test('large gaps across a real bridge-area observation fail closed',()=>{
 const pts=[
  p('15:37:28',41.49462,-81.70315),
  p('15:38:39',41.49418,-81.70339),
  p('15:57:24',41.49383,-81.70366)];
 const result=analyzeCoastPilotStudy(study(pts),catalog,odot);
 assert.equal(find(result,'center-st-139').status,'NEARBY_BUT_GAP_OR_MOVEMENT_INSUFFICIENT');
 assert.equal(result.futureArrivalPredictionEnabled,false);
});
test('source missing or invalid AIS does not imply no ships and cannot yield ETA',()=>{
 const result=analyzeCoastPilotStudy(study([]),catalog,odot);
 assert.equal(find(result,'center-st-139').status,'NO_NEARBY_AIS_FIX');
 assert.equal(result.bridgeOpeningTimestampValidated,false);
 assert.throws(()=>analyzeCoastPilotStudy({...study(barker),observationKind:'live'},catalog,odot),/historical/);
});
test('real NOAA Sam Laud poorly sampled Center Street window must remain unbracketed',()=>{
 const pt=(seen,lat,lon)=>({seen,lat,lon});
 const sam=[
  pt('2025-08-15T17:30:11.000Z',41.4953,-81.70266),
  pt('2025-08-15T17:36:21.000Z',41.49378,-81.70389),
  pt('2025-08-15T17:55:31.000Z',41.49022,-81.70457)
 ];
 const result=analyzeCoastPilotStudy({schemaVersion:1,observationKind:'historical',source:'NOAA 2025-08-15',tracks:[{mmsi:'366938760',vesselNames:['SAM LAUD'],points:sam}]},catalog,odot);
 assert.equal(find(result,'center-st-139').status,'NEARBY_BUT_GAP_OR_MOVEMENT_INSUFFICIENT');
});
