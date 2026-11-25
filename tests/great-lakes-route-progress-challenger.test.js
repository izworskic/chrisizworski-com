'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const soo=require('../lib/soo-locks-next');
const {estimate,deltaBounds,compare,summarize}=require('../scripts/great-lakes-route-progress-challenger.cjs');
const {bounds}=require('../scripts/benchmark-great-lakes-passage.cjs');
const {retrospect}=require('../scripts/retrospect-great-lakes-reference.cjs');
const MIN=60000,issue=Date.parse('2024-09-04T12:00:00Z');
const route=soo.ROUTES.upper,a=route[1],b=route[2],length=soo.distNm(a,b);
const existing={direction:'downbound',window:{start:new Date(issue+20*MIN).toISOString(),midpoint:new Date(issue+30*MIN).toISOString(),end:new Date(issue+40*MIN).toISOString()}};
function fixture(rate=4,reported=4){return Array.from({length:7},(_,i)=>{
 const age=12-i*2,f=.1+age*rate/60/length;
 return [issue-age*MIN,{lat:a[0]+(b[0]-a[0])*f,lon:a[1]+(b[1]-a[1])*f,shipType:70,speedKnots:reported}];
});}
test('route-progress estimate uses actual owner geometry and no future features',()=>{
 const track=fixture(),result=estimate('soo',existing,track,issue);
 assert.equal(result.status,'estimated');assert.ok(result.minutes>0&&result.minutes<480);
 assert.deepEqual(estimate('soo',existing,[...track,[issue+MIN,{lat:0,lon:0,speedKnots:99}]],issue),result);
 assert.equal(estimate('duluth',existing,track,issue).status,'site_not_ready');
});
test('insufficient, conflicting, stopped, reversed, off-route and inconsistent motion abstain',()=>{
 const track=fixture();
 assert.equal(estimate('soo',existing,track.slice(-3),issue).status,'insufficient_history');
 assert.equal(estimate('soo',existing,[...track.slice(0,3),[track[3][0],null],...track.slice(4)],issue).status,'invalid_history');
 assert.equal(estimate('soo',existing,[track[0],...track.slice(3)],issue).status,'history_gap');
 assert.equal(estimate('soo',existing,fixture(0,4),issue).status,'stopped_or_low_progress');
 assert.equal(estimate('soo',existing,fixture(-4,4),issue).status,'reverse_progress');
 assert.equal(estimate('soo',existing,fixture(4,12),issue).status,'motion_disagreement');
 const off=track.map(([t,p],i)=>[t,i===2?{...p,lat:p.lat+.1}:p]);
 assert.equal(estimate('soo',existing,off,issue).status,'off_route_history');
});
test('paired absolute error difference uses one common uncertain outcome',()=>{
 assert.deepEqual(deltaBounds(issue+10*MIN,issue+20*MIN,issue+12*MIN,issue+18*MIN),[-6,6]);
 assert.deepEqual(deltaBounds(issue+10*MIN,issue+20*MIN,issue+5*MIN,issue+8*MIN),[-10,-10]);
 const q=compare({status:'estimated',minutes:25},existing,issue,issue+27*MIN,issue+29*MIN,bounds);
 assert.deepEqual(q.challenger,[2,4]);assert.deepEqual(q.model,[1,3]);assert.deepEqual(q.delta,[-1,3]);
 assert.deepEqual(q.signedResidual,[2,4]);assert.equal(q.contained,true);assert.equal(q.width,20);
 const report=summarize([{routeProgress:q,baseline:[3,5]},{routeProgress:{status:'history_gap'}},{}]);
 assert.equal(report.eligibleExistingEstimates,2);assert.equal(report.pairedScored,1);assert.equal(report.counts.history_gap,1);assert.equal(report.challengerMaeLowerMinutes,2);assert.equal(report.baselineMaeUpperMinutes,5);
 assert.equal(summarize([]).pairedDeltaLowerMinutes,null);
});
test('opt-in preserves original report and holdout prohibition',()=>{
 const doc={schemaVersion:1,kind:'synthetic',source:{url:'https://example.invalid/fixture',receiptSha256:'a'.repeat(64),review:'constructed'},start:'2024-09-04T00:00:00Z',end:'2024-09-05T00:00:00Z',observations:[]};
 const old=retrospect(doc),next=retrospect(doc,{routeProgress:true});
 assert.equal(old.routeProgressChallenger,undefined);assert.equal(next.routeProgressChallenger.overall.pairedScored,0);
 assert.deepEqual(next.overall,old.overall);assert.equal(next.productionCalibrationAuthorized,false);
 assert.throws(()=>retrospect({...doc,start:'2024-09-21T00:00:00Z',end:'2024-09-22T00:00:00Z'},{routeProgress:true}));
});
