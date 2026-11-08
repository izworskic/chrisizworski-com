'use strict';
// Fixed, sourced U.S. public shoreline locations; never a user-coordinate proxy.
// NWS shore forecast + active alerts are context, not current conditions, official
// venue access or a navigational/marine safety determination.
const {getSite,publicSite}=require('../lib/freighter-watch-sites');
const NWS='https://api.weather.gov';
const HEADERS={Accept:'application/geo+json, application/json',
  'User-Agent':'ChrisIzworskiFreighterWatch/1.0 (https://chrisizworski.com/great-lakes-ship-watching-spots/)'};
function forecastHref(value) {
 try{const url=new URL(String(value));
   return url.protocol==='https:'&&url.hostname==='api.weather.gov'&&
     /^\/gridpoints\/[A-Z]{3}\/\d+,\d+\/forecast\/hourly$/.test(url.pathname)?url.href:null;
 }catch{return null;}
}
async function requestJson(url){
 const response=await fetch(url,{headers:HEADERS,signal:AbortSignal.timeout(7500)});
 if(!response.ok)throw Error('NWS service unavailable');
 return response.json();
}
function number(value) {
 return typeof value==='number'&&Number.isFinite(value)?value:null;
}
function windMph(speed) {
 if(typeof speed!=='string')return null;
 const numbers=[...speed.matchAll(/\d+(?:\.\d+)?/g)].map(match=>Number(match[0]));
 if(!numbers.length)return null;
 const largest=Math.max(...numbers);
 return Math.round(largest* (/\bknots?\b|\bkt\b/i.test(speed)?1.15078:/\bkm\/?h\b/i.test(speed)?0.621371:1));
}
function period(p){
 const start=Date.parse(p?.startTime||''),end=Date.parse(p?.endTime||'');
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>7*3600000)return null;
 const temp=number(p.temperature);
 return {
   starts:new Date(start).toISOString(),ends:new Date(end).toISOString(),
   isDaytime:typeof p.isDaytime==='boolean'?p.isDaytime:null,
   temperatureF:temp===null?null:p.temperatureUnit==='C'?Math.round(temp*9/5+32):p.temperatureUnit==='F'?temp:null,
   windMph:windMph(p.windSpeed),windDirection:typeof p.windDirection==='string'?p.windDirection:null,
   precipProbability:number(p.probabilityOfPrecipitation?.value),
   shortForecast:typeof p.shortForecast==='string'?p.shortForecast.slice(0,180):null
 };
}
function alert(feature) {
 const p=feature?.properties||{};
 const starts=Date.parse(p.onset||p.effective||''),expires=Date.parse(p.expires||p.ends||'');
 return {
   event:typeof p.event==='string'?p.event.slice(0,120):'NWS alert',
   severity:['Extreme','Severe','Moderate','Minor'].includes(p.severity)?p.severity:'Unknown',
   starts:Number.isFinite(starts)?new Date(starts).toISOString():null,
   expires:Number.isFinite(expires)?new Date(expires).toISOString():null,
   url:typeof feature?.id==='string'&&feature.id.startsWith('https://api.weather.gov/')?feature.id:'https://www.weather.gov/alerts'
 };
}
async function conditions(id){
 const site=getSite(id);
 if(!site)return null;
 const lat=site.lat.toFixed(4),lon=site.lon.toFixed(4);
 const point=await requestJson(NWS+'/points/'+lat+','+lon);
 const hourly=forecastHref(point?.properties?.forecastHourly);
 if(!hourly)throw Error('Invalid NWS forecast URL');
 const [f,alerts]=await Promise.allSettled([
   requestJson(hourly),
   requestJson(NWS+'/alerts/active?point='+lat+','+lon)
 ]);
 if(f.status!=='fulfilled')throw Error('Hourly forecast unavailable');
 const periods=(Array.isArray(f.value?.properties?.periods)?f.value.properties.periods:[])
   .map(period).filter(Boolean).slice(0,56);
 if(!periods.length)throw Error('No usable NWS hourly periods');
 const alertStatus=alerts.status==='fulfilled'?'available':'unavailable';
 return {
   ok:true,source:'National Weather Service',checkedAt:new Date().toISOString(),
   forecastUpdatedAt:f.value?.properties?.updateTime||null,
   sourceUrl:'https://forecast.weather.gov/MapClick.php?lat='+site.lat+'&lon='+site.lon,
   periods,alerts:alerts.status==='fulfilled'?(alerts.value?.features||[]).slice(0,12).map(alert):[],
   alertsStatus:alertStatus
 };
}
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Access-Control-Allow-Origin','https://chrisizworski.com');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'Method not allowed'});}
 const id=typeof req.query?.place==='string'?req.query.place:'';
 const site=publicSite(id);
 if(!site){res.setHeader('Cache-Control','no-store');return res.status(400).json({ok:false,error:'Unknown viewing location'});}
 try{
   const weather=await conditions(id);
   res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=300');
   return res.status(200).json({ok:true,site,weather,limits:{
     weather:'Official NWS hourly forecast and alerts, not measured shore conditions or a guarantee of safe viewing.',
     access:'General published park hours and official information; event-specific notices and closures must be checked before travel.',
     ship:'This endpoint never models vessels, AIS movement, arrival or lock operations.'
   }});
 }catch(_){
   res.setHeader('Cache-Control','no-store');
   return res.status(200).json({ok:true,site,weather:{ok:false,reason:'NWS hourly forecast unavailable',alertsStatus:'unavailable'},
     limits:{weather:'No weather clearance can be inferred.',access:'Park hours are general published schedules only.'}});
 }
};
module.exports._test={forecastHref,windMph,period,alert,conditions,number};
