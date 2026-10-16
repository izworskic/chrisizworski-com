#!/usr/bin/env node
'use strict';
// Research-only single live source smoke test. Source outages are reported as
// outages; neither silence nor NWS "CLEAR" can certify safe shoreline.
const {currentPulse}=require('../../api/rockhounding-wave-pulse.js')._test;
(async()=>{
 const report=await currentPulse();
 if(report.schemaVersion!=='rockhounding-photo-free-live-offshore-pulse-v1'||
  report.stationId!=='SPOT-1361'||report.photosRequired!==false||
  report.canPredictNewAgates!==false||report.canClaimBeachSafety!==false||
  report.canPublishSafeVisitWindow!==false||report.rockExposureScore!==null||
  !['ACTIVE','CLEAR','UNKNOWN'].includes(report.hazardStatus))
  throw Error('Provider-origin proof or permanent public safety guard changed');
 process.stdout.write('PHOTO_FREE_ORIGINAL_SOURCE_LIVE_CHECK '+JSON.stringify({
  waveSourceAvailable:report.dataSourceAvailable,
  waveStatus:report.status,
  latestObservedAtUTC:report.latestMeasuredAtUTC,
  ageHours:report.latestObservationAgeHours,
  observedHeightM:report.latestOffshoreSignificantWaveHeightM,
  sampleCount:report.observedSampleCount,
  nwsAlertStatus:report.hazardStatus,
  beachBreakingSurfKnown:false,newAgatesVerified:false,safeWindow:false,
  photosRequired:false
 })+'\n');
})().catch(e=>{process.stderr.write('PHOTO_FREE_ORIGINAL_SOURCE_PROBE_FAILED '+e.message+'\n');process.exitCode=1});
