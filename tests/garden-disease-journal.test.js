'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../lib/garden-disease-evidence.cjs'),D=require('../public/assets/garden-tools/garden-disease.js'),J=require('../public/assets/garden-tools/garden-field-journal.js');
const today='2026-07-10',now=Date.parse(today+'T12:00:00Z'),start=Date.parse('2026-07-11T04:00:00Z');
const periods=Array.from({length:72},(_,i)=>({startTime:new Date(start+i*3600000).toISOString(),endTime:new Date(start+(i+1)*3600000).toISOString(),temperature:65,temperatureUnit:'F',relativeHumidity:{value:i%24<6?95:60},probabilityOfPrecipitation:{value:0}}));
const raw={properties:{updateTime:new Date(now).toISOString(),periods}};
const entry={id:'e',plantingId:'p',date:today,kind:'leaf-check',note:'',sign:'water-soaked',foliage:'wet',leavesChecked:10,leavesAffected:2};
const journal={schema:J.schema,plantings:[{id:'p',crop:'potato',bed:'north',siteId:'bay-city',date:'2026-05-25',packetDays:null,modelId:null,biofix:null}],entries:[entry]};
test('complete local days meet published potato criterion; null humidity, gaps and stale forecast never create evidence',()=>{
 const r=E.evaluate(raw,now);assert.equal(r.status,'AVAILABLE');assert.equal(r.huttonWindows.length,2);
 assert.equal(E.evaluate({properties:{...raw.properties,periods:periods.filter((_,i)=>i!==8)}},now).huttonWindows.length,1);
 assert.equal(E.evaluate({properties:{...raw.properties,updateTime:'2026-07-09T00:00:00Z'}},now).status,'UNAVAILABLE');
 assert.equal(E.evaluate({properties:{...raw.properties,periods:periods.map((x,i)=>i%24===0?{...x,temperature:49}:x)}},now).huttonWindows.length,0);
 assert.equal(E.evaluate({properties:{...raw.properties,periods:periods.map((x,i)=>i%24===0?{...x,relativeHumidity:{value:null}}:x)}},now).status,'UNAVAILABLE');
 const conflict={...periods[0],temperature:40};assert.equal(E.evaluate({properties:{...raw.properties,periods:[...periods,conflict]}},now).days[0].coverage,'partial');
});
test('observations are validated, counts preserved and not a diagnosis',()=>{
 const d=J.validate(journal,today);assert.deepEqual(J.validate(JSON.parse(JSON.stringify(d)),today),d);
 assert.throws(()=>J.validate({...journal,entries:[{...entry,leavesAffected:11}]},today));
 assert.throws(()=>J.validate({...journal,entries:[{...entry,sign:'none'}]},today));
 assert.throws(()=>J.validate({...journal,entries:[{...entry,date:'2026-07-11'}]},today));
});
test('potato-only transferred reference, crop and location matching, offline advice and inactive planting',()=>{
 const base={crop:'potatoes',stage:'growing',active:true,entries:[entry],today,now,siteId:'bay-city',pestResponse:{schema:'michigan-garden-pest-watch-v1',location:{id:'bay-city'},crop:'potatoes',stage:'growing',weather:{diseaseEvidence:E.evaluate(raw,now)}}};
 const r=D.evaluate(base);assert.equal(r.windows.length,2);assert.equal(r.diseases[0].id,'late');assert.equal(r.diseases[0].state,'OBSERVED_SIGN');
 assert.equal(D.evaluate({...base,crop:'tomatoes',pestResponse:{...base.pestResponse,crop:'tomatoes'}}).windows.length,0);
 assert.equal(D.evaluate({...base,active:false}).windows.length,0);assert.ok(D.evaluate({...base,active:false}).diseases.every(d=>d.state==='PLANNING_REFERENCE'));
 assert.equal(D.evaluate({...base,siteId:'detroit'}).days.length,0);
 assert.equal(D.evaluate({...base,pestResponse:null}).diseases[0].state,'OBSERVED_SIGN');
 assert.deepEqual(D.evaluate({...base,crop:'cucumbers',pestResponse:null}).diseases.map(d=>d.id).sort(),['downy','powder']);
});
