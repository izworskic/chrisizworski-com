'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const J=require('../public/assets/garden-tools/garden-field-journal.js'),R=require('../public/assets/garden-tools/garden-history.js');
const archive=require('../public/assets/garden-tools/garden-daymet-2021-2025.json');
const today='2026-11-24';
const planting={id:'one',crop:'Big Beef',bed:'South bed',siteId:'bay-city',date:'2025-05-25',packetDays:84,modelId:'big-beef',biofix:'transplant-3-5-leaves'};
const entry=(id,date,kind,more={})=>({id,plantingId:'one',date,kind,note:'',...more});
const journal=(entries=[],plantings=[planting])=>({schema:J.schema,plantings,entries});
test('record actual dates, keep succession plantings independent and compare matched endpoint',()=>{
 const d=journal([entry('e1','2025-07-20','first-green-harvest'),entry('e2','2025-08-15','first-ripe-harvest'),entry('e3','2025-08-19','harvest')],[planting,{...planting,id:'two',date:'2025-06-15'}]);
 const h=R.replay(R.unpack(archive,'bay-city'),{modelId:'big-beef',biofix:'transplant-3-5-leaves',monthDay:'05-25',packetDays:84});
 const s=J.summarize(d,'one',today,h);assert.equal(s.actualDays,82);assert.equal(s.packetDelta,-2);assert.equal(s.firstHarvest.id,'e2');assert.equal(s.comparison.relation,'within');assert.equal(J.summarize(d,'two',today,h).comparison,null);assert.equal(J.summarize(d,'two',today).firstHarvest,null);
});
test('unknown crop is usable without substituting another model; future, orphan and duplicate records rejected',()=>{
 const p={...planting,crop:'Brandywine',modelId:null,biofix:null};assert.equal(J.summarize(journal([entry('a','2025-08-15','first-harvest')],[p]),'one',today).heat,null);
 assert.throws(()=>J.validate(journal([],[{...p,date:'2027-05-25'}]),today));
 assert.throws(()=>J.validate(journal([entry('a','2025-05-24','note')]),today));
 assert.throws(()=>J.validate(journal([entry('a','2025-06-01','note',{plantingId:'missing'})]),today));
 assert.throws(()=>J.validate(journal([entry('a','2025-06-01','note'),entry('a','2025-06-02','note')]),today));
 assert.throws(()=>J.validate(journal([],[{...planting,biofix:'direct-seed'}]),today));
});
test('only complete reported days and no filling gaps, even for prior seasons',()=>{
 const full={minF:60,maxF:80,fullShieldedDay:true},d=journal([entry('a','2025-05-25','daily-air',full),entry('b','2025-05-27','daily-air',full)]);
 const h=J.summarize(d,'one',today).heat;assert.equal(h.observedDays,1);assert.equal(h.observedGddF,25);assert.equal(h.missingDate,'2025-05-26');
 assert.throws(()=>J.validate(journal([entry('a','2025-05-25','daily-air',{...full,fullShieldedDay:false})]),today));
 assert.throws(()=>J.validate(journal([entry('a','2025-05-25','daily-air',full),entry('b','2025-05-25','daily-air',full)]),today));
 assert.throws(()=>J.validate(journal([entry('a','2025-05-25','daily-air',{...full,minF:90})]),today));
});
test('five comparable nights use existing microclimate engine, stale or wrong regime withheld',()=>{
 const p={...planting,date:'2026-11-01'},entries=Array.from({length:5},(_,i)=>entry('n'+i,'2026-11-'+(10+i),'paired-night',{gardenLowF:30+i,referenceLowF:35+i,referenceId:'station A',regime:'clear-calm',sameNightWindow:true,comparableShieldedAirHeight:true}));
 const d=journal(entries,[p]),input={referenceId:'station A',regime:'clear-calm',referenceLowF:36,referenceDate:today};const s=J.paired(d,'one',today,input);assert.equal(s.scenario.centralF,31);assert.equal(s.scenario.notPredictionInterval,true);assert.equal(J.paired(d,'one',today,{...input,regime:'other'}).scenario,null);assert.equal(J.paired(d,'one',today,{...input,referenceId:'station B'}).scenario,null);assert.throws(()=>J.validate(journal([{...entries[0],sameNightWindow:false}],[p]),today));
});
test('validated backup round-trip, no accidental extra data',()=>{const d=journal([entry('a','2025-06-01','flowering',{note:'First flowers',unknown:'not persisted'})]);const clean=J.validate(JSON.parse(JSON.stringify(d)),today);assert.equal(clean.entries[0].unknown,undefined);assert.deepEqual(J.validate(JSON.parse(JSON.stringify(clean)),today),clean);assert.throws(()=>J.validate({...clean,schema:'unknown'},today));});
