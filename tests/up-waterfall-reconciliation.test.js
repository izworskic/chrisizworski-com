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
      if (row.gisObjectId===45) {
        const visitor=curated.waterfalls.find(x=>x.id==='sturgeon-falls');
        assert.ok(visitor && !Number.isInteger(visitor.gisObjectId));
        assert.ok(Math.abs(visitor.lat-row.lat)>0.04);
        assert.match(row.disposition,/same-name-state-GIS-geography-mismatch/i);
        assert.match(row.sourceNotes,/6\.74 km/);
      } else {
        assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/' + proposedSlug + '/'),
          'unreviewed GIS feature may not auto-enter public waterfall sitemap: ' + row.name);
      }
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
  assert.match(reviews.find(x=>x.gisObjectId===192).reviewLimitations,/FINAL termination order/i);
});

test('remaining geographic candidates have an exhaustive nonpublishing eight-at-a-time review queue',()=>{
  const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
  assert.equal(q.schemaVersion,1);
  assert.match(q.policy,/Do not auto-index/i);
  assert.equal(q.counts.gisFeatures,161);
  assert.equal(q.counts.curatedDestinations,curated.waterfalls.length);
  assert.equal(q.counts.matchedGisFeatures,ledger.counts.exactIdMatched);
  assert.equal(q.counts.pendingGisFeatures,ledger.counts.pending);
  assert.equal(q.candidates.length,ledger.counts.pending);
  const expected=new Set(ledger.candidates.filter(x=>!x.curatedId).map(x=>x.gisObjectId));
  const actual=new Set(q.candidates.map(x=>x.gisObjectId));
  assert.equal(actual.size,expected.size);
  for(const id of actual) assert.ok(expected.has(id),'queue has stale or unknown GIS ID '+id);
  for(const row of q.candidates){
    assert.equal(row.publicationEligible,false);
    assert.ok(row.blockingGate.length>=20);
    assert.ok(row.cluster.includes('/'));
    assert.ok(!curated.waterfalls.some(x=>x.gisObjectId===row.gisObjectId));
  }
  const batchIds=q.batches.flatMap(x=>x.candidates);
  assert.equal(batchIds.length,expected.size);
  assert.equal(new Set(batchIds).size,expected.size);
  assert.ok(q.batches.every(x=>x.candidates.length<=8));
});

test('Morgan Falls public route uses NTN South parking and designated crossing, never highway shoulder',()=>{
  const f=curated.waterfalls.find(x=>x.id==='morgan-falls');
  const geo=ledger.candidates.find(x=>x.gisObjectId===166);
  const source=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===166);
  const html=fs.readFileSync('public/upper-peninsula-waterfalls/morgan-falls/index.html','utf8');
  const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
  assert.ok(f&&geo&&source);
  assert.equal(geo.curatedId,f.id);
  assert.equal(source.curatedId,f.id);
  assert.equal(geo.reconciliation,'curated-exact-gis-id');
  assert.equal(f.publication,'verified-access-guide');
  assert.equal(geo.visitorRouteEvidence.navigationToGisPointAllowed,false);
  assert.match(f.parking,/South Trails main trailhead|South Trailhead/i);
  assert.match(html,/designated.*crossing|designated M-553 crossing/i);
  assert.match(html,/DO NOT park|Do not park/i);
  assert.match(html,/closed to motor/i);
  assert.match(html,/2\.8 miles round trip/i);
  assert.match(html,/current opening and road conditions are unverified/i);
  assert.ok(!html.includes('data-parking-lat='));
  assert.ok(html.includes('https://chrisizworski.com/#person'));
  for(const axis of ['landManager','publicAccess','parking','trail','location']){
    assert.equal(f.verification[axis].verified,true,axis);
    assert.ok(html.includes(f.verification[axis].source),axis+' citation missing');
  }
  const card=hub.match(/<article class="waterfall-card"[^>]*data-id="morgan-falls"[\s\S]*?<\/article>/);
  assert.ok(card);
  assert.match(card[0],/data-gis-oid="166"/);
  assert.match(card[0],/data-arrival-source="https:\/\//);
  assert.ok(sitemap.includes('/upper-peninsula-waterfalls/morgan-falls/'));
});


