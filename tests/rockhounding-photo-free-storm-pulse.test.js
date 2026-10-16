'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {assertSources,episodePhase,buildStormPulse}=require('../lib/rockhounding/photo-free-storm-pulse.cjs');
const stored=require('../public/rockhounding-lab/storm-pulse-2026.json');
const archive=require('../public/rockhounding-lab/glos-season-2026-research.json');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
test('the photo-independent wave pulse is entirely reproduced from authentic GLOS source data',()=>{
 assert.equal(assertSources(),true);
 assert.deepEqual(buildStormPulse(),stored);
 assert.equal(stored.originalPhotosUsed,false);
 assert.equal(stored.photoVerificationRequiredForWaveHistory,false);
 assert.equal(stored.historicObservationCount,5243);
 assert.equal(stored.observedDays,111);
 assert.equal(stored.wellSampledEpisodes,8);
 assert.equal(stored.episodes.filter(x=>x.hasWaveRebuild).length,2);
 assert.equal(stored.episodes[0].peakAtUTC,'2026-10-12T14:46:01Z');
 assert.equal(stored.episodes[0].observedPeakHeightM,2.57);
 assert.equal(stored.episodes[0].phaseKey,'WAVES_RETURNED');
 assert.equal(stored.episodes.at(-1).peakAtUTC,'2026-07-21T23:46:01Z');
});
test('original wave-from direction is described as historical offshore orientation, not beach surf',()=>{
 assert.equal(stored.latestArchivedSample.atUTC,'2026-10-14T23:46:01Z');
 assert.equal(stored.latestArchivedSample.significantWaveHeightM,.95);
 assert.equal(stored.latestArchivedSample.waveFromDeg,329.11);
 assert.equal(stored.latestArchivedSample.wavePeriodS,4.1);
 assert.equal(stored.historicDirectionComparison.chartedAgateFacingDeg,336.74);
 assert.equal(stored.historicDirectionComparison.separationDeg,7.63);
 assert.equal(stored.historicDirectionComparison.physicallyModeledWaveHeightAtBeachM,null);
 assert.equal(stored.isLiveNow,false);
 assert.equal(stored.canForecastBreakingSurf,false);
 assert.equal(stored.canForecastAgateDiscoveries,false);
 assert.equal(stored.canLabelShoreSafe,false);
 assert.equal(stored.canApproveCollecting,false);
});
test('observed storm-recovery classifications never become rock discovery or visit probability',()=>{
 for(const episode of stored.episodes){
  const original=archive.rows.find(x=>x.peakObservedAt===episode.peakAtUTC);
  assert.ok(original?.qualifyingOffshoreEpisode);
  assert.equal(episode.observedPeakHeightM,original.peakWaveHeightM);
  const phase=episodePhase(original);
  assert.equal(episode.phaseKey,phase.key);
  assert.equal(episode.phaseLabel,phase.label);
  assert.ok(Array.isArray(episode.sequence)&&episode.sequence.length===3);
  assert.equal(episode.sampleQualified,true);
 }
 assert.equal(stored.episodes.find(x=>x.peakAtUTC==='2026-09-14T01:16:01Z').phaseKey,'WAVES_RETURNED');
 assert.equal(stored.episodes.find(x=>x.peakAtUTC==='2026-08-23T22:16:01Z').phaseKey,'OBSERVED_EASING');
});
test('tampered source wave rows or missing provenance fail before any publication snapshot',()=>{
 const fake=structuredClone(archive);
 fake.episodes=3;
 fake.rows[0].peakWaveHeightM=22;
 assert.throws(()=>buildStormPulse({a:fake}),/episode/);
 const fake2=structuredClone(archive);
 fake2.actualObservedWaveRecords=1200;
 assert.throws(()=>buildStormPulse({a:fake2}),/provenance/);
});
test('primary UI is photographic-source-independent with clear dated measurements, accessible event picker and positive language',()=>{
 assert.match(html,/id="photo-free-storm-pulse"/);
 assert.match(html,/id="pulseEventChart"/);
 assert.match(html,/id="pulseEventSelect"/);
 assert.match(html,/id="pulsePhaseSteps"/);
 assert.match(html,/id="pulseDirection"/);
 assert.match(html,/id="pulseDataPeriod"/);
 assert.match(html,/storm-pulse-2026\.json/);
 assert.match(html,/Waves built again/); // supporting real archive copy remains
 assert.match(html,/See the storm peak, follow the waves as they ease or build again/);
 assert.match(html,/Current NWS weather/);
 assert.match(html,/Current marine alerts/);
 assert.match(html,/Burt Township beach information/);
 assert.match(html,/Burt Township park information/);
 assert.match(html,/Historical wave observations through October 14, 2026/);
 assert.match(html,/<details class="researchShelf" id="research-archive">/);
 assert.match(html,/<summary>Explore the research archive, charts and original source studies<\/summary>/);
 assert.ok(html.indexOf('id="photo-free-storm-pulse"')<html.indexOf('id="research-archive"'));
 assert.ok(html.indexOf('id="research-archive"')<html.indexOf('id="storm-photo-review-queue"'));
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication|<link rel="canonical"/);
});
