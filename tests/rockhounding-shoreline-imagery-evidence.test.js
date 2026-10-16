'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const catalog=require('../data/rockhounding/grand-marais-2026-sentinel-shoreline-candidate-scenes.json');
const photos=require('../data/rockhounding/grand-marais-2026-independent-shore-photo-register.json');
const history=require('../public/rockhounding-lab/glos-season-2026-research.json');
const {sceneSourceValidated,photoSourceValidated,validateWaveHistory,pairForEvent,shoreChangeResearch}=
 require('../lib/rockhounding/shoreline-photo-evidence.cjs');
const lookup=stamp=>history.rows.find(x=>x.peakObservedAt.startsWith(stamp));
test('nine real catalog scenes and 2026 independently dated shore photographs have original immutable source links',()=>{
 assert.equal(sceneSourceValidated(),true);
 assert.equal(photoSourceValidated(),true);
 assert.equal(validateWaveHistory(),true);
 assert.equal(catalog.scenes.length,9);
 assert.equal(photos.photoRecords.length,3);
 assert.deepEqual(photos.photoRecords[0].geolocationWgs84,[-85.98748,46.67519]);
 assert.equal(photos.photoRecords[0].originalReportedCaptureDate,'2026-07-05');
 assert.equal(photos.photoRecords[1].originalReportedCaptureDate,'2026-07-04');
 assert.equal(photos.photoRecords[2].dateConfidence,'AUTHOR_RELATIVE_DATE_APPROXIMATE');
});
test('Sep 9 qualifies for dated pre/post satellite catalog selection, not a proven changed beach',()=>{
 const s=pairForEvent(lookup('2026-09-09T22'));
 assert.equal(s.status,'DATED_IMAGERY_PAIR_CANDIDATE_NOT_REVIEWED');
 assert.match(s.before.id,/20260906/);
 assert.match(s.after.id,/20260911/);
 assert.equal(s.before.sceneCloudCoverPercent,0.306874);
 assert.equal(s.after.sceneCloudCoverPercent,14.970376);
 assert.equal(s.shorelineChangeEvidenceLevel,'CATALOG_METADATA_ONLY');
 assert.equal(s.sameBeachPixelsRegistered,false);
 assert.equal(s.measuredGravelExposureAreaM2,null);
 assert.equal(s.canClaimStormCausedStoneExposure,false);
 assert.equal(s.canPublishVisitWindow,false);
 assert.equal(s.observedPebbleExposure,false);
});
test('Sep 20 source peaks pair against Sept 16/23, with same-vantage local QC still missing',()=>{
 const s=pairForEvent(lookup('2026-09-20T19'));
 assert.equal(s.status,'DATED_IMAGERY_PAIR_CANDIDATE_NOT_REVIEWED');
 assert.match(s.before.id,/20260916/);
 assert.match(s.after.id,/20260923/);
 assert.equal(s.after.sitePixelCloudQc,false);
 assert.equal(s.canClaimSafeAccess,false);
});
test('October 12 high-cloud satellite and actively elevated waves do not imply a settled post-storm beach',()=>{
 const s=pairForEvent(lookup('2026-10-12T14'));
 assert.equal(s.status,'NO_QUALIFYING_POST_STORM_SCENE');
 assert.match(s.before.id,/20261006/);
 assert.equal(s.after,null);
 assert.equal(s.canPublishVisitWindow,false);
});
test('August 23 high tile cloud blocks pre-storm pairing; gray imagery cannot mean no sediment',()=>{
 const s=pairForEvent(lookup('2026-08-23T22'));
 assert.equal(s.status,'NO_QUALIFYING_PRE_STORM_SCENE');
 assert.equal(s.before,null);
 assert.match(s.after.id,/20260827/);
 assert.equal(s.actualBeachChangeDirection,'UNKNOWN');
});
test('only sufficiently observed episodes get pre/post pairs and harbor does not inherit a north shore signal',()=>{
 const s=shoreChangeResearch();
 assert.equal(s.status,'HISTORIC_IMAGERY_CANDIDATES_ONLY_NO_SHORELINE_CHANGE_VERDICT');
 assert.equal(s.observedOffshoreEpisodeGroups,11);
 assert.equal(s.qualifiedOffshoreEpisodes,8);
 assert.ok(s.pairedResearchEvents>=3);
 assert.equal(s.authoredGroundPhotoRecords,3);
 assert.equal(s.independentlyVerifiedBeachChanges,0);
 assert.equal(s.directlyMeasuredPostStormRockChanges,0);
 assert.equal(s.exposedPebbleProbability,null);
 assert.equal(s.rockhoundingOpportunityScore,null);
 assert.equal(s.canPublishVisitWindow,false);
 const harbor=shoreChangeResearch({siteId:'grand-marais-harbor'});
 assert.equal(harbor.status,'BAYSHORE_NO_INDEPENDENT_IMAGERY_OR_WAVE_TRANSFER');
 assert.equal(harbor.pairedResearchEvents,0);
 assert.equal(harbor.canInferHarborSurf,false);
});
test('unknown or unqualified offshore waves cannot become shoreline change',()=>{
 assert.equal(pairForEvent(lookup('2026-07-12T21')).status,'UNQUALIFIED_OR_BAD_OFFSHORE_EPISODE');
 const r=pairForEvent({...lookup('2026-09-09T22'),peakObservedAt:'2026-01-01T00:00:00Z'});
 assert.equal(r.status,'UNQUALIFIED_OR_BAD_OFFSHORE_EPISODE');
 assert.equal(r.canClaimStormCausedStoneExposure,false);
});
test('reject altered metadata, forged low-cloud local QC, self-reported rockfind claims, or wave status upgrades',()=>{
 const edits=[
  s=>{s.scenes[2].sceneCloudCoverPercent=-1},
  s=>{s.scenes[2].localAgateBeachVisibleWithoutClouds=true},
  s=>{s.scenes[2].beachChangeDirection='EXPOSED_ROCKS'},
  s=>{s.scenes[2].waterlineChangeReviewed=true},
  s=>{s.scenes[2].id='S2A_OTHER_PLACE_20260906'},
  s=>{s.nativeVisualGsdMeters=1},
  s=>{s.publication.canClaimNewRocks=true}
 ];
 for(const fn of edits){const d=structuredClone(catalog);fn(d);assert.throws(()=>sceneSourceValidated(d));}
 const p=structuredClone(photos);
 p.photoRecords[0].visibleNewlyExposedRocksVerified=true;
 assert.throws(()=>photoSourceValidated(p));
 const w=structuredClone(history);
 w.canPredictNewAgates=true;
 assert.throws(()=>validateWaveHistory(w));
});
