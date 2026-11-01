'use strict';

// LL2 is a third-party schedule, not launch-control authority. A single
// existing signed 15-minute watch performs bounded polls; visitors read the
// shared Postgres observations instead of multiplying unauthenticated calls.
const { randomUUID } = require('node:crypto');
const { ToolState, stateReady } = require('./tool-state');
const { isSpaceCoast, isFutureLaunch, normalizeLaunch } = require('./space-coast-decision');
const { storeTrustedLaunches } = require('./space-coast-ksc-snapshot');
const KEY = 'space-coast:launch-day:v1';
const LEASE_KEY = 'space-coast:launch-day:lease:v1';
const LAUNCHES = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?location__ids=12%2C27&limit=20&format=json&ordering=net&hide_recent_previous=true';
const SOURCE_URL='https://ll.thespacedevs.com/';
const TTL_SECONDS=14*86400;
const CACHE_FRESH_MS=25*60000;
const OBSERVATION_STALE_MS=40*60000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_FIELDS=[
  ['net','target-time'],['netPrecision','time-precision'],
  ['status','provider-status'],['windowStart','window-start'],
  ['windowEnd','window-end'],['pad','launch-pad']
];
const capText=(v,size=180)=>typeof v==='string'?v.slice(0,size):null;
const iso=n=>new Date(n).toISOString();
const ts=x=>Number.isFinite(Date.parse(x||''))?Date.parse(x):0;

