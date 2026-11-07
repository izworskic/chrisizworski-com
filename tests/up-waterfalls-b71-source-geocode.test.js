'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const evidence=JSON.parse(read('data/up-waterfall-montreal-access-evidence.json'));
const b71=evidence.b71VisitorRouteAndCoordinateAudit;
const toRad=d=>d*Math.PI/180;
function distance(a,b){
  const phi1=toRad(a.lat),phi2=toRad(b.lat),dPhi=phi2-phi1,dLam=toRad(b.lon-a.lon);
  const h=Math.sin(dPhi/2)**2+Math.cos(phi1)*Math.cos(phi2)*Math.sin(dLam/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(h));
}
test('B71 resolves generic 2023 Montreal brochure marker separately from real falls and legal parking',()=>{
  assert.equal(b71.reviewDate,'2026-11-05');
  const markers=b71.sourceMarkers;
  const bm=markers.brochureGeneral,lower=markers.lowerDnrGis,upper=markers.upperDnrGis;
  assert.equal(bm.role,'generic-2023-Montreal-Falls-brochure-marker-not-certified-parking-or-natural-feature');
  assert.equal(bm.drivingDirectionsAllowed,false);
  assert.equal(markers.legalFishCoveParkingPoint,null);
  assert.ok(Math.abs(distance(bm,lower)-861)<2);
  assert.ok(Math.abs(distance(bm,upper)-998)<2);
  assert.ok(Math.abs(distance(lower,upper)-705)<2);
  assert.equal(markers.separationMetres.brochureToLower,861);
  assert.equal(markers.separationMetres.brochureToUpper,998);
  assert.equal(evidence.b69SeasonalPublicArrival.historicalNamedLot.exactPublicParkingGps,null);
});
test('B71 corrects documented historical Upper access while retaining present-day source gate',()=>{
  const upper=evidence.sourceAxes.asBuiltMapAndParking.perFalls.upper;
  assert.equal(upper.oldFishCoveSeasonalPublicApproachDocumented,true);
  assert.match(upper.oldFishCoveRouteSource,/KCVB_summer_waterfalls_brochure_20230517/);
  assert.equal(b71.officialTourismBrochure.historicallyDescribesUpperAsHalfMileUpstreamBeyondLower,true);
  assert.equal(b71.officialTourismBrochure.upperExtensionMiles,0.5);
  assert.equal(b71.upperIdentity.existingAsBuiltFallsSpurVerified,false);
  assert.equal(b71.upperIdentity.independentlyReconciled,false);
  assert.equal(b71.upperIdentity.brochureHistoricalUpperFootRouteIsCurrentAuthoritativeRight,false);
  assert.equal(evidence.b70RoadJurisdictionProof.noUpperFallsRouteInference,true);
  assert.equal(evidence.gisFeatures.find(x=>x.id===139).decision,'research-only-noindex');
  assert.equal(evidence.gisFeatures.find(x=>x.id===140).decision,'research-only-noindex');
});
test('B71 weights 2026 firsthand summer experience as observations, never legal or current access rights',()=>{
  assert.equal(b71.summerFirsthand.lowerReached,true);
  assert.equal(b71.summerFirsthand.upperReached,false);
  assert.equal(b71.summerFirsthand.streetLegalVehicleRightVerified,false);
  assert.equal(b71.summerFirsthand.novemberGateStatusVerified,false);
  assert.equal(b71.summerFirsthand.landownerPermissionVerified,false);
  assert.equal(b71.atvNetworkContext.publicPassengerVehicleUseAuthorisedFromMap,false);
  assert.equal(b71.officialTourismBrochure.permissionsCurrentIn2026,false);
  assert.match(b71.outreachStatus,/drafted-not-sent/);
  for(const value of Object.values(b71.safetyGates))assert.equal(value,false);
});
test('B71 user-facing pages preserve noindex and do not generate a parking route or unsafe river crossing',()=>{
  for(const slug of ['lower-montreal-falls-keweenaw','upper-montreal-falls-keweenaw']){
    const html=read('public/upper-peninsula-waterfalls/research/'+slug+'/index.html');
    assert.match(html,/<meta name="robots" content="noindex,follow">/);
    assert.match(html,/2023/);
    assert.match(html,/2026/);
    assert.match(html,/47\.3899, -87\.8305/);
    assert.match(html,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
    assert.doesNotMatch(html,/TouristAttraction/);
    assert.doesNotMatch(html,/maps\/dir\//);
    assert.doesNotMatch(html,/<iframe/);
  }
  const lower=read('public/upper-peninsula-waterfalls/research/lower-montreal-falls-keweenaw/index.html');
  const upper=read('public/upper-peninsula-waterfalls/research/upper-montreal-falls-keweenaw/index.html');
  assert.match(lower,/861 metres/);
  assert.match(upper,/998 metres/);
  assert.match(upper,/another half-mile to Upper Falls/);
  assert.match(lower,/bicycling/);
  assert.match(upper,/river or the private Smiths-Fisheries Road/);
});
