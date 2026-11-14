'use strict';

/**
 * Rocket Launch Truth v1.
 * Source ledger, NOT flight control. Run by the existing authenticated
 * KSC/Florida schedule monitor, never by a visitor request.
 *
 * Sources:
 * LL2: third-party mission timing and contributor update history.
 * RocketLaunch.Live: a separately curated next-five listing; shared upstream
 * lineage cannot be ruled out, so agreement is corroboration, not a GO call.
 * Spaceflight News API: news indexed to the *exact* LL2 mission UUID.
 *
 * Detection times, provider publication times and flight operations are
 * distinct. No inferred scrub/hold/launch outcome or 45WS weather approval.
 */
const { randomUUID } = require('node:crypto');
const { ToolState, stateReady } = require('./tool-state');
const { normalizeUsLaunch } = require('./rocket-launch-usa');
const { missionKey } = require('./spaceflight-now-editorial');
const KEY='rocket:launch-truth:v1';
const LEASE_KEY='rocket:launch-truth:lease:v1';
const LL2='https://ll.thespacedevs.com/2.3.0/';
const RLL='https://fdo.rocketlaunch.live/json/launches/next/5';
const SNAPI='https://api.spaceflightnewsapi.net/v4/articles/';
const SCHEDULES=[
  {id:'primary',locations:'11,12,27',limit:36},
  {id:'specialist',locations:'1,21,25,143',limit:18}
];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REGIONS=new Set(['florida','california','texas','virginia','alaska','hawaii']);
const RUN_INTERVAL_MS=55*60*1000;
const STALE_MS=150*60*1000;
const MAX_MISSIONS=4;
const MAX_UPDATES=9;
const MAX_ARTICLES=4;
const TTL_SECONDS=14*86400;
const time=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?t:0;};
const iso=x=>new Date(x).toISOString();
const bounded=(v,n=180)=>typeof v==='string'?
  v.replace(/<[^>]*>/g,' ').replace(/[\x00-\x1f\x7f]+/g,' ')
    .replace(/\s+/g,' ').trim().slice(0,n):null;

