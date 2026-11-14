'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const national=require('../lib/rocket-launch-national');
const api=require('../api/rocket-launch-usa');
const fx=require('./fixtures/ll2-recent-launches-20261114.json');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
// 2026-11-14 1:10 PM EST: Starship Flight 15 lifted off about 19.4 hours earlier.
const NOW=Date.parse('2026-11-14T18:10:00Z');
const SPEC=national.QUERIES[1],PRIM=national.QUERIES[0];
const go=(id,locationId,minutesAgo,status={id:1,name:'Go for Launch'})=>({
  ...fx.falcon9,id,name:'Test flight '+id.slice(0,4),status,
  net:new Date(NOW-minutesAgo*60000).toISOString(),
  pad:{...fx.falcon9.pad,location:{...fx.falcon9.pad.location,id:locationId}}});

test('recent outcomes come from the calls already made: no hidden recent launches, same two queries',()=>{
  for(const q of national.QUERIES)
    assert.equal(new URL(national.queryUrl(q,NOW)).searchParams.get('hide_recent_previous'),'false');
  assert.equal(national.QUERIES.length,2);
  assert.equal(national.RECENT_MS,24*3600000);
});

test('real Starship Flight 15 record becomes a just-launched outcome, not an upcoming mission',()=>{
  const feed=national.normalizeFeed({count:1,results:[fx.starship]},SPEC,NOW);
  assert.equal(feed.items.length,0);
  assert.equal(feed.health.rejected,0);
  assert.equal(feed.health.recent,1);
  const r=feed.recent[0];
  assert.equal(r.outcome,'payload-deployed');
  assert.equal(r.region,'texas');
  assert.equal(r.net,'2026-11-13T22:47:36.000Z');
  assert.match(r.sourceUrl,/^https:\/\/ll\.thespacedevs\.com\/2\.3\.0\/launches\/[0-9a-f-]{36}\/$/);
  assert.equal('image' in r,false);
});

test('only real outcomes count; old launches and a past-due Go are never "just launched"',()=>{
  // Real USSF-627 lifted off 2.5 days earlier.
  const old=national.normalizeFeed({count:1,results:[fx.falcon9]},PRIM,NOW);
  assert.equal(old.recent.length,0);
  const due=national.normalizeFeed({count:1,results:[go('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',12,10)]},PRIM,NOW);
  assert.equal(due.recent.length,0,'Go past T-0 is not an outcome');
  assert.equal(due.items.length,1,'a 10-minute-old Go stays in the after-liftoff grace window');
  const map={3:'success',4:'failure',6:'in-flight',7:'partial-failure',9:'payload-deployed'};
  for(const [id,outcome] of Object.entries(map)){
    const f=national.normalizeFeed({count:1,results:[go('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',12,30,{id:Number(id),name:'x'})]},PRIM,NOW);
    assert.equal(f.recent[0]?.outcome,outcome);
  }
  for(const id of [1,2,5,8]){
    const f=national.normalizeFeed({count:1,results:[go('cccccccc-cccc-4ccc-8ccc-cccccccccccc',12,30,{id,name:'x'})]},PRIM,NOW);
    assert.equal(f.recent.length,0,'status '+id+' is not an outcome');
  }
});

test('a launch that moves from upcoming to just-launched is not logged as missing or kept as stale',()=>{
  const id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const before=national.snapshot(null,{primary:national.normalizeFeed({count:1,results:[go(id,12,-60)]},PRIM,NOW-90*60000)},NOW-90*60000);
  assert.equal(before.missions.length,1);
  const after=national.snapshot(before,{primary:national.normalizeFeed({count:1,results:[go(id,12,20,{id:3,name:'Launch Successful'})]},PRIM,NOW)},NOW);
  assert.equal(after.missions.length,0);
  assert.equal((after.history[id]||[]).some(e=>e.kind==='list-absence'),false);
  assert.equal(after.recentLaunches[0].id,id);
  assert.equal(after.recentLaunches[0].outcome,'success');
});

test('an unreachable group keeps its recent outcomes for 24 hours only',()=>{
  const first=national.snapshot(null,{specialist:national.normalizeFeed({count:1,results:[fx.starship]},SPEC,NOW)},NOW);
  const carried=national.snapshot(first,{},NOW+3600000);
  assert.equal(carried.recentLaunches.length,1);
  const expired=national.snapshot(first,{},NOW+5*3600000);
  assert.equal(expired.recentLaunches.length,0);
});

test('public schedule: outcomes survive a stale calendar, "in flight" does not',()=>{
  const flying=national.normalizeFeed({count:1,results:[go('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',12,8,{id:6,name:'Launch in Flight'})]},PRIM,NOW);
  const snap=national.snapshot(null,{specialist:national.normalizeFeed({count:1,results:[fx.starship]},SPEC,NOW),primary:flying},NOW);
  const fresh=national.publicSchedule(snap,NOW);
  assert.deepEqual(fresh.recentLaunches.map(r=>r.outcome),['in-flight','payload-deployed']);
  const stale=national.publicSchedule(snap,NOW+2*3600000);
  assert.deepEqual(stale.recentLaunches.map(r=>[r.outcome,r.sourceStale]),[['payload-deployed',true]]);
});

test('API adds region name and operator link to each recent outcome',async()=>{
  const snap=national.snapshot(null,{specialist:national.normalizeFeed({count:1,results:[fx.starship]},SPEC,NOW)},NOW);
  const schedule={...national.publicSchedule(snap,NOW),launches:[]};
  const handler=api._test.createHandler({getSchedule:async()=>schedule});
  const original=global.fetch;
  global.fetch=async()=>({ok:false,status:503,headers:{get:()=>null},json:async()=>({}),text:async()=>''});
  let body;
  try{
    await handler({method:'GET',query:{}},{setHeader(){},status(){return this;},json(x){body=x;return this;}});
  }finally{global.fetch=original;}
  assert.equal(body.ok,true);
  const r=body.recentLaunches[0];
  assert.equal(r.outcome,'payload-deployed');
  assert.equal(r.regionName,'Starbase');
  assert.equal(r.operator.short,'SpaceX');
});

test('page shows the card only from reported outcomes and never claims one itself',()=>{
  const html=read('public/synced-national-tools/rocket-launch-live/index.html');
  assert.match(html,/<aside class="rl-just" id="rl-just-launched" aria-labelledby="rl-just-title" hidden>/);
  assert.ok(html.indexOf('id="rl-just-launched"')<html.indexOf('class="rl-schedule-shell"'));
  const app=read('public/synced-national-tools/rocket-launch-live/app.js');
  const fn=app.slice(app.indexOf('const JUST_WORDS'),app.indexOf('function renderFrontSchedule'));
  assert.match(fn,/data\?\.recentLaunches/);
  assert.match(fn,/Status from the public launch calendar \(Launch Library 2\)/);
  assert.match(fn,/<=24\*3600000/);
  assert.doesNotMatch(fn,/fetch\(/);
  assert.doesNotMatch(fn,/\u2014/);
  assert.match(app,/function renderFrontSchedule\(data\) \{\n\s*renderJustLaunched\(data\);/);
});
