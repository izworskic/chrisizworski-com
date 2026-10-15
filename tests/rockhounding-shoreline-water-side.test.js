'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const source=require('../data/rockhounding/grand-marais-glahf-water-side-2026-10-15.json');
const pilot=require('../data/rockhounding/grand-marais-wave-pilot.json');
const {validateSnapshot,classifyResearchCell,siteGeometryGate}=
 require('../lib/rockhounding/shoreline-water-side.cjs');

test('14 official GLAHF water-vs-land classifications are explicit research evidence',()=>{
 const pts=validateSnapshot();
 assert.equal(pts.size,14);
 assert.equal(pts.get('agate_north_450m').gisClass,'WATER');
 assert.equal(pts.get('agate_south_350m').gisClass,'LAND');
 assert.equal(pts.get('bayshore_east_750m').gisClass,'WATER');
 assert.equal(pts.get('bayshore_west_500m').gisClass,'LAND');
 assert.match(source.source.derivationVintage,/2013/);
});
test('real fine Great Lakes research cell north of Agate passes ONLY historic water-side screening',()=>{
 const out=classifyResearchCell('agate-500m-open-north');
 assert.equal(out.historicGISWaterClass,'WATER');
 assert.equal(out.researchCellAllowed,true);
 assert.equal(out.status,'HISTORIC_NORTH_WATER_SIDE_RESEARCH_CANDIDATE');
 assert.equal(out.shoreNormalKnown,false);
 assert.equal(out.connectedLakeWaveFetchValidated,false);
 assert.equal(out.canPublishWaveHeight,false);
 assert.equal(out.canClaimNewlyExposedRocks,false);
});
test('GLWU regional nearest cell is invalid when independent water polygon marks it land',()=>{
 const out=classifyResearchCell('agate-2p5km-geographic-nearest');
 assert.equal(out.status,'GIS_LAND_MODEL_MASK_CONFLICT');
 assert.equal(out.historicGISWaterClass,'LAND');
 assert.equal(out.researchCellAllowed,false);
});
test('northern regional cell can be used only as an unsurveyed research candidate',()=>{
 const out=classifyResearchCell('agate-2p5km-open-north');
 assert.equal(out.researchCellAllowed,true);
 assert.equal(out.canPublishWaveHeight,false);
});
test('harbor model cell remains blocked even if independently mapped as water',()=>{
 const out=classifyResearchCell('bayshore-500m-nearby');
 assert.equal(out.historicGISWaterClass,'WATER');
 assert.equal(out.status,'HARBOR_SHELTER_NOT_MODELED');
 assert.equal(out.researchCellAllowed,false);
 assert.equal(out.breakwaterShelterQuantified,false);
});
test('the two locations have separate research sides without invented numerical beach bearings',()=>{
 const agate=siteGeometryGate('grand-marais-agate'),
  harbor=siteGeometryGate('grand-marais-harbor');
 assert.equal(agate.dominantStudyWaterSide,'NORTH_CANDIDATE');
 assert.equal(harbor.dominantStudyWaterSide,'EAST_HARBOR_CANDIDATE');
 for(const site of [agate,harbor]){
  assert.equal(site.exactShorelineOutwardBearingDeg,null);
  assert.equal(site.shelteredHarborWaveAttenuationFactor,null);
  assert.equal(site.canPublishVisitWindow,false);
  assert.equal(site.canUnblockPostStormResearch,false);
  assert.equal(site.safeShoreStatus,'NOT_VERIFIED');
 }
 assert.equal(pilot.pilotSites[0].shore.outwardBearingDeg,null);
 assert.equal(pilot.pilotSites[1].modelCell,null);
});
test('changing a historically land point to water invalidates the claimed source evidence',()=>{
 const corrupt=structuredClone(source);
 corrupt.sampledLocations.find(x=>x.id==='agate_2p5km_south_nearest').gisClass='WATER';
 assert.throws(()=>validateSnapshot(corrupt),/Invalid, duplicated or contradictory/);
});
test('shifting GIS source cell coordinates is caught before any model mapping',()=>{
 const corrupt=structuredClone(source);
 corrupt.sampledLocations.find(x=>x.id==='agate_500m_wave_candidate').coordinate.lon+=0.005;
 assert.throws(()=>validateSnapshot(corrupt),/Model cell shifted/);
});
test('a source with no GLAHF provenance or claimed surveyed normal must fail closed',()=>{
 const fake=structuredClone(source);
 fake.source.url='https://random.test/geometries';
 assert.throws(()=>validateSnapshot(fake),/Untrustworthy/);
 const fake2=structuredClone(source);
 fake2.gates.shorelineBearingSurveyed=true;
 assert.throws(()=>validateSnapshot(fake2),/Untrustworthy/);
});
test('unlisted or unverified rockhounding places do not inherit Grand Marais GIS geometry',()=>{
 assert.equal(classifyResearchCell('imaginary-lake-model').researchCellAllowed,false);
 assert.throws(()=>siteGeometryGate('unknown-location'),/Unknown Grand Marais/);
});
