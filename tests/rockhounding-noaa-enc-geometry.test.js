'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const data=require('../data/rockhounding/grand-marais-noaa-enc-geometry-2026-10-15.json');
const pilot=require('../data/rockhounding/grand-marais-wave-pilot.json');
const {ensureNOAAChartEvidence,researchWaveDirectionOnly,harborGeometryEvidence}=
 require('../lib/rockhounding/noaa-enc-geometry.cjs');

test('real NOAA ENC shore orientation evidence stays historical, source stamped and unapproved for public surf',()=>{
 assert.equal(ensureNOAAChartEvidence(),true);
 assert.equal(data.agate.researchOutwardBearingDeg,336.74);
 assert.deepEqual(data.agate.windowResearchBearingsDeg,[336.73,336.74,335.08]);
 assert.equal(data.agate.independentGISWaterSideConfirmed,true);
 assert.equal(data.agate.currentWaterlineSurveyed,false);
 assert.equal(data.agate.approvedToPopulateReviewedWaterlineBearing,false);
 assert.equal(pilot.pilotSites[0].shore.outwardBearingDeg,null);
});
test('six NOAA shoreline side probes are independent GIS land/water corroboration, not waterline survey',()=>{
 assert.deepEqual(data.agate.waterSideProbes.map(x=>x.class),['WATER','WATER','WATER']);
 assert.deepEqual(data.agate.landSideProbes.map(x=>x.class),['LAND','LAND','LAND']);
 assert.deepEqual(data.agate.independentSideProbeDistancesMeters,[120,200,350]);
 const evidence=structuredClone(data);
 evidence.agate.waterSideProbes[1].class='LAND';
 assert.throws(()=>ensureNOAAChartEvidence(evidence),/WATER corroboration/);
});
test('source chart identity cannot silently change or represent a surveyed 2026 normal',()=>{
 for(const change of [
  e=>{e.source.dataset='UNVERIFIED'},
  e=>{e.source.coastlineObjectId=999},
  e=>{e.agate.approvedToPopulateReviewedWaterlineBearing=true},
  e=>{e.agate.currentWaterlineSurveyed=true},
  e=>{e.agate.researchOutwardBearingDeg=0},
  e=>{e.verification.canPublishPostStormVisitWindow=true}]){
  const item=structuredClone(data);change(item);
  assert.throws(()=>ensureNOAAChartEvidence(item),/missing, moved or prematurely promoted/);
 }
});
test('historical NOAA wave direction comparison is research-only and does not claim agates or surf',()=>{
 const facing=researchWaveDirectionOnly(336.74);
 assert.equal(facing.directionalIncidenceResearchOnly,1);
 assert.equal(facing.relativeAngleDeg,0);
 assert.equal(facing.canPredictStones,false);
 assert.equal(facing.localWaveRefractionValidated,false);
 const opposite=researchWaveDirectionOnly(156.74);
 assert.equal(opposite.directionalIncidenceResearchOnly,0);
 const sideways=researchWaveDirectionOnly(66.74);
 assert.equal(sideways.directionalIncidenceResearchOnly,0);
 assert.equal(sideways.canPublishSiteWaves,false);
});
test('cannot use Agate orientation to claim sheltered-harbor wave conditions',()=>{
 const x=researchWaveDirectionOnly(336.74,{siteId:'grand-marais-harbor'});
 assert.equal(x.status,'HARBOR_WAVE_ATTENUATION_UNMODELED');
 assert.equal(x.canPublishSiteWaves,false);
 const unknown=researchWaveDirectionOnly(9999);
 assert.equal(unknown.status,'MISSING_VALID_NOAA_WAVE_DIRECTION');
 assert.equal(unknown.canClaimSafeWater,undefined);
});
test('NOAA charted piers are structures not a numerical harbor attenuation equation',()=>{
 const x=harborGeometryEvidence();
 assert.equal(x.pierCount,2);
 assert.deepEqual(x.approxNorthSouthStructuralExtentsM,[496,830]);
 assert.equal(x.currentPierCondition,'NOT_SURVEYED');
 assert.equal(x.waveAttenuationFactor,null);
 assert.equal(x.computedEntranceShelter,false);
 assert.equal(x.canClaimCalmWater,false);
});
test('pier contour changes, structure classes and nonexistent source year cannot silently gain authority',()=>{
 const e=structuredClone(data);e.bayshore.piers[0].northSouthSpanMeters=0;
 assert.throws(()=>ensureNOAAChartEvidence(e),/charted pier lines/);
 const f=structuredClone(data);f.bayshore.piers[1].chartedCategory='breakwater';
 assert.throws(()=>ensureNOAAChartEvidence(f),/charted pier lines/);
});
