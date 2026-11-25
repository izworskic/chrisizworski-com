'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const c=require('../public/assets/soo-changing-conditions'),core=require('../public/assets/soo-lock-watch'),near=require('../public/assets/soo-near-lock-motion');
const T=Date.parse('2026-11-21T14:45:00Z'),M=60000,iso=m=>new Date(T+m*M).toISOString(),id='366123456';
const vessel=(t,delta=0)=>({id,mmsi:id,name:'TEST SHIP',state:'approaching',seen:iso(t-1),window:{start:iso(60+delta),midpoint:iso(90+delta),end:iso(120+delta)}});
const data=(t,ships=[vessel(t)],extra={})=>({ok:true,checkedAt:iso(t),nextShip:{ok:true,candidates:ships,inLock:[],nearLockMotion:[],...extra}});
const snap=(t,ships,extra)=>c.snapshot(data(t,ships,extra),T+t*M,core,near);
const advance=(state,t,ships,extra,threshold)=>c.step(state,snap(t,ships,extra),false,T+t*M,threshold);
const show=(s,t)=>c.summary(s,T+t*M);
test('first check and identical or out-of-order checks cannot create a change',()=>{
 const s=advance(null,0);assert.equal(show(s,0),null);
 assert.equal(advance(s,0,[vessel(0,30)]),s);
 assert.equal(advance(s,-1),s);
 const newer=advance(s,1,[{...vessel(1,30),seen:iso(-1)}]);assert.equal(show(newer,1),null);
});
test('materiality sweep and cumulative revisions from fresh fixes',()=>{
 for(const threshold of [5,10,15,30]){
   let s=advance(null,0);
   s=advance(s,1,[vessel(1,threshold-1)],{},threshold*M);assert.equal(show(s,1),null);
   s=advance(s,2,[vessel(2,threshold)],{},threshold*M);assert.equal(show(s,2).kind,'shifted');assert.match(show(s,2).text,new RegExp(threshold+' min later'));
 }
 let s=advance(null,0);s=advance(s,1,[vessel(1,5)]);s=advance(s,2,[vessel(2,10)]);s=advance(s,3,[vessel(3,15)]);
 assert.match(show(s,3).text,/15 min later/);
 const earlier=advance(advance(null,0),1,[vessel(1,-16)]);assert.match(show(earlier,1).text,/16 min earlier/);
});
test('window width changes are separate from midpoint shifts',()=>{
 let v=vessel(1);v.window.end=iso(145);const s=advance(advance(null,0),1,[v]);assert.equal(show(s,1).kind,'window-changed');
});
test('withdrawal and resumption are forecast states, not vessel departures',()=>{
 let s=advance(null,0);s=advance(s,1,[]);assert.equal(show(s,1).kind,'withdrawn');assert.match(show(s,1).text,/does not establish a departure or passage/);
 s=advance(s,2,[vessel(2)]);assert.equal(show(s,2).kind,'resumed');
 const stale=advance(advance(null,0),16,[]);assert.equal(show(stale,16),null);
});
test('newly observed slow and chamber states have no ETA claims',()=>{
 let s=advance(null,0);const slow={id,mmsi:id,name:'TEST SHIP',lat:46.502,lon:-84.36,seen:iso(0),speedKnots:.4,distanceNm:.5,state:'near-lock-low-motion'};
 s=advance(s,1,[],{nearLockMotion:[slow]});assert.equal(show(s,1).kind,'slow');assert.match(show(s,1).text,/Arrival timing is uncertain/);assert.equal(show(s,6),null);
 const chamber={id,mmsi:id,name:'TEST SHIP',seen:iso(1)};s=advance(s,2,[],{inLock:[chamber]});assert.equal(show(s,2).kind,'chamber');
});
test('failure and recovery never compare retained data as a new vessel change',()=>{
 let s=advance(null,0);s=c.step(s,null,true,T+M);assert.equal(show(s,1),null);
 const replay=c.step(s,snap(0),false,T+M);assert.equal(show(replay,1),null);
 s=advance(s,2,[vessel(2,30)]);assert.equal(show(s,2).kind,'recovered');assert.doesNotMatch(show(s,2).text,/30 min/);
});
test('bad check times, future fixes, expired windows and conflicting state fail closed',()=>{
 for(const t of [-16,1])assert.equal(c.snapshot(data(t),T,core,near),null);
 const future=vessel(0);future.seen=iso(1);assert.equal(Object.keys(snap(0,[future]).ships).length,0);
 const ended=vessel(0,-150);assert.equal(Object.keys(snap(0,[ended]).ships).length,0);
 assert.equal(snap(0,[vessel(0),vessel(0,5)]),null);
 assert.equal(c.snapshot({ok:true,nextShip:{ok:true}},T,core,near),null);
});
test('an unchanged newer check retains one bounded event, preferred vessel wins',()=>{
 let s=advance(null,0);s=advance(s,1,[vessel(1,25)]);assert.ok(show(s,1));
 s=advance(s,2,[vessel(2,25)]);assert.match(show(s,2).text,/25 min later/);
 assert.equal(show(s,17),null);
 const other={...vessel(0),id:'366123457',mmsi:'366123457',name:'OTHER'};
 s=advance(null,0,[vessel(0),other]);s=advance(s,1,[vessel(1,25),{...other,seen:iso(0),window:vessel(1,30).window}]);
 assert.match(c.summary(s,T+M,['366123457']).text,/OTHER/);
});