test('remaining Batch 14 three source-reviewed GIS records stay unindexed with distinct route and safety gates',()=> {
 const refs=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')).records;
 const source=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries;
 const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8')).candidates;
 for(const oid of [160,46,91]){
  const g=ledger.candidates.find(x=>x.gisObjectId===oid);
  const a=source.find(x=>x.source==='mi-state-gis'&&x.sourceId===oid);
  const r=refs.find(x=>x.gisObjectId===oid);
  const q=queue.find(x=>x.gisObjectId===oid);
  assert.ok(g&&a&&r&&q,'all four source artifacts for '+oid);
  assert.equal(g.curatedId,null);
  assert.equal(r.publicationEligible,false);
  assert.equal(q.publicationEligible,false);
  assert.equal(q.reviewStatus,'previous-research-needs-public-access-review');
  assert.ok(g.sourceLinks.length>=2);
  assert.ok(r.routeAudit.segments.length===6);
  assert.ok(r.routeAudit.segments.some(x=>x.status==='not-cleared'));
  assert.ok(r.sourceLinks.every(x=>x.url.startsWith('https://')));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/'+r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'/'));
 }
 const douglass=curated.waterfalls.find(x=>x.gisObjectId===135);assert.ok(douglass?.verification?.landManager?.verified,'Houghton Douglass now promoted to public guide');assert.match(douglass.further,/Phase 1|2027|overlook|accessible/i);
 assert.match(refs.find(x=>x.gisObjectId===160).reviewLimitations,/municipal operator|utility/i);
 assert.match(refs.find(x=>x.gisObjectId===46).guidance,/Do not.*gate/i);
 assert.match(refs.find(x=>x.gisObjectId===91).summary,/private/i);
 const mapJS=fs.readFileSync('public/assets/up-waterfalls-research.js','utf8');
 assert.match(mapJS,/accessReviews/);
 assert.match(mapJS,/routeAudit/);
});

test('Falls River single guide covers Middle and Lower via public trail not unsafe river or railway shortcut',()=>{
 const guide=curated.waterfalls.find(x=>x.id==='falls-river-trail');
 assert.ok(guide);
 assert.equal(guide.gisObjectId,95);
 assert.deepEqual(guide.multiFeatureGisObjectIds,[96]);
 assert.equal(guide.publication,'verified-access-guide');
 for(const oid of [95,96]){
   const row=ledger.candidates.find(x=>x.gisObjectId===oid);
   assert.equal(row.curatedId,'falls-river-trail');
   assert.equal(row.publicationEligible,true);
   assert.equal(row.visitorRouteEvidence.navigationToGisPointAllowed,false);
 }
 const h=fs.readFileSync('public/upper-peninsula-waterfalls/falls-river-trail/index.html','utf8');
 const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 assert.match(h,/1\.4 miles out and back/i);
 assert.match(h,/Lower Falls/);
 assert.match(h,/Middle Falls/);
 assert.match(h,/railway/);
 assert.match(h,/current opening and road conditions are unverified/i);
 assert.ok(!h.includes('data-parking-lat='));
 assert.match(hub,/data-id="falls-river-trail" data-gis-oid="95" data-gis-multi-oid="96"/);
 assert.ok(sitemap.includes('/upper-peninsula-waterfalls/falls-river-trail/'));
 const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
 assert.ok(!queue.candidates.some(x=>[95,96].includes(x.gisObjectId)));
});

