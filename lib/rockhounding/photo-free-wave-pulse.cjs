'use strict';
// Photo-free, observed OFFSHORE wave activity. This is deliberately NOT
// observed Lake Superior shoreline sediment transport, beach surf, exposed
// agate probability, visitor safety or a recommended collecting window.
// Hs^2 * Tmean integrated over *sampled* hours is a comparative proxy, NOT
// a deep-water energy-flux estimate. Mean period != energy period.
const {checkRow,offshoreEvents}=require('./glos-spotter-event-ledger.cjs');
const {researchWaveDirectionOnly}=require('./noaa-enc-geometry.cjs');
const H=3600000;
const NO_CLAIM=Object.freeze({
 measuredBeachWaveHeightM:null,observedPebblesNewlyExposed:null,
 actualSedimentMovementMeasured:false,canPredictFreshAgates:false,
 canClaimSafeCollecting:false,canPublishCollectingWindow:false,
 canTransferIntoBayshoreHarbor:false
});
function round(v,n=2){return Number(v.toFixed(n))}
function circularResult(segments){
 let cx=0,cy=0,weights=0;
 for(const r of segments){
  const rad=r.directionDeg*Math.PI/180;
  cx+=Math.cos(rad)*r.weight;cy+=Math.sin(rad)*r.weight;weights+=r.weight;
 }
 if(!weights)return {directionDeg:null,concentration:null};
 const strength=Math.hypot(cx,cy)/weights;
 return {directionDeg:strength<.2?null:round((Math.atan2(cy,cx)*180/Math.PI+360)%360,2),
  concentration:round(strength,3)};
}
function waveActivityEpisode(rows,event){
 if(!event||event.source!=='GLOS_SPOT_1361_OBSERVED_OPEN_LAKE'||
    event.actualBeachRockOutcomeObserved!==false||
    !Number.isFinite(event.peakSignificantWaveHeightM)||
    !Number.isFinite(Date.parse(event.firstElevatedAt))||
    !Number.isFinite(Date.parse(event.lastElevatedAt)))
  throw Error('Original measured offshore event identity required');
 const start=Date.parse(event.firstElevatedAt),end=Date.parse(event.lastElevatedAt);
 if(start>=end)return {eventId:event.id,status:'INSUFFICIENT_OBSERVED_SPAN',
  sampledHours:0,relativeWaveActivity: null, ...NO_CLAIM};
 const within=rows.filter(r=>{
  checkRow(r);
  const t=Date.parse(r.time);return t>=start&&t<=end;
 }).sort((a,b)=>a.time.localeCompare(b.time));
 const duration=(end-start)/H;
 let sample=0,total=0,gaps=0,maxGap=0,segments=[],maxH=0;
 for(const r of within){if(r.waveHeightM>maxH)maxH=r.waveHeightM}
 for(let i=1;i<within.length;i++){
  const older=within[i-1],newer=within[i],dt=(Date.parse(newer.time)-Date.parse(older.time))/H;
  if(dt<=0)throw Error('Duplicate or disorderly measured wave sample timestamp');
  maxGap=Math.max(maxGap,dt);
  if(dt>1.5){gaps++;continue;} // never fill a lost buoy record with invented waves
  const a=older.waveHeightM**2*older.meanPeriodS;
  const b=newer.waveHeightM**2*newer.meanPeriodS;
  if(!Number.isFinite(a)||!Number.isFinite(b))throw Error('Unusable observed significant wave or period');
  const weighted=((a+b)/2)*dt;
  total+=weighted;sample+=dt;
  // "wave from" is true original provider direction, NOT Spotter-derived wind
  segments.push({directionDeg:older.waveFromDeg,weight:weighted/2},
                {directionDeg:newer.waveFromDeg,weight:weighted/2});
 }
 const coverage=sample/duration;
 const meets=event.qualifiesAsDistinctMeasuredOffshoreEpisode===true&&
   within.length>=6&&coverage>=.8&&gaps<=2;
 const facing=circularResult(segments);
 const historic=(meets&&facing.directionDeg!==null)
   ?researchWaveDirectionOnly(facing.directionDeg):null;
 const relation=historic?.directionOnly?
   {historicChartResearchBearingDeg:historic.historicNoaaChartFacingDeg,
    observedOffshoreWaveVsHistoricChartDeg:historic.relativeAngleDeg,
    historicalShoreNormalNotSurveyed:true,
    actualNearshoreWaveTransformationUnknown:true}
   :{historicChartResearchBearingDeg:null,
     observedOffshoreWaveVsHistoricChartDeg:null,
     historicalShoreNormalNotSurveyed:true,
     actualNearshoreWaveTransformationUnknown:true};
 return {
  eventId:event.id,startUTC:event.firstElevatedAt,endUTC:event.lastElevatedAt,
  sampledObservationCount:within.length,
  sampleCoverageFraction:round(coverage,3),sampledHours:round(sample,2),
  fullEventSpanHours:round(duration,2),unobservedGapCount:gaps,
  largestSamplingGapHours:round(maxGap,2),
  observedPeakWaveHeightM:event.peakSignificantWaveHeightM,
  measuredPeakMatchesEvent:Math.abs(maxH-event.peakSignificantWaveHeightM)<.0001,
  relativeWaveActivity:meets?round(total,3):null,
  proxyUnits:'Hs_m_squared_times_reported_mean_period_seconds_times_observed_hours',
  isTruePhysicalWavePower:false,isSedimentTransportEstimate:false,
  dominantWeightedObservedWaveFromDeg:meets?facing.directionDeg:null,
  directionalConcentration:meets?facing.concentration:null,
  status:meets?'RESEARCH_COMPARABLE_OBSERVED_OFFSHORE_ACTIVITY':
    'INSUFFICIENT_OR_GAPPY_OFFSHORE_MEASUREMENTS',
  originalProvider:'GLOS_SEAGULL_OBS_140_SPOT_1361',
  photoEvidenceRequiredForThisProxy:false,
  sourceIsNotBeachBreakingSurf:true,
  ...relation,...NO_CLAIM
 };
}
function photoFreeWaveHistory(ledger,{nowISO,hazardSnapshot=null}={}){
 const events=offshoreEvents(ledger,{nowISO});
 if(events.source!=='GLOS_SEAGULL_OBS_140_SPOT_1361'||events.sourceOnlyNoBeachOutcome!==true||
    events.calibratedToActualRockExposure!==false)
  throw Error('Offshore research source promotion attempted');
 const rows=ledger.records.map(checkRow);
 const compared=events.eventHistory.map(e=>waveActivityEpisode(rows,e));
 const sorted=compared.filter(x=>x.relativeWaveActivity!==null)
    .sort((a,b)=>a.relativeWaveActivity-b.relativeWaveActivity);
 for(const e of compared){
  const pos=e.relativeWaveActivity===null?-1:sorted.findIndex(x=>x.eventId===e.eventId);
  e.archiveComparisonPercentile=pos<0?null:Math.round(100*(pos+.5)/sorted.length);
  e.comparisonLabel=pos<0?'NOT_RANKED_INSUFFICIENT_MEASUREMENTS':
   'OFFSHORE_WAVE_ACTIVITY_RELATIVE_TO_THIS_SAMPLE_ONLY';
  e.isBeachReworkingObserved=false;
 }
 const sourceAge=events.latestAgeHours;
 let marineAlertStatus='UNKNOWN';
 if(hazardSnapshot){
  if(hazardSnapshot.status==='ACTIVE'||hazardSnapshot.status==='UNKNOWN'||
    hazardSnapshot.status==='CLEAR')
   marineAlertStatus=hazardSnapshot.status;
 }
 const cannotEstablishSafety=marineAlertStatus==='ACTIVE'?
   'ACTIVE_RELEVANT_NWS_ALERTS_CHECK_OFFICIAL_WARNINGS':
   marineAlertStatus==='UNKNOWN'?
   'NWS_ALERT_STATE_UNKNOWN_DO_NOT_INFER_SAFE':
   'NO_SELECTED_NWS_ALERTS_NOT_A_SHORE_SAFETY_CLEARANCE';
 return {
  schemaVersion:'rockhounding-photo-free-offshore-pulse-v1',
  computedAtUTC:nowISO,station:'SPOT-1361',
  sourceRows:rows.length,originalWaveSampleFromUTC:rows[0]?.time??null,
  originalWaveSampleThroughUTC:events.latestObservedAt,
  observationFreshness:events.sourceStatus,
  currentOffshoreObservedStatus:sourceAge===null?'NO_OBSERVATIONS':
    sourceAge>3?'STALE_OFFSHORE_DATA':'RECENT_OFFSHORE_OBSERVATIONS_NOT_BEACH_SURF',
  archivedEventGroups:compared.length,
  researchComparableEvents:sorted.length,
  hazardSnapshotStatus:marineAlertStatus,hazardEvidence:cannotEstablishSafety,
  physicsExplanation:'Integral of observed significant-wave-height squared multiplied by observed mean-wave period over sampled hours; a relative measured offshore indicator, not energy flux or wave power.',
  comparisonBaseline:'ONLY_STORMS_WITH_ACCEPTABLE_SENSOR_COVERAGE_IN_RETAINED_GLOS_ARCHIVE',
  noPhysicalShorelineOutcomeCalibration:true,
  moreWindOrOffshoreWavesDoNotProveNewPebbles:true,
  neverImputeMissingWaveSamples:true,
  events:compared,
  ...NO_CLAIM
 };
}
module.exports={waveActivityEpisode,photoFreeWaveHistory,circularResult};
