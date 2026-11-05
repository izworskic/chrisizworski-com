'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const audit = JSON.parse(read('data/up-waterfall-montreal-access-evidence.json'));

test('B68 distinguishes DNR approved planning map from completed trail and waterfall approach',()=>{
  const a = audit.sourceAxes.asBuiltMapAndParking;
  assert.equal(a.reviewDate,'2026-11-05');
  assert.equal(a.verdict,'no-verified-official-asbuilt-parking-to-each-fall-itinerary');
  assert.equal(a.mapSources.length,5);
  const dnr = a.mapSources.find(x=>x.id==='michigan-dnr-2026-07-22');
  assert.equal(dnr.type,'official-dated-planning-map');
  assert.equal(dnr.date,'2026-07-22');
  assert.match(dnr.finding,/RTPD-approved/i);
  assert.equal(dnr.asBuilt,false);
  const operator = a.mapSources.find(x=>x.id==='copper-harbor-map-portal');
  assert.equal(operator.summerMapPdfInspection,'not-retrievable-unverified');
  assert.ok(operator.summerMapPdfUrl.endsWith('.pdf'));
  const thirdParty = a.mapSources.find(x=>x.id==='trailforks-old-montreal');
  assert.match(thirdParty.finding,/restricted/i);
  assert.match(thirdParty.finding,/Smith Fisheries Road/);
  const kpt = a.mapSources.find(x=>x.id==='trailforks-kpt-fish-cove');
  assert.match(kpt.finding,/23.3-mile/);
  assert.match(kpt.finding,/do not include a Montreal Falls spur/);
  for (const item of a.mapSources) {
    assert.equal(item.parkingVerified,false,item.id);
    assert.equal(item.fallsSpurVerified,false,item.id);
  }
  assert.equal(a.publishedLegacyApproach.formalNamedPublicParking,true);
  assert.equal(a.publishedLegacyApproach.exactLotCoordinatesVerified,false);
  assert.equal(a.publishedLegacyApproach.upperFallsExtensionVerified,false);
  assert.equal(a.perFalls.lower.publicGuidePromotion,false);
  assert.equal(a.perFalls.upper.publicGuidePromotion,false);
  assert.equal(a.perFalls.upper.unresolvedIdentityDiscrepancyMetres,267);
  assert.equal(a.noUserVerificationRequired,true);
  assert.equal(a.blockers.length,4);
});
test('B68 preserves noindex/route-source warning and never routes cars to private gate',()=>{
 for(const slug of ['lower-montreal-falls-keweenaw','upper-montreal-falls-keweenaw']){
  const html=read('public/upper-peninsula-waterfalls/research/'+slug+'/index.html');
  assert.match(html,/<meta name="robots" content="noindex,follow">/);
  assert.match(html,/Map and parking investigation/);
  assert.match(html,/RTPD Approved/);
  assert.match(html,/Smiths-Fisheries Road approach/);
  assert.match(html,/restricted by a private gate/);
  assert.match(html,/23\.3-mile Keweenaw Point route/);
  assert.match(html,/www\.copperharbortrails\.org\/maps-guides/);
  assert.match(html,/www\.trailforks\.com\/trails\/montreal-falls-trail/);
  assert.match(html,/www\.visitkeweenaw\.com\/blog\/post\/a-guide-to-visiting-the-keweenaws-montreal-falls/);
  assert.match(html,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
  assert.doesNotMatch(html,/"@type":"TouristAttraction"/);
  assert.doesNotMatch(html,/google\.com\/maps\/dir\//i);
  const desc=(html.match(/<meta name="description" content="([^"]*)">/)||[])[1];
  assert.ok(desc && desc.length<=158,slug+' meta too long');
 }
 assert.deepEqual(audit.gisFeatures.map(x=>x.id),[139,140]);
 assert.equal(audit.routes.length,5);
 for(const route of audit.routes){
  assert.equal(route.currentOpen,false);
  assert.equal(route.preciseParkingGps,null);
  assert.equal(route.renderDirections,false);
 }
 const sitemap=read('public/sitemap-up-waterfalls.xml');
 assert.doesNotMatch(sitemap,/\/research\/(?:lower|upper)-montreal-falls-keweenaw\//);
});