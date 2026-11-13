'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const truth=require('../lib/rocket-launch-truth');
const {createHandler}=require('../api/rocket-launch-truth')._test;
const {createHandler:createKscHandler}=require('../api/space-coast-ksc-watch')._test;
const NOW=Date.parse('2026-11-02T12:00:00Z');
const FL='ef9850ad-1096-425b-9d27-f7bbd186e61a';
const CA='54d471e8-695c-4fa7-a3cf-dbd8b389e8ae';
const pad=(loc)=>({id:93,latitude:loc===11?'34.73':'28.58',longitude:loc===11?'-120.56':'-80.55',
  name:'Launch Complex',location:{id:loc,name:loc===11?'Vandenberg SFB':'Cape Canaveral SFS'}});
function ll2(id,name,net,loc=11,precision='Minute'){
  return {id,name,net,status:{name:'Go for Launch'},
    net_precision:{name:precision},
    last_updated:'2026-11-02T10:20:00Z',
    launch_service_provider:{name:'SpaceX'},
    rocket:{configuration:{full_name:'Falcon 9 Block 5'}},
    pad:pad(loc),mission:{name:name.split('|').at(-1).trim()}};
}
const ca=ll2(CA,'Falcon 9 Block 5 | USSF-432','2026-11-04T01:28:00Z');
const fl=ll2(FL,'Vulcan VC6L | Amazon Leo (LV-01)','2026-11-13T00:00:00Z',12,'Day');
const responses=[
  {results:[ca,fl],count:2},
  {results:[],count:0}
];
const rll={valid_auth:false,result:[
  {id:6257,name:'USSF-432',t0:'2026-11-04T01:28Z',
    modified:'2026-11-01T15:51:09+00:00'},
  {id:6241,name:'Amazon Leo LV-01',t0:'2026-11-13T00:00Z',
    modified:'2026-11-01T16:00:00Z'}
]};
const ll2updates={results:[
  {id:16640,created_on:'2026-11-01T20:07:00Z',
    comment:'Now targeting Nov 04 at 01:28 UTC',
    info_url:'https://www.spacex.com/launches/ussf432'},
  {id:16614,created_on:'2026-10-28T19:26:00Z',
    comment:'Now targeting Nov 03 at 01:42 UTC',
    info_url:'https://www.spacex.com/launches/ussf432'},
]};
const snapi={results:[{
  id:40589,title:'Launch Preview: Falcon 9 and GSLV rockets scheduled to launch',
  news_site:'NASASpaceflight',url:'https://www.nasaspaceflight.com/2026/10/launch-preview-102626/',
  published_at:'2026-10-27T16:00:00Z'
}]};
const fakeResponse=data=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(data)});
const fakeFetch=async url=>{
  if(url.includes('/launches/upcoming/')){
    return fakeResponse(url.includes('location__ids=11%2C12%2C27')?responses[0]:responses[1]);
  }
  if(url.includes('rocketlaunch.live'))return fakeResponse(rll);
  if(url.includes('/updates/'))return fakeResponse(ll2updates);
  if(url.includes('spaceflightnewsapi.net'))return fakeResponse(snapi);
  throw Error('unexpected source '+url);
};
const stateMock=()=>{
  const db=new Map(),calls=[];
  return {db,calls,state:{
    get:async key=>db.get(key)||null,
    set:async(key,v,opt)=>{
      calls.push(['SET',key,opt]);
      if(opt?.nx&&db.has(key))return null;
      db.set(key,v);return 'OK';
    },
    command:async args=>{
      calls.push(args);
      if(args[0]==='RELEASE'&&db.get(args[1])===args[2])db.delete(args[1]);
      return 1;
    }
  }};
};
function res(){return {
  statusCode:200,body:null,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},
  status(n){this.statusCode=n;return this;},json(x){this.body=x;return this;}
};}
test('LL2 update history is dated, source-linked, bounded, and never called operator confirmation',()=>{
  const rows=truth.normalizeProviderUpdates(ll2updates,CA,NOW);
  assert.equal(rows.length,2);
  assert.equal(rows[0].publishedAt,'2026-11-01T20:07:00.000Z');
  assert.match(rows[0].evidence,/contributor comment/);
  assert.equal(rows[0].sourceUrl,'https://www.spacex.com/launches/ussf432');
  const suspicious=truth.normalizeProviderUpdates({results:[
    {id:1,comment:'<script>evil</script> Launch changed',
      created_on:'2026-11-01T11:00:00Z',
      info_url:'https://localhost/admin'}
  ]},CA,NOW);
  assert.equal(suspicious[0].sourceUrl,null);
  assert.doesNotMatch(suspicious[0].summary,/<script>/);
  for(const x of ['javascript:alert(1)','http://www.spacex.com/',
    'https://www.spacex.com.evil.local/admin','https://127.0.0.1/private'])
    assert.equal(truth.safeSourceUrl(x),null);
});
test('SNAPI articles are launch-ID-indexed, timestamped, not invented or rehosted',()=>{
  const news=truth.normalizeNews(snapi,CA,NOW);
  assert.equal(news.length,1);
  assert.equal(news[0].newsSite,'NASASpaceflight');
  assert.equal(news[0].kind,'launch-indexed-report');
  assert.match(news[0].attribution,/indexed.*selected LL2 launch ID/);
  assert.equal(news[0].body,undefined);
  assert.throws(()=>truth.normalizeNews({},CA,NOW),/invalid-snapi-news/);
});
test('RocketLaunch.Live comparison distinguishes agreement, disagreement, absence and day-only',()=>{
  const list=truth.normalizeRll(rll,NOW);
  assert.equal(list.length,2);
  const selected={id:CA,name:ca.name,mission:'USSF-432',
    net:ca.net,netPrecision:'minute'};
  const aligned=truth.comparison(selected,list,NOW);
  assert.equal(aligned.status,'aligned');
  assert.equal(aligned.differenceMinutes,0);
  assert.match(aligned.note,/not confirm flight approval/);
  assert.equal(truth.comparison({...selected,net:'2026-11-04T02:28:00Z'},list,NOW).status,'disagrees');
  assert.equal(truth.comparison({...selected,netPrecision:'day'},list,NOW).status,'precision-not-comparable');
  assert.equal(truth.comparison({...selected,name:'Falcon 9 | Unknown',mission:''},[],NOW).status,'identity-not-distinct');
  assert.equal(truth.comparison({...selected,name:'Falcon 9 | Starlink 15-17',mission:''},list,NOW).status,'not-in-next-five');
  assert.equal(truth.comparison(selected,[...list,list[0]],NOW).status,'ambiguous');
});
test('mission discovery selects nearest distinct U.S. coastal missions and excludes non-US',()=>{
  const result=truth.selectMissions([responses[0],{
    results:[ll2('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'Electron | Other Mission','2026-11-03T09:00:00Z',200)]
  }],NOW);
  assert.equal(result.length,2);
  assert.equal(result[0].id,CA);
  assert.equal(result[1].id,FL);
});
test('first source check establishes baseline; later LL2 target changes persist without faking publication time',()=>{
  const selected=truth.selectMissions([responses[0]],NOW);
  const detail=Object.fromEntries(selected.map(l=>[l.id,{
    updatesStatus:'ok',newsStatus:'ok',
    updates:truth.normalizeProviderUpdates(ll2updates,l.id,NOW),
    news:truth.normalizeNews(snapi,l.id,NOW)
  }]));
  const health={schedule:[{id:'primary',status:'ok'},{id:'specialist',status:'ok'}],
    rll:{status:'ok',checkedAt:new Date(NOW).toISOString()}};
  const first=truth.mergeSnapshot(null,selected,detail,truth.normalizeRll(rll,NOW),health,NOW);
  assert.equal(first.missions.length,2);
  assert.equal(first.history[CA].length,0);
  assert.equal(first.missions.find(x=>x.id===FL).comparison.status,'precision-not-comparable');
  const later=NOW+60*60000;
  const newer=selected.map(x=>x.id===CA?{...x,net:'2026-11-04T02:28:00Z'}:x);
  const second=truth.mergeSnapshot(first,newer,detail,truth.normalizeRll(rll,later),health,later);
  assert.equal(second.history[CA].filter(x=>x.field==='target-time').length,1);
  assert.equal(second.history[CA][0].detectedAt,new Date(later).toISOString());
  assert.equal(second.missions.find(x=>x.id===CA).comparison.status,'disagrees');
  const third=truth.mergeSnapshot(second,newer,detail,truth.normalizeRll(rll,later+3600000),health,later+3600000);
  assert.equal(third.history[CA].filter(x=>x.field==='target-time').length,1);
  const report=truth.publicTruth(third,CA,null,later+3600000);
  assert.equal(report.status,'recent');
  assert.equal(report.headline,'Launch schedules disagree — check the operator');
  assert.equal(report.authoritativeOutcomeVerified,false);
  const stale=truth.publicTruth(third,CA,null,later+4*3600000);
  assert.equal(stale.status,'stale');
  assert.equal(stale.comparison.status,'stale');
  const shifted=truth.publicTruth(third,CA,{net:'2026-11-04T03:28:00Z'},later+3600000);
  assert.equal(shifted.status,'target-changed-after-check');
  assert.equal(shifted.comparison.status,'snapshot-mismatch');
});
test('hourly signed collector shares Postgres, bounds upstream calls and obeys lease/cadence',async()=>{
  const {db,state,calls}=stateMock();
  const fetched=[];
  const run=await truth.runLaunchTruthWatch({
    state,ready:()=>true,now:()=>NOW,
    fetcher:async(url)=>{fetched.push(url);return fakeFetch(url);}
  });
  assert.equal(run.ok,true);
  assert.equal(run.monitored,2);
  assert.equal(run.missionUpdates,2);
  assert.equal(run.newsMatched,2);
  assert.equal(fetched.filter(x=>x.includes('/launches/upcoming/')).length,2);
  assert.equal(fetched.filter(x=>x.includes('/updates/')).length,2);
  assert.equal(fetched.filter(x=>x.includes('spaceflightnewsapi.net')).length,2);
  assert.equal(fetched.filter(x=>x.includes('rocketlaunch.live')).length,1);
  assert.ok(db.get(truth.KEY));
  assert.equal(db.has(truth.LEASE_KEY),false);
  const again=await truth.runLaunchTruthWatch({
    state,ready:()=>true,now:()=>NOW+1000,
    fetcher:()=>{throw Error('unwanted repeat fetch');}
  });
  assert.equal(again.skipped,'hourly-evidence-cadence');
  assert.equal(fetched.length,7);
  assert.ok(calls.some(x=>x[0]==='RELEASE'));
});
test('news or second-provider failures are explicit and do not erase primary LL2 observations',async()=>{
  const {db,state}=stateMock();
  const run=await truth.runLaunchTruthWatch({
    state,ready:()=>true,now:()=>NOW,
    fetcher:async url=>{
      if(url.includes('rocketlaunch.live')||url.includes('spaceflightnewsapi.net'))
        throw new Error('temporary provider outage');
      return fakeFetch(url);
    }
  });
  assert.equal(run.ok,true);
  const current=truth.publicTruth(db.get(truth.KEY),CA,null,NOW);
  assert.equal(current.comparison.status,'source-unavailable');
  assert.equal(current.newsStatus,'unavailable');
  assert.equal(current.updatesStatus,'ok');
  assert.equal(current.authoritativeOutcomeVerified,false);
});
test('failure of all LL2 schedule sources preserves existing state and releases lease',async()=>{
  const {db,state}=stateMock();
  await truth.runLaunchTruthWatch({state,ready:()=>true,now:()=>NOW,fetcher:fakeFetch});
  const before=db.get(truth.KEY);
  await assert.rejects(()=>truth.runLaunchTruthWatch({
    state,ready:()=>true,now:()=>NOW+3600000,
    fetcher:async url=>{
      if(url.includes('/launches/upcoming/'))throw new Error('LL2 unavailable');
      return fakeFetch(url);
    }
  }),/national evidence discovery unavailable/);
  assert.equal(db.get(truth.KEY),before);
  assert.equal(db.has(truth.LEASE_KEY),false);
});
test('public endpoint is GET-only, no background source polling and honest unmonitored state',async()=>{
  const {db}=stateMock();
  const state=truth.mergeSnapshot(null,
    truth.selectMissions([responses[0]],NOW),
    {},truth.normalizeRll(rll,NOW),
    {schedule:[{id:'primary',status:'ok'}],
      rll:{status:'ok',checkedAt:new Date(NOW).toISOString()}},NOW);
  db.set(truth.KEY,state);
  const api=createHandler({getState:async()=>db.get(truth.KEY),now:()=>NOW});
  const req=(method,id)=>({method,query:{launchId:id}});
  const good=res();await api(req('GET',CA),good);
  assert.equal(good.statusCode,200);
  assert.equal(good.body.selectedLaunchId,CA);
  assert.equal(good.body.status,'recent');
  assert.equal(good.body.authoritativeOutcomeVerified,false);
  assert.equal(good.headers['x-robots-tag'],'noindex, nofollow');
  const no=res();await api(req('GET','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),no);
  assert.equal(no.body.status,'not-monitored');
  const invalid=res();await api(req('GET','not-a-uuid'),invalid);
  assert.equal(invalid.statusCode,400);
  const post=res();await api(req('POST',CA),post);
  assert.equal(post.statusCode,405);
});
test('existing signed KSC monitor can collect three streams without making news mandatory for KSC alerts',async()=>{
  let authorized=0,ksc=0,schedule=0,truthChecks=0;
  const api=createKscHandler({
    nationalReady:()=>true,
    runNational:async()=>({ok:true,snapshot:{version:2,checkedAt:new Date(NOW).toISOString(),
      activeCount:2,complete:true,health:[{id:'primary',status:'ok'},{id:'specialist',status:'ok'}],
      missions:[]}}),
    authorized:async()=>{authorized++;return true;},
    run:async()=>{ksc++;return {ok:true,verifiedPages:1};},
    scheduleReady:()=>true,runSchedule:async()=>{schedule++;return {ok:true,missions:2};},
    truthReady:()=>true,runTruth:async()=>{truthChecks++;return {ok:true,monitored:2};}
  });
  const reply=res();await api({method:'POST',headers:{authorization:'Bearer test'}},reply);
  assert.equal(reply.statusCode,200);
  assert.equal(reply.body.truthMonitor.monitored,2);
  assert.equal(authorized,1);
  assert.equal(ksc,1);assert.equal(schedule,1);assert.equal(truthChecks,1);
  const down=createKscHandler({
    nationalReady:()=>true,
    runNational:async()=>({ok:true,snapshot:{version:2,checkedAt:new Date(NOW).toISOString(),
      activeCount:2,complete:true,health:[{id:'primary',status:'ok'},{id:'specialist',status:'ok'}],
      missions:[]}}),
    authorized:async()=>true,run:async()=>({ok:true}),
    scheduleReady:()=>true,runSchedule:async()=>({ok:true}),
    truthReady:()=>true,runTruth:async()=>{throw Error('SNAPI outage');}
  });
  const degraded=res();await down({method:'POST',headers:{}},degraded);
  assert.equal(degraded.statusCode,200);
  assert.equal(degraded.body.ok,true);
  assert.equal(degraded.body.truthMonitor.ok,false);
});
test('both launch experiences have source ledger, valid local assets and safe mission-change sync',()=>{
  const root=path.resolve(__dirname,'..');
  const national=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
  const florida=fs.readFileSync(path.join(root,'public/synced-national-tools/space-coast-launch/index.html'),'utf8');
  const nationalJS=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
  const floridaJS=fs.readFileSync(path.join(root,'public/synced-national-tools/space-coast-launch/app.js'),'utf8');
  const shared=fs.readFileSync(path.join(root,'public/synced-national-tools/assets/launch-truth-desk.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'public/synced-national-tools/assets/launch-truth-desk.css'),'utf8');
  for(const html of [national,florida]){
    assert.match(html,/id="launch-truth-desk"/);
    assert.match(html,/id="lt-changes"/);
    assert.match(html,/id="lt-sources"/);
    assert.match(html,/assets\/launch-truth-desk.js\?v=202611(?:02-truth-v2|10-voice-v1|13-shift-alert-v1)/);
    assert.match(html,/assets\/launch-truth-desk.css\?v=20261102-truth-v2/);
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
  }
  assert.match(national,/assets\/launch-truth-desk.js\?v=20261113-shift-alert-v1/);
  assert.match(florida,/assets\/launch-truth-desk.js\?v=20261110-voice-v1/);
  assert.match(nationalJS,/rocket-truth:mission-selected/);
  assert.match(floridaJS,/rocket-truth:mission-selected/);
  assert.match(shared,/api\/rocket-launch-truth/);
  assert.doesNotMatch(shared,/fetch\s*\(\s*['\"]https?:\/\//);
  assert.match(css,/\.lt-desk/);
  assert.doesNotThrow(()=>new Function(shared));
  const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  assert.ok(vercel.rewrites.some(x=>x.source==='/national-tools/assets/launch-truth-desk.js'));
  assert.ok(vercel.rewrites.some(x=>x.source==='/national-tools/assets/launch-truth-desk.css'));
});