test('Sturgeon visitor guide prevents 6.74 km state GIS misrouting while retaining research candidate',()=>{
 const f=curated.waterfalls.find(x=>x.id==='sturgeon-falls');
 const geo=ledger.candidates.find(x=>x.gisObjectId===45);
 const data=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
 const review=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')).records.find(x=>x.gisObjectId===45);
 const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
 const html=fs.readFileSync('public/upper-peninsula-waterfalls/sturgeon-falls/index.html','utf8');
 const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 assert.ok(f&&geo&&review);
 assert.equal(f.publication,'verified-access-guide');
 assert.equal(f.gisObjectId,undefined);
 assert.equal(f.lat,46.64242);
 assert.equal(geo.curatedId,null);
 assert.equal(geo.publicationEligible,false);
 assert.equal(geo.lat,46.582163);
 assert.equal(review.publicationEligible,false);
 assert.match(review.summary,/6\.74 km/);
 assert.ok(review.routeAudit.segments.length===6);
 assert.ok(q.candidates.some(x=>x.gisObjectId===45));
 assert.ok(data.entries.some(x=>x.source==='curated-non-gis'&&x.curatedId==='sturgeon-falls'));
 assert.match(html,/FR2276/);
 assert.match(html,/FR2270/);
 assert.match(html,/half-mile spur/);
 assert.match(html,/no roads on this map are plowed in winter/i);
 assert.match(html,/current opening and road conditions are unverified/i);
 assert.ok(!html.includes('data-parking-lat='));
 assert.match(hub,/data-id="sturgeon-falls" data-name="Sturgeon River Falls"/);
 assert.ok(!hub.includes('data-id="sturgeon-falls" data-gis-oid="45"'));
 assert.ok(sitemap.includes('/upper-peninsula-waterfalls/sturgeon-falls/'));
 for(const axis of ['landManager','publicAccess','parking','trail','location']){
  assert.equal(f.verification[axis].verified,true,axis);
  assert.ok(html.includes(f.verification[axis].source),axis);
 }
});

test('Memorial and Tannery/Olsen closure guide never provides visitor arrival or ignores MNA 2028 restriction',()=>{
 const f=curated.waterfalls.find(x=>x.id==='twin-waterfalls-memorial-preserve');
 const h=fs.readFileSync('public/upper-peninsula-waterfalls/twin-waterfalls-memorial-preserve/index.html','utf8');
 const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
 assert.ok(f);
 assert.equal(f.publication,'verified-closure-guide');
 assert.equal(f.status,'closed');
 assert.equal(f.gisObjectId,198);
 assert.deepEqual(f.multiFeatureGisObjectIds,[199]);
 for(const oid of [198,199]){
  const row=ledger.candidates.find(x=>x.gisObjectId===oid);
  assert.equal(row.curatedId,f.id);
  assert.equal(row.publicationEligible,true);
  assert.equal(row.visitorRouteEvidence.navigationToGisPointAllowed,false);
  assert.equal(row.visitorRouteEvidence.parking,'No public visitor parking');
  assert.ok(!q.candidates.some(x=>x.gisObjectId===oid));
 }
 assert.match(h,/Closed to ALL visitors|closed to all visitors/i);
 assert.match(h,/through 2028/i);
 assert.match(h,/does not guarantee reopening/i);
 assert.match(h,/Wagner Falls/);
 assert.match(h,/Mosquito Falls/);
 assert.ok(!h.includes('data-parking-lat='));
 assert.match(hub,/data-id="twin-waterfalls-memorial-preserve" data-gis-oid="198" data-gis-multi-oid="199"/);
 assert.ok(sitemap.includes('/upper-peninsula-waterfalls/twin-waterfalls-memorial-preserve/'));
 for(const axis of ['landManager','publicAccess','parking','trail','location']){
  assert.equal(f.verification[axis].verified,true);
  assert.ok(h.includes(f.verification[axis].source));
 }
});

