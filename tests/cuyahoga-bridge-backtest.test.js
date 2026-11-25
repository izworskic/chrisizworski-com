'use strict';
const {test,before}=require('node:test');
const assert=require('node:assert/strict');
let evaluateHistoricalReferenceWindows,segmentObservedWindows;
before(async()=>({evaluateHistoricalReferenceWindows,segmentObservedWindows}=await import('../scripts/cuyahoga-bridge-backtest.mjs')));
const ev=(id,mile,time)=>({
 id,riverMile:mile,status:'OBSERVED_NEAR_CHART_POINT_WITH_BRACKET',
 useForIndividualBridgeCalibration:true,crossAgency:{status:'TWO_AGENCY_PROXIMITY_AGREEMENT'},
 bracket:{nearestObservedAt:'2025-08-21T'+time+'Z',
  observedBracketStart:'2025-08-21T'+time+'Z',observedBracketEnd:'2025-08-21T'+time+'Z',bracketDurationMinutes:2.2}
});
const report=(events, mmsi='368251670')=>({
 schemaVersion:1,kind:'NOAA_CHART_REFERENCE_PROXIMITY_INTERVALS',chartSourceUrl:'https://nauticalcharts.noaa.gov/test.pdf',
 futureArrivalPredictionEnabled:false,bridgeCrossingTimestampValidated:false,surveyedBridgeAxisValidated:false,
 vessels:[{mmsi,observedPositions:100,bridgeReferenceEvents:events}]
});
test('held-out coverage preserves increasing and decreasing mileage without inventing ETA',()=>{
 const first=report([ev('center',1.39,'15:38:39.000'),ev('columbus',1.93,'15:56:21.000')]);
 const second=report([ev('columbus',1.93,'12:30:00.000'),ev('center',1.39,'12:45:00.000')]);
 const result=evaluateHistoricalReferenceWindows([{date:'2025-08-21',report:first},{date:'2025-07-07',report:second}]);
 assert.equal(result.dates.length,2);
 assert.equal(result.visits[0].direction,'INCREASING_COAST_PILOT_MILES');
 assert.equal(result.visits[1].direction,'DECREASING_COAST_PILOT_MILES');
 assert.equal(result.referenceCoverage.find(r=>r.id==='center').independentDates,2);
 assert.equal(result.visitorArrivalPredictionEnabled,false);
 assert.equal(result.status,'INSUFFICIENT_INDEPENDENT_CROSSING_GROUND_TRUTH');
});
test('missing sources, optimistic flags and repeated same-day vessel cannot inflate calibration',()=>{
 const p=report([ev('a',1.39,'10:00:00.000'),ev('b',2.43,'11:00:00.000')]);
 assert.throws(()=>evaluateHistoricalReferenceWindows([{date:'2025-08-21',report:p},{date:'2025-08-21',report:p}]),/Duplicate/);
 assert.throws(()=>evaluateHistoricalReferenceWindows([{date:'2025-08-21',report:{...p,futureArrivalPredictionEnabled:true}}]),/unvalidated/);
 assert.throws(()=>evaluateHistoricalReferenceWindows([{date:'2025-08-21',report:p},{date:'2025-08-22',report:{...p,chartSourceUrl:'another'}}]),/Mixed/);
});
test('collocated bridges and conflicting official positions are omitted from calibration',()=>{
 const c=ev('city-rr',2.42,'10:00:00.000');c.useForIndividualBridgeCalibration=false;
 const source={id:'main-avenue',status:'OFFICIAL_POSITION_CONFLICT',bracket:null};
 const result=evaluateHistoricalReferenceWindows([{date:'2025-08-21',report:report([c,source,ev('carter',2.43,'10:05:00.000')])}]);
 assert.equal(result.visits[0].observedReferenceCount,1);
 assert.deepEqual(result.visits[0].sourceConflicts,['main-avenue']);
 assert.deepEqual(result.visits[0].withheldCollocated,['city-rr']);
});
test('no observations cannot be interpreted as calibrated accuracy',()=>{
 const result=evaluateHistoricalReferenceWindows([{date:'2025-08-21',report:report([])}]);
 assert.equal(result.referenceCoverage.length,0);
 assert.equal(result.visits[0].direction,'UNRESOLVED');
 assert.equal(result.criteria.independentBridgeCrossingLabelsAvailable,false);
 assert.equal(result.visitorArrivalPredictionEnabled,false);
});

test('one date with separated river visits must not be mislabeled a single direction',()=>{
 const r=report([
   ev('csx',1.28,'03:57:51.000'),ev('center',1.39,'04:02:19.000'),
   ev('innerbelt',3.42,'05:02:04.000'),ev('i490',4.79,'05:39:30.000'),
   ev('flats',2.24,'14:02:07.000')
 ]);
 const result=evaluateHistoricalReferenceWindows([{date:'2025-07-07',report:r}]);
 const visit=result.visits[0];
 assert.equal(visit.direction,'MULTIPLE_TIME_SEPARATED_EPISODES');
 assert.equal(visit.observedEpisodes.length,2);
 assert.equal(visit.observedEpisodes[0].direction,'INCREASING_COAST_PILOT_MILES');
 assert.equal(visit.observedEpisodes[1].direction,'UNRESOLVED');
 assert.deepEqual(visit.observedEpisodes.map(e=>e.referenceWindows),[4,1]);
 assert.equal(result.referenceCoverage.find(x=>x.id==='flats').byDirection.UNRESOLVED,1);
 assert.equal(result.visitorArrivalPredictionEnabled,false);
});
test('source event gaps exactly at threshold are not artificially split',()=>{
 const list=[
   {id:'a',riverMile:1,observedNearAt:'2025-07-07T01:00:00Z'},
   {id:'b',riverMile:2,observedNearAt:'2025-07-07T04:00:00Z'}
 ];
 assert.equal(segmentObservedWindows(list).length,1);
 assert.equal(segmentObservedWindows([...list,{id:'c',riverMile:3,observedNearAt:'2025-07-07T07:00:01Z'}]).length,2);
 assert.throws(()=>segmentObservedWindows([{id:'x',riverMile:1,observedNearAt:'not a time'}]),/Invalid/);
});
