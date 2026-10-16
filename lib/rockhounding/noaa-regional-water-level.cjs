'use strict';
// Observed NOAA Lake Superior IGLD levels at Marquette and Point Iroquois.
// Both distant stations: no Grand Marais beach waterline, no visitor safety,
// no model of Lake Superior setup/seiche propagation to Agate Beach.
const config=require('../../data/rockhounding/lake-superior-regional-water-level-sources.json');
const H=3600000;
const PUBLIC_DENIAL=Object.freeze({
 isGrandMaraisBeachWaterline:false,canClaimBeachSafe:false,
 canPredictExposedAgates:false,canPublishVisitWindow:false
});
function validateConfig(c=config){
 if(c?.schemaVersion!=='rockhounding-lake-superior-regional-water-level-v1'||
    c.api!=='https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'||
    c.product!=='water_level'||c.datum!=='IGLD'||c.timeZone!=='gmt'||
    c.units!=='metric'||c.format!=='json'||c.dataCadenceMinutes!==6||
    c.maximumQueryHours!==96||
    JSON.stringify(c.stations?.map(x=>x.id))!=='["9099018","9099004"]'||
    !c.stations.every(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)&&
      x.role?.includes('NOT_GRAND_MARAIS_WATERLINE'))||
    c.publication?.canDeriveGrandMaraisWaterline!==false||
    c.publication?.canClaimSafeShore!==false||
    c.publication?.canPredictExposedAgates!==false||
    c.publication?.canPublishBestVisitTime!==false||
    c.publication?.waterLevelsAreLocal!==false)
   throw Error('NOAA regional gauge datum/source boundaries changed');
 return true;
}
function parseUTC(t){
 if(typeof t!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(t))
  return NaN;
 const d=Date.parse(t);
 return Number.isFinite(d)&&new Date(d).toISOString().slice(0,19)===t.slice(0,19)?d:NaN;
}
function stationById(id){
 const s=config.stations.find(x=>x.id===id);
 if(!s)throw Error('Unregistered distant NOAA gauge');
 return s;
}
function sourceURL(id,{startISO,endISO}){
 validateConfig();stationById(id);
 const from=parseUTC(startISO),to=parseUTC(endISO);
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>96*H)
   throw Error('CO-OPS requests must span 0-96 hours UTC with verified clocks');
 const utc=t=>new Date(t).toISOString().slice(0,16).replace('T',' ');
 const params=new URLSearchParams({
   begin_date:utc(from),end_date:utc(to),station:id,
   product:config.product,datum:config.datum,time_zone:config.timeZone,
   units:config.units,format:config.format,application:'ChrisIzworskiRockhoundingResearch'
 });
 return config.api+'?'+params.toString();
}
function noaaTimeUTC(str){
 if(typeof str!=='string'||!/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(str))return NaN;
 const t=Date.parse(str.replace(' ','T')+':00Z');
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,16)!==str.replace(' ','T'))return NaN;
 return t;
}
function decodeGaugeData(raw,id){
 validateConfig();const station=stationById(id);
 const blob=typeof raw==='string'?raw:JSON.stringify(raw);
 if(typeof blob!=='string'||blob.length>5500000)throw Error('Oversized or missing NOAA response');
 const data=typeof raw==='string'?JSON.parse(raw):raw;
 if(data?.error||!Array.isArray(data?.data)||data.metadata?.id!==id||
    Math.abs(Number(data.metadata?.lat)-station.lat)>.005||
    Math.abs(Number(data.metadata?.lon)-station.lon)>.005||
    data.data.length>2000)
  throw Error('NOAA response does not confirm requested CO-OPS sensor, coordinates or source data');
 const rows=new Map();let rejected=0;
 for(const p of data.data){
  const at=noaaTimeUTC(p.t),height=Number(p.v);
  if(!Number.isFinite(at))throw Error('NOAA missing GMT observation timestamp');
  const flags=typeof p.f==='string'?p.f.split(','):null;
  // First flag is the COUNT of one-second values outside 3 sigma, not
  // necessarily a binary QC failure. Remaining flat/rate/range flags
  // indicate sensor quality problems and are rejected.
  const invalidQC=!Array.isArray(flags)||flags.length!==4||
   !flags.every(x=>/^\d+$/.test(x))||
   flags.slice(1).some(x=>x!=='0');
  if(!Number.isFinite(height)||height<175||height>195||
     !['p','v'].includes(p.q)||invalidQC){rejected++;continue}
  const row={time:new Date(at).toISOString().replace('.000Z','Z'),
    elevationIGLD85M:+height.toFixed(3),quality:p.q==='p'?'PRELIMINARY':'VERIFIED',
    source:'NOAA_COOPS_6MIN_MEASURED_IGLD85',station:id};
  const prev=rows.get(row.time);
  if(prev&&JSON.stringify(prev)!==JSON.stringify(row))
   throw Error('Conflicting time-deduped NOAA sensor measurements');
  rows.set(row.time,row);
 }
 return {station:id,name:station.name,sourceRole:station.role,
  sourceState:'MEASURED_DISTANT_WATER_LEVEL_CONTEXT',
  units:'meters',datum:'IGLD85',utc:true,
  accepted:[...rows.values()].sort((a,b)=>a.time.localeCompare(b.time)),
  rejectedRows:rejected,rawRows:data.data.length,
  ...PUBLIC_DENIAL};
}
function summarizeGauge(input,{nowISO,windowHours=6}={}){
 const now=parseUTC(nowISO);
 if(!Number.isFinite(now)||!Number.isInteger(windowHours)||windowHours<3||windowHours>24||
  !config.stations.some(s=>s.id===input?.station)||!Array.isArray(input?.accepted))
  throw Error('Invalid measured regional station or analysis clock');
 const source=stationById(input.station),samples=input.accepted
  .filter(r=>r.station===input.station&&r.source==='NOAA_COOPS_6MIN_MEASURED_IGLD85'&&
   Number.isFinite(r.elevationIGLD85M)&&r.elevationIGLD85M>=175&&r.elevationIGLD85M<=195&&
   Number.isFinite(parseUTC(r.time))&&parseUTC(r.time)<=now+6*60000&&
   parseUTC(r.time)>=now-windowHours*H)
  .sort((a,b)=>a.time.localeCompare(b.time));
 const latest=samples.at(-1),age=latest?(now-parseUTC(latest.time))/H:null;
 const gaps=samples.slice(1).map((p,i)=>(parseUTC(p.time)-parseUTC(samples[i].time))/60000);
 const longestGapMinutes=gaps.length?Math.max(...gaps):null;
 const enough=samples.length>=Math.ceil(windowHours*60/6*.65)&&
   longestGapMinutes!==null&&longestGapMinutes<=36&&age!==null&&age<=3;
 const min=enough?Math.min(...samples.map(r=>r.elevationIGLD85M)):null;
 const max=enough?Math.max(...samples.map(r=>r.elevationIGLD85M)):null;
 // Range not a validated local storm hazard cutoff; no regional tide
 // prediction, instantaneous setup or local beach height is derived.
 return {station:input.station,name:source.name,sourceRole:source.role,
  recordCount:samples.length,unreliableSensorRows:input.rejectedRows,
  latestTimeUTC:latest?.time??null,ageHours:age===null?null:+age.toFixed(2),
  longestSourceGapMinutes,latestMeasuredIGLD85M:latest?.elevationIGLD85M??null,
  observedRangeM:enough?+(max-min).toFixed(3):null,
  observedMinimumM:min,observedMaximumM:max,
  observedNetChangeM:enough?+(latest.elevationIGLD85M-samples[0].elevationIGLD85M).toFixed(3):null,
  dataStatus:!samples.length?'UNAVAILABLE':age>3?'STALE':
    enough?'OBSERVED_REGIONAL_WATER_LEVEL_VARIABILITY':'INSUFFICIENT_OR_GAPPY',
  qcNote:'Original CO-OPS data q=p is preliminary; abnormal flat/rate/limit flags were excluded.',
  signalClass:'REGIONAL_LAKE_SUPERIOR_CONTEXT_NOT_AGATE_BEACH_STAGE',
  ...PUBLIC_DENIAL};
}
function lakeLevelContext(gauges,{nowISO}={}){
 validateConfig();
 if(!Array.isArray(gauges)||gauges.length!==2||
   new Set(gauges.map(g=>g.station)).size!==2||
   config.stations.some(s=>!gauges.some(g=>g.station===s.id)))
  throw Error('Both independent NOAA regional stations required, never infer from one');
 const reports=gauges.map(g=>summarizeGauge(g,{nowISO}));
 return {schemaVersion:'rockhounding-regional-water-level-research-v1',
  measuredAtTwoDistantNOAAStations:true,
  summaryClockUTC:nowISO,stations:reports,
  hasCompleteRegionalObservations:reports.every(x=>x.dataStatus==='OBSERVED_REGIONAL_WATER_LEVEL_VARIABILITY'),
  regionalNotBeachStage:true,
  canCalculateStormSeicheArrivalAtAgate:false,
  canExtrapolateBeachRunup:false,
  state:reports.every(x=>x.dataStatus==='OBSERVED_REGIONAL_WATER_LEVEL_VARIABILITY')?
   'TWO_REGIONAL_STATIONS_OBSERVED_NOT_BEACH_STAGE':'REGIONAL_SOURCE_STALE_OR_INCOMPLETE',
  ...PUBLIC_DENIAL};
}
module.exports={validateConfig,sourceURL,decodeGaugeData,summarizeGauge,lakeLevelContext};
