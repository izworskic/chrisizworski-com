'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {integrateEvent,buildPhotoFreeActivity,MAX_GAP_H}=
 require('../lib/rockhounding/photo-free-wave-activity.cjs');
const start='2026-10-12T00:00:00Z',MS=3600000;
function record(hour,h=1,period=4,from=337){
 return {time:new Date(Date.parse(start)+hour*MS).toISOString().replace('.000Z','Z'),
  waveHeightM:h,meanPeriodS:period,waveFromDeg:from,
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
  lat:46.695671,lon:-86.003799};
}
const windowOpts={fromUTC:start,toUTC:'2026-10-12T05:00:00Z',peakAtUTC:'2026-10-12T02:00:00Z'};
test('photo-free observed-height-squared mean-period activity integrates original half-hour samples',()=>{
 const rows=Array.from({length:11},(_,i)=>record(i*.5,2,5,337));
 const r=integrateEvent(rows,windowOpts);
 assert.equal(r.spanHours,5);
 assert.equal(r.observedTimeCoveragePct,100);
 assert.equal(r.observedWaveActivityProxy,100); // 2^2 * 5 sec * 5 observed hours
 assert.equal(r.enoughCoverageForRelativeComparison,true);
 assert.ok(r.historicFacingSharePct>99);
 assert.equal(r.physicalPowerKWPerMeter,null);
 assert.equal(r.calibratedBeachWaveHeightM,null);
 assert.equal(r.canPredictNewStones,false);
 assert.equal(r.canClaimSafeAccess,false);
 assert.equal(r.photoEvidenceRequired,false);
});
test('double height quadruples comparison proxy while double period doubles it',()=>{
 const a=Array.from({length:11},(_,i)=>record(i*.5,1,4));
 const b=a.map(x=>({...x,waveHeightM:2}));
 const c=a.map(x=>({...x,meanPeriodS:8}));
 const x=integrateEvent(a,windowOpts),y=integrateEvent(b,windowOpts),z=integrateEvent(c,windowOpts);
 assert.equal(y.observedWaveActivityProxy/x.observedWaveActivityProxy,4);
 assert.equal(z.observedWaveActivityProxy/x.observedWaveActivityProxy,2);
 assert.equal(y.newRockExposureProbability,null);
});
test('opposite observed wave-from produces no historical-facing directional proxy but not safe conditions',()=>{
 const rows=Array.from({length:11},(_,i)=>record(i*.5,2,5,157));
 const r=integrateEvent(rows,windowOpts);
 assert.equal(r.observedWaveActivityProxy,100);
 assert.equal(r.historicFacingActivityProxy,0);
 assert.equal(r.historicFacingSharePct,0);
 assert.equal(r.canClaimSafeAccess,false);
});
test('missing samples cannot become an invented high-power storm or eligible event',()=>{
 const rows=[record(0,2),record(.5,2),record(4.5,2),record(5,2)];
 const r=integrateEvent(rows,windowOpts);
 assert.equal(r.observedTimeCoveragePct,20);
 assert.equal(r.integratedObservedHours,1);
 assert.equal(r.longSourceGaps,1);
 assert.equal(r.enoughCoverageForRelativeComparison,false);
 assert.equal(r.physicalPowerKWPerMeter,null);
});
test('duplicates, future-invalid and fictitious wave inputs must fail closed',()=>{
 assert.throws(()=>integrateEvent([record(0),record(0)],windowOpts),/Duplicate/);
 assert.throws(()=>integrateEvent([record(0,25)],windowOpts),/Source-invalid/);
 assert.throws(()=>integrateEvent([record(0)],{fromUTC:'2026-10-12T05:00:00Z',
  toUTC:start,peakAtUTC:start}),/bounds/);
 assert.throws(()=>integrateEvent(Array.from({length:30001},()=>record(0)),windowOpts),/oversized/);
 assert.throws(()=>buildPhotoFreeActivity({ledger:{}}),/source-matched/);
 assert.equal(MAX_GAP_H,1.5);
});
