'use strict';
// Shared cross-border API contract. Legacy regional endpoints remain intact.
// Only registered IDs are accepted; never fetch caller-supplied coordinates or URLs.
const {buildRegistry,distanceKm}=require('./beach-registry.js');
const us=require('./us-coast.js');
const ca=require('./canada.js');
const mi=require('../../data/beaches.json');
const MAX_BATCH=4,MAX_CACHE=256,CACHE_MS=120000;
let index;
function registryIndex(){
 if(!index){
  const registry=buildRegistry(),byKey=new Map();
  for(const e of registry.entries){byKey.set(e.id,e);for(const ref of e.refs)byKey.set(ref.key,e);}
  index={registry,byKey};
 }
 return index;
}
function descriptor(entry){
 if(!entry?.mapEligible)return null;
 // Always use the same source reference for the canonical ID and its aliases.
 const first=entry.refs[0],adapter=first.forecast.adapter,key=first.forecast.key;
 if(adapter==='ca'){
  const beach=ca.bySlug.get(key);
  return beach?{provider:'ECCC',beach,ref:first}:null;
 }
 if(adapter==='us'){
  const beach=us.bySlug.get(key);
  return beach?{provider:'NWS',beach,ref:first}:null;
 }
 if(adapter==='mi'){
  const beach=mi.beaches.find(b=>b.slug===key);
  if(!beach||beach.swimming===false)return null;
  const safety=us.STATE_SAFETY.MI;
  return {provider:'NWS',ref:first,beach:{slug:key,name:beach.name,country:'US',state:'MI',
   lake:entry.lake||'Great Lakes',lat:entry.point.lat,lon:entry.point.lon,
   forecastReference:{lat:entry.point.lat,lon:entry.point.lon},parkUrl:safety.url,safety}};
 }
 return null;
}
// Exact upstream URLs only. Concurrent requests for the same official grid
// share a promise; failures never remain cached. Bounded warm-process cache,
// not a database or an assertion of cross-instance persistence.
function createReader(read,{clock=Date.now,ttl=CACHE_MS,max=MAX_CACHE}={}){
 const store=new Map();
 return function cached(url){
  const now=clock(),existing=store.get(url);
  if(existing&&(existing.pending||existing.until>now))return existing.promise;
  if(existing)store.delete(url);
  for(const [key,value] of store)if(!value.pending&&value.until<=now)store.delete(key);
  if(store.size>=max){
   const removable=[...store].find(([,v])=>!v.pending);
   if(removable)store.delete(removable[0]);
   else return Promise.resolve().then(()=>read(url));
  }
  const item={pending:true,until:0,promise:null};
  item.promise=Promise.resolve().then(()=>read(url)).then(value=>{
   item.pending=false;item.until=clock()+ttl;return value;
  },error=>{if(store.get(url)===item)store.delete(url);throw error;});
  store.set(url,item);return item.promise;
 };
}
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const round=v=>Math.round(v);
function unknown(entry,provider,reason){
 return {id:entry.id,name:entry.name,country:entry.country,lake:entry.lake,provider,status:'unavailable',
  validAt:null,issuedAt:null,airF:null,feelsLikeF:null,windMph:null,windFrom:null,method:null,
  forecastReference:null,water:null,lakeEffect:null,hours:[],swimStatus:'unknown',access:'not-verified-current',
  calibratedOnSand:false,reason:reason||'A recent nearby forecast could not be verified.'};
}
function normalize(entry,d,raw,now,detail){
 const provider=d.provider;
 if(raw?.status!=='forecast-based'||raw.beach!==d.beach.slug)return unknown(entry,provider,raw?.reason);
 const canadian=provider==='ECCC',validAt=canadian?raw.validAt:raw.asOf,issuedAt=canadian?raw.forecastIssueAt:raw.issuedAt;
 const valid=Date.parse(validAt||''),issued=Date.parse(issuedAt||''),t=now.getTime();
 const air=canadian?raw.temperatureF:raw.airF;
 const feels=canadian?raw.shorelineRealFeel?.temperatureF:raw.feelsLikeF;
 const wind=canadian?(finite(raw.windKmh,0,180)?raw.windKmh/1.609344:null):raw.windMph;
 const direction=canadian?raw.windDirection:raw.windFrom;
 if(!Number.isFinite(valid)||!Number.isFinite(issued)||valid<t-3600000||valid>t+(canadian?5400000:0)||
    issued<t-(canadian?24:18)*3600000||issued>t+3600000||
    !finite(air,-60,131)||!finite(feels,-103,149)||typeof raw.method!=='string'||!raw.method)
  return unknown(entry,provider,'Forecast values or timestamps did not pass the shared source gate.');
 let reference=null;
 if(canadian){
  if(!finite(raw.forecastDistanceKm,0,55)||typeof raw.forecastPlace!=='string'||!/^on-\d+$/.test(raw.forecastId||''))
   return unknown(entry,provider,'No verified nearby Canadian forecast reference.');
  reference={kind:'city-area',name:raw.forecastPlace,distanceKm:raw.forecastDistanceKm,sourceId:raw.forecastId};
 }else{
  const point=raw.reference;
  if(!finite(point?.lat,40,49)||!finite(point?.lon,-93,-76)||!us.officialNwsUrl(raw.gridUrl))
   return unknown(entry,provider,'No verified NWS land forecast reference.');
  const km=distanceKm(entry.point,point);
  if(km>2.1)return unknown(entry,provider,'Forecast grid is too far from the mapped beach.');
  reference={kind:'land-grid',lat:point.lat,lon:point.lon,distanceKm:Math.round(km*100)/100,sourceId:raw.gridUrl};
 }
 const evidence=raw.shorelineRealFeel,water=evidence?.water;
 const waterAge=(t-Date.parse(water?.observedAt||''))/3600000;
 const waterOK=detail&&water?.kind==='satellite'&&finite(water.tempF,28.4,96.8)&&
  finite(water.distanceKm,0,4)&&finite(waterAge,0,36);
 const hours=detail&&Array.isArray(raw.hours)?raw.hours.filter(h=>finite(h.airF,-60,131)&&finite(h.feelsLikeF,-103,149)&&
  Number.isFinite(Date.parse(h.validAt))&&Date.parse(h.validAt)+3600000>t&&Date.parse(h.validAt)<=t+12*3600000&&typeof h.method==='string').slice(0,12):[];
 return {id:entry.id,name:entry.name,country:entry.country,lake:entry.lake,provider,
  status:valid>t?'upcoming':'forecast-based',validAt:new Date(valid).toISOString(),issuedAt:new Date(issued).toISOString(),
  airF:round(air),feelsLikeF:round(feels),airC:round((air-32)*5/9),feelsLikeC:round((feels-32)*5/9),
  windMph:finite(wind,0,112)?round(wind):null,windFrom:/^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)$/.test(direction||'')?direction:null,
  method:raw.method,forecastReference:reference,water:waterOK?water:null,
  lakeEffect:detail&&evidence?.lakeEffect?{status:waterOK?evidence.lakeEffect.status:'unverified',
   label:waterOK?evidence.lakeEffect.label:'Local lake influence not verified',
   explanation:waterOK?evidence.lakeEffect.explanation:'No sufficiently close recent offshore water evidence was verified.'}:null,
  hours,swimStatus:'unknown',access:'not-verified-current',calibratedOnSand:false,
  scope:'Modeled air comfort near the beach, not measured air on the sand. Water and wind are separate context, not a numeric shoreline correction.',
  officialAdvisory:canadian?d.beach.advisory.url:d.beach.safety.url,
  guide:detail?entry.refs.find(ref=>!ref.key.startsWith('epa:'))?.guide||d.ref.guide:undefined};
}
function parseRequest(query,byKey){
 const single=query?.id,batch=query?.ids;
 if((single===undefined)===(batch===undefined)||query?.beach!==undefined)return null;
 const value=single===undefined?batch:single;
 if(typeof value!=='string'||value.length>400)return null;
 const keys=single===undefined?value.split(','):[value];
 if(!keys.length||keys.length>MAX_BATCH||keys.some(k=>!byKey.has(k)))return null;
 const entries=[...new Map(keys.map(k=>{const e=byKey.get(k);return [e.id,e];})).values()];
 if(entries.some(e=>!descriptor(e)))return null;
 return {detail:single!==undefined,entries};
}
let nwsReader,ecccReader;
async function handleUnified(req,res,{usLookup,nwsRead},deps={}){
 const {byKey}=registryIndex(),request=parseRequest(req.query,byKey);
 if(!request){res.setHeader('Cache-Control','no-store');return res.status(400).json({error:'Choose one registered beach ID or up to four comma-separated beach IDs.'});}
 const canada=deps.canada||require('../../api/shorefeel-ca.js');
 const now=deps.now||new Date();
 if(!nwsReader)nwsReader=createReader(nwsRead);
 if(!ecccReader)ecccReader=createReader(canada.retrieve);
 const results=await Promise.all(request.entries.map(async entry=>{
  const d=descriptor(entry),opts={unified:true,allowNearby:true,includeWater:request.detail,read:d.provider==='NWS'?(deps.nwsReader||nwsReader):(deps.ecccReader||ecccReader)};
  try{
   const raw=await (d.provider==='NWS'?usLookup:canada.lookup)(d.beach,now,opts);
   return normalize(entry,d,raw,now,request.detail);
  }catch{return unknown(entry,d.provider);}
 }));
 res.setHeader('Cache-Control',results.every(r=>r.status==='forecast-based'||r.status==='upcoming')?'public, max-age=0, s-maxage=120':'no-store');
 return res.status(200).json({version:'shorefeel-2.0',mode:request.detail?'detail':'map',generatedAt:now.toISOString(),results});
}
module.exports={MAX_BATCH,createReader,registryIndex,descriptor,normalize,parseRequest,handleUnified};
