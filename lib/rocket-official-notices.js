'use strict';
/**
 * Versioned Python -> Node/Postgres official-notice evidence contract.
 * No unsigned data, user-submitted source URLs, future access prediction,
 * guessed launch/marine safety clearances, or duplicate LL2 collection.
 */
const {ToolState,stateReady}=require('./tool-state');
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
const KIND=new Set(['access-status','road-status','historical-order-index','notice-check-required','schedule-status','access-policy','source-link','official-article']);
const RELEVANCE=new Set(['current-published-status','historical-only','review-required','policy-only','unmatched-official-article']);
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
function normalizeSignal(v,source){
 if(!v||!KIND.has(v.kind)||!RELEVANCE.has(v.relevance))return null;
 const url=signalUrl(v.sourceUrl,source);
 const title=asText(v.title,150),detail=asText(v.detail,320);
 if(!url||title.length<5||detail.length<20)return null;
 const date=v.publishedDate===null?null:typeof v.publishedDate==='string'&&/^\d{4}-\d\d-\d\d$/.test(v.publishedDate)?
   v.publishedDate:null;
 return {kind:v.kind,title,detail,sourceUrl:url,publishedDate:date,
   relevance:v.relevance,scope:asText(v.scope,90)};
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
   const signals=record.signals.map(v=>normalizeSignal(v,spec[1]));
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
   regions};
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
 return snapshot;
}
const freshness=(snapshot,now=Date.now())=>{
 const age=now-when(snapshot?.checkedAt);
 return !snapshot?'unavailable':
   !Number.isFinite(age)||age< -300000?'unavailable':
   age<=FRESH_MS?'recent':
   age<=24*3600000?'late':'stale';
};
async function saveSnapshot(raw,{state=new ToolState(),now=Date.now()}={}){
 const validated=validateSnapshot(raw,now);
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
    src.signals.filter(s=>s.relevance!=='current-published-status'),
  sourceFreshness:health,notes:src.notes
 }));
 return {ok:true,version:1,checkedAt:snapshot.checkedAt,health,regions,
  availableSources:snapshot.availableSources,sourceCount:snapshot.sourceCount,
  coverageRule:snapshot.coverageRule};
}
module.exports={KEY,TTL,FRESH_MS,REGIONS,SOURCES,validateSnapshot,withHistory,freshness,saveSnapshot,readSnapshot,normalizeSignal,signalUrl};