test('invalid or expired listed report is not described as a withdrawal',()=>{
 const start=advance(null,0),bad=vessel(1);bad.seen='bad';
 const result=advance(start,1,[bad]);assert.equal(show(result,1),null);
 const withdrawn=advance(start,1,[]);assert.equal(show(withdrawn,1).kind,'withdrawn');
 const invalidAgain=advance(withdrawn,2,[bad]);assert.equal(show(invalidAgain,2),null);
});

test('rejected older fixes cannot lower the accepted observation watermark',()=>{
 let s=advance(null,0);
 const accepted=s.accepted[id].seen;
 s=advance(s,1,[{...vessel(1,40),seen:iso(-2)}]);
 assert.equal(s.accepted[id].seen,accepted);assert.equal(s.last.ships[id],undefined);assert.equal(show(s,1),null);
 s=advance(s,2,[{...vessel(2,45),seen:iso(-1.5)}]);
 assert.equal(s.accepted[id].seen,accepted);assert.equal(show(s,2),null);
 // An equal timestamp with a different state cannot replace the accepted fix.
 s=advance(s,3,[],{inLock:[{id,mmsi:id,name:'TEST SHIP',seen:iso(-1)}]});
 assert.equal(s.accepted[id].kind,'timed');assert.equal(show(s,3),null);
 s=advance(s,4,[vessel(4,20)]);
 assert.match(show(s,4).text,/20 min later/);assert.equal(s.accepted[id].seen,Date.parse(iso(3)));
});
test('missing or invalid snapshots do not let an older fix masquerade as resumption',()=>{
 let s=advance(null,0);s=advance(s,1,[]);assert.equal(show(s,1).kind,'withdrawn');
 s=advance(s,2,[{...vessel(2,25),seen:iso(-2)}]);assert.equal(show(s,2),null);
 s=advance(s,3,[{...vessel(3,30),seen:iso(-1.5)}]);assert.equal(show(s,3),null);
 s=advance(s,4,[vessel(4,25)]);assert.equal(show(s,4).kind,'resumed');
});
test('outage recovery retains high-water marks without comparing across the outage',()=>{
 let s=advance(null,0);
 s=c.step(s,null,true,T+M);
 s=advance(s,2,[{...vessel(2,45),seen:iso(-2)}]);assert.equal(show(s,2).kind,'recovered');
 s=advance(s,3,[{...vessel(3,45),seen:iso(-1.5)}]);assert.equal(s.accepted[id].seen,Date.parse(iso(-1)));
 assert.notEqual(show(s,3)?.kind,'shifted');
 s=advance(s,4,[vessel(4,30)]);assert.notEqual(show(s,4)?.kind,'shifted');
 s=advance(s,5,[vessel(5,50)]);assert.match(show(s,5).text,/20 min later/);
});
test('out-of-order reports cannot continue supporting an old change note',()=>{
 let s=advance(null,0);s=advance(s,1,[vessel(1,25)]);assert.equal(show(s,1).kind,'shifted');
 s=advance(s,2,[{...vessel(2,25),seen:iso(-1)}]);assert.equal(show(s,2),null);
});
