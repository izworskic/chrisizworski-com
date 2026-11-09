import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read = file => fs.readFileSync(file, 'utf8');
const atlas = JSON.parse(read('public/assets/up-waterfall-evidence-atlas.json'));
const curated = JSON.parse(read('data/up-waterfalls.json')).waterfalls;
const gis = JSON.parse(read('data/up-waterfall-reconciliation.json')).candidates;
const external = JSON.parse(read('data/up-waterfall-external-identity-shorelinescout.json')).observations;
const upTravel = JSON.parse(read('data/up-waterfall-uptravel-location-review-2026.json')).mainDirectoryFirstTwelve;
const indexed = JSON.parse(read('data/up-waterfall-uptravel-indexed-listings-2026.json'));
const investigations = JSON.parse(read('data/up-waterfall-uptravel-unmatched-identity-review-2026.json'));
const priorityResearch = JSON.parse(read('data/up-waterfall-three-priority-access-research-2026.json'));
const html = read('public/upper-peninsula-waterfalls/atlas/index.html');
const js = read('public/assets/up-waterfall-evidence-atlas.js');
const hub = read('public/upper-peninsula-waterfalls/index.html');
const sitemap = read('public/sitemap-up-waterfalls.xml');
const base = '/upper-peninsula-waterfalls/atlas/';

test('source atlas contract includes all four review collections, but never calls them distinct waterfalls', () => {
  assert.equal(atlas.schemaVersion,4);
  assert.equal(atlas.counts.curatedGuideRecords,curated.length);
  assert.equal(atlas.counts.stateGisFeatureRecords,gis.length);
  assert.equal(atlas.counts.independentNameObservations,external.length);
  assert.equal(atlas.counts.upTravelDirectorySampleRecords,upTravel.length);
  assert.equal(atlas.counts.upTravelIndexedListingRecords,indexed.counts.researchAtlasListingRecords);
  assert.equal(atlas.counts.upTravelKeywordIndexRecords,indexed.counts.siteWideTermMatchedUrls);
  assert.equal(atlas.counts.totalSourceRecords,curated.length+gis.length+external.length+indexed.counts.researchAtlasListingRecords);
  assert.equal(atlas.records.length,640);
  assert.equal(atlas.counts.nameOnlyWithoutPoint,399);
  assert.equal(atlas.counts.upTravelUnmatchedIdentityReviews,13);
  assert.equal(atlas.counts.priorityAccessInvestigations,3);
  assert.equal(atlas.counts.priorityAccessClearedVisitorRoutes,0);
  assert.match(atlas.claim,/NOT distinct waterfalls/);
  assert.match(atlas.warning,/NOT parking/);
  assert.ok(!atlas.records.some(r=>/open-now|safe parking today/i.test(r.identityStatus||'')));
});

test('every external observation and UP Travel label remains off the waterfall map', () => {
  const ids=new Set(),groups={};
  for(const row of atlas.records){
    assert.ok(!ids.has(row.id),row.id);ids.add(row.id);
    groups[row.kind]=(groups[row.kind]||0)+1;
    assert.ok(row.sourceUrl?.startsWith('https://'),row.id);
    if(row.kind==='name'||row.kind==='tourism'){
      assert.equal(row.lat,null,row.id);
      assert.equal(row.lng,null,row.id);
      assert.ok(!row.guidePath,row.id);
      assert.ok(row.mapRole.includes('no-geographic')||row.mapRole.includes('not-validated'),row.id);
    }else{
      assert.ok(Number.isFinite(row.lat)&&Number.isFinite(row.lng),row.id);
      assert.ok(row.lat>44&&row.lat<49&&row.lng>-93&&row.lng< -82,row.id);
      assert.match(row.mapRole,/not-arrival|not-parking/,row.id);
    }
  }
  assert.deepEqual(groups,{guide:80,gis:161,name:291,tourism:108});
  assert.equal(atlas.records.filter(x=>x.kind==='gis'&&x.relatedGuideId).length,69);
  assert.ok(atlas.records.some(x=>x.kind==='guide'&&x.relatedGuideId==='tahquamenon'&&x.linkedGisIds.length===2));
});

