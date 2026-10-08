'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parking,admission}=require('../lib/utah-ski/policy');
const {classify}=require('../lib/utah-ski/udot');
const {diagnostic}=require('../lib/utah-ski/udot-fetch');
const {evaluate,compare}=require('../lib/utah-ski/decision');
const NOW=1791500000;
const feeds=()=>({events:[],roadconditions:[],messagesigns:[]});
const condition=(road='SR-210 Little Cottonwood Canyon',when=NOW)=>({Id:1,RoadwayName:road,LastUpdated:when,Restriction:'none'});
const event=(over={})=>({ID:'x1',RoadwayName:'SR-210 Little Cottonwood Canyon',Location:'Little Cottonwood Canyon',
 StartDate:NOW-60,PlannedEndDate:NOW+3600,LastUpdated:NOW-30,IsFullClosure:true,
 Description:'Little Cottonwood Canyon closed to all traffic',...over});
const DATE_NOW=new Date('2027-01-09T16:00:00Z'); // 09:00 MST
const status=(value,at='2027-01-09T15:55:00Z')=>({status:value,observedAt:at});
const visitor=()=>({date:'2027-01-09',hour:9,passengers:2,pass:'IKON_BASE',
 parkingReservations:{alta:false,brighton:false,solitude:false,snowbird:false},
 roads:{SR190:status('NO_CONFIRMED_BLOCKER'),SR210:status('NO_CONFIRMED_BLOCKER')}});
