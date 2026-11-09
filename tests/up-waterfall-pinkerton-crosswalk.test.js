import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const source=JSON.parse(fs.readFileSync('data/up-waterfall-pinkerton-official-geography-2026.json','utf8'));
const comparison=JSON.parse(fs.readFileSync('public/assets/up-waterfall-pinkerton-official-comparison.json','utf8'));
const atlas=JSON.parse(fs.readFileSync('public/assets/up-waterfall-evidence-atlas.json','utf8'));
const html=fs.readFileSync('public/upper-peninsula-waterfalls/atlas/index.html','utf8');
const js=fs.readFileSync('public/assets/up-waterfall-evidence-atlas.js','utf8');
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');

test('two separate primary USGS GNIS falls and all DNR approved Pinkerton line segments',()=>{
  assert.equal(source.schemaVersion,1);
  assert.equal(source.sourceCheckedOn,'2026-11-09');
  assert.equal(comparison.schemaVersion,1);
  assert.equal(comparison.sourceCheckedOn,source.sourceCheckedOn);
  assert.equal(source.officialNamedFalls.length,2);
  assert.deepEqual(source.officialNamedFalls.map(x=>x.featureId),[1615029,2126322]);
  assert.deepEqual(source.officialNamedFalls.map(x=>x.featureName),['Traders Falls','Pinkerton Falls']);
  assert.equal(source.dnrPinkertonHikingSegments.length,66);
  assert.equal(new Set(source.dnrPinkertonHikingSegments.map(x=>x.objectId)).size,66);
  assert.equal(source.dnrPinkertonHikingSegments.reduce((n,x)=>n+x.coordinatesLonLat.length,0),440);
  assert.ok(source.dnrPinkertonHikingSegments.every(x=>x.approvalInGIS==='Approved'&&x.nonmotorStatusInGIS==='Open'));
  assert.ok(source.dnrPinkertonHikingSegments.every(x=>x.county==='Gogebic'));
  assert.ok(source.dnrPinkertonHikingSegments.every(x=>x.trailName.includes('Pinkerton Trail')));
  assert.equal(comparison.counts.federalDistinctNamedFalls,2);
  assert.equal(comparison.counts.dnrApprovedHikingTrailSegments,66);
  assert.equal(comparison.counts.dnrTrailGeometryVertices,440);
  assert.equal(comparison.counts.approvedWaterfallViewpointRoutes,0);
  assert.match(source.queryUrls.dnrHikingTrail,/DNRTrailsOPENDATA/);
  assert.match(source.queryUrls.usgsNames,/nationalmap.gov/);
  assert.match(source.originalReferenceUrls.dnrBackcountryMap,/Porkiesavenzadecimaldegrees.pdf/);
  assert.equal(source.parkPDFObservations.dnrBackcountryMapLabelsTradersFalls,true);
  assert.equal(source.parkPDFObservations.dnrTrailDescriptionHasNamedWaterfallSpur,false);
  assert.equal(source.parkPDFObservations.actualWaterfallVisitorRouteCleared,false);
});

test('geodesic source-to-trail results distinguish named features without inferring arrival',()=>{
  const f=Object.fromEntries(comparison.officialNamedFalls.map(x=>[x.featureName,x]));
  assert.equal(f['Traders Falls'].featureId,1615029);
  assert.equal(f['Pinkerton Falls'].featureId,2126322);
  assert.equal(f['Traders Falls'].nearestDNRHikingTrailMeters,69.7);
  assert.equal(f['Pinkerton Falls'].nearestDNRHikingTrailMeters,364);
  assert.equal(comparison.officialFallsStraightLineSeparationMeters,1971);
  assert.equal(comparison.dnrHikingTrail.mappedSumOfSegmentMiles,2.4342);
  assert.equal(comparison.dnrHikingTrail.dnrPrintedTrailMiles,2.6);
  assert.equal(comparison.dnrHikingTrail.dnrPrintedToCreekMiles,1.4);
  assert.equal(comparison.dnrHikingTrail.statusDoesNotOverrideSeasonalRoadClosure,true);
  for(const f of comparison.officialNamedFalls){
    assert.equal(f.semanticRole,'federal-geographic-feature-point-not-trailhead-or-viewpoint');
    assert.ok(f.nearestDNRObjectId);
    assert.ok(Array.isArray(f.coordinateLonLat));
  }
  const tourism=comparison.independentLocationChecks[0];
  assert.match(tourism.sourceLabel,/Western U.P./);
  assert.equal(tourism.distanceFromFederalFeatureMeters,317.7);
  assert.equal(tourism.distanceFromMappedDNRHikingTrailMeters,37.3);
  const divergence=comparison.independentLocationChecks.slice(1);
  assert.deepEqual(divergence.map(x=>x.distanceFromFederalFeatureMeters),[5024,16350.7]);
  assert.ok(comparison.independentLocationChecks.every(x=>x.mustNotCreateMapMarker));
  assert.ok(comparison.independentLocationChecks.every(x=>!('lonLat' in x)));
});