test('identity ambiguity is retained as research, not autocollapsed into public trips', () => {
  const pauls=atlas.records.find(x=>x.id==='name:ss:pauls-falls');
  assert.ok(pauls);
  assert.equal(pauls.lat,null);
  assert.equal(pauls.county,'Houghton');
  assert.ok(atlas.records.some(x=>x.kind==='tourism'&&x.name==='Alger Falls'&&x.lat===null));
  assert.ok(atlas.records.some(x=>x.kind==='gis'&&x.name==='Chicagon Falls'&&!x.relatedGuideId));
  assert.ok(atlas.records.some(x=>x.kind==='guide'&&x.publication==='verified-closure-guide'));
  assert.ok(atlas.records.some(x=>x.kind==='guide'&&x.publication==='research-only-guide'));
});

test('a Python stdlib source join exactly regenerates the committed snapshot', () => {
  const run=spawnSync('python3',['scripts/build-up-waterfall-evidence-atlas.py','--check'],{encoding:'utf8',timeout:15000});
  assert.equal(run.status,0,run.stderr||run.stdout||run.error?.message);
  assert.match(run.stdout,/PASS Evidence Atlas/);
});

test('new atlas is accessible, purpose-built, noindex and cannot cannibalize visitor guide sitemap',()=>{
  assert.match(html,/name="robots" content="noindex,follow"/);
  assert.match(html,/href="https:\/\/chrisizworski.com\/upper-peninsula-waterfalls\/atlas\/"/);
  assert.match(html,/"@id":"https:\/\/chrisizworski.com\/#person"/);
  assert.ok(!html.includes('"@type":"TouristAttraction"'));
  assert.match(html,/640 source records|All 640 source records/);
  assert.match(html,/id="ea-search"/);
  assert.match(html,/id="ea-county"/);
  assert.match(html,/id="ea-record-list"/);
  assert.match(html,/id="ea-map"/);
  assert.ok(!sitemap.includes(base));
  assert.ok(hub.includes('href="'+base+'"'));
  assert.match(js,/city|county|source|map/i);
  assert.match(js,/not parking|not visitor parking|natural-feature/i);
  assert.ok(!js.includes("google.com/maps/dir"));
  assert.ok(!html.includes('http://tile'));
});

test('UP Travel source index verifies 149 site URLs and keeps 41 unrelated pages out of the visitor atlas',()=>{
  assert.equal(indexed.schemaVersion,1);
  assert.equal(indexed.reviewed,'2026-11-08');
  assert.equal(indexed.records.length,149);
  assert.equal(indexed.counts.siteWideTermMatchedUrls,149);
  assert.equal(indexed.counts.indexWaterfallSearchHits,107);
  assert.equal(indexed.counts.researchAtlasListingRecords,108);
  assert.equal(indexed.counts.atlasWaterfallNamedRecords,91);
  assert.equal(indexed.counts.atlasRelatedPlacesOrActivities,17);
  assert.equal(indexed.counts.excludedBroadIndexHits,41);
  assert.equal(indexed.records.filter(x=>x.inAtlas).length,108);
  assert.equal(indexed.records.filter(x=>!x.inAtlas).length,41);
  assert.equal(indexed.records.filter(x=>x.sourceCategoryMembership==='observed-on-directory-first-page').length,12);
  assert.ok(indexed.records.filter(x=>x.inAtlas).every(x=>x.sourceUrl.startsWith('https://www.uptravel.com/listing/')));
  assert.equal(new Set(indexed.records.map(x=>x.listingId)).size,149);
  assert.equal(new Set(indexed.records.map(x=>x.sourceUrl)).size,149);
  assert.match(indexed.method,/Not a pagination scrape/);
  assert.match(indexed.upstreamReviewScope,/provisional labels/);
  assert.equal(indexed.siteReportedDirectoryTotal,104);
  // The directory filter has 104 entries; the indexed URL pool is a different, incompletely reconciled source.
  assert.notEqual(indexed.counts.researchAtlasListingRecords,indexed.siteReportedDirectoryTotal);
  assert.ok(indexed.records.some(x=>x.slug==='alger-falls-motel'&&!x.inAtlas));
  assert.ok(indexed.records.some(x=>x.slug==='tahquamenon-falls-brewery-&-pub-at-camp-33'&&!x.inAtlas));
  assert.ok(indexed.records.some(x=>x.slug==='black-river-national-scenic-byway'&&x.inAtlas&&x.role==='related-place-or-activity'));
});

