'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {SCHEMA,blankLedger,mergeSpotterLedger,offshoreEvents}=
 require('../lib/rockhounding/glos-spotter-event-ledger.cjs');
const base='2026-10-01T00:00:00.000Z',H=3600000;
function row(hours,height=.6,{dir=329,period=4.4}={}){
 return {time:new Date(Date.parse(base)+hours*H).toISOString().replace('.000Z','Z'),
  waveHeightM:height,waveFromDeg:dir,meanPeriodS:period,
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
  lat:46.695671,lon:-86.003799};
}
const parsed=rows=>({stationId:'SPOT-1361',sourceDatasetId:'obs_140',
 observedNotForecast:true,rows});
const now='2026-10-15T00:00:00.000Z';
test('true half-hour high wave readings count as one correlated storm, not independent storms',()=>{
 const source=Array.from({length:20},(_,i)=>row(i*.5,i<10?1.4:.65));
 const ledger=mergeSpotterLedger(null,parsed(source),{nowISO:now});
 const r=offshoreEvents(ledger,{nowISO:now});
 assert.equal(ledger.diagnostics.retained,20);
 assert.equal(r.eventCount,1);
 assert.equal(r.qualifiedDistinctEvents,1);
 assert.equal(r.eventHistory[0].elevatedObservationCount,10);
 assert.equal(r.eventHistory[0].qualifiesAsDistinctMeasuredOffshoreEpisode,true);
 assert.equal(r.eventHistory[0].actualBeachRockOutcomeObserved,false);
 assert.equal(r.calibratedToActualRockExposure,false);
 assert.equal(r.canPublishVisitWindow,false);
});
test('distinct events need >48h separation, enough observations and no long gaps',()=>{
 const a=Array.from({length:10},(_,i)=>row(i*.5,1.7));
 const b=Array.from({length:10},(_,i)=>row(72+i*.5,1.3));
 const c=Array.from({length:3},(_,i)=>row(170+i*.5,1.2));
 const ledger=mergeSpotterLedger(null,parsed([...a,...b,...c]),{nowISO:now});
 const x=offshoreEvents(ledger,{nowISO:now});
 assert.equal(x.eventCount,3);
 assert.equal(x.qualifiedDistinctEvents,2);
 assert.equal(x.eventHistory[2].qualifiesAsDistinctMeasuredOffshoreEpisode,false);
 assert.equal(x.eventHistory[0].completeness,'EVENT_END_UNCONFIRMED_OR_SOURCE_GAPPY');
});
test('actual observed sustained post-peak drop is descriptive and never a visit recommendation',()=>{
 const a=Array.from({length:110},(_,i)=>row(i*.5,i<10?1.6:.5));
 const ledger=mergeSpotterLedger(null,parsed(a),{nowISO:now});
 const x=offshoreEvents(ledger,{nowISO:now});
 assert.equal(x.eventCount,1);
 assert.equal(x.eventHistory[0].observedOffshoreDeclineAfterPeak,true);
 assert.ok(x.eventHistory[0].observedDeclineHeightM<=.65*1.6);
 assert.equal(x.eventHistory[0].completeness,'OBSERVED_THROUGH_48H_POST_EVENT');
 assert.equal(x.eventHistory[0].canPredictFreshStones,false);
 assert.equal(x.eventHistory[0].canClaimBeachSafety,false);
});
test('gappy observations cannot prove post-storm wave decline',()=>{
 const a=Array.from({length:10},(_,i)=>row(i*.5,1.6));
 a.push(row(27,.1));
 const x=offshoreEvents(mergeSpotterLedger(null,parsed(a),{nowISO:now}),{nowISO:now});
 assert.equal(x.eventHistory[0].observedOffshoreDeclineAfterPeak,false);
 assert.equal(x.eventHistory[0].completeness,'EVENT_END_UNCONFIRMED_OR_SOURCE_GAPPY');
});
test('merge idempotent with overlapping fetches; conflict fails closed',()=>{
 const a=[row(0),row(.5,1.2),row(1,1.3)];
 const prev=mergeSpotterLedger(null,parsed(a),{nowISO:now});
 const next=mergeSpotterLedger(prev,parsed([a[1],a[2]]),{nowISO:now});
 assert.equal(next.records.length,3);
 assert.equal(next.diagnostics.added,0);
 assert.throws(()=>mergeSpotterLedger(prev,parsed([{...a[2],waveHeightM:1.8}]),{nowISO:now}),/Conflicting/);
});
test('tampered prior ledger, wrong buoy, future data and inflated claims are rejected',()=>{
 const a=mergeSpotterLedger(null,parsed([row(0)]),{nowISO:now});
 assert.equal(a.schemaVersion,SCHEMA);
 for(const mutate of [
  x=>{x.canPublishVisitWindow=true},
  x=>{x.stationId='45004'},
  x=>{x.records[0].source='NOAA_GLWU'},
  x=>{x.records[0].waveHeightM=-5}
 ]){
  const fake=structuredClone(a);mutate(fake);
  assert.throws(()=>mergeSpotterLedger(fake,parsed([]),{nowISO:now}));
 }
 assert.throws(()=>mergeSpotterLedger(null,parsed([row(400)]),{nowISO:now}),/Future/);
});
test('retention prunes older but not recent records, with explicit freshness state',()=>{
 const a=mergeSpotterLedger(null,parsed([row(0),row(1),row(2)]),{nowISO:now,retentionDays:30});
 const q=mergeSpotterLedger(a,parsed([row(10)]),{nowISO:'2026-10-31T05:00:00.000Z',retentionDays:30});
 assert.equal(q.records.length,1);
 assert.equal(q.diagnostics.expired,3);
 const x=offshoreEvents(q,{nowISO:'2026-11-14T00:00:00.000Z'});
 assert.equal(x.sourceStatus,'STALE_OBSERVATIONS');
 assert.equal(x.canPublishVisitWindow,false);
});
test('unknown and zero evidence is not taken to mean calm or safe',()=>{
 const l=blankLedger(now);
 const s=offshoreEvents(l,{nowISO:now});
 assert.equal(s.sourceStatus,'NO_OBSERVATIONS');
 assert.equal(s.eventCount,0);
 assert.equal(s.canClaimBeachSafety,false);
});
