'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const core=require('../public/assets/cuyahoga-bridge-to-shore-core.js');
const guide=require('../public/cuyahoga-freighter-watch/bridges.json');
const publicParks=require('../public/cuyahoga-freighter-watch/viewpoints.json');
const page=readFileSync('public/cuyahoga-freighter-watch/index.html','utf8');
const app=readFileSync('public/assets/cuyahoga-bridge-to-shore.js','utf8');
const css=readFileSync('public/assets/cuyahoga-bridge-to-shore.css','utf8');

test('bridge-to-shore selects only officially sourced public park-area references',()=>{
 const center=guide.bridges.find(x=>x.id==='center-st-139');
 assert.ok(center);
 const candidates=core.candidates(center,publicParks.spots);
 assert.equal(candidates.length,4);
 assert.ok(candidates.every(c=>c.park.officialUrl.startsWith('https://www.clevelandmetroparks.com/')));
 assert.ok(candidates.every(c=>c.distanceMiles>=0));
 assert.ok(candidates.every((c,i)=>i===0||c.distanceMiles>=candidates[i-1].distanceMiles));
 assert.equal(core.handoff(center,publicParks.spots).state,'APPROXIMATE_GEOGRAPHIC_CONTEXT_ONLY');
});
test('all 19 main Cuyahoga bridge references have a public park handoff without assigning travel or arrival times',()=>{
 const points=guide.bridges.filter(b=>b.channel==='main');
 assert.equal(points.length,19);
 for(const bridge of points){
  const matched=core.handoff(bridge,publicParks.spots);
  assert.equal(matched.state,'APPROXIMATE_GEOGRAPHIC_CONTEXT_ONLY');
  assert.ok(matched.closest?.distanceMiles>=0);
  assert.match(matched.note,/not a visible ship viewpoint/);
  assert.match(matched.note,/walking route/);
  assert.match(matched.note,/ship arrival or bridge opening/);
 }
});
test('missing source data, nonsensical points and private-reference destinations never produce fake public guidance',()=>{
 const b=guide.bridges.find(x=>x.id==='columbus-193');
 assert.equal(core.handoff(b,null).state,'NO_VERIFIED_PUBLIC_REFERENCE');
 assert.equal(core.handoff(null,publicParks.spots).state,'NO_VERIFIED_PUBLIC_REFERENCE');
 assert.equal(core.miles({lat:999,lon:0},{lat:40,lon:-82}),null);
 const bad=[{id:'dock',lat:41.49,lon:-81.70,visitStatus:'PUBLIC_PARK_ACCESS_VERIFY_CURRENT_CLOSURES',
  officialUrl:'https://private-dock.example.com',coordinateNote:'approximate'}];
 assert.equal(core.handoff(b,bad).state,'NO_VERIFIED_PUBLIC_REFERENCE');
});
test('enhancement extends existing map and bridge selection without changing the owning AIS/NOAA logic',()=>{
 assert.match(page,/\/assets\/cuyahoga-bridge-to-shore-core\.js/);
 assert.match(page,/\/assets\/cuyahoga-bridge-to-shore\.js/);
 assert.match(page,/\/assets\/cuyahoga-bridge-to-shore\.css/);
 assert.match(page,/id="bridge-select"/);
 assert.match(page,/id="river-focus"/);
 assert.match(page,/name="robots" content="noindex,follow"/);
 assert.match(app,/MutationObserver/);
 assert.match(app,/data-park/);
 assert.match(app,/button\.click\(\)/);
 assert.match(app,/\/cuyahoga-freighter-watch\/bridges\.json/);
 assert.match(app,/\/cuyahoga-freighter-watch\/viewpoints\.json/);
 assert.doesNotMatch(app,/\/api\/freighter-ais|ETA\s*=|setInterval|redis/i);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});