test('Batch 18 Houghton Phase-1 and Power House public visitor paths preserve distinct site safety and physical geography',()=>{
 const inventory=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries;
 const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
 const gisResearch=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')).records;
 const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 for(const [oid,id] of [[135,'houghton-douglass-falls'],[88,'power-house-falls']]){
  const f=curated.waterfalls.find(x=>x.id===id);
  const record=ledger.candidates.find(x=>x.gisObjectId===oid);
  const source=inventory.find(x=>x.source==='mi-state-gis'&&x.sourceId===oid);
  const html=fs.readFileSync('public/upper-peninsula-waterfalls/'+id+'/index.html','utf8');
  assert.ok(f&&record&&source);
  assert.equal(f.publication,'verified-access-guide');
  assert.equal(record.curatedId,id);
  assert.equal(source.curatedId,id);
  assert.equal(record.visitorRouteEvidence.navigationToGisPointAllowed,false);
  assert.ok(!queue.candidates.some(x=>x.gisObjectId===oid));
  assert.ok(!gisResearch.some(x=>x.gisObjectId===oid));
  assert.match(html,/current opening and road conditions are unverified/i);
  assert.ok(!html.includes('data-parking-lat='));
  assert.ok(html.includes('https://chrisizworski.com/#person'));
  assert.ok(hub.includes('data-id="'+id+'" data-gis-oid="'+oid+'"'));
  assert.ok(sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
  for(const axis of ['landManager','publicAccess','parking','trail','location']){
   assert.equal(f.verification[axis].verified,true);
   assert.ok(html.includes(f.verification[axis].source),axis);
  }
 }
 const d=fs.readFileSync('public/upper-peninsula-waterfalls/houghton-douglass-falls/index.html','utf8');
 assert.match(d,/BEYOND THE BRIDGE|beyond.*bridge/i);
 assert.match(d,/2027/);
 assert.match(d,/no.*completed.*platform|no completed.*observation platform/i);
 assert.match(d,/officially open and be dedicated|official.*dedicat/i);
 const ph=fs.readFileSync('public/upper-peninsula-waterfalls/power-house-falls/index.html','utf8');
 assert.match(ph,/Power Dam Road/);
 assert.match(ph,/USGS/);
 assert.match(ph,/not a.*parking/i);
 for(const oid of [160,91]){const row=ledger.candidates.find(x=>x.gisObjectId===oid);assert.equal(row.curatedId,null);assert.equal(row.publicationEligible,false);assert.ok(queue.candidates.some(x=>x.gisObjectId===oid));}
});

test('Dead River operator evidence must never imply a powerhouse visitor lot or dam gate access',()=>{
 const g=ledger.candidates.find(x=>x.gisObjectId===160);
 const review=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')).records.find(x=>x.gisObjectId===160);
 const source=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===160);
 assert.ok(g&&review&&source);
 assert.equal(g.curatedId,null);
 assert.equal(g.publicationEligible,false);
 assert.equal(review.publicationEligible,false);
 assert.equal(g.accessRouteAudit.outcome,'not-cleared');
 assert.equal(review.routeAudit.segments.length,6);
 assert.ok(review.routeAudit.segments.some(x=>x.label==='Visitor parking'&&x.status==='not-cleared'));
 assert.match(review.summary,/Marquette Board of Light & Power/i);
 assert.match(review.summary,/Neither is a site-specific public parking/i);
 assert.match(review.guidance,/NOT a verified signed falls route/);
 assert.ok(source.nextAction.includes('FERC Forestville'));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/dead-river-falls/'));
});

test('Batch 39 Lower Silver waterfall identity remains but owner/visitor route publication gate is closed',()=>{
 const guide=curated.waterfalls.find(x=>x.id==='lower-silver-falls');
 const lower=ledger.candidates.find(x=>x.gisObjectId===110);
 const upper=ledger.candidates.find(x=>x.gisObjectId===68);
 const slate=ledger.candidates.find(x=>x.gisObjectId===119);
 const orig=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===110);
 const page=fs.readFileSync('public/upper-peninsula-waterfalls/lower-silver-falls/index.html','utf8');
 const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 assert.ok(guide&&lower&&upper&&slate&&orig);
 assert.equal(guide.gisObjectId,110);
 assert.equal(guide.publication,'research-only-guide');
 assert.equal(guide.verification.landManager.verified,false);
 assert.equal(lower.curatedId,guide.id);
 assert.equal(lower.publicationEligible,false);
 assert.equal(orig.publication,'research-only');
 assert.equal(upper.curatedId,null);assert.equal(slate.publicationEligible,false);
 assert.match(page,/name="robots" content="noindex,follow"/);
 assert.ok(!page.includes('"@type":"TouristAttraction"'));
 assert.match(page,/Research-only: public manager/);
 assert.match(hub,/data-id="lower-silver-falls" data-gis-oid="110"/);
 const card=hub.match(/<article class="waterfall-card"[^>]*data-id="lower-silver-falls"[\s\S]*?<\/article>/);
 assert.ok(card);assert.match(card[0],/data-arrival-verified="pending"/);
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/lower-silver-falls/'));
 for(const axis of ['landManager','publicAccess','parking','trail','location'])assert.ok(guide.verification[axis].source.startsWith('https://'));
});

