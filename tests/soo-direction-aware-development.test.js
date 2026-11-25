'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {progress,fit,prediction,evaluate,POLICY}=require('../scripts/soo-direction-aware-development.cjs');
const base={date:'2025-06-15',mmsi:'366904910',direction:'upbound',existingMinutes:60,existingLower:40,existingUpper:80};
const make=(i,offset=30,extra={})=>({...base,date:'2025-08-15',mmsi:String(366904920+i),outcome:{state:'OBSERVED_CHAMBER_REFERENCE_BRACKET',midpointMinutes:60+offset},...extra});
test('direction fit excludes same date, vessel, unresolved and opposite direction; shrinks and caps',()=>{
 const rows=[make(1),make(2),make(3),make(4,400,{date:base.date}),make(5,400,{mmsi:base.mmsi}),make(6,400,{direction:'downbound'}),make(7,400,{outcome:{state:'RIGHT_CENSORED_BY_DAY_END'}})];
 const f=fit(rows,base,true);
 assert.deepEqual(f,{shift:90/7,supported:true,n:3});
 assert.equal(fit(rows.slice(0,2),base,true).supported,false);
 assert.equal(fit([make(1,400),make(2,400),make(3,400)],base,true).shift,POLICY.capMinutes);
 assert.deepEqual(prediction(base,{shift:0,supported:false}),{midpoint:60,window:[40,80]});
 assert.deepEqual(prediction(base,{shift:10,supported:true}),{midpoint:70,window:[44,96]});
});
test('project only past fixes and reject gaps, reverse progress and missing history',()=>{
 const t=Date.parse('2025-06-15T12:00:00Z'),c={direction:'upbound'};
 const engine={ROUTES:{lowerUpbound:[1]},project:(_route,point)=>({alongNm:point[0],lateralNm:0})};
 const row=(min,lat)=>({seen:new Date(t+min*60000).toISOString(),lat,lon:0,speedKnots:6});
 const rows=[row(-9,10),row(-6,9.7),row(-3,9.4),row(0,9.1)];
 const a=progress(rows,c,t,engine);assert.equal(a.state,'supported');
 assert.deepEqual(progress([...rows,row(1,20)],c,t,engine),a);
 assert.equal(progress(rows.slice(1),c,t,engine).state,'insufficient_history');
 assert.equal(progress([row(-12,10),...rows.slice(1)],c,t,engine).state,'discontinuous');
 assert.equal(progress([...rows.slice(0,3),row(0,9.8)],c,t,engine).state,'discontinuous');
});
test('no fresh holdout, duplicate or partial dates can enter development evaluator',()=>{
 assert.throws(()=>evaluate([{date:'2025-10-22'}]),/original three/);
 assert.throws(()=>evaluate(Array(3).fill({date:'2025-06-15'})),/original three/);
});
