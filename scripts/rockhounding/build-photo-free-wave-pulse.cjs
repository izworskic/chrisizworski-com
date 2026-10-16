#!/usr/bin/env node
'use strict';
// Original archived GLOS wave rows -> reproducible photo-free relative
// observed-wave activity. Runs offline on GitHub Actions only; NOT on visitors.
const fs=require('node:fs'),path=require('node:path');
const {photoFreeWaveHistory}=require('../../lib/rockhounding/photo-free-wave-pulse.cjs');
function generate(ledger,report){
 if(!ledger||ledger.originalObservationsOnly!==true||
    !Array.isArray(ledger.records)||ledger.records.length<10||
    !report||report.source!=='GLOS_SEAGULL_OBS_140_SPOT_1361'||
    report.recordCount!==ledger.records.length||
    report.sourceOnlyNoBeachOutcome!==true||
    report.latestObservedAt!==ledger.records.at(-1).time||
    !Number.isFinite(Date.parse(report.calculatedAtUTC)))
  throw Error('Cannot attach unverified or inconsistent archival observed waves');
 const history=photoFreeWaveHistory(ledger,{nowISO:report.calculatedAtUTC,
  hazardSnapshot:report.hazardSnapshot});
 if(history.sourceRows!==report.recordCount||
    history.currentOffshoreObservedStatus==='NO_OBSERVATIONS'||
    history.canPredictFreshAgates!==false||
    history.canPublishCollectingWindow!==false||
    history.canClaimSafeCollecting!==false)
  throw Error('Photo-free evidence must remain observation-only and uncalibrated');
 return history;
}
function main(args=process.argv.slice(2)){
 const opts={};
 for(let i=0;i<args.length;i+=2){
  if(!['--ledger','--report','--out'].includes(args[i])||!args[i+1]||opts[args[i]])
   throw Error('Usage: --ledger path --report path --out path');
  opts[args[i]]=args[i+1];
 }
 if(Object.keys(opts).length!==3)throw Error('Three research-only paths required');
 const ledger=JSON.parse(fs.readFileSync(path.resolve(opts['--ledger']),'utf8'));
 const report=JSON.parse(fs.readFileSync(path.resolve(opts['--report']),'utf8'));
 const out=generate(ledger,report),file=path.resolve(opts['--out']);
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
 console.log('PHOTO_FREE_REAL_GLOS_WAVE_PULSE '+JSON.stringify({
  sourceRows:out.sourceRows,groups:out.archivedEventGroups,
  comparable:out.researchComparableEvents,asOf:out.computedAtUTC,
  sourceStatus:out.observationFreshness,nws:out.hazardSnapshotStatus,
  events:out.events.map(e=>({peakUTC:e.startUTC,peakHeightM:e.observedPeakWaveHeightM,
   proxy:e.relativeWaveActivity,coverage:e.sampleCoverageFraction,
   rank:e.archiveComparisonPercentile,status:e.status})),
  newAgatePredictions:false,shoreSafety:false}));
 return out;
}
if(require.main===module)try{main()}catch(e){console.error('PHOTO_FREE_WAVE_PULSE_FAILED '+e.message);process.exitCode=1}
module.exports={generate,main};
