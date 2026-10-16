#!/usr/bin/env node
'use strict';
// Render source-backed 2026 offshore storm / independent photo matching queue.
// No live visitors, no API keys, no pixel-change estimates, and no new agate
// or safe-shore publishing permission.
const fs=require('node:fs'),path=require('node:path');
const {eventQueue}=require('../../lib/rockhounding/storm-photo-review-queue.cjs');
function main(args=process.argv.slice(2)){
 if(args.length!==2||!['--out','--verify'].includes(args[0])||!args[1])
  throw Error('Usage: --out file.json OR --verify frozen-file.json');
 const report=eventQueue();
 const filename=path.resolve(args[1]);
 if(args[0]==='--verify')
  require('node:assert/strict').deepStrictEqual(JSON.parse(fs.readFileSync(filename,'utf8')),report);
 else {
  fs.mkdirSync(path.dirname(filename),{recursive:true});
  fs.writeFileSync(filename,JSON.stringify(report,null,2)+'\n');
 }
 console.log('ROCKHOUNDING_STORM_PHOTO_QUEUE '+JSON.stringify({
  distinctMeasuredOffshoreEpisodes:report.eligibleIndependentMeasuredOffshoreEpisodes,
  sitePhotoDateCandidates:report.eventsWithDatedNamedSiteMedia,
  uncertainPostSceneCandidateEpisodes:report.eventsWithUncertainPostScene,
  reviewedBeforeAfterPhotoPairs:report.matchedSameVantageBeforeAfterStormPairs,
  measuredSedimentChanges:report.measuredWaveAttributedSedimentChanges,
  canPredictNewAgates:false,canPublishVisitWindow:false
 }));
 return report;
}
if(require.main===module)try{main()}catch(e){console.error('STORM_PHOTO_QUEUE_FAILED '+e.message);process.exitCode=1}
module.exports={main};
