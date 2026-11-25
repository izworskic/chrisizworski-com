'use strict';
// A planning comparison of two consecutive NWS hourly land forecasts.
// Not a safety threshold, calibrated probability or water-temperature model.
const HOUR=3600000;
const ACTIVITIES=new Set(['relax','family','swim','paddle']);
function usable(p){
 const t=Date.parse(p?.startsAt||'');
 if(!Number.isFinite(t)||t%HOUR!==0||p.daylight!==true||
  !Number.isFinite(p.tempF)||!Number.isFinite(p.windMph)||p.windMph<0||
  !Number.isFinite(p.rainChance)||p.rainChance<0||p.rainChance>100)return null;
 // The source is the NWS hourly endpoint. If it includes an end time, it
 // must agree with a full hour; never join irregular or partial intervals.
 if(p.endsAt!=null&&Date.parse(p.endsAt)!==t+HOUR)return null;
 return {at:t,tempF:p.tempF,windMph:p.windMph,rainChance:p.rainChance};
}
function decisionWindow(periods,activity,now=new Date(),issuedAt=null){
 const t=now instanceof Date?now.getTime():NaN,issued=Date.parse(issuedAt||'');
 if(!ACTIVITIES.has(activity)||!Number.isFinite(t)||!Number.isFinite(issued)||
  t-issued>18*HOUR||issued-t>HOUR||!Array.isArray(periods))return null;
 const unique=new Map(),conflict=new Set();
 for(const p of periods){
  const key=Date.parse(p?.startsAt||'');
  if(!Number.isFinite(key)||key%HOUR!==0||key<t||key+HOUR>t+36*HOUR)continue;
  const row=usable(p);
  if(conflict.has(key))continue;
  if(!row){unique.delete(key);conflict.add(key);continue;}
  const prior=unique.get(key);
  if(prior&&['tempF','windMph','rainChance'].some(k=>prior[k]!==row[k])){
   unique.delete(key);conflict.add(key);continue;
  }
  unique.set(key,row);
 }
 // Same relative preference as the existing one-hour ShoreFeel ranking;
 // rank by the less comfortable of the two hours, then their mean, then time.
 const score=p=>-Math.abs(p.tempF-(activity==='paddle'?72:76))-p.windMph*.55-p.rainChance*.18;
 const options=[];
 for(const a of unique.values()){
  const b=unique.get(a.at+HOUR);
  if(!b)continue;
  const x=score(a),y=score(b);
  options.push({a,b,worst:Math.min(x,y),mean:(x+y)/2});
 }
 options.sort((a,b)=>b.worst-a.worst||b.mean-a.mean||a.a.at-b.a.at);
 const best=options[0];if(!best)return null;
 const {a,b}=best;
 return {startsAt:new Date(a.at).toISOString(),endsAt:new Date(b.at+HOUR).toISOString(),
  issuedAt:new Date(issued).toISOString(),durationMinutes:120,activity,
  airMinF:Math.min(a.tempF,b.tempF),airMaxF:Math.max(a.tempF,b.tempF),
  windMaxMph:Math.max(a.windMph,b.windMph),rainMaxPct:Math.max(a.rainChance,b.rainChance),
  method:'relative-weather-comfort-two-hour-v1',
  reason:'Relative comparison of two complete daylight forecast hours, not a promise of comfortable or safe conditions.',
  source:'National Weather Service hourly land-area forecast'};
}
module.exports={decisionWindow};
