'use strict';
// Official regional alerts are context, not an assertion that an attraction is closed.
// Endpoints mirror existing Niagara border weather providers. No API key or paid store.
const urls={US:'https://api.weather.gov/alerts/active?point=43.0962,-79.0377',CA:'https://api.weather.gc.ca/collections/weather-alerts/items?f=json&bbox=-79.30,42.80,-78.80,43.30&limit=50'};
const official={US:'https://www.weather.gov/buf/',CA:'https://weather.gc.ca/'};
const cache=new Map(),pending=new Map();
function currentEasternDate(now=new Date()){
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const f=k=>p.find(x=>x.type===k).value;
 return f('year')+'-'+f('month')+'-'+f('day');
}
function normalize(payload,side,now=new Date()){
 if(!payload||!Array.isArray(payload.features))throw Error('Unexpected weather data schema');
 const arr=[];
 for(const f of payload.features.slice(0,150)){
  const p=f&&f.properties||{};
  const headline=side==='US'?(p.headline||p.event):(p.alert_name_en||p.alert_short_name_en||p.headline);
  if(typeof headline!=='string'||!headline.trim())continue;
  const end=p.expires||p.ends||p.expiry_time||null;
  if(end&&Number.isFinite(Date.parse(end))&&Date.parse(end)<now.getTime())continue;
  arr.push({headline:headline.slice(0,160),severity:String(p.severity_en||p.severity||'Unspecified').slice(0,40),source:side==='US'?'NWS':'ECCC',expires_at:end});
  if(arr.length>=6)break;
 }
 return arr;
}
async function check(side,fetcher=global.fetch,now=new Date()){
 const k=side==='CA'?'CA':'US';
 const cached=cache.get(k);
 if(cached&&now.getTime()-cached.at<600000)return cached.data;
 if(pending.has(k))return pending.get(k);
 const task=(async()=>{
  try{
   const response=await fetcher(urls[k],{headers:{Accept:'application/geo+json, application/json','User-Agent':'NiagaraFallsToday/1.0 (https://chrisizworski.com/)'},signal:AbortSignal.timeout(1800)});
   if(!response.ok)throw Error('Weather source HTTP '+response.status);
   const alerts=normalize(await response.json(),k,now);
   const data={status:alerts.length?'ACTIVE_ALERTS':'NO_ACTIVE_ALERTS_RETURNED',alerts,checked_at:now.toISOString(),authority_url:official[k],caveat:'Regional weather observations do not establish attraction openings or closures.'};
   cache.set(k,{at:now.getTime(),data});return data;
  }catch(e){
   return {status:'SOURCE_UNAVAILABLE',alerts:[],checked_at:null,authority_url:official[k],caveat:'Official regional alerts could not be retrieved. Check the weather service and operators before traveling.'};
  }finally{pending.delete(k);}
 })();
 pending.set(k,task);return task;
}
async function weatherForVisit(side,visitDate,opts={}){
 const now=opts.now||new Date();
 if(visitDate!==currentEasternDate(now))return{status:'VISIT_NOT_TODAY',alerts:[],checked_at:null,authority_url:official[side==='CA'?'CA':'US'],caveat:'Current alerts cannot verify weather on a future visit date. Check again on the visit day.'};
 return check(side,opts.fetch||global.fetch,now);
}
module.exports={weatherForVisit,normalize,currentEasternDate};
