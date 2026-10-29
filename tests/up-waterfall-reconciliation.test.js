import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ledger = JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json', 'utf8'));
const curated = JSON.parse(fs.readFileSync('data/up-waterfalls.json', 'utf8'));
const sitemap = fs.readFileSync('public/sitemap-up-waterfalls.xml', 'utf8');

test('each source GIS identity appears exactly once in research ledger', () => {
  assert.equal(ledger.candidates.length, 161);
  const ids = ledger.candidates.map(x => x.gisObjectId);
  assert.equal(new Set(ids).size, ids.length);
  for (const row of ledger.candidates) {
    assert.ok(Number.isInteger(row.gisObjectId));
    assert.ok(row.name && row.source && row.county);
    assert.ok(Number.isFinite(row.lat) && Number.isFinite(row.lng));
    assert.ok(row.lat > 41 && row.lat < 49 && row.lng < -82 && row.lng > -92);
  }
});

test('exact GIS reconciliation cannot silently create or alter public guides', () => {
  const curatedById = new Map();
  for (const guide of curated.waterfalls) {
    if (Number.isInteger(guide.gisObjectId)) curatedById.set(guide.gisObjectId, {guide, multi:false});
    for (const oid of guide.multiFeatureGisObjectIds||[]) {
      assert.ok(!curatedById.has(oid), 'duplicate GIS ownership '+oid);
      curatedById.set(oid,{guide,multi:true});
    }
  }
  for (const row of ledger.candidates) {
    const claim = curatedById.get(row.gisObjectId);
    if (claim) {
      assert.equal(row.curatedId, claim.guide.id);
      assert.equal(row.reconciliation, claim.multi ? 'curated-multifeature-parent-tool' : 'curated-exact-gis-id');
      if (claim.multi) {
        assert.equal(row.featureCoverage.parentCuratedId, claim.guide.id);
        assert.ok(claim.guide.gisFeatureCrosswalk.some(v=>v.gisObjectId===row.gisObjectId));
      }
    } else {
      assert.equal(row.curatedId, null);
      assert.equal(row.reconciliation, 'pending-identity-and-access-research');
      const proposedSlug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/' + proposedSlug + '/'),
        'unreviewed GIS feature may not auto-enter public waterfall sitemap: ' + row.name);
    }
  }
});

test('all four Menominee park guide identities have named visitor routes separate from falls GIS points', () => {
  for (const [oid,id] of [[3,'sand-portage-falls'],[189,'quiver-falls'],[188,'pemene-falls'],[2,'misicot-falls']]) {
    const row=ledger.candidates.find(x=>x.gisObjectId===oid);
    assert.ok(row);
    assert.equal(row.publicationEligible,true,id);
    assert.equal(row.curatedId,id);
    assert.equal(row.reconciliation,'curated-exact-gis-id');
    assert.equal(row.visitorRouteEvidence.currentRoadStatus,'unverified');
    assert.equal(row.visitorRouteEvidence.navigationToGisPointAllowed,false);
  }
});