test('no route/parking/connector is produced by the federal names vs trail comparison',()=>{
  const m=comparison.mapRules;
  assert.equal(m.publicWaterfallItineraryApproved,false);
  assert.equal(m.tourismUnnamedFallsLinkedToNamedFeature,false);
  assert.equal(m.drawStraightLineConnectors,false);
  assert.equal(m.drawFootpathToFalls,false);
  assert.equal(m.drawParkingMarkers,false);
  assert.equal(m.drawUnverifiedThirdPartyPoints,false);
  assert.equal(m.arrivalNavigable,false);
  assert.equal(m.federalNaturalFeaturePointsOnly,true);
  assert.equal(m.approvedHikingTrailOnly,true);
  assert.ok(!('parkingPoint' in comparison));
  assert.ok(!('visitorRoute' in comparison));
  assert.ok(!('newDestination' in comparison));
  const record=atlas.records.find(x=>x.id==='tourism:4474');
  assert.ok(record&&record.priorityAccess);
  assert.equal(record.lat,null);
  assert.equal(record.lng,null);
  assert.equal(record.priorityAccess.routeCleared,false);
  assert.equal(record.priorityAccess.newDestinationAuthorized,false);
  assert.equal(record.priorityAccess.featurePoint,null);
  assert.equal(record.priorityAccess.parkingPoint,null);
  assert.equal(record.priorityAccess.routeGeometry,null);
  assert.equal(record.priorityAccess.followupGISCheckedOn,'2026-11-09');
  assert.match(record.priorityAccess.shortVerdict,/two|distinct/i);
  assert.match(record.priorityAccess.falseEquivalence,/CONFIRMED DISTINCT/);
  assert.equal(atlas.records.length,640);
  assert.equal(atlas.counts.curatedGuideRecords,80);
  assert.equal(atlas.counts.nameOnlyWithoutPoint,399);
});

test('stdlib offline GIS build exactly reproduces committed official comparison',()=>{
  const r=spawnSync('python3',['scripts/build-up-waterfall-pinkerton-crosswalk.py','--check'],
    {encoding:'utf8',timeout:20000});
  assert.equal(r.status,0,r.stderr||r.stdout||r.error?.message);
  assert.match(r.stdout,/PASS Pinkerton official GNIS \+ DNR GIS crosswalk/);
});

test('atlas preserves noindex visitor planning boundary with opt-in source-only official comparison',()=>{
  assert.match(html,/Two federal waterfalls, one unresolved unnamed cascade/);
  assert.match(html,/70 m/);
  assert.match(html,/364 m/);
  assert.match(html,/straight-line map offsets/);
  assert.match(html,/name="robots" content="noindex,follow"/);
  assert.match(js,/up-waterfall-pinkerton-official-comparison.json/);
  assert.match(js,/revealOfficialComparison/);
  assert.match(js,/clearOfficialComparison/);
  assert.match(js,/drawFootpathToFalls!==false/);
  assert.match(js,/drawParkingMarkers!==false/);
  assert.match(js,/if\(officialComparisonVisible\)/);
  assert.match(js,/L\.polyline/);
  assert.match(js,/L\.circleMarker/);
  assert.ok(!js.includes('L.Routing'));
  assert.ok(!js.includes('maps.google.com/dir'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/atlas/'));
  assert.ok(!html.includes('data-arrival-parking'));
});