function normalizeSchedule(raw,now=Date.now()){
  if(!Array.isArray(raw?.results))throw new Error('LL2 upstream schedule missing results');
  return raw.results.filter(isSpaceCoast).filter(x=>{
    const net=ts(x?.net);
    return UUID.test(x?.id||'')&&net&&net>=now-24*3600000&&net<now+180*86400000;
  }).slice(0,15).map(normalizeLaunch).map(l=>({
    id:l.id,name:capText(l.name,180),net:l.net,
    netPrecision:l.netPrecision,windowStart:l.windowStart,windowEnd:l.windowEnd,
    status:capText(l.status,90),lastUpdated:l.lastUpdated,
    pad:capText(l.pad,140),padId:l.padId,
    lat:l.lat,lon:l.lon,location:capText(l.location,150),
    provider:capText(l.provider,130),rocket:capText(l.rocket,140),
    mission:capText(l.mission,160),launchPage:l.launchPage,
    scheduleConfidence:l.scheduleConfidence,
    probability:l.probability,tbdTime:l.tbdTime,tbdDate:l.tbdDate
  }));
}
function changes(before,after,at){
  const out=[];
  for(const [field,kind]of EVENT_FIELDS){
    const old=before?.[field]??null,next=after?.[field]??null;
    if(old===next)continue;
    out.push({
      id:after.id+':'+kind+':'+at,
      type:kind,firstDetectedAt:at,
      before:capText(old,140),after:capText(next,140),
      evidenceSource:SOURCE_URL,
      confidence:'ll2-third-party-schedule-observation',
      note:kind==='target-time'?
        'Our monitor observed a changed published target. This is not an operator confirmation or evidence that the rocket launched.':
        'A Launch Library field changed. Refer to the operator for authoritative launch status.'
    });
  }
  return out;
}
function buildSnapshot(previous,raw,now=Date.now()){
  const incoming=normalizeSchedule(raw,now),at=iso(now);
  const prev=previous?.version===1&&Array.isArray(previous.missions)?previous:null;
  const existing=new Map((prev?.missions||[]).map(x=>[x.id,x]));
  const oldHistory=prev?.history&&typeof prev.history==='object'?prev.history:{};
  const merged=new Map();
  const history={};
  for(const l of incoming){
    const old=existing.get(l.id),oldEvents=Array.isArray(oldHistory[l.id])?oldHistory[l.id]:[];
    const fresh=old ? changes(old,l,at) : [];
    merged.set(l.id,{...l,observedAt:at,presentInUpcoming:true});
    history[l.id]=[...fresh,...oldEvents].slice(0,35);
  }
  // Disappearance from "upcoming" is not a scrub, launch result, or official
  // change. Preserve identity/status for a bounded time and label unknown.
  for(const old of prev?.missions||[]){
    if(merged.has(old.id))continue;
    const latest=ts(old.observedAt||prev.checkedAt);
    if(!latest||now-latest>48*3600000||merged.size>=20)continue;
    const oldEvents=Array.isArray(oldHistory[old.id])?oldHistory[old.id]:[];
    const missing=old.presentInUpcoming!==false? [{
      id:old.id+':left-upcoming:'+at,type:'left-upcoming-list',
      firstDetectedAt:at,before:'listed',after:'not-listed',
      evidenceSource:SOURCE_URL,
      confidence:'ll2-list-absence-not-outcome-evidence',
      note:'The mission is absent from the latest upcoming-list response. This does NOT establish scrub, launch completion or success.'
    }]:[];
    merged.set(old.id,{...old,presentInUpcoming:false,lastKnownStatus:old.status||null});
    history[old.id]=[...missing,...oldEvents].slice(0,35);
  }
  const missions=[...merged.values()].slice(0,20);
  return {version:1,source:SOURCE_URL,checkedAt:at,
    monitoredBy:'signed-github-actions-schedule',missions,history,
    freshForMinutes:CACHE_FRESH_MS/60000,
    note:'Schedule metadata is third-party LL2, not a verified launch operator commit; disappearance does not prove a scrub.'};
}
function publicMission(state,id,now=Date.now()){
  const checked=ts(state?.checkedAt);
  const age=checked?now-checked:Infinity;
  const freshness=age>=-60000&&age<=OBSERVATION_STALE_MS?'recent':'stale';
  if(!UUID.test(id||'')||state?.version!==1)return null;
  const item=state.missions?.find(x=>x.id===id);
  if(!item)return null;
  const inList=item.presentInUpcoming===true;
  const rawStatus=inList?item.status||'Unknown':null;
  const lower=String(rawStatus||'').toLowerCase();
  const explicitScrub=/scrub/.test(lower);
  const explicitHold=/\bhold\b/.test(lower);
  const terminal=/successful|failure|in flight|partial failure/i.test(lower);
  const exact=['second','minute'].includes(item.netPrecision);
  const t=ts(item.net);
  const elapsed=exact&&t>0&&now>t;
  let level='check',label='Recheck schedule before departing';
  if(freshness!=='recent'){level='stale';label='Latest schedule check is overdue';}
  else if(!inList){level='unknown';label='Mission no longer in upcoming list';}
  else if(explicitScrub){level='scrub';label='LL2 reports a scrub';}
  else if(explicitHold){level='hold';label='LL2 reports a hold';}
  else if(terminal){level='terminal';label='LL2 reports a launch outcome';}
  else if(elapsed){level='overdue';label='Target time passed; outcome unverified';}
  else if(!exact){level='uncertain';label='Launch time is not exact';}
  else {level='planning';label='Published target; confirm with operator';}
  const events=(state.history?.[id]||[]).filter(e=>
    typeof e?.type==='string'&&ts(e.firstDetectedAt)&&
    ts(e.firstDetectedAt)<=now+60000).slice(0,15);
  return {
    selectedLaunchId:id,source:SOURCE_URL,checkedAt:state.checkedAt,
    sourceType:'LL2-third-party-schedule',
    freshness,level,label,exactTarget:exact&&inList&&!explicitScrub&&!explicitHold&&!terminal&&!elapsed,
    targetAt:inList?item.net:null,netPrecision:item.netPrecision,
    status:rawStatus,presentInUpcoming:inList,
    lastProviderUpdatedAt:inList?item.lastUpdated||null:null,
    name:item.name,
    events,firstDetectedChangeAt:events[0]?.firstDetectedAt||null,
    launchOutcomeVerified:false,liveCountdownConfirmedByOperator:false,
    officialLink:'https://www.kennedyspacecenter.com/launches-and-events/',
    note:'The target and status come from Launch Library, not mission-control telemetry. Changes are first observed by our monitor; current official instructions and gate access must be checked separately.'
  };
}
async function readWatch(state=new ToolState()){
  if(!stateReady())return null;
  try{return await state.get(KEY)}catch{return null}
}
async function readFreshLaunchList(now=Date.now(),state=new ToolState()){
  const snapshot=await readWatch(state);
  const age=now-ts(snapshot?.checkedAt);
  if(snapshot?.version!==1||!Array.isArray(snapshot.missions)||
     !Number.isFinite(age)||age < -60000||age>CACHE_FRESH_MS)return null;
  return {
    results:snapshot.missions.filter(x=>x.presentInUpcoming===true&&
      UUID.test(x.id)),
    checkedAt:snapshot.checkedAt,
    source:'shared-postgres-scheduled-watch'
  };
}
async function runLaunchDayWatch({
  state=new ToolState(),fetcher=fetch,now=Date.now
}={}){
  if(!stateReady())throw new Error('Private Postgres state unavailable');
  const time=now();
  const owner=randomUUID();
  const held=await state.set(LEASE_KEY,owner,{ex:100,nx:true});
  if(held!=='OK')return {ok:true,skipped:'another-launch-schedule-check-active'};
  try{
    const r=await fetcher(LAUNCHES,{
      headers:{'User-Agent':'ChrisIzworskiLaunchDayMonitor/1.0 (chrisizworski.com)',
        Accept:'application/json'},
      signal:AbortSignal.timeout(10000)
    });
    if(!r.ok)throw new Error('LL2 schedule returned HTTP '+r.status);
    const raw=await r.json();
    const prior=await state.get(KEY);
    const priorTime=ts(prior?.checkedAt);
    if(priorTime>time)return {ok:true,skipped:'newer-observation-already-saved'};
    const next=buildSnapshot(prior,raw,time);
    await state.set(KEY,next,{ex:TTL_SECONDS});
    // Keep KSC's mission-validation snapshot alive around the clock, even
    // when no visitor loads the public landing page.
    const trusted=next.missions.filter(l=>l.presentInUpcoming===true&&
      ts(l.net)>time-20*60000).slice(0,8);
    await storeTrustedLaunches(trusted,time,state);
    return {ok:true,checkedAt:next.checkedAt,missions:trusted.length,
      changedEvents:next.missions.reduce((sum,m)=>sum+
        (next.history[m.id]||[]).filter(e=>e.firstDetectedAt===next.checkedAt).length,0),
      source:'LL2-third-party-schedule',cadence:'nominal-15m'};
  }finally{
    // Existing state adapter supports atomic compare and delete via command;
    // never delete a lease that has since been replaced.
    await state.command(['RELEASE',LEASE_KEY,owner]).catch(()=>{});
  }
}
module.exports={KEY,LEASE_KEY,LAUNCHES,SOURCE_URL,CACHE_FRESH_MS,
  OBSERVATION_STALE_MS,normalizeSchedule,changes,buildSnapshot,publicMission,
  readWatch,readFreshLaunchList,runLaunchDayWatch};