function safeSourceUrl(s) {
  if(typeof s!=='string'||s.length>440)return null;
  try {
    const u=new URL(s);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||
       !/^[a-z0-9](?:[a-z0-9.-]{0,240})\.[a-z]{2,}$/i.test(u.hostname)||
       /(?:^|\.)localhost$|\.local$|\.internal$|\.example$/.test(u.hostname)||
       /^\d+(?:\.\d+){3}$/.test(u.hostname))return null;
    return u.toString();
  }catch{return null;}
}
function ll2ScheduleUrl(q){
  const u=new URL('launches/upcoming/',LL2);
  u.searchParams.set('location__ids',q.locations);
  u.searchParams.set('limit',String(q.limit));
  u.searchParams.set('ordering','net');
  u.searchParams.set('hide_recent_previous','true');
  return u.href;
}
function updatesUrl(id) {
  const u=new URL('updates/',LL2);
  u.searchParams.set('launch',id);
  u.searchParams.set('ordering','-created_on');
  u.searchParams.set('limit',String(MAX_UPDATES));
  return u.href;
}
function newsUrl(id) {
  const u=new URL(SNAPI);
  u.searchParams.set('launch',id);
  u.searchParams.set('limit',String(MAX_ARTICLES));
  return u.href;
}
async function boundedJson(url,fetcher=fetch,{timeout=8000,maxBytes=900000}={}) {
  const r=await fetcher(url,{headers:{
    Accept:'application/json','User-Agent':'ChrisIzworskiLaunchTruth/1.0 (https://chrisizworski.com/)'
  },signal:AbortSignal.timeout(timeout)});
  if(!r?.ok)throw new Error('upstream-http-'+(r?.status||'unknown'));
  const len=Number(r.headers?.get?.('content-length')||0);
  if(len>maxBytes)throw new Error('upstream-too-large');
  if(typeof r.text==='function'){
    const body=await r.text();
    if(body.length>maxBytes)throw new Error('upstream-too-large');
    return JSON.parse(body);
  }
  // Small, injected tests sometimes expose json() only.
  return r.json();
}
function normalizeProviderUpdates(raw,launchId,at) {
  if(!Array.isArray(raw?.results))throw new Error('invalid-ll2-update-list');
  const seen=new Set(),out=[];
  for(const rec of raw.results.slice(0,MAX_UPDATES)){
    const reported=time(rec?.created_on);
    const id=rec?.id;
    if(!Number.isInteger(id)||id<=0||seen.has(id)||!reported||
       reported>at+2*3600000||at-reported>90*86400000)continue;
    seen.add(id);
    const summary=bounded(rec?.comment,230);
    if(!summary)continue;
    out.push({
      id:'ll2-update:'+id,kind:'ll2-contributor-update',
      publishedAt:iso(reported),detectedAt:iso(at),
      summary,sourceUrl:safeSourceUrl(rec?.info_url),
      evidence:'Launch Library contributor comment; the URL may point to an original source but the comment is not an operator announcement'
    });
  }
  return out.sort((a,b)=>time(b.publishedAt)-time(a.publishedAt)).slice(0,MAX_UPDATES);
}
function normalizeNews(raw,id,at){
  if(!Array.isArray(raw?.results))throw new Error('invalid-snapi-news');
  const seen=new Set(),out=[];
  for(const row of raw.results.slice(0,MAX_ARTICLES)){
    const url=safeSourceUrl(row?.url),t=time(row?.published_at);
    const title=bounded(row?.title,160);
    if(!url||seen.has(url)||!title||!t||t>at+2*3600000||at-t>60*86400000)continue;
    seen.add(url);
    out.push({id:'news:'+row.id,kind:'launch-indexed-report',
      title,sourceUrl:url,publishedAt:iso(t),newsSite:bounded(row.news_site,60),
      attribution:'Spaceflight News API indexed this article to the selected LL2 launch ID; an article may discuss multiple missions'});
  }
  return out.sort((a,b)=>time(b.publishedAt)-time(a.publishedAt)).slice(0,MAX_ARTICLES);
}
function normalizeRll(raw,at){
  if(!Array.isArray(raw?.result)||raw.result.length>5)throw new Error('invalid-rll-next-five');
  return raw.result.map(row=>{
    const key=missionKey(row?.name||'');
    const target=time(row?.t0||row?.win_open);
    const changed=time(row?.modified);
    if(!key||!target||target<at-2*86400000||target>at+60*86400000)return null;
    return {id:Number.isInteger(row.id)?row.id:null,key,name:bounded(row.name,100),
      targetAt:iso(target),providerUpdatedAt:changed?iso(changed):null};
  }).filter(Boolean);
}
function comparison(launch,rll,at){
  const base={status:'not-in-next-five',source:'RocketLaunch.Live next five',
    checkedAt:iso(at),sourceUrl:RLL,
    ll2Target:launch.net||null,otherTarget:null,differenceMinutes:null,
    note:'The free RocketLaunch.Live response covers only the next five global launches; absence is not disagreement.'};
  const key=missionKey([launch.name,launch.mission].filter(Boolean).join(' '));
  if(!key)return {...base,status:'identity-not-distinct',
    note:'A unique mission designator was not available for a safe cross-provider comparison.'};
  const peers=(rll||[]).filter(x=>x.key===key);
  if(peers.length>1)return {...base,status:'ambiguous',
    note:'Multiple records carry the same mission marker. No comparison was made.'};
  if(!peers.length)return base;
  const rec=peers[0],exact=['minute','second'].includes(launch.netPrecision);
  const t=time(launch.net),r=time(rec.targetAt);
  if(!exact||!t||!r)return {...base,status:'precision-not-comparable',
    otherTarget:rec.targetAt,
    note:'A day-only or approximate LL2 launch target cannot be corroborated as an exact launch time.'};
  const delta=Math.round((r-t)/60000);
  return {...base,status:Math.abs(r-t)<=60000?'aligned':'disagrees',
    otherTarget:rec.targetAt,differenceMinutes:delta,
    providerUpdatedAt:rec.providerUpdatedAt,
    note:Math.abs(r-t)<=60000?
      'Two providers display approximately the same target time. This does not confirm flight approval or guarantee independent upstream sourcing.':
      'The schedule providers show different target times. Confirm the current target with the launch operator before travel.'};
}
function observedChanges(previous,next,at){
  if(!previous)return [];
  const fields=[
    ['net','target-time'],['netPrecision','time-precision'],['status','ll2-status'],
    ['windowStart','launch-window-start'],['windowEnd','launch-window-end']
  ];
  const out=[];
  for(const [field,kind] of fields){
    const old=previous[field]??null,now=next[field]??null;
    if(old===now)continue;
    out.push({id:next.id+':'+kind+':'+at,kind:'schedule-field-change',
      field:kind,detectedAt:iso(at),before:bounded(old,100),after:bounded(now,100),
      sourceUrl:'https://ll.thespacedevs.com/2.3.0/launches/'+next.id+'/',
      note:'Our monitor first detected this difference in the LL2 schedule. It is not the provider publication time or an official operation decision.'});
  }
  return out;
}
function selectMissions(responses,now){
  const unique=new Map();
  for(const response of responses){
    for(const raw of response?.results||[]){
      const launch=normalizeUsLaunch(raw,now);
      if(!launch||!UUID.test(launch.id)||!REGIONS.has(launch.region))continue;
      const net=time(launch.net);
      if(net<now-3600000||net>now+45*86400000)continue;
      unique.set(launch.id,launch);
    }
  }
  const sorted=[...unique.values()].sort((a,b)=>time(a.net)-time(b.net));
  const byRegion=new Map();
  for(const l of sorted)if(!byRegion.has(l.region))byRegion.set(l.region,l);
  return [...byRegion.values()].slice(0,MAX_MISSIONS);
}
function mergeSnapshot(prior,launches,details,rll,health,now){
  const old=prior?.version===1&&Array.isArray(prior.missions)?prior:{missions:[],history:{}};
  const previous=new Map(old.missions.map(x=>[x.id,x]));
  const missions=[],history={};
  for(const l of launches){
    const oldMission=previous.get(l.id);
    const events=observedChanges(oldMission,l,now);
    const timeline=[...events,...(old.history?.[l.id]||[])];
    const seen=new Set();
    history[l.id]=timeline.filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true;}).slice(0,30);
    const info=details[l.id]||{};
    missions.push({
      id:l.id,region:l.region,name:bounded(l.name,150),
      mission:bounded(l.mission,150),rocket:bounded(l.rocket,120),
      net:l.net,netPrecision:l.netPrecision,status:bounded(l.status,60),
      lastUpdated:l.lastUpdated||null,
      windowStart:l.windowStart||null,windowEnd:l.windowEnd||null,
      checkedAt:iso(now),monitoredNow:true,
      updatesStatus:info.updatesStatus||'unavailable',
      newsStatus:info.newsStatus||'unavailable',
      updates:info.updates||[],news:info.news||[],
      comparison:health.rll.status==='ok'?
        comparison(l,rll,now):
        {status:'source-unavailable',checkedAt:iso(now),sourceUrl:RLL,
          note:'RocketLaunch.Live could not be checked; cross-provider agreement is unknown.'}
    });
  }
  // Keep bounded historical entries when a previously sampled mission falls
  // out of our nearest-four window. Absence from a sample is NEVER a scrub.
  for(const oldMission of old.missions){
    if(missions.length>=12||missions.some(m=>m.id===oldMission.id))continue;
    const age=now-time(oldMission.checkedAt);
    if(age<0||age>72*3600000||time(oldMission.net)<now-72*3600000)continue;
    missions.push({...oldMission,monitoredNow:false,
      comparison:{status:'historical-only',sourceUrl:RLL,
        note:'The mission is no longer among the bounded sampled launches. Previous evidence is historical only.'}});
    history[oldMission.id]=(old.history?.[oldMission.id]||[]).slice(0,30);
  }
  return {version:1,checkedAt:iso(now),missions,history,sourceHealth:health,
    boundedCoverage:'One nearest listed mission per available region, maximum four across two LL2 queries. Other missions may not have evidence.',
    note:'This is a source-change ledger, not flight control, live trajectory or official launch clearance.'};
}
async function runLaunchTruthWatch({
  state=new ToolState(),fetcher=fetch,now=Date.now,ready=stateReady,
  nationalSnapshot=null
}={}){
  if(!ready())throw new Error('Private Postgres state unavailable');
  const at=now(),owner=randomUUID(),last=await state.get(KEY);
  if(last?.version===1&&at-time(last.checkedAt)<RUN_INTERVAL_MS &&
     at>=time(last.checkedAt)-60000)return {ok:true,skipped:'hourly-evidence-cadence',checkedAt:last.checkedAt};
  const lock=await state.set(LEASE_KEY,owner,{ex:190,nx:true});
  if(lock!=='OK')return {ok:true,skipped:'another-evidence-run-active'};
  try {
    // Recheck behind lock: a parallel worker might have completed already.
    const newest=await state.get(KEY);
    if(newest?.version===1&&at-time(newest.checkedAt)<RUN_INTERVAL_MS &&
       at>=time(newest.checkedAt)-60000)
      return {ok:true,skipped:'newer-evidence-already-recorded'};
    // Launch schedules and the independent next-five sample do not depend
    // on one another; start together to stay within the KSC job's 35s limit.
    // The national collector already used the LL2 schedule allowance.
    // Production always passes its Postgres-backed snapshot. The old
    // direct path remains solely for backwards-compatible unit fixtures.
    const shared=nationalSnapshot?.version===2&&
      Array.isArray(nationalSnapshot.missions)?nationalSnapshot:null;
    const upstream=await Promise.allSettled([
      ...(shared?[]:SCHEDULES.map(q=>
        boundedJson(ll2ScheduleUrl(q),fetcher,{maxBytes:1000000}))),
      boundedJson(RLL,fetcher,{maxBytes:150000,timeout:7000})
    ]);
    const attempts=shared?[]:upstream.slice(0,SCHEDULES.length);
    const feeds=attempts.filter(x=>x.status==='fulfilled').map(x=>x.value)
      .filter(x=>Array.isArray(x?.results));
    if(!shared&&!feeds.length)
      throw new Error('LL2 national evidence discovery unavailable');
    const health={
      schedule:shared?shared.health.map(h=>({id:h.id,status:h.status})):
        SCHEDULES.map((q,i)=>({id:q.id,status:attempts[i].status==='fulfilled'&&
          Array.isArray(attempts[i].value?.results)?'ok':'unavailable'})),
      rll:{status:'unavailable',checkedAt:iso(at)}
    };
    const missions=shared?
      (()=>{const byRegion=new Map();
        for(const l of shared.missions.filter(x=>x.presentInUpcoming&&!x.sourceStale)
          .sort((a,b)=>time(a.net)-time(b.net))){
          if(!byRegion.has(l.region))byRegion.set(l.region,l);
        }
        return [...byRegion.values()].slice(0,MAX_MISSIONS);
      })():selectMissions(feeds,at);
    const rllOutcome=upstream[shared?0:SCHEDULES.length];
    let rll=[];
    if(rllOutcome.status==='fulfilled'){
      try {rll=normalizeRll(rllOutcome.value,at);health.rll.status='ok';}
      catch {/* keep source unavailable */}
    }
    const details={};
    await Promise.all(missions.map(async mission=>{
      const pair=await Promise.allSettled([
        boundedJson(updatesUrl(mission.id),fetcher,{maxBytes:80000}),
        boundedJson(newsUrl(mission.id),fetcher,{maxBytes:120000})
      ]);
      const row={updatesStatus:'unavailable',newsStatus:'unavailable',updates:[],news:[]};
      if(pair[0].status==='fulfilled'){
        try {row.updates=normalizeProviderUpdates(pair[0].value,mission.id,at);
          row.updatesStatus='ok';}catch{/* no false completeness */}
      }
      if(pair[1].status==='fulfilled'){
        try {row.news=normalizeNews(pair[1].value,mission.id,at);
          row.newsStatus='ok';}catch{/* no false completeness */}
      }
      details[mission.id]=row;
    }));
    const next=mergeSnapshot(newest,missions,details,rll,health,at);
    // Every returned mission gets a comparison state, even if the bounded
    // enrichment budget did not fetch LL2 contributor history/news for it.
    if(shared){
      next.nationalScheduleCheckedAt=shared.checkedAt;
      next.comparisons=Object.fromEntries(shared.missions
        .filter(x=>x.presentInUpcoming&&!x.sourceStale)
        .map(x=>[x.id,health.rll.status==='ok'?
          comparison(x,rll,at):
          {status:'source-unavailable',checkedAt:iso(at),sourceUrl:RLL,
           note:'The second calendar was unavailable during the last check.'}]));
    }
    await state.set(KEY,next,{ex:TTL_SECONDS});
    return {ok:true,checkedAt:next.checkedAt,monitored:missions.length,
      ll2ScheduleSources:health.schedule,rocketLaunchLive:health.rll.status,
      missionUpdates:missions.filter(x=>details[x.id]?.updatesStatus==='ok').length,
      newsMatched:missions.reduce((n,x)=>n+(details[x.id]?.news.length||0),0),
      detectedChanges:missions.reduce((n,x)=>n+(next.history[x.id]||[])
        .filter(e=>e.detectedAt===iso(at)).length,0)};
  }finally{
    await state.command(['RELEASE',LEASE_KEY,owner]).catch(()=>{});
  }
}
function publicTruth(state,id,selected=null,now=Date.now()){
  const base={
    status:'not-monitored',missionId:id,observedAt:state?.checkedAt||null,
    snapshotStatus:state?.version===1?'exists':'unavailable',
    headline:'This mission does not yet have a monitored source ledger',
    sourceHealth:state?.sourceHealth||null,
    comparison:{status:'unknown',note:'No cross-provider time comparison for this selected mission.'},
    news:[],updates:[],timeline:[],story:
      'The current launch schedule is separate from this evidence ledger. No absence or unknown status implies a scrub or launch success.',
    coverage:state?.boundedCoverage||'Bounded source monitor not yet initialized'
  };
  if(!UUID.test(id||'')||state?.version!==1)return base;
  const mission=state.missions?.find(m=>m.id===id);
  if(!mission)return base;
  const observed=time(state.checkedAt),fresh=observed&&now-observed>=-60000&&now-observed<=STALE_MS;
  const sampled=mission.monitoredNow!==false;
  const mismatch=Boolean(selected?.net&&time(selected.net)!==time(mission.net));
  const comparisonReport=!sampled?
    {status:'historical-only',sourceUrl:RLL,
      note:'This mission was not part of the last bounded schedule sample. Its older comparison does not establish present agreement.'}:
    mismatch?
    {status:'snapshot-mismatch',
      note:'The current LL2 target differs from the last scheduled source reconciliation. The cross-provider verdict is suspended until the next observation.',
      sourceUrl:RLL}:
    fresh?mission.comparison:
    {status:'stale',note:'The source comparison has aged out; it cannot establish present schedule agreement.',sourceUrl:RLL};
  const newestHistory=Array.isArray(state.history?.[id])?state.history[id].slice(0,12):[];
  const updates=mission.updatesStatus==='ok'?mission.updates.slice(0,7):[];
  const news=mission.newsStatus==='ok'?mission.news.slice(0,4):[];
  const status=!sampled?'historical-only':mismatch?'target-changed-after-check':fresh?'recent':'stale';
  const change=newestHistory.find(x=>x.kind==='schedule-field-change');
  let headline='No confirmed source disagreement in this bounded check';
  if(status==='historical-only')headline='Only historical evidence is available for this mission';
  else if(status==='stale')headline='This mission’s evidence check is overdue';
  else if(mismatch)headline='The schedule changed after the source check';
  else if(comparisonReport.status==='disagrees')
    headline='Launch schedules disagree — check the operator';
  else if(change?.field==='target-time')
    headline='The published launch target has changed';
  else if(comparisonReport.status==='aligned')
    headline='Two calendars currently show a similar launch target';
  else if(comparisonReport.status==='not-in-next-five')
    headline='Independent calendar coverage is limited for this mission';
  const observedBy=iso(observed);
  return {
    ...base,status,headline,observedAt:observedBy,
    region:mission.region,net:mission.net,netPrecision:mission.netPrecision,
    ll2LastUpdatedAt:mission.lastUpdated,sourceHealth:state.sourceHealth,
    comparison:comparisonReport,
    updatesStatus:mission.updatesStatus,newsStatus:mission.newsStatus,
    updates,news,timeline:newestHistory,
    story:status==='historical-only'?
      'This mission has left the limited active sample. Its previous updates are historical and do not establish a launch, scrub or current departure time.':
      change?.field==='target-time'?
      'Our monitor detected a changed published target; the reason and the operator’s final decision have not been verified.':
      'The ledger compares published evidence only. Scheduled times can change, and agreement does not mean launch clearance.',
    coverage:state.boundedCoverage,
    authoritativeOutcomeVerified:false,flightWeatherApproved:false
  };
}
/**
 * v2 visitor lens: every returned launch gets schedule evidence and change
 * history, while LL2 contributor/news enrichment rotates through a bounded
 * priority set. Missing enrichment never means a mission lacks journalism.
 */
