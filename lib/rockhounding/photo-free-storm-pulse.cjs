'use strict';
// Photo-free visitor presentation of independently observed Lake Superior
// waves. Describes wave timing / trends only; no uncalibrated site surf,
// safety clearance, collecting permission, or newly exposed agates.
const season=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const spotter=require('../../public/rockhounding-lab/glos-spotter-oct2026.json');
const {compareSpotterToHistoricShore}=require('./glos-spotter-facing.cjs');
const safety=Object.freeze({
 canForecastAgateDiscoveries:false,
 canApproveCollecting:false,
 canLabelShoreSafe:false,
 canForecastBreakingSurf:false,
 isLiveNow:false
});
function assertSources(a=season,b=spotter){
 if(a?.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
  a?.source!=='GLOS_SEAGULL_OBS_140_SPOT_1361'||
  a?.actualObservedWaveRecords!==5243||
  a?.sourceDays!==111||a?.qualifyingMeasuredOffshoreEpisodes!==8||
  !Array.isArray(a?.rows)||a.rows.length!==11||
  a?.currentAlertRecordNotRetrospectivelyApplied!==true||
  a?.canPublishRockhoundingWindow!==false||
  b?.schemaVersion!=='grand-marais-glos-historical-visual-v1'||
  b?.station!=='SPOT-1361'||b?.samples?.length!==142||
  b?.fromUTC!=='2026-10-12T01:16:01Z'||
  b?.toUTC!=='2026-10-14T23:46:01Z'||
  b?.completeness!=='SOURCE_WAS_STALE_STORM_END_NOT_VERIFIED')
  throw Error('Photo-free rockhounding wave story requires original measured GLOS provenance');
 return true;
}
function episodePhase(row){
 if(!row?.qualifyingOffshoreEpisode)throw Error('Only sample-qualified measured offshore episodes supported');
 if(row.renewedAfterDrop===true)
  return {key:'WAVES_RETURNED',label:'Waves built again',
   explanation:'After an observed decline, elevated offshore waves returned. This episode had more than one wave pulse.',
   sequence:['Storm activity','Temporary decline','Renewed waves']};
 if(row.completed==='OBSERVED_THROUGH_48H_POST_EVENT'&&row.observedOffshoreDecline===true)
  return {key:'OBSERVED_EASING',label:'Waves eased afterward',
   explanation:'The buoy measured a drop after the peak, with additional observation coverage after elevated waves subsided.',
   sequence:['Storm peak','Wave heights declined','Post-event readings']};
 if(row.observedOffshoreDecline===true)
  return {key:'DECLINE_RECORDED',label:'Decline recorded',
   explanation:'The buoy observed lower waves after the peak. Additional readings help describe what happened next.',
   sequence:['Storm peak','Wave heights declined','Later readings limited']};
 return {key:'ELEVATED_EPISODE',label:'Elevated-wave episode',
  explanation:'An extended run of measured offshore waves was recorded.',
  sequence:['Elevated waves','Highest measured wave','History recorded']};
}
function buildStormPulse({a=season,b=spotter}={}){
 assertSources(a,b);
 const episodes=a.rows.filter(r=>r.qualifyingOffshoreEpisode).map(r=>{
  if(!/^2026-\d{2}-\d{2}T/.test(r.peakObservedAt)||
    !Number.isFinite(Date.parse(r.peakObservedAt))||
    !Number.isFinite(r.peakWaveHeightM)||r.peakWaveHeightM<0||r.peakWaveHeightM>18||
    Date.parse(r.firstElevatedAt)>Date.parse(r.peakObservedAt)||
    Date.parse(r.peakObservedAt)>Date.parse(r.lastElevatedAt))
   throw Error('Original event timestamp or wave height changed');
  const phase=episodePhase(r);
  return {
   id:r.peakObservedAt,
   peakAtUTC:r.peakObservedAt,
   firstElevatedUTC:r.firstElevatedAt,
   lastElevatedUTC:r.lastElevatedAt,
   observedPeakHeightM:r.peakWaveHeightM,
   phaseKey:phase.key,phaseLabel:phase.label,
   explanation:phase.explanation,sequence:phase.sequence,
   hasObservedPostEventCoverage:r.completed==='OBSERVED_THROUGH_48H_POST_EVENT',
   hasWaveRebuild:r.renewedAfterDrop===true,
   observedDecline:r.observedOffshoreDecline===true,
   sampleQualified:true,
   measuredAt:'GLOS Grand Marais Spotter / Lake Superior offshore'
  };
 }).sort((x,y)=>y.peakAtUTC.localeCompare(x.peakAtUTC));
 if(episodes.length!==8||episodes.filter(x=>x.hasWaveRebuild).length!==2)
  throw Error('Original 2026 measured-wave episode evidence changed');
 const samples=b.samples;
 const last=samples.at(-1),peak=samples.reduce((m,s)=>s.hM>m.hM?s:m,samples[0]);
 if(last?.t!==b.toUTC||peak?.hM!==2.57||!Number.isFinite(last.waveFromDeg)||
   !Number.isFinite(last.periodS))
  throw Error('Original GLOS observed sample and wave direction changed');
 const dir=compareSpotterToHistoricShore({observation:{
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',
  phase:'OBSERVATION',time:last.t,
  waveHeightM:last.hM,waveFromDeg:last.waveFromDeg,
  meanPeriodS:last.periodS
 },sourceFreshness:'HISTORICAL'});
 if(dir.status!=='GLOS_OBSERVED_WAVE_DIRECTION_VS_HISTORIC_COASTLINE_ONLY'||
   dir.relativeWaveFromAngleDeg===null||
   dir.canPublishSiteSurf!==false)
  throw Error('Open-lake direction not confirmed as research-only comparator');
 return {
  schemaVersion:'rockhounding-photo-free-storm-pulse-v1',
  asOfOriginalArchiveUTC:a.archiveReadAtUTC,
  dataPeriod:{firstUTC:a.sourceObservationRangeUTC.from,lastUTC:a.sourceObservationRangeUTC.to},
  stationName:'Grand Marais Spotter',
  stationId:'SPOT-1361',
  stationContext:'Open Lake Superior north of Grand Marais',
  sourceUrl:'https://seagull-erddap.glos.org/erddap/info/obs_140/index.html',
  historicObservationCount:a.actualObservedWaveRecords,
  observedDays:a.sourceDays,
  allElevatedGroups:a.measuredElevatedEpisodeGroups,
  wellSampledEpisodes:episodes.length,
  historyLabel:'Summer–fall 2026 wave history',
  visitorLead:'See when Lake Superior waves built, peaked, eased, and returned.',
  episodes,
  latestArchivedSample:{
   atUTC:last.t,
   significantWaveHeightM:last.hM,
   waveFromDeg:last.waveFromDeg,
   wavePeriodS:last.periodS,
   peakInOct12to14M:peak.hM,
   sourceWindow:'2026-10-12 to 2026-10-14 UTC'
  },
  historicDirectionComparison:{
   measuredWaveFromDeg:dir.observedWaveFromDeg,
   chartedAgateFacingDeg:dir.historicalNoaaChartLakewardBearingDeg,
   separationDeg:dir.relativeWaveFromAngleDeg,
   observedAtUTC:dir.originalObservationUTC,
   role:'Orientation illustration based on original buoy waves and a historical NOAA chart',
   physicallyModeledWaveHeightAtBeachM:null
  },
  siteContext:[
   {id:'grand-marais-agate',label:'Agate Beach',
    setting:'Open Lake Superior shoreline',
    description:'Faces the open lake. Use the measured offshore storm history to understand periods of stronger lake activity.',
    officialSource:'https://burttownshipacmi.gov/recreation/agate-beach-lake-superior/',
    settingLabel:'Open coast'},
   {id:'grand-marais-harbor',label:'Bayshore Park',
    setting:'Downtown harbor beach',
    description:'Sits in the sheltered harbor. Look at local forecasts and marine alerts separately from open-lake observations.',
    officialSource:'https://burttownshipacmi.gov/recreation/bayshore-park-public-swimming-areas/',
    settingLabel:'Harbor'}
  ],
  currentConditionsLink:'https://www.weather.gov/mqt/',
  currentMarineAlertsLink:'https://api.weather.gov/alerts/active?zone=LSZ250',
  originalPhotosUsed:false,photoVerificationRequiredForWaveHistory:false,
  visitorGuidance:'Explore measured wave history, compare shoreline settings, and check current NWS marine advisories and local rules before a visit.',
  ...safety
 };
}
module.exports={assertSources,episodePhase,buildStormPulse};
