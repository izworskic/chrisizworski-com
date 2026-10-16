'use strict';
// Rockhounding WITHOUT beach photographs: a source-stamped observed offshore
// disturbance proxy. This is NOT a measurement of gravel displacement,
// agate discovery odds, nearshore breaking waves, or an access/safety signal.
const {checkRow,offshoreEvents}=require('./glos-spotter-event-ledger.cjs');
const {researchWaveDirectionOnly}=require('./noaa-enc-geometry.cjs');
const MS_HOUR=3600000,MS_DAY=24*MS_HOUR;
const BASELINE_RECORD_MIN=200;
const MAX_ACCEPTED_GAP_H=2;
const RESEARCH_ELEVATED_M=1;  // Same descriptive bin as GLOS storm group, not an NWS advisory
const PUBLIC_DENIAL=Object.freeze({
 canPredictFreshAgates:false,canConfirmNewlyExposedRocks:false,
 canPublishVisitWindow:false,canClaimSafeShore:false,
 canClaimCollectingPermission:false,canInferHarborBreakingWaves:false
});
function time(s){const t=Date.parse(s);return Number.isFinite(t)?t:NaN}
function round(v,n=2){return Number.isFinite(v)?Number(v.toFixed(n)):null}
function pct(values,quantile){
 if(!values.length)return null;
 const v=[...values].sort((a,b)=>a-b);
 const i=(v.length-1)*quantile,a=Math.floor(i),b=Math.ceil(i);
 return v[a]+(v[b]-v[a])*(i-a);
}
function proxy(r){return r.waveHeightM**2*r.meanPeriodS}
function weightedWindow(rows,start,end){
 // Count only observed consecutive intervals, never bridge outages by
 // assigning missing weather a fictitious quiet value.
 const inside=rows.filter(r=>time(r.time)>=start&&time(r.time)<=end);
 let observedH=0,sum=0,elevatedH=0,maxGapH=0;
 for(let i=1;i<inside.length;i++){
  const dt=(time(inside[i].time)-time(inside[i-1].time))/MS_HOUR;
  maxGapH=Math.max(maxGapH,dt);
  if(dt<=0||dt>MAX_ACCEPTED_GAP_H)continue;
  observedH+=dt;
  sum+=dt*(proxy(inside[i-1])+proxy(inside[i]))/2;
  if(inside[i-1].waveHeightM>=RESEARCH_ELEVATED_M&&inside[i].waveHeightM>=RESEARCH_ELEVATED_M)
   elevatedH+=dt;
 }
 return {rows:inside,observedHours:round(observedH),
  coverageFraction:round(observedH/((end-start)/MS_HOUR),3),
  integratedProxyM2SecHours:round(sum,3), // mathematical integral of Hs² * mean period, NOT wave power
  observedElevatedHours:round(elevatedH),
  averageProxyM2Sec:observedH>0?round(sum/observedH,3):null,
  maxGapHours:inside.length>=2?round(maxGapH):null,
  peakObservedHeightM:inside.length?Math.max(...inside.map(r=>r.waveHeightM)):null};
}
function riskSource(hazard){
 if(!hazard||!['ACTIVE','CLEAR','UNKNOWN'].includes(hazard.status)||
   typeof hazard.checkedAtUTC!=='string'||!Number.isFinite(time(hazard.checkedAtUTC)))
  return {status:'UNKNOWN',checkedAtUTC:null,
   meaning:'NWS current alert snapshot missing; unknown is not clear'};
 return {status:hazard.status,checkedAtUTC:hazard.checkedAtUTC,
  meaning:hazard.status==='ACTIVE'?'Selected NWS marine/coastal alerts active; do not infer safe access':
   hazard.status==='CLEAR'?'No matching selected alerts at observation time; NOT a shoreline safety clearance':
   'NWS alert state unknown; do not infer safe access'};
}
function analyzeSensorDisturbance(ledger,{nowISO,hazardSnapshot=null,siteId='grand-marais-agate'}={}){
 const now=time(nowISO);
 if(!Number.isFinite(now)||!ledger||ledger.schemaVersion!=='rockhounding-glos-spotter-observed-ledger-v1'||
  ledger.stationId!=='SPOT-1361'||ledger.originalObservationsOnly!==true||
  !Array.isArray(ledger.records)||ledger.records.length>18000||
  ledger.canPredictFreshStones!==false||ledger.canPublishVisitWindow!==false||
  ledger.canClaimBeachSafety!==false)
  throw Error('Observed GLOS ledger provenance, science gate, or UTC clock invalid');
 const rows=ledger.records.map(checkRow).sort((a,b)=>a.time.localeCompare(b.time));
 for(let i=0;i<rows.length;i++){
  if(time(rows[i].time)>now+300000||i&&rows[i].time===rows[i-1].time)
   throw Error('Future/conflicting observed GLOS timestamp');
 }
 if(!['grand-marais-agate','grand-marais-harbor'].includes(siteId))
  throw Error('Unsupported shoreline research site');
 const hazard=riskSource(hazardSnapshot);
 const newest=rows.at(-1);
 const ageH=newest?round((now-time(newest.time))/MS_HOUR):null;
 const recent24=weightedWindow(rows,now-MS_DAY,now);
 const recent72=weightedWindow(rows,now-3*MS_DAY,now);
 const reference=rows.filter(r=>time(r.time)<=now&&time(r.time)>=now-120*MS_DAY);
 const referenceProxy=reference.map(proxy);
 const baseline=reference.length>=BASELINE_RECORD_MIN?{
  samples:reference.length,period:'UP_TO_120_DAYS_SAME_GLOS_BUOY',
  proxyMedianM2Sec:round(pct(referenceProxy,.5),3),
  proxyP90M2Sec:round(pct(referenceProxy,.9),3),
  heightMedianM:round(pct(reference.map(r=>r.waveHeightM),.5),3)
 }:null;
 const events=offshoreEvents(ledger,{nowISO});
 const currentQualified=events.eventHistory.filter(e=>e.qualifiesAsDistinctMeasuredOffshoreEpisode&&
  time(e.lastElevatedAt)>=now-72*MS_HOUR);
 const strongest=currentQualified.sort((a,b)=>b.peakSignificantWaveHeightM-a.peakSignificantWaveHeightM)[0]||null;
 const hasActiveHazards=hazard.status==='ACTIVE';
 let status='NO_RECENT_SOURCE_OBSERVATIONS';
 if(siteId==='grand-marais-harbor')status='HARBOR_BREAKWATER_TRANSMISSION_NOT_MODELED';
 else if(!newest)status='NO_SOURCE_OBSERVATIONS';
 else if(ageH>3||ageH<-.1)status='STALE_OR_FUTURE_SOURCE_OBSERVATIONS';
 else if(!baseline||recent24.coverageFraction<.75||recent24.rows.length<12||
   recent24.maxGapHours>MAX_ACCEPTED_GAP_H)status='INSUFFICIENT_CONTINUOUS_24H_SOURCE_COVERAGE';
 else if(hasActiveHazards)status='ACTIVE_NWS_ALERT_WITH_OFFSHORE_MEASUREMENTS';
 else if(currentQualified.length){
  const last12=weightedWindow(rows,now-12*MS_HOUR,now);
  const peaked=strongest.peakSignificantWaveHeightM;
  const latestH=newest.waveHeightM;
  const settling=last12.coverageFraction>=.75&&last12.maxGapHours<=MAX_ACCEPTED_GAP_H&&
   last12.rows.length>=8&&last12.rows.every(r=>r.waveHeightM<RESEARCH_ELEVATED_M)&&
   latestH<=.65*peaked;
  status=settling?'OFFSHORE_HEIGHT_DECLINED_AFTER_MEASURED_EPISODE':
   'ELEVATED_OFFSHORE_EPISODE_OR_INCOMPLETE_RECOVERY';
 }else status='NO_QUALIFIED_OFFSHORE_EPISODE_IN_PAST_72H';
 const researchHeading=newest&&siteId==='grand-marais-agate'?
   researchWaveDirectionOnly(newest.waveFromDeg):null;
 return {
  schemaVersion:'rockhounding-offshore-disturbance-observed-v1',
  source:'GLOS_SPOT1361_OBS_140_MEASURED_OFFSHORE',
  siteId,calculatedAtUTC:nowISO,latestObservedAtUTC:newest?.time??null,
  latestSampleAgeH:ageH,sourceStatus:events.sourceStatus,
  status,statusNotSafetyOrRockExposure:true,
  recent24h:{...recent24,rows:undefined},recent72h:{...recent72,rows:undefined},
  baseline,
  recent72hQualifiedOffshoreEpisodes:currentQualified.length,
  mostRecentStrongOffshoreEpisode:strongest?{
   lastElevatedAt:strongest.lastElevatedAt,peakHeightM:strongest.peakSignificantWaveHeightM,
   peakAtUTC:strongest.peakObservedAt,
   recoveryEstablishedForBeach:false}:null,
  latestHeightM:newest?.waveHeightM??null,
  latestMeanPeriodS:newest?.meanPeriodS??null,
  latestWaveFromDeg:newest?.waveFromDeg??null,
  historical2014ChartWaveFromDifferenceDeg:researchHeading?.relativeAngleDeg??null,
  historicShorelineBearingIsNotSurveyedCurrent:true,
  descriptiveProxyFormula:'Hs_m * Hs_m * mean_period_s',
  descriptiveProxyUnits:'m²·s',
  proxyIsPhysicalWavePowerWattsPerMeter:false,
  proxyIsLocalSedimentTransportModel:false,
  historicalLakeLevelMeasuredAtBeach:false,
  newGravelOrAgatesObserved:false,
  alertSnapshot:hazard,
  recommendedNextAction:siteId==='grand-marais-harbor'?
   'Harbor waves cannot be estimated from the open-lake buoy':
   ageH===null||ageH>3?'Buoy observations stale: withhold current condition':
   hasActiveHazards?'Active NWS alerts: consult official warnings; no shore access clearance':
   status==='OFFSHORE_HEIGHT_DECLINED_AFTER_MEASURED_EPISODE'?
    'Offshore waves declined, but beach conditions and exposed stones have not been observed':
    'Research-only offshore wave evidence; no verified rock exposure or safe visit',
  ...PUBLIC_DENIAL
 };
}
module.exports={weightedWindow,analyzeSensorDisturbance,pct,proxy};
