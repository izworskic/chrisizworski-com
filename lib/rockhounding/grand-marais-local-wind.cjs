'use strict';
// NDBC GRMM4 — local Grand Marais wind reference only, never a wave or safe-shore claim.
const STATION={id:'GRMM4',name:'Grand Marais NWS station',lat:46.684,lon:-85.972,
 url:'https://www.ndbc.noaa.gov/data/realtime2/GRMM4.txt'};
const H=3600000;
function windNumber(v,max){
 if(v===undefined||v==='MM')return null;
 const n=Number(v);
 return Number.isFinite(n)&&n>=0&&n<=max?n:null;
}
function parseLocalWind(text){
 if(typeof text!=='string')return [];
 const lines=text.split(/\r?\n/),header=lines.find(x=>/^#(?:YY|YYYY)\s/.test(x));
 if(!header)return [];
 const cols=header.slice(1).trim().split(/\s+/),at=k=>cols.indexOf(k);
 const values=[];
 for(const line of lines){
  if(!/^\d{2,4}\s+\d{1,2}\s+/.test(line.trim()))continue;
  const fields=line.trim().split(/\s+/);if(fields.length<cols.length)continue;
  let year=Number(fields[0]);if(year<100)year+=year>=70?1900:2000;
  const t=Date.UTC(year,+fields[1]-1,+fields[2],+fields[3],+fields[4]);
  if(!Number.isFinite(t)||new Date(t).getUTCFullYear()!==year)continue;
  const speed=windNumber(fields[at('WSPD')],70),gust=windNumber(fields[at('GST')],90);
  const dir=windNumber(fields[at('WDIR')],360);
  if(speed===null||dir===null)continue;
  values.push({time:new Date(t).toISOString(),windSpeedMps:speed,windGustMps:gust,
   windFromDeg:dir===360?0:dir,source:'NOAA_NDBC_GRMM4',isWaveMeasurement:false});
 }
 const unique=new Map(values.map(x=>[x.time,x]));
 return [...unique.values()].sort((a,b)=>a.time.localeCompare(b.time));
}
function assessLocalWind(rows,nowISO){
 const now=Date.parse(nowISO);
 const result={stationId:STATION.id,source:STATION.url,measurement:'LOCAL_WIND_ONLY',
  claimsBeachWaveHeight:false,claimsSafeCollecting:false,status:'UNAVAILABLE',latest:null,coverageCount:0,
  windFromDegreesAreNotWaveFromDegrees:true};
 if(!Number.isFinite(now)||!Array.isArray(rows))return result;
 const recent=rows.filter(r=>Date.parse(r.time)<=now&&Date.parse(r.time)>=now-6*H);
 if(!recent.length)return result;
 const latest=recent.at(-1);
 if(now-Date.parse(latest.time)>2*H)return {...result,status:'STALE',latest};
 if(recent.length<6)return {...result,status:'SPARSE',latest,coverageCount:recent.length};
 return {...result,status:'OBSERVED_LOCAL_WIND_NOT_WAVES',latest,coverageCount:recent.length,
  maxWindGustMps:Math.max(...recent.map(x=>x.windGustMps??x.windSpeedMps))};
}
async function loadLocalWind({fetchFn=fetch,nowISO=new Date().toISOString()}={}){
 try{
  const res=await fetchFn(STATION.url,{headers:{Accept:'text/plain'},signal:AbortSignal.timeout(8000)});
  if(!res?.ok)return {...assessLocalWind([],nowISO),reason:'SOURCE_HTTP_ERROR'};
  const raw=await res.text();
  if(typeof raw!=='string'||raw.length>1000000)return {...assessLocalWind([],nowISO),reason:'SOURCE_FORMAT_INVALID'};
  return assessLocalWind(parseLocalWind(raw),nowISO);
 }catch{return {...assessLocalWind([],nowISO),reason:'SOURCE_REQUEST_FAILED'};}
}
module.exports={STATION,parseLocalWind,assessLocalWind,loadLocalWind};
