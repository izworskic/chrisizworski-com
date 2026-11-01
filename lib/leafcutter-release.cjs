'use strict';
// Leafcutter bees: weather evidence, not a biological readiness forecast.
// All timestamps are NWS-local ISO values. USDA hardiness zone is deliberately excluded.
const {LOCATIONS}=require('./maple-sap-engine.cjs');
const LOCATIONS_BY_ID=new Map(LOCATIONS.map(x=>[x.id,x]));
function location(id){return LOCATIONS_BY_ID.get(String(id||''))||null;}
function tempF(p){
 const t=p&&p.temperature;
 if(t===null||t===undefined||t==='')return null;
 const n=Number(t);
 if(!Number.isFinite(n))return null;
 return p.temperatureUnit==='C'?(n*9/5+32):(p.temperatureUnit==='F'?n:null);
}
function localDate(p){
 const t=String(p&&p.startTime||'');
 return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)?t.slice(0,10):null;
}
function localHour(p){const s=String(p&&p.startTime||'');return /^\d{4}-\d{2}-\d{2}T\d{2}/.test(s)?Number(s.slice(11,13)):null;}
function precipitation(p){const v=p&&p.probabilityOfPrecipitation&&p.probabilityOfPrecipitation.value;return v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Math.max(0,Math.min(100,Number(v))):null;}
function daytime(p){const h=localHour(p);return h!==null&&h>=9&&h<=18&&p.isDaytime===true;}
function reducePeriods(periods,issuedAt,now=new Date()){
 if(!Array.isArray(periods))throw Error('INVALID_FORECAST');
 const groups=new Map();
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 // Only complete or future daylight hours, keep first calendar date even when partial.
 for(const p of periods.slice(0,180)){
  if(!p||!daytime(p))continue;
  const date=localDate(p),t=tempF(p);
  if(!date||date<today||t===null)continue;
  let list=groups.get(date);if(!list){list=[];groups.set(date,list);}
  const pop=precipitation(p);
  list.push({temperatureF:Math.round(t),precipPct:pop});
 }
 const daily=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(0,7).map(([date,rows])=>{
  const temps=rows.map(x=>x.temperatureF);
  const hi=Math.max(...temps),lo=Math.min(...temps),pop=rows.map(x=>x.precipPct).filter(Number.isFinite);
  // Require 6 distinct day hours before assigning a warm / cool label. Incomplete days are unknown.
  const adequate=rows.length>=6;
  return {date,daylightHours:rows.length,highF:hi,lowDayF:lo,
   precipPeakPct:pop.length?Math.max(...pop):null,
   signal:adequate?(hi>=75?'WARM_DAY':'COOL_DAY'):'PARTIAL',
   coverage:adequate?'sufficient':'partial'};
 });
 const issued=new Date(issuedAt||'');
 const ageH=Number.isFinite(+issued)?(+now-+issued)/3600000:null;
 const fresh=ageH!==null&&ageH>=-2&&ageH<=18;
 let firstWarmStretch=null;
 if(fresh)for(let i=0;i<daily.length-1;i++){
  if(daily[i].signal==='WARM_DAY'&&daily[i+1].signal==='WARM_DAY'
   &&(Date.parse(daily[i+1].date+'T12:00:00Z')-Date.parse(daily[i].date+'T12:00:00Z')===86400000)){
   firstWarmStretch={startDate:daily[i].date,endDate:daily[i+1].date};break;
  }
 }
 const complete=daily.filter(x=>x.signal!=='PARTIAL');
 const status=!fresh?'STALE':complete.length<2?'INSUFFICIENT':firstWarmStretch?'WARM_STRETCH':'NO_STRETCH';
 return {daily,issuedAt:issuedAt||null,fresh,ageHours:ageH===null?null:Math.round(ageH*10)/10,
  status,firstWarmStretch,assessment:'Two consecutive forecast days with a daytime hourly high of at least 75°F are used as an operational planning signal, not a validated biological threshold or guarantee of suitable flight weather.'};
}
module.exports={LOCATIONS,location,tempF,localDate,localHour,precipitation,daytime,reducePeriods};
