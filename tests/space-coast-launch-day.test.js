'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  KEY,LEASE_KEY,LAUNCHES,normalizeSchedule,changes,buildSnapshot,
  publicMission,runLaunchDayWatch,CACHE_FRESH_MS,OBSERVATION_STALE_MS
}=require('../lib/space-coast-launch-day');
const {createHandler}=require('../api/space-coast-launch-day')._test;
const {createHandler:createKscHandler}=require('../api/space-coast-ksc-watch')._test;
const NOW=Date.parse('2026-11-01T20:00:00Z');
const ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const pad={id:94,name:'Space Launch Complex 40',latitude:'28.56194122',
  longitude:'-80.57735736',location:{id:12,name:'Cape Canaveral SFS'}};
const launch=(extra={})=>({
  id:ID,name:'Falcon 9 | Starlink test',net:'2026-11-02T18:00:00Z',
  net_precision:{name:'Minute'},last_updated:'2026-11-01T19:45:00Z',
  status:{name:'Go for Launch'},pad,...extra
});
const input=(...list)=>({results:list});
const res=()=>({headers:{},statusCode:200,body:null,
  setHeader(k,v){this.headers[k.toLowerCase()]=v;},
  status(n){this.statusCode=n;return this;},
  json(x){this.body=x;return this;}});
const req=(method='GET',query={})=>({method,query,headers:{}});
const ISO=x=>new Date(x).toISOString();

test('scheduled LL2 watch normalizes only valid Florida mission geometry and keeps source label',()=>{
  const result=normalizeSchedule(input(
    launch(),
    launch({id:'bad-id'}),
    launch({id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',pad:{
      location:{id:14},latitude:39,longitude:-104}}),
    launch({id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      net:'2026-07-20T18:00:00Z'})
  ),NOW);
  assert.equal(result.length,1);
  assert.equal(result[0].id,ID);
  assert.equal(result[0].netPrecision,'minute');
  assert.equal(result[0].pad,'Space Launch Complex 40');
  assert.equal(result[0].status,'Go for Launch');
  assert.throws(()=>normalizeSchedule({},NOW),/missing results/);
  assert.equal(LAUNCHES.includes('location__ids=12%2C27'),true);
});

test('first observation is a baseline, repeated observations do not duplicate events',()=>{
  const first=buildSnapshot(null,input(launch()),NOW);
  assert.equal(first.missions.length,1);
  assert.equal(first.history[ID].length,0);
  const second=buildSnapshot(first,input(launch()),NOW+900000);
  assert.equal(second.history[ID].length,0);
  assert.equal(second.missions[0].presentInUpcoming,true);
  assert.equal(second.checkedAt,ISO(NOW+900000));
});

test('target, status, window and pad changes record first-seen timestamps, not invented operator timestamps',()=>{
  const first=buildSnapshot(null,input(launch()),NOW);
  const t=NOW+15*60000;
  const updated=launch({
    net:'2026-11-02T19:05:00Z',
    status:{name:'Hold'},
    window_start:'2026-11-02T19:00:00Z',
    pad:{...pad,name:'Launch Complex 39A'}
  });
  const second=buildSnapshot(first,input(updated),t);
  const types=second.history[ID].map(x=>x.type);
  assert.ok(types.includes('target-time'));
  assert.ok(types.includes('provider-status'));
  assert.ok(types.includes('launch-pad'));
  assert.ok(types.includes('window-start'));
  assert.equal(second.history[ID][0].firstDetectedAt,ISO(t));
  assert.ok(second.history[ID].every(e=>
    e.confidence==='ll2-third-party-schedule-observation'));
  assert.ok(second.history[ID].every(e=>e.evidenceSource==='https://ll.thespacedevs.com/'));
  const hold=publicMission(second,ID,t);
  assert.equal(hold.level,'hold');
  assert.equal(hold.status,'Hold');
  assert.equal(hold.exactTarget,false);
  assert.equal(hold.launchOutcomeVerified,false);
  assert.equal(hold.events.length,second.history[ID].length);
  const unchanged=buildSnapshot(second,input(updated),t+15*60000);
  assert.deepEqual(unchanged.history[ID].map(x=>x.id),second.history[ID].map(x=>x.id));
});

