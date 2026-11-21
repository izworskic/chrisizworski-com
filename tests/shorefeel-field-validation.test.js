'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fieldAudit,siteApproved,preIssued,metrics}=require('../lib/shorefeel/field-validation.js');
const site={id:'SYNTHETIC-BAY-BEACH-TEST',type:'measured-beach-air',
 lat:43.6714,lon:-83.9068,sensorHeightM:2,distanceFromShoreM:60,radiationShielded:true};
const now=new Date('2026-11-21T00:00:00Z');
function observation(day,hour){
 const at=Date.UTC(2026,6,day,hour);
 const date=new Date(at).toISOString();
 const val=75+day%7;
 return {observedAt:date,beachAirF:val,nwsShoreF:val+3,modelBeachF:val+1,
  nwsIssuedAt:new Date(at-4*3600000).toISOString(),
  modelIssuedAt:new Date(at-2*3600000).toISOString(),
  windSector:day%2?'onshore':'offshore',eventId:'synthetic-day-'+day};
}
const dataset=()=>({station:{...site},units:'F',
 modelVersion:'synthetic-v1-lock',modelLockedAt:'2026-07-15T18:00:00Z',
 holdoutStartsAt:'2026-07-17T00:00:00Z',
 observations:Array.from({length:31},(_,i)=>i+1)
  .flatMap(day=>Array.from({length:8},(_,h)=>observation(day,h+8)))});
test('reject unverified offshore, unshielded, badly sited and nonair sensor data',()=>{
 assert.equal(siteApproved(site),true);
 assert.equal(siteApproved({...site,type:'offshore-buoy'}),false);
 assert.equal(siteApproved({...site,radiationShielded:false}),false);
 assert.equal(siteApproved({...site,distanceFromShoreM:2300}),false);
 assert.equal(siteApproved({...site,sensorHeightM:11}),false);
 assert.equal(fieldAudit({...dataset(),station:{...site,type:'offshore-buoy'}},now).status,'invalid-ground-truth');
 assert.equal(fieldAudit({...dataset(),units:'C'},now).status,'invalid-ground-truth');
});
test('synthetic field holdout metrics are paired and NEVER authorize publication',()=>{
 const result=fieldAudit(dataset(),now);
 assert.equal(result.status,'holdout-reviewable');
 assert.equal(result.sampleCount,248);
 assert.equal(result.holdout.n,120);
 assert.equal(result.holdout.nwsBeachBaseline.maeF,3);
 assert.equal(result.holdout.physicsCandidate.maeF,1);
 assert.equal(result.holdout.maeImprovementF,2);
 assert.ok(result.holdout.windSectors.onshore>10);
 assert.ok(result.holdout.windSectors.offshore>10);
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.automaticCalibration,false);
 assert.equal(result.modelLock.version,'synthetic-v1-lock');
});
test('future, duplicate, conflict, post-issue, null air and missing forecasts fail closed',()=>{
 const d=dataset();
 const row=d.observations[0];
 d.observations=[
  row,{...row},{...row,beachAirF:10},
  {...observation(2,8),nwsIssuedAt:'2026-07-08T00:00:00Z'},
  {...observation(2,9),beachAirF:null},
  {...observation(2,10),observedAt:'2027-01-01T10:00:00Z'},
  null
 ];
 const r=fieldAudit(d,now);
 assert.equal(r.status,'insufficient-field-evidence');
 assert.ok(r.rejected.conflict>=1);
 assert.ok(r.rejected.duplicate>=1);
 assert.ok(r.rejected.notPreissued>=1);
 assert.ok(r.rejected.missing>=2);
 assert.ok(r.rejected.future>=1);
 assert.equal(r.sampleCount,0,'conflicting duplicate timestamp cannot become field truth');
});
test('holdout after model lock is required and no split yields no skill score',()=>{
 const d=dataset();d.modelLockedAt='2026-08-20T00:00:00Z';
 const a=fieldAudit(d,now);
 assert.equal(a.status,'insufficient-field-evidence');
 assert.equal(a.modelLock,null);
 d.modelLockedAt='2026-07-15T18:00:00Z';delete d.holdoutStartsAt;
 const b=fieldAudit(d,now);
 assert.equal(b.status,'insufficient-field-evidence');
 assert.equal(b.holdout.n,0);
});
test('forecast must be issued before the observed value; scores use identical cases',()=>{
 assert.equal(preIssued('2026-07-10T15:00:00Z','2026-07-10T14:00:00Z'),true);
 assert.equal(preIssued('2026-07-10T15:00:00Z','2026-07-10T16:00:00Z'),false);
 assert.equal(metrics([{beachAirF:70,nws:74},{beachAirF:76,nws:76}],'nws').maeF,2);
});
