'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const soo=require('../lib/soo-locks-next'),study=require('../lib/soo-predictive-study.cjs');
const {DATES,FROZEN,compare,summarize,verifyFreeze}=require('../scripts/soo-independent-validation.cjs');
const date=DATES[0],fields=['seen','lat','lon','speedKnots','course','heading','shipType','lengthMeters'];
const row=(h,lat,lon,speed=8,course=90)=>[date+'T'+h+':00Z',lat,lon,speed,course,course,70,230];
const issue=row('12:11',46.33837833333334,-84.18788833333333,5.8,329.3);
const before=row('13:29',46.5030,-84.3490,2,270),inside=row('13:30',46.5030,-84.3501,2,270);
function day(points){return {schemaVersion:1,kind:'NOAA_HISTORICAL_VESSEL_LIBRARY_DAY',forecastEnabled:false,timezone:'UTC',date,archiveSha256:'a'.repeat(64),sourceUrl:'https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-'+date+'.csv.zst',pointFields:fields,inputRows:points.length,regions:[{id:'soo',bbox:soo.RIVER_BBOX,points:points.length,vessels:1,tracks:[{mmsi:'366904910',points}]}]};}
test('locked prior, fresh dates and fixed grid without future leakage',()=>{
 verifyFreeze();assert.equal(FROZEN.offsetMinutes,49.77);assert.equal(FROZEN.radiusMinutes,74.47);
 const opts={allowedDates:DATES,gridMinutes:15};
 assert.throws(()=>study.buildCases(day([issue]),soo),/contract/);
 const a=study.buildCases(day([issue,before,inside]),soo,opts).cases[0],b=study.buildCases(day([issue]),soo,opts).cases[0];
 assert.equal(a.issuedAt,date+'T12:15:00.000Z');assert.equal(a.existingMinutes,b.existingMinutes);
 assert.equal(a.outcome.state,'OBSERVED_CHAMBER_REFERENCE_BRACKET');
 assert.equal(a.shipType,70);
 const stale=row('12:09',issue[1],issue[2],5.8,329.3);
 assert.equal(study.buildCases(day([stale]),soo,opts).cases.length,0);
});
test('paired metrics count unresolved and do not infer failed arrivals',()=>{
 const base={existingMinutes:50,existingLower:30,existingUpper:70,naiveMinutes:40};
 const a=compare([{...base,outcome:{state:'OBSERVED_CHAMBER_REFERENCE_BRACKET',lowerMinutes:99,upperMinutes:101,midpointMinutes:100}},{...base,outcome:{state:'RIGHT_CENSORED_BY_DAY_END'}}]);
 assert.equal(a.matched,1);assert.equal(a.issued,2);assert.equal(a.adjusted.meanAbsoluteErrorMinutes,.23);
 assert.deepEqual(a.containmentBoundsAmongIssued.adjusted,[.5,1]);
 assert.equal(compare([]).resolvedFraction,null);
});
test('partial and empty cohorts fail closed, reject duplicate dates, retain aggregate only',()=>{
 const a=summarize([day([issue,before,inside])]);
 assert.equal(a.missingDates.length,3);assert.equal(a.modes.originalIssue.screenPassed,false);
 assert.equal(a.modes.quarterHourIssue.all.matched,1);
 assert.equal(a.productionCalibrationAuthorized,false);assert.equal(a.officialLockEntryGroundTruth,false);
 assert.ok(!JSON.stringify(a).includes('366904910'));
 assert.equal(summarize([]).modes.originalIssue.screenPassed,false);
 assert.throws(()=>summarize([day([issue]),day([issue])]),/duplicate/);
});
