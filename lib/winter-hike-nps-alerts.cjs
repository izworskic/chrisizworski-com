'use strict';
/**
 * Active National Park Service notices for the winter trail research lab.
 *
 * Two distinct truths:
 * - An ACTIVE, route-specific NPS closure can rule out an outing.
 * - No closure in an alert feed NEVER certifies an open trail, plowed road,
 *   cleared parking space, ski-track status, or vehicle-accessible trailhead.
 *
 * Keep this read-only, independent of weather, with no server secret in the
 * public response. Do not accept arbitrary user URLs or park codes.
 */
const PARKS=Object.freeze({
 piro:{url:'https://www.nps.gov/piro/planyourvisit/conditions.htm',
       site:'https://www.nps.gov/piro/park-alerts-piro.json'},
 slbe:{url:'https://www.nps.gov/slbe/planyourvisit/conditions.htm',
       site:'https://www.nps.gov/slbe/park-alerts-slbe.json'}
});
const TRACKED=Object.freeze({
 'piro-sand-point-marsh':{park:'piro',terms:[/\bsand point marsh\b/i,/\bsand point road\b/i]},
 'piro-munising-snowshoe':{park:'piro',terms:[/\bmunising snowshoe\b/i,/\bmunising ski (?:area|trail|lot)\b/i,/\beast city limits road\b/i]},
 'sleepbear-alligator-easy':{park:'slbe',terms:[/\balligator hill\b/i,/\bstocking drive trailhead\b/i]},
 'sleepbear-alligator-intermediate':{park:'slbe',terms:[/\balligator hill\b/i,/\bstocking drive trailhead\b/i]},
 'sleepbear-alligator-advanced':{park:'slbe',terms:[/\balligator hill\b/i,/\bstocking drive trailhead\b/i]},
 'sleepbear-old-indian-green':{park:'slbe',terms:[/\bold indian trail\b/i]},
 'sleepbear-old-indian-black':{park:'slbe',terms:[/\bold indian trail\b/i]},
 'sleepbear-windy-moraine':{park:'slbe',terms:[/\bwindy moraine\b/i]},
 'sleepbear-good-harbor':{park:'slbe',terms:[/\bgood harbor bay\b/i]}
});
const CACHE_MS=12*60*1000;
const cache=new Map();
const clean=v=>String(v??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
 .replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const officialUrl=(v,park)=>{
 try{const u=new URL(v);if(u.protocol!=='https:'||!['nps.gov','www.nps.gov'].includes(u.hostname)||u.username||u.password)return PARKS[park].url;
 return u.toString().slice(0,400);
 }catch{return PARKS[park].url;}
};
function normalize(raw,park,now){
 if(!raw||typeof raw!=='object'||raw.is_active===false||raw.is_active===0)return null;
 const start=Date.parse(raw.start_date||raw.startDate||'');
 const end=Date.parse(raw.end_date||raw.endDate||'');
 if(Number.isFinite(start)&&start>now)return null;
 if(Number.isFinite(end)&&end+86400000<now)return null;
 const title=clean(raw.title).slice(0,150);
 if(!title)return null;
 const category=clean(raw.category||raw.type||'information').toLowerCase().slice(0,40);
 const description=clean(raw.description||raw.body||'').slice(0,450);
 // An undated bulletin saying "Road Closed 10/1-10/14" is not an
 // evergreen active closure. With no actual year, its expiry is ambiguous;
 // show it for reference, but never turn it into a current closure.
 const ambiguousDateRange=/\b\d{1,2}\/\d{1,2}\s*[-–]\s*\d{1,2}\/\d{1,2}\b/.test(title);
 return {title,category,description,url:officialUrl(raw.url||raw.link||PARKS[park].url,park),
  ambiguousDateRange,activeWindowVerified:!ambiguousDateRange};
}
async function requestJson(url,headers,fetcher){
 const r=await fetcher(url,{headers,signal:AbortSignal.timeout(4500)});
 if(!r||!r.ok)throw Error('official NPS alert source unavailable');
 const raw=await r.json();
 if(!raw||typeof raw!=='object')throw Error('unrecognized NPS payload');
 return raw;
}
async function getParkAlerts(park,{fetcher=globalThis.fetch,now=Date.now(),apiKey=process.env.NPS_API_KEY,useCache=true}={}){
 if(!PARKS[park])return{status:'unsupported',alerts:[],checkedAt:null,sourceUrl:null,meaning:'No machine-readable NPS park feed for this route'};
 const cached=cache.get(park);
 if(useCache&&cached&&now-cached.savedAt>=0&&now-cached.savedAt<CACHE_MS)return cached.report;
 const sources=[
  {url:PARKS[park].site,headers:{Accept:'application/json'},format:'park-site'}
 ];
 if(apiKey)sources.push({url:`https://developer.nps.gov/api/v1/alerts?parkCode=${park}&limit=50`,
  headers:{Accept:'application/json','X-Api-Key':apiKey},format:'developer-api'});
 let raw=null,from=null;
 for(const source of sources){
  try{
   const result=await requestJson(source.url,source.headers,fetcher);
   if(source.format==='park-site'&&!Array.isArray(result))throw Error('NPS JSON shape unknown');
   if(source.format==='developer-api'&&!Array.isArray(result.data))throw Error('NPS API shape unknown');
   raw=source.format==='park-site'?result:result.data;from=source.format;break;
  }catch{ /* Try only official NPS alternatives; fail closed. */ }
 }
 const checkedAt=new Date(now).toISOString();
 const report=raw
  ?{status:'official-alerts-checked',sourceType:from,checkedAt,sourceUrl:PARKS[park].url,
    alerts:raw.slice(0,80).map(a=>normalize(a,park,now)).filter(Boolean).slice(0,30),
    meaning:'NPS alerts checked; absence of a route alert does not verify parking, trail access, or snow safety'}
  :{status:'unavailable',sourceType:null,checkedAt,sourceUrl:PARKS[park].url,alerts:[],
    meaning:'NPS current-alert feed unavailable. No assumptions of open roads, parking or trail access.'};
 if(useCache)cache.set(park,{savedAt:now,report});
 return report;
}
function forRoute(routeId,parkReport){
 const match=TRACKED[routeId];
 if(!match)return{status:'not-covered',sourceUrl:null,checkedAt:null,closures:[],advisories:[],
  meaning:'Official current alerts not automatically checked for this route; see the land manager'};
 if(!parkReport||parkReport.status!=='official-alerts-checked')
  return{status:'unavailable',sourceUrl:PARKS[match.park].url,checkedAt:parkReport?.checkedAt||null,closures:[],advisories:[],
   meaning:'NPS live alerts unavailable; no route or parking clearance inferred'};
 const closures=[],advisories=[];
 for(const alert of parkReport.alerts){
  const hay=`${alert.title} ${alert.description}`;
  const relevant=match.terms.some(t=>t.test(hay));
  const parkWide=/\b(?:entire (?:park|lakeshore)|all (?:park|lakeshore) (?:trails|roads)|park[- ]wide)\b/i.test(hay);
  if(!relevant&&!parkWide)continue;
  if(/closure/i.test(alert.category)&&/\b(?:closed|closure|no access|inaccessible)\b/i.test(hay)
     &&alert.activeWindowVerified)closures.push(alert);
  else advisories.push(alert);
 }
 const blockedKinds=[...new Set(closures.flatMap(a=>{
  const text=a.title+' '+a.description;
  if(/\b(?:entire (?:park|lakeshore)|park[- ]wide|all trails)\b/i.test(text))return ['trail','road'];
  const target=[];
  if(/\b(?:road|drive|highway|vehicle access|approach)\b/i.test(text))target.push('road');
  if(/\b(?:trail|boardwalk|footpath|snowshoe)\b/i.test(text))target.push('trail');
  return target.length?target:['trail'];
 }))];
 return{status:closures.length?'official-closure':'official-alerts-checked',sourceUrl:parkReport.sourceUrl,
   checkedAt:parkReport.checkedAt,blockedKinds,closures:closures.slice(0,8),advisories:advisories.slice(0,8),
   meaning:closures.length?'Route-specific NPS closure notice currently present. Do not travel on the closed route.':
     'No route-specific confirmed closure in checked NPS alerts. This DOES NOT prove road, trail or parking access.'};
}
async function forRouteLive(routeId,options={}){
 const match=TRACKED[routeId];
 if(!match)return forRoute(routeId,null);
 return forRoute(routeId,await getParkAlerts(match.park,options));
}
module.exports={PARKS,TRACKED,normalize,getParkAlerts,forRoute,forRouteLive,clean};
