'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {replay,bounds}=require('../scripts/benchmark-great-lakes-passage.cjs');
const soo=require('../lib/soo-locks-next'),duluth=require('../lib/duluth-canal');
const base=Date.parse('2024-09-01T12:00:00Z'),iso=t=>new Date(t).toISOString(),m=60000;
function issue(site,offset,id,mode='confirmed'){
 const t=base+offset*m;
 const v={mmsi:'316001234',name:'SYNTHETIC ONLY',lat:site==='soo'?46.4735:46.8,lon:site==='soo'?-84.459:-91.8,
 seen:iso(t-2*m),speedKnots:9,course:site==='soo'?65:270,shipType:70,lengthMeters:225,destination:site==='soo'?'NANTICOKE':'DULUTH'};
 if(mode==='abstain')v.course=null;
 const model=(site==='soo'?soo:duluth).buildCandidate(v,t);
 const midpoint=model?Date.parse(model.window.midpoint):t+30*m;
 return {id,site,issuedAt:iso(t),availableAt:iso(t-m),vessel:v,outcome:mode==='unresolved'?{kind:'unresolved'}:
 {kind:'confirmed-crossing-bracket',eventId:'synthetic-'+id,evidenceRef:'synthetic-fixture-not-field-evidence',method:'independently-reviewed-crossing',start:iso(midpoint-m),end:iso(midpoint+m)}};
}
function fixture(){return {schemaVersion:1,kind:'synthetic',source:{url:'https://coast.noaa.gov/accessais/',review:'Synthetic fixture only; no NOAA records downloaded'},holdoutStartsAt:iso(base+1440*m),
 issues:[issue('soo',0,'s1'),issue('duluth',30,'d1'),issue('soo',1500,'s2'),issue('duluth',1560,'d2','unresolved'),issue('soo',1620,'s3','abstain')]};}
test('paired replay retains abstentions, unresolved estimates and independent temporal splits',()=>{
 const r=replay(fixture()),a=r.partitions.development.overall,b=r.partitions.holdout.overall;
 assert.equal(r.fieldAccuracyVerified,false);assert.equal(r.productionCalibrationAuthorized,false);
 assert.equal(a.issues,2);assert.equal(a.pairedScored,2);assert.equal(a.modelMaeLowerMinutes,0);assert.equal(a.modelMaeUpperMinutes,1);
 assert.equal(a.fullyContainedBrackets,1);assert.equal(b.issues,3);assert.equal(b.estimates,2);
 assert.equal(b.pairedScored,1);assert.equal(b.confirmedButAbstained,1);assert.equal(b.unresolvedEstimates,1);
 assert.equal(b.distinctLabeledEvents,1);assert.equal(r.partitions.holdout.bySite.duluth.overall.modelMaeUpperMinutes,null);
});
test('interval error bounds never invent an exact crossing timestamp',()=>{
 assert.deepEqual(bounds(10*m,9*m,11*m),[0,1]);
 assert.deepEqual(bounds(8*m,9*m,11*m),[1,3]);
 assert.deepEqual(bounds(13*m,9*m,11*m),[2,4]);
});
test('reject leakage, duplicate events and ambiguous or unreviewed outcomes',()=>{
 const edits=[d=>d.issues[0].vessel.seen=iso(base+1),d=>d.issues[0].availableAt=iso(base+1),
 d=>d.issues[0].availableAt=iso(base-10*m),d=>d.issues[1].id=d.issues[0].id,
 d=>d.issues[2].outcome.eventId=d.issues[0].outcome.eventId,
 d=>d.issues[0].outcome.method='near-chart-point',
 d=>d.issues[0].outcome.end=iso(Date.parse(d.issues[0].outcome.start)+6*m),
 d=>d.issues[0].outcome.start=iso(base-1),
 d=>d.holdoutStartsAt=d.issues[0].outcome.start,
 d=>d.issues[0].outcome.evidenceRef='',
 d=>d.issues[0].vessel.lat=100];
 for(const edit of edits){const d=fixture();edit(d);assert.throws(()=>replay(d));}
});
