'use strict';
// Separate offshore model-vs-ACTUAL NDBC measurement verification.
// Never reuse the Agate research cell, and never reinterpret as shoreline surf skill.
const {parseNdbcStdmet}=require('./exposure-core.cjs');
const {STATION,distanceKm}=require('./superior-wave-reference.cjs');
const HOUR=3600000,DAY=24*HOUR;
const MODEL_SCHEMA='noaa-glwu-buoy45004-model-v1';
const LEDGER_SCHEMA='offshore-model-issues-45004-v1';
const DELTA_LIMIT_MS=30*60000; // ±30min: never interpolate a missing buoy reading.
const asMs=s=>Date.parse(s);
function validateOffshoreModel(input){
 if(!input||input.schemaVersion!==MODEL_SCHEMA||input.source!=='NOAA_GLWU_GRIB2'||
    input.station?.id!==STATION.id||input.grid!=='2p5km'||input.parameter!=='HTSGW'||
    input.isAgateBeachModelCell!==false||input.canClaimNearshoreSurf!==false||
    input.canClaimRockExposure!==false||input.canClaimSafeShore!==false||
    !Number.isFinite(asMs(input.issueAt))||!Array.isArray(input.modelRecords)||
    !input.modelRecords.length||input.modelRecords.length>70||
    !Number.isFinite(input.cell?.lat)||!Number.isFinite(input.cell?.lon)||
    distanceKm(STATION.lat,STATION.lon,input.cell.lat,input.cell.lon)>5)
    throw Error('Invalid or geographically unverified NDBC 45004 model input');
 const seen=new Set();
 for(const row of input.modelRecords){
  const lead=(asMs(row.validAt)-asMs(row.issueAt))/HOUR;
  if(row.issueAt!==input.issueAt||!Number.isFinite(lead)||lead<0||lead>60||
     Math.abs(lead-row.leadHours)>0.001||
     row.phase!==(lead===0?'MODEL_INITIAL':'MODEL_FORECAST')||
     !Number.isFinite(row.modelSignificantWaveHeightM)||
     row.modelSignificantWaveHeightM<0||row.modelSignificantWaveHeightM>18||
     seen.has(row.validAt))throw Error('Invalid issue-time NOAA model record');
  seen.add(row.validAt);
 }
 return true;
}
function mergeOffshoreModelIssues(previous,input,{nowISO,retentionDays=21}={}){
 validateOffshoreModel(input);
 const now=asMs(nowISO);if(!Number.isFinite(now)||!Number.isInteger(retentionDays)||retentionDays<2||retentionDays>90)
  throw Error('Invalid offshore archive cutoff');
 if(previous&&(previous.schemaVersion!==LEDGER_SCHEMA||!Array.isArray(previous.cycles)))throw Error('Invalid prior offshore model ledger');
 const map=new Map(),old=previous?.cycles||[];
 if(old.length>250)throw Error('Offshore ledger too large');
 for(const item of [...old,input]){
  validateOffshoreModel(item);
  if(asMs(item.issueAt)>now+HOUR)throw Error('Cannot archive future-issued model cycle');
  if(asMs(item.issueAt)<now-retentionDays*DAY)continue;
  const k=item.issueAt+'|'+item.cell.lat.toFixed(6)+'|'+item.cell.lon.toFixed(6);
  const existing=map.get(k);
  if(existing&&JSON.stringify(existing)!==JSON.stringify(item))throw Error('Conflicting same-issue NOAA offshore model source');
  map.set(k,item);
 }
 const cycles=[...map.values()].sort((a,b)=>a.issueAt.localeCompare(b.issueAt));
 return {schemaVersion:LEDGER_SCHEMA,source:'NOAA_GLWU_GRIB2',
  generatedAt:nowISO,stationId:STATION.id,retentionDays,cycles,
  excludesAgateBeachModelCell:true,canClaimBeachSurf:false,canClaimRockExposure:false,
  counts:{cycles:cycles.length,forecasts:cycles.reduce((a,b)=>a+b.modelRecords.filter(x=>x.phase==='MODEL_FORECAST').length,0)}};
}
function verifyAgainstBuoy(archive,rawText,{asOfISO,toleranceMinutes=30,maxLeadHours=24}={}){
 if(archive?.schemaVersion!==LEDGER_SCHEMA||!Array.isArray(archive.cycles)||
    !Number.isFinite(asMs(asOfISO))||
    !Number.isInteger(toleranceMinutes)||toleranceMinutes<0||toleranceMinutes>30||
    !Number.isInteger(maxLeadHours)||maxLeadHours<1||maxLeadHours>48)throw Error('Invalid comparison inputs');
 const asOf=asMs(asOfISO),tolerance=toleranceMinutes*60000;
 const measured=parseNdbcStdmet(rawText).filter(r=>Number.isFinite(r.waveHeightM)&&r.waveHeightM<=18&&
  Number.isFinite(asMs(r.timestamp))&&asMs(r.timestamp)<=asOf);
 const forecasts=[];
 for(const cycle of archive.cycles){
  validateOffshoreModel(cycle);
  for(const r of cycle.modelRecords){
   if(r.phase!=='MODEL_FORECAST'||r.leadHours>maxLeadHours||
      asMs(r.validAt)>asOf||asMs(r.issueAt)>=asMs(r.validAt))continue;
   forecasts.push({...r,cell:cycle.cell,grid:cycle.grid});
  }
 }
 forecasts.sort((a,b)=>a.validAt.localeCompare(b.validAt)||a.issueAt.localeCompare(b.issueAt));
 const rows=[],usedSamples=new Set(),byCell=new Map();
 for(const r of forecasts){
  const eligible=measured.filter(obs=>{
   const diff=Math.abs(asMs(obs.timestamp)-asMs(r.validAt));
   return diff<=tolerance&&asMs(obs.timestamp)>=asMs(r.issueAt)&&
    !usedSamples.has(obs.timestamp);
  });
  eligible.sort((a,b)=>Math.abs(asMs(a.timestamp)-asMs(r.validAt))-Math.abs(asMs(b.timestamp)-asMs(r.validAt))||
    a.timestamp.localeCompare(b.timestamp));
  const obs=eligible[0];
  if(!obs)continue;
  usedSamples.add(obs.timestamp);
  const delta=+(r.modelSignificantWaveHeightM-obs.waveHeightM).toFixed(4);
  const cellKey=r.cell.lat.toFixed(6)+','+r.cell.lon.toFixed(6);
  byCell.set(cellKey,(byCell.get(cellKey)||0)+1);
  rows.push({issueAt:r.issueAt,forecastValidAt:r.validAt,
   buoyObservedAt:obs.timestamp,buoyStation:STATION.id,
   modelGrid:r.grid,modelCell:cellKey,
   modelCellDistanceKm:+distanceKm(STATION.lat,STATION.lon,r.cell.lat,r.cell.lon).toFixed(3),
   leadHours:r.leadHours,modelHeightM:r.modelSignificantWaveHeightM,
   observedHeightM:obs.waveHeightM,
   timeOffsetMinutes:+((asMs(obs.timestamp)-asMs(r.validAt))/60000).toFixed(2),modelMinusObservedM:delta});
 }
 const n=rows.length,sum=rows.reduce((a,b)=>a+b.modelMinusObservedM,0);
 const mae=n?rows.reduce((a,b)=>a+Math.abs(b.modelMinusObservedM),0)/n:null;
 const rmse=n?Math.sqrt(rows.reduce((a,b)=>a+b.modelMinusObservedM**2,0)/n):null;
 const round=x=>x===null?null:+x.toFixed(4);
 const cells=[...byCell.entries()].map(([cell,matches])=>({cell,matches}));
 const status=!n?'NO_DATE_MATCHED_BUOY_OBSERVATIONS':cells.length!==1?'MULTIPLE_MODEL_CELLS_NO_AGGREGATE_SKILL':
  n<10?'PRELIMINARY_TOO_FEW_PAIRS':'PRELIMINARY_OFFSHORE_PAIRS_NOT_CALIBRATED';
 const stats=cells.length===1?{maeM:round(mae),rmseM:round(rmse),meanBiasM:round(n?sum/n:null)}:
  {maeM:null,rmseM:null,meanBiasM:null};
 return {schemaVersion:'offshore-buoy-45004-verification-v1',
  stationId:STATION.id,modelGrid:'2p5km',sourceBuoy:STATION.url,
  sourceModel:'NOAA_GLWU_GRIB2',
  asOfISO,toleranceMinutes,maxLeadHours,
  observedSamplesAvailable:measured.length,eligibleForecastRows:forecasts.length,
  matchedPairs:n,unmatchedForecastRows:forecasts.length-n,
  distinctModelCells:cells,status,metrics:stats,matches:rows.slice(-200),
  isIndependentOffshoreBuoyComparison:true,
  isShorelineWaveCalibration:false,isRockFindingCalibration:false,
  canClaimSafeConditions:false,canPublishVisitorOpportunity:false,
  caveat:'Offshore model vs buoy at NDBC 45004 only. Not Agate Beach surf, harbor conditions or stone exposure. A small single-cycle sample is not calibrated model skill.'};
}
module.exports={MODEL_SCHEMA,LEDGER_SCHEMA,validateOffshoreModel,mergeOffshoreModelIssues,verifyAgainstBuoy};
