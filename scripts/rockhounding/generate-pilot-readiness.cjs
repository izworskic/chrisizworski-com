#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {overallReadiness}=require('../../lib/rockhounding/pilot-publication-readiness.cjs');
function run(args=process.argv.slice(2)){
 if(args.length!==2||!['--write','--check'].includes(args[0])||!args[1])
  throw Error('Usage: node generate-pilot-readiness.cjs --write|--check FILE');
 const report=overallReadiness(),filename=path.resolve(args[1]);
 if(args[0]==='--check'){
  const stored=JSON.parse(fs.readFileSync(filename,'utf8'));
  require('node:assert/strict').deepStrictEqual(stored,report,
    'Real township access/collection and original GLOS evidence do not match noindex research readiness report');
 }else{
  fs.mkdirSync(path.dirname(filename),{recursive:true});
  fs.writeFileSync(filename,JSON.stringify(report,null,2)+'\n',{encoding:'utf8'});
 }
 console.log('ROCKHOUNDING_PILOT_READINESS '+JSON.stringify({
  townshipsPublicBeachSitesDocumented:report.townshipsPublicBeachSitesDocumented,
  municipalStoneCollectionPermitsProven:report.sitesWithPublishedSpecificRockCollectingPermission,
  sitesWithValidatedBreakingSurf:report.sitesWithValidatedLocalBreakingWaveMeasurements,
  sitesWithObservedStormStoneOutcome:report.sitesWithVerifiedStormToNewStoneOutcome,
  originalOffshoreMeasurements:report.sourceBackedRegionalObservedWaveRecords,
  researchPrioritizedEvidenceGap:report.firstHighValueEvidenceGap.missing,
  canPublishCurrentBeachOpportunity:false
 }));
 return report;
}
if(require.main===module)try{run()}catch(e){console.error('ROCKHOUNDING_PILOT_READINESS_FAILED '+e.message);process.exitCode=1}
module.exports={run};
