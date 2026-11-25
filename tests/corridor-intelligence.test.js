'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {makeCorridor}=require('../lib/corridor-intelligence.cjs');
const soo=require('../lib/soo-locks-next'),{engine}=require('../lib/soo-corridor-study.cjs');
const fixture=require('./fixtures/soo-river-2026-09-27.json');
const now=Date.parse(fixture.now),vessels=soo.normalize(fixture.response,now).vessels;
const byName=n=>vessels.find(v=>v.name===n);
test('recorded snapshot separates toward, away, chamber and low speed without a predicted arrival',()=>{
 assert.equal(engine.classify(byName('ROBERT S. PIERSON')).direction,'toward-locks');
 assert.equal(engine.classify(byName('AMERICAN MARINER')).direction,'away-from-locks');
 assert.equal(engine.classify(byName('MESABI MINER')).state,'NEAR_LOCK_CHAMBER_REFERENCE');
 assert.equal(engine.classify(byName('WILFRED SYKES')).direction,null);
 const shared=engine.classify(byName('PAUL R TREGURTHA'));
 assert.equal(shared.direction,'away-from-locks');assert.equal(shared.routeCandidates.length,2);
 assert.ok(shared.distanceRangeNm[1]>shared.distanceRangeNm[0]);
 assert.equal(shared.forecastEnabled,false);
});
const a={mmsi:'366904910',lat:46.497,lon:-84.315,seen:'2025-08-15T12:00:00Z',speedKnots:8,course:270};
function onSegment(i,t,seen,course,speed=8){
 const r=soo.ROUTES.lowerUpbound,p=r[i],q=r[i+1];
 return {...a,lat:p[0]+(q[0]-p[0])*t,lon:p[1]+(q[1]-p[1])*t,seen,course,speedKnots:speed};
}
test('two time-ordered observations support progress only along a common route',()=>{
 const p=onSegment(2,.7,'2025-08-15T12:00:00Z',285),q=onSegment(2,.5,'2025-08-15T12:01:00Z',285);
 const result=engine.pair(p,q);
 assert.equal(result.state,'OBSERVED_PAIR_SUPPORTS_PROGRESS');assert.equal(result.direction,'toward-locks');
 assert.ok(result.progressNmRange[0]>0);assert.equal(result.forecastEnabled,false);
 assert.equal(engine.pair(p,{...q,seen:'2025-08-15T12:04:00Z'}).state,'GAP_OR_TIME_UNRESOLVED');
 assert.equal(engine.pair(p,{...q,mmsi:'366904911'}).state,'IDENTITY_MISMATCH');
 assert.equal(engine.pair(q,p).state,'GAP_OR_TIME_UNRESOLVED');
 assert.equal(engine.pair(p,{...q,course:105}).state,'DIRECTION_UNRESOLVED_OR_CHANGED');
 assert.equal(engine.pair(p,{...q,seen:'2025-08-15T12:00:02Z'}).state,'IMPLIED_PROGRESS_SPEED_DISAGREES');
});
test('missing motion, position beyond model, distant points and invalid coordinates never become progress',()=>{
 assert.equal(engine.classify({...a,lat:null}).state,'INVALID_OBSERVATION');
 assert.equal(engine.classify({...a,lat:46.6,lon:-84.1}).state,'OFF_CORRIDOR_MODEL');
 const p=onSegment(2,.5,'2025-08-15T12:00:00Z',285,0);
 assert.equal(engine.classify(p).state,'POSITION_ONLY_MOTION_UNRESOLVED');
 assert.equal(engine.classify({...p,speedKnots:8,course:null}).direction,null);
 assert.equal(engine.classify({...p,speedKnots:8,course:0}).state,'CROSS_CHANNEL_OR_UNRESOLVED');
 assert.equal(engine.classify({...p,lat:46.80,lon:-84.97}).state,'NEAR_MODEL_BOUNDARY');
});
test('close divergent corridors do not choose a branch by array order',()=>{
 const routes={a:[[46.5,-84.4],[46.5,-84.5]],b:[[46.501,-84.4],[46.501,-84.5]]};
 const e=makeCorridor(routes,{...soo,inChamber:()=>null});
 assert.equal(e.classify({...a,lat:46.5005,lon:-84.45}).state,'AMBIGUOUS_CORRIDOR');
 assert.throws(()=>makeCorridor({bad:[[46,-84],[46,-84]]},soo),/geometry/);
});
