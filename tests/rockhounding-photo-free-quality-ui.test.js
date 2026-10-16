'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const snapshot=require('../public/rockhounding-lab/wave-signal-quality-2026.json');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
const states={
 LOWER_OFFSHORE_WAVE_ACTIVITY:129,
 OFFSHORE_WAVES_EASING:50,
 OFFSHORE_WAVES_ELEVATED:16,
 RECENT_OFFSHORE_WAVE_ACTIVITY:7,
 OFFSHORE_WAVES_REBUILDING:3,
 OFFSHORE_SENSOR_STALE:3,
 OFFSHORE_OBSERVATIONS_GAPPY:1
};
test('frozen 2026 original measured archive replay is DATA quality, not accuracy of finding rocks',()=>{
 assert.equal(snapshot.schemaVersion,'rockhounding-photo-free-wave-replay-quality-v1');
 assert.equal(snapshot.sourceCommitSHA,'35f480d073de3dc1ff38000d62aaed23c8b579c7');
 assert.equal(snapshot.originalMeasuredRows,5291);
 assert.equal(snapshot.walkForwardCheckpoints,209);
 assert.equal(snapshot.checkpointsWithValidCurrentWaveSample,205);
 assert.equal(snapshot.checkpointsWithFullPrior24hAndRecent24h,195);
 assert.equal(snapshot.validCurrentWaveSamplePct,98.1);
 assert.equal(snapshot.completeTwoDayComparisonPct,93.3);
 assert.deepEqual(snapshot.sourceWavePhases,states);
 assert.equal(Object.values(states).reduce((a,b)=>a+b,0),209);
 assert.equal(snapshot.statsCountDiscreteCheckpointStatesNotIndependentStorms,true);
 assert.equal(snapshot.scientificMeaning.includes('NOT accuracy at finding rocks'),true);
 assert.equal(snapshot.photographsNeeded,false);
 assert.equal(snapshot.historicNWSAlertsReconstructed,false);
 assert.equal(snapshot.siteBeachSedimentGroundTruthAvailable,false);
 assert.equal(snapshot.rockExposureModelValidated,false);
 assert.equal(snapshot.canClaimSafeConditions,false);
 assert.equal(snapshot.canPredictNewAgates,false);
 assert.equal(snapshot.canPublishVisitWindow,false);
});
test('primary visitor display explains photo-free source quality and never calls it an agate forecast',()=>{
 assert.match(html,/id="wave-signal-quality-2026"/);
 assert.match(html,/id="wave-quality-title"/);
 assert.match(html,/id="qualityWaveRecords"/);
 assert.match(html,/id="qualityReplayCount"/);
 assert.match(html,/id="qualitySourcePct"/);
 assert.match(html,/id="qualityTrendPct"/);
 assert.match(html,/id="qualityObsFill"/);
 assert.match(html,/id="qualityTrendFill"/);
 assert.match(html,/wave-signal-quality-2026\.json/);
 assert.match(html,/how often sufficient buoy data were available/);
 assert.match(html,/not whether stones appeared on the beach/);
 assert.match(html,/not independent storms/);
 assert.match(html,/Missing readings did not become calm-beach or safe-access claims/);
 assert.match(html,/Current lake conditions appear in the live observations above/);
 assert.ok(html.indexOf('id="live-offshore-pulse"')<html.indexOf('id="wave-signal-quality-2026"'));
 assert.ok(html.indexOf('id="wave-signal-quality-2026"')<html.indexOf('id="photo-free-storm-pulse"'));
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