test('indexed-name matches remain candidates, never asserted waterfall identities or navigation points',()=>{
  const matches=atlas.records.filter(x=>x.kind==='tourism');
  const indexedRecords=indexed.records.filter(x=>x.inAtlas);
  assert.equal(matches.length,indexedRecords.length);
  const sourceById=new Map(indexedRecords.map(x=>[x.listingId,x]));
  for(const row of matches){
    const src=sourceById.get(row.listingId);
    assert.ok(src,row.id);
    assert.equal(row.id,'tourism:'+row.listingId);
    assert.equal(row.sourceUrl,src.sourceUrl);
    assert.equal(row.lat,null);
    assert.equal(row.lng,null);
    assert.equal(row.county,null);
    assert.equal(row.mapRole,'tourism-index-no-geographic-point-or-arrival');
    assert.equal(row.nameMethod,src.nameMethod);
    assert.equal(row.directoryMembership,src.sourceCategoryMembership);
    assert.equal(row.listingRole,src.role);
    assert.ok(Array.isArray(row.candidateGisIds));
    assert.ok(Array.isArray(row.candidateGuideIds));
    assert.ok(Array.isArray(row.candidateExternalIds));
    assert.ok(Array.isArray(row.candidateCounties));
    assert.ok(!('parkingCoordinates' in row));
    if(src.sourceCategoryMembership!=='observed-on-directory-first-page'){
      assert.equal(row.addressLabel,null);
      assert.equal(row.place,null);
      assert.equal(row.relatedGuideId,null);
      assert.deepEqual(row.relatedGuideIds,[]);
      assert.equal(row.nameMethod,'url-slug-derived-not-page-title');
    }
  }
  const alger=matches.find(x=>x.listingId===73);
  assert.ok(alger);
  assert.equal(alger.name,'Alger Falls');
  assert.ok(alger.candidateGisIds.includes(213));
  assert.equal(alger.addressLabel,'Jct Of State Highway M28 & M94');
  assert.equal(alger.relatedGuideId,null);
  const pauls=matches.find(x=>x.listingId===5417);
  assert.ok(pauls);
  assert.ok(pauls.candidateExternalIds.includes('ss:pauls-falls'));
  assert.equal(pauls.place,null);
  assert.equal(pauls.lat,null);
  const byway=matches.find(x=>x.listingId===5480);
  assert.equal(byway.listingRole,'related-place-or-activity');
  assert.equal(byway.directoryMembership,'observed-on-directory-first-page');
  assert.equal(byway.relatedGuideIds.length,5);
  const site=matches.find(x=>x.listingId===471);
  assert.equal(site.relatedGuideId,'bond-falls');
  assert.equal(site.directoryMembership,'observed-on-directory-first-page');
});

