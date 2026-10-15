'use strict';
// Persistent ORIGINAL issue-time GLWU cycle history. Forecasts must survive valid time.
// This ledger intentionally does NOT publish shore surf, safety, or rock availability.
const {validateWave}=require('./poststorm-engine.cjs');
const H=3600000,DAY=24*H,KEEP_DAYS=21;
const GRIDS=new Set(['2p5km','500m-greatlakes']);
const time=s=>Date.parse(s);
function normalizeCycle(input){
 if(!input||input.schemaVersion!=='rockhounding-glwu-cycle-evidence-v1'||
    input.source!=='NOAA_NOMADS_GLWU_ORIGINAL_GRIB2'||!Array.isArray(input.datasets)||
    input.datasets.length<1||input.datasets.length>2||input.researchOnly!==true||
    input.beachWaterConnectivityValidated!==false||
    input.canPublishBeachWaveForecast!==false)throw Error('Invalid research-only NOAA cycle source');
 const seenGrid=new Set(),out=[];
 for(const dataset of input.datasets){
  if(!GRIDS.has(dataset.grid)||seenGrid.has(dataset.grid)||!Array.isArray(dataset.records)||
   dataset.records.length>60||!dataset.records.length)throw Error('Invalid NOAA grid series');
  seenGrid.add(dataset.grid);
  if(!Number.isFinite(time(dataset.modelCycleAt)))throw Error('Missing model issue time');
  if(!dataset.cell||!Number.isFinite(dataset.cell.lat)||!Number.isFinite(dataset.cell.lon))throw Error('Missing fixed model coordinate');
  const cellId='glwu:'+dataset.grid+':'+dataset.cell.lat.toFixed(5)+':'+dataset.cell.lon.toFixed(5);
  const seenValid=new Set();
  for(const row of dataset.records){
   if(!validateWave(row)||row.modelCycleAt!==dataset.modelCycleAt||row.cellId!==cellId||
      row.sampleTargetId!=='grand-marais-agate'||seenValid.has(row.validAt)||
      time(row.validAt)<time(row.modelCycleAt)||
      time(row.validAt)>time(row.modelCycleAt)+60*H||
      (row.validAt===row.modelCycleAt)!==(row.phase==='MODEL_ANALYSIS'))
     throw Error('Invalid, duplicate or mismatched fixed-cell model row');
   seenValid.add(row.validAt);
   out.push({source:row.source,grid:dataset.grid,cellId,siteId:row.sampleTargetId,
    modelCycleAt:row.modelCycleAt,validAt:row.validAt,phase:row.phase,
    htsgwM:row.htsgwM,windWaveHeightM:row.windWaveHeightM,
    windWavePeriodS:row.windWavePeriodS,windWaveFromDeg:row.windWaveFromDeg});
  }
 }
 return out;
}
function mergeCycleLedger(previous,input,{nowISO,retentionDays=KEEP_DAYS}={}){
 const now=time(nowISO);
 if(!Number.isFinite(now)||!Number.isInteger(retentionDays)||retentionDays<15||retentionDays>90)
  throw Error('Invalid ledger time/retention');
 if(previous&&previous.schemaVersion!=='glwu-issued-cycle-ledger-v1')throw Error('Incompatible ledger');
 const incoming=normalizeCycle(input),old=previous?.records||[];
 if(!Array.isArray(old)||old.length>30000)throw Error('Ledger too large');
 const keep=new Map();let discarded=0;
 for(const row of [...old,...incoming]){
  if(!row||row.source!=='NOAA_GLWU'||!GRIDS.has(row.grid)||
    !Number.isFinite(time(row.modelCycleAt))||!Number.isFinite(time(row.validAt))||
    !row.cellId?.startsWith('glwu:'+row.grid+':')||
    !['MODEL_ANALYSIS','MODEL_FORECAST'].includes(row.phase)||
    !Number.isFinite(row.htsgwM)||row.htsgwM<0||row.htsgwM>18||
    !Number.isFinite(row.windWaveHeightM)||row.windWaveHeightM<0||row.windWaveHeightM>18||
    !Number.isFinite(row.windWavePeriodS)||row.windWavePeriodS<=0||row.windWavePeriodS>30||
    !Number.isFinite(row.windWaveFromDeg)||row.windWaveFromDeg<0||row.windWaveFromDeg>=360)
    throw Error('Corrupt persistent wave ledger; refusing write');
  const issue=time(row.modelCycleAt),valid=time(row.validAt);
  if(issue<now-retentionDays*DAY||issue>now+H||valid<issue||valid>issue+60*H){discarded++;continue}
  if((row.phase==='MODEL_ANALYSIS')!==(valid===issue))throw Error('Cycle initial/forecast type mismatch');
  const key=[row.grid,row.cellId,row.modelCycleAt,row.validAt].join('|');
  const prior=keep.get(key);
  if(prior&&JSON.stringify(prior)!==JSON.stringify(row))
   throw Error('Conflicting source values for identical model issue and valid time');
  keep.set(key,row);
 }
 const records=[...keep.values()].sort((a,b)=>a.modelCycleAt.localeCompare(b.modelCycleAt)||
   a.grid.localeCompare(b.grid)||a.validAt.localeCompare(b.validAt));
 const counts={};
 for(const row of records){
  const k=row.grid;
  if(!counts[k])counts[k]={cycles:new Set(),analysis:0,issuedForecasts:0,cells:new Set()};
  counts[k].cycles.add(row.modelCycleAt);counts[k].cells.add(row.cellId);
  if(row.phase==='MODEL_ANALYSIS')counts[k].analysis++;else counts[k].issuedForecasts++;
 }
 const coverage=Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,{
  cycles:v.cycles.size,analysis:v.analysis,issuedForecasts:v.issuedForecasts,
  distinctCells:v.cells.size,readyFor14DayBaseline:v.analysis>=36
 }]));
 return {schemaVersion:'glwu-issued-cycle-ledger-v1',source:'NOAA_GLWU',
  generatedAt:nowISO,retentionDays,observationsFromActualBuoy:false,
  harborVerified:false,canPublishPostStormWindow:false,forecastsNeverBackfilledAsAnalyses:true,
  records,coverage,diagnostics:{added:incoming.length,kept:records.length,expired:discarded}};
}
function verifyModelRevisions(ledger,{grid='500m-greatlakes',maxLeadHours=48}={}){
 if(!ledger||ledger.schemaVersion!=='glwu-issued-cycle-ledger-v1')throw Error('Missing issued NOAA model ledger');
 const rows=ledger.records.filter(x=>x.grid===grid),analysis=new Map();
 for(const r of rows)if(r.phase==='MODEL_ANALYSIS')analysis.set(r.cellId+'|'+r.validAt,r);
 const matches=[];let unmatched=0;
 for(const r of rows){
  if(r.phase!=='MODEL_FORECAST')continue;
  const lead=(time(r.validAt)-time(r.modelCycleAt))/H;
  if(lead<=0||lead>maxLeadHours)continue;
  const next=analysis.get(r.cellId+'|'+r.validAt);
  if(!next){unmatched++;continue}
  matches.push({issuedAt:r.modelCycleAt,validAt:r.validAt,cellId:r.cellId,leadHours:lead,
   predictedWaveHeightM:r.htsgwM,laterModelInitialHeightM:next.htsgwM,
   deltaM:+(r.htsgwM-next.htsgwM).toFixed(4)});
 }
 const byLead={};
 for(const m of matches){
  const bucket=m.leadHours<=6?'1-6h':m.leadHours<=12?'7-12h':m.leadHours<=24?'13-24h':'25-48h';
  if(!byLead[bucket])byLead[bucket]=[];
  byLead[bucket].push(m.deltaM);
 }
 const buckets=Object.fromEntries(Object.entries(byLead).map(([k,v])=>[k,{
  pairs:v.length,meanAbsoluteChangeM:+(v.reduce((a,b)=>a+Math.abs(b),0)/v.length).toFixed(4),
  meanSignedChangeM:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(4)}]));
 return {grid,matchedPairs:matches.length,unmatchedForecastRows:unmatched,
  matches:matches.slice(-200),leadBuckets:buckets,
  comparison:'MODEL_FORECAST_VS_LATER_MODEL_INITIAL_SAME_FIXED_CELL',
  isIndependentBuoyVerification:false,isBeachForecastSkill:false,
  status:matches.length?'MODEL_REVISION_SAMPLE_NOT_OBSERVATIONAL_SKILL':'INSUFFICIENT_MATCHED_CYCLES',
  canPublishRockhoundingWindow:false};
}
module.exports={normalizeCycle,mergeCycleLedger,verifyModelRevisions};
