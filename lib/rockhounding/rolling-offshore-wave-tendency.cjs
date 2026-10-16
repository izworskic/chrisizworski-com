'use strict';
// Compares TWO consecutive, fully observed 24h offshore wave-activity windows.
// Hs^2 * Tmean is a *relative research descriptor*, NOT physical wave power:
// spectral energy period, nearshore transfer, gravel size and beach slope are
// unknown. Source gaps, stale buoy or bad clock must suppress the comparison.
const {integrateEvent}=require('./photo-free-wave-activity.cjs');
const {checkRow}=require('./glos-spotter-event-ledger.cjs');
const HOUR=3600000;
const ROUND=n=>+n.toFixed(1);
const NO_CLAIMS=Object.freeze({
 photosRequired:false,observedAtBeach:false,siteWaveHeightM:null,
 physicalWavePowerKWPerM:null,sedimentTransportRate:null,
 probabilityFreshAgates:null,canForecastNewStones:false,
 canPublishVisitWindow:false,canClaimBeachSafe:false,
 harborWaveAttenuationModeled:false
});
function rollingWaveTendency(observations,{nowISO,hazardStatus='UNKNOWN'}={}){
 const now=Date.parse(nowISO);
 if(typeof nowISO!=='string'||!Number.isFinite(now)||
  !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(nowISO)||
  !['ACTIVE','CLEAR','UNKNOWN'].includes(hazardStatus)||
  !Array.isArray(observations)||observations.length>700)
  throw Error('Invalid original GLOS wave observations, clock or separate NWS hazard status');
 const seen=new Map();
 for(const source of observations){
  const r=checkRow(source);
  const t=Date.parse(r.time);
  if(t>now+5*60000)throw Error('Future original GLOS measurement');
  if(t<now-74*HOUR)continue;
  if(seen.has(r.time)&&JSON.stringify(seen.get(r.time))!==JSON.stringify(r))
   throw Error('Conflicting original GLOS measurement');
  seen.set(r.time,r);
 }
 const rows=[...seen.values()].sort((a,b)=>a.time.localeCompare(b.time));
 const latest=rows.at(-1)||null;
 const age=latest?(now-Date.parse(latest.time))/HOUR:null;
 const base={
  schemaVersion:'rockhounding-photo-free-48h-wave-tendency-v1',
  source:'ORIGINAL_GLOS_SPOT1361_OFFSHORE_OBSERVATIONS',
  siteId:'grand-marais-agate',
  analyzedAtUTC:nowISO,
  latestObservedUTC:latest?.time??null,
  latestAgeHours:age===null?null:ROUND(age),
  hazardStatus,
  hazardInterpretation:hazardStatus==='ACTIVE'?'ACTIVE_NWS_ALERT_VETO_ON_VISIT_GUIDANCE':
    hazardStatus==='UNKNOWN'?'NWS_ALERT_STATUS_UNKNOWN_NO_CLEARANCE':
    'NO_MATCHED_NWS_ALERT_NOT_A_SAFETY_CLEARANCE',
  status:'NO_SOURCE_OBSERVATIONS',
  current24hActivity:null,previous24hActivity:null,
  changePercentVsPrior24h:null,directionFacingSharePct:null,
  comparedWindowCoveragePct:null,
  observedPast48h:null,
  waveActivityMetric:'trapezoid sum of observed Hs^2 * mean wave period * hours',
  metricIsNotPhysicalEnergy:true,
  metricIsNotSedimentMovement:true,
  directionalBasis:'HISTORIC_NOAA_ENC_2014_NOT_SURVEYED_AGATE_WETLINE',
  sourceGapCutoffHours:1.5,
  activityChangeIsNotACollectingRecommendation:true,
  ...NO_CLAIMS
 };
 if(!latest)return base;
 if(age>3)return {...base,status:'SOURCE_STALE'};
 if(age<-.08334)return {...base,status:'SOURCE_CLOCK_AHEAD'};
 // Two adjacent 24-hour observed spans are compared relative to the
 // same source timestamp; sampling coverage and gaps must be independently
 // sufficient in BOTH windows. No interpolated readings.
 const end=Date.parse(latest.time),t1=end-24*HOUR,t0=end-48*HOUR;
 function window(start,finish){
  const part=rows.filter(r=>{const t=Date.parse(r.time);return t>=start&&t<=finish});
  if(part.length<12)return null;
  const peak=part.reduce((a,b)=>b.waveHeightM>a.waveHeightM?b:a,part[0]);
  const r=integrateEvent(part,{
   fromUTC:new Date(start).toISOString(),
   toUTC:new Date(finish).toISOString(),
   peakAtUTC:peak.time
  });
  const firstAge=(Date.parse(part[0].time)-start)/HOUR;
  const tailAge=(finish-Date.parse(part.at(-1).time))/HOUR;
  if(!r.enoughCoverageForRelativeComparison||
     r.longSourceGaps!==0||r.observedTimeCoveragePct<90||
     firstAge>1||tailAge>1||
     !Number.isFinite(r.observedWaveActivityProxy)||
     !Number.isFinite(r.historicFacingActivityProxy))
   return null;
  return r;
 }
 const old=window(t0,t1),recent=window(t1,end);
 if(!recent||!old)
  return {...base,status:'SOURCE_GAPPY_NO_48H_COMPARISON',
   windowsValidated:Number(!!recent)+Number(!!old)};
 const previous=old.observedWaveActivityProxy,now24=recent.observedWaveActivityProxy;
 const change=previous>0?ROUND(100*(now24/previous-1)):null;
 const tendency=change===null?'OBSERVED_WAVE_ACTIVITY_COMPARISON_NO_BASELINE':
  change<=-30?'OBSERVED_WAVE_ACTIVITY_LOWER_VS_PRIOR_24H':
  change>=30?'OBSERVED_WAVE_ACTIVITY_HIGHER_VS_PRIOR_24H':
  'OBSERVED_WAVE_ACTIVITY_SIMILAR_VS_PRIOR_24H';
 return {...base,status:tendency,
  current24hActivity:now24,previous24hActivity:previous,
  changePercentVsPrior24h:change,
  directionFacingSharePct:recent.historicFacingSharePct,
  comparedWindowCoveragePct:[old.observedTimeCoveragePct,recent.observedTimeCoveragePct],
  observedPast48h:{
   fromUTC:new Date(t0).toISOString(),toUTC:latest.time,
   sampleCount:rows.filter(r=>Date.parse(r.time)>=t0&&Date.parse(r.time)<=end).length,
   actualObservationOnly:true,
   latestWaveM:latest.waveHeightM,
   maxGapHours:Math.max(old.largestSourceGapHours,recent.largestSourceGapHours)
  }
 };
}
module.exports={rollingWaveTendency};