test('a closure is not inherited by unrelated route',()=>{
 const data=feeds();data.events=[event()];data.roadconditions=[condition()];
 assert.equal(classify(data,'SR210',NOW).status,'CLOSED');
 assert.notEqual(classify(data,'SR190',NOW).status,'CLOSED');
});
test('a planned closure is not active',()=>{
 const data=feeds();data.events=[event({StartDate:NOW+3600})];data.roadconditions=[condition()];
 assert.notEqual(classify(data,'SR210',NOW).status,'CLOSED');
});
test('unlocated SR-210 full closure forces review, not full-canyon assertion',()=>{
 const data=feeds();data.events=[event({RoadwayName:'SR-210',Location:'Unknown',Name:'Local',IsFullClosure:true})];
 assert.equal(classify(data,'SR210',NOW).status,'REVIEW_REQUIRED');
});
test('recurring closures require schedule review, not an active assertion',()=>{
 const data=feeds();data.events=[event({Recurrence:'Weekends'})];
 assert.equal(classify(data,'SR210',NOW).status,'REVIEW_REQUIRED');
});
test('stale hazard never makes the canyon appear open',()=>{
 const data=feeds();data.events=[event({LastUpdated:NOW-99999})];data.roadconditions=[condition()];
 assert.equal(classify(data,'SR210',NOW).status,'REVIEW_REQUIRED');
});
test('no events is NOT authoritative evidence of a road being safe',()=>{
 const data=feeds();data.roadconditions=[condition()];
 const x=classify(data,'SR210',NOW);
 assert.equal(x.status,'NO_CONFIRMED_BLOCKER');
 assert.equal(x.openConfirmed,false);
});
test('missing UDOT key makes zero upstream requests',async()=>{
 let calls=0;
 const result=await diagnostic({key:'',now:NOW,fetchImpl:async()=>{calls++;}});
 assert.equal(calls,0);
 assert.equal(result.canyons.SR210.status,'UNKNOWN');
});
test('mock UDOT fetch uses only the three documented endpoint paths',async()=>{
 const paths=[];
 const fetchImpl=async url=>{
  paths.push(new URL(url).pathname);
  return {ok:true,json:async()=>url.includes('roadconditions')?[condition()]:[]};
 };
 const output=await diagnostic({key:'TEST_SECRET',now:NOW,fetchImpl});
 assert.deepEqual(paths.sort(),['/api/v2/get/event','/api/v2/get/messagesigns','/api/v2/get/roadconditions']);
 assert.equal(output.canyons.SR210.status,'NO_CONFIRMED_BLOCKER');
 assert.ok(!JSON.stringify(output).includes('TEST_SECRET'));
});
test('Brighton weekend reservation and carpool discount remain distinct',()=>{
 const p=parking({resort:'brighton',date:'2027-01-09',hour:9,passengers:4,hasReservation:false});
 assert.equal(p.status,'RESERVATION_REQUIRED');assert.equal(p.publishedStandardPriceUSD,10);
 assert.equal(parking({resort:'brighton',date:'2027-01-09',hour:12,passengers:4}).status,'NO_RESERVATION_REQUIRED');
});
test('Solitude requires booking before 11 regardless of free four-person cost',()=>{
 const p=parking({resort:'solitude',date:'2027-01-09',hour:9,passengers:4,hasReservation:false});
 assert.equal(p.status,'RESERVATION_REQUIRED');assert.equal(p.publishedStandardPriceUSD,0);
 assert.equal(parking({resort:'solitude',date:'2027-01-09',hour:11,passengers:4}).status,'NO_RESERVATION_REQUIRED');
});
test('Alta Base pass is excluded and combined full Ikon limit is enforced',()=>{
 assert.equal(admission({resort:'alta',date:'2027-01-09',pass:'IKON_BASE'}).status,'NOT_ELIGIBLE');
 assert.equal(admission({resort:'snowbird',date:'2027-01-09',pass:'IKON',combinedAltaSnowbirdUsed:7}).status,'DAYS_EXHAUSTED');
});
test('Snowbird Base blackout does not falsely impose blanket Solitude denial',()=>{
 assert.equal(admission({resort:'snowbird',date:'2027-01-16',pass:'IKON_BASE'}).status,'BLACKOUT');
 assert.equal(admission({resort:'solitude',date:'2027-01-16',pass:'IKON_BASE'}).status,'POTENTIALLY_ELIGIBLE');
});
test('bad occupancy and out-of-season trips are explicitly uncertain',()=>{
 assert.equal(parking({resort:'brighton',date:'2027-01-09',hour:9,passengers:0}).status,'UNKNOWN');
 assert.equal(parking({resort:'snowbird',date:'2027-09-09',hour:9,passengers:2}).status,'UNKNOWN');
});
test('more than one barrier is retained instead of overwritten',()=>{
 const i=visitor();i.roads.SR190=status('TRACTION_RESTRICTION');
 const x=evaluate(i,'brighton',DATE_NOW);
 assert.equal(x.verdict,'ACTION_REQUIRED');
 assert.ok(x.actions.some(v=>v.code==='PARKING_RESERVATION_REQUIRED'));
 assert.ok(x.unknowns.some(v=>v.code==='TRACTION_COMPLIANCE_UNVERIFIED'));
});
test('road closed blocks trip regardless of parking reservation',()=>{
 const i=visitor();i.roads.SR210=status('CLOSED');i.parkingReservations.snowbird=true;
 const x=evaluate(i,'snowbird',DATE_NOW);
 assert.equal(x.verdict,'TRIP_NOT_FEASIBLE_AS_PLANNED');
 assert.ok(x.blockers.some(v=>v.code==='CANYON_CLOSED'));
});
test('future ski date cannot use a live road status from today',()=>{
 const i=visitor();i.date='2027-01-10';i.roads.SR210=status('CLOSED');
 const x=evaluate(i,'snowbird',DATE_NOW);
 assert.equal(x.road.status,'UNKNOWN');
 assert.ok(!x.blockers.some(v=>v.code==='CANYON_CLOSED'));
});
test('pass denial is not hidden by lack of live road status',()=>{
 const x=evaluate(visitor(),'alta',DATE_NOW);
 assert.equal(x.verdict,'TRIP_NOT_FEASIBLE_AS_PLANNED');
 assert.ok(x.blockers.some(v=>v.code==='RESORT_ADMISSION_BLOCKED'));
});
test('the app cannot promise safety, inventory or confirmed admission',()=>{
 const results=compare(visitor(),DATE_NOW);
 assert.deepEqual(results.map(x=>x.resort),['alta','snowbird','brighton','solitude']);
 assert.ok(results.every(x=>x.safetyOrInventoryGuaranteed===false));
 assert.ok(results.every(x=>x.unknowns.some(v=>v.code==='PARKING_CAPACITY_UNKNOWN')));
});
