#!/usr/bin/env node
'use strict';
// Reconstruct photo-free offshore activity from original GLOS observations
// archived separately from main. No provider API calls, no licensed images.
const fs=require('node:fs'),path=require('node:path');
const {buildPhotoFreeActivity}=require('../../lib/rockhounding/photo-free-wave-activity.cjs');
function argsOf(input){
 const out={};
 for(let i=0;i<input.length;i+=2){
  if(!['--ledger','--out','--check'].includes(input[i])||!input[i+1]||out[input[i]])
   throw Error('Usage: --ledger original-observed-ledger.json --out report.json [--check preexisting-report.json]');
  out[input[i]]=input[i+1];
 }
 if(!out['--ledger']||!out['--out'])throw Error('Source ledger and output paths required');
 return out;
}
function run(argv=process.argv.slice(2)){
 const a=argsOf(argv),input=JSON.parse(fs.readFileSync(a['--ledger'],'utf8'));
 const report=buildPhotoFreeActivity({ledger:input});
 if(a['--check']){
  require('node:assert/strict').deepStrictEqual(
    JSON.parse(fs.readFileSync(a['--check'],'utf8')),report,
    'Measured offshore activity snapshot differs from original GLOS source archive');
 }
 const out=path.resolve(a['--out']);fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('PHOTO_FREE_ACTIVITY_SUMMARY '+JSON.stringify({
  observations:report.baseSourceOriginalRows,episodes:report.episodeTotal,
  comparable:report.episodesWithSufficientCoverage,
  firstAt:report.sourceObservationStartUTC,lastAt:report.sourceObservationEndUTC,
  byDate:report.entries.map(e=>({
   date:e.peakAtUTC,peakM:e.peakSignificantHeightM,
   signal:e.observedWaveActivityProxy,
   alignedPct:e.historicFacingSharePct,
   measuredCoveragePct:e.observedTimeCoveragePct,
   relativeToTop:e.relativeToLargestMeasured2026EpisodePct,
   eligible:e.enoughCoverageForRelativeComparison,
   rebuilt:e.recordedWaveRebuild
  })),
  canPredictAgates:false,canClaimSafeAccess:false,usesPhotos:false}));
 // Full source-derived object is emitted only on CI, after original GLOS
 // verification and never served to visitors through an external API.
 if(process.env.ROCKHOUNDING_EMIT_SOURCE_JSON==='1')
  console.log('PHOTO_FREE_ACTIVITY_JSON '+JSON.stringify(report));
 return report;
}
if(require.main===module)try{run()}catch(e){console.error('PHOTO_FREE_ACTIVITY_FAILURE '+e.message);process.exitCode=1}
module.exports={run,argsOf};
