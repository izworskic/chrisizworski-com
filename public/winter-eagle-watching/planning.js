/* Seasonal Eagle Field Planner. Distinct conditions vs wildlife observations.
   No calculated value represents eagle presence or a probability of a display.
   CommonJS for tests; browser global for static pages. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.EaglePlanning=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 const gathering=[4,4,3,1,0,0,0,0,0,1,2,3];
 const display=[2,3,4,3,1,0,0,0,0,0,1,2];
 function seasonalStage(mode,month){
  const n=Number(month);if(!Number.isInteger(n)||n<1||n>12)return {level:"unknown",label:"Month unknown"};
  const level=(mode==="display"?display:gathering)[n-1];
  return {level,label:level===4?"Main regional window":level===3?"Common seasonal window":level===2?"Possible seasonal window":level===1?"Less typical":"Outside typical seasonal window",month:months[n-1]};
 }
 function calendar(mode){return months.map((month,i)=>({month,index:i+1,...seasonalStage(mode,i+1)}));}
 const dateKey=(value,zone)=>{
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:zone||"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(value));
  const get=type=>parts.find(p=>p.type===type)?.value||"00";
  return get("year")+"-"+get("month")+"-"+get("day");
 };
 function toNum(v){if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null}
 function isWet(p){return /(rain|snow|sleet|drizzle|shower|thunder|ice pellets|freezing precipitation)/i.test(p.shortForecast||"");}
 function mph(p){
   const str=String(p.windSpeed||"");let vals=[...str.matchAll(/\d+(?:\.\d+)?/g)].map(x=>Number(x[0]));
   if(!vals.length)return null;
   const n=Math.max(...vals);return /\bkm\/?h\b/i.test(str)?n*.621371:n;
 }
 function summarizeHourly(periods,zone,now){
  const time=now instanceof Date?now.getTime():Number.isFinite(Number(now))?Number(now):Date.now();
  const days=new Map();
  for(const p of (Array.isArray(periods)?periods:[])){
   const stamp=Date.parse(p.startTime),tmp=toNum(p.temperature);
   if(!Number.isFinite(stamp)||stamp<time-3600000||stamp>time+7*86400000||tmp===null)continue;
   const t=p.temperatureUnit==="C"?tmp*9/5+32:tmp;
   const key=dateKey(stamp,zone);
   if(!days.has(key))days.set(key,{date:key,air:[],wind:[],wet:0,hours:0,forecast:[]});
   const d=days.get(key);d.air.push(t);d.hours++;
   const w=mph(p);if(w!==null)d.wind.push(w);
   if(isWet(p))d.wet++;
   if(p.shortForecast)d.forecast.push(p.shortForecast);
  }
  return [...days.values()].slice(0,7).map(d=>{
   const cold=d.air.filter(v=>v<=32).length;
   const low=Math.round(Math.min(...d.air)),high=Math.round(Math.max(...d.air));
   const avgWind=d.wind.length?Math.round(d.wind.reduce((a,b)=>a+b,0)/d.wind.length):null;
   const safeWinds=avgWind!==null&&avgWind<=14,clearHours=d.hours-d.wet;
   return {date:d.date,hours:d.hours,low,high,coldHours:cold,windMph:avgWind,wetHours:d.wet,
    dryFraction:Math.round(100*clearHours/Math.max(1,d.hours)),
    comfort:avgWind===null?"Weather details incomplete":(safeWinds&&d.wet<=Math.max(2,d.hours*.25)?"Favorable for watching from a public overlook":d.wet>d.hours*.4?"Wet or snowy viewing conditions":"Breezy or mixed viewing conditions"),
    condition:cold>=Math.max(5,d.hours*.5)?"Sustained subfreezing air":cold>=3?"Some freezing air hours":"Mostly above-freezing air",
    forecastSample:d.forecast[0]||"Forecast description unavailable"
   };
  });
 }
 function summary(mode,month,days){
  const stage=seasonalStage(mode,month);
  if(mode==="display"){
    return {stage,headline:stage.level>=3?"Breeding-season display watching is seasonally relevant":stage.level===2?"Possible display season; timing varies locally":"Outside the usual Midwest display-watching window",
     why:"Search the open sky above broad public viewing corridors, not nest sites. Clearer, less windy periods improve observation—not the odds that birds will perform an aerial display.",
     evidence:"No published day-by-day courtship or cartwheel forecast. Talon-locked tumbles may be territorial aggression rather than courtship."};
  }
  const recent=days.slice(0,3),hours=recent.reduce((t,d)=>t+d.coldHours,0),total=recent.reduce((t,d)=>t+d.hours,0);
  const context=total===0?"No live freezing-weather assessment":hours>=20?"Prolonged below-freezing air forecast":hours>=5?"Some below-freezing hours ahead":"Little below-freezing air in the available forecast";
  return {stage,headline:stage.level>=2?context:"Outside typical winter concentration season",
    why:"Open water, accessible prey and safe roosts are the biological drivers. Cold air is context, not measured river ice.",
    evidence:"Without a dated count or direct water/ice observation, eagle concentration and open water both remain unconfirmed."};
 }
 return {calendar,seasonalStage,dateKey,summarizeHourly,summary,mph,isWet};
});
