'use strict';
/**
 * Versioned Python -> Node/Postgres official-notice evidence contract.
 * No unsigned data, user-submitted source URLs, future access prediction,
 * guessed launch/marine safety clearances, or duplicate LL2 collection.
 */
const {ToolState,stateReady}=require('./tool-state');
const {readNationalSchedule}=require('./rocket-launch-national');
const KEY='rocket:official-notices:v1',TTL=72*3600,FRESH_MS=90*60000;
const REGIONS=Object.freeze(['california','florida','texas','virginia','alaska','hawaii']);
const SOURCES=Object.freeze({
 'vandenberg-news':['california','https://www.vandenberg.spaceforce.mil/News/','news'],
 'vandenberg-alerts':['california','https://public.govdelivery.com/accounts/USDODSFVANDENBERG/signup/41755','alerts'],
 'canaveral-nps':['florida','https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm','policy'],
 'ksc-viewing':['florida','https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing','policy'],
 'starbase-city':['texas','https://www.starbase.texas.gov/beach-road-access','access'],
 'wallops-schedule':['virginia','https://www.nasa.gov/wallops-launch-schedule/','schedule'],
 'wallops-visitor':['virginia','https://www.nasa.gov/wallops/visitor-center/view-a-launch-from-nasa-wallops-visitor-center/','policy'],
 'alaska-aerospace':['alaska','https://akaerospace.com/','access'],
 'alaska-news':['alaska','https://akaerospace.com/news','news'],
 'pmrf-beach':['hawaii','https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/','policy']
});
const STATUS=new Set(['retrieved','limited','unavailable']);
const KIND=new Set(['access-status','road-status','historical-order-index','notice-check-required','schedule-status','access-policy','source-link','official-article','scheduled-road-activity']);
const RELEVANCE=new Set(['current-published-status','historical-only','review-required','policy-only','unmatched-official-article','dated-road-advisory']);
const asText=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const when=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:0;};
const asIso=n=>new Date(n).toISOString();
function signalUrl(url,source){
 try{
  const u=new URL(url),s=new URL(source);
  return u.protocol==='https:'&&u.hostname===s.hostname&&
    !u.username&&!u.password&&u.hash===''&&
    (u.pathname===s.pathname||u.pathname.startsWith(s.pathname.startsWith('/News/')?'/News/':
      s.pathname==='/news'?'/news':'__never__'))?u.href:null;
 }catch{return null;}
}
function normalizeSignal(v,source,checkedAt=Date.now()){
 if(!v||!KIND.has(v.kind)||!RELEVANCE.has(v.relevance))return null;
 const url=signalUrl(v.sourceUrl,source);
 const title=asText(v.title,150),detail=asText(v.detail,320);
 if(!url||title.length<5||detail.length<20)return null;
 const date=v.publishedDate===null?null:typeof v.publishedDate==='string'&&/^\d{4}-\d\d-\d\d$/.test(v.publishedDate)?
   v.publishedDate:null;
 const normalized={kind:v.kind,title,detail,sourceUrl:url,publishedDate:date,
   relevance:v.relevance,scope:asText(v.scope,90)};
 const windowed=v.kind==='scheduled-road-activity';
 if(!windowed&&(v.windowStart!==undefined||v.windowEnd!==undefined))return null;
 if(windowed){
  // Only the registered city road source can attach dated transport activity.
  // Never convert this into a road-closure or launch-permission signal.
  if(source!==SOURCES['starbase-city'][1]||v.relevance!=='dated-road-advisory'||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(v.windowStart||'')||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(v.windowEnd||''))return null;
  const start=when(v.windowStart),end=when(v.windowEnd);
  if(!start||!end||end<=start||end-start>36*3600000||
    end<=checkedAt||start<checkedAt-36*3600000||
    start>checkedAt+14*86400000)return null;
  normalized.windowStart=asIso(start);
  normalized.windowEnd=asIso(end);
 }
 return normalized;
}

