'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {mergeSpotterLedger}=require('../lib/rockhounding/glos-spotter-event-ledger.cjs');
const {waveActivityEpisode,photoFreeWaveHistory,circularResult}=
 require('../lib/rockhounding/photo-free-wave-pulse.cjs');
const H=3600000,base=Date.parse('2026-10-10T00:00:00Z');
const row=(halfHour,h,dir=334,period=4.5)=>{
 const time=new Date(base+halfHour*H/2).toISOString().replace('.000Z','Z');
 return {time,waveHeightM:h,waveFromDeg:dir,meanPeriodS:period,
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
  lat:46.695671,lon:-86.003799};
};
const raw=rows=>({rows,stationId:'SPOT-1361',sourceDatasetId:'obs_140',observedNotForecast:true});
const now='2026-10-16T00:00:00.000Z';
function build(rows){return mergeSpotterLedger(null,raw(rows),{nowISO:now})}
function storm(start=0,height=1.4,count=20){
 return Array.from({length:count},(_,i)=>row(start+i,height));
}
test('H squared × actual mean period × sampled hour is a finite relative proxy, not physical power',()=>{
 const rows=storm(0,1.5,20);
 const event={id:'test',source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',
  actualBeachRockOutcomeObserved:false,firstElevatedAt:rows[0].time,lastElevatedAt:rows.at(-1).time,
  peakSignificantWaveHeightM:1.5,qualifiesAsDistinctMeasuredOffshoreEpisode:true};
 const s=waveActivityEpisode(rows,event);
 assert.equal(s.status,'RESEARCH_COMPARABLE_OBSERVED_OFFSHORE_ACTIVITY');
 assert.equal(s.sampleCoverageFraction,1);
 assert.equal(s.sampledHours,9.5);
 assert.equal(s.relativeWaveActivity,96.188); // 1.5² * 4.5s * 9.5 observed hours
 assert.equal(s.measuredPeakMatchesEvent,true);
 assert.equal(s.sourceIsNotBeachBreakingSurf,true);
 assert.equal(s.isTruePhysicalWavePower,false);
 assert.equal(s.isSedimentTransportEstimate,false);
 assert.equal(s.photoEvidenceRequiredForThisProxy,false);
 assert.equal(s.measuredBeachWaveHeightM,null);
 assert.equal(s.observedPebblesNewlyExposed,null);
 assert.equal(s.canPredictFreshAgates,false);
 assert.equal(s.canPublishCollectingWindow,false);
});
test('event rank represents measured offshore history only, not an agate opportunity rating',()=>{
 const samples=[...storm(0,1.3),...storm(150,2.4)];
 const out=photoFreeWaveHistory(build(samples),{nowISO:now,
  hazardSnapshot:{status:'ACTIVE'}});
 assert.equal(out.archivedEventGroups,2);
 assert.equal(out.researchComparableEvents,2);
 assert.equal(out.events[0].archiveComparisonPercentile,25);
 assert.equal(out.events[1].archiveComparisonPercentile,75);
 assert.ok(out.events[1].relativeWaveActivity>out.events[0].relativeWaveActivity);
 assert.equal(out.events.every(e=>e.isBeachReworkingObserved===false),true);
 assert.equal(out.hazardSnapshotStatus,'ACTIVE');
 assert.equal(out.hazardEvidence,'ACTIVE_RELEVANT_NWS_ALERTS_CHECK_OFFICIAL_WARNINGS');
 assert.equal(out.canClaimSafeCollecting,false);
 assert.equal(out.canPublishCollectingWindow,false);
 assert.equal(out.noPhysicalShorelineOutcomeCalibration,true);
});
test('nws CLEAR still does not authorize beach safety, stone outcomes or collecting windows',()=>{
 const one=build(storm());
 for(const status of ['CLEAR','UNKNOWN','ACTIVE',null]){
  const r=photoFreeWaveHistory(one,{nowISO:now,
    hazardSnapshot:status?{status}:null});
  assert.equal(r.canClaimSafeCollecting,false);
  assert.equal(r.canPredictFreshAgates,false);
  assert.equal(r.canPublishCollectingWindow,false);
  assert.equal(r.observationFreshness,'STALE_OBSERVATIONS');
  assert.equal(r.currentOffshoreObservedStatus,'STALE_OFFSHORE_DATA');
  if(status==='CLEAR')assert.match(r.hazardEvidence,/NOT_A_SHORE_SAFETY_CLEARANCE/);
 }
});
test('broken measurements and low coverage cannot manufacture an event impulse score',()=>{
 const rows=[...storm(0,1.4,7),...storm(20,1.4,7)];
 const event={id:'gap',source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',
  actualBeachRockOutcomeObserved:false,firstElevatedAt:rows[0].time,lastElevatedAt:rows.at(-1).time,
  peakSignificantWaveHeightM:1.4,qualifiesAsDistinctMeasuredOffshoreEpisode:true};
 const p=waveActivityEpisode(rows,event);
 assert.equal(p.status,'INSUFFICIENT_OR_GAPPY_OFFSHORE_MEASUREMENTS');
 assert.ok(p.sampleCoverageFraction<.8);
 assert.equal(p.relativeWaveActivity,null);
 assert.equal(p.unobservedGapCount,1);
 assert.equal(p.canPredictFreshAgates,false);
});
test('directional histogram uses wave-from not derived wind and refuses circular cancelation',()=>{
 const opposite=circularResult([{directionDeg:90,weight:1},{directionDeg:270,weight:1}]);
 assert.equal(opposite.directionDeg,null);
 assert.equal(opposite.concentration,0);
 const wrap=circularResult([{directionDeg:359,weight:1},{directionDeg:1,weight:1}]);
 assert.ok(wrap.directionDeg<2||wrap.directionDeg>358);
 assert.equal(wrap.concentration,1);
});
test('harbor site never inherits open-lake Agate wave activity as measured harbor breaking surf',()=>{
 const r=photoFreeWaveHistory(build(storm()),{nowISO:now,hazardSnapshot:{status:'CLEAR'}});
 assert.equal(r.canTransferIntoBayshoreHarbor,false);
 assert.equal(r.measuredBeachWaveHeightM,null);
 assert.equal(r.actualSedimentMovementMeasured,false);
 assert.equal(r.moreWindOrOffshoreWavesDoNotProveNewPebbles,true);
});
test('tampered original provider timestamps, periods and source flags fail closed',()=>{
 const rawRows=storm();
 assert.throws(()=>waveActivityEpisode(rawRows,{id:'x',source:'WIND_FORECAST',
  firstElevatedAt:rawRows[0].time,lastElevatedAt:rawRows.at(-1).time,
  actualBeachRockOutcomeObserved:false,peakSignificantWaveHeightM:1.4}),/identity/);
 const bad=[...rawRows];bad[1]={...bad[1],meanPeriodS:0};
 const e={id:'x',source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',
  actualBeachRockOutcomeObserved:false,firstElevatedAt:rawRows[0].time,
  lastElevatedAt:rawRows.at(-1).time,peakSignificantWaveHeightM:1.4,
  qualifiesAsDistinctMeasuredOffshoreEpisode:true};
 assert.throws(()=>waveActivityEpisode(bad,e),/invalid|Source-invalid/);
});
