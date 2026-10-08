'use strict';
// Research replay suite. All UDOT inputs are synthetic fixtures conforming to
// documented schemas; NOT authenticated UDOT observations.
const test=require('node:test');
const assert=require('node:assert/strict');
const {classify}=require('../lib/utah-ski/udot');
const {parking,admission}=require('../lib/utah-ski/policy');
const {evaluate,compare}=require('../lib/utah-ski/decision');
const N=Math.floor(Date.parse('2027-01-09T16:00:00Z')/1000);
const baseEvent={ID:'E1',RoadwayName:'SR-210 Little Cottonwood Canyon',Location:'Little Cottonwood Canyon',IsFullClosure:true,
 Description:'Little Cottonwood Canyon closed to all traffic',StartDate:N-60,PlannedEndDate:N+3600,LastUpdated:N-30};
function feeds(rows=[]){return {events:rows,roadconditions:[],messagesigns:[]};}
const cases=[
 ['entire Little Cottonwood closure','CLOSED',{...baseEvent}],
 ['isolated roadway segment','REVIEW_REQUIRED',{...baseEvent,Description:'All lanes blocked at isolated Snowbird lot entrance'}],
 ['unspecified full closure scope','REVIEW_REQUIRED',{...baseEvent,Description:''}],
 ['future closure','UNKNOWN',{...baseEvent,StartDate:N+1200}],
 ['expired closure','UNKNOWN',{...baseEvent,PlannedEndDate:N-5}],
 ['stale closure notice','REVIEW_REQUIRED',{...baseEvent,LastUpdated:N-4000}],
 ['repeating closure schedule needs manual verification','REVIEW_REQUIRED',{...baseEvent,Recurrence:'Friday evenings'}],
 ['uphill-only restriction','UPHILL_RESTRICTED',{...baseEvent,IsFullClosure:false,Description:'Uphill travel restricted'}],
 ['downhill-only restriction not misread as uphill','UNKNOWN',{...baseEvent,IsFullClosure:false,Description:'Downhill travel restricted'}],
 ['Class 3 traction alert','TRACTION_RESTRICTION',{...baseEvent,IsFullClosure:false,Description:'Class 3 traction requirements in effect'}],
];
for(const [name,expected,input] of cases){
 test('UDOT: '+name,()=>{assert.equal(classify(feeds([input]),'SR210',N).status,expected);});
}
test('UDOT: nearby roadway does not contaminate the wrong canyon',()=>{
 assert.notEqual(classify(feeds([baseEvent]),'SR190',N).status,'CLOSED');
});
test('UDOT: explicit canyon-wide sign closure is not treated as ordinary traffic',()=>{
 const signs=[{Id:'S1',Name:'SR-210 canyon approach',Roadway:'SR-210',
   Messages:['<MSG>LITTLE COTTONWOOD CANYON<BR/>CLOSED</MSG>'],LastUpdated:N-10}];
 assert.equal(classify({events:[],roadconditions:[],messagesigns:signs},'SR210',N).status,'CLOSED');
});
test('UDOT: generic road-closed sign remains spatially ambiguous',()=>{
 const signs=[{Id:'S1',Name:'SR-210 canyon approach',Roadway:'SR-210',
   Messages:['<MSG>SR-210<BR/>ROAD CLOSED MP 9</MSG>'],LastUpdated:N-10}];
 assert.equal(classify({events:[],roadconditions:[],messagesigns:signs},'SR210',N).status,'REVIEW_REQUIRED');
});
test('UDOT: empty feeds never confirm road is open',()=>{
 const result=classify({events:[],roadconditions:[],messagesigns:[]},'SR210',N);
 assert.equal(result.status,'UNKNOWN');assert.equal(result.openConfirmed,false);
});
const park=(resort,date,hour=9,passengers=2,hasReservation=false)=>parking({resort,date,hour,passengers,hasReservation});
const pcases=[
 ['Alta regular Saturday requires booking','alta','2027-01-09',9,2,'RESERVATION_REQUIRED'],
 ['Alta Monday holiday requires booking','alta','2027-01-18',9,2,'RESERVATION_REQUIRED'],
 ['Alta ordinary Wednesday no required booking','alta','2027-01-20',9,2,'NO_RESERVATION_REQUIRED'],
 ['Alta closing day requires booking','alta','2027-04-25',9,2,'RESERVATION_REQUIRED'],
 ['Alta April 11 no standard booking','alta','2027-04-11',9,2,'NO_RESERVATION_REQUIRED'],
 ['Alta early morning special lot booking','alta','2027-01-18',6,2,'RESERVATION_REQUIRED'],
 ['Alta no ordinary lot parking at 5am','alta','2027-01-09',5,2,'LOT_CLOSED'],
 ['Brighton Christmas Day exception','brighton','2026-12-25',9,2,'NO_RESERVATION_REQUIRED'],
 ['Brighton weekday holiday requires booking','brighton','2027-01-18',9,2,'RESERVATION_REQUIRED'],
 ['Brighton noon switch','brighton','2027-01-09',12,2,'NO_RESERVATION_REQUIRED'],
 ['Solitude 11am switch','solitude','2027-01-09',11,2,'NO_RESERVATION_REQUIRED'],
 ['Solitude holiday requires booking','solitude','2027-01-18',9,2,'RESERVATION_REQUIRED'],
 ['Snowbird no reservation required','snowbird','2027-01-09',9,2,'NO_RESERVATION_REQUIRED']
];
for(const [name,resort,date,hour,passengers,want] of pcases){
 test('parking: '+name,()=>assert.equal(park(resort,date,hour,passengers).status,want));
}
test('parking: four occupants still need Brighton reservation at discounted standard price',()=>{
 const r=park('brighton','2027-01-09',9,4);
 assert.equal(r.status,'RESERVATION_REQUIRED');assert.equal(r.publishedStandardPriceUSD,10);
});
test('parking: four occupants still need Solitude reservation despite free carpool rate',()=>{
 const r=park('solitude','2027-01-09',9,4);
 assert.equal(r.status,'RESERVATION_REQUIRED');assert.equal(r.publishedStandardPriceUSD,0);
});
test('parking: no published reservation rule is NOT a claim that a parking space is vacant',()=>{
 assert.equal(park('snowbird','2027-01-09').reason,'FIRST_COME_PARKING_NOT_GUARANTEED');
});
const ad=(resort,date,pass,used={})=>admission({resort,date,pass,...used});
const acases=[
 ['Alta Base excluded','alta','2027-01-09','IKON_BASE',{},'NOT_ELIGIBLE'],
 ['Snowbird Base valid day with unused days','snowbird','2027-01-09','IKON_BASE',{snowbirdUsed:1},'POTENTIALLY_ELIGIBLE'],
 ['Snowbird Base blackout','snowbird','2027-01-16','IKON_BASE',{snowbirdUsed:1},'BLACKOUT'],
 ['Snowbird full pass no blackout','snowbird','2027-01-16','IKON',{combinedAltaSnowbirdUsed:1},'POTENTIALLY_ELIGIBLE'],
 ['Combined Alta Snowbird 7 used','alta','2027-01-09','IKON',{combinedAltaSnowbirdUsed:7},'DAYS_EXHAUSTED'],
 ['Brighton Base blackout','brighton','2027-01-16','IKON_BASE',{brightonUsed:1},'BLACKOUT'],
 ['Brighton Base 5 used','brighton','2027-01-09','IKON_BASE',{brightonUsed:5},'DAYS_EXHAUSTED'],
 ['Brighton full 7 used','brighton','2027-01-09','IKON',{brightonUsed:7},'DAYS_EXHAUSTED'],
 ['Solitude unlimited Base on blackout day','solitude','2027-01-16','IKON_BASE',{},'POTENTIALLY_ELIGIBLE'],
 ['Unspecified remaining days cannot be assumed available','brighton','2027-01-09','IKON_BASE',{},'DAY_COUNT_UNKNOWN']
];
for(const [name,resort,date,pass,used,expected] of acases){
 test('admission: '+name,()=>assert.equal(ad(resort,date,pass,used).status,expected));
}
const localNow=new Date('2027-01-09T16:00:00Z');
const current={status:'NO_CONFIRMED_BLOCKER',observedAt:'2027-01-09T15:55:00Z'};
function visitor(){return {date:'2027-01-09',hour:9,passengers:2,pass:'IKON_BASE',snowbirdUsed:1,brightonUsed:1,
 parkingReservations:{alta:false,snowbird:false,brighton:false,solitude:false},
 roads:{SR190:current,SR210:current}};}
