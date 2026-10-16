'use strict';
// Photo-free offshore activity comparator: Hs^2 * T_mean integrated across
// independently measured GLOS waves. NOT wave power (Te unavailable), NOT
// a wave-transmission model, beach rock exposure, probability, or safe-visit
// recommendation. Count no more than 90 minutes between observed samples.
const {checkRow}=require('./glos-spotter-event-ledger.cjs');
const {researchWaveDirectionOnly}=require('./noaa-enc-geometry.cjs');
const season=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const HOUR=3600000,MAX_GAP_H=1.5;
const NO_CLAIMS=Object.freeze({
 photoEvidenceRequired:false,siteSurfObserved:false,
 agateExposureCalibrated:false,canPredictNewStones:false,
 canPublishVisitWindow:false,canClaimSafeAccess:false,
 harborWaveTransferValidated:false
});
const round=(x,n=2)=>Number(x.toFixed(n));
const epoch=x=>Date.parse(x);
function sample(s){
 checkRow(s);
 return {at:epoch(s.time),h:s.waveHeightM,period:s.meanPeriodS,from:s.waveFromDeg};
}
function facing(s){
 // Chart-derived ~336.74° normal is historical and *not* current wetline.
 const r=researchWaveDirectionOnly(s.from,{siteId:'grand-marais-agate'});
 if(r?.canPublishSiteWaves!==false||r.historicChartNotReviewedShoreline!==true||
    !Number.isFinite(r.directionalIncidenceResearchOnly)||
    r.directionalIncidenceResearchOnly<0||r.directionalIncidenceResearchOnly>1)
  throw Error('Historical Agate orientation cannot be used as measured surf');
 return r.directionalIncidenceResearchOnly;
}
function integrateEvent(observations,{fromUTC,toUTC,peakAtUTC}={}){
 const start=epoch(fromUTC),end=epoch(toUTC),peak=epoch(peakAtUTC);
 if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(peak)||
    start>end||peak<start||peak>end)
  throw Error('Invalid source-stamped storm event bounds');
 if(!Array.isArray(observations)||observations.length>30000)
  throw Error('Missing or oversized original buoy observations');
 const series=observations.map(sample).filter(x=>x.at>=start&&x.at<=end)
  .sort((a,b)=>a.at-b.at);
 let total=0,aligned=0,coverage=0,gapCount=0,validPairs=0,largestGap=0;
 const maxH=series.length?Math.max(...series.map(s=>s.h)):null;
 for(let i=1;i<series.length;i++){
  const a=series[i-1],b=series[i],dt=(b.at-a.at)/HOUR;
  if(dt<=0)throw Error('Duplicate or reversed source observation time');
  largestGap=Math.max(largestGap,dt);
  if(dt>MAX_GAP_H){gapCount++;continue;}
  const pa=a.h*a.h*a.period,pb=b.h*b.h*b.period;
  total+=(pa+pb)/2*dt; // proxy m^2*s*h, not kW/m or joules
  aligned+=(pa*facing(a)+pb*facing(b))/2*dt;
  coverage+=dt;validPairs++;
 }
 const span=(end-start)/HOUR;
 const complete=span>0&&series.length>=6&&
   coverage/span>=.85&&largestGap<=3;
 return {
  observedSampleCount:series.length,
  firstRetainedReading:series[0]?new Date(series[0].at).toISOString():null,
  lastRetainedReading:series.at(-1)?new Date(series.at(-1).at).toISOString():null,
  highestObservedWaveM:maxH,
  spanHours:round(span),integratedObservedHours:round(coverage),
  observedTimeCoveragePct:span>0?round(Math.min(100,100*coverage/span),1):null,
  longSourceGaps:gapCount,largestSourceGapHours:round(largestGap),
  validTrapezoidSegments:validPairs,
  observedWaveActivityProxy:validPairs?round(total,3):null,
  historicFacingActivityProxy:validPairs?round(aligned,3):null,
  historicFacingSharePct:total>0?round(100*aligned/total,1):null,
  enoughCoverageForRelativeComparison:complete,
  meanPeriodNotWaveEnergyPeriod:true,
  physicalPowerKWPerMeter:null,
  calibratedBeachWaveHeightM:null,
  newRockExposureProbability:null,
  siteId:'grand-marais-agate',
  ...NO_CLAIMS
 };
}
function buildPhotoFreeActivity({ledger,seasonSource=season}={}){
 if(ledger?.schemaVersion!=='rockhounding-glos-spotter-observed-ledger-v1'||
  ledger.stationId!=='SPOT-1361'||ledger.source!=='GLOS_SEAGULL_OBS_140'||
  ledger.originalObservationsOnly!==true||ledger.sourceObservationNotBeachSurf!==true||
  ledger.canPredictFreshStones!==false||ledger.canPublishVisitWindow!==false||
  !Array.isArray(ledger.records)||ledger.records.length<1000||ledger.records.length>20000||
  seasonSource?.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
  seasonSource.actualObservedWaveRecords!==ledger.records.length||
  seasonSource.qualifyingMeasuredOffshoreEpisodes!==8||
  seasonSource.rows?.length!==11||
  seasonSource.canPublishRockhoundingWindow!==false)
  throw Error('No independently source-matched complete 2026 GLOS archive');
 const qualified=seasonSource.rows.filter(x=>x.qualifyingOffshoreEpisode);
 const episodes=qualified.map(evt=>{
  const raw=integrateEvent(ledger.records,{
   fromUTC:evt.firstElevatedAt,toUTC:evt.lastElevatedAt,peakAtUTC:evt.peakObservedAt});
  if(!Number.isFinite(raw.highestObservedWaveM)||
     Math.abs(raw.highestObservedWaveM-evt.peakWaveHeightM)>.011)
   throw Error('Frozen original 2026 source peak differs from wave archive');
  return {peakAtUTC:evt.peakObservedAt,peakSignificantHeightM:evt.peakWaveHeightM,
   fromUTC:evt.firstElevatedAt,toUTC:evt.lastElevatedAt,
   alreadyKnownLifecycle:evt.lifecycle,recordedWaveRebuild:evt.renewedAfterDrop,
   recordedOffshoreDecline:evt.observedOffshoreDecline,...raw};
 });
 const eligible=episodes.filter(x=>x.enoughCoverageForRelativeComparison);
 const top=Math.max(0,...eligible.map(x=>x.observedWaveActivityProxy));
 const compared=episodes.map(e=>({
  ...e,
  relativeToLargestMeasured2026EpisodePct:
   e.enoughCoverageForRelativeComparison&&top>0?
    round(100*e.observedWaveActivityProxy/top,1):null,
  researchComparisonStatus:e.enoughCoverageForRelativeComparison?
   'OBSERVED_OPEN_LAKE_RELATIVE_ACTIVITY_ONLY':
   'SOURCE_COVERAGE_INSUFFICIENT_FOR_ACTIVITY_RANKING'
 })).sort((a,b)=>b.peakAtUTC.localeCompare(a.peakAtUTC));
 return {
  schemaVersion:'rockhounding-photo-free-measured-activity-v1',
  source:'GLOS_SEAGULL_OBS_140_SPOT_1361',
  studySite:'grand-marais-agate',
  buoyLatitude:46.695671,
  baseSourceOriginalRows:ledger.records.length,
  sourceObservationStartUTC:ledger.records[0].time,
  sourceObservationEndUTC:ledger.records.at(-1).time,
  snapshotIsDatedArchiveNotLive:true,
  episodeTotal:compared.length,
  episodesWithSufficientCoverage:eligible.length,
  measuredActivityFormula:'trapezoid integral of Hs^2 * T_mean over only observed <=90-minute gaps',
  activityUnit:'relative m^2 * seconds * hours proxy; NOT wave-power kW/m',
  gapHoursNotInterpolated:MAX_GAP_H,
  historicAgateLakewardNormalDeg:336.74,
  lakewardNormalFromOldNoaaChartNotCurrentBeachSurvey:true,
  meanPeriodIsNotEnergyPeriod:true,
  cannotInferBayshoreHarborFromAgate:true,
  newestNwsWarningsNotHistoricallyBackfilled:true,
  normalizedComparisonMeans:'100% = largest fully sampled 2026 offshore episode within this archive; not chance of stones',
  entries:compared,
  ...NO_CLAIMS
 };
}
module.exports={MAX_GAP_H,integrateEvent,buildPhotoFreeActivity};
