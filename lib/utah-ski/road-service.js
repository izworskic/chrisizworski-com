'use strict';
// One unparameterized, public canyon snapshot. Vercel's included CDN provides
// shared regional caching. Never promise this is a globally atomic rate limit.
const {diagnostic}=require('./udot-fetch');
const {ROUTES,clean}=require('./udot');
const SOURCE='https://cottonwoodcanyons.udot.utah.gov/';
const CACHE_MS=10*60*1000,FAILURE_MS=2*60*1000;
const ROUTES_ALL=['SR190','SR210'];
function unknown(route,at,reason='FEED_UNAVAILABLE'){
 return {canyon:ROUTES[route].name,status:'UNKNOWN',reason,observedAt:new Date(at).toISOString(),
   openConfirmed:false,matchedSignalCount:0,signalTypes:[],surfaceReports:[],officialSource:SOURCE};
}
function safeContext(feeds,route,epochSec){
 const rows=Array.isArray(feeds)?feeds:[],matches=[];
 for(const row of rows){
  if(!row||typeof row!=='object'||!ROUTES[route].pattern.test(clean(row.RoadwayName)))continue;
  const t=Number(row.LastUpdated);
  const updated=Number.isFinite(t)&&t>1e9?(t>1e11?Math.floor(t/1000):t):null;
  const fresh=updated!==null&&epochSec-updated<=1800&&epochSec-updated>=-120;
  if(!fresh)continue;
  const surface=clean(row.RoadCondition).slice(0,95);
  const weather=clean(row.WeatherCondition).slice(0,95);
  const restriction=clean(row.Restriction).slice(0,135);
  if(surface||weather||restriction)matches.push({surface,weather,restriction,
     updatedAt:new Date(updated*1000).toISOString()});
 }
 return matches.slice(0,3);
}
function summarize(data,now=Date.now()){
 const health=data?.health||{};
 const apiCoverage=Object.fromEntries(['events','roadconditions','messagesigns'].map(k=>[k,health[k]||'UNAVAILABLE']));
 const healthy=Object.values(apiCoverage).every(v=>v==='RECEIVED');
 const partiallyAvailable=Object.values(apiCoverage).some(v=>v==='RECEIVED');
 const canyons={};
 for(const route of ROUTES_ALL){
  const report=data?.canyons?.[route],safe=report&&typeof report==='object'?report:unknown(route,now);
  // Partial feed never becomes authoritative "no blocker" confirmation.
  let status=safe.status||'UNKNOWN',reason=safe.reason||'UNVERIFIED_SOURCE';
  if(!healthy&&status==='NO_CONFIRMED_BLOCKER'){status='UNKNOWN';reason='INCOMPLETE_PROVIDER_COVERAGE';}
  const entries=Array.isArray(safe.signals)?safe.signals:[];
  canyons[route]={canyon:ROUTES[route].name,status,reason,
   observedAt:new Date(now).toISOString(),openConfirmed:false,
   matchedSignalCount:entries.length,
   signalTypes:entries.slice(0,24).map(s=>({feed:s.type,kind:s.kind,fresh:s.fresh===true})),
   surfaceReports:safeContext(data?.roadconditions?.rows,route,Math.floor(now/1000)),
   officialSource:SOURCE};
 }
 return {version:'v2',source:'UDOT Traffic developer API',officialSource:SOURCE,
  observedAt:new Date(now).toISOString(),sourceHealth:healthy?'COMPLETE':partiallyAvailable?'PARTIAL':'UNAVAILABLE',
  apiCoverage,canyons,openConfirmed:false,
  disclaimer:'Interpreted feed signals, not official clearance. Check UDOT immediately before travel.'};
}
function createService({load=diagnostic,clock=()=>Date.now(),cacheMs=CACHE_MS,failureMs=FAILURE_MS}={}){
 let state=null,flight=null;
 async function get(key){
  const now=clock();
  if(state&&now-state.stamp<state.ttl)return state.data;
  if(flight)return flight;
  flight=(async()=>{
   let result;
   if(!key)result=summarize({health:{events:'MISSING_KEY',roadconditions:'MISSING_KEY',messagesigns:'MISSING_KEY'}},clock());
   else{
    try{
     const feed=await load({key,now:Math.floor(clock()/1000),timeoutMs:5000});
     result=summarize(feed,clock());
    }catch(_){result=summarize(null,clock());}
   }
   // One instance contacts the provider at most once per cache period. 429s
   // and failures back off; the CDN is the public shared cache layer.
   state={stamp:clock(),ttl:result.sourceHealth==='COMPLETE'?cacheMs:failureMs,data:result};
   return result;
  })().finally(()=>{flight=null;});
  return flight;
 }
 return {get};
}
const live=createService();
module.exports={createService,summarize,safeContext,unknown,live,CACHE_MS,FAILURE_MS};
