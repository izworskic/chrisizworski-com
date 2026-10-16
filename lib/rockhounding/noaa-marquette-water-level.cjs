'use strict';
// Optional independent NOAA Great Lakes level CONTEXT for existing photo-free
// GLOS wave tool. This is the Marquette, MICHIGAN gauge, not Grand Marais MN.
// IGLD 1985 water elevation here is NOT the beach waterline at Agate Beach.
const registry=require('../../data/rockhounding/noaa-marquette-water-level-source-2026.json');
const H=3600000;
const NO_CLAIMS=Object.freeze({
 measuredAtAgateBeach:false,
 isLocalWaveRunup:false,
 localSeicheAmplitudeMeasured:false,
 sedimentMobilityInferred:false,
 exposedAgateCount:null,
 beachWaterlineElevationM:null,
 canPredictNewAgates:false,
 canPublishVisitWindow:false,
 canClaimBeachSafety:false
});
function checkRegistry(s=registry){
 if(s?.schemaVersion!=='rockhounding-lake-superior-remote-water-level-source-v1'||
  s.stationId!=='9099018'||s.stationName!=='Marquette C.G., MI'||
  s.sourceCoordinates.lat!==46.5456||s.sourceCoordinates.lon!==-87.3786||
  s.apiBase!=='https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'||
  s.product!=='water_level'||s.sourceDatum!=='IGLD'||
  s.sourceDatumVersion!=='IGLD 1985'||s.units!=='metric'||
  s.timeZone!=='gmt'||s.apiOutputFormat!=='json'||
  s.verification?.hasOriginal2026PreliminaryMeasurements!==true||
  JSON.stringify(s.verification.rawFields)!=='["t","v","s","f","q"]'||
  Object.values(s.interpretation||{}).length!==13||
  s.interpretation.stationIsGrandMaraisMichigan!==false||
  s.interpretation.stationIsNearAgateBeach!==false||
  s.interpretation.representsLakeWideLevelContextOnly!==true||
  s.interpretation.notMeasuredBeachWaterline!==true||
  s.interpretation.notMeasuredBeachWaves!==true||
  s.interpretation.notInstantLocalSeiche!==true||
  s.interpretation.doNotUseStation9099090!==true||
  s.interpretation.station9099090IsInMinnesota!==true||
  s.interpretation.canInferNewRockExposure!==false||
  s.interpretation.canClaimSafeConditions!==false||
  s.interpretation.canPublishVisitWindow!==false)
  throw Error('NOAA Marquette Michigan water level station provenance changed');
 return true;
}
const stamp=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s));
function sourceURL(nowISO,{registrySource=registry}={}){
 checkRegistry(registrySource);
 if(!stamp(nowISO))throw Error('Invalid date for NOAA research water level request');
 const to=Date.parse(nowISO);
 const start=new Date(to-48*H).toISOString().slice(0,10).replace(/-/g,'');
 const end=new Date(to).toISOString().slice(0,10).replace(/-/g,'');
 const params=new URLSearchParams({
  begin_date:start,end_date:end,station:registrySource.stationId,
  product:'water_level',datum:'IGLD',units:'metric',time_zone:'gmt',
  format:'json',application:'ChrisIzworskiRockhounding'
 });
 return registrySource.apiBase+'?'+params.toString();
}
function toRows(doc,{registrySource=registry}={}){
 checkRegistry(registrySource);
 const meta=doc?.metadata;
 if(String(meta?.id)!=='9099018'||
  typeof meta?.name!=='string'||!meta.name.startsWith('Marquette C.G.')||
  Math.abs(Number(meta.lat)-46.5456)>.005||
  Math.abs(Number(meta.lon)+87.3786)>.005)
  throw Error('NOAA water level source station is NOT Marquette Michigan');
 if(!Array.isArray(doc.data)||doc.data.length>1400)
  throw Error('NOAA 6-minute water-level data missing or oversized');
 const rows=new Map();let rejected=0;
 for(const x of doc.data){
  if(!x||typeof x.t!=='string'||! /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(x.t))
   throw Error('NOAA GMT water-level timestamp format changed');
  const time=x.t.replace(' ','T')+':00Z';
  const ts=Date.parse(time),v=typeof x.v==='string'?Number(x.v):NaN;
  if(!Number.isFinite(ts))throw Error('Unparseable NOAA UTC gauge time');
  if(!Number.isFinite(v)||v<175||v>195||
    (x.q!==undefined&&!['p','v'].includes(x.q))||
    (typeof x.f==='string'&&x.f.split(',').some(n=>n!=='0'))){
   rejected++;continue;
  }
  const row={time,waterLevelM:+v.toFixed(3),quality:x.q==='v'?'VERIFIED':'PRELIMINARY'};
  if(rows.has(time)&&JSON.stringify(rows.get(time))!==JSON.stringify(row))
   throw Error('Conflicting NOAA water-level measurements at one timestamp');
  rows.set(time,row);
 }
 return {stationId:'9099018',rows:[...rows.values()].sort((a,b)=>a.time.localeCompare(b.time)),
  rejectedQualityRows:rejected,sourceProduct:'NOAA_COOPS_MEASURED_IGLD_WATER_LEVEL'};
}
function waterLevelContext(source,{nowISO}={}){
 checkRegistry();
 if(!stamp(nowISO))throw Error('Invalid NOAA water-level context time');
 if(source?.stationId!=='9099018'||source?.sourceProduct!=='NOAA_COOPS_MEASURED_IGLD_WATER_LEVEL'||
  !Array.isArray(source.rows)||source.rows.length>1400)
  throw Error('Untrusted level observation source');
 const now=Date.parse(nowISO);
 const data=source.rows.filter(r=>{
  const t=Date.parse(r.time);
  return Number.isFinite(t)&&t<=now+5*60000&&t>=now-72*H;
 });
 const latest=data.at(-1);
 const res={
  schemaVersion:'rockhounding-remote-lake-level-context-v1',
  status:'NO_REMOTE_WATER_LEVEL_DATA',provider:'NOAA_COOPS',
  stationId:'9099018',stationName:'Marquette C.G., MI',
  stationState:'MICHIGAN',levelDatum:'IGLD 1985',
  gaugeMeaning:'REMOTE_LAKE_SUPERIOR_LEVEL_CONTEXT_ONLY',
  dateUTC:latest?.time??null,
  gaugeWaterLevelM:null,delta24hCm:null,
  ageHours:latest?+((now-Date.parse(latest.time))/H).toFixed(2):null,
  observedSampleCount:data.length,
  rejectedQualityRows:source.rejectedQualityRows??0,
  datumVerified:true,
  last24hGapMaxHours:null,
  sourceLink:'https://tidesandcurrents.noaa.gov/stationhome.html?id=9099018',
  caveat:'Marquette water level is regional Lake Superior context, not a gauge at Grand Marais, not beach wave runup, and not a safe-water or rock-exposure claim.',
  ...NO_CLAIMS
 };
 if(!latest)return res;
 const age=(now-Date.parse(latest.time))/H;
 if(age>3)return {...res,status:'REMOTE_WATER_LEVEL_STALE'};
 const within=data.filter(r=>Date.parse(r.time)>=Date.parse(latest.time)-25*H);
 let maxGap=0;
 for(let i=1;i<within.length;i++){
  const dt=(Date.parse(within[i].time)-Date.parse(within[i-1].time))/H;
  if(dt<=0)throw Error('NOAA water level has nonmonotone source timestamps');
  maxGap=Math.max(maxGap,dt);
 }
 const reference=within
  .map(r=>({r,dist:Math.abs(Date.parse(r.time)-(Date.parse(latest.time)-24*H))/H}))
  .sort((a,b)=>a.dist-b.dist)[0];
 const enough=within.length>=16&&reference&&reference.dist<=1&&maxGap<=3;
 return {...res,
  status:enough?'REMOTE_LAKE_LEVEL_OBSERVED_24H_CHANGE':'REMOTE_LAKE_LEVEL_RECENT_BUT_24H_COMPARISON_GAPPY',
  gaugeWaterLevelM:latest.waterLevelM,
  delta24hCm:enough?+(100*(latest.waterLevelM-reference.r.waterLevelM)).toFixed(1):null,
  last24hGapMaxHours:within.length>1?+maxGap.toFixed(2):null,
  qualityOfLatestReading:latest.quality};
}
module.exports={checkRegistry,sourceURL,toRows,waterLevelContext};
