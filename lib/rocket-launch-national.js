'use strict';

/**
 * Launch Truth v2 national source-of-truth snapshot.
 *
 * One signed, Postgres-backed collector covers all returned U.S. coastal
 * launches. Visitor handlers only read this shared snapshot; no visitor calls
 * LL2. Two source-group requests per scheduled check (nominal 30 minutes)
 * consume four anonymous LL2 calls/hour. Other LL2 users have quota headroom.
 * A group's pagination/truncation is always visible, never called complete.
 */
const {randomUUID}=require('node:crypto');
const {ToolState,stateReady}=require('./tool-state');
const {normalizeUsLaunch}=require('./rocket-launch-usa');
const KEY='rocket:national-schedule:v2';
const LEASE_KEY='rocket:national-schedule:lease:v2';
const INTERVAL_MS=28*60000;
const FRESH_MS=75*60000;
const RETAIN_MS=48*3600000;
const TTL=14*86400;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QUERIES=[
  {id:'primary',locations:[11,12,27],limit:100},
  {id:'specialist',locations:[1,21,25,143],limit:100}
];
const EVIDENCE_FIELDS=[
  ['net','target-time'],['netPrecision','time-precision'],
  ['status','ll2-status'],['windowStart','launch-window-start'],
  ['windowEnd','launch-window-end'],['pad','launch-pad']
];
const timestamp=s=>{const x=Date.parse(s||'');return Number.isFinite(x)?x:0;};
const asIso=t=>new Date(t).toISOString();
const text=(v,n=220)=>typeof v==='string'?v.slice(0,n):null;
function queryUrl(q){
  const url=new URL('https://ll.thespacedevs.com/2.3.0/launches/upcoming/');
  url.searchParams.set('location__ids',q.locations.join(','));
  url.searchParams.set('limit',String(q.limit));
  url.searchParams.set('format','json');
  url.searchParams.set('ordering','net');
  url.searchParams.set('hide_recent_previous','true');
  return url.href;
}
async function fetchSchedule(url,fetcher=fetch){
  const response=await fetcher(url,{headers:{
    'User-Agent':'ChrisIzworskiNationalLaunchWatch/2.0 (https://chrisizworski.com/)',
    Accept:'application/json'
  },signal:AbortSignal.timeout(11500)});
  if(!response?.ok)throw new Error('ll2-source-http-'+(response?.status||'unknown'));
  const size=Number(response.headers?.get?.('content-length')||0);
  if(size>1800000)throw new Error('ll2-source-too-large');
  const value=typeof response.text==='function'?
    await response.text():null;
  if(value!==null&&value.length>1800000)throw new Error('ll2-source-too-large');
  const raw=value!==null?JSON.parse(value):await response.json();
  if(!Array.isArray(raw?.results)||!Number.isInteger(raw?.count)||raw.count<0)
    throw new Error('ll2-source-invalid-results');
  return raw;
}
function normalizeFeed(raw,group,now){
  const idSet=new Set(group.locations);
  const results=[];
  const seen=new Set();
  let rejected=0;
  for(const item of raw.results){
    if(!idSet.has(Number(item?.pad?.location?.id))){rejected++;continue;}
    const launch=normalizeUsLaunch(item,now);
    if(!launch||!UUID.test(launch.id)){rejected++;continue;}
    const net=timestamp(launch.net);
    if(!net||net>now+365*86400000){rejected++;continue;}
    if(seen.has(launch.id))continue;
    seen.add(launch.id);
    // Flat normalized records retained; no copyrighted LL2 imagery.
    results.push({...launch,sourceGroup:group.id,
      sourceObservedAt:asIso(now),presentInUpcoming:true});
  }
  return {id:group.id,checkedAt:asIso(now),items:results,health:{
    id:group.id,status:raw.count>raw.results.length?'truncated':'ok',
    checkedAt:asIso(now),returned:raw.results.length,
    accepted:results.length,rejected,providerCount:raw.count,
    truncated:raw.count>raw.results.length,
    sampleCap:group.limit
  }};
}
function fieldEvents(before,after,at){
  if(!before)return [];
  const changes=[];
  for(const [field,key] of EVIDENCE_FIELDS){
    const old=before[field]??null,next=after[field]??null;
    if(old===next)continue;
    changes.push({
      id:after.id+':'+key+':'+asIso(at),
      kind:'schedule-field-change',field:key,
      before:text(old,120),after:text(next,120),
      detectedAt:asIso(at),
      sourceUrl:'https://ll.thespacedevs.com/2.3.0/launches/'+after.id+'/',
      note:'First detected by the scheduled LL2 observer. Not an operator-issued change timestamp or evidence that a rocket launched.'
    });
  }
  return changes;
}
function snapshot(previous,groupResults,now){
  const prior=previous?.version===2?previous:null;
  const previousById=new Map((prior?.missions||[]).map(m=>[m.id,m]));
  const history={};const missions=[];
  const oldHistory=prior?.history||{};
  const groupHealth=[];
  for(const group of QUERIES){
    const observed=groupResults[group.id];
    if(observed){
      groupHealth.push(observed.health);
      const items=observed.items;
      for(const launch of items){
        const priorMission=previousById.get(launch.id);
        const events=fieldEvents(priorMission?.presentInUpcoming?priorMission:null,launch,now);
        const all=[...events,...(oldHistory[launch.id]||[])];
        const uniq=new Set();
        history[launch.id]=all.filter(x=>{if(uniq.has(x.id))return false;uniq.add(x.id);return true;}).slice(0,36);
        missions.push(launch);
      }
      // A previously listed launch disappearing from an *untruncated* group
      // proves only that it left this group's upcoming response.
      const present=new Set(items.map(x=>x.id));
      for(const priorMission of prior?.missions||[]){
        if(priorMission.sourceGroup!==group.id||present.has(priorMission.id)||
           now-timestamp(priorMission.sourceObservedAt)>RETAIN_MS)continue;
        const oldEvents=oldHistory[priorMission.id]||[];
        const missing=priorMission.presentInUpcoming && !observed.health.truncated?[{
          id:priorMission.id+':list-absence:'+asIso(now),
          kind:'list-absence',field:'upcoming-list',
          detectedAt:asIso(now),before:'listed',after:'not-returned',
          sourceUrl:queryUrl(group),
          note:'Absent from an untruncated upcoming response; not evidence of scrub, completion or failure.'
        }]:[];
        missions.push({...priorMission,presentInUpcoming:false,
          sourceStale:true,absenceReason:observed.health.truncated?
          'truncated-provider-page':'not-returned-by-provider'});
        history[priorMission.id]=[...missing,...oldEvents].slice(0,36);
      }
    }else{
      const old=prior?.health?.find(h=>h.id===group.id);
      groupHealth.push({id:group.id,status:'unavailable',checkedAt:old?.checkedAt||null,
        lastAttemptAt:asIso(now),providerCount:old?.providerCount??null,
        returned:old?.returned??null,truncated:true,
        note:'Retaining older records; no current assessment for this source group.'});
      // Carry old source-group records, but stale; no fabricated zero missions.
      for(const l of prior?.missions||[]){
        if(l.sourceGroup!==group.id||
           now-timestamp(l.sourceObservedAt)>RETAIN_MS)continue;
        missions.push({...l,sourceStale:true});
        history[l.id]=(oldHistory[l.id]||[]).slice(0,36);
      }
    }
  }
  const uniq=new Map();
  for(const mission of missions)
    if(!uniq.has(mission.id)||timestamp(mission.sourceObservedAt)>
       timestamp(uniq.get(mission.id).sourceObservedAt))uniq.set(mission.id,mission);
  const ordered=[...uniq.values()].sort((a,b)=>timestamp(a.net)-timestamp(b.net));
  const active=ordered.filter(x=>x.presentInUpcoming&&!x.sourceStale);
  const checkedAt=asIso(now);
  return {version:2,checkedAt,source:'Launch Library 2 v2.3',
    missions:ordered.slice(0,220),history,health:groupHealth,
    activeCount:active.length,knownCount:ordered.length,
    complete:groupHealth.every(x=>x.status==='ok'),
    note:'Every valid returned mission is observed, not every possible unannounced launch. A truncated source group or missed update prevents complete coverage.'};
}
function publicSchedule(value,now=Date.now()){
  if(value?.version!==2||!Array.isArray(value.missions))return null;
  const age=now-timestamp(value.checkedAt);
  const fresh=age>=-60000&&age<=FRESH_MS;
  const health=(value.health||[]).map(h=>({
    ...h,status:fresh?h.status:'stale',
    originalStatus:h.status
  }));
  const launches=value.missions.filter(x=>x.presentInUpcoming).map(x=>({
    ...x,sourceStale:!fresh||x.sourceStale===true
  }));
  return {
    launches:launches.sort((a,b)=>timestamp(a.net)-timestamp(b.net)),
    health,isPartial:!value.complete||!fresh,
    checkedAt:value.checkedAt,
    freshness:fresh?'recent':'stale',
    complete:value.complete&&fresh,
    activeCount:value.activeCount,
    knownCount:value.knownCount,
    source:'shared-postgres-ll2-national-v2',
    warning:!fresh?'Scheduled launch-source check is overdue; targets may have changed.':!value.complete?
      'At least one provider group is unavailable or truncated. Coverage is incomplete.':
      'All validated launch records returned by configured provider groups are available.'
  };
}
async function readNationalSchedule(now=Date.now(),state=new ToolState(),ready=stateReady){
  if(!ready())return null;
  try{return publicSchedule(await state.get(KEY),now);}catch{return null;}
}
async function runNationalWatch({state=new ToolState(),fetcher=fetch,now=Date.now,ready=stateReady}={}){
  if(!ready())throw new Error('Private Postgres state unavailable');
  const at=now(),before=await state.get(KEY);
  if(before?.version===2&&at-timestamp(before.checkedAt)<INTERVAL_MS &&
     at>=timestamp(before.checkedAt)-60000)
    return {ok:true,skipped:'national-snapshot-cadence',checkedAt:before.checkedAt,
      snapshot:before};
  const owner=randomUUID();
  if(await state.set(LEASE_KEY,owner,{ex:115,nx:true})!=='OK')
    return {ok:true,skipped:'another-national-watch-active',
      snapshot:before?.version===2?before:null};
  try{
    const prior=await state.get(KEY);
    if(prior?.version===2&&at-timestamp(prior.checkedAt)<INTERVAL_MS &&
       at>=timestamp(prior.checkedAt)-60000)
      return {ok:true,skipped:'national-snapshot-updated-by-another-worker',
        checkedAt:prior.checkedAt,snapshot:prior};
    const checked=await Promise.allSettled(QUERIES.map(async q=>
      normalizeFeed(await fetchSchedule(queryUrl(q),fetcher),q,at)));
    const observed={};
    QUERIES.forEach((q,i)=>{if(checked[i].status==='fulfilled')observed[q.id]=checked[i].value;});
    if(!Object.keys(observed).length)throw new Error('all-national-ll2-groups-unavailable');
    const next=snapshot(prior,observed,at);
    await state.set(KEY,next,{ex:TTL});
    return {ok:true,checkedAt:next.checkedAt,missions:next.activeCount,
      coveredCount:next.activeCount,providerGroups:next.health,
      complete:next.complete,snapshot:next,
      source:'Launch Library 2, scheduled Postgres snapshot'};
  }finally{
    await state.command(['RELEASE',LEASE_KEY,owner]).catch(()=>{});
  }
}
module.exports={KEY,LEASE_KEY,INTERVAL_MS,FRESH_MS,QUERIES,UUID,queryUrl,
  fetchSchedule,normalizeFeed,fieldEvents,snapshot,publicSchedule,
  readNationalSchedule,runNationalWatch};