test('Slate River research remains noindex and cannot be advertised as legal access',()=>{
 const row=ledger.candidates.find(x=>x.gisObjectId===119);
 const audit=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')).records.find(x=>x.gisObjectId===119);
 const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
 const source=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===119);
 const page=fs.readFileSync('public/upper-peninsula-waterfalls/research/slate-river-falls/index.html','utf8');
 const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 const researchJs=fs.readFileSync('public/assets/up-waterfalls-research.js','utf8');
 assert.equal(row.curatedId,null);
 assert.equal(row.publicGuide,null);
 assert.equal(row.publicationEligible,false);
 assert.equal(row.accessRouteAudit.outcome,'not-cleared');
 assert.equal(row.accessRouteAudit.segments.length,7);
 assert.equal(audit.publicationEligible,false);
 assert.equal(audit.researchPage,'/upper-peninsula-waterfalls/research/slate-river-falls/');
 assert.ok(queue.candidates.some(x=>x.gisObjectId===119));
 assert.equal(source.classification,row.disposition);
 assert.match(page,/name="robots" content="noindex,follow"/);
 assert.match(page,/Nature Conservancy/);
 assert.match(row.sourceNotes,/25%/);assert.match(row.sourceNotes,/one-third/);
 assert.ok(row.sourceLinks.includes('https://www.nature.org/en-us/about-us/where-we-work/united-states/michigan/stories-in-michigan/deer-hunting-in-michigan/'));
 assert.ok(!page.includes('data-parking-lat='));
 assert.match(page,/Skanee Road/);
 assert.match(page,/Arvon Road/);
 assert.match(page,/not a verified visitor itinerary/i);
 assert.ok(!page.includes('data-parking-lat='));
 assert.ok(!page.includes('google.com/maps/dir'));
 assert.ok(!hub.includes('data-id="slate-river-falls"'));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/slate-river-falls/'));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/research/slate-river-falls/'));
 assert.match(researchJs,/Read the full source-backed access review/);
});

