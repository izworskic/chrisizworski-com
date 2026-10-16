'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
const digest=require('../public/rockhounding-lab/shoreline-image-evidence-2026.json');
const {shoreChangeResearch}=require('../lib/rockhounding/shoreline-photo-evidence.cjs');
test('four original dated Sentinel catalog pairs line up exactly with validated GLOS event dates',()=>{
 const engine=shoreChangeResearch(),items=digest.pairs.filter(x=>x.classification==='DATED_IMAGERY_PAIR_CANDIDATE_NOT_REVIEWED');
 assert.equal(engine.pairedResearchEvents,4);
 assert.equal(digest.datedMetadataSceneCandidates,engine.pairedResearchEvents);
 assert.equal(items.length,4);
 for(const v of items){
  const x=engine.pairs.find(r=>r.eventPeakAt===v.offshorePeakUTC);
  assert.ok(x);
  assert.equal(x.status,v.classification);
  assert.equal(x.before.id,v.pre.sceneId);
  assert.equal(x.after.id,v.post.sceneId);
  assert.equal(x.before.capturedUTC,v.pre.acquiredUTC);
  assert.equal(x.after.capturedUTC,v.post.acquiredUTC);
  assert.equal(x.before.sceneCloudCoverPercent,v.pre.sceneCloudPercent);
  assert.equal(x.after.sceneCloudCoverPercent,v.post.sceneCloudPercent);
  assert.equal(v.siteSpecificStormRockOutcomeValidated,false);
  assert.equal(v.localBeachChangeObserved,false);
 }
});
test('noindex evidence review plainly differentiates dated imagery from verified stone exposure',()=>{
 assert.match(html,/id="shoreline-evidence-stage"/);
 assert.match(html,/Did the storms uncover new stones/);
 assert.match(html,/Not yet verified/);
 assert.match(html,/id="shorelineCandidatePairs"/);
 assert.match(html,/shoreline-image-evidence-2026\.json/);
 assert.match(html,/Measured beach rock changes/);
 assert.match(html,/satellite imagery.s approximate 10-meter visual pixels/i);
 assert.match(html,/whole-scene cloud percentage does not prove Agate Beach itself is visible/i);
 assert.match(html,/same shoreline before and after/i);
 assert.match(html,/camera-dated and geotagged Wikimedia Commons photo/i);
 assert.match(html,/No before\/after pixel review/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
test('no claims become beach safety, stone probabilities, or retroactive field outcomes',()=>{
 assert.equal(digest.schemaVersion,'rockhounding-agate-poststorm-independent-evidence-digest-v1');
 assert.equal(digest.originalWaveReadingCount,5243);
 assert.equal(digest.independentlyDatedSatelliteScenes,9);
 assert.equal(digest.independentlyDatedOnBeachPhotoSources,3);
 assert.equal(digest.visuallyInspectedRegisteredBeforeAfterPairs,0);
 assert.equal(digest.measuredShorelineChangeEvents,0);
 assert.equal(digest.verifiedStormCausedRockExposureOutcomes,0);
 assert.equal(digest.canClaimSafeBeach,false);
 assert.equal(digest.canPredictNewRocks,false);
 assert.equal(digest.canPublishRockhoundingVisitWindow,false);
});