test('visitor: base pass and no weekend bookings retains all limitations',()=>{
 const r=Object.fromEntries(compare(visitor(),localNow).map(x=>[x.resort,x]));
 assert.equal(r.alta.verdict,'TRIP_NOT_FEASIBLE_AS_PLANNED');
 assert.equal(r.snowbird.verdict,'VERIFY_BEFORE_DEPARTURE');
 assert.equal(r.brighton.verdict,'ACTION_REQUIRED');
 assert.equal(r.solitude.verdict,'ACTION_REQUIRED');
});
test('visitor: full Little Cottonwood closure blocks Alta and Snowbird, not Big Cottonwood',()=>{
 const i=visitor();i.roads.SR210={...current,status:'CLOSED'};
 const r=Object.fromEntries(compare(i,localNow).map(x=>[x.resort,x]));
 assert.equal(r.alta.verdict,'TRIP_NOT_FEASIBLE_AS_PLANNED');
 assert.equal(r.snowbird.verdict,'TRIP_NOT_FEASIBLE_AS_PLANNED');
 assert.notEqual(r.brighton.road.status,'CLOSED');
 assert.notEqual(r.solitude.road.status,'CLOSED');
});
test('visitor: traction alert and parking deficit must both survive',()=>{
 const i=visitor();i.roads.SR190={...current,status:'TRACTION_RESTRICTION'};
 const r=evaluate(i,'brighton',localNow);
 assert.ok(r.actions.some(x=>x.code==='PARKING_RESERVATION_REQUIRED'));
 assert.ok(r.unknowns.some(x=>x.code==='TRACTION_COMPLIANCE_UNVERIFIED'));
});
test('visitor: changed future date cannot reuse the day-old road observation',()=>{
 const i=visitor();i.date='2027-01-10';i.roads.SR210={...current,status:'CLOSED'};
 const r=evaluate(i,'snowbird',localNow);
 assert.equal(r.road.status,'UNKNOWN');
 assert.equal(r.road.reason,'SNAPSHOT_NOT_APPLICABLE_TO_TRIP');
});
test('visitor: every resort always discloses unconfirmed inventory and safety',()=>{
 const r=compare(visitor(),localNow);
 assert.ok(r.every(x=>x.safetyOrInventoryGuaranteed===false));
 assert.ok(r.every(x=>x.unknowns.some(a=>a.code==='PARKING_CAPACITY_UNKNOWN')));
});
