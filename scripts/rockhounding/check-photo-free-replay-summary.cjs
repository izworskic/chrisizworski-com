#!/usr/bin/env node
'use strict';
// Pin source backtest summary to immutable original GLOS commit. The live
// research/data branch continues collecting; its growing row count is not a
// failure of the original 2026 frozen source-quality snapshot.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
function verify(output,frozen){
 const s=JSON.parse(fs.readFileSync(path.resolve(output),'utf8'));
 const f=JSON.parse(fs.readFileSync(path.resolve(frozen),'utf8'));
 assert.equal(s.schemaVersion,'rockhounding-photo-free-observation-replay-2026-v1');
 assert.equal(f.schemaVersion,'rockhounding-photo-free-wave-replay-quality-v1');
 assert.equal(s.sourceOriginalRows,f.originalMeasuredRows);
 assert.equal(s.checkpoints,f.walkForwardCheckpoints);
 assert.equal(s.sourceCoveredCheckpoints,f.checkpointsWithValidCurrentWaveSample);
 assert.equal(s.sourceCoveredPct,f.validCurrentWaveSamplePct);
 assert.equal(s.checkpointsWithCompleteTwoDayComparison,f.checkpointsWithFullPrior24hAndRecent24h);
 assert.equal(s.completeTwoDayCoveragePct,f.completeTwoDayComparisonPct);
 assert.deepEqual(s.observationStates,f.sourceWavePhases);
 assert.equal(s.originalOffshoreEpisodes,11);
 assert.equal(s.originallyQualifiedOffshoreEpisodes,8);
 assert.equal(s.frozen2026EpisodeReferenceRows,5243);
 assert.equal(s.overlappingCheckpointsNotIndependentStorms,true);
 assert.equal(s.trainingOrCalibratedExposureModel,false);
 assert.equal(s.observedBeachRockOutcomeCount,0);
 assert.equal(s.historicalMarineAlertState,'NOT_RECONSTRUCTED_FOR_ANY_CHECKPOINT');
 assert.equal(s.canPredictNewAgates,false);
 assert.equal(s.canPublishCollectingWindow,false);
 assert.ok(s.checkpointSeries.length===s.checkpoints);
 for(const row of s.checkpointSeries){
  assert.ok(!row.newestOriginalObservedUTC||
   Date.parse(row.newestOriginalObservedUTC)<=Date.parse(row.atUTC));
  assert.equal(row.historicalNwsStatus,'NOT_BACKFILLED');
  assert.equal(row.beachMorphologyOutcome,'NOT_MEASURED');
  assert.equal(row.canClaimSafeBeach,false);
  assert.equal(row.canPredictNewAgates,false);
 }
 console.log('PHOTO_FREE_REPLAY_FROZEN_SOURCE_VERIFIED '+JSON.stringify({
  originalRows:s.sourceOriginalRows,checkpoints:s.checkpoints,
  measuredDataCoveragePercent:s.sourceCoveredPct,
  trendCoveragePercent:s.completeTwoDayCoveragePct,
  noPhotos:true,stonePrediction:false
 }));
 return true;
}
if(require.main===module)try{
 if(process.argv.length!==4)throw Error('Usage: check-photo-free-replay-summary.cjs report.json frozen-quality.json');
 verify(process.argv[2],process.argv[3]);
}catch(e){console.error('PHOTO_FREE_REPLAY_QUALITY_DRIFT '+e.message);process.exitCode=1}
module.exports={verify};