test('source completeness page has a careful search interface and no new indexable destination pages',()=>{
  assert.match(html,/91 waterfall-named listings/);
  assert.match(html,/17 related parks/);
  assert.match(html,/41 unrelated keyword pages excluded/);
  assert.match(html,/108 indexed source pages/);
  assert.match(js,/candidateGisIds/);
  assert.match(js,/nameMethod/);
  assert.match(js,/Inspect '.+state GIS #/);
  assert.match(js,/NOT a separately confirmed natural waterfall/);
  assert.ok(!html.includes('href="https://www.google.com/maps/dir/'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/atlas/'));
});

test('all thirteen formerly unmatched UP Travel waterfall subjects get source-backed identity dispositions',()=>{
  assert.equal(investigations.schemaVersion,1);
  assert.equal(investigations.records.length,13);
  assert.equal(investigations.counts.investigated,13);
  assert.equal(investigations.counts.clearedVisitorArrivals,0);
  assert.equal(investigations.counts.newCuratedDestinations,0);
  const groups=new Map();
  const guides=new Set(curated.map(x=>x.id));
  const gisIds=new Set(gis.map(x=>x.gisObjectId));
  const externalIds=new Set(external.map(x=>x.id));
  for(const caseFile of investigations.records){
    const record=atlas.records.find(x=>x.id==='tourism:'+caseFile.listingId);
    const original=indexed.records.find(x=>x.listingId===caseFile.listingId);
    assert.ok(record&&original,String(caseFile.listingId));
    assert.equal(record.kind,'tourism');
    assert.equal(record.lat,null,record.id);
    assert.equal(record.lng,null,record.id);
    assert.equal(record.county,null,record.id);
    assert.equal(record.sourceUrl,caseFile.sourceUrl);
    assert.equal(record.identityReview.canonicalName,caseFile.canonicalName);
    assert.equal(record.identityReview.disposition,caseFile.disposition);
    assert.equal(record.identityReview.reviewed,'2026-11-08');
    assert.equal(record.identityReview.publicRouteCleared,false);
    assert.equal(record.identityReview.newDestinationAuthorized,false);
    assert.match(record.identityReview.barrier,/.{20}/);
    assert.ok(record.identityReview.sourceUrls.length>0);
    for(const source of record.identityReview.sourceUrls)assert.ok(source.startsWith('https://'),source);
    for(const id of record.identityReview.reviewedGuideIds)assert.ok(guides.has(id),id);
    for(const id of record.identityReview.linkedGisIds)assert.ok(gisIds.has(id),id);
    for(const id of record.identityReview.relatedExternalIds)assert.ok(externalIds.has(id),id);
    groups.set(caseFile.disposition,(groups.get(caseFile.disposition)||0)+1);
  }
  assert.deepEqual(Object.fromEntries(groups),{
    'research-name-alias':4,
    'existing-guide-umbrella':2,
    'existing-guide-alias':1,
    'existing-closure-guide':2,
    'existing-guide-region':1,
    'research-distinct-wilderness':2,
    'unresolved-specific-feature':1,
  });
  assert.equal(atlas.records.filter(x=>x.kind==='tourism'&&x.identityReview!==null).length,13);
  assert.equal(atlas.records.filter(x=>x.kind==='tourism'&&x.identityReview===null).length,95);
});

test('hard identities: wilderness, same-name streams, closures and group cascades do not become new access',()=>{
  const get=id=>atlas.records.find(x=>x.id==='tourism:'+id).identityReview;
  assert.deepEqual(get(1300).reviewedGuideIds,['falls-river-trail']);
  assert.deepEqual(get(1699).reviewedGuideIds,['bonanza-falls']);
  assert.deepEqual(get(1919).reviewedGuideIds,['upper-hungarian-falls','middle-hungarian-falls','lower-hungarian-falls']);
  assert.deepEqual(get(3333).reviewedGuideIds,['manabezho-falls','manido-falls','nawadaha-falls']);
  assert.deepEqual(get(2830).reviewedGuideIds,['munising-falls']);
  assert.deepEqual(get(3524).reviewedGuideIds,['twin-waterfalls-memorial-preserve']);
  assert.equal(get(2830).disposition,'existing-closure-guide');
  assert.equal(get(3524).disposition,'existing-closure-guide');
  assert.deepEqual(get(723).linkedGisIds,[17]);
  assert.ok(!get(723).linkedGisIds.includes(205));
  assert.deepEqual(get(5815).linkedGisIds,[39]);
  assert.ok(!get(799).linkedGisIds.includes(40),'Forty Foot/Cliff must not be conflated with Rocky Forty');
  assert.equal(get(3701).disposition,'research-distinct-wilderness');
  assert.equal(get(5457).disposition,'research-distinct-wilderness');
  assert.equal(get(4474).disposition,'unresolved-specific-feature');
  assert.match(get(409).barrier,/Private-property/);
  assert.match(get(3701).finding,/NOT the separately named Siskiwit Falls near Cornucopia, Wisconsin/);
  assert.match(get(4474).barrier,/KEEP UNRESOLVED/);
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/research/bulldog-falls/'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/research/siskiwit-falls/'));
  assert.match(js,/identityReview\?\.canonicalName/);
  assert.match(js,/reviewedGuideIds/);
  assert.match(js,/linkedGisIds/);
  assert.match(html,/Thirteen previously unmatched names, investigated/);
});

test('Pinkerton, Bulldog, Siskiwit official-source access review is bounded and reproducible', () => {
  assert.equal(priorityResearch.schemaVersion,1);
  assert.equal(priorityResearch.reviewed,'2026-11-08');
  assert.deepEqual(priorityResearch.records.map(x=>x.listingId).sort((a,b)=>a-b),[3701,4474,5457]);
  assert.equal(priorityResearch.counts.prioritiesReviewed,3);
  assert.equal(priorityResearch.counts.confirmedManagedFallsRoutes,0);
  assert.equal(priorityResearch.counts.identityUnresolved,1);
  assert.equal(priorityResearch.counts.annualParkClosureApplies,1);
  assert.equal(atlas.schemaVersion,4);
  assert.equal(atlas.counts.totalSourceRecords,640);
  assert.equal(atlas.counts.nameOnlyWithoutPoint,399);
  assert.equal(atlas.counts.curatedGuideRecords,80);
  assert.equal(atlas.counts.priorityAccessInvestigations,3);
  assert.equal(atlas.counts.priorityAccessClearedVisitorRoutes,0);
  assert.equal(atlas.generatedFrom.priorityAccess,'data/up-waterfall-three-priority-access-research-2026.json');
  assert.equal(atlas.sourceDates.priorityAccess,'2026-11-08');
  const all=atlas.records.filter(x=>x.priorityAccess);
  assert.equal(all.length,3);
  const originals=new Map(investigations.records.map(x=>[x.listingId,x]));
  for(const row of all){
    assert.equal(row.kind,'tourism');
    assert.ok(originals.has(row.listingId));
    assert.equal(row.lat,null);
    assert.equal(row.lng,null);
    assert.equal(row.county,null);
    const a=row.priorityAccess;
    assert.equal(a.listingId,row.listingId);
    assert.equal(a.sourceRecordId,row.id);
    assert.equal(a.reviewed,'2026-11-08');
    assert.equal(a.routeCleared,false);
    assert.equal(a.newDestinationAuthorized,false);
    assert.equal(a.featurePoint,null);
    assert.equal(a.parkingPoint,null);
    assert.equal(a.routeGeometry,null);
    assert.ok(a.officialFacts.length>=3);
    assert.ok(a.references.length>=5);
    assert.ok(a.nextEvidence.length>=2);
    assert.ok(a.establishedStart.length>40);
    assert.ok(a.waterfallViewpoint.length>40);
    const refs=new Map(a.references.map(x=>[x.id,x]));
    assert.equal(refs.size,a.references.length);
    for(const record of a.references)assert.ok(record.url.startsWith('https://'),record.url);
    assert.ok([...refs.values()].some(x=>x.authority==='land-manager'),row.id);
    for(const fact of [...a.officialFacts,...a.independentFacts])assert.ok(refs.has(fact.sourceId),row.id+': '+fact.sourceId);
  }
  assert.equal(atlas.records.filter(x=>x.kind==='tourism'&&!x.priorityAccess).length,105);
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/research/bulldog-falls/'));
});

test('source-specific geographic and seasonal non-equivalence gates survive future rebuilds',()=>{
  const get=id=>atlas.records.find(x=>x.id==='tourism:'+id).priorityAccess;
  const p=get(4474),b=get(5457),s=get(3701);
  assert.equal(p.assessment,'feature-identity-unresolved');
  assert.match(p.establishedStart,/Pinkerton (?:Hiking )?Trail/);
  assert.ok(p.officialFacts.some(x=>/1\.4 miles/.test(x.fact)),'official DNR creek crossing must remain documented regardless of evidence order');
  assert.match(p.falseEquivalence,/Traders(?: Falls|' trail)/);
  assert.ok(!p.references.some(x=>x.url.includes('maps/dir')));
  assert.equal(b.assessment,'remote-feature-confirmed-no-managed-route');
  assert.match(b.falseEquivalence,/Community Forest/);
  assert.match(b.waterfallViewpoint,/No USDA Forest Service/);
  assert.ok(!b.establishedStart.includes('official route to Bulldog'));
  assert.equal(s.assessment,'island-seasonally-closed-waterfall-approach-unverified');
  assert.match(s.shortVerdict,/0\.3-mile/);
  assert.match(s.seasonality,/November 1 through April 15/);
  assert.match(s.falseEquivalence,/NOT the 'distance to Siskiwit Falls'/);
  assert.ok(s.references.some(x=>x.url.includes('Web_Optimized_2026-Greenstone.pdf')));
  for(const a of [p,b,s])assert.equal(a.routeCleared,false);
  assert.match(html,/Three source-backed investigations/);
  assert.match(html,/data-review-listing="4474"/);
  assert.match(html,/data-review-listing="5457"/);
  assert.match(html,/data-review-listing="3701"/);
  assert.match(js,/priorityAccess\.accessVerdict/);
  assert.match(js,/payload\.schemaVersion!==4/);
  assert.match(js,/access\.featurePoint|a\.featurePoint/);
  assert.ok(!html.includes('data-arrival-parking'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/atlas/'));
});
