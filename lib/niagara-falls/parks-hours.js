'use strict';
// Niagara Parks' public date calendar uses the official WordPress itinerary endpoint.
// A date response is a published schedule, NOT proof of live attraction operation,
// available admission slots, or a confirmed last-ticket time.
const ROOT='https://www.niagaraparks.com';
const PUBLIC_URL=ROOT+'/hours-of-operations/';
const ENDPOINT=ROOT+'/wp-json/itinerary/v1/en/attractions/date/';
const VENUES=Object.freeze({
 journey:Object.freeze({id:1072,name:'Journey Behind the Falls',slug:'visit/attractions/journey-behind-the-falls/'}),
 cruise:Object.freeze({id:1068,name:'Niagara City Cruises',slug:'visit/attractions/hornblower-niagara-cruises/'})
});
const cache=new Map(),pending=new Map();
const MAX_CACHE_ENTRIES=28;
const ERROR_NOTE='Official Niagara Parks date-specific hours could not be confirmed. Do not interpret missing hours as a closure or an opening.';
function validDate(date){
 return typeof date==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
}
function parseTime(raw){
 if(typeof raw!=='string')return null;
 const m=/^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/.exec(raw);
 return m?m[1]+':'+m[2]:null;
}
function normalizeVenue(row,definition,date,checkedAt){
 const basis={id:definition.id,date,source:PUBLIC_URL,checked_at:checkedAt,open:null,close:null,lastAdmission:null,status:'UNKNOWN',basis:'No date-specific published hours verified'};
 if(!row||row.id!==definition.id||row.name!==definition.name||!Array.isArray(row.slug)||!row.slug.includes(definition.slug)){
   return {...basis,basis:'Official venue identifier or slug missing or changed'};
 }
 const h=row.hours;
 if(!h||typeof h!=='object')return {...basis,basis:'Operator venue entry has no hours'};
 const opened=h.open===true||h.open===1||h.open==='1';
 const closed=h.open===false||h.open===0||h.open==='0';
 const start=parseTime(h.opening_hours),end=parseTime(h.closing_hours);
 // The endpoint may return open:false with null opening/closing on UNPUBLISHED
 // future dates. This is NOT a verified closure.
 if(!start||!end)return {...basis,basis:'No complete published hours for requested date'};
 if(start===end)return {...basis,basis:'Published time interval ambiguous'};
 if(closed)return {...basis,status:'CLOSED',basis:'Operator-published date-specific closure; times are reference hours, not open hours'};
 if(!opened)return {...basis,basis:'Unrecognized operator open flag'};
 return {...basis,status:'PUBLISHED_SCHEDULE',open:start,close:end,basis:'Operator-published date-specific operating window; not admission inventory or last-entry cutoff'};
}
function normalize(payload,date,checkedAt=new Date().toISOString()){
 if(!validDate(date))throw Error('Invalid Canadian attraction date');
 if(!payload||!Array.isArray(payload.attractions)||payload.attractions.length<2)throw Error('Unexpected Niagara Parks calendar structure');
 const venues={};
 for(const [key,def] of Object.entries(VENUES)){
  const rows=payload.attractions.filter(x=>x&&x.id===def.id);
  venues[key]=rows.length===1?normalizeVenue(rows[0],def,date,checkedAt):normalizeVenue(null,def,date,checkedAt);
 }
 const known=Object.values(venues).filter(v=>v.status!=='UNKNOWN').length;
 return {status:known===2?'PUBLISHED':known===1?'PARTIAL':'UNPUBLISHED',requested_date:date,checked_at:checkedAt,source_url:PUBLIC_URL,venues,caveat:'Date-specific published hours only. Closures may change and timed admissions are not checked.'};
}
function unavailable(date){
 return {status:'SOURCE_UNAVAILABLE',requested_date:date,checked_at:null,source_url:PUBLIC_URL,venues:{},caveat:ERROR_NOTE};
}
async function load(date,{fetcher=global.fetch,now=new Date(),timeoutMs=4500}={}){
 if(!validDate(date))throw Error('Choose a valid visit date.');
 const checkedAt=now.toISOString();
 try{
  const response=await fetcher(ENDPOINT+date,{
   headers:{Accept:'application/json','User-Agent':'NiagaraFallsToday/2.0 (+https://chrisizworski.com/niagara-falls-today/)'},signal:AbortSignal.timeout(timeoutMs)
  });
  if(!response.ok)throw Error('Operator schedule HTTP '+response.status);
  const length=Number(response.headers&&response.headers.get&&response.headers.get('content-length'));
  if(length>4e6)throw Error('Unexpected schedule response size');
  const payload=await response.json();
  return normalize(payload,date,checkedAt);
 }catch(error){
  return unavailable(date);
 }
}
function easternToday(now){
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=k=>p.find(x=>x.type===k).value;
 return get('year')+'-'+get('month')+'-'+get('day');
}
async function getCanadianHours(date,opts={}){
 if(!validDate(date))throw Error('Choose a valid visit date.');
 const now=opts.now||new Date();
 const today=easternToday(now);
 const ttl=date===today?15*60*1000:4*60*60*1000;
 const enableCache=opts.useCache!==false&&!opts.fetcher;
 const hit=cache.get(date);
 if(enableCache&&hit&&now.getTime()-hit.at<ttl)return hit.result;
 if(enableCache&&pending.has(date))return pending.get(date);
 const promise=load(date,{...opts,now});
 if(enableCache)pending.set(date,promise);
 try{
  const result=await promise;
  if(enableCache&&result.status!=='SOURCE_UNAVAILABLE'){
   cache.delete(date);cache.set(date,{at:now.getTime(),result});
   while(cache.size>MAX_CACHE_ENTRIES)cache.delete(cache.keys().next().value);
  }
  return result;
 }finally{if(enableCache)pending.delete(date);}
}
module.exports={ENDPOINT,PUBLIC_URL,VENUES,normalize,normalizeVenue,getCanadianHours,unavailable,validDate,easternToday};
