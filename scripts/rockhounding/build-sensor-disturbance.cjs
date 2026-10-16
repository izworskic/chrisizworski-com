#!/usr/bin/env node
'use strict';
// Produce a source-stamped historical / research-only offshore disturbance
// view from the existing verified GLOS observations. No provider API request,
// no shoreline camera, no false wave-to-agate/safety forecast.
const fs=require('node:fs'),path=require('node:path');
const {analyzeSensorDisturbance}=require('../../lib/rockhounding/sensor-disturbance.cjs');
function run(args=process.argv.slice(2)){
 const values={};
 for(let i=0;i<args.length;i+=2){
  if(!['--ledger','--events','--out','--now'].includes(args[i])||!args[i+1]||values[args[i]])
   throw Error('Expected --ledger FILE --events FILE --out FILE and optional --now ISO8601');
  values[args[i]]=args[i+1];
 }
 for(const k of ['--ledger','--events','--out'])if(!values[k])throw Error('Missing '+k);
 const ledger=JSON.parse(fs.readFileSync(values['--ledger'],'utf8'));
 const events=JSON.parse(fs.readFileSync(values['--events'],'utf8'));
 if(events.schemaVersion!=='rockhounding-glos-offshore-event-history-v1'||
   events.source!=='GLOS_SEAGULL_OBS_140_SPOT_1361'||
   events.sourceOnlyNoBeachOutcome!==true||
   events.sufficientForRockExposurePrediction!==false||
   events.canPublishVisitWindow!==false||
   events.recordCount!==ledger.records.length)
  throw Error('Original measured-offshore event report drifted from observation ledger');
 const nowISO=values['--now']||events.calculatedAtUTC;
 if(typeof nowISO!=='string'||!Number.isFinite(Date.parse(nowISO)))
  throw Error('Invalid source timestamp');
 const agate=analyzeSensorDisturbance(ledger,{nowISO,hazardSnapshot:events.hazardSnapshot,
  siteId:'grand-marais-agate'});
 const harbor=analyzeSensorDisturbance(ledger,{nowISO,hazardSnapshot:events.hazardSnapshot,
  siteId:'grand-marais-harbor'});
 const report={
  schemaVersion:'rockhounding-no-photo-offshore-conditions-v1',
  createdAtUTC:nowISO,source:'GLOS_SPOT1361_REAL_OFFSHORE_NOT_BEACH',
  originalSourceObservationCount:ledger.records.length,
  originalSourceLastTime:ledger.records.at(-1)?.time??null,
  originalSourceArchiveUpdatedAtUTC:ledger.generatedAtUTC,
  noPhotographyRequired:true,
  sourcePhotoComparisonsUsed:false,
  sourceNwsCurrentAlertSeparatelyChecked:true,
  agate,harbor,
  originalMeasurementCoverageOnly:true,
  calibratedToAgateOutcomes:false,agatesObservedInSource:0,
  canPublishRockhoundingVisitWindow:false,canCertifySafeBeach:false,
  legalCollectingAccessVerified:false,
  notes:'Descriptive observed Lake Superior offshore waves, mean period, recovery and alerts. No validated Agate Beach breaking surf, shoreline sediment transport or agate exposure.'
 };
 const out=path.resolve(values['--out']);
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const tmp=out+'.tmp-'+process.pid;
 fs.writeFileSync(tmp,JSON.stringify(report,null,2)+'\n');
 fs.renameSync(tmp,out);
 console.log('ROCKHOUNDING_SENSOR_NO_PHOTO '+JSON.stringify({
  createdAtUTC:nowISO,observations:report.originalSourceObservationCount,
  status:agate.status,latestAt:agate.latestObservedAtUTC,
  recent24ObservedHours:agate.recent24h.observedHours,
  recent72ElevatedHours:agate.recent72h.observedElevatedHours,
  nws:agate.alertSnapshot.status,
  harborSurfModeled:false,safeAccessClaim:false,newAgateClaim:false
 }));
 return report;
}
if(require.main===module)try{run()}catch(e){
 console.error('ROCKHOUNDING_SENSOR_NO_PHOTO_FAILED '+String(e.message||e));process.exitCode=1;
}
module.exports={run};
