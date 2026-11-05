'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const load = rel => fs.readFileSync(path.join(root,rel),'utf8');
const evidence = JSON.parse(load('data/up-waterfall-montreal-access-evidence.json'));
const b69 = evidence.b69SeasonalPublicArrival;

test('B69 distinguishes constructed historic Fish Cove parking from current vehicle permission', ()=>{
  assert.equal(b69.reviewDate,'2026-11-05');
  assert.equal(b69.candidate,'Lower Montreal Falls #139');
  assert.equal(b69.historicalNamedLot.lotConstructedHistorical,true);
  assert.equal(b69.historicalNamedLot.exactPublicParkingGps,null);
  assert.equal(b69.historicalNamedLot.lotOpenNowVerified,false);
  assert.equal(b69.dnrCompartment.namesFishCove,true);
  assert.equal(b69.dnrCompartment.exactLotSurvey,false);
  assert.equal(b69.dnrCompartment.fullDrivingEasementProved,false);
  assert.equal(b69.dnrCompartment.currentPassabilityProved,false);
  assert.equal(b69.publicGuidePromotion,false);
  assert.ok(b69.historicalNamedLot.originalReport.source.startsWith('https://www.visitkeweenaw.com/'));
  assert.ok(b69.dnrCompartment.source.includes('bar082_comp_info.pdf'));
});

test('B69 keeps the ORV season restriction distinct from passenger cars and local overnight parking', ()=>{
  assert.equal(b69.hoarLakeBKOrvSeason.closureStarts,'11-01');
  assert.equal(b69.hoarLakeBKOrvSeason.usualSeasonResumes,'05-01');
  assert.equal(b69.hoarLakeBKOrvSeason.statusOn20261105,'seasonally-closed-to-ORVs');
  assert.equal(b69.hoarLakeBKOrvSeason.conventionalVehicleAccessVerified,false);
  assert.match(b69.hoarLakeBKOrvSeason.dataQuality,/April 31/);
  assert.equal(b69.roadCommissionWinterParking.validFrom,'11-01');
  assert.equal(b69.roadCommissionWinterParking.validUntil,'04-15');
  assert.equal(b69.roadCommissionWinterParking.fromLocal,'02:00');
  assert.equal(b69.roadCommissionWinterParking.untilLocal,'08:00');
  assert.match(b69.roadCommissionWinterParking.applies,/roadways AND shoulders/);
  assert.equal(b69.roadCommissionWinterParking.roadsideParkingDuringProhibitedHours,false);
  assert.equal(b69.independentApproaches.some(x=>x.automatedCarNavigationAllowed),false);
});

test('B69 keeps both source-review pages noindex without unsafe directions or unwarranted visitor counts',()=>{
  for(const slug of ['lower-montreal-falls-keweenaw','upper-montreal-falls-keweenaw']){
    const html=load('public/upper-peninsula-waterfalls/research/'+slug+'/index.html');
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.match(html,/Fish Cove/);
    assert.match(html,/Keweenaw ATV Club/);
    assert.match(html,/November 1/);
    assert.match(html,/2 a\.m\./);
    assert.match(html,/8 a\.m\./);
    assert.match(html,/Mandan Road/);
    assert.match(html,/Keweenaw County Road Commission|county road commission/);
    assert.doesNotMatch(html,/TouristAttraction/);
    assert.doesNotMatch(html,/maps\/dir\//);
    assert.match(html,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
    const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
    assert.ok(desc.length<=165);
  }
});
