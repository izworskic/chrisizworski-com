'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {mergeArchive,forSite}=require('../lib/rockhounding/glwu-archive.cjs');
const now='2026-10-15T12:00:00.000Z',time=h=>new Date(Date.parse(now)+h*3600000).toISOString();
const row=(h,phase='MODEL_ANALYSIS',cycle)=>({source:'NOAA_GLWU',phase,validAt:time(h),
 modelCycleAt:cycle||(phase==='MODEL_ANALYSIS'?time(h):time(0)),cellId:'glwu:test',
 sampleTargetId:'grand-marais-agate',variables:['HTSGW','WVHGT','WVPER','WVDIR'],
 htsgwM:1,windWaveHeightM:.8,windWavePeriodS:5,windWaveFromDeg:20});
test('past forecasts cannot be relabeled as historical model analyses',()=>{
 const a=mergeArchive({records:[row(-12,'MODEL_FORECAST',time(-18))]},
 {source:'NOAA_GLWU',records:[row(0)]},{nowISO:now});
 assert.equal(a.records.length,1);assert.equal(a.records[0].phase,'MODEL_ANALYSIS');
});
test('deduplicates analysis timestamps and selects latest forecast cycle',()=>{
 const a=mergeArchive({records:[row(-6)]},{source:'NOAA_GLWU',
 records:[row(-6),row(6,'MODEL_FORECAST',time(-6)),row(6,'MODEL_FORECAST',time(0))]},{nowISO:now});
 assert.equal(a.records.length,2);assert.equal(a.records.find(x=>x.phase==='MODEL_FORECAST').modelCycleAt,time(0));
});
test('keeps baseline, history, and upcoming forecast separated',()=>{
 const a=mergeArchive(null,{source:'NOAA_GLWU',records:[row(-96),row(-24),row(0),row(6,'MODEL_FORECAST')]},{nowISO:now});
 const v=forSite(a,{siteId:'grand-marais-agate',cellId:'glwu:test',nowISO:now});
 assert.deepEqual([v.baseline.length,v.history.length,v.forecast.length],[1,2,1]);
});
test('invalid and out-of-retention inputs fail closed',()=>{
 assert.throws(()=>mergeArchive(null,{source:'SYNTHETIC',records:[]},{nowISO:now}));
 const a=mergeArchive(null,{source:'NOAA_GLWU',records:[row(75,'MODEL_FORECAST'),row(-480),{source:'bad'}]},{nowISO:now});
 assert.equal(a.records.length,0);assert.equal(a.diagnostics.invalidRowsDiscarded,1);
});
