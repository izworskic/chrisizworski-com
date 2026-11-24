'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../public/assets/michigan-snow-totals.js'),'utf8');
const C=require('../public/assets/snow-totals-core.js');
const now=Date.parse('2026-11-24T16:00:00Z');
const row={place:'Herman',county:'Baraga',region:'keweenaw',reportedAt:'2026-11-24T14:00:00Z',inches:6.4,measured:true};
const old={...row,reportedAt:'2026-11-14T14:00:00Z'};
function runSummary({region=null,window='24h',reports=[row],rows=[],lastSnow=null}={}){
 const out={};const state={region,window,data:{reports,lastSnow}};
 const start=src.indexOf('  function renderSummary(rows)'),end=src.indexOf('\n  // Uses only existing',start);
 assert.ok(start>=0&&end>start);
 const context={state,C,$:()=>out,esc:s=>String(s),windowLabel:()=>C.WINDOW_LABEL[window],regionLabel:()=>region?C.regionById(region).label:'Michigan',dataNow:()=>now,where:r=>r.place,stamp:r=>r.reportedAt,kind:r=>r.measured?'measured':'estimated',rows};
 vm.runInNewContext(src.slice(start,end)+'\nrenderSummary(rows);',context);
 return out.innerHTML||out.textContent;
}
test('regional silence cannot turn into a statewide no-snow claim',()=>{
 const s=runSummary({region:'eastern-up',lastSnow:{latest:old}});
 assert.match(s,/Eastern U\.P\./);
 assert.match(s,/Actual snowfall is unknown/);
 assert.doesNotMatch(s,/anywhere in Michigan|Herman|0 in\./);
});
test('explicit zero observation remains a dated reading, not missing',()=>{
 const zero={...row,inches:0};
 const s=runSummary({reports:[zero],rows:[zero]});
 assert.match(s,/0 in\./);assert.match(s,/2026-11-24T14:00:00Z/);assert.doesNotMatch(s,/unknown/);
});
test('empty time window preserves week context without implying zero',()=>{
 const early={...row,reportedAt:'2026-11-22T14:00:00Z'};
 const s=runSummary({reports:[early]});
 assert.match(s,/Actual snowfall is unknown/);assert.match(s,/Choose 7 days/);assert.match(s,/6\.4 in\./);
});
test('historical observation is clearly separate from current condition',()=>{
 const s=runSummary({reports:[],lastSnow:{latest:old}});
 assert.match(s,/Most recent archived report/);assert.match(s,/historical observation, not current conditions/);assert.match(s,/Actual snowfall is unknown/);
});
test('empty chips, unavailable searches and historical map respect selected scope',()=>{
 assert.match(src,/\(c\.largest \? esc\(C\.inches\(c\.largest\.inches\)\) : 'No reports'\)/);
 assert.match(src,/if \(!d \|\| !d\.ok \|\| state\.dataStale\) \{ renderTown\(fit\); return; \}/);
 assert.match(src,/if \(!state\.data \|\| !state\.data\.ok \|\| state\.dataStale\)/);
 assert.match(src,/var historical = quiet && !state\.region/);
 assert.match(src,/Historical map: last archived report day/);
});
