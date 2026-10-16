'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const report=require('../public/rockhounding-lab/no-photo-regional-lake-stage-oct2026.json');
const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
test('two NOAA 2026 IGLD gauge ranges are captured from original sources not synthetic beach predictions',()=>{
 assert.equal(report.schemaVersion,'rockhounding-no-photo-dated-two-gauge-source-v1');
 assert.equal(report.originalMeasuredUTC,'2026-10-16T13:50:43.287Z');
 assert.equal(report.observationsAsOfThisTimeOnly,true);
 assert.equal(report.noaa.datum,'IGLD 1985');
 assert.equal(report.noaa.gauges.length,2);
 assert.equal(report.noaa.gauges[0].station,'9099018');
 assert.equal(report.noaa.gauges[0].last6hObservedRangeM,.113);
 assert.equal(report.noaa.gauges[0].last6hObservedNetChangeM,.05);
 assert.equal(report.noaa.gauges[1].station,'9099004');
 assert.equal(report.noaa.gauges[1].last6hObservedRangeM,.083);
 assert.equal(report.noaa.gauges[1].last6hObservedNetChangeM,-.034);
 assert.equal(report.noaa.gauges[0].original6MinSourceRows,719);
 assert.equal(report.noaa.gauges[1].original6MinSourceRows,719);
 for(const item of report.noaa.gauges){
  assert.match(item.originalSourceSHA256,/^[a-f0-9]{64}$/);
  assert.match(item.sourceURL,/datum=IGLD/);
  assert.match(item.sourceURL,/time_zone=gmt/);
  assert.equal(item.originalQuality,'PRELIMINARY_NOAA_OCT_2026');
  assert.equal(item.sourceTimeUTC,'2026-10-16T13:42:00Z');
 }
 assert.equal(report.independentNwsAlertStateAtResearch,'ACTIVE');
 assert.equal(report.originalGLOSStatusAtResearch,'STALE_BUOY_SOURCE');
 assert.equal(report.canClaimSafeBeach,false);
 assert.equal(report.canClaimCurrentWaterlineGrandMarais,false);
 assert.equal(report.canPredictNewAgates,false);
});
test('real 2-gauge contextual panel is distinct from already existing LIVE GLOS/Marquette readout',()=>{
 assert.match(html,/id="live-offshore-pulse"/);
 assert.match(html,/id="liveRemoteLakeLevel"/);
 assert.match(html,/id="noPhotoWaterLevelRegional"/);
 assert.match(html,/id="noPhotoMarquetteRange"/);
 assert.match(html,/id="noPhotoIroquoisRange"/);
 assert.match(html,/no-photo-regional-lake-stage-oct2026\.json/);
 assert.match(html,/The current Marquette reading above is separate/);
 assert.match(html,/archived October 16, 2026 original-source example/);
 assert.match(html,/The lake can slosh after waves ease/);
 assert.match(html,/sourceNotLiveClientData!==true/);
 assert.match(html,/was stale/);
 assert.match(html,/original NOAA CO-OPS/i);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
test('no original visit recommendation or confidence score appears in independent lake-level UI',()=>{
 assert.match(html,/sourceNotLiveClientData/);
 assert.match(html,/canPredictNewAgates!==false/);
 assert.match(html,/canClaimSafeBeach!==false/);
 assert.doesNotMatch(html,/storm-to-agate prediction is proven/i);
});
