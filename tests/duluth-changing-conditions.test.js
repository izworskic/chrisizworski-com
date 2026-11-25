'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),d=require('../public/assets/duluth-changing-conditions');
const T=Date.parse('2026-11-25T15:00:00Z'),M=60000,iso=n=>new Date(T+n*M).toISOString();
const ship=(n,shift=0,direction='arrival')=>({mmsi:'366123456',name:'TEST FREIGHTER',seen:iso(n-1),direction,window:{start:iso(60+shift),midpoint:iso(90+shift),end:iso(120+shift)}});
const data=(n,ships=[ship(n)])=>({ok:true,checkedAt:iso(n),candidates:ships,watchPick:ships[0]||null});
const advance=(s,n,ships)=>d.step(s,data(n,ships),false,T+n*M);
const show=(s,n)=>d.summary(s,T+n*M);
test('reuse cumulative change engine without lock-specific wording',()=>{
 let s=advance(null,0);assert.equal(show(s,0),null);
 for(const n of [1,2,3])s=advance(s,n,[ship(n,n*5)]);
 assert.match(show(s,3).text,/inbound passage estimate midpoint moved 15 min later/);
 assert.doesNotMatch(show(s,3).text,/lock chamber|arrival midpoint/);
});
test('outbound planning windows are not arrival windows',()=>{
 const s=advance(advance(null,0,[ship(0,0,'departure')]),1,[ship(1,-25,'departure')]);
 assert.match(show(s,1).text,/outbound passage estimate midpoint moved 25 min earlier/);
});
test('direction change never compares different passage directions',()=>{
 let s=advance(null,0);s=advance(s,1,[ship(1,45,'departure')]);
 assert.equal(show(s,1).kind,'new-estimate');assert.match(show(s,1).text,/outbound passage estimate is now listed/);
 s=advance(s,2,[{...ship(2,80,'arrival'),seen:iso(-.5)}]);assert.equal(show(s,2),null);
});
test('candidate disappearance is bounded to the returned list, not a confirmed passage',()=>{
 let s=advance(null,0);s=advance(s,1,[]);
 assert.match(show(s,1).text,/no longer listed among the current candidates/);
 assert.match(show(s,1).text,/does not establish a passage/);
 s=advance(s,2,[ship(2)]);assert.equal(show(s,2).kind,'resumed');
});
test('cache replay, stale and malformed snapshots do not create change notes',()=>{
 const s=advance(null,0);assert.equal(advance(s,0,[ship(0,45)]),s);
 assert.equal(show(advance(s,1,[{...ship(1),seen:iso(-16)}]),1),null);
 assert.equal(d.snapshot(data(0),T+16*M,s),null);
 assert.equal(d.snapshot(data(1,[ship(1),ship(1)]),T+M,s),null);
 assert.equal(show(s,16),null);
});
test('failure suppresses prior change and recovery never compares across outage',()=>{
 let s=advance(null,0);s=advance(s,1,[ship(1,25)]);assert.ok(show(s,1));
 s=d.step(s,null,true,T+2*M);assert.equal(show(s,2),null);
 s=advance(s,3,[ship(3,60)]);assert.equal(show(s,3).kind,'recovered');
});
