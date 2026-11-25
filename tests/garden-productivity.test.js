'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const J=require('../public/assets/garden-tools/garden-field-journal.js'),P=require('../public/assets/garden-tools/garden-productivity.js');
const today='2026-11-24';
const q={group:'tomatoes',lengthFt:8,widthFt:4,plantedCount:8,closedOn:'2026-10-01',complete:true};
const plant=(id,extra={})=>({id,crop:'Big Beef',bed:'South bed',siteId:'bay-city',date:'2026-05-25',packetDays:84,modelId:'big-beef',biofix:'transplant-3-5-leaves',productivity:q,...extra});
const e=(id,p,date,kind,fields={})=>({id,plantingId:p,date,kind,note:'',...fields});
const journal=(plantings,entries)=>J.validate({schema:J.schema,plantings,entries},today);
const entries=[e('h1','a','2026-08-15','harvest-weight',{usableG:10000,discardedG:1000}),e('h2','a','2026-09-15','harvest-weight',{usableG:8000,discardedG:1000}),e('l','a','2026-07-01','plant-loss',{lostCount:1}),e('first','a','2026-08-15','first-ripe-harvest')];
test('cohort measures harvest and discard separately; loss rate is not yield loss; first harvest date and area are exact',()=>{
 const d=journal([plant('a')],entries),s=P.summarize(d.plantings[0],d.entries);
 assert.equal(s.usableG,18000);assert.equal(s.discardedG,2000);assert.equal(s.areaSqFt,32);assert.equal(s.lbPerSqFt,P.pounds(18000)/32);assert.equal(s.lossCount,1);assert.equal(s.lossFraction,1/8);assert.equal(s.discardFraction,.1);assert.equal(s.firstHarvestDays,82);assert.equal(s.occupiedDays,130);assert.equal(s.context.rainDays,0);assert.equal(s.eligible,true);
 assert.deepEqual(J.validate(JSON.parse(JSON.stringify(d)),today),d);
});
test('missing weights remain unknown, explicit finished zero allowed, legacy milestone cannot be marked complete without weight',()=>{
 const open=plant('a',{productivity:{...q,closedOn:null,complete:false}});
 assert.equal(P.summarize(open,[]).usableG,null);assert.equal(P.summarize(open,[]).eligible,false);
 assert.equal(P.summarize(plant('a'),[]).usableG,0);
 assert.throws(()=>journal([plant('a')],[entries[3]]));assert.throws(()=>journal([plant('a')],[e('later','a','2026-10-02','harvest-weight',{usableG:100,discardedG:0})]));
 assert.throws(()=>journal([plant('a')],[entries[0],{...entries[0],id:'dup'}]));
 assert.throws(()=>journal([plant('a')],[e('loss','a','2026-07-01','plant-loss',{lostCount:9})]));
 assert.throws(()=>journal([plant('a',{productivity:{...q,widthFt:null}})],[]));
 assert.throws(()=>journal([plant('a')],[e('bad','a','2026-08-15','harvest-weight',{usableG:-1,discardedG:0})]));
});
test('comparisons require complete compatible cohorts and do not add shared bed area; harvest-year sums handle year rollover',()=>{
 const b=plant('b',{crop:'Brandywine',date:'2025-05-25',productivity:{...q,closedOn:'2025-10-01'}});
 const c=plant('c',{siteId:'detroit'}),d=plant('d',{productivity:{...q,group:'peppers'}}),f=plant('f',{productivity:{...q,closedOn:null,complete:false}});
 const winter=plant('w',{date:'2025-12-15',productivity:{...q,group:'other',closedOn:'2026-03-01'}});
 const all=journal([plant('a'),b,c,d,f,winter],[...entries,e('b1','b','2025-08-15','harvest-weight',{usableG:12000,discardedG:0}),e('w1','w','2026-02-10','harvest-weight',{usableG:300,discardedG:20})]);
 assert.deepEqual(P.compare(all,'a').rows.map(x=>x.id),['b']);
 const s=P.season(all,2026);assert.equal(s.usableG,18300);assert.equal(s.discardedG,2020);assert.equal(s.plantingsWithWeights,2);assert.deepEqual(s.months.map(m=>[m.month,m.usableG]),[['2026-02',300],['2026-08',10000],['2026-09',8000]]);assert.equal(P.season(all,2025).usableG,12000);assert.equal(P.season(all,2024).usableG,null);
 assert.equal(Object.hasOwn(s,'areaSqFt'),false);
});
test('unit conversions, finite nonnegative validation and deterministic arithmetic invariants',()=>{
 assert.equal(P.toGrams(1,'lb'),454);assert.equal(P.toGrams(16,'oz'),454);assert.equal(P.toGrams(1,'kg'),1000);assert.equal(P.toGrams(0,'g'),0);
 for(const bad of [null,NaN,Infinity,-1,'1'])assert.throws(()=>P.toGrams(bad,'lb'));
 assert.throws(()=>P.toGrams(1,'unknown'));
 let seed=1729;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<500;i++){const a=Math.floor(rand()*100000),b=Math.floor(rand()*100000),len=1+rand()*20,w=1+rand()*20;const p=plant('a',{productivity:{...q,lengthFt:len,widthFt:w}});const r=P.summarize(p,[e('r','a','2026-08-15','harvest-weight',{usableG:a,discardedG:b})]);assert.equal(r.usableG,a);assert.equal(r.discardedG,b);assert.ok(Math.abs(r.lbPerSqFt*len*w-P.pounds(a))<1e-9);assert.ok(r.discardFraction===null||r.discardFraction>=0&&r.discardFraction<=1);}
});
