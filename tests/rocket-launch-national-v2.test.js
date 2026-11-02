'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const national=require('../lib/rocket-launch-national');
const {publicTruthV2}=require('../lib/rocket-launch-truth');
const {createHandler:createKscHandler}=require('../api/space-coast-ksc-watch')._test;
const NOW=Date.parse('2026-11-02T15:00:00Z');
const ISO=n=>new Date(n).toISOString();
const id=n=>'00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const locations=[11,12,27,143,21,25,1];
function raw(n,loc,net=NOW+(n+1)*3600000){
  return {id:id(n),name:'Falcon 9 Block 5 | USSF-'+(420+n),
    net:ISO(net),net_precision:{name:'Minute'},
    status:{name:'Go for Launch'},last_updated:ISO(NOW-3600000),
    pad:{id:20+n,name:'Launch Complex '+n,latitude:'28.57',
      longitude:'-80.57',location:{id:loc,name:'Launch region '+loc}},
    rocket:{configuration:{full_name:'Falcon 9 Block 5'}},
    launch_service_provider:{name:'SpaceX'},
    mission:{name:'USSF-'+(420+n)}};
}
const primary=[raw(1,11),raw(2,11),raw(3,12),raw(4,27),raw(5,12),raw(6,11),raw(7,12)];
const specialist=[raw(8,143),raw(9,143),raw(10,21),raw(11,25),raw(12,1)];
const feed=results=>({count:results.length,results});
const response=data=>({ok:true,headers:{get:()=>null},
  text:async()=>JSON.stringify(data)});
