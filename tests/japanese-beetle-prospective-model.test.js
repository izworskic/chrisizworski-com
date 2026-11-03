'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../scripts/archive-japanese-beetle-prospective-model.cjs');
const now=new Date('2027-06-25T15:00:00Z');
const sourceDate='2027-06-25';
function provider(loc,crop,_fetch,date){assert.equal(crop,'roses');assert.equal(date.toISOString(),now.toISOString());
 return Promise.resolve({schema:'japanese-beetle-forecast-truth-v1',status:'OFFICIAL_MODEL_AVAILABLE',
  sourceKind:'OFFICIAL_SPECIES_SPECIFIC_GRIDDED_MODEL',year:2027,sourceDate,
  stages:{adult:{approximateDate:'2027-06-29',dayOfYear:180}},source:{
   layerIds:{adult:'gdd:japanese_beetle_adult'},timeDimensionAgeDays:0,
   adultFeatureUrl:'https://geoserver.usanpn.org/point',coverageUrl:'https://geoserver.usanpn.org/coverage'}});}
test('no current-season 2026 data can be labeled 2027 prospective',async()=>{
 const result=await A.audit({now:new Date('2026-11-02T18:00:00Z'),provider:async()=>{throw Error('SHOULD_NOT_CALL')}});
 assert.equal(result.status,'OUTSIDE_DESIGNATED_MONITORING_SEASON');assert.equal(result.eligibleNearTerm,0);
 assert.throws(()=>A.markdown(result),/NO_ELIGIBLE/);
});
test('all 10 fixed reference areas preserve model date and source age before event',async()=>{
 const result=await A.audit({now,provider,sleep:async()=>{}});
 assert.equal(result.status,'COMPLETE_NEAR_TERM_SNAPSHOTS');assert.equal(result.records.length,10);
 assert.equal(result.unavailable.length,0);assert.ok(result.records.every(x=>x.adultModelDate==='2027-06-29'&&x.sourceRasterDate==='2027-06-25'));
 assert.ok(result.records.every(x=>x.observedBeetles==='NOT_CHECKED'));
 assert.ok(A.markdown(result).includes('2027-06-25'));assert.match(A.markdown(result),/not an adult detection/i);
 assert.ok(!JSON.stringify(result).includes('observer'));
});
test('past-day and outside six-day modeled threshold never become prospective snapshot',async()=>{
 for(const event of ['2027-06-24','2027-07-04']){
  const result=await A.audit({now,provider:async(loc,crop,f,date)=>{
   const data=await provider(loc,crop,f,date);data.stages.adult.approximateDate=event;return data},sleep:async()=>{}});
  assert.equal(result.status,'COMPLETE_NO_NEAR_TERM_SNAPSHOTS');
  assert.equal(result.records.length,0);
  assert.throws(()=>A.markdown(result));
 }
});
test('source/provider failure at any site vetoes archiving entire cohort',async()=>{
 const result=await A.audit({now,provider:async(loc,crop,f,date)=>{
  if(loc.id==='bay-city')throw Error('503');
  return provider(loc,crop,f,date)},sleep:async()=>{}});
 assert.equal(result.status,'SOURCE_PARTIAL_NO_ARCHIVE');assert.equal(result.unavailable.length,1);
 assert.throws(()=>A.markdown(result),/NO_ELIGIBLE/);
});
test('stale or provenance-inconsistent official raster data never promoted',async()=>{
 const result=await A.audit({now,provider:async(loc,crop,f,date)=>{
  const value=await provider(loc,crop,f,date);value.source.timeDimensionAgeDays=5;return value},sleep:async()=>{}});
 assert.equal(result.status,'COMPLETE_NO_NEAR_TERM_SNAPSHOTS');
});
