'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const sites=require('../data/rockhounding/pilot-sites.json').sites;
const {separation,parseNdbcStdmet,exposureComparator,latestObservationWindow,eligibility}=require('../lib/rockhounding/exposure-core.cjs');
const sample='#YY  MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE\n'+
'#yr mo dy hr mn degT m/s m/s m sec sec degT hPa degC degC degC nmi hPa ft\n'+
'2026 10 14 15 00 250 6 8 0.9 5 MM 290 1010 14 15 12 MM MM MM\n'+
'2026 10 14 14 00 280 7 9 1.3 6 MM 300 1010 14 15 12 MM MM MM\n'+
'2026 10 14 13 00 270 6 8 0.5 MM MM MM 1010 14 15 12 MM MM MM\n';
test('all 15 candidates are research only, no guessed navigable entrance',()=>{
  assert.equal(sites.length,15);
  assert.equal(new Set(sites.map(s=>s.id)).size,15);
  assert.equal(sites.filter(s=>s.priority==='pilot').length,9);
  for(const s of sites){
    assert.ok(s.source.url.startsWith('https://'));
    assert.equal(s.publicEntry.coordinates,null);
    assert.equal(s.shoreSegment.outwardBearingDeg,null);
    assert.equal(eligibility(s,{hazardsClear:true}).eligible,false);
  }
});
test('national lakeshore collection prohibitions cannot clear eligibility',()=>{
  for(const id of ['pictured-rocks-sand-point','sleeping-bear-glen-haven']){
    const s=sites.find(s=>s.id===id);
    assert.equal(s.collectionPermission.status,'PROHIBITED');
    assert.ok(eligibility(s,{hazardsClear:true}).reasons.includes('COLLECTING_PROHIBITED'));
  }
});
test('NDBC parser handles UTC, missing readings and MWD rather than wind WDIR',()=>{
  const rows=parseNdbcStdmet(sample);assert.equal(rows.length,3);
  assert.equal(rows[0].waveFromDeg,null);assert.equal(rows[1].waveHeightM,1.3);
  assert.equal(rows[2].waveFromDeg,290);
});
test('exposure comparator distinguishes opposed shorelines and requires geometry',()=>{
  const wave={waveHeightM:2,periodSeconds:6,waveFromDeg:270};
  assert.equal(exposureComparator(wave,null),null);
  assert.ok(exposureComparator(wave,270).relativeIndex>0);
  assert.equal(exposureComparator(wave,90).relativeIndex,0);
  assert.equal(separation(350,10),20);
});
test('stale buoy observations never become current claims',()=>{
  const rows=parseNdbcStdmet(sample);
  assert.equal(latestObservationWindow(rows,'2026-10-14T15:45:00Z').status,'OBSERVED_AT_BUOY_NOT_SHORE');
  assert.equal(latestObservationWindow(rows,'2026-10-14T23:00:00Z').status,'STALE');
  assert.equal(latestObservationWindow(rows,'2026-10-25T15:45:00Z').status,'UNAVAILABLE');
});
test('otherwise eligible location fails closed on unresolved hazard',()=>{
 const site={publicEntry:{status:'EXACT_ENTRY_VERIFIED',walkRouteStatus:'VERIFIED'},collectionPermission:{status:'EXPLICIT_SITE_PERMISSION'},shoreSegment:{outwardBearingDeg:300,geometry:{type:'LineString',coordinates:[]}},stoneEvidence:'LOCATION_MENTIONED'};
 assert.equal(eligibility(site).eligible,false);
 assert.equal(eligibility(site,{hazardsClear:true}).eligible,true);
});
