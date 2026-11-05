'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const evidence=JSON.parse(read('data/up-waterfall-montreal-access-evidence.json'));
const b70=evidence.b70RoadJurisdictionProof;
test('B70 route has no current all-segment authority and no driving coordinates',()=>{
  assert.equal(b70.reviewedDate,'2026-11-05');
  assert.equal(b70.disposition,'not-yet-proven-by-current-route-specific-authority');
  assert.equal(b70.roadLegs.length,5);
  assert.equal(b70.roadLegs.some(leg=>leg.currentLegalToNextSegmentVerified),false);
  for(const value of ['noConventionalVehicleAccessClaim','noPublicParkingGps','noAutomatedDrivingDirections','noLiveRoadOpenClaim','noUpperFallsRouteInference']){
    assert.equal(b70[value],true, 'Safety gate '+value);
  }
  assert.equal(b70.authoritativeReplyReceived,false);
  assert.equal(b70.outreach.state,'drafted-not-sent');
  assert.ok(b70.definitiveMissingProof.length>=3);
});
test('B70 uses Michigan authoritative layers and never treats 2027 proposals as active in November 2026',()=>{
  assert.equal(b70.currentEffectiveMapYear,2026);
  assert.equal(b70.proposalEffectiveYear,2027);
  assert.equal(b70.proposalEffectiveDate,'2027-04-01');
  assert.equal(b70.proposalAlreadyInForce,false);
  const src=Object.fromEntries(b70.authoritativeEvidence.map(x=>[x.id,x]));
  for(const id of ['dnr-point-existing-conditions-2024','dnr-forest-roads-2026','dnr-forest-faq','dnr-compartment-2025','dnr-2026-proposal-status','county-road-jurisdiction-contact']){
    assert.ok(src[id],'Missing '+id);
    assert.equal(src[id].routeLevelCurrentAccessProof,false);
  }
  assert.ok(src['dnr-2026-proposal-status'].url.endsWith('/2026/10/30/annual-review'));
  assert.equal(src['dnr-forest-roads-2026'].date,'2026-04-01');
  assert.match(src['dnr-compartment-2025'].finding,/parts of Mandan Road/);
  assert.match(src['dnr-point-existing-conditions-2024'].finding,/State Forest Road/);
  assert.match(src['korc-mandan-general-gates'].finding,/Does not identify/);
  assert.equal(evidence.gisFeatures.find(x=>x.id===139).decision,'research-only-noindex');
  assert.equal(evidence.gisFeatures.find(x=>x.id===140).decision,'research-only-noindex');
});
test('B70 Lower Montreal research describes jurisdiction limits without route promotion or changing protected SEO',()=>{
  const lower=read('public/upper-peninsula-waterfalls/research/lower-montreal-falls-keweenaw/index.html');
  const upper=read('public/upper-peninsula-waterfalls/research/upper-montreal-falls-keweenaw/index.html');
  assert.match(lower,/<meta name="robots" content="noindex,follow">/);
  assert.match(upper,/<meta name="robots" content="noindex,follow">/);
  assert.match(lower,/state-forest roads, county roads, private roads and ORV routes/);
  assert.match(lower,/2027 is not 2026/);
  assert.match(lower,/April 1, 2026 Keweenaw forest-road map/);
  assert.match(lower,/Mandan Road/);
  assert.match(lower,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
  assert.doesNotMatch(lower,/TouristAttraction/);
  assert.doesNotMatch(lower,/https:\/\/www\.google\.com\/maps\?daddr/i);
  assert.doesNotMatch(lower,/maps\/dir\//);
  assert.doesNotMatch(lower,/<iframe/i);
  assert.match(upper,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
});
