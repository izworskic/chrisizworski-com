'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildCases,evaluate,DATES,strictChamber}=require('../lib/soo-predictive-study.cjs');
const soo=require('../lib/soo-locks-next');
const fields=['seen','lat','lon','speedKnots','course','heading','shipType','lengthMeters'];
const at=(d,h)=>d+'T'+h+':00Z';
const row=(d,h,lat,lon,speed=8,course=90)=>[at(d,h),lat,lon,speed,course,course,70,230];
const date=DATES[0],id='366904910';
function day(points){return {schemaVersion:1,kind:'NOAA_HISTORICAL_VESSEL_LIBRARY_DAY',forecastEnabled:false,timezone:'UTC',date,
 archiveSha256:'a'.repeat(64),sourceUrl:'https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-'+date+'.csv.zst',pointFields:fields,
 regions:[{id:'soo',bbox:soo.RIVER_BBOX,points:points.length,vessels:1,tracks:[{mmsi:id,points}]}]}}
const issue=row(date,'12:00',46.33837833333334,-84.18788833333333,5.8,329.3);
const before=row(date,'13:29',46.5030,-84.3490,2,270);
const inside=row(date,'13:30',46.5030,-84.3501,2,270);
test('prospective issue does not require an observed future event and uses the first eligible fix',()=>{
 const a=buildCases(day([issue,before,inside]),soo).cases[0];
 const b=buildCases(day([issue]),soo).cases[0];
 assert.equal(a.issuedAt,issue[0]);assert.equal(a.issuedAt,b.issuedAt);
 assert.equal(a.existingMinutes,b.existingMinutes);
 assert.equal(a.outcome.state,'OBSERVED_CHAMBER_REFERENCE_BRACKET');assert.equal(a.outcome.lowerMinutes,89);
 assert.equal(a.outcome.upperMinutes,90);assert.equal(b.outcome.state,'NO_QUALIFYING_CHAMBER_OBSERVATION');
});
test('missing or long bracket is unresolved and cannot be replaced by a later visit',()=>{
 const a=buildCases(day([issue,{...before}].slice(0,1).concat([row(date,'13:20',46.5030,-84.3490,2,270),inside])),soo).cases[0];
 assert.equal(a.outcome.state,'FIRST_CHAMBER_OBSERVATION_UNBRACKETED');
 assert.equal(strictChamber({lat:46.5030,lon:-84.3490},soo.LOCKS),null);
 assert.throws(()=>buildCases(day([issue,issue]),soo),/unordered/);
});
function sample(d,n,actual=100){return {date:d,fixes:n,vessels:n,noIssue:0,cases:Array.from({length:n},(_,i)=>({
 mmsi:String(366904910+i),date:d,direction:i%2?'downbound':'upbound',naiveMinutes:70,existingMinutes:90,existingLower:70,existingUpper:110,
 outcome:{state:'OBSERVED_CHAMBER_REFERENCE_BRACKET',lowerMinutes:actual-1,upperMinutes:actual+1,midpointMinutes:actual}}))}}
test('training offset and diagnostic radius are independent of final holdout labels',()=>{
 const days=[sample(DATES[0],6,100),sample(DATES[1],6,105),sample(DATES[2],6,110)];
 const a=evaluate(days),b=evaluate([days[0],days[1],sample(DATES[2],6,180)]);
 assert.deepEqual(a.fit,b.fit);
 assert.equal(a.fit.medianResidualMinutes,10);assert.equal(a.fit.diagnosticRadiusMinutes,6);
 assert.equal(a.holdout.all.existing.meanAbsoluteErrorMinutes,20);assert.equal(a.holdout.all.adjusted.meanAbsoluteErrorMinutes,10);
 assert.equal(a.forecastEnabled,false);assert.equal(a.officialLockEntryGroundTruth,false);
});
test('small samples withhold challenger and unresolved outcomes are not silently counted as hits',()=>{
 const a=sample(DATES[0],2),b=sample(DATES[1],2),c=sample(DATES[2],2);
 c.cases[0].outcome={state:'NO_QUALIFYING_CHAMBER_OBSERVATION'};
 const report=evaluate([a,b,c]);
 assert.equal(report.fit.medianResidualMinutes,null);assert.equal(report.holdout.all.adjusted,null);
 assert.equal(report.groups[2].issued,2);assert.equal(report.holdout.matched,1);
 assert.throws(()=>evaluate([a,b,b]),/split date/);
});
