'use strict';
// Historical walk-forward audit of the LIVE no-photo offshore wave signals.
// Every checkpoint has access ONLY to original readings at or before its UTC
// evaluation time. Not an agate-finding backtest: there is no stone outcome
// ground truth, no reconstructed historical NWS alerts, no local beach surf.
const {checkRow}=require('./glos-spotter-event-ledger.cjs');
const {analyzeObserved}=require('./live-photo-free-pulse.cjs');
const {rollingWaveTendency}=require('./rolling-offshore-wave-tendency.cjs');
const {memoryOfLastStorm}=require('./seven-day-offshore-storm-memory.cjs');
const {conditionReading}=require('./photo-free-condition-reading.cjs');
const originalSeason=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const HOUR=3600000,DAY=24*HOUR;
const VERSION='rockhounding-photo-free-observation-replay-2026-v1';
const UNKNOWN_NWS='UNKNOWN';
const NO_CLAIMS=Object.freeze({
 photosRequired:false,
 simulatedHistoricalAlertClearance:false,
 realHistoricalNwsAlertsUsed:false,
 independentBeachSedimentGroundTruth:false,
 canClaimSafeBeach:false,
 canPredictNewAgates:false,
 canPublishCollectingWindow:false,
 opportunityModelAccuracy:null
});
function checkSeason(s=originalSeason){
 if(s?.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
   s.source!=='GLOS_SEAGULL_OBS_140_SPOT_1361'||
   s.actualObservedWaveRecords!==5243||s.sourceDays!==111||
   s.qualifyingMeasuredOffshoreEpisodes!==8||s.rows?.length!==11||
   s.canPredictNewAgates!==false||s.canClaimSafeShore!==false||
   s.actualRockExposureFieldObservations!==0)
  throw Error('Observed 2026 offshore storm provenance changed');
 return true;
}
function replayAt(rows,nowISO){
 const t=Date.parse(nowISO);
 if(!Number.isFinite(t)||!Array.isArray(rows)||rows.length>650||
    rows.some(r=>Date.parse(r.time)>t+5*60000))
  throw Error('Replay must use at most 650 past original GLOS measurements');
 const pulse=analyzeObserved(rows,{nowISO,hazardStatus:UNKNOWN_NWS});
 const trend=rollingWaveTendency(rows,{nowISO,hazardStatus:UNKNOWN_NWS});
 const memory=memoryOfLastStorm(rows,{nowISO,hazardStatus:UNKNOWN_NWS});
 const reading=conditionReading({...pulse,waveTendency48h:trend,
   lakeSuperiorLevelContext:null},{nowISO});
 if(pulse.canPredictNewAgates!==false||
    trend.canForecastNewStones!==false||
    memory.canPredictNewAgates!==false||
    reading.canPredictNewAgates!==false||
    reading.canClaimBeachSafe!==false||
    reading.canPublishVisitWindow!==false||
    reading.alertStatus!=='UNKNOWN'||
    reading.furtherInterpretationBlocked!==true||
    pulse.latestMeasuredAtUTC&&Date.parse(pulse.latestMeasuredAtUTC)>t)
  throw Error('Replay improperly issued agate, historical NWS, or future-wave claims');
 const full48=reading.comparedTwoComplete24hWindows===true;
 return {
  atUTC:nowISO,
  newestOriginalObservedUTC:pulse.latestMeasuredAtUTC,
  ageHours:pulse.latestObservationAgeHours,
  sensorStatus:pulse.status,
  offshorePhase:reading.waveStatus,
  sourceCovered:reading.evidenceGrade!=='NO_CURRENT_OFFSHORE_READING',
  comparedTwo24hSourceWindows:full48,
  waveActivityChangePct:full48?reading.comparedObservedOffshoreWaveActivityPct:null,
  sevenDayEventStatus:memory.status,
  lastWaveHeightM:reading.offshoreWaveHeightM,
  historicalNwsStatus:'NOT_BACKFILLED',
  beachMorphologyOutcome:'NOT_MEASURED',
  canClaimSafeBeach:false,
  canPredictNewAgates:false,
  canPublishCollectingWindow:false
 };
}
function verifyOriginalLedger(ledger){
 if(ledger?.schemaVersion!=='rockhounding-glos-spotter-observed-ledger-v1'||
   ledger.stationId!=='SPOT-1361'||ledger.source!=='GLOS_SEAGULL_OBS_140'||
   ledger.originalObservationsOnly!==true||
   ledger.sourceObservationNotBeachSurf!==true||
   ledger.canPredictFreshStones!==false||ledger.canPublishVisitWindow!==false||
   !Array.isArray(ledger.records)||ledger.records.length<1000||
   ledger.records.length>18000||
   ledger.records[0]?.time<'2026-01-01T00:00:00Z'||
   ledger.records.at(-1)?.time>'2026-12-31T23:59:59Z'||
   Date.parse(ledger.records.at(-1)?.time||'')>Date.parse(ledger.generatedAtUTC||'')+5*60000)
  throw Error('Not the independently archived, original 2026 Grand Marais GLOS measurements');
 let previous=-Infinity;
 for(const row of ledger.records){
  checkRow(row);
  const at=Date.parse(row.time);
  if(!Number.isFinite(at)||at<=previous)throw Error('Original observation dates must be strictly increasing');
  previous=at;
 }
 return true;
}
function backtest(ledger,{season=originalSeason}={}){
 verifyOriginalLedger(ledger);checkSeason(season);
 const original=ledger.records;
 // Sample every 12h only after the seven-day source lookback could be
 // populated. The archived summer–fall source is not all-season climatology.
 const first=Date.parse(original[0].time)+7*DAY,last=Date.parse(original.at(-1).time);
 const firstTick=Math.ceil(first/(12*HOUR))*(12*HOUR);
 const samples=[];
 let low=0,high=0;
 for(let now=firstTick;now<=last;now+=12*HOUR){
  while(low<original.length&&Date.parse(original[low].time)<now-7*DAY-5*60000)low++;
  while(high<original.length&&Date.parse(original[high].time)<=now)high++;
  const snapshot=original.slice(low,high);
  if(snapshot.length>650)throw Error('Unexpected high-frequency source in seven-day replay');
  samples.push(replayAt(snapshot,new Date(now).toISOString()));
 }
 if(samples.length<100||samples.length>300)throw Error('Source replay checkpoint density changed');
 const counts={};
 for(const x of samples)counts[x.sensorStatus]=(counts[x.sensorStatus]||0)+1;
 const counted=Object.values(counts).reduce((a,b)=>a+b,0);
 if(counted!==samples.length)throw Error('Unaccounted original replay states');
 const covered=samples.filter(r=>r.sourceCovered);
 const compared=samples.filter(r=>r.comparedTwo24hSourceWindows);
 return {
  schemaVersion:VERSION,
  scope:'GRAND_MARAIS_SPOT1361_OFFSHORE_SENSOR_BACKTEST_NOT_BEACH_OUTCOMES',
  source:'GLOS_SEAGULL_OBS_140_SPOT_1361',
  sourceCaptureFromUTC:original[0].time,
  sourceCaptureThroughUTC:original.at(-1).time,
  sourceOriginalRows:original.length,
  frozen2026EpisodeReferenceRows:season.actualObservedWaveRecords,
  referenceSeasonLastSnapshotUTC:season.sourceObservationRangeUTC.to,
  originalOffshoreEpisodes:season.rows.length,
  originallyQualifiedOffshoreEpisodes:season.qualifyingMeasuredOffshoreEpisodes,
  replayFrequencyHours:12,
  replayClockMode:'STRICT_WALK_FORWARD_UTC_ORIGINAL_ROWS_ONLY',
  replayWindowFromUTC:samples[0].atUTC,
  replayWindowThroughUTC:samples.at(-1).atUTC,
  checkpoints:samples.length,
  sourceCoveredCheckpoints:covered.length,
  sourceCoveredPct:+(100*covered.length/samples.length).toFixed(1),
  checkpointsWithCompleteTwoDayComparison:compared.length,
  completeTwoDayCoveragePct:+(100*compared.length/samples.length).toFixed(1),
  observationStates:counts,
  historicalMarineAlertState:'NOT_RECONSTRUCTED_FOR_ANY_CHECKPOINT',
  overlappingCheckpointsNotIndependentStorms:true,
  thresholdIsNotMeasuredSedimentMobility:true,
  validationType:'DATA_AVAILABILITY_AND_SIGNAL_INTEGRITY_NOT_STONE_FIND_ACCURACY',
  trainingOrCalibratedExposureModel:false,
  observedBeachRockOutcomeCount:0,
  checkpointSeries:samples,
  ...NO_CLAIMS
 };
}
module.exports={VERSION,replayAt,backtest,checkSeason,verifyOriginalLedger};
