'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../public/assets/garden-tools/garden-journal-water.js'),J=require('../public/assets/garden-tools/garden-field-journal.js');
const today='2026-06-20',now=Date.parse(today+'T15:00:00Z');
const planting={id:'p',crop:'Big Beef',bed:'South',siteId:'bay-city',date:'2026-05-25',packetDays:84,modelId:'big-beef',biofix:'transplant-3-5-leaves'};
const entry=(id,kind,date,extra)=>({id,kind,date,plantingId:'p',note:'',...extra});
const entries=[entry('a','soil-feel',today,{feel:'dry'}),entry('b','rain-gauge','2026-06-19',{inches:0}),entry('c','irrigation','2026-06-18',{inches:.25})];
test('water observations preserve zero rain, dates and backup; reject missing, partial or duplicate totals',()=>{
 const d={schema:J.schema,plantings:[planting],entries};const valid=J.validate(d,today);
 assert.deepEqual(J.validate(JSON.parse(JSON.stringify(valid)),today),valid);
 const l=W.ledger(valid.entries,today);assert.equal(l.rainDays,1);assert.equal(l.rainIn,0);assert.equal(l.irrigationIn,.25);assert.equal(l.soilFeel,'dry');
 assert.throws(()=>J.validate({...d,entries:[...entries,entry('x','rain-gauge',today,{inches:0})]},today));
 assert.throws(()=>J.validate({...d,entries:[...entries,entry('x','irrigation',today,{inches:null})]},today));
 assert.throws(()=>J.validate({...d,entries:[...entries,entry('x','rain-gauge','2026-06-19',{inches:1})]},today));
});
const crop={id:'tomato',rootDepthIn:{mature:18},kc:{mature:1.15},allowableDepletion:{mature:.5}};
const setup={cropId:'tomato',stage:'mature',bed:'raised',soil:'loam',mulch:false,areaSqFt:32};
const context={generatedAt:new Date(now).toISOString(),location:{lat:43.5945,lon:-83.8889,timeZone:'America/Detroit'},referenceEt:{daily:[.2],source:'NWS NDFD FRET',confidence:'high'},forecastRain:{in24:0,in48:0,firstWetHours:48,source:'NWS quantitative precipitation forecast'},recentRain:{coverage:.9,inches:0,todayIn:0,latestWetHoursAgo:72},observedHistory:{days:[{date:'2026-06-19',rainIn:.4,referenceEtIn:.2}]},soil:{awcPerInch:.16,texture:'loam'}};
let passed;
const engine={selectRecentObservedRain:()=>({inches:0,confidence:'medium',ageHours:72}),computeDecision:x=>{passed=x;return {state:'WATER TODAY',applyIn:.6,gallons:11.96};}};
const base={engine,context,crops:[crop],setup,entries,today,now,latitude:43.5945,longitude:-83.8889,activeGrowing:true};
test('adapter delegates to owner engine, replaces matching rainfall rather than adding it, supplies one irrigation and area',()=>{
 const r=W.evaluate(base);assert.equal(r.state,'WATER TODAY');assert.equal(r.gaugeDaysUsed,1);assert.equal(passed.observedHistoryDays[0].rainIn,0);assert.equal(passed.irrigationIn,.25);assert.equal(passed.areaSqFt,32);assert.equal(passed.soilFeel,'dry');
 const multiple=W.evaluate({...base,entries:[...entries,entry('d','irrigation','2026-06-17',{inches:.5})]});assert.equal(multiple.irrigationUsed,false);assert.equal(multiple.ledger.irrigationIn,.75);assert.equal(passed.soilFeel,'dry');
});
test('stale, wrong town, incomplete ET, inactive planting, missing soil feel and invalid dimensions cannot generate an amount',()=>{
 for(const changes of [{entries:entries.slice(1)},{activeGrowing:false},{longitude:0},{context:{...context,generatedAt:'2026-06-18T00:00:00Z'}},{context:{...context,referenceEt:{daily:[]}}}])assert.equal(W.evaluate({...base,...changes}).decision,null);
 assert.throws(()=>W.validateSetup({...setup,areaSqFt:-1}));
});