const db=()=>{
  const entries=new Map();const calls=[];
  return {entries,calls,state:{
    async get(key){return entries.get(key)||null;},
    async set(key,value,opt){calls.push(['SET',key,opt]);
      if(opt?.nx&&entries.has(key))return null;
      entries.set(key,value);return 'OK';},
    async command(args){calls.push(args);
      if(args[0]==='RELEASE'&&entries.get(args[1])===args[2])entries.delete(args[1]);
      return 1;}
  }};
};
test('one scheduled collector observes every returned coastal mission and only two LL2 queries',async()=>{
  const store=db(),urls=[];
  const fetcher=async url=>{
    urls.push(url);
    const u=new URL(url);
    return response(feed(u.searchParams.get('location__ids')==='11,12,27'?primary:specialist));
  };
  const result=await national.runNationalWatch({
    state:store.state,ready:()=>true,now:()=>NOW,fetcher});
  assert.equal(result.ok,true);
  assert.equal(result.missions,12);
  assert.equal(result.complete,true);
  assert.equal(urls.length,2);
  assert.ok(urls.every(x=>x.startsWith('https://ll.thespacedevs.com/2.3.0/launches/upcoming/')));
  assert.ok(urls.every(x=>new URL(x).searchParams.get('limit')==='100'));
  const snapshot=store.entries.get(national.KEY);
  assert.equal(snapshot.version,2);
  assert.equal(snapshot.missions.length,12);
  assert.equal(new Set(snapshot.missions.map(x=>x.id)).size,12);
  assert.ok(snapshot.missions.every(x=>x.presentInUpcoming===true));
  assert.ok(snapshot.missions.every(x=>x.sourceObservedAt===ISO(NOW)));
  assert.equal(snapshot.health.length,2);
  assert.deepEqual(snapshot.history[id(12)],[]);
  const publicData=national.publicSchedule(snapshot,NOW+20*60000);
  assert.equal(publicData.launches.length,12);
  assert.equal(publicData.complete,true);
  assert.equal(publicData.freshness,'recent');
  assert.equal(publicData.source,'shared-postgres-ll2-national-v2');
  const skipped=await national.runNationalWatch({
    state:store.state,ready:()=>true,now:()=>NOW+20*60000,
    fetcher:()=>{throw new Error('must not refetch within cadence');}});
  assert.equal(skipped.skipped,'national-snapshot-cadence');
  assert.equal(urls.length,2);
  assert.equal(store.entries.has(national.LEASE_KEY),false);
});
test('every mission retains detected time revisions, even beyond former nearest-four limit',()=>{
  const g1=national.normalizeFeed(feed(primary),national.QUERIES[0],NOW);
  const g2=national.normalizeFeed(feed(specialist),national.QUERIES[1],NOW);
  const first=national.snapshot(null,{primary:g1,specialist:g2},NOW);
  const later=NOW+31*60000;
  const edited=primary.map((x,i)=>i===5?
    {...x,net:ISO(Date.parse(x.net)+2*3600000)}:x);
  const second=national.snapshot(first,{
    primary:national.normalizeFeed(feed(edited),national.QUERIES[0],later),
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],later)
  },later);
  assert.equal(second.missions.length,12);
  assert.equal(second.history[id(6)].filter(x=>x.field==='target-time').length,1);
  assert.equal(second.history[id(6)][0].detectedAt,ISO(later));
  assert.match(second.history[id(6)][0].note,/not an operator-issued/);
  const third=national.snapshot(second,{
    primary:national.normalizeFeed(feed(edited),national.QUERIES[0],later+31*60000),
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],later+31*60000)
  },later+31*60000);
  assert.equal(third.history[id(6)].length,1,'no duplicate observation on unchanged data');
  const truth=publicTruthV2(null,id(6),null,later+31*60000,third);
  assert.equal(truth.status,'recent');
  assert.equal(truth.monitoredMissionCount,12);
  assert.equal(truth.timeline.length,1);
  assert.equal(truth.comparison.status,'awaiting-reconciliation');
  assert.equal(truth.updatesStatus,'not-prioritized');
  assert.equal(truth.newsStatus,'not-prioritized');
  assert.equal(truth.authoritativeOutcomeVerified,false);
});
test('source loss retains old coast as stale; no invented zero launches or new observation',()=>{
  const original=national.snapshot(null,{
    primary:national.normalizeFeed(feed(primary),national.QUERIES[0],NOW),
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],NOW)
  },NOW);
  const later=NOW+40*60000;
  const degraded=national.snapshot(original,{
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],later)
  },later);
  assert.equal(degraded.complete,false);
  assert.equal(degraded.health.find(x=>x.id==='primary').status,'unavailable');
  const carried=degraded.missions.find(x=>x.id===id(3));
  assert.equal(carried.sourceStale,true);
  assert.equal(carried.sourceObservedAt,ISO(NOW));
  assert.equal(degraded.history[id(3)].length,0);
  const view=national.publicSchedule(degraded,later);
  assert.equal(view.isPartial,true);
  assert.ok(view.launches.some(x=>x.id===id(3)&&x.sourceStale));
  const stale=national.publicSchedule(degraded,later+90*60000);
  assert.equal(stale.freshness,'stale');
  assert.equal(stale.complete,false);
  assert.ok(stale.launches.every(x=>x.sourceStale));
});
test('truncated result cannot create false missing-mission history',()=>{
  const first=national.snapshot(null,{
    primary:national.normalizeFeed(feed(primary),national.QUERIES[0],NOW),
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],NOW)
  },NOW);
  const reduced={count:100,results:primary.slice(0,2)};
  const g=national.normalizeFeed(reduced,national.QUERIES[0],NOW+1800000);
  const next=national.snapshot(first,{
    primary:g,
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],NOW+1800000)
  },NOW+1800000);
  assert.equal(next.health.find(h=>h.id==='primary').status,'truncated');
  assert.equal(next.complete,false);
  const omitted=next.missions.find(x=>x.id===id(3));
  assert.equal(omitted.presentInUpcoming,false);
  assert.equal(omitted.absenceReason,'truncated-provider-page');
  assert.equal(next.history[id(3)].some(x=>x.kind==='list-absence'),false);
});
test('untruncated provider disappearance is unknown, never scrub or launch success',()=>{
  const first=national.snapshot(null,{
    primary:national.normalizeFeed(feed(primary),national.QUERIES[0],NOW),
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],NOW)
  },NOW);
  const second=national.snapshot(first,{
    primary:national.normalizeFeed(feed(primary.slice(0,2)),national.QUERIES[0],NOW+1800000),
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],NOW+1800000)
  },NOW+1800000);
  assert.equal(second.missions.find(x=>x.id===id(3)).presentInUpcoming,false);
  assert.equal(second.history[id(3)][0].kind,'list-absence');
  assert.match(second.history[id(3)][0].note,/not evidence of scrub/);
  const outcome=publicTruthV2(null,id(3),null,NOW+1800000,second);
  assert.equal(outcome.status,'historical-only');
  assert.equal(outcome.authoritativeOutcomeVerified,false);
});
test('failed national update never overwrites good snapshot, always releases its lease',async()=>{
  const store=db();
  const fetcher=async url=>response(feed(new URL(url).searchParams.get('location__ids')==='11,12,27'?primary:specialist));
  await national.runNationalWatch({state:store.state,ready:()=>true,now:()=>NOW,fetcher});
  const earlier=store.entries.get(national.KEY);
  await assert.rejects(national.runNationalWatch({
    state:store.state,ready:()=>true,now:()=>NOW+31*60000,
    fetcher:async()=>{throw Error('LL2 hard outage');}
  }),/all-national-ll2-groups-unavailable/);
  assert.equal(store.entries.get(national.KEY),earlier);
  assert.equal(store.entries.has(national.LEASE_KEY),false);
});
test('signed KSC job hands the same national snapshot to Florida and truth without repeat source reads',async()=>{
  const snap=national.snapshot(null,{
    primary:national.normalizeFeed(feed(primary),national.QUERIES[0],NOW),
    specialist:national.normalizeFeed(feed(specialist),national.QUERIES[1],NOW)
  },NOW);
  const events=[];
  const handler=createKscHandler({
    authorized:async()=>true,
    run:async()=>{events.push('ksc');return {ok:true,verifiedPages:1};},
    runNational:async()=>{events.push('national');return {ok:true,checkedAt:snap.checkedAt,snapshot:snap};},
    nationalReady:()=>true,
    runSchedule:async({nationalSnapshot})=>{
      assert.equal(nationalSnapshot,snap);events.push('florida');
      return{ok:true,missions:7};},
    scheduleReady:()=>true,
    runTruth:async({nationalSnapshot})=>{
      assert.equal(nationalSnapshot,snap);events.push('truth');
      return{ok:true,monitored:4};},
    truthReady:()=>true
  });
  const res={headers:{},statusCode:200,
    setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},
    json(data){this.body=data;return this;}};
  await handler({method:'POST',headers:{authorization:'Bearer test'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.nationalMonitor.coveredCount,12);
  assert.equal(res.body.scheduleMonitor.missions,7);
  assert.equal(res.body.truthMonitor.monitored,4);
  assert.ok(events.indexOf('national')<events.indexOf('truth'));
  assert.ok(events.indexOf('national')<events.indexOf('florida'));
  assert.equal(Object.hasOwn(res.body.nationalMonitor,'snapshot'),false);
});
test('public launch entrypoints and evidence frontend use cached data only',()=>{
  const root=path.resolve(__dirname,'..');
  const na=fs.readFileSync(path.join(root,'api/rocket-launch-usa.js'),'utf8');
  const fl=fs.readFileSync(path.join(root,'api/space-coast-launch.js'),'utf8');
  const tr=fs.readFileSync(path.join(root,'api/rocket-launch-truth.js'),'utf8');
  const nationalPage=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
  const floridaPage=fs.readFileSync(path.join(root,'public/synced-national-tools/space-coast-launch/index.html'),'utf8');
  assert.match(na,/getSchedule=readNationalSchedule/);
  assert.match(fl,/getSchedule=readNationalSchedule/);
  assert.doesNotMatch(fl,/fallback-direct-ll2/);
  assert.match(tr,/publicTruthV2/);
  assert.match(nationalPage,/id="launch-truth-desk"/);
  assert.match(floridaPage,/id="launch-truth-desk"/);
});
