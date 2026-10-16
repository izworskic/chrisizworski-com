'use strict';
// Honest, no-photo post-storm monitoring. Data from original GLOS offshore
// buoy + distant NOAA CO-OPS gauges + current NWS hazard source. The output
// is an ACTIVITY / DATA-COVERAGE report, never an agate or safety forecast.
const {checkRow}=require('./glos-spotter-event-ledger.cjs');
const {researchWaveDirectionOnly}=require('./noaa-enc-geometry.cjs');
const H=3600000;
const DENIAL=Object.freeze({
 canRecommendVisit:false,canClaimNewAgates:false,
 canClaimSafeShore:false,canClaimLegalCollecting:false,
 measuredAgateBeachBreakingSurf:false,validatedRockExposureModel:false
});
function at(s){const t=Date.parse(s);return Number.isFinite(t)?t:NaN}
function maxGap(rows){
 let max=0;
 for(let i=1;i<rows.length;i++)max=Math.max(max,(at(rows[i].time)-at(rows[i-1].time))/H);
 return rows.length>1?max:Infinity;
}
function waveEvolution(input,{nowISO}={}){
 const now=at(nowISO);
 if(!Number.isFinite(now)||!input||!Array.isArray(input.records)||input.records.length>18000||
    input.stationId!=='SPOT-1361'||input.originalObservationsOnly!==true)
  throw Error('Only direct GLOS SPOT-1361 observations can describe storm evolution');
 const rows=input.records.map(checkRow).filter(r=>at(r.time)<=now+5*60000&&
    at(r.time)>=now-36*H).sort((a,b)=>a.time.localeCompare(b.time));
 const latest=rows.at(-1);
 if(!latest)return {status:'NO_RECENT_WAVE_OBSERVATIONS',latestAt:null,
  peak36hM:null,latestSignificantWaveM:null,latestWaveFromDeg:null,
  sustainedDrop:false,recordCount:0,...DENIAL};
 const age=(now-at(latest.time))/H,latest6=rows.filter(r=>at(r.time)>=at(latest.time)-6*H);
 const peak=rows.reduce((a,b)=>b.waveHeightM>a.waveHeightM?b:a);
 const max6=maxGap(latest6);
 const recentGood=age<=3&&latest6.length>=8&&max6<=2;
 // It is not "settled" if a temporary low is followed by renewed waves.
 const eased=recentGood&&peak.waveHeightM>=1&&
   at(latest.time)-at(peak.time)>=6*H&&
   latest6.every(r=>r.waveHeightM<=peak.waveHeightM*.75)&&
   latest.waveHeightM<=peak.waveHeightM*.65;
 const status=age>3?'STALE_BUOY_SOURCE':!recentGood?'SPARSE_RECENT_WAVE_SOURCE':
   eased?'MEASURED_OFFSHORE_WAVES_EASING':
   peak.waveHeightM>=1?'MEASURED_OFFSHORE_ACTIVITY_NOT_SUSTAINABLY_EASING':
   'NO_ELEVATED_OFFSHORE_WAVES_IN_36H_SAMPLE';
 const facing=researchWaveDirectionOnly(latest.waveFromDeg,{siteId:'grand-marais-agate'});
 return {status,latestAt:latest.time,ageHours:+age.toFixed(2),
  peak36hM:peak.waveHeightM,peakAt:peak.time,
  latestSignificantWaveM:latest.waveHeightM,latestWaveFromDeg:latest.waveFromDeg,
  latestMeanPeriodS:latest.meanPeriodS,peakToLatestDeclineFraction:
   peak.waveHeightM>0?+(1-latest.waveHeightM/peak.waveHeightM).toFixed(3):null,
  recent6hCount:latest6.length,recent6hMaxGapHours:Number.isFinite(max6)?+max6.toFixed(2):null,
  waveDataFresh:recentGood,sustainedDrop:eased,
  historicNoaaChartFacingDeg:facing.historicNoaaChartFacingDeg,
  directionRelativeToHistoricCoastDeg:facing.relativeAngleDeg,
  observedWaveDirectionNotWind:true,shoreNormalNotCurrentlySurveyed:true,
  noNearshoreWaveTransmissionModeled:true,recordCount:rows.length,...DENIAL};
}
function pictureFreeReport({waveLedger,regionalWaterLevels,nwsHazards,nowISO}={}){
 const wave=waveEvolution(waveLedger,{nowISO});
 if(regionalWaterLevels?.schemaVersion!=='rockhounding-regional-water-level-research-v1'||
  regionalWaterLevels.measuredAtTwoDistantNOAAStations!==true||
  regionalWaterLevels.regionalNotBeachStage!==true||
  regionalWaterLevels.canClaimBeachSafe!==false||
  regionalWaterLevels.canPredictExposedAgates!==false||
  regionalWaterLevels.stations?.length!==2||
  !['ACTIVE','CLEAR','UNKNOWN'].includes(nwsHazards?.status))
  throw Error('No-photo conditions require original independent NOAA and NWS source classifications');
 const gaugeComplete=regionalWaterLevels.hasCompleteRegionalObservations;
 const alert=nwsHazards.status;
 const state=alert==='ACTIVE'?'NWS_ALERTS_ACTIVE':
  alert==='UNKNOWN'?'NWS_HAZARDS_UNKNOWN':
  !wave.waveDataFresh?'OFFSHORE_OBSERVATION_STALE_OR_MISSING':
  !gaugeComplete?'NOAA_REGIONAL_WATER_LEVEL_CONTEXT_INCOMPLETE':
  wave.sustainedDrop?'MEASURED_OFFSHORE_WAVE_EASING_RESEARCH_ONLY':
  'OFFSHORE_WAVE_ACTIVITY_MONITORING_RESEARCH_ONLY';
 const available={
  realNearGrandMaraisOffshoreWaveHeight:wave.waveDataFresh,
  observedWaveFromDirection:wave.waveDataFresh,
  nearbyActualBreakingSurf:false,
  bothRegionalNOAAWaterLevelSeries:gaugeComplete,
  verifiedLocalGrandMaraisWaterline:false,
  independentNWSActiveAlertCheck:alert!=='UNKNOWN',
  verifiedBeachStoneOutcome:false
 };
 return {schemaVersion:'rockhounding-no-photo-poststorm-conditions-v1',
  evaluatedAtUTC:nowISO,site:'grand-marais-agate',
  state,activityNotRockProbability:true,
  originalOffshoreWaveEvidence:wave,
  regionalLakeLevelContext:regionalWaterLevels,
  nwsHazardStatus:alert,
  nwsAlertEvents:Array.isArray(nwsHazards.alerts)?nwsHazards.alerts.map(e=>e.event).slice(0,12):[],
  sourceAvailability:available,
  regionalSeicheCouldPersistAfterWavesEase:true,
  siteBreakingWavesAndExposedStoneCountsUnavailable:true,
  whyNotPhotoDependent:'Original buoy waves, NOAA regional water levels and NWS active alerts require no beach photograph.',
  visitorUse:'Describe observed Lake Superior activity and source gaps; do not advise beach access or certify fresh stones.',
  ...DENIAL};
}
module.exports={waveEvolution,pictureFreeReport};
