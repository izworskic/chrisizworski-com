#!/usr/bin/env node
'use strict';
// Recompute a lightweight local, source-linked repeat-photo research digest.
// Only reviewed source metadata is used; no image differences/AI alignment.
const fs=require('node:fs'),path=require('node:path');
const {auditAll}=require('../../lib/rockhounding/repeat-view-photos.cjs');
function main(args=process.argv.slice(2)){
 if(args.length!==2||!['--check','--write'].includes(args[0])||!args[1])
  throw Error('Usage: audit-repeat-view-photos.cjs --check|--write FILE');
 const report=auditAll(),file=path.resolve(args[1]);
 if(args[0]==='--check'){
  const actual=JSON.parse(fs.readFileSync(file,'utf8'));
  require('node:assert/strict').deepStrictEqual(actual,report,
    'Review original image metadata before updating Commons repeat-view visual');
 }else{
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 }
 console.log('GRAND_MARAIS_REPEAT_VIEW '+JSON.stringify({
  historicalPhotos:report.availableOriginalPubliclyReusableHistoricalPhotos,
  registeredSourceGps:report.gpsAnchoredLicensed2026AgateBaseline,
  candidateGeographicMatches:report.archivalLandmarkPatternCandidates,
  reviewedSameViewStormPairs:report.dateMatchedPrePost2026WavePairs,
  confirmedExposedAgates:report.empiricallyVerifiedNewAgates,
  publicSafety:false,canPredictNewAgates:false
 }));
 return report;
}
if(require.main===module){try{main()}catch(e){console.error('REPEAT_VIEW_AUDIT_FAILED '+e.message);process.exitCode=1}}
module.exports={main};