test('explicit scrub is different from hold, status Go, and a date-only calendar',()=>{
  const base=buildSnapshot(null,input(launch({status:{name:'Hold'}})),NOW);
  assert.equal(publicMission(base,ID,NOW).level,'hold');
  const scrub=buildSnapshot(base,input(launch({status:{name:'Scrubbed'}})),NOW+900000);
  assert.equal(publicMission(scrub,ID,NOW+900000).level,'scrub');
  assert.equal(publicMission(scrub,ID,NOW+900000).exactTarget,false);
  const go=buildSnapshot(scrub,input(launch()),NOW+1800000);
  assert.equal(publicMission(go,ID,NOW+1800000).level,'planning');
  assert.equal(publicMission(go,ID,NOW+1800000).launchOutcomeVerified,false);
  const coarse=buildSnapshot(go,input(launch({
    net_precision:{name:'Day'},net:'2026-11-02T00:00:00Z'
  })),NOW+2700000);
  assert.equal(publicMission(coarse,ID,NOW+2700000).level,'uncertain');
  assert.equal(publicMission(coarse,ID,NOW+2700000).exactTarget,false);
});

test('disappearance never falsely reports scrub, cancellation, launch or success',()=>{
  const first=buildSnapshot(null,input(launch()),NOW);
  const missing=buildSnapshot(first,input(),NOW+15*60000);
  assert.equal(missing.missions.length,1);
  assert.equal(missing.missions[0].presentInUpcoming,false);
  assert.equal(missing.history[ID][0].type,'left-upcoming-list');
  assert.equal(missing.history[ID][0].confidence,'ll2-list-absence-not-outcome-evidence');
  const observed=publicMission(missing,ID,NOW+15*60000);
  assert.equal(observed.level,'unknown');
  assert.equal(observed.status,null);
  assert.equal(observed.targetAt,null);
  assert.equal(observed.launchOutcomeVerified,false);
  assert.equal(observed.exactTarget,false);
  assert.match(observed.label,/no longer in upcoming/i);
  const again=buildSnapshot(missing,input(),NOW+30*60000);
  assert.equal(again.history[ID].filter(e=>e.type==='left-upcoming-list').length,1);
});

test('missed monitoring checks and passed target are not invented real-time go statuses',()=>{
  const snap=buildSnapshot(null,input(launch()),NOW);
  const stale=publicMission(snap,ID,NOW+OBSERVATION_STALE_MS+1000);
  assert.equal(stale.freshness,'stale');
  assert.equal(stale.exactTarget,false);
  assert.equal(stale.level,'stale');
  const passed=buildSnapshot(null,input(launch({
    net:'2026-11-01T19:50:00Z'
  })),NOW);
  assert.equal(publicMission(passed,ID,NOW).level,'overdue');
  assert.equal(publicMission(passed,ID,NOW).launchOutcomeVerified,false);
  assert.equal(publicMission(snap,'not-a-uuid',NOW),null);
  assert.equal(CACHE_FRESH_MS,25*60000);
});

test('nominal 15-minute watcher uses private locking and one upstream LL2 request',async()=>{
  const db=new Map(),calls=[];
  const state={
    async get(key){return db.get(key)||null;},
    async set(key,value,opts){calls.push(['SET',key,opts]);
      if(opts?.nx&&db.has(key))return null;
      db.set(key,value);return 'OK';},
    async command(args){calls.push(args);
      if(args[0]==='RELEASE'){
        if(db.get(args[1])===args[2])db.delete(args[1]);
        return 1;
      }
      throw Error('unexpected state command');
    }
  };
  let fetches=0;
  const fetcher=async(url)=>{
    fetches++;
    assert.equal(url,LAUNCHES);
    return {ok:true,json:async()=>input(launch())};
  };
  const run=await runLaunchDayWatch({
    state,fetcher,ready:()=>true,now:()=>NOW
  });
  assert.equal(run.ok,true);
  assert.equal(run.missions,1);
  assert.equal(fetches,1);
  assert.equal(db.get(KEY).missions[0].id,ID);
  assert.equal(db.has(LEASE_KEY),false);
  assert.ok(calls.some(x=>x[0]==='RELEASE'));
  // A lock held elsewhere must not cause another network call.
  db.set(LEASE_KEY,'other-worker');
  const duplicate=await runLaunchDayWatch({
    state,fetcher,ready:()=>true,now:()=>NOW+1000
  });
  assert.equal(duplicate.skipped,'another-launch-schedule-check-active');
  assert.equal(fetches,1);
  db.delete(LEASE_KEY);
  const failed=async()=>({ok:false,status:429});
  await assert.rejects(runLaunchDayWatch({
    state,fetcher:failed,ready:()=>true,now:()=>NOW+900000
  }),/HTTP 429/);
  assert.equal(db.get(KEY).checkedAt,ISO(NOW));
  assert.equal(db.has(LEASE_KEY),false);
});

