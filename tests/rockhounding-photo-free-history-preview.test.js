'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const snapshot=require('../public/rockhounding-lab/photo-free-offshore-wave-activity-2026.json');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
test('frozen original 2026 GLOS wave-activity proxy ranks sustained wave activity rather than just peaks',()=>{
 assert.equal(snapshot.observedDataProvider,'GLOS_SPOT1361_GRAND_MARAIS_OPEN_LAKE');
 assert.equal(snapshot.sourceRows,5291);
 assert.equal(snapshot.originalEpisodeGroups,11);
 assert.equal(snapshot.researchComparableEpisodes,8);
 assert.equal(snapshot.sourcePeriodsAndPeaks.length,11);
 assert.equal(snapshot.sourcePeriodsAndPeaks.filter(e=>e.observedWaveActivityProxy!==null).length,8);
 const oct5=snapshot.sourcePeriodsAndPeaks.find(e=>e.observedPeakUTC==='2026-10-05T07:16:01Z');
 const oct12=snapshot.sourcePeriodsAndPeaks.find(e=>e.observedPeakUTC==='2026-10-12T14:46:01Z');
 assert.equal(oct5.offshorePeakM,2.51);
 assert.equal(oct12.offshorePeakM,2.57);
 assert.equal(oct5.observedWaveActivityProxy,953.898);
 assert.equal(oct12.observedWaveActivityProxy,746.469);
 assert.equal(oct5.relativePercentileInComparableSample,94);
 assert.equal(oct12.relativePercentileInComparableSample,81);
 assert.ok(oct5.observedWaveActivityProxy>oct12.observedWaveActivityProxy);
 assert.equal(snapshot.sourceObservationStaleAtComputation,true);
 assert.equal(snapshot.nwsSnapshotAtComputation,'ACTIVE');
});
test('new primary historical activity chart is a photo-free noindex research comparison and not a visitor-safe score',()=>{
 assert.match(html,/id="photo-free-observed-storm-strength"/);
 assert.match(html,/id="photoFreeActivityChart"/);
 assert.match(html,/id="photoFreeActivityCaption"/);
 assert.match(html,/photo-free-offshore-wave-activity-2026\.json/);
 assert.match(html,/No photographs needed/);
 assert.match(html,/rather than just the tallest wave/);
 assert.match(html,/5,291/);
 assert.match(html,/5,291-reading calculation and tests/);
 assert.match(html,/not calibrated wave power or beach sediment movement/);
 assert.match(html,/Neither result predicts exposed agates, safe access or protected Bayshore Park waves/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
test('research chart and snapshot explicitly deny agate probability, beach safety, and harbor transfer',()=>{
 assert.equal(snapshot.shoreSafetyCertified,false);
 assert.equal(snapshot.photoEvidenceRequiredForWaveProxy,false);
 assert.equal(snapshot.calibratedToAgateExposure,false);
 assert.equal(snapshot.canPredictFreshAgates,false);
 assert.equal(snapshot.canRecommendACollectingWindow,false);
 assert.equal(snapshot.canInferBayshoreHarborSurf,false);
 assert.ok(snapshot.sourcePeriodsAndPeaks.every(x=>x.beachSedimentObserved===false&&
  x.canClaimSafeAccess===false&&x.canPredictFreshAgates===false));
 assert.match(snapshot.proxyExplanation,/NOT modeled wave power or measured beach sediment transport/);
});