function publicTruthV2(enriched,id,selected=null,now=Date.now(),national=null){
  const original=publicTruth(enriched,id,selected,now);
  const missions=Array.isArray(national?.missions)?national.missions:[];
  if(national?.version!==2)return original;
  const current=missions.find(x=>x.id===id);
  const active=missions.filter(x=>x.presentInUpcoming&&!x.sourceStale);
  const count=active.length;
  const coverage=count+' launches are on the public calendar for the next 120 days across six U.S. coastal regions. '+
    'Each one keeps a record of its schedule changes; news and update notes refresh a few flights at a time.';
  if(!current)return {...original,status:'not-returned',coverage,
    headline:'Mission not present in the most recent bounded coastal records',
    story:'Not appearing in the monitored upcoming records does not prove a scrub, cancellation or successful launch.',
    comparison:{status:'unknown',note:'A current matching source record is not available.'},
    nationalCheckedAt:national.checkedAt,monitoredMissionCount:count};
  const group=national.health?.find(h=>h.id===current.sourceGroup);
  const age=now-time(national.checkedAt);
  const fresh=age>=-60000&&age<=75*60000;
  const currentlyListed=current.presentInUpcoming===true&&
    current.sourceStale!==true&&['ok','truncated'].includes(group?.status);
  const newsEnriched=enriched?.missions?.find(x=>x.id===id&&x.monitoredNow!==false);
  const canUseEnrichment=Boolean(newsEnriched&&
    Math.abs(time(newsEnriched.net)-time(current.net))<=60000 &&
    now-time(newsEnriched.checkedAt)<=150*60000);
  const reports=canUseEnrichment?newsEnriched:null;
  const comparisons=enriched?.comparisons||{};
  const compared=comparisons[id];
  const comparable=Boolean(currentlyListed&&fresh&&
    compared&&enriched?.nationalScheduleCheckedAt===national.checkedAt&&
    now-time(enriched.checkedAt)<=150*60000);
  const c=comparable?compared:
    {status:!currentlyListed?'historical-only':!fresh?'stale':'awaiting-reconciliation',
      note:!currentlyListed?'This mission is no longer verified in the active source group.':
        !fresh?'The national source check is overdue.':
        'We compare this flight with a second launch calendar on the next scheduled check.',
      sourceUrl:RLL};
  const events=(national.history?.[id]||[]).slice(0,14);
  const changed=events.find(e=>e.kind==='schedule-field-change'&&e.field==='target-time');
  const status=!currentlyListed?'historical-only':!fresh?'stale':
    selected?.net&&time(selected.net)!==time(current.net)?
      'target-changed-after-check':'recent';
  const verdict=status==='historical-only'?'Only historical schedule evidence is available':
    status==='stale'?'The national launch-source check is overdue':
    status==='target-changed-after-check'?'A newer launch target needs reconciliation':
    c.status==='disagrees'?'The published launch calendars disagree':
    changed?'The published launch target has changed':
    c.status==='aligned'?'Two calendars show the same published launch time':
    'The schedule is monitored; independent timing is not verified';
  return {...original,status,headline:verdict,observedAt:national.checkedAt,
    net:current.net,netPrecision:current.netPrecision,region:current.region,
    ll2LastUpdatedAt:current.lastUpdated,
    sourceHealth:{...(enriched?.sourceHealth||{}),national:national.health},
    comparison:c,updatesStatus:reports?.updatesStatus||'not-prioritized',
    newsStatus:reports?.newsStatus||'not-prioritized',
    updates:reports?.updatesStatus==='ok'?reports.updates.slice(0,7):[],
    news:reports?.newsStatus==='ok'?reports.news.slice(0,4):[],
    timeline:events,coverage,nationalCheckedAt:national.checkedAt,
    monitoredMissionCount:count,sourceGroupComplete:group?.status==='ok',
    story:status==='historical-only'?
      'This launch is not currently verified in the source sample. Its older observations do not establish a scrub or a launch outcome.':
      changed?'The collector observed a revised published launch target; no delay cause is inferred.':
      'Scheduled targets are not launch authorization. Confirm official operator updates and viewing access before traveling.',
    authoritativeOutcomeVerified:false,flightWeatherApproved:false};
}

async function readTruth(id,selected=null,now=Date.now(),state=new ToolState()){
  if(!stateReady())return publicTruth(null,id,selected,now);
  try {return publicTruth(await state.get(KEY),id,selected,now);}
  catch{return publicTruth(null,id,selected,now);}
}
module.exports={KEY,LEASE_KEY,LL2,RLL,SNAPI,SCHEDULES,RUN_INTERVAL_MS,STALE_MS,
  MAX_MISSIONS,safeSourceUrl,ll2ScheduleUrl,updatesUrl,newsUrl,boundedJson,
  normalizeProviderUpdates,normalizeNews,normalizeRll,comparison,
  observedChanges,selectMissions,mergeSnapshot,runLaunchTruthWatch,
  publicTruth,publicTruthV2,readTruth};
