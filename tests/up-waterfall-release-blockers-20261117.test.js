'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const checkpoint=JSON.parse(fs.readFileSync('data/up-waterfall-release-blockers-2026-11-17.json','utf8'));
const tourist=JSON.parse(fs.readFileSync('data/up-waterfall-uptravel-indexed-listings-2026.json','utf8'));
const atlas=JSON.parse(fs.readFileSync('public/assets/up-waterfall-evidence-atlas.json','utf8'));
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const routes=['dead-river-falls','au-train-falls','alger-falls'];

test('source-reviewed priority access decisions never become invented visitor routes',()=>{
  assert.equal(checkpoint.schemaVersion,1);
  assert.equal(checkpoint.reviewedAt,'2026-11-17');
  assert.deepEqual(checkpoint.cases.map(x=>x.id),routes);
  for(const entry of checkpoint.cases){
    assert.equal(entry.decision,'research-only',entry.id);
    assert.equal(entry.routeCleared,false,entry.id);
    assert.equal(entry.newMapPinAuthorized,false,entry.id);
    assert.equal(entry.parkingPoint,null,entry.id);
    assert.equal(entry.routeGeometry,null,entry.id);
    assert.equal(entry.officialClosureClaimed,false,entry.id);
    assert.ok(entry.blockedGates.length>=2,entry.id);
    assert.ok(entry.sourceBasis.length>=2,entry.id);
    assert.ok(entry.sourceBasis.every(x=>x.url.startsWith('https://')&&x.whatItEstablishes.length>45),entry.id);
    assert.ok(!hub.includes('data-id="'+entry.id+'"'),entry.id+' cannot become a recommended hub stop');
    const page=fs.readFileSync(entry.page,'utf8');
    assert.match(page,/name="robots" content="noindex,follow"/,entry.id);
    assert.match(page,/https:\/\/chrisizworski\.com\/#person/,entry.id);
    assert.doesNotMatch(page,/www\.google\.com\/maps\/dir\//,entry.id);
  }
});

test('new township evidence is cited, dated and explicitly not a waterfall access opening',()=>{
  const item=checkpoint.cases.find(x=>x.id==='au-train-falls');
  const minutes=item.sourceBasis.find(x=>x.kind==='local-draft-minutes');
  const survey=item.sourceBasis.find(x=>x.kind==='local-public-notice');
  assert.ok(minutes&&survey);
  const h=fs.readFileSync(item.page,'utf8');
  assert.ok(h.includes(minutes.url));
  assert.ok(h.includes(survey.url));
  assert.match(h,/October 2026 draft board minutes/);
  assert.match(h,/physical work was not likely until 2027/);
  assert.match(h,/Do not treat that bridge update as a public route/);
  assert.match(h,/Both falls remain research-only/);
  assert.match(h,/"dateModified":"2026-11-17"/);
  assert.match(h,/Public waterfall visit not cleared/);
  assert.match(h,/Last document check: November 17, 2026/);
  assert.doesNotMatch(h,/href="https:\/\/www\.google\.com\/maps\/dir\//);
});

test('tourism directory membership remains honest despite overlapping URL index',()=>{
  assert.equal(checkpoint.tourismMembership.reportedDirectoryCount,104);
  assert.equal(checkpoint.tourismMembership.directlyObservedCards,12);
  assert.equal(checkpoint.tourismMembership.unverifiedReportedMembership,92);
  assert.equal(checkpoint.tourismMembership.indexedResearchListings,108);
  assert.equal(tourist.counts.firstPageCardsWithConfirmedDirectoryMembership,12);
  assert.equal(tourist.counts.researchAtlasListingRecords,108);
  assert.equal(atlas.counts.upTravelDirectorySampleRecords,12);
  assert.equal(atlas.counts.upTravelIndexedListingRecords,108);
  assert.equal(atlas.records.filter(x=>x.kind==='tourism'&&x.lat===null&&x.lng===null).length,108);
});
