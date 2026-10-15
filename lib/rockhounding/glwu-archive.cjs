'use strict';
const {validateWave}=require('./poststorm-engine.cjs');
const HOUR=3600000;
function mergeArchive(oldArchive,input,{nowISO,retentionDays=19}={}){
 const now=Date.parse(nowISO);if(!Number.isFinite(now))throw Error('Valid UTC nowISO required');
 if(!input||input.source!=='NOAA_GLWU'||!Array.isArray(input.records)||input.records.length>10000)throw Error('Invalid NOAA sample batch');
 const keep=new Map();let discarded=0,invalid=0;
 for(const r of [...(oldArchive?.records||[]),...input.records]){
  if(!validateWave(r)){invalid++;continue;}
  const valid=Date.parse(r.validAt),cycle=Date.parse(r.modelCycleAt);
  if(valid<now-retentionDays*24*HOUR||valid>now+72*HOUR||cycle>now+HOUR){discarded++;continue;}
  // Historic forecasts cannot masquerade as past model analyses.
  if(r.phase==='MODEL_FORECAST'&&valid<=now){discarded++;continue;}
  const key=(r.sampleTargetId||'')+'|'+r.cellId+'|'+r.phase+'|'+r.validAt;
  const prev=keep.get(key);if(!prev||r.modelCycleAt>prev.modelCycleAt)keep.set(key,r);
 }
 const records=[...keep.values()].sort((a,b)=>a.validAt.localeCompare(b.validAt)||a.cellId.localeCompare(b.cellId)||a.phase.localeCompare(b.phase));
 return {schemaVersion:'glwu-analysis-archive-v1',source:'NOAA_GLWU',generatedAt:nowISO,
  hasActualBuoyObservations:false,modelGridResolution:'APPROX_2_5KM',
  analysisCannotBeBackfilledFromForecast:true,retentionDays,records,
  diagnostics:{validRecords:records.length,invalidRowsDiscarded:invalid,outOfRangeDiscarded:discarded}};
}
function forSite(archive,{siteId,cellId,nowISO}={}){
 const now=Date.parse(nowISO);if(!Number.isFinite(now))throw Error('Invalid now');
 const matching=(archive?.records||[]).filter(r=>r.sampleTargetId===siteId&&r.cellId===cellId);
 return {baseline:matching.filter(r=>r.phase==='MODEL_ANALYSIS'&&Date.parse(r.validAt)<now-72*HOUR),
  history:matching.filter(r=>r.phase==='MODEL_ANALYSIS'&&Date.parse(r.validAt)>=now-72*HOUR&&Date.parse(r.validAt)<=now),
  forecast:matching.filter(r=>r.phase==='MODEL_FORECAST'&&Date.parse(r.validAt)>now)};
}
module.exports={mergeArchive,forSite};
