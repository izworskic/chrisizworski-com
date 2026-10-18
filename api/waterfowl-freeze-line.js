'use strict';
// Waterfowl Freeze-Line Tracker. Forecast exposure is NOT measured wetland ice or a bird count.
const REGIONS=Object.freeze([
 {id:'upper-peninsula',name:'Central Upper Peninsula',state:'MI',lat:46.25,lon:-87.05,habitat:'Interior marshes and sheltered bays'},
 {id:'northern-lower',name:'Northern Lower Michigan',state:'MI',lat:45.08,lon:-84.72,habitat:'Inland marshes and protected lake coves'},
 {id:'saginaw-bay',name:'Saginaw Bay & Shiawassee Flats',state:'MI',lat:43.55,lon:-83.87,habitat:'Open bay, river mouths and refuge wetlands'},
 {id:'detroit-river',name:'Detroit River & Lake St. Clair',state:'MI',lat:42.40,lon:-82.98,habitat:'Big water, river channels and coastal marshes'},
 {id:'western-lake-erie',name:'Western Lake Erie Marshes',state:'OH',lat:41.60,lon:-83.22,habitat:'Coastal wetlands and shallow western basin'},
 {id:'green-bay',name:'Green Bay & Door Peninsula',state:'WI',lat:44.73,lon:-87.85,habitat:'Coastal marshes and large sheltered bays'},
 {id:'horicon-marsh',name:'Horicon Marsh',state:'WI',lat:43.48,lon:-88.62,habitat:'Managed wetland complex and surrounding fields'},
 {id:'upper-mississippi',name:'Upper Mississippi Pools',state:'WI',lat:43.87,lon:-91.24,habitat:'River backwaters, sloughs and open channels'},
 {id:'minnesota-valley',name:'Minnesota River Valley',state:'MN',lat:44.67,lon:-93.63,habitat:'Refuge wetlands and river backwaters'},
 {id:'iowa-mississippi',name:'Iowa Mississippi Corridor',state:'IA',lat:41.97,lon:-90.36,habitat:'Backwater pools and agricultural feeding areas'},
 {id:'illinois-river',name:'Illinois River Valley',state:'IL',lat:40.25,lon:-90.24,habitat:'Floodplain lakes and seasonally flooded wetlands'},
 {id:'kankakee',name:'Kankakee Marsh Region',state:'IN',lat:41.18,lon:-86.85,habitat:'Wetland remnants, rivers and farm fields'},
 {id:'swan-lake',name:'Swan Lake & Grand River',state:'MO',lat:39.53,lon:-93.23,habitat:'Refuges, river corridors and agricultural fields'},
 {id:'reelfoot',name:'Reelfoot Lake',state:'TN',lat:36.37,lon:-89.36,habitat:'Large shallow lake and flooded timber'}
]);
const NOAA_SNOW='https://www.nohrsc.noaa.gov/nsa/';
const OBS='https://api.inaturalist.org/v1/observations';
const H={'Accept':'application/geo+json, application/json','User-Agent':'WaterfowlFreezeLine/1.0 (https://chrisizworski.com/waterfowl-freeze-line/)'};
const cache=new Map();
async function json(url,ms=6500,headers=H){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),ms);
 try{const response=await fetch(url,{headers,signal:ctl.signal});if(!response.ok)throw Error('Upstream '+response.status);return await response.json();}
 finally{clearTimeout(timer);}
}
function cacheGet(key){const v=cache.get(key);return v&&v.until>Date.now()?v.body:null;}
function cacheSet(key,body,ttl){cache.set(key,{body,until:Date.now()+ttl});return body;}
function summarizeWeather(periods,now=Date.now()){
 const hours=(Array.isArray(periods)?periods:[]).filter(p=>p&&Number.isFinite(Number(p.temperature))&&Date.parse(p.startTime)>=now-90*60*1000).slice(0,72);
 if(hours.length<16)return {status:'unavailable',note:'Too few valid NWS forecast hours'};
 function fahrenheit(p){return p.temperatureUnit==='C'?Number(p.temperature)*9/5+32:Number(p.temperature);}
 const values=hours.map(fahrenheit),early=values.slice(0,6),next=values.slice(6,42);
 const freeze24=values.slice(0,24).filter(x=>x<=32).length,freeze72=values.filter(x=>x<=32).length;
 const first24=Math.min(...early),later=next.length?Math.min(...next):first24,drop=Math.max(0,Math.round(first24-later));
 const trend=drop>=12?'notable cooling forecast':drop>=6?'cooling forecast':'no sharp cooling forecast';
 const pressure=freeze72>=42?'strong':freeze72>=18?'building':'limited';
 return {status:'forecast',issuedAt:hours[0].startTime,validHours:hours.length,freezingHours24:freeze24,freezingHours72:freeze72,
  firstTemperatureF:Math.round(values[0]),lowestTemperatureF:Math.round(Math.min(...values)),temperatureDropF:drop,trend,pressure,
  series:hours.filter((_,i)=>i%6===0).map(p=>({time:p.startTime,tempF:Math.round(fahrenheit(p))})),
  snowCover:'not measured',wetlandIce:'not measured',birdMovement:'not predicted'};
}
async function weatherFor(region){
 try{
  const point=await json('https://api.weather.gov/points/'+region.lat+','+region.lon,5800);
  const path=point&&point.properties&&point.properties.forecastHourly;
  if(!path||!/^https:\/\/api\.weather\.gov\//.test(path))throw Error('No valid hourly grid link');
  const forecast=await json(path,6900);
  return summarizeWeather(forecast&&forecast.properties&&forecast.properties.periods);
 }catch(e){return {status:'unavailable',note:'NWS hourly forecast could not be retrieved'};}
}
function cleanReport(o){
 const when=String(o.observed_on||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(when))return null;
 const taxon=o.taxon||{};
 const species=String(taxon.preferred_common_name||taxon.name||o.species_guess||'Waterfowl').slice(0,80);
 // Never surface coordinates: user/private and taxon-sensitive locations may be obscured.
 return {date:when,species,quality:o.quality_grade==='research'?'Research grade':'Community observation',
  sourceUrl:'https://www.inaturalist.org/observations/'+Number(o.id)};
}
async function sightingsFor(r,now=Date.now()){
 const end=new Date(now).toISOString().slice(0,10),start=new Date(now-13*86400000).toISOString().slice(0,10);
 const p=new URLSearchParams({taxon_id:'6912',d1:start,d2:end,swlat:String(r.lat-.65),swlng:String(r.lon-.90),
  nelat:String(r.lat+.65),nelng:String(r.lon+.90),per_page:'100',order_by:'observed_on',order:'desc',quality_grade:'research'});
 try{
  const response=await json(OBS+'?'+p,7000,{'Accept':'application/json','User-Agent':'WaterfowlFreezeLine/1.0 (+https://chrisizworski.com/waterfowl-freeze-line/)'});
  const total=Number(response.total_results);
  const reports=(response.results||[]).map(cleanReport).filter(Boolean).slice(0,8);
  return {status:'reported',source:'iNaturalist',windowStart:start,windowEnd:end,
    reportsInQuery:Number.isSafeInteger(total)?total:null,sample:reports,sampleMayBeIncomplete:total>100,
    meaning:'Individual public research-grade observations, NOT birds counted, flock size, complete migration or confirmed current presence.',
    observedLocation:'Regional bounding box, not verified within named refuge',sourceUrl:'https://www.inaturalist.org/observations?taxon_id=6912&d1='+start+'&d2='+end};
 }catch(e){return {status:'unavailable',source:'iNaturalist',windowStart:start,windowEnd:end,
  reportsInQuery:null,sample:[],meaning:'Observation feed unavailable; no inference about waterfowl presence or absence.'};}
}
async function pool(items,n,fn){let index=0;const output=new Array(items.length);await Promise.all(Array.from({length:n},async()=>{while(index<items.length){const i=index++;output[i]=await fn(items[i]);}}));return output;}
function base(r){return {id:r.id,name:r.name,state:r.state,lat:r.lat,lon:r.lon,habitat:r.habitat};}
async function overview(){
 const regions=await pool(REGIONS,5,async r=>({...base(r),weather:await weatherFor(r)}));
 return {generatedAt:new Date().toISOString(),mode:'overview',regions,forecastCoverage:regions.filter(r=>r.weather.status==='forecast').length,
  interpretation:'Weather forecast exposure only. Not a confirmed freeze line, open-water map, migration prediction or bird concentration ranking.',
  sources:{weather:'National Weather Service hourly forecast',snow:'NOAA NOHRSC snow analysis (reference map; not yet scored)',observations:'iNaturalist (on selected region)'},
  nohrsc:NOAA_SNOW};
}
async function detail(r){
 const results=await Promise.all([weatherFor(r),sightingsFor(r)]);
 return {generatedAt:new Date().toISOString(),mode:'region',region:base(r),weather:results[0],sightings:results[1],
  snow:{status:'not_sourced_for_point',source:NOAA_SNOW,note:'Review the official NOAA snow-depth map. No local snow-depth value is used in this model.'},
  ice:{status:'unverified',note:'NWS air forecasts are not a wetland ice sensor. Ice remains unverified.'}};
}
async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Cache-Control','public, s-maxage=1200, stale-while-revalidate=2400');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const mode=String((req.query||{}).mode||'overview');
 if(mode!=='overview'&&mode!=='region')return res.status(400).json({error:'Unknown mode'});
 const id=String((req.query||{}).region||'');
 const r=REGIONS.find(x=>x.id===id);
 if(mode==='region'&&!r)return res.status(400).json({error:'Unknown region'});
 const key=mode==='overview'?'overview':'region:'+id,hit=cacheGet(key);
 if(hit)return res.status(200).json(hit);
 try{const data=mode==='overview'?await overview():await detail(r);return res.status(200).json(cacheSet(key,data,mode==='overview'?1200000:900000));}
 catch(e){return res.status(503).json({error:'Regional data temporarily unavailable',generatedAt:new Date().toISOString()});}
}
module.exports=handler;
module.exports._test={REGIONS,summarizeWeather,cleanReport};
