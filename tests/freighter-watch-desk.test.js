'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const desk = require('../public/assets/freighter-watch-desk.js');
const now = Date.parse('2026-11-08T15:00:00Z');
const iso = ms => new Date(ms).toISOString();
const vessel = (extra={}) => ({mmsi:'366123456',name:'Example Vessel',lat:46.51,lon:-84.4,
  seen:iso(now-5*60000),speedKnots:8,confidence:0.8,window:{
    start:iso(now+20*60000),end:iso(now+80*60000)
  },...extra});
const report = (extra={}) => ({ok:true,checkedAt:iso(now-45000),vessels:[],
  nextShip:{ok:true,pick:null,candidates:[]},...extra});

test('only source-matched corridor candidates can yield a modeled window',()=>{
  const ship=vessel();
  const data=report({vessels:[ship],nextShip:{ok:true,pick:ship,candidates:[ship]}});
  const result=desk.evaluate('soo',data,'now',now);
  assert.equal(result.status,'window');
  assert.equal(result.pick.ship.mmsi,ship.mmsi);
  assert.equal(result.pick.window.start,ship.window.start);
});
test('a pick not in the engine candidate list cannot invent a window',()=>{
  const ship=vessel();
  const data=report({vessels:[ship],nextShip:{ok:true,pick:ship,candidates:[vessel({mmsi:'366555555'})]}});
  const result=desk.evaluate('soo',data,'today',now);
  assert.equal(result.status,'observed');
  assert.equal(result.pick,null);
});
test('Duluth preserves source-supplied window and does not recompute ETA',()=>{
  const ship=vessel({lat:46.76,lon:-92.1});
  const data={ok:true,checkedAt:iso(now-30000),mapVessels:[ship],candidates:[ship],watchPick:ship};
  const result=desk.evaluate('duluth',data,'today',now);
  assert.equal(result.status,'window');
  assert.equal(result.pick.window.end,ship.window.end);
});
test('general corridor does not create an ETA from motion or vendor destination',()=>{
  const ship=vessel({lat:42.98,lon:-82.42,destination:'PORT HURON',speedKnots:12});
  const data=report({vessels:[ship],watchPick:ship,candidates:[ship]});
  const result=desk.evaluate('port',data,'today',now);
  assert.equal(result.status,'observed');
  assert.equal(result.pick,null);
  assert.match(result.reason,/cannot confirm when one will pass/);
});
test('area filtering does not conflate an open-lake report with shore visibility',()=>{
  const near=vessel({lat:43.7,lon:-83.82});
  const far=vessel({mmsi:'366555555',lat:46.1,lon:-87.2});
  const result=desk.evaluate('saginaw',report({vessels:[far,near]}),'now',now);
  assert.equal(result.observations.length,1);
  assert.equal(result.observations[0].mmsi,near.mmsi);
  assert.equal(result.status,'observed');
});
test('stale provider check fails closed even with apparently fresh ships',()=>{
  const ship=vessel();
  const result=desk.evaluate('soo',report({checkedAt:iso(now-10*60000),
    vessels:[ship],nextShip:{ok:true,pick:ship,candidates:[ship]}}),'today',now);
  assert.equal(result.status,'unavailable');
  assert.equal(result.observations.length,0);
});
test('stale, future and invalid identity observations are excluded',()=>{
  const ok=vessel();
  const data=report({vessels:[ok,vessel({mmsi:'bad'}),vessel({mmsi:'366777777',seen:iso(now-31*60000)}),vessel({mmsi:'366888888',seen:iso(now+120000)})]});
  const result=desk.evaluate('soo',data,'today',now);
  assert.equal(result.observations.length,1);
});
test('old, expired, tampered and weak windows cannot become predictions',()=>{
  const examples=[
    vessel({window:{start:iso(now-3*3600000),end:iso(now-2*3600000)}}),
    vessel({window:{start:iso(now+20*60000),end:iso(now+20*3600000)}}),
    vessel({confidence:0.2}),
    vessel({seen:iso(now-31*60000)})
  ];
  for(const ship of examples) {
    const result=desk.evaluate('soo',report({nextShip:{ok:true,pick:ship,candidates:[ship]}}),'today',now);
    assert.notEqual(result.status,'window');
  }
});
test('a fresh in-lock report from the Soo specialist engine is a distinct immediate state',()=>{
  const ship=vessel({speedKnots:0,lat:46.503,lon:-84.352,state:'in-lock',chamber:'poe',chamberName:'Poe Lock'});
  const data=report({vessels:[ship],nextShip:{ok:true,pick:null,candidates:[],inLock:[ship]}});
  const result=desk.evaluate('soo',data,'now',now);
  assert.equal(result.status,'in-lock');
  assert.equal(result.inLock.mmsi,ship.mmsi);
  assert.ok(result.observations.some(v=>v.mmsi===ship.mmsi));
  const stale=desk.evaluate('soo',report({nextShip:{ok:true,inLock:[{...ship,seen:iso(now-12*60000)}],candidates:[]}}),'now',now);
  assert.notEqual(stale.status,'in-lock');
});
test('time selection actually changes recommendations without tomorrow prediction',()=>{
  const ship=vessel({window:{start:iso(now+4*3600000),end:iso(now+5*3600000)}});
  const data=report({nextShip:{ok:true,pick:ship,candidates:[ship]}});
  assert.notEqual(desk.evaluate('soo',data,'now',now).status,'window');
  assert.equal(desk.evaluate('soo',data,'today',now).status,'window');
  const tomorrow=desk.evaluate('soo',data,'tomorrow',now);
  assert.equal(tomorrow.status,'unknown');
  assert.equal(tomorrow.pick,null);
  assert.equal(tomorrow.observations.length,0);
});
test('unavailable source cannot imply there are zero vessels',()=>{
  const r=desk.evaluate('duluth',null,'today',now);
  assert.equal(r.status,'unavailable');
  assert.match(r.reason,/source check failed/);
});
test('canonical, existing editorial guide, no-JS path and creator attribution survive',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,'../public/great-lakes-ship-watching-spots/index.html'),'utf8');
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-ship-watching-spots\/"/);
  assert.match(html,/id="freighter-watch-desk"/);
  assert.match(html,/id="viewing-guide"/);
  assert.match(html,/Visitor sources/);
  assert.match(html,/Frequently asked questions/);
  assert.match(html,/Built by <a href="https:\/\/chrisizworski\.com\/chris-izworski\/"/);
  assert.match(html,/No current|not confirmed|Checking current vessel/);
  assert.doesNotMatch(html,/id="fwd-map"[^>]*style="[^"]*display:none/);
});
