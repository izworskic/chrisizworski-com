'use strict';
// Durable, deduplicated *observed* GLOS Spotter history. An elevated period is
// one correlated offshore event, not a set of independent storm outcomes.
// No calculated value is a rock-exposure, visitor-window or safety forecast.
const {validateSpotterSource}=require('./glos-spotter.cjs');
const HOUR=3600000,DAY=24*HOUR;
const STATION='SPOT-1361',SOURCE='GLOS_SPOT_1361_OBSERVED_OPEN_LAKE';
const SCHEMA='rockhounding-glos-spotter-observed-ledger-v1';
const RISK_DENIAL=Object.freeze({
 canPredictFreshStones:false,canPublishVisitWindow:false,
 canClaimBeachSafety:false,canInferHarborWaveHeight:false
});
const ELEVATED_M=1.0; // research grouping threshold, NOT an NWS warning threshold
const GAP_BETWEEN_EPISODES_HOURS=48;
function time(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s))
  return NaN;
 const t=Date.parse(s);
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===s.slice(0,19)?t:NaN;
}
function checkRow(row){
 if(!row||!Number.isFinite(time(row.time))||
  row.source!==SOURCE||row.phase!=='OBSERVATION'||
  !Number.isFinite(row.waveHeightM)||row.waveHeightM<0||row.waveHeightM>18||
  !Number.isFinite(row.waveFromDeg)||row.waveFromDeg<0||row.waveFromDeg>=360||
  !Number.isFinite(row.meanPeriodS)||row.meanPeriodS<=0||row.meanPeriodS>30||
  !Number.isFinite(row.lat)||Math.abs(row.lat-46.69567108154297)>.04||
  !Number.isFinite(row.lon)||Math.abs(row.lon+86.00379943847656)>.04)
   throw Error('Source-invalid GLOS Spotter observation cannot enter research ledger');
 return row;
}
function blankLedger(nowISO){
 return {schemaVersion:SCHEMA,stationId:STATION,source:'GLOS_SEAGULL_OBS_140',
  generatedAtUTC:nowISO,retentionDays:120,thresholdM:ELEVATED_M,
  originalObservationsOnly:true,sourceObservationNotBeachSurf:true,
  records:[],...RISK_DENIAL};
}
function mergeSpotterLedger(previous,parsed,{nowISO,retentionDays=120}={}){
 validateSpotterSource();
 const now=time(nowISO);
 if(!Number.isFinite(now)||!Number.isInteger(retentionDays)||retentionDays<30||retentionDays>120||
  !parsed||parsed.stationId!==STATION||parsed.sourceDatasetId!=='obs_140'||
  parsed.observedNotForecast!==true||!Array.isArray(parsed.rows)||parsed.rows.length>18000)
  throw Error('Invalid source or bounded ledger merge settings');
 if(previous){
  if(previous.schemaVersion!==SCHEMA||previous.stationId!==STATION||
   previous.source!=='GLOS_SEAGULL_OBS_140'||previous.originalObservationsOnly!==true||
   previous.sourceObservationNotBeachSurf!==true||
   !Array.isArray(previous.records)||previous.records.length>18000||
   Object.keys(RISK_DENIAL).some(k=>previous[k]!==false))
   throw Error('Untrusted or incompatible prior GLOS historical ledger');
 }
 const all=[...(previous?.records||[]),...parsed.rows];
 const unique=new Map();
 let expired=0,added=0;
 const existing=new Set((previous?.records||[]).map(r=>r.time));
 for(const row of all){
  checkRow(row);
  const at=time(row.time);
  if(at>now+5*60000)throw Error('Future GLOS observations rejected');
  if(at<now-retentionDays*DAY){expired++;continue;}
  if(unique.has(row.time)){
   if(JSON.stringify(unique.get(row.time))!==JSON.stringify(row))
    throw Error('Conflicting actual GLOS measurements at one UTC instant');
  }else{
   unique.set(row.time,row);
   if(!existing.has(row.time))added++;
  }
 }
 const rows=[...unique.values()].sort((a,b)=>a.time.localeCompare(b.time));
 return {...blankLedger(nowISO),retentionDays,records:rows,
  lastSourceSampleAtUTC:parsed.rows.at(-1)?.time??null,
  diagnostics:{incoming:parsed.rows.length,added,expired,retained:rows.length,
   firstAt:rows[0]?.time??null,lastAt:rows.at(-1)?.time??null,
   distinctUtcDays:new Set(rows.map(r=>r.time.slice(0,10))).size,
   lastObservationAgeHours:rows.length?+((now-time(rows.at(-1).time))/HOUR).toFixed(2):null}};
}
function maxGapHours(rows){
 let max=0;
 for(let i=1;i<rows.length;i++)max=Math.max(max,(time(rows[i].time)-time(rows[i-1].time))/HOUR);
 return rows.length>1?+max.toFixed(2):null;
}
function offshoreEvents(ledger,{nowISO}={}){
 const now=time(nowISO);
 if(!Number.isFinite(now)||ledger?.schemaVersion!==SCHEMA||
   ledger?.stationId!==STATION||!Array.isArray(ledger.records)||
   ledger.records.length>18000||ledger?.originalObservationsOnly!==true||
   Object.keys(RISK_DENIAL).some(k=>ledger[k]!==false))
  throw Error('Invalid observed-wave ledger or research clock');
 const rows=ledger.records.map(checkRow).sort((a,b)=>a.time.localeCompare(b.time));
 if(rows.some(r=>time(r.time)>now+5*60000))throw Error('Future record not permitted in storm evidence');
 for(let i=1;i<rows.length;i++)
  if(rows[i].time===rows[i-1].time)throw Error('Duplicate GLOS timestamp in retained ledger');
 const high=rows.filter(r=>r.waveHeightM>=ELEVATED_M);
 const groups=[];
 for(const r of high){
  let last=groups.at(-1);
  if(!last||time(r.time)-time(last.at(-1).time)>GAP_BETWEEN_EPISODES_HOURS*HOUR)
   groups.push([r]);
  else last.push(r);
 }
 const events=groups.map(group=>{
  const first=group[0],last=group.at(-1);
  const p=group.reduce((m,r)=>r.waveHeightM>m.waveHeightM?r:m,first);
  const from=time(first.time),to=time(last.time);
  const within=rows.filter(x=>time(x.time)>=from&&time(x.time)<=to);
  const coverageGap=maxGapHours(within);
  const correlated=group.length>=6&&to-from>=3*HOUR&&
   coverageGap!==null&&coverageGap<=3;
  // Source data cannot certify storm completion if buoy records disappear.
  const post=rows.filter(x=>time(x.time)>to&&time(x.time)<=to+48*HOUR);
  const postCoverage=post.length>=8&&maxGapHours([last,...post])<=3;
  const lastObserved=rows.at(-1);
  const complete=correlated&&postCoverage&&
   time(lastObserved.time)>=to+48*HOUR&&
   maxGapHours([last,...rows.filter(x=>time(x.time)>to&&time(x.time)<=to+48*HOUR)])<=3;
  const tail=rows.filter(x=>time(x.time)>=time(p.time)+6*HOUR&&
      time(x.time)<=time(p.time)+36*HOUR);
  const lastTail=tail.at(-1);
  // A sufficiently sampled decline is an *offshore observation*, not an
  // endorsed collecting window. No gap may be bridged by interpolation.
  const fromPeak=rows.filter(x=>time(x.time)>=time(p.time)&&
    time(x.time)<=time(lastTail?.time||p.time));
  const decline=correlated&&tail.length>=8&&maxGapHours(fromPeak)!==null&&
   maxGapHours(fromPeak)<=3&&lastTail?.waveHeightM<=p.waveHeightM*.65;
  return {
   id:'SPOT1361-'+first.time.replace(/[-:]/g,''),firstElevatedAt:first.time,
   lastElevatedAt:last.time,peakObservedAt:p.time,
   peakSignificantWaveHeightM:p.waveHeightM,
   elevatedObservationCount:group.length,
   observedSpanHours:+((to-from)/HOUR).toFixed(2),
   gapWithinElevatedSpanHours:coverageGap,
   qualifiesAsDistinctMeasuredOffshoreEpisode:correlated,
   timeSeparatedFromPriorGroupByHours:GAP_BETWEEN_EPISODES_HOURS,
   observedOffshoreDeclineAfterPeak:!!decline,
   observedDeclineSampleAt:decline?lastTail.time:null,
   observedDeclineHeightM:decline?lastTail.waveHeightM:null,
   completeness:complete?'OBSERVED_THROUGH_48H_POST_EVENT':
    'EVENT_END_UNCONFIRMED_OR_SOURCE_GAPPY',
   source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',
   riskThresholdOrAlert:false,
   actualBeachRockOutcomeObserved:false,
   ...RISK_DENIAL
  };
 });
 const latest=rows.at(-1);
 const age=latest?(now-time(latest.time))/HOUR:null;
 return {schemaVersion:'rockhounding-glos-offshore-event-history-v1',
  source:'GLOS_SEAGULL_OBS_140_SPOT_1361',
  calculatedAtUTC:nowISO,recordCount:rows.length,latestObservedAt:latest?.time??null,
  latestAgeHours:age===null?null:+age.toFixed(2),
  sourceStatus:!rows.length?'NO_OBSERVATIONS':age>3?'STALE_OBSERVATIONS':
   maxGapHours(rows.slice(-Math.min(18,rows.length)))>3?'SPARSE_OR_GAPPY_RECENT_DATA':
   'OBSERVED_OPEN_LAKE_DATA_ONLY',
  thresholdM:ELEVATED_M,thresholdMeaning:'DESCRIPTIVE_OFFSHORE_GROUPING_NOT_NWS_HAZARD',
  episodeSeparationHours:GAP_BETWEEN_EPISODES_HOURS,
  eventCount:events.length,qualifiedDistinctEvents:events.filter(e=>e.qualifiesAsDistinctMeasuredOffshoreEpisode).length,
  eventHistory:events.slice(-35),
  sourceOnlyNoBeachOutcome:true,calibratedToActualRockExposure:false,
  sufficientForRockExposurePrediction:false,
  ...RISK_DENIAL};
}
module.exports={SCHEMA,STATION,ELEVATED_M,blankLedger,checkRow,mergeSpotterLedger,offshoreEvents};
