'use strict';
// Seven-day original GLOS offshore episode memory: measured disturbance
// and uninterrupted post-event offshore easing, not gravel exposure, beach
// surf, public safety clearance, or agate discovery probability.
const {checkRow}=require('./glos-spotter-event-ledger.cjs');
const HOUR=3600000,DAY=24*HOUR,LOOKBACK=7*DAY;
const THRESHOLD_M=1; // descriptive research bin, NOT transport or safety cutoff
const NO_CLAIMS=Object.freeze({
 photosRequired:false,measuredAtAgateBeach:false,
 beachBreakingWaveHeightM:null,shorelineRockChangeMeasured:false,
 agateExposureProbability:null,canPredictNewAgates:false,
 canPublishVisitWindow:false,canClaimBeachSafe:false,
 canTransferToBayshoreHarbor:false
});
const dt=s=>Date.parse(s);
const round=(x,dp=1)=>Number(x.toFixed(dp));
function maxGapHours(rows){
 let gap=0;
 for(let i=1;i<rows.length;i++)gap=Math.max(gap,(dt(rows[i].time)-dt(rows[i-1].time))/HOUR);
 return gap;
}
function memoryOfLastStorm(observations,{nowISO,hazardStatus='UNKNOWN'}={}){
 const now=dt(nowISO);
 if(typeof nowISO!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(nowISO)||
   !Number.isFinite(now)||!['ACTIVE','CLEAR','UNKNOWN'].includes(hazardStatus)||
   !Array.isArray(observations)||observations.length>650)
  throw Error('Invalid original GLOS 7-day input, clock or NWS status');
 const unique=new Map();
 for(const src of observations){
  const row=checkRow(src),t=dt(row.time);
  if(t>now+5*60000)throw Error('Future measured GLOS sample');
  if(t<now-LOOKBACK-5*60000)continue;
  if(unique.has(row.time)&&JSON.stringify(unique.get(row.time))!==JSON.stringify(row))
   throw Error('Conflicting original GLOS observation at identical UTC timestamp');
  unique.set(row.time,row);
 }
 const rows=[...unique.values()].sort((a,b)=>a.time.localeCompare(b.time));
 const latest=rows.at(-1);
 const age=latest?(now-dt(latest.time))/HOUR:null;
 const base={
  schemaVersion:'rockhounding-seven-day-observed-offshore-storm-memory-v1',
  stationId:'SPOT-1361',siteId:'grand-marais-agate',
  source:'ORIGINAL_GLOS_SPOT1361_WAVE_MEASUREMENTS',
  calculatedAtUTC:nowISO,
  newestObservedAtUTC:latest?.time??null,
  newestSourceAgeHours:age===null?null:round(age),
  sourceSampleCount:rows.length,lookbackDays:7,
  sevenDayObservedWaveSeries:rows.slice(-400).map(r=>({t:r.time,h:r.waveHeightM})),
  eventGroupingThresholdM:THRESHOLD_M,
  thresholdMeaning:'1 m descriptive elevated offshore wave grouping; not shore safety or sediment movement',
  hazardStatus,marineAlertCanBeUsedAsSafeClearance:false,
  status:'SOURCE_UNAVAILABLE',
  lastMeasuredEpisode:null,
  elevatedRunsInWindow:0,
  postEventObservationDurationHours:null,
  sourceGapBridged:false,
  waveRelaxationNotBeachSafety:true,
  ...NO_CLAIMS
 };
 if(!latest)return base;
 if(age>3||age<-.083333)return {...base,status:'SOURCE_STALE_OR_CLOCK_INVALID'};
 // Require 12 actual hours and no long source gap near the newest observation,
 // independent of whether a storm was observed earlier in the week.
 const last12=rows.filter(r=>dt(r.time)>=dt(latest.time)-12*HOUR);
 if(last12.length<12||maxGapHours(last12)>1.5||
    (dt(last12[0].time)-dt(latest.time)+12*HOUR)/HOUR>1.5)
  return {...base,status:'RECENT_SOURCE_COVERAGE_INCOMPLETE'};
 const elevated=rows.filter(r=>r.waveHeightM>=THRESHOLD_M);
 if(!elevated.length)return {...base,status:'NO_ELEVATED_OFFSHORE_SAMPLES_IN_7D',
  measuredNoElevatedReadingsNotNoStoneChange:true};
 // A "wave spell" is simply source-adjacent >1m samples. Split on a
 // >3-hour gap between elevated points. It is not a meteorological storm.
 const runs=[];
 for(const r of elevated){
  const tail=runs.at(-1);
  if(!tail||dt(r.time)-dt(tail.at(-1).time)>3*HOUR)runs.push([r]);
  else tail.push(r);
 }
 // Identify the last adequately sampled measured run. Small samples do
 // not prove full events. Never automatically label an unseen storm "over".
 const groups=runs.map(run=>{
  const first=run[0],last=run.at(-1),span=(dt(last.time)-dt(first.time))/HOUR;
  const inside=rows.filter(r=>dt(r.time)>=dt(first.time)&&dt(r.time)<=dt(last.time));
  return {rows:run,first,last,span,
   qualified:run.length>=6&&span>=3&&maxGapHours(inside)<=1.5,
   peak:run.reduce((a,b)=>b.waveHeightM>a.waveHeightM?b:a)};
 });
 const recent=groups.at(-1),a=recent.last,peak=recent.peak;
 const after=rows.filter(r=>dt(r.time)>=dt(a.time));
 const duration=(dt(latest.time)-dt(a.time))/HOUR;
 const gaps=maxGapHours(after);
 const enoughFollowup=after.length>=12&&duration>=18&&gaps<=1.5;
 const stayedBelow=after.slice(1).every(r=>r.waveHeightM<THRESHOLD_M);
 // Last recorded elevated point may be within 3h of latest report. This
 // remains ongoing, not a post-storm opportunity.
 const ongoing=latest.waveHeightM>=THRESHOLD_M;
 const status=!recent.qualified?'ELEVATED_READING_BUT_INSUFFICIENT_EVENT_SAMPLES':
  ongoing?'OFFSHORE_ELEVATED_RECENTLY':
  enoughFollowup&&stayedBelow?'OBSERVED_OFFSHORE_EASING_18H':
  gaps>1.5?'POST_EPISODE_OBSERVATION_GAP':
  'OFFSHORE_EVENT_END_UNCONFIRMED';
 return {
  ...base,status,elevatedRunsInWindow:groups.length,
  postEventObservationDurationHours:round(duration),
  lastMeasuredEpisode:{
   firstElevatedAtUTC:recent.first.time,
   lastElevatedAtUTC:a.time,
   measuredPeakAtUTC:peak.time,
   peakSignificantWaveHeightM:peak.waveHeightM,
   elevatedReadingCount:recent.rows.length,
   observedElevatedSpanHours:round(recent.span),
   hoursSincePeak:round((now-dt(peak.time))/HOUR),
   hoursSinceLastElevated:round((now-dt(a.time))/HOUR),
   sampleQualified:recent.qualified,
   leftCensoredAtStartOfSevenDayQuery:dt(recent.first.time)<=now-LOOKBACK+HOUR,
   currentSignificantWaveHeightM:latest.waveHeightM,
   followupReadingCount:after.length,
   largestFollowupGapHours:round(gaps),
   eighteenHourBelowResearchThresholdConfirmed:
     recent.qualified&&!ongoing&&enoughFollowup&&stayedBelow,
   noMeasuredShorelineChange:true,
   ...NO_CLAIMS
  }
 };
}
module.exports={THRESHOLD_M,memoryOfLastStorm};
