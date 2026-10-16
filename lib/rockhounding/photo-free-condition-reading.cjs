'use strict';
// Single photo-free interpretation of preexisting GLOS, NWS, and NOAA feeds.
// This is a wave-disturbance CONTEXT reading, never a calibrated
// beach-exposure/agate/safe-to-visit forecast.
const DENIAL=Object.freeze({
  photosRequired:false,
  observedBreakingWavesAtAgate:false,
  localShoreSedimentMeasured:false,
  canClaimNewRocksExposed:false,
  canPredictNewAgates:false,
  canPublishVisitWindow:false,
  canClaimBeachSafe:false,
  canInferBayshoreSurf:false,
  newAgateProbability:null,
  modeledBeachWaveHeightM:null
});
const LIVE_STATES=new Set([
  'OFFSHORE_WAVES_REBUILDING','OFFSHORE_WAVES_ELEVATED',
  'OFFSHORE_WAVES_EASING','RECENT_OFFSHORE_WAVE_ACTIVITY',
  'LOWER_OFFSHORE_WAVE_ACTIVITY'
]);
const TRENDS=new Set([
 'OBSERVED_WAVE_ACTIVITY_LOWER_VS_PRIOR_24H',
 'OBSERVED_WAVE_ACTIVITY_HIGHER_VS_PRIOR_24H',
 'OBSERVED_WAVE_ACTIVITY_SIMILAR_VS_PRIOR_24H'
]);
const rounded=n=>Math.round(n*10)/10;
function conditionReading(pulse,{nowISO}={}){
  const now=Date.parse(nowISO);
  if(typeof nowISO!=='string'||!Number.isFinite(now)||!pulse||
    pulse.schemaVersion!=='rockhounding-photo-free-live-offshore-pulse-v1'||
    pulse.stationId!=='SPOT-1361'||
    pulse.photosRequired!==false||pulse.rockExposureScore!==null||
    pulse.canPredictNewAgates!==false||pulse.canClaimBeachSafety!==false||
    pulse.canPublishSafeVisitWindow!==false||
    !['ACTIVE','CLEAR','UNKNOWN'].includes(pulse.hazardStatus))
    throw Error('No verified original offshore/NWS sensor context');
  const latestMs=Date.parse(pulse.latestMeasuredAtUTC||'');
  const sourceAgeHours=Number.isFinite(latestMs)?rounded((now-latestMs)/3600000):null;
  const fresh=Number.isFinite(sourceAgeHours)&&sourceAgeHours>=-.1&&sourceAgeHours<=3&&
    pulse.sourceFresh===true&&pulse.recentMeasurementCoverageSufficient===true&&
    LIVE_STATES.has(pulse.status);
  const trend=pulse.waveTendency48h;
  const trendValid=fresh&&trend?.schemaVersion==='rockhounding-photo-free-48h-wave-tendency-v1'&&
    trend.source==='ORIGINAL_GLOS_SPOT1361_OFFSHORE_OBSERVATIONS'&&
    trend.latestObservedUTC===pulse.latestMeasuredAtUTC&&
    trend.photosRequired===false&&trend.canForecastNewStones===false&&
    trend.canClaimBeachSafe===false&&trend.canPublishVisitWindow===false&&
    TRENDS.has(trend.status)&&Number.isFinite(trend.changePercentVsPrior24h)&&
    Array.isArray(trend.comparedWindowCoveragePct)&&
    trend.comparedWindowCoveragePct.length===2&&
    trend.comparedWindowCoveragePct.every(p=>Number.isFinite(p)&&p>=90);
  const level=pulse.lakeSuperiorLevelContext;
  const remoteLevelValid=level?.schemaVersion==='rockhounding-remote-lake-level-context-v1'&&
    level.stationId==='9099018'&&level.levelDatum==='IGLD 1985'&&
    level.measuredAtAgateBeach===false&&level.canPredictNewAgates===false&&
    level.canClaimBeachSafety===false&&
    level.canPublishVisitWindow===false&&
    level.status==='REMOTE_LAKE_LEVEL_OBSERVED_24H_CHANGE'&&
    Number.isFinite(level.delta24hCm)&&Number.isFinite(level.gaugeWaterLevelM);
  const context={
    schemaVersion:'rockhounding-photo-free-condition-reading-v1',
    stationId:'SPOT-1361',source:'GLOS_MEASURED_OFFSHORE_PLUS_NWS_ALERTS',
    siteId:'grand-marais-agate',
    calculatedAtUTC:nowISO,
    sourceObservedAtUTC:Number.isFinite(latestMs)?pulse.latestMeasuredAtUTC:null,
    sourceAgeHours,
    waveStatus:fresh?pulse.status:'SOURCE_STALE_GAPPY_OR_UNAVAILABLE',
    offshoreWaveHeightM:fresh&&Number.isFinite(pulse.latestOffshoreSignificantWaveHeightM)?
      pulse.latestOffshoreSignificantWaveHeightM:null,
    last48hOffshorePeakM:fresh&&Number.isFinite(pulse.peakLast48hM)?
      pulse.peakLast48hM:null,
    comparedTwoComplete24hWindows:!!trendValid,
    comparedObservedOffshoreWaveActivityPct:trendValid?
      rounded(trend.changePercentVsPrior24h):null,
    remoteLakeLevelStatus:remoteLevelValid?'REMOTE_MARQUETTE_CONTEXT_ONLY':
      'REMOTE_MARQUETTE_CONTEXT_UNAVAILABLE_OR_GAPPY',
    remoteLevel24hChangeCm:remoteLevelValid?level.delta24hCm:null,
    remoteGaugeCannotEstablishLocalExposure:true,
    alertStatus:pulse.hazardStatus,
    alertNotEquivalentToBeachSafetyClearance:true,
    sourceDataMeaning:'Measured open-lake disturbance only, not measured Agate Beach sediments.',
    bayshorePark:'PROTECTED_HARBOR_WAVE_RESPONSE_NOT_MODELED',
    thresholdMeaning:'1.0 m is a descriptive observed offshore episode grouping threshold, not a beach danger or agate-exposure threshold.',
    ...DENIAL
  };
  // Preserve the status of independent advisories and sensor quality.
  if(!fresh){
    return {...context,state:pulse.hazardStatus==='ACTIVE'?
      'MARINE_ALERT_ACTIVE_WAVE_DATA_UNAVAILABLE':'SOURCE_UNAVAILABLE',
      headline:pulse.hazardStatus==='ACTIVE'?'Marine warning or advisory active':'Live wave evidence unavailable',
      waveHeadline:'No reliable current offshore phase',
      explanation:'Buoy readings are missing, delayed or incomplete; do not assume low waves, exposed stones or safe conditions.',
      evidenceGrade:'NO_CURRENT_OFFSHORE_READING',
      furtherInterpretationBlocked:true};
  }
  let phase='OPEN_LAKE_WAVE_ACTIVITY_OBSERVED';
  let waveHeadline='Offshore wave observations available';
  let explanation='Measured wave conditions are available, but no field-verified change in beach material is known.';
  if(pulse.status==='OFFSHORE_WAVES_REBUILDING'){
    phase='OFFSHORE_WAVES_REBUILDING';
    waveHeadline='Offshore waves building again';
    explanation='Buoy observations show waves increasing again after an earlier decline; a settled period is not established.';
  }else if(pulse.status==='OFFSHORE_WAVES_ELEVATED'){
    phase='ELEVATED_OFFSHORE_WAVES';
    waveHeadline='Offshore waves remain elevated';
    explanation='The buoy has elevated open-lake waves; this is not a shoreline exposure or safe-access signal.';
  }else if(pulse.status==='OFFSHORE_WAVES_EASING'&&trendValid&&
    trend.status==='OBSERVED_WAVE_ACTIVITY_LOWER_VS_PRIOR_24H'&&
    Number.isFinite(pulse.peakLast48hM)&&pulse.peakLast48hM>=1){
    phase='OBSERVED_OFFSHORE_POST_PEAK_EASING';
    waveHeadline='Offshore waves easing after a measured peak';
    explanation='Wave height and 24-hour observed activity declined after an elevated open-lake peak. Actual gravel exposure and breaking surf remain unknown.';
  }else if(pulse.status==='OFFSHORE_WAVES_EASING'){
    phase='OFFSHORE_DECLINE_WITHOUT_VALIDATED_24H_COMPARISON';
    waveHeadline='Some offshore wave heights have eased';
    explanation='Recent wave heights are lower, but two complete observed 24-hour activity windows do not independently confirm a longer decline.';
  }else if(trendValid&&trend.status==='OBSERVED_WAVE_ACTIVITY_HIGHER_VS_PRIOR_24H'){
    phase='OFFSHORE_ACTIVITY_INCREASING';
    waveHeadline='Offshore wave activity higher than yesterday';
    explanation='Measured wave-height and period activity has risen; no beach stone-exposure or access inference is possible.';
  }else if(pulse.status==='LOWER_OFFSHORE_WAVE_ACTIVITY'){
    phase='LOWER_OFFSHORE_WAVE_ACTIVITY';
    waveHeadline='Lower offshore wave activity observed';
    explanation='The buoy is below a research wave-height threshold. This is not a calm-beach finding or evidence that a storm uncovered new stones.';
  }else if(pulse.status==='RECENT_OFFSHORE_WAVE_ACTIVITY'){
    phase='RECENT_OFFSHORE_WAVES_UNSETTLED';
    waveHeadline='Recent offshore disturbance recorded';
    explanation='An elevated offshore wave was observed recently, but a sustained lower-wave phase is not established.';
  }
  const alert= pulse.hazardStatus==='ACTIVE';
  return {...context,
    state:alert?'MARINE_ALERT_ACTIVE':phase,
    waveStatus:phase,
    headline:alert?'Marine warning or advisory active':pulse.hazardStatus==='UNKNOWN'?
      'Wave context available; marine alerts unverified':waveHeadline,
    waveHeadline,explanation:alert?
      'Relevant NWS marine or shoreline alerts are active. Offshore trend observations cannot override these warnings.':explanation,
    evidenceGrade:trendValid?'FRESH_OFFSHORE_WAVES_AND_COMPLETE_48H_TREND':
      'FRESH_OFFSHORE_WAVES_TREND_NOT_VERIFIED',
    furtherInterpretationBlocked:alert||pulse.hazardStatus==='UNKNOWN',
    remoteLevelNotUsedToCallStoneExposure:true
  };
}
module.exports={conditionReading,DENIAL};