test('TNC fee polygon covers Slate River Falls but not Skanee Road bridge; no parking rights inferred',()=>{
 const field=JSON.parse(fs.readFileSync('public/assets/up-slate-river-tnc-boundary.geojson','utf8'));
 const audit=JSON.parse(fs.readFileSync('data/up-waterfall-slate-river-boundary-audit.json','utf8'));
 const page=fs.readFileSync('public/upper-peninsula-waterfalls/research/slate-river-falls/index.html','utf8');
 const map=fs.readFileSync('public/assets/up-slate-river-boundary.js','utf8');
 const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
 const review=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')).records.find(x=>x.gisObjectId===119);
 const rec=ledger.candidates.find(x=>x.gisObjectId===119);
 assert.equal(field.features.length,1);
 assert.equal(field.features[0].properties.OBJECTID,8370);
 assert.equal(field.features[0].properties.MAP_SYM,'Fee Ownership');
 assert.equal(field.features[0].properties.PUB_ACCESS,'Restricted Access');
 const polys=field.features[0].geometry.coordinates;
 const inRing=(point,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 const inside=point=>polys.some(poly=>inRing(point,poly[0])&&!poly.slice(1).some(ring=>inRing(point,ring)));
 for(const p of audit.points)assert.equal(inside([p.lon,p.lat]),p.tncFeeOverlay,p.name);
 assert.equal(inside([-88.252067,46.831054]),true);
 assert.equal(inside([-88.258622,46.833158]),false);
 assert.equal(inside([-88.258611,46.833333]),false);
 assert.equal(inside([-88.25731,46.833158]),true);
 assert.equal(inside([-88.242098,46.789247]),false);
 assert.equal(audit.limits.verifiedPublicParking,false);
 assert.equal(audit.limits.completeFootpathPermission,false);
 assert.equal(audit.limits.dryGroundFallsViewVerified,false);
 assert.equal(rec.landManagerVerifiedAtFalls,true);
 assert.equal(rec.parcelOverlay.publicAccess,'Restricted Access');
 assert.equal(rec.publicationEligible,false);
 assert.equal(rec.curatedId,null);
 assert.equal(review.publicationEligible,false);
 assert.ok(q.candidates.some(p=>p.gisObjectId===119));
 assert.match(page,/name="robots" content="noindex,follow"/);
 assert.match(page,/Boundary overlay: not a driving route/);
 assert.match(page,/up-slate-river-boundary\.js/);
 assert.match(map,/No route or parking is shown/);
 assert.ok(!page.includes('data-parking-lat='));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/research/slate-river-falls/'));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/slate-river-falls/'));
});


test('Slate River public-route gates require primary authority permission',()=>{
 const d=JSON.parse(fs.readFileSync('data/up-waterfall-slate-river-access-decision.json','utf8'));
 const row=ledger.candidates.find(x=>x.gisObjectId===119);
 const page=fs.readFileSync('public/upper-peninsula-waterfalls/research/slate-river-falls/index.html','utf8');
 assert.equal(d.visitorGuideEligible,false);
 assert.equal(d.autoPromote,false);
 assert.equal(d.gates.length,5);
 assert.deepEqual(d.gates.filter(g=>g.state==='verified').map(g=>g.id),['natural-owner']);
 assert.equal(d.gates.filter(g=>g.state!=='verified').length,4);
 assert.equal(d.outreach.sent,false);
 assert.equal(row.curatedId,null);
 assert.equal(row.accessDecision.publicGuideEligible,false);
 assert.match(page,/name="robots" content="noindex,follow"/);
 assert.match(page,/Five separate access decisions/);
 assert.match(page,/2025 Visit Keweenaw feature/);
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/slate-river-falls/'));
});

test('Scott Falls park-side-only promotion backed by Alger County and MDOT, no M-28 crossing',()=>{
 const f=curated.waterfalls.find(x=>x.id==='scott-falls');
 const row=ledger.candidates.find(x=>x.gisObjectId===196);
 const orig=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===196);
 const page=fs.readFileSync('public/upper-peninsula-waterfalls/scott-falls/index.html','utf8');
 const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 assert.ok(f&&row&&orig);
 assert.equal(f.publication,'verified-access-guide');
 assert.equal(f.accessConfidence,'county-recreation-plan-verifies-mdot-park-parking-view-only-no-falls-side-route');
 assert.equal(row.publicationEligible,true);
 assert.equal(row.curatedId,'scott-falls');
 assert.equal(orig.publication,'verified-access-guide');
 assert.equal(row.visitorRouteEvidence.navigationToGisPointAllowed,false);
 assert.equal(row.visitorRouteEvidence.pedestrianCrossingAllowedByGuide,false);
 assert.equal(row.visitorRouteEvidence.waterfallSideRouteVerified,false);
 assert.match(page,/name="robots" content="index,follow,max-image-preview:large"/);
 assert.match(page,/view from the MDOT roadside park, without crossing M-28/);
 assert.match(page,/MDOT's April 2026 roadside-park notice/);
 assert.match(page,/Current opening and roadside conditions are unverified/);
 assert.match(page,/do not cross (?:busy )?M-28/i);
 assert.ok(!page.includes('data-parking-lat='));
 for(const axis of ['landManager','publicAccess','parking','trail','location']){
  assert.equal(f.verification[axis].verified,true);
  assert.ok(page.includes(f.verification[axis].source),axis);
 }
 assert.match(hub,/data-id="scott-falls" data-gis-oid="196"/);
 assert.ok(hub.includes('data-arrival-verified="verified"'));
 assert.ok(sitemap.includes('/upper-peninsula-waterfalls/scott-falls/'));
});