const MATCH_SOURCES=Object.freeze({
 'wallops-range-blog':{region:'virginia',url:'https://www.nasa.gov/blogs/wallops-range/'},
 'vandenberg-launch-news':{region:'california',url:'https://www.vandenberg.spaceforce.mil/News/'},
 'spaceforce-news-rss':{region:'california',url:'https://www.spaceforce.mil/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=1060&max=20'}
});
const MATCH_UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const MARKER=/^(?:STARLINK-\d{1,2}-\d{1,3}|USSF-\d{2,4}|NROL-\d{2,4}|TRANSPORTER-\d{1,3}|BANDWAGON-\d{1,3}|CRS-\d{1,3}|NG-\d{1,3}|HASTE-\d{1,3}|ARTEMIS-(?:II|III|IV|V|VI)|TOMEX\+)$/;
function matchArticle(url,sourceId){
 try{
  const spec=MATCH_SOURCES[sourceId],u=new URL(url);if(!spec||u.origin!==new URL(spec.url).origin||
   u.username||u.password||u.search||u.hash||!['wallops-range-blog','vandenberg-launch-news','spaceforce-news-rss'].includes(sourceId))return null;
  const path=u.pathname;
  const okay=sourceId==='wallops-range-blog'?
    /^\/blogs\/wallops(?:-range)?\/20\d{2}\/\d{2}\/\d{2}\/[a-z0-9-]+\/?$/.test(path):
    /^\/News\/Article-Display\/Article\/\d+\/[A-Za-z0-9-]+\/?$/.test(path);
  return okay?u.href:null;
 }catch{return null;}
}
const isDate=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&
 Number.isFinite(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const count=n=>Number.isInteger(n)&&n>=0&&n<=30;
function validateReconciliation(raw,at){
 if(raw===undefined)return null;
 if(!raw||raw.version!==1||when(raw.checkedAt)!==at||
   !Array.isArray(raw.matches)||raw.matches.length>4||
   !Array.isArray(raw.sourceStatus)||raw.sourceStatus.length>3||
   !count(raw.candidateCount)||!count(raw.unmatched)||!count(raw.conflicts)||
   !['matched-with-current-ll2','no-verified-match','schedule-unavailable','unavailable'].includes(raw.health))
   throw Error('reconciliation-shape-invalid');
 const seenStatus=new Set(),status=[];
 for(const record of raw.sourceStatus){
  const spec=MATCH_SOURCES[record?.id];
  if(!spec||seenStatus.has(record.id)||record.region!==spec.region||
   record.sourceUrl!==spec.url||
   !['retrieved','partial','unavailable'].includes(record.status)||
   !Number.isInteger(record.articlesChecked)||record.articlesChecked<0||record.articlesChecked>2||
   !Number.isInteger(record.candidateCount)||record.candidateCount<0||record.candidateCount>2)
   throw Error('reconciliation-source-invalid');
  seenStatus.add(record.id);
  status.push({id:record.id,region:spec.region,sourceUrl:spec.url,
   status:record.status,articlesChecked:record.articlesChecked,
   candidateCount:record.candidateCount});
 }
 if(status.length&&status.length!==Object.keys(MATCH_SOURCES).length)throw Error('reconciliation-source-inventory-invalid');
 const stamp=raw.manifestCheckedAt;
 if(stamp!==null&&(!when(stamp)||Math.abs(when(stamp)-at)>90*60000))
  throw Error('reconciliation-manifest-age-invalid');
 if(raw.matches.length&&(!stamp||raw.health!=='matched-with-current-ll2'))
  throw Error('reconciliation-match-without-manifest');
 const used=new Set(),matches=[];
 for(const m of raw.matches){
  const spec=MATCH_SOURCES[m?.sourceId];
  if(!spec||m.region!==spec.region||
   !MATCH_UUID.test(m.launchId)||used.has(m.launchId)||
   !matchArticle(m.articleUrl,m.sourceId)||
   !isDate(m.officialEventDate)||
   (m.publishedDate!==null&&!isDate(m.publishedDate))||
   !MARKER.test(m.missionMarker)||!(/^[0-9a-f]{24}$/).test(m.sourceFingerprint)||
   !Number.isInteger(m.dateDifferenceDays)||Math.abs(m.dateDifferenceDays)>1||
   !(['exact-designation-and-local-date','official-rss-exact-designation-and-local-date'].includes(m.matchRule))||
   (m.sourceId==='spaceforce-news-rss')!==(m.matchRule==='official-rss-exact-designation-and-local-date')||
   m.accessStatus!=='not-evaluated'||m.launchStatus!=='not-evaluated'||
   typeof m.noticeTitle!=='string'||m.noticeTitle.length<10||m.noticeTitle.length>150)
   throw Error('reconciliation-match-invalid');
  used.add(m.launchId);
  matches.push({launchId:m.launchId,region:m.region,sourceId:m.sourceId,
   articleUrl:m.articleUrl,noticeTitle:asText(m.noticeTitle,150),
   officialEventDate:m.officialEventDate,publishedDate:m.publishedDate,
   missionMarker:m.missionMarker,sourceFingerprint:m.sourceFingerprint,
   dateDifferenceDays:m.dateDifferenceDays,matchRule:m.matchRule,
   accessStatus:'not-evaluated',launchStatus:'not-evaluated'});
 }
 return {version:1,checkedAt:asIso(at),health:raw.health,
   manifestCheckedAt:stamp?asIso(when(stamp)):null,matches,sourceStatus:status,
   candidateCount:raw.candidateCount,unmatched:raw.unmatched,conflicts:raw.conflicts};
}
const localDay=(whenMs,region)=>{
 try{
  const zone=region==='california'?'America/Los_Angeles':'America/New_York';
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(whenMs));
  const get=t=>parts.find(p=>p.type===t)?.value;
  return get('year')+'-'+get('month')+'-'+get('day');
 }catch{return null;}
};
function missionMarkers(name){
 const text=String(name||'').toUpperCase().replace(/[–—]/g,'-');
 const output=new Set();
 const patterns=[
  ['STARLINK',/\bSTARLINK[\s-]+(?:GROUP[\s-]+)?(\d{1,2})\s*-\s*(\d{1,3})\b/g],
  ['USSF',/\bUSSF[\s-]+(\d{2,4})\b/g],
  ['NROL',/\bNROL[\s-]+(\d{2,4})\b/g],
  ['TRANSPORTER',/\bTRANSPORTER[\s-]+(\d{1,3})\b/g],
  ['BANDWAGON',/\bBANDWAGON[\s-]+(\d{1,3})\b/g],
  ['CRS',/\bCRS[\s-]+(\d{1,3})\b/g],
  ['NG',/\bNG[\s-]+(\d{1,3})\b/g],
  ['HASTE',/\bHASTE[\s-]+(\d{1,3})\b/g],
  ['ARTEMIS',/\bARTEMIS[\s-]+(II|III|IV|V|VI)\b/g]
 ];
 for(const [stem,rx]of patterns)for(const match of text.matchAll(rx)){
  output.add(stem+'-'+(stem==='STARLINK'?match[1]+'-'+match[2]:match[1]));
 }
 if(/\bTOMEX\+(?!\w)/.test(text))output.add('TOMEX+');
 return output;
}
function verifyMissionLinks(recon,schedule){
 if(!recon)return null;
 if(!schedule||schedule.freshness!=='recent'||!Array.isArray(schedule.launches)){
  return {...recon,health:'schedule-unavailable',matches:[],manifestCheckedAt:null};
 }
 const byId=new Map(schedule.launches.map(m=>[m.id,m]));
 const eligible=recon.matches.filter(m=>{
  const mission=byId.get(m.launchId);
  if(!mission||mission.region!==m.region||mission.sourceStale===true||
    !missionMarkers(mission.name).has(m.missionMarker))return false;
  const day=localDay(Date.parse(mission.net||''),m.region);
  return day&&Math.abs((Date.parse(day+'T12:00:00Z')-
   Date.parse(m.officialEventDate+'T12:00:00Z'))/86400000)<=1;
 });
 return {...recon,matches:eligible,health:eligible.length?'matched-with-current-ll2':'no-verified-match'};
}
function validateSnapshot(raw,now=Date.now()){
 if(!raw||raw.version!==1||!raw.regions||Array.isArray(raw.regions)||
   typeof raw.regions!=='object')throw Error('invalid-snapshot-schema');
 const t=when(raw.checkedAt);
 if(!t||Math.abs(now-t)>30*60000)throw Error('collection-date-not-current');
 if(Object.keys(raw.regions).sort().join(',')!==[...REGIONS].sort().join(','))throw Error('region-set-invalid');
 const regions={};let count=0,received=0;
 for(const region of REGIONS){
  const arr=raw.regions[region];
  if(!Array.isArray(arr)||arr.length<1||arr.length>5)throw Error('region-sources-invalid');
  regions[region]=[];
  for(const record of arr){
   if(!record||typeof record!=='object'||!Array.isArray(record.signals)||
     record.signals.length>4||!Array.isArray(record.notes)||record.notes.length>2)
     throw Error('source-shape-invalid');
   const spec=SOURCES[record.id];
   if(!spec||spec[0]!==region||record.region!==region||
     spec[1]!==record.sourceUrl||spec[2]!==record.scope||
     !STATUS.has(record.status)||when(record.checkedAt)!==t)
     throw Error('source-provenance-invalid');
   const fingerprint=record.fingerprint===null?null:typeof record.fingerprint==='string'&&/^[0-9a-f]{24}$/.test(record.fingerprint)?
     record.fingerprint:null;
   if(record.status==='unavailable'&&(record.signals.length||fingerprint))throw Error('outage-has-claims');
   const signals=record.signals.map(v=>normalizeSignal(v,spec[1],t));
   if(signals.some(x=>x===null))throw Error('signal-untrusted');
   regions[region].push({id:record.id,sourceUrl:spec[1],scope:spec[2],status:record.status,
     checkedAt:asIso(t),fingerprint,signals,notes:record.notes.map(n=>asText(n,220))});
   count++;
   if(record.status==='retrieved')received++;
  }
 }
 if(count!==Object.keys(SOURCES).length||raw.sourceCount!==count)
   throw Error('source-inventory-incomplete');
 if(regions.alaska.length!==2||regions.california.length!==2||
   regions.florida.length!==2||regions.hawaii.length!==1||
   regions.texas.length!==1||regions.virginia.length!==2)throw Error('source-count-invalid');
 // Ensure exactly one copy of each official source; no hidden extra source.
 const ids=REGIONS.flatMap(r=>regions[r].map(s=>s.id));
 if(new Set(ids).size!==count)throw Error('duplicate-official-source');
 return {version:1,checkedAt:asIso(t),sourceCount:count,availableSources:received,
   partial:regions[REGIONS[0]].some(x=>x.status!=='retrieved')||received!==count,
   coverageRule:'Official source evidence is not launch permission, safety-zone activation, or a guaranteed schedule.',
   regions,reconciliation:validateReconciliation(raw.reconciliation,t)};
}
function withHistory(snapshot,previous,now=Date.now()){
 for(const region of REGIONS)for(const src of snapshot.regions[region]){
  const prior=previous?.regions?.[region]?.find(p=>p.id===src.id);
  const changed=Boolean(src.fingerprint&&prior?.fingerprint&&src.fingerprint!==prior.fingerprint);
  // "changed" describes normalized public text, never a detected closure.
  src.changedSinceLastCheck=changed;
  src.lastEvidenceChangeAt=changed?asIso(now):
    prior?.lastEvidenceChangeAt||null;
 }
 const current=snapshot.reconciliation,prior=previous?.reconciliation;
 if(current){
  const oldById=new Map((prior?.matches||[]).map(m=>[m.launchId,m]));
  const changes=[...(prior?.history||[])];
  for(const m of current.matches){
   const old=oldById.get(m.launchId);
   if(!old||old.officialEventDate!==m.officialEventDate||
      old.sourceFingerprint!==m.sourceFingerprint){
    changes.unshift({launchId:m.launchId,region:m.region,
      type:!old?'official-link-first-verified':
        old.officialEventDate!==m.officialEventDate?'official-event-date-revised':'official-evidence-changed',
      detectedAt:asIso(now),articleUrl:m.articleUrl,sourceId:m.sourceId,
      detail:'Official article reconciliation changed. This does NOT prove range approval, ticket access or launch completion.'});
   }
  }
  const seen=new Set();
  current.history=changes.filter(e=>{
   const key=[e.launchId,e.type,e.detectedAt].join('|');
   if(seen.has(key))return false;seen.add(key);return true;
  }).slice(0,16);
 }
 return snapshot;
}
const freshness=(snapshot,now=Date.now())=>{
 const age=now-when(snapshot?.checkedAt);
 return !snapshot?'unavailable':
   !Number.isFinite(age)||age< -300000?'unavailable':
   age<=FRESH_MS?'recent':
   age<=24*3600000?'late':'stale';
};
async function saveSnapshot(raw,{state=new ToolState(),now=Date.now(),getNational=readNationalSchedule}={}){
 const validated=validateSnapshot(raw,now);
 if(validated.reconciliation){
  const schedule=await getNational(now).catch(()=>null);
  validated.reconciliation=verifyMissionLinks(validated.reconciliation,schedule);
 }
 const previous=await state.get(KEY).catch(()=>null);
 const snapshot=withHistory(validated,previous,now);
 await state.set(KEY,snapshot,{ex:TTL});
 return {sourceCount:snapshot.sourceCount,availableSources:snapshot.availableSources,checkedAt:snapshot.checkedAt,
  changedSources:REGIONS.flatMap(r=>snapshot.regions[r]).filter(s=>s.changedSinceLastCheck).map(s=>s.id)};
}
async function readSnapshot({state=new ToolState(),ready=stateReady,now=Date.now()}={}){
 if(!ready())return {ok:true,version:1,health:'unavailable',checkedAt:null,regions:{}};
 const snapshot=await state.get(KEY).catch(()=>null);
 if(!snapshot||snapshot.version!==1)return {ok:true,version:1,health:'unavailable',checkedAt:null,regions:{}};
 const health=freshness(snapshot,now);
 // Do not present a previously retrieved "Beach is open" or "No closures"
 // as an observed current condition after its freshness window expires.
 const regions={};
 for(const region of REGIONS)regions[region]=(snapshot.regions?.[region]||[]).map(src=>({
  id:src.id,sourceUrl:src.sourceUrl,scope:src.scope,status:src.status,
  checkedAt:src.checkedAt,changedSinceLastCheck:src.changedSinceLastCheck===true,
  lastEvidenceChangeAt:src.lastEvidenceChangeAt||null,
  signals:health==='recent'?src.signals:
    src.signals.filter(s=>s.relevance!=='current-published-status'&&s.relevance!=='dated-road-advisory'),
  sourceFreshness:health,notes:src.notes
 }));
 const rec=snapshot.reconciliation;
 const eligible=health==='recent'&&rec&&
   rec.manifestCheckedAt&&now-when(rec.manifestCheckedAt)<=90*60000&&
   now-when(rec.manifestCheckedAt)>=-300000;
 const reconciliation=rec?{
  version:1,checkedAt:rec.checkedAt,
  health:eligible?rec.health:'unavailable-or-stale',
  manifestCheckedAt:eligible?rec.manifestCheckedAt:null,
  matches:eligible?rec.matches:[],
  sourceStatus:rec.sourceStatus,candidateCount:rec.candidateCount,
  unmatched:rec.unmatched,conflicts:rec.conflicts,
  history:eligible?(rec.history||[]):[]
 }:null;
 return {ok:true,version:1,checkedAt:snapshot.checkedAt,health,regions,
  availableSources:snapshot.availableSources,sourceCount:snapshot.sourceCount,
  coverageRule:snapshot.coverageRule,reconciliation};
}
module.exports={KEY,TTL,FRESH_MS,REGIONS,SOURCES,validateSnapshot,validateReconciliation,verifyMissionLinks,missionMarkers,matchArticle,localDay,withHistory,freshness,saveSnapshot,readSnapshot,normalizeSignal,signalUrl};
