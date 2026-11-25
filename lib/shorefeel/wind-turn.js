'use strict';
// Saginaw Bay hourly wind evidence. This does not predict a lake-breeze front,
// a measured temperature on the sand, or a change in swimming safety.
const {offshoreBearing,breezeSector,COMPASS}=require('./beach-feel.js');
const HOUR=3600000;
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
function parseHour(value){
  if(typeof value!=='string'||!/\dT\d/.test(value)||!/(Z|[+-]\d{2}:\d{2})$/.test(value))return null;
  const t=Date.parse(value);
  return Number.isFinite(t)&&t%HOUR===0?t:null;
}
function normalize(p,bearing){
  const at=parseHour(p?.startsAt);
  if(at===null)return null;
  const from=typeof p.windDirection==='string'?p.windDirection.trim().toUpperCase():null;
  const speed=finite(p.windMph,0,110)?p.windMph:null;
  const windFrom=Object.hasOwn(COMPASS,from)?from:null;
  return {at,startsAt:new Date(at).toISOString(),windFrom,
    windMph:speed,areaAirF:finite(p.tempF,-60,140)?p.tempF:null,
    sector:breezeSector(windFrom,bearing,speed)};
}
const publicRow=r=>({startsAt:r.startsAt,windFrom:r.windFrom,windMph:r.windMph,
  areaAirF:r.areaAirF,sector:r.sector});
function waterContext(water,at,now){
  if(water?.kind!=='satellite'||!finite(water?.tempF,25,105))return null;
  const when=Date.parse(water?.observedAt||'');
  if(!Number.isFinite(when)||when>now||when>at||at-when>36*HOUR)return null;
  return {tempF:water.tempF,observedAt:new Date(when).toISOString(),
    scope:'NOAA analyzed offshore surface-water pixel, not swimming-area water'};
}
function forecastWindTurn(periods,options={},now=new Date()){
  const currentTime=now instanceof Date?now.getTime():NaN;
  const bearing=offshoreBearing(options.beach,options.waterReference);
  const empty={status:'unavailable',phase:'unknown',at:null,horizonHours:24,
    hours:[],current:null,water:null,confidence:'not-calibrated',
    source:'National Weather Service hourly land-area forecast',
    caveat:'Forecast wind direction does not confirm the formation or arrival of a lake-breeze front. It is not a thermometer on the sand or a safety advisory.'};
  if(!Number.isFinite(currentTime)||!Number.isFinite(bearing)||!Array.isArray(periods))
    return {...empty,reason:'No verified shoreline forecast coordinates or hourly periods.'};
  const unique=new Map(),conflicted=new Set();
  let duplicates=0,conflicts=0;
  for(const p of periods){
    const row=normalize(p,bearing);
    if(!row||row.at<currentTime-HOUR||row.at>currentTime+24*HOUR)continue;
    if(conflicted.has(row.at))continue;
    const old=unique.get(row.at);
    if(!old){unique.set(row.at,row);continue;}
    if(['windFrom','windMph','areaAirF'].every(k=>old[k]===row[k])){
      duplicates++;continue;
    }
    unique.delete(row.at);conflicted.add(row.at);conflicts++;
  }
  const rows=[...unique.values()].sort((a,b)=>a.at-b.at);
  const current=rows.find(r=>r.at<=currentTime&&currentTime<r.at+HOUR);
  if(!current){
    return {...empty,reason:'The forecast has no current hourly period; wind shifts cannot be dated safely.',
      rejected:{duplicates,conflicts}};
  }
  const future=rows.filter(r=>r.at>=current.at&&r.at<=currentTime+24*HOUR);
  let phase='none',chosen=null;
  // Two consecutive forecast hours are required; a single directional
  // blip is not enough. Missing hours or missing winds never imply continuity.
  for(let i=0;i<future.length-1;i++){
    const a=future[i],b=future[i+1];
    if(a.sector!=='onshore'||b.sector!=='onshore'||b.at-a.at!==HOUR)continue;
    if(a.at===current.at){
      phase='onshore-now';chosen=a;break;
    }
    const previous=future[i-1];
    if(previous&&previous.at===a.at-HOUR&&
       (previous.sector==='offshore'||previous.sector==='alongshore')){
      phase='forecast-turn';chosen=a;break;
    }
  }
  const w=chosen?waterContext(options.water,chosen.at,currentTime):null;
  const difference=w&&finite(chosen.areaAirF,-60,140)
    ?Math.round((chosen.areaAirF-w.tempF)*10)/10:null;
  return {status:conflicts?'partial':'available',phase,
    at:chosen?.startsAt||null,horizonHours:24,
    current:publicRow(current),
    hours:future.slice(0,12).map(publicRow),water:w,
    forecastAirWaterContrastF:difference,
    contrastMeaning:difference===null?'unknown':difference>=8?'water-cooler-than-air':
      difference<=-8?'water-warmer-than-air':'small-contrast',
    rejected:{duplicates,conflicts},
    confidence:'not-calibrated',source:empty.source,caveat:empty.caveat,
    reason:phase==='none'
      ?'No two-hour onshore run with a verified prior offshore or alongshore hour appears in the available hourly grid. A local wind shift could still occur.'
      :phase==='onshore-now'
        ?'Two consecutive NWS forecast hours indicate wind from the bay. This is regional forecast guidance, not a confirmed local lake-breeze event.'
        :'The NWS area forecast turns from non-onshore to onshore for at least two consecutive forecast hours. It does not establish the onset of a lake-breeze front.'};
}
module.exports={forecastWindTurn,parseHour,waterContext};
