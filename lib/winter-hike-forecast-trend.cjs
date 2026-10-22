'use strict';
/*
 * Future NWS *forecast* trend; never NOAA snow history, measured trail weather,
 * or proof of parking. The data are from the same NWS hourly payload already
 * fetched to analyze the selected date: no extra network or paid APIs.
 */
const MAX_DAYS=7,DAY_HOURS=new Set([10,11,12,13,14,15,16]);
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const mph=s=>{
 const val=String(s||'').match(/^\s*(\d+(?:\.\d+)?)(?:\s+to\s+(\d+(?:\.\d+)?))?\s*(mph|km\/h)\s*$/i);
 if(!val)return null;
 const speed=Number(val[2]||val[1]),out=/km\/h/i.test(val[3])?speed*.621371:speed;
 return Number.isFinite(out)&&out>=0&&out<=180?out:null;
};
const F=(temp,unit)=>Number.isFinite(temp)?unit==='F'?temp:unit==='C'?temp*9/5+32:null:null;
function summarize(body,now=Date.now()){
 const base={status:'unavailable',days:[],meaning:'NWS forecast for 10 AM–4 PM destination-local; not past weather or future snow depth',
  source:'National Weather Service hourly forecast',forecastUpdatedAt:null,
  availability:'Insufficient or stale NWS data; no invented trend'};
 const p=body?.properties,stamp=p?.updateTime||p?.updated||p?.generatedAt||null;
 const stampMs=Date.parse(stamp);
 if(!Number.isFinite(stampMs)||stampMs>now+3600000||now-stampMs>12*3600000)
  return {...base,forecastUpdatedAt:stamp};
 if(!Array.isArray(p?.periods)||!p.periods.length)return {...base,forecastUpdatedAt:stamp};
 // Determine the local date range directly from valid NWS timestamps.
 // If first day starts in the afternoon it stays marked incomplete.
 const rows=p.periods.filter(r=>{
   const st=String(r?.startTime||'');const date=st.slice(0,10),hour=Number(st.slice(11,13));
   return validDate(date)&&DAY_HOURS.has(hour)&&Number.isFinite(Date.parse(st));
 });
 const dates=[...new Set(rows.map(r=>String(r.startTime).slice(0,10)))].sort().slice(0,MAX_DAYS);
 if(!dates.length)return {...base,forecastUpdatedAt:stamp};
 const days=dates.map(date=>{
  const byHour=new Map();
  for(const r of rows.filter(r=>r.startTime.slice(0,10)===date)){
   const hour=Number(r.startTime.slice(11,13));
   const t=F(r.temperature,r.temperatureUnit),wind=mph(r.windSpeed);
   if(t===null||wind===null||!Number.isFinite(t)||t< -100||t>140)continue;
   if(!byHour.has(hour))byHour.set(hour,{hour,tempF:t,windMph:wind,
    shortForecast:String(r.shortForecast||'').slice(0,100)});
  }
  const arr=[...byHour.values()].sort((a,b)=>a.hour-b.hour);
  if(arr.length<5)return {date,status:'unavailable',hours:arr.length,
   lowF:null,highF:null,maxWindMph:null,freezeThaw:false,rainHours:null,
   reason:'Fewer than five valid distinct daytime forecast hours'};
  const temps=arr.map(r=>r.tempF);
  const rainHours=arr.filter(r=>/rain|drizzle/i.test(r.shortForecast)).length;
  return {date,status:arr.length===7?'complete':'partial',hours:arr.length,
   lowF:Math.round(Math.min(...temps)),highF:Math.round(Math.max(...temps)),
   maxWindMph:Math.round(Math.max(...arr.map(r=>r.windMph))*10)/10,
   crossesFreezing:Math.min(...temps)<=32 && Math.max(...temps)>32,
   rainHours,freezingRainHours:arr.filter(r=>/freezing rain|freezing drizzle/i.test(r.shortForecast)).length,
   meaning:arr.length===7?'All seven 10 AM–4 PM forecast hours returned':'Partial daylight hours; do not call this a full-day high or low'};
 });
 return {...base,status:'forecast',days,forecastUpdatedAt:stamp,
  availability:'Future daytime temperature/wind outlook from NWS hourly periods; missing days remain unavailable'};
}
module.exports={summarize};
