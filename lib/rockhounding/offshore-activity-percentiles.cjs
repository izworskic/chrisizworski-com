'use strict';
// 2026 Grand Marais offshore wave activity: source-verified 24h historical
// distribution. These are GLOS buoy measurements, NEVER nearshore rock
// exposure, actual sediment transport, calibrated wave power, or safety.
const {integrateEvent}=require('./photo-free-wave-activity.cjs');
const {checkRow}=require('./glos-spotter-event-ledger.cjs');
const HOUR=3600000;
const WINDOW_HOURS=24,STEP_HOURS=6;
const METRIC='HS_SQUARED_TIMES_MEAN_PERIOD_OBSERVED_HOURS';
const SCHEMA='rockhounding-photo-free-24h-offshore-baseline-2026-v1';
const NO_CLAIMS=Object.freeze({
 photoEvidenceRequired:false,
 modelledBreakingSurfAtBeachM:null,
 measuredStoneExposure:false,
 physicalWavePowerKWPerM:null,
 calibratedNewAgateProbability:null,
 canPredictNewAgates:false,
 canPublishCollectingWindow:false,
 canClaimBeachSafe:false,
 canTransferToBayshoreHarbor:false
});
const fix=(n,dec=1)=>Number(n.toFixed(dec));
function validateLedger(l){
 if(l?.schemaVersion!=='rockhounding-glos-spotter-observed-ledger-v1'||
    l.stationId!=='SPOT-1361'||l.source!=='GLOS_SEAGULL_OBS_140'||
    l.originalObservationsOnly!==true||l.sourceObservationNotBeachSurf!==true||
    l.canPredictFreshStones!==false||l.canPublishVisitWindow!==false||
    !Array.isArray(l.records)||l.records.length!==5243)
  throw Error('Historical comparison requires exact independently archived original 2026 GLOS source');
 const a=l.records[0],b=l.records.at(-1);
 if(a.time!=='2026-06-26T01:16:01Z'||b.time!=='2026-10-14T23:46:01Z')
  throw Error('Historical GLOS source coverage has changed; review baseline');
 let prev=-Infinity;
 for(const row of l.records){
  checkRow(row);
  const t=Date.parse(row.time);
  if(t<=prev)throw Error('Original buoy observations must be unique and strictly ordered');
  prev=t;
 }
 return true;
}
function quantile(sorted,p){
 if(!sorted.length||p<0||p>1)throw Error('Invalid measured historical distribution');
 const i=(sorted.length-1)*p,low=Math.floor(i),high=Math.ceil(i);
 return low===high?sorted[low]:sorted[low]+(sorted[high]-sorted[low])*(i-low);
}
function computeBaseline(ledger){
 validateLedger(ledger);
 const observations=ledger.records;
 const t0=Date.parse(observations[0].time);
 const t1=Date.parse(observations.at(-1).time);
 const interval=STEP_HOURS*HOUR;
 // Fixed UTC 6-hour endpoints, no synthetic or interpolated sample rows.
 const firstEnd=Math.ceil((t0+WINDOW_HOURS*HOUR)/interval)*interval;
 let examined=0,accepted=0;
 const entries=[];
 // Single rolling cursor avoids accidental O(N^2) record allocations.
 let left=0,right=0;
 for(let end=firstEnd;end<=t1;end+=interval){
  examined++;
  const start=end-WINDOW_HOURS*HOUR;
  while(left<observations.length&&Date.parse(observations[left].time)<start)left++;
  while(right<observations.length&&Date.parse(observations[right].time)<=end)right++;
  const rows=observations.slice(left,right);
  if(rows.length<30)continue;
  const firstGap=(Date.parse(rows[0].time)-start)/HOUR;
  const lastGap=(end-Date.parse(rows.at(-1).time))/HOUR;
  if(firstGap>1||lastGap>1)continue;
  const peak=rows.reduce((a,b)=>a.waveHeightM>=b.waveHeightM?a:b);
  const observed=integrateEvent(rows,{
   fromUTC:new Date(start).toISOString(),
   toUTC:new Date(end).toISOString(),
   peakAtUTC:peak.time
  });
  if(!observed.enoughCoverageForRelativeComparison||
     observed.observedTimeCoveragePct<90||
     observed.longSourceGaps!==0||
     observed.largestSourceGapHours>1.5||
     !Number.isFinite(observed.observedWaveActivityProxy))continue;
  accepted++;
  entries.push({
   endUTC:new Date(end).toISOString(),
   value:observed.observedWaveActivityProxy,
   historicFacingValue:observed.historicFacingActivityProxy,
   measuredCoveragePct:observed.observedTimeCoveragePct,
   observedSampleCount:observed.observedSampleCount
  });
 }
 if(accepted<100)throw Error('Insufficient 2026 source-covered 24-hour windows');
 const ordered=entries.map(e=>e.value).sort((a,b)=>a-b);
 return {
  schemaVersion:SCHEMA,
  stationId:'SPOT-1361',source:'GLOS_SEAGULL_OBS_140',
  periodFromUTC:observations[0].time,periodToUTC:observations.at(-1).time,
  baselineSeason:'PARTIAL_SUMMER_FALL_2026_ONLY_NOT_LONG_TERM_CLIMATOLOGY',
  sourceOriginalObservationCount:observations.length,
  metric:METRIC,
  units:'relative Hs^2 × mean wave period × observed hours, NOT physical kW/m',
  periodHours:WINDOW_HOURS,stepHours:STEP_HOURS,
  originalNoInterpolation:true,
  minimumCoveragePct:90,
  gapCutoffHours:1.5,
  windowsExamined:examined,windowsAccepted:accepted,
  sourceIndependentWindowCount:null,
  overlappingWindowsNotIndependentStorms:true,
  q25:fix(quantile(ordered,.25),3),
  q50:fix(quantile(ordered,.50),3),
  q75:fix(quantile(ordered,.75),3),
  q90:fix(quantile(ordered,.90),3),
  maxObserved:Math.max(...ordered),
  orderedMeasuredValues:ordered,
  historicalChartFacingNotPresentShorelineSurvey:true,
  regionalBuoyNotBeachWaves:true,
  ...NO_CLAIMS
 };
}
function compareToBaseline(waveTendency,{baseline,hazardStatus='UNKNOWN'}={}){
 if(baseline?.schemaVersion!==SCHEMA||
    baseline.stationId!=='SPOT-1361'||baseline.source!=='GLOS_SEAGULL_OBS_140'||
    baseline.sourceOriginalObservationCount!==5243||
    baseline.metric!==METRIC||baseline.periodHours!==24||
    baseline.stepHours!==6||baseline.originalNoInterpolation!==true||
    baseline.minimumCoveragePct!==90||baseline.gapCutoffHours!==1.5||
    baseline.baselineSeason!=='PARTIAL_SUMMER_FALL_2026_ONLY_NOT_LONG_TERM_CLIMATOLOGY'||
    !Array.isArray(baseline.orderedMeasuredValues)||
    baseline.orderedMeasuredValues.length!==baseline.windowsAccepted||
    baseline.windowsAccepted<100||
    baseline.canPredictNewAgates!==false||
    baseline.canClaimBeachSafe!==false||
    !['ACTIVE','CLEAR','UNKNOWN'].includes(hazardStatus))
  throw Error('Unverified measured offshore historical reference distribution');
 const values=baseline.orderedMeasuredValues;
 if(values.some((v,i)=>!Number.isFinite(v)||v<0||(i>0&&v<values[i-1])))
  throw Error('Corrupted source-derived offshore reference sample');
 const base={
  schemaVersion:'rockhounding-photo-free-offshore-seasonal-comparison-v1',
  reference:'ORIGINAL_GLOS_SPOT1361_JUNE_TO_OCTOBER_2026',
  referenceDescription:'Compared only with observed 24-hour windows from June–October 2026; not all years or a rockhounding success rate.',
  stationId:'SPOT-1361',
  windowsInReference:values.length,
  comparisonStatus:'NO_RECENT_SOURCE_COVERED_WINDOW',
  observedLast24hActivity:null,
  historicalPercentileOf24hActivity:null,
  percentileIsFrequencyOfMeasuredActivityNotRockFinds:true,
  observedCurrentWaveHeightM:waveTendency?.observedPast48h?.latestWaveM??null,
  hazardStatus,hazardNotCleared:hazardStatus!=='CLEAR',
  sourceStaleOrGappy:true,
  measuredAtAgateBeach:false,
  measuredLocalSedimentMovement:false,
  ...NO_CLAIMS
 };
 if(waveTendency?.schemaVersion!=='rockhounding-photo-free-48h-wave-tendency-v1'||
    waveTendency.source!=='ORIGINAL_GLOS_SPOT1361_OFFSHORE_OBSERVATIONS'||
    waveTendency.canForecastNewStones!==false||
    waveTendency.canClaimBeachSafe!==false||
    !['OBSERVED_WAVE_ACTIVITY_LOWER_VS_PRIOR_24H',
      'OBSERVED_WAVE_ACTIVITY_HIGHER_VS_PRIOR_24H',
      'OBSERVED_WAVE_ACTIVITY_SIMILAR_VS_PRIOR_24H'].includes(waveTendency.status)||
    !Number.isFinite(waveTendency.current24hActivity)||
    !Array.isArray(waveTendency.comparedWindowCoveragePct)||
    waveTendency.comparedWindowCoveragePct.some(x=>x<90)||
    waveTendency.latestAgeHours===null||
    waveTendency.latestAgeHours>3||waveTendency.latestAgeHours<-.1)return base;
 const current=waveTendency.current24hActivity;
 // midrank for ties; percentile is how often this amplitude proxy appeared
 // in the sampled 2026 reference, not odds of exposed pebbles.
 let below=0,equal=0;
 for(const v of values){
  if(v<current-1e-9)below++;
  else if(Math.abs(v-current)<=1e-9)equal++;
 }
 const pct=fix(100*(below+equal/2)/values.length);
 return {...base,
  comparisonStatus:hazardStatus==='ACTIVE'?
   'OBSERVED_ACTIVITY_CONTEXT_ACTIVE_NWS_HAZARDS':
   'OBSERVED_OFFSHORE_ACTIVITY_VS_2026_ARCHIVE_ONLY',
  observedLast24hActivity:current,
  historicalPercentileOf24hActivity:pct,
  sourceStaleOrGappy:false
 };
}
module.exports={SCHEMA,METRIC,computeBaseline,compareToBaseline};