test('Tibbets Falls #44 state land via NCTA named parking and blazed view, no 2-track vehicle directions',()=>{
 const f=curated.waterfalls.find(x=>x.id==='tibbets-falls');
 const row=ledger.candidates.find(x=>x.gisObjectId===44);
 const source=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===44);
 const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
 const h=fs.readFileSync('public/upper-peninsula-waterfalls/tibbets-falls/index.html','utf8');
 const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 assert.ok(f&&row&&source);
 assert.equal(f.gisObjectId,44);
 assert.equal(f.publication,'verified-access-guide');
 assert.equal(row.curatedId,'tibbets-falls');
 assert.equal(row.publicationEligible,true);
 assert.equal(row.visitorRouteEvidence.navigationToGisPointAllowed,false);
 assert.equal(row.visitorRouteEvidence.parkingMarkerVerified,false);
 assert.equal(row.visitorRouteEvidence.noFordingNeededOnPublishedNCTView,true);
 assert.equal(source.publication,'verified-access-guide');
 assert.ok(!queue.candidates.some(x=>x.gisObjectId===44));
 assert.match(h,/name="robots" content="index,follow,max-image-preview:large"/);
 assert.match(h,/Segment 44/);
 assert.match(h,/blue-blazed North Country Trail/);
 assert.match(h,/sandy two-track/);
 assert.match(h,/current chapter map/i);
 assert.match(h,/winter clearing/i);
 assert.ok(!h.includes('data-parking-lat='));
 assert.ok(hub.includes('data-id="tibbets-falls" data-gis-oid="44"'));
 assert.ok(sitemap.includes('/upper-peninsula-waterfalls/tibbets-falls/'));
 for(const axis of ['landManager','publicAccess','parking','trail','location']){assert.equal(f.verification[axis].verified,true);assert.ok(h.includes(f.verification[axis].source),axis);}
});

test('Au Train FERC final December 2025 termination cannot be mistaken for a proposed surrender or site closure',()=>{
 const row=ledger.candidates.find(x=>x.gisObjectId===192);
 const original=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')).entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===192);
 const reviews=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')).records;
 const review=reviews.find(x=>x.gisObjectId===192);
 const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
 const html=fs.readFileSync('public/upper-peninsula-waterfalls/research/au-train-falls/index.html','utf8');
 assert.ok(row&&original&&review);
 assert.equal(row.curatedId,null);
 assert.equal(row.publicationEligible,false);
 assert.equal(review.publicationEligible,false);
 assert.equal(row.accessRouteAudit.outcome,'not-cleared');
 assert.equal(row.accessRouteAudit.segments.length,6);
 assert.ok(queue.candidates.some(x=>x.gisObjectId===192));
 assert.equal(original.classification,row.disposition);
 assert.equal(review.researchPage,'/upper-peninsula-waterfalls/research/au-train-falls/');
 assert.match(row.sourceNotes,/TERMINATED/);
 assert.match(row.sourceNotes,/December 29, 2025/);
 assert.match(row.sourceNotes,/LEFT IN PLACE/);
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(html,/Federal Energy Regulatory Commission/);
 assert.match(html,/not merely a proposal/i);
 assert.match(html,/D. Charles Trust Investments/);
 assert.match(html,/state.*EGLE/i);
 assert.ok(!html.includes('data-parking-lat='));
 assert.ok(!html.includes('google.com/maps/dir'));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/au-train-falls/'));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/research/au-train-falls/'));
});
