'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateOffshoreModel,mergeOffshoreModelIssues,verifyAgainstBuoy}=
 require('../lib/rockhounding/buoy-model-verification.cjs');
const {compile}=require('../scripts/rockhounding/verify-buoy45004-model.cjs');
const issue='2026-10-15T12:00:00.000Z',iso=h=>new Date(Date.parse(issue)+h*3600000).toISOString();
const model=()=>({
 schemaVersion:'noaa-glwu-buoy45004-model-v1',source:'NOAA_GLWU_GRIB2',
 station:{id:'45004',name:'East Superior',lat:47.583,lon:-86.586},
 grid:'2p5km',parameter:'HTSGW',issueAt:issue,
 cell:{lat:47.5802,lon:-86.5851,distanceKm:.32},
 isAgateBeachModelCell:false,canClaimNearshoreSurf:false,canClaimRockExposure:false,canClaimSafeShore:false,
 modelRecords:[0,1,2,3,4,5].map(h=>({issueAt:issue,validAt:iso(h),
 leadHours:h,phase:h===0?'MODEL_INITIAL':'MODEL_FORECAST',modelSignificantWaveHeightM:+(h*.2).toFixed(2)}))
});
const header='#YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE';
const text=(vals=[.3,.4,.7,.8,1])=>[header,
 ...vals.map((v,i)=>'2026 10 15 '+String(12+i).padStart(2,'0')+' 50 160 8.0 9.0 '+v+' 4 3.4 170 1020 8.4 MM 6.3 MM MM MM')
].join('\n');
test('authentic NDBC buoy and its own nearby model cell are required',()=>{
 assert.equal(validateOffshoreModel(model()),true);
 assert.throws(()=>validateOffshoreModel({...model(),station:{id:'GRMM4'}}),/unverified/);
 assert.throws(()=>validateOffshoreModel({...model(),cell:{lat:46.68,lon:-85.985}}),/unverified/);
 assert.throws(()=>validateOffshoreModel({...model(),canClaimNearshoreSurf:true}),/unverified/);
});
test('independent NOAA buoy observations match actual UTC forecast valid times at ±30min',()=>{
 const {report}=compile(model(),text(),null,'2026-10-15T18:00:00.000Z');
 assert.equal(report.matchedPairs,5);
 assert.equal(report.isIndependentOffshoreBuoyComparison,true);
 assert.equal(report.isShorelineWaveCalibration,false);
 assert.equal(report.canPublishVisitorOpportunity,false);
 assert.equal(report.matches[0].buoyObservedAt,'2026-10-15T12:50:00.000Z');
 assert.equal(report.matches[0].forecastValidAt,iso(1));
 assert.equal(report.matches[0].modelMinusObservedM,-.1);
 assert.equal(report.metrics.maeM,.04);
 assert.equal(report.status,'PRELIMINARY_TOO_FEW_PAIRS');
});
test('missing wave values are never treated as a zero-metre observed sea',()=>{
 const missing=text().replace('0.7 4 3.4','MM 4 3.4');
 const {report}=compile(model(),missing,null,'2026-10-15T18:00:00.000Z');
 assert.equal(report.matchedPairs,4);
 assert.ok(!report.matches.some(x=>x.buoyObservedAt==='2026-10-15T14:50:00.000Z'));
});
test('future model predictions never matched to readings that do not yet exist',()=>{
 const {report}=compile(model(),text(),null,'2026-10-15T14:00:00.000Z');
 assert.equal(report.matchedPairs,2);
 assert.equal(report.eligibleForecastRows,2);
 assert.ok(report.matches.every(x=>x.modelGrid==='2p5km'&&x.buoyStation==='45004'));
});
test('a nonmatching time or unavailable buoy record provides no manufactured score',()=>{
 const {report}=compile(model(),header+'\n2026 10 14 10 00 150 3 4 0.8 4 4 180 1020 8 MM 6 MM MM MM',null,'2026-10-15T18:00:00.000Z');
 assert.equal(report.matchedPairs,0);
 assert.equal(report.status,'NO_DATE_MATCHED_BUOY_OBSERVATIONS');
 assert.equal(report.metrics.maeM,null);
 assert.equal(report.isRockFindingCalibration,false);
});
test('duplicate model issues deduplicate, do not overwrite issued forecasts or use later hindsight',()=>{
 const m=model(),old=mergeOffshoreModelIssues(null,m,{nowISO:'2026-10-15T20:00:00Z'});
 const repeated=mergeOffshoreModelIssues(old,m,{nowISO:'2026-10-15T20:00:00Z'});
 assert.equal(repeated.cycles.length,1);
 assert.equal(repeated.counts.forecasts,5);
 const change=structuredClone(m);change.modelRecords[1].modelSignificantWaveHeightM=9;
 assert.throws(()=>mergeOffshoreModelIssues(old,change,{nowISO:'2026-10-15T20:00:00Z'}),/Conflicting/);
});
test('model cycles have original issue timestamps and cannot swap a model initial for a forecast',()=>{
 const m=model();m.modelRecords[1].phase='MODEL_INITIAL';
 assert.throws(()=>validateOffshoreModel(m),/Invalid issue-time/);
});
test('buoy verification rejects relaxed timestamp tolerances and different cell aggregation',()=>{
 const a=mergeOffshoreModelIssues(null,model(),{nowISO:'2026-10-15T20:00:00Z'});
 assert.throws(()=>verifyAgainstBuoy(a,text(),{asOfISO:'2026-10-15T20:00:00Z',toleranceMinutes:90}),/Invalid comparison/);
 const next=structuredClone(model());
 next.issueAt=iso(2);next.cell={lat:47.5900,lon:-86.59,distanceKm:.86};
 next.modelRecords=[{issueAt:iso(2),validAt:iso(6),leadHours:4,phase:'MODEL_FORECAST',modelSignificantWaveHeightM:.5}];
 const combined=mergeOffshoreModelIssues(a,next,{nowISO:'2026-10-15T20:00:00Z'});
 const report=verifyAgainstBuoy(combined,text([.3,.4,.7,.8,1,.9]),{asOfISO:'2026-10-15T20:00:00Z'});
 assert.equal(report.distinctModelCells.length,2);
 assert.equal(report.status,'MULTIPLE_MODEL_CELLS_NO_AGGREGATE_SKILL');
 assert.equal(report.metrics.maeM,null);
});
test('model issue expiry retains forecasts until the issue itself falls outside the window',()=>{
 const original=mergeOffshoreModelIssues(null,model(),{nowISO:'2026-10-15T20:00:00Z'});
 const later=mergeOffshoreModelIssues(original,model(),{nowISO:'2026-11-19T20:00:00Z'});
 assert.equal(later.counts.cycles,0);
});

test('overlapping issue cycles select latest nominal NOAA forecast once per target hour',()=>{
 const old=model(),base=mergeOffshoreModelIssues(null,old,{nowISO:'2026-10-15T20:00:00Z'});
 const later={...model(),issueAt:iso(1),modelRecords:[
  {issueAt:iso(1),validAt:iso(3),leadHours:2,phase:'MODEL_FORECAST',modelSignificantWaveHeightM:1.5}
 ]};
 const merged=mergeOffshoreModelIssues(base,later,{nowISO:'2026-10-15T20:00:00Z'});
 const check=verifyAgainstBuoy(merged,text(),{asOfISO:'2026-10-15T20:00:00Z'});
 assert.equal(check.matchedPairs,5);
 assert.equal(check.forecastSelectionPolicy,'LATEST_NOMINAL_ISSUE_PER_VALID_HOUR');
 assert.equal(check.supersededForecastCandidates,1);
 const target=check.matches.find(x=>x.forecastValidAt===iso(3));
 assert.equal(target.issueAt,iso(1));
 assert.equal(target.modelHeightM,1.5);
 assert.equal(check.nominalIssueDoesNotProvePublicationAvailability,true);
});
