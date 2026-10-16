'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createAudit}=require('../scripts/rockhounding/audit-shoreline-photo-evidence.cjs');
const snapshot=require('../public/rockhounding-lab/shoreline-evidence-2026.json');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
test('noindex page audit is 100% recomputable from independently sourced 2026 photos and observed GLOS wave events',()=>{
 assert.deepEqual(snapshot,createAudit());
 assert.equal(snapshot.independentlyMeasuredOffshoreWaveRecords,5243);
 assert.equal(snapshot.sourceGroupedWaveEpisodes,11);
 assert.equal(snapshot.qualifyingSampledWaveEpisodes,8);
 assert.equal(snapshot.independentDatedBeachMediaSources,3);
 assert.equal(snapshot.geolocatedSingleScenes,1);
 assert.equal(snapshot.episodesWithApproximatePostSceneCandidate,1);
 assert.equal(snapshot.reviewedSameVantageBeforeAfterPairs,0);
 assert.equal(snapshot.observedBeachShorelineChanges,0);
 assert.equal(snapshot.newlyExposedAgateRecords,0);
 assert.equal(snapshot.canPredictNewAgates,false);
 assert.equal(snapshot.canClaimRecentlyExposedRocks,false);
});
test('the July 21 offshore peak and approximate July 24 post reference cannot be interpreted as correlated beach-rock change',()=>{
 assert.equal(snapshot.candidateConnections.length,1);
 assert.equal(snapshot.candidateConnections[0].offshoreWavePeakAtUTC,'2026-07-21T23:46:01Z');
 assert.equal(snapshot.candidateConnections[0].offshoreWavePeakHeightM,1.62);
 assert.equal(snapshot.candidateConnections[0].sourceQualifiedOffshoreEpisode,true);
 assert.equal(snapshot.candidateConnections[0].postEventMediaCandidates.length,1);
 assert.equal(snapshot.candidateConnections[0].postEventMediaCandidates[0].temporalStatus,
  'POST_EVENT_POSSIBLE_TIME_OVERLAP_UNCERTAIN');
 assert.equal(snapshot.candidateConnections[0].noConfirmedStormLinkedShorelineChange,true);
 assert.equal(snapshot.calibratedRockExposureScoreAvailable,false);
});
test('photo visual is the actual geolocated 2026 Wikimedia scene with required CC-BY creator and license, no republication of restricted content',()=>{
 assert.match(html,/id="shoreline-observation-evidence"/);
 assert.match(html,/id="shoreline-observation-title"/);
 assert.match(html,/id="shoreEvidenceScenes"/);
 assert.match(html,/id="shoreEvidenceCandidates"/);
 assert.match(html,/id="shoreEvidenceVerified"/);
 assert.match(html,/id="shorelineObservationProof"/);
 assert.match(html,/shoreline-evidence-2026\.json/);
 assert.match(html,/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/b\/b9\/Grand_Marais_Agate_Beach\.jpg/);
 assert.match(html,/TCP04 \/ Wikimedia Commons/);
 assert.match(html,/creativecommons\.org\/licenses\/by\/4\.0/);
 assert.match(html,/no comparable beach change or new agate measurements/);
 assert.match(html,/zero validated before\/after shoreline-change pairs/);
 assert.match(html,/Flickr/);
 assert.match(html,/All rights reserved|do not copy or embed|from.*Flickr/s);
 assert.match(html,/July 21 at 23:46 UTC/);
 assert.match(html,/One tentative post-event media date/);
 assert.match(html,/If your browser/i?.test('') ? /Abc/ : /independent photo metadata/i);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
test('source captures are link-only except for CC BY attributed photo and explicitly deny site safety predictions',()=>{
 for(const row of snapshot.photoSources){
  assert.ok(row.sourceUrl.startsWith('https://'));
  assert.equal(row.dateStartUTC.endsWith('Z'),true);
  assert.equal(row.dateEndUTC.endsWith('Z'),true);
 }
 assert.equal(snapshot.photoSources[1].rights.includes('do not copy or embed'),true);
 assert.equal(snapshot.photoSources[2].rights.includes('do not copy or embed'),true);
 assert.equal(snapshot.nWSAlertsNotReconstructedForHistory,true);
 assert.equal(snapshot.cameraLocationsDoNotDefineLegalAccess,true);
 assert.equal(snapshot.sourcePhotoAloneNotBeachMaterialRearrangement,true);
 assert.equal(snapshot.canClaimBeachSafety,false);
 assert.equal(snapshot.canPublishVisitWindow,false);
});
