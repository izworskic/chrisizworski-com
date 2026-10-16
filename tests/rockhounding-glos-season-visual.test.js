'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const archive=require('../public/rockhounding-lab/glos-season-2026-research.json');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
test('entire season chart is actual original GLOS 2026 source snapshot, not 11 made-up storms',()=>{
 assert.equal(archive.schemaVersion,'rockhounding-glos-season-2026-archived-storms-v1');
 assert.equal(archive.actualObservedWaveRecords,5243);
 assert.equal(archive.sourceDays,111);
 assert.equal(archive.measuredElevatedEpisodeGroups,11);
 assert.equal(archive.rows.length,11);
 assert.equal(archive.qualifyingMeasuredOffshoreEpisodes,8);
 assert.equal(archive.thresholdM,1);
 assert.equal(archive.separationHours,48);
 assert.equal(archive.sourceObservationRangeUTC.from,'2026-06-26T01:16:01Z');
 assert.equal(archive.sourceObservationRangeUTC.to,'2026-10-14T23:46:01Z');
 assert.equal(archive.archiveReadAtUTC,'2026-10-16T01:08:53.734Z');
 assert.equal(archive.rows.filter(x=>x.qualifyingOffshoreEpisode).length,8);
 assert.equal(archive.rows.filter(x=>x.renewedAfterDrop).length,2);
 const peaks=archive.rows.map(x=>x.peakWaveHeightM);
 assert.ok(peaks.includes(2.57)&&peaks.includes(2.51));
});
test('historical 2026 chart stays separate from simulated selector and current marine alert layer',()=>{
 assert.match(html,/id="spotter-season-archive"/);
 assert.match(html,/id="spotterSeasonChart"/);
 assert.match(html,/glos-season-2026-research\.json/);
 assert.match(html,/id="spotterSeasonEpisodes"/);
 assert.match(html,/5,243 original Grand Marais Spotter readings/);
 assert.match(html,/111 UTC days/);
 assert.match(html,/At least 48h separation needed/);
 assert.match(html,/No measured fresh-stone outcome/);
 assert.match(html,/chart is not live/);
 assert.match(html,/no episode magnitudes or collecting advice substituted/i);
 assert.match(html,/id="grand-marais-spotter-evidence"/);
 assert.match(html,/id="historical-evidence"/);
 assert.match(html,/NOT LIVE WEATHER/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
test('every real event remains an offshore-only, no-field-validation group',()=>{
 assert.equal(archive.actualRockExposureFieldObservations,0);
 assert.equal(archive.archivedWaveRecordsAreNotRealTime,true);
 assert.equal(archive.currentAlertRecordNotRetrospectivelyApplied,true);
 assert.equal(archive.actualSiteSurfMeasured,false);
 assert.equal(archive.canPredictNewAgates,false);
 assert.equal(archive.canPublishRockhoundingWindow,false);
 assert.equal(archive.canClaimSafeShore,false);
 for(const e of archive.rows){
  assert.equal(e.measuredBeachStoneOutcomes,0);
  assert.ok(['UNVERIFIED_GAPPY_EVENT','OFFSHORE_WAVES_ELEVATED_AGAIN_AFTER_DROP',
    '48H_POST_EVENT_OFFSHORE_RECORD_COMPLETE','OBSERVED_DECLINE_EVENT_END_UNCONFIRMED',
    'OFFSHORE_DISTURBANCE_INCOMPLETE'].includes(e.lifecycle));
 }
});