test('public API returns checked mission, caches read-only; unobserved mission never guessed',async()=>{
  const snapshot=buildSnapshot(null,input(launch()),NOW);
  const api=createHandler({now:()=>NOW,getState:async()=>snapshot});
  const result=res();await api(req('GET',{launchId:ID}),result);
  assert.equal(result.statusCode,200);
  assert.equal(result.body.ok,true);
  assert.equal(result.body.mission.selectedLaunchId,ID);
  assert.equal(result.body.mission.level,'planning');
  assert.equal(result.body.mission.launchOutcomeVerified,false);
  assert.equal(result.headers['cache-control'],'public, s-maxage=45, stale-while-revalidate=30');
  assert.equal(result.headers['x-robots-tag'],'noindex, nofollow');
  const absent=res();
  await api(req('GET',{launchId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}),absent);
  assert.equal(absent.statusCode,200);
  assert.equal(absent.body.mission,null);
  assert.equal(absent.body.monitorStatus,'mission-not-yet-observed');
  const invalid=res();
  await api(req('GET',{launchId:'not-valid'}),invalid);
  assert.equal(invalid.statusCode,400);
  const write=res();await api(req('POST',{launchId:ID}),write);
  assert.equal(write.statusCode,405);
});

test('existing signed KSC job can run KSC and LL2 collectors without a new public write endpoint',async()=>{
  let authorized=0,ksc=0,launch=0;
  const run=createKscHandler({
    authorized:async()=>{authorized++;return true;},
    run:async()=>{ksc++;return {ok:true,verifiedPages:2};},
    scheduleReady:()=>true,
    runSchedule:async()=>{launch++;return {ok:true,missions:2};}
  });
  const result=res();
  await run({method:'POST',headers:{authorization:'Bearer test'}},result);
  assert.equal(result.statusCode,200);
  assert.equal(result.body.verifiedPages,2);
  assert.equal(result.body.scheduleMonitor.missions,2);
  assert.equal(authorized,1);
  assert.equal(ksc,1);
  assert.equal(launch,1);
});

test('browser pulse is source-attributed, accessible, and cannot synthesize launch success',()=>{
  const root=path.join(__dirname,'../public/synced-national-tools/space-coast-launch');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'viewing.css'),'utf8');
  assert.match(html,/id="launch-day-pulse"/);
  assert.match(html,/id="launch-pulse-countdown"/);
  assert.match(html,/id="launch-pulse-refresh"/);
  assert.match(html,/id="launch-pulse-changes-list"/);
  assert.match(html,/app\.js\?v=20261101-day1/);
  assert.match(js,/fetch\(LAUNCH_DAY_API\+/);
  assert.match(js,/const PULSE_REFRESH_MS = 2 \* 60 \* 1000/);
  assert.match(js,/LAUNCH_DAY_SCHEDULE_REFRESH_MS = 5 \* 60 \* 1000/);
  assert.match(js,/A countdown is not|Countdown to LL2 target/);
  assert.match(js,/never.*proof|NOT established|Do NOT assume/i);
  assert.match(css,/\.launch-day-pulse/);
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotMatch(js,/setInterval\(.*fetch.*thespacedevs/s);
});
