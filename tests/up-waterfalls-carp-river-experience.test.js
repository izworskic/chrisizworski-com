import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const curated=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const rec=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const access=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const page=fs.readFileSync('public/upper-peninsula-waterfalls/carp-river-falls/index.html','utf8');
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const morganPage=fs.readFileSync('public/upper-peninsula-waterfalls/morgan-falls/index.html','utf8');
const js=fs.readFileSync('public/assets/carp-river-falls.js','utf8');
const css=fs.readFileSync('public/assets/carp-river-falls.css','utf8');
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');

test('Carp River public managed overlook qualifies through five independent documented source checks',()=>{
 const f=curated.find(x=>x.id==='carp-river-falls');
 assert.ok(f);
 assert.equal(f.gisObjectId,169);
 assert.equal(f.publication,'verified-access-guide');
 assert.equal(f.manager,'Noquemanon Trail Network · South Trails');
 for(const axis of ['landManager','publicAccess','parking','trail','location']){
  assert.equal(f.verification[axis].verified,true,axis);
  assert.match(f.verification[axis].source,/^https:\/\//);
 }
 assert.equal(f.lat,46.503807);
 assert.equal(f.lng,-87.44655);
 assert.match(f.parking,/NTN South Trailhead/);
 assert.match(f.parking,/shoulder/);
 assert.match(f.walk,/overlook/);
 assert.match(f.walk,/no verified exact GPS polyline|no verified exact GPS|exact 2026 line|no verified exact/i);
 assert.match(f.further,/2024/);
 assert.match(f.further,/not been independently georeferenced/i);
});

test('Two Carp River named features and Morgan Falls remain geographically distinct',()=>{
 const ids=[[163,null],[166,'morgan-falls'],[169,'carp-river-falls']];
 for(const [gis,id] of ids){
  const r=rec.candidates.find(x=>x.gisObjectId===gis);
  const l=ledger.entries.find(x=>x.sourceId===gis);
  assert.ok(r && l);assert.equal(r.curatedId,id);assert.equal(l.curatedId,id);
  assert.equal(r.reconciliation,id?'curated-exact-gis-id':'pending-identity-and-access-research');
 }
 const upper=rec.candidates.find(x=>x.gisObjectId===163),gorge=rec.candidates.find(x=>x.gisObjectId===169),morgan=rec.candidates.find(x=>x.gisObjectId===166);
 assert.match(upper.sourceNotes,/No Trespassing/i);
 assert.equal(gorge.accessRouteAudit.destinationCoordinatesForDriving,false);
 assert.equal(gorge.accessRouteAudit.routePolylineAuthorized,false);
 assert.equal(gorge.accessRouteAudit.segments.length,6);
 assert.deepEqual([upper.lat,upper.lng],[46.521504,-87.572418]);
 assert.deepEqual([morgan.lat,morgan.lng],[46.507745,-87.446107]);
});

test('Public guide is discoverable with valid schema and does not remove historical nonindexed research',()=>{
 const url='/upper-peninsula-waterfalls/carp-river-falls/';
 assert.match(page,/<meta name="robots" content="index,follow/);
 assert.ok(page.includes('https://chrisizworski.com'+url));
 assert.ok(page.includes('https://chrisizworski.com/#person'));
 assert.ok(sitemap.includes('<loc>https://chrisizworski.com'+url+'</loc>'));
 assert.equal((sitemap.match(/<loc>/g)||[]).length,70);
 assert.ok(hub.includes('data-id="carp-river-falls"'));
 assert.ok(hub.includes('data-gis-oid="169"'));
 assert.equal((hub.match(/<article class="waterfall-card"/g)||[]).length,72);
 assert.ok(morganPage.includes('href="'+url+'"'));
 const ldMatch=page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert.ok(ldMatch);const ld=JSON.parse(ldMatch[1]);
 assert.ok(ld['@graph'].some(x=>x['@type']==='WebPage'));
 assert.ok(ld['@graph'].some(x=>x['@type']==='TouristAttraction'));
 const research=fs.readFileSync('public/upper-peninsula-waterfalls/research/carp-river-falls-marquette-gorge/index.html','utf8');
 assert.match(research,/noindex,follow/);
 assert.ok(!sitemap.includes('/research/'));
 const list=JSON.parse(hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(x=>x['@type']==='ItemList');
 assert.equal(list.numberOfItems,70);
 assert.equal(list.itemListElement.filter(x=>x.url==='https://chrisizworski.com'+url).length,1);
});

test('Accessible decision atlas keeps unsafe routes unavailable and no invented route or parking pins',()=>{
 for(const mode of ['carp','morgan','gorge','upper'])assert.ok(page.includes('value="'+mode+'"'));
 assert.ok(page.includes('id="cr-season"'));
 assert.ok(page.includes('id="cr-geo-map"'));
 assert.ok(page.includes('aria-live="polite"'));
 assert.ok(page.includes('id="cr-answer-title"'));
 assert.ok(page.includes('public/assets') || page.includes('/assets/carp-river-falls.css'));
 assert.ok(css.includes('.cr-chapters') && css.includes('@media'));
 assert.ok(js.includes('NTN South Trailhead'));
 assert.ok(js.includes('No Trespassing'));
 assert.ok(js.includes('gorge-bottom'));
 assert.ok(js.includes('navigator.clipboard'));
 assert.doesNotMatch(js,/L\.polyline\s*\(/);
 assert.doesNotMatch(page,/data-parking-lat=/);
 assert.ok(!page.includes('maps/dir/?api=1&destination=46.503807'));
 assert.ok(page.includes('https://www.travelmarquette.com/listing/carp-river-ntn-south-trails/514/'));
 const reviewer=access.records.find(x=>x.gisObjectId===169);
 assert.ok(reviewer);assert.equal(reviewer.publicationEligible,true);
 assert.equal(reviewer.routeAudit.routePolylineAuthorized,false);
 assert.equal(reviewer.routeAudit.destinationCoordinatesForDriving,false);
});

test('Inventory, geographic crosswalk and priority queue update together without publishing unmatched falls',()=>{
 assert.equal(curated.length,72);assert.equal(rec.counts.curatedTotal,72);
 assert.equal(rec.counts.exactIdMatched,66);assert.equal(rec.counts.pending,95);
 assert.equal(ledger.curatedCount,72);assert.equal(ledger.linkedByExactOid,66);
 assert.equal(ledger.unresolvedCandidates,95);assert.equal(queue.candidates.length,95);
 assert.equal(queue.counts.curatedDestinations,72);assert.equal(queue.counts.matchedGisFeatures,66);
 assert.ok(!queue.candidates.some(x=>x.gisObjectId===169));
 assert.ok(queue.candidates.some(x=>x.gisObjectId===163 && !x.publicationEligible));
});