test('Cascade Falls guide is public only with signed FR 468 parking and separate waterfall point', () => {
  const f = curated.waterfalls.find(x => x.id === 'cascade-falls');
  const row = ledger.candidates.find(x => x.gisObjectId === 67);
  assert.ok(f);
  assert.equal(f.publication, 'verified-access-guide');
  assert.equal(f.gisObjectId, 67);
  assert.equal(row.curatedId, f.id);
  assert.equal(row.reconciliation, 'curated-exact-gis-id');
  assert.equal(row.publicationEligible, true);
  assert.deepEqual([f.lat, f.lng], [row.lat, row.lng]);
  for (const axis of ['landManager', 'publicAccess', 'parking', 'trail', 'location']) {
    assert.equal(f.verification[axis].verified, true, axis);
    assert.ok(f.verification[axis].source.startsWith('https://'));
  }
  const detail = fs.readFileSync('public/upper-peninsula-waterfalls/cascade-falls/index.html', 'utf8');
  const hub = fs.readFileSync('public/upper-peninsula-waterfalls/index.html', 'utf8');
  const card = hub.match(/<article class="waterfall-card"[^>]*data-id="cascade-falls"[\s\S]*?<\/article>/);
  assert.ok(card);
  assert.match(card[0], /data-gis-oid="67"/);
  assert.match(card[0], /class="arrival-details"/);
  assert.match(card[0], /data-arrival-verified="verified"/);
  assert.match(card[0], /Check parking source/);
  assert.match(detail, /<meta name="robots" content="index,follow/);
  assert.ok(detail.includes('https://chrisizworski.com/#person'));
  assert.ok(detail.includes('Forest Road 468') && detail.includes('Forest Road 400'));
  assert.match(detail, /connector.*not yet|connector.*not.*official|connector.*not.*complete|proposed connector/i);
  assert.match(detail, /not winter-plowed|not plowed|unplowed/i);
  assert.match(detail, /current opening and road conditions are unverified/i);
  for (const axis of ['landManager', 'publicAccess', 'parking', 'trail', 'location']) {
    assert.ok(detail.includes(f.verification[axis].source), axis + ' must be cited in guide');
  }
  assert.ok(sitemap.includes('<loc>https://chrisizworski.com/upper-peninsula-waterfalls/cascade-falls/</loc>'));
  assert.ok(!card[0].includes('data-parking-lat='), 'no invented parking coordinate');
  assert.ok(!detail.includes('maps/dir/?api=1&destination=46.651708'), 'do not route vehicles to falls');
});

test('canonical source ledger and geographic reconciliation agree as waterfall coverage grows', () => {
  const canonical = JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json', 'utf8'));
  assert.equal(canonical.sourceCandidateCount, 161);
  assert.equal(canonical.curatedCount, curated.waterfalls.length);
  assert.equal(canonical.curatedCount, ledger.counts.curatedTotal);
  assert.equal(canonical.linkedByExactOid, ledger.counts.exactIdMatched);
  assert.equal(canonical.unresolvedCandidates, ledger.counts.pending);
  const canonicalGIS = new Map(canonical.entries.filter(x => x.source === 'mi-state-gis').map(x => [x.sourceId, x]));
  assert.equal(canonicalGIS.size, 161);
  for (const row of ledger.candidates) {
    const prior = canonicalGIS.get(row.gisObjectId);
    assert.ok(prior, 'canonical ledger missing GIS ID ' + row.gisObjectId);
    assert.equal(prior.curatedId, row.curatedId, 'mismatched curated link for GIS ID ' + row.gisObjectId);
    assert.equal(prior.identity === 'linked', ['curated-exact-gis-id','curated-multifeature-parent-tool'].includes(row.reconciliation));
  }
});


test('Bonanza public guide is scoped strictly to signed township upper-falls access', () => {
  const f = curated.waterfalls.find(x => x.id === 'bonanza-falls');
  const record = ledger.candidates.find(x => x.gisObjectId === 124);
  const original = JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json', 'utf8'))
    .entries.find(x => x.source === 'mi-state-gis' && x.sourceId === 124);
  const review = JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'))
    .records.find(x => x.gisObjectId === 124);
  const page = fs.readFileSync('public/upper-peninsula-waterfalls/bonanza-falls/index.html','utf8');
  const hub = fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
  assert.ok(f);
  assert.equal(f.gisObjectId, 124);
  assert.equal(f.publication, 'verified-access-guide');
  assert.equal(record.reconciliation, 'curated-exact-gis-id');
  assert.equal(record.curatedId, f.id);
  assert.equal(record.publicationEligible, true);
  assert.equal(original.identity, 'linked');
  assert.equal(original.publication, 'verified-access-guide');
  assert.equal(original.curatedId, f.id);
  assert.equal(review.publicationScope, 'township-park-signed-upper-falls-only');
  assert.equal(record.verificationScope, 'township-signed-park-and-upper-falls-public-view-only');
  assert.equal(record.downstreamWalkVerified, false);
  assert.equal(record.parcelReview.fullWalkToNaturalGisPointEstablished, false);
  assert.equal(record.parcelReview.titleOrEasementEstablished, false);
  assert.deepEqual([f.lat, f.lng], [46.818863, -89.571458]);
  for (const key of ['landManager','publicAccess','parking','trail','location']) {
    assert.equal(f.verification[key].verified, true, key);
    assert.ok(page.replaceAll('&amp;', '&').includes(f.verification[key].source), key + ' evidence missing');
  }
  assert.ok(page.includes('https://www.carplaketwp.org/general-resources'));
  assert.ok(page.includes('Township-listed Google Maps destination'));
  assert.ok(page.includes('data-visit-lat="46.8176942"'));
  assert.ok(page.includes('data-view-lat="46.817719"'));
  assert.ok(page.includes('data-lat="46.818863"'));
  assert.ok(!page.includes('data-parking-lat='));
  assert.match(page, /downstream drops/);
  assert.match(page, /different ownership records/);
  assert.match(page, /current opening and road conditions are unverified/i);
  assert.ok(page.includes('https://chrisizworski.com/#person'));
  assert.ok(page.includes('href="/upper-peninsula-waterfalls/"'));
  assert.match(page, /<meta name="robots" content="index,follow/);
  assert.ok(sitemap.includes('/upper-peninsula-waterfalls/bonanza-falls/'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/greenwood-falls/'));
  const card = hub.match(/<article class="waterfall-card"[^>]*data-id="bonanza-falls"[\s\S]*?<\/article>/);
  assert.ok(card);
  assert.match(card[0], /data-arrival-verified="verified"/);
  assert.match(card[0], /data-gis-oid="124"/);
  assert.ok(card[0].includes('Check parking source') && card[0].includes('Check trail source'));
  assert.ok(!card[0].includes('data-parking-lat='));
});

test('Bonanza three-map references and seasonality never impersonate parking or current opening', () => {
  const r = ledger.candidates.find(x => x.gisObjectId === 124);
  const review = JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'))
    .records.find(x => x.gisObjectId === 124);
  const mapScript = fs.readFileSync('public/assets/up-fall-detail.js','utf8');
  const page = fs.readFileSync('public/upper-peninsula-waterfalls/bonanza-falls/index.html','utf8');
  const map = r.parcelReview.townshipVisitorEvidence.officialParkDirectionsDestination;
  assert.deepEqual([map.lat, map.lng], [46.8176942,-89.5674561]);
  assert.equal(map.parkingLotPrecisionConfirmed, false);
  assert.equal(r.parcelReview.townshipVisitorEvidence.currentOpenStatus, 'not-verified');
  assert.equal(r.currentOpenStatus, 'unverified');
  assert.equal(r.parcelReview.publicAccessEstablished, true);
  assert.equal(r.parcelReview.fullWalkToNaturalGisPointEstablished, false);
  assert.equal(review.publicationEligible, true);
  assert.equal(review.parkVisitorMapDestination.parkingLocation, false);
  assert.equal(review.regionalUpperFallsReference.surveyedViewpoint, false);
  assert.match(page, /not a surveyed parking-lot waypoint|not an exact parking coordinate/i);
  assert.match(page, /do not draw|does not draw/i);
  assert.match(page, /late October|winter|December/i);
  assert.match(mapScript, /dataSet|dataset\.visitLat|dataset\.viewLat/);
  assert.match(mapScript, /not a surveyed parking-lot coordinate/);
  assert.match(mapScript, /not a GPS trail marker/);
  assert.ok(page.includes('https://www.google.com/maps/dir/?api=1&destination=46.8176942%2C-89.5674561'));
  assert.ok(!page.includes('destination=46.818863'));
});

test('official Menominee River Sand Portage and Quiver guides preserve Wisconsin parking and the geographic point distinction', () => {
  const canonical = JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
  const hub = fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
  for (const [id,oid,road] of [['sand-portage-falls',3,/US-141|US Highway 141/],['quiver-falls',189,/Pemene Dam Road/]]) {
    const f=curated.waterfalls.find(x=>x.id===id);
    const row=ledger.candidates.find(x=>x.gisObjectId===oid);
    const original=canonical.entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===oid);
    const html=fs.readFileSync('public/upper-peninsula-waterfalls/'+id+'/index.html','utf8');
    assert.ok(f&&row&&original,id+' source missing');
    assert.equal(f.publication,'verified-access-guide');
    assert.equal(f.gisObjectId,oid);
    assert.deepEqual([f.lat,f.lng],[row.lat,row.lng]);
    assert.equal(row.reconciliation,'curated-exact-gis-id');
    assert.equal(row.curatedId,id);
    assert.equal(original.identity,'linked');
    assert.equal(original.curatedId,id);
    assert.equal(row.publicationEligible,true);
    assert.equal(row.publicAccessVerified,true);
    assert.equal(row.parkingVerified,true);
    assert.equal(row.visitorRouteEvidence.navigationToGisPointAllowed,false);
    assert.equal(row.visitorRouteEvidence.currentRoadStatus,'unverified');
    assert.match(f.parking,road);
    assert.match(html,road);
    assert.match(html,/<meta name="robots" content="index,follow/);
    assert.match(html,/waterfall.*not parking|not.*parking.*waterfall|coordinate.*not.*parking/i);
    assert.match(html,/unplowed|not plowed|not.*plowed/i);
    assert.ok(html.includes('https://chrisizworski.com/#person'));
    assert.ok(html.includes('/assets/vendor/leaflet-1.9.4.css'));
    assert.ok(html.includes('/assets/leaflet-1.9.4.js'));
    assert.ok(!html.includes('data-parking-lat='),'cannot invent precise parking lat');
    assert.ok(html.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>500,'thin guide '+id);
    for(const key of ['landManager','publicAccess','parking','trail','location']){
      assert.equal(f.verification[key].verified,true,id+' missing '+key);
      assert.ok(html.replaceAll('&amp;','&').includes(f.verification[key].source),id+' missing source '+key);
    }
    const card=hub.match(new RegExp('<article class="waterfall-card"[^>]*data-id="'+id+'"[\\s\\S]*?<\\/article>'));
    assert.ok(card,'missing hub card '+id);
    assert.match(card[0],/data-arrival-verified="verified"/);
    assert.match(card[0],/class="arrival-details"/);
    assert.ok(card[0].includes('Check parking source')&&card[0].includes('Check trail source'));
    assert.ok(sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
  }
  const sand=fs.readFileSync('public/upper-peninsula-waterfalls/sand-portage-falls/index.html','utf8');
  const quiver=fs.readFileSync('public/upper-peninsula-waterfalls/quiver-falls/index.html','utf8');
  assert.match(sand,/no designated developed overlook|no designated.*overlook|no constructed falls viewing deck/i);
  assert.match(sand,/Michigan.*Piers Gorge Road/i);
  assert.match(quiver,/accessible.*parking|parking.*accessible/i);
  assert.match(quiver,/does not publish.*distance|does not supply.*distance/i);
  assert.ok(sitemap.includes('/upper-peninsula-waterfalls/pemene-falls/'));
  assert.ok(sitemap.includes('/upper-peninsula-waterfalls/misicot-falls/'));
});

test('Pemene Wisconsin trail and Misicot Michigan Third Pier access remain source separated', () => {
  const canonical = JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
  const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
  for (const [id,oid,road] of [['pemene-falls',188,/Verheyen Lane/],['misicot-falls',2,/Piers Gorge Road/]]) {
    const f=curated.waterfalls.find(x=>x.id===id);
    const row=ledger.candidates.find(x=>x.gisObjectId===oid);
    const old=canonical.entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===oid);
    const html=fs.readFileSync('public/upper-peninsula-waterfalls/'+id+'/index.html','utf8');
    assert.ok(f&&row&&old,id);
    assert.equal(f.publication,'verified-access-guide');
    assert.equal(f.gisObjectId,oid);
    assert.deepEqual([f.lat,f.lng],[row.lat,row.lng]);
    assert.equal(row.curatedId,id);
    assert.equal(old.curatedId,id);
    assert.equal(old.identity,'linked');
    assert.equal(row.publicationEligible,true);
    assert.equal(row.parkingVerified,true);
    assert.equal(row.publicAccessVerified,true);
    assert.equal(row.visitorRouteEvidence.navigationToGisPointAllowed,false);
    assert.match(f.parking,road);
    assert.match(html,road);
    assert.match(html,/current opening and road conditions are unverified/i);
    assert.match(html,/<meta name="robots" content="index,follow/);
    assert.ok(html.includes('https://chrisizworski.com/#person'));
    assert.ok(!html.includes('data-parking-lat='),'no invented lot coordinate for '+id);
    assert.ok(html.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>500,'thin guide '+id);
    for(const axis of ['landManager','publicAccess','parking','trail','location']){
      assert.equal(f.verification[axis].verified,true,id+' '+axis);
      assert.ok(html.replaceAll('&amp;','&').includes(f.verification[axis].source),id+' missing cited '+axis);
    }
    const card=hub.match(new RegExp('<article class="waterfall-card"[^>]*data-id="'+id+'"[^>]*>[\\s\\S]*?<\\/article>'));
    assert.ok(card,id+' missing hub card');
    assert.match(card[0],/data-arrival-verified="verified"/);
    assert.ok(card[0].includes('Check parking source')&&card[0].includes('Check trail source'));
    assert.ok(sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
  }
  const pemene=fs.readFileSync('public/upper-peninsula-waterfalls/pemene-falls/index.html','utf8');
  const misicot=fs.readFileSync('public/upper-peninsula-waterfalls/misicot-falls/index.html','utf8');
  assert.match(pemene,/primitive overlook/);
  assert.match(pemene,/Pemene Landing/);
  assert.match(pemene,/0\.8.mile/);
  assert.match(pemene,/1\.9.mile/);
  assert.ok(pemene.includes('data-visit-lat="45.5884"'));
  assert.match(misicot,/Third Pier/);
  assert.match(misicot,/Michigan.*Piers Gorge Road|Piers Gorge Road.*Michigan/);
  assert.match(misicot,/1\.5.mile/);
  assert.match(misicot,/exact.*distance|distance.*not.*established|precise.*walk/i);
  assert.ok(!pemene.includes('destination=45.594123'));
  assert.ok(!misicot.includes('destination=45.757574'));
});

test('Duppy and Mex-i-min-e guides rely on current USDA visitor sources without fabricating vehicle parking', () => {
  const canonical=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
  const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
  for(const [id,oid,road] of [['duppy-falls',26,/FR.?3610|Forest Road 3610/],['mex-i-min-e-falls',19,/FR.?4500|Forest Road 4500/]]){
    const guide=curated.waterfalls.find(x=>x.id===id);
    const gis=ledger.candidates.find(x=>x.gisObjectId===oid);
    const legacy=canonical.entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===oid);
    const html=fs.readFileSync('public/upper-peninsula-waterfalls/'+id+'/index.html','utf8');
    assert.ok(guide&&gis&&legacy,id);
    assert.equal(guide.publication,'verified-access-guide');
    assert.equal(guide.gisObjectId,oid);
    assert.deepEqual([guide.lat,guide.lng],[gis.lat,gis.lng]);
    assert.equal(gis.reconciliation,'curated-exact-gis-id');
    assert.equal(gis.curatedId,id);
    assert.equal(legacy.curatedId,id);
    assert.equal(legacy.identity,'linked');
    assert.equal(gis.publicationEligible,true);
    assert.equal(gis.parkingVerified,true);
    assert.equal(gis.publicAccessVerified,true);
    assert.equal(gis.visitorRouteEvidence.navigationToGisPointAllowed,false);
    assert.equal(gis.visitorRouteEvidence.currentRoadStatus,'unverified');
    assert.match(guide.parking,road);
    assert.match(html,road);
    assert.match(html,/current opening and road conditions are unverified/i);
    assert.match(html,/<meta name="robots" content="index,follow/);
    assert.ok(html.includes('https://chrisizworski.com/#person'));
    assert.ok(html.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>500,id+' guide thin');
    assert.ok(!html.includes('data-parking-lat='));
    for(const axis of ['landManager','publicAccess','parking','trail','location']){
      assert.equal(guide.verification[axis].verified,true,id+' '+axis);
      assert.ok(html.replaceAll('&amp;','&').includes(guide.verification[axis].source),id+' lacks citation '+axis);
    }
    const card=hub.match(new RegExp('<article class="waterfall-card"[^>]*data-id="'+id+'"[\\s\\S]*?<\\/article>'));
    assert.ok(card,id+' hub card missing');
    assert.match(card[0],/data-arrival-verified="verified"/);
    assert.ok(card[0].includes('Check parking source')&&card[0].includes('Check trail source'));
    assert.ok(sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
  }
  const duppy=fs.readFileSync('public/upper-peninsula-waterfalls/duppy-falls/index.html','utf8');
  const mex=fs.readFileSync('public/upper-peninsula-waterfalls/mex-i-min-e-falls/index.html','utf8');
  assert.match(duppy,/unmarked trail/i);
  assert.match(duppy,/3645/);
  assert.match(duppy,/168/);
  assert.match(duppy,/do not assume.*interchangeable|different.*forest-road identifiers/i);
  assert.match(duppy,/no published universal-access viewpoint|no.*developed viewing deck/i);
  assert.match(mex,/quarter-mile.*round trip|quarter.mile.*round trip|1\/4.mile.*round trip/i);
  assert.match(mex,/Forest Road 4500/);
  assert.match(mex,/May.*September/);
  assert.ok(mex.includes('data-visit-lat="46.31379535"'));
  assert.ok(!mex.includes('destination=46.313443'));
});

test('Chicaugon and Gabbro remain nonindexable research with parcel and road hazards explained', () => {
  const asset=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
  const research=fs.readFileSync('public/assets/up-waterfalls-research.js','utf8');
  for(const [oid,slug] of [[12,'chicagon-falls'],[38,'gabbro-falls']]){
    const candidate=ledger.candidates.find(x=>x.gisObjectId===oid);
    const caution=asset.records.find(x=>x.gisObjectId===oid);
    assert.ok(candidate&&caution);
    assert.equal(candidate.publicationEligible,false);
    assert.equal(candidate.curatedId,null);
    assert.equal(candidate.reconciliation,'pending-identity-and-access-research');
    assert.equal(caution.publicationEligible,false);
    assert.ok(caution.sourceLinks.length>=2);
    assert.ok(!curated.waterfalls.some(x=>x.gisObjectId===oid));
    assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/'+slug+'/'));
  }
  assert.match(asset.records.find(x=>x.gisObjectId===12).summary,/private camps|washout/i);
  assert.match(asset.records.find(x=>x.gisObjectId===38).summary,/Blackjack/i);
  assert.ok(research.includes('up-waterfall-access-reviews.json'));
});

test('Chicagon DNR waterfall parcel ownership cannot promote a private-camp road as public access', () => {
  const row=ledger.candidates.find(x=>x.gisObjectId===12);
  const canonical=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'))
    .entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===12);
  const review=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'))
    .records.find(x=>x.gisObjectId===12);
  assert.equal(row.parcelReview.dnrManagedLand.parID,258918);
  assert.equal(row.parcelReview.dnrManagedLand.acreage,47.8);
  assert.equal(row.parcelReview.routeToFallsLandVerified,false);
  assert.equal(row.publicationEligible,false);
  assert.equal(row.parkingVerified,false);
  assert.equal(row.publicAccessVerified,false);
  assert.ok(canonical.accessAssessment.includes('ParID 258918'));
  assert.equal(review.dnrManagedFallsParcel.parID,258918);
  assert.equal(review.publicationEligible,false);
  assert.match(review.summary,/private camps/i);
  assert.match(review.summary,/state ownership|DNR.*forest parcel|DNR.*parcel/i);
  assert.ok(review.sourceLinks.some(s=>s.url.includes('DNRLOTSParcelsOPENDATA')));
  assert.ok(!curated.waterfalls.some(x=>x.gisObjectId===12));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/chicagon-falls/'));
});

test('western U.P. road-to-waterfall audit lists every required step without pretending that road naming is legal access', () => {
  const asset=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
  const canonical=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
  const js=fs.readFileSync('public/assets/up-waterfalls-research.js','utf8');
  assert.match(js,/route-evidence-list/);
  assert.match(js,/Public access not established/);
  assert.match(js,/Verified geographic fact/);
  assert.match(js,/document.createElement\('ol'\)/);
  assert.ok(!js.includes('google.com/maps/dir/?api=1&destination='));
  for(const [oid,minSteps] of [[12,6],[38,6]]) {
    const candidate=ledger.candidates.find(x=>x.gisObjectId===oid);
    const prior=canonical.entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===oid);
    const review=asset.records.find(x=>x.gisObjectId===oid);
    assert.ok(candidate&&prior&&review);
    assert.equal(candidate.curatedId,null);
    assert.equal(prior.curatedId,null);
    assert.equal(candidate.publicationEligible,false);
    assert.equal(review.publicationEligible,false);
    assert.equal(candidate.accessRouteAudit.publicRouteCleared,false);
    assert.equal(candidate.accessRouteAudit.fullVehicleApproachVerified,false);
    assert.equal(candidate.accessRouteAudit.publicParkingVerified,false);
    assert.equal(candidate.accessRouteAudit.continuousPublicFootpathVerified,false);
    assert.equal(candidate.accessRouteAudit.nonDrivingFallsPoint,true);
    assert.equal(review.routeAudit.outcome,'not-cleared');
    assert.equal(review.routeAudit.destinationCoordinatesForDriving,false);
    assert.equal(review.routeAudit.routePolylineAuthorized,false);
    assert.ok(review.routeAudit.segments.length>=minSteps);
    assert.equal(new Set(review.routeAudit.segments.map(x=>x.key)).size,review.routeAudit.segments.length);
    assert.ok(review.routeAudit.segments.some(x=>x.status==='not-verified'));
    for(const part of review.routeAudit.segments) {
      assert.ok(['verified-geography','documented-not-live','not-verified'].includes(part.status));
      assert.ok(part.source.startsWith('https://'),oid+' missing route source for '+part.key);
      assert.ok(part.finding.length>=40);
    }
    assert.ok(!curated.waterfalls.some(x=>x.gisObjectId===oid));
    const slug=oid===12?'chicagon-falls':'gabbro-falls';
    assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/'+slug+'/'));
  }
  const chic=asset.records.find(x=>x.gisObjectId===12);
  assert.equal(chic.dnrManagedFallsParcel.parID,258918);
  assert.match(chic.reviewLimitations,/compartment.*not a survey|does not map a complete legal route|not a legal road determination/i);
  assert.match(chic.summary,/private landowners control almost all vehicle access/i);
  const gabbro=asset.records.find(x=>x.gisObjectId===38);
  assert.ok(gabbro.routeAudit.segments.some(x=>x.key==='upper'&&x.status==='not-verified'));
  assert.match(gabbro.summary,/bridge|ski hill/i);
});

test('Keweenaw Jacobs, Manganese and Wyandotte visitor guides are source-backed and avoid unverified parking', () => {
  const old=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
  const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
  for(const [id,oid,road] of [['jacobs-falls',143,/M-26/],['manganese-falls',145,/Manganese Road/],['wyandotte-falls',128,/Poyhonen Road/]]) {
    const f=curated.waterfalls.find(x=>x.id===id);
    const r=ledger.candidates.find(x=>x.gisObjectId===oid);
    const legacy=old.entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===oid);
    const html=fs.readFileSync('public/upper-peninsula-waterfalls/'+id+'/index.html','utf8');
    assert.ok(f&&r&&legacy,id+' missing');
    assert.equal(f.publication,'verified-access-guide');
    assert.equal(f.gisObjectId,oid);
    assert.deepEqual([f.lat,f.lng],[r.lat,r.lng]);
    assert.equal(r.curatedId,id);
    assert.equal(legacy.curatedId,id);
    assert.equal(r.reconciliation,'curated-exact-gis-id');
    assert.equal(legacy.identity,'linked');
    assert.equal(r.publicationEligible,true);
    assert.equal(r.visitorRouteEvidence.navigationToGisPointAllowed,false);
    assert.equal(r.visitorRouteEvidence.exactParkingCoordinateEstablished,false);
    assert.equal(r.visitorRouteEvidence.currentRoadStatus,'unverified');
    assert.match(f.parking,road);
    assert.match(html,road);
    assert.match(html,/current opening and road conditions are unverified/i);
    assert.match(html,/<meta name="robots" content="index,follow/);
    assert.ok(html.includes('https://chrisizworski.com/#person'));
    assert.ok(!html.includes('data-parking-lat='));
    assert.ok(html.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>500);
    for(const axis of ['landManager','publicAccess','parking','trail','location']){
      assert.equal(f.verification[axis].verified,true,id+' '+axis);
      assert.ok(html.replaceAll('&amp;','&').includes(f.verification[axis].source),id+' missing '+axis);
    }
    const card=hub.match(new RegExp('<article class="waterfall-card"[^>]*data-id="'+id+'"[^>]*>[\\s\\S]*?<\\/article>'));
    assert.ok(card,id+' hub card');
    assert.match(card[0],/data-arrival-verified="verified"/);
    assert.ok(card[0].includes('Check parking source')&&card[0].includes('Check trail source'));
    assert.ok(sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
  }
  const jac=fs.readFileSync('public/upper-peninsula-waterfalls/jacobs-falls/index.html','utf8');
  const man=fs.readFileSync('public/upper-peninsula-waterfalls/manganese-falls/index.html','utf8');
  const wya=fs.readFileSync('public/upper-peninsula-waterfalls/wyandotte-falls/index.html','utf8');
  assert.match(jac,/Jampot/);
  assert.match(jac,/not.*parking|business parking/i);
  assert.match(jac,/no.*maintained|not a.*trail|informal/i);
  assert.match(man,/deep gorge|steep.*gorge/i);
  assert.match(man,/children/i);
  assert.match(man,/0\.7 mile/i);
  assert.match(wya,/250.yard/i);
  assert.match(wya,/Poyhonen Road/);
  assert.match(wya,/golf course/i);
  assert.ok(![jac,man,wya].some(x=>x.includes('destination=47.')));
});

test('Upper and Lower Tahquamenon source IDs share the existing canonical planner without duplicate pages', () => {
  const parent=curated.waterfalls.find(x=>x.id==='tahquamenon');
  assert.ok(parent);
  assert.equal(parent.link,'/tahquamenon-falls/');
  assert.deepEqual(parent.multiFeatureGisObjectIds,[207,208]);
  assert.equal(parent.gisFeatureCrosswalk.length,2);
  for (const oid of [207,208]) {
    const geo=ledger.candidates.find(x=>x.gisObjectId===oid);
    assert.equal(geo.curatedId,parent.id);
    assert.equal(geo.reconciliation,'curated-multifeature-parent-tool');
    assert.equal(geo.publicGuide,'existing-verified-park-planner');
    assert.equal(geo.featureCoverage.notVehicleParking,true);
    assert.equal(geo.featureCoverage.currentAccessStatus,'unverified');
    assert.equal(geo.featureCoverage.parentUrl,parent.link);
    assert.equal(geo.publicationEligible,true);
    assert.ok(parent.gisFeatureCrosswalk.some(x=>x.gisObjectId===oid&&x.source.startsWith('https://')));
  }
  assert.match(parent.further,/1,100-foot accessible Upper Falls/);
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/upper-tahquamenon-falls/'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/lower-tahquamenon-falls/'));
});

test('Rock River Falls has a source-verified wilderness route without false parking and stays indexable',()=>{
  const fall=curated.waterfalls.find(x=>x.id==='rock-river-falls');
  const gis=ledger.candidates.find(x=>x.gisObjectId===194);
  const original=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'))
    .entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===194);
  const page=fs.readFileSync('public/upper-peninsula-waterfalls/rock-river-falls/index.html','utf8');
  const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
  assert.ok(fall&&gis&&original);
  assert.equal(fall.publication,'verified-access-guide');
  assert.equal(gis.curatedId,fall.id);
  assert.equal(gis.reconciliation,'curated-exact-gis-id');
  assert.equal(original.curatedId,fall.id);
  assert.equal(original.identity,'linked');
  assert.equal(gis.visitorRouteEvidence.navigationToGisPointAllowed,false);
  assert.equal(gis.visitorRouteEvidence.fallsSpecificParkingCoordinateVerified,false);
  assert.equal(gis.visitorRouteEvidence.nctaWesternTrailheadIsNotFallsParking,true);
  assert.match(page,/FR.?2276|Forest Road 2276/);
  assert.match(page,/FR.?2293|Forest Road 2293/);
  assert.match(page,/1\.2-mile/);
  assert.match(page,/not automatically the Rock River Falls parking lot/i);
  assert.match(page,/current opening and road conditions are unverified/i);
  assert.match(page,/<meta name="robots" content="index,follow/);
  assert.ok(!page.includes('data-parking-lat='));
  assert.ok(!page.includes('destination=46.411253'));
  assert.ok(page.includes('https://chrisizworski.com/#person'));
  for(const axis of ['landManager','publicAccess','parking','trail','location']){
    assert.equal(fall.verification[axis].verified,true,axis);
    assert.ok(page.includes(fall.verification[axis].source),axis+' citation missing');
  }
  const card=hub.match(/<article class="waterfall-card"[^>]*data-id="rock-river-falls"[\s\S]*?<\/article>/);
  assert.ok(card);
  assert.match(card[0],/data-gis-oid="194"/);
  assert.match(card[0],/class="arrival-details"/);
  assert.match(card[0],/Check parking source/);
  assert.ok(sitemap.includes('/upper-peninsula-waterfalls/rock-river-falls/'));
});
test('Alger and Au Train are withheld from indexing for documented parking and dam access uncertainty',()=>{
  const reviews=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')).records;
  for(const [oid,id] of [[213,'alger-falls'],[192,'au-train-falls']]){
    const geo=ledger.candidates.find(x=>x.gisObjectId===oid);
    const item=reviews.find(x=>x.gisObjectId===oid);
    assert.ok(geo&&item);
    assert.equal(geo.publicationEligible,false);
    assert.equal(geo.curatedId,null);
    assert.equal(item.publicationEligible,false);
    assert.ok(item.sourceLinks.length>=2);
    assert.ok(!curated.waterfalls.some(x=>x.gisObjectId===oid));
    assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
  }
  assert.match(reviews.find(x=>x.gisObjectId===213).summary,/no safe parking options/i);
  assert.match(reviews.find(x=>x.gisObjectId===192).reviewLimitations,/not a final current FERC status/i);
});
