import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const evidence = JSON.parse(read('data/up-waterfall-supplemental-candidates.json'));
const source = JSON.parse(read('data/up-waterfalls.json')).waterfalls;
const state = JSON.parse(read('data/up-waterfall-geo-candidates.json')).features;
const matched = JSON.parse(read('data/up-waterfall-reconciliation.json'));
const queue = JSON.parse(read('data/up-waterfall-review-queue.json'));
const research = read('public/upper-peninsula-waterfalls/research/upper-eagle-river-ten-foot-falls/index.html');
const lower = read('public/upper-peninsula-waterfalls/eagle-river-falls/index.html');
const hub = read('public/upper-peninsula-waterfalls/index.html');
const sitemap = read('public/sitemap-up-waterfalls.xml');
const slug = '/upper-peninsula-waterfalls/research/upper-eagle-river-ten-foot-falls/';
const candidate = evidence.records.find(x=>x.id==='upper-eagle-river-ten-foot-falls');

function haversineMetres(a,b){
 const R=6371008.8,rad=Math.PI/180,la=a.lat*rad,lb=b.lat*rad;
 const dlat=lb-la,dlng=(b.lng-a.lng)*rad;
 const q=Math.sin(dlat/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin(dlng/2)**2;
 return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));
}

test('B65: independent waterfall is distinct from GIS #142 and coordinates disagree by 438 metres',()=>{
 assert.equal(evidence.schemaVersion,1);
 assert.equal(evidence.reviewed,'2026-11-03');
 assert.equal(evidence.records.length,1);
 assert.ok(candidate);
 assert.equal(candidate.notInStateGisNamedFeatureList,true);
 assert.equal(candidate.isSameAsCuratedGis142,false);
 assert.equal(candidate.closestExistingCuratedId,'eagle-river-falls');
 assert.equal(source.length,80);
 assert.equal(state.length,161);
 assert.equal(matched.counts.curatedTotal,80);
 assert.equal(matched.counts.exactIdMatched,69);
 assert.equal(matched.counts.pending,92);
 assert.equal(queue.counts.pendingGisFeatures,92);
 assert.equal(candidate.geography.points.length,2);
 assert.deepEqual(candidate.geography.points.map(x=>x.role),[
  'independent-firsthand-natural-falls-coordinate-not-parking',
  '2023-bureau-map-waterfall-listing-coordinate-not-certified-as-parking-or-falls'
 ]);
 const metres=haversineMetres(...candidate.geography.points);
 assert.ok(Math.abs(metres-438.3)<.1, 'published points differ by about 438m');
 assert.equal(candidate.geography.sourcePointDiscrepancyMetersApprox,438.3);
 const lowerRecord=source.find(x=>x.id==='eagle-river-falls');
 assert.equal(lowerRecord.gisObjectId,142);
 assert.ok(!source.some(x=>/ten-foot|upper-eagle-river/.test(x.id)));
 assert.ok(!state.some(x=>/ten-foot|upper eagle river/i.test(x.name)));
});

test('B65: only a noindex research page, no map stop or navigational masquerade',()=>{
 assert.equal(candidate.publication,'research-only');
 assert.equal(candidate.publicationEligible,false);
 assert.equal(candidate.publicMapEligible,false);
 assert.equal(candidate.shortlistEligible,false);
 assert.equal(candidate.routeAudit.destinationCoordinatesForDriving,false);
 assert.equal(candidate.routeAudit.routePolylineAuthorized,false);
 assert.equal(candidate.routeAudit.exactSiteParkingLegalStatus,'unverified');
 assert.equal(candidate.routeAudit.publicBankWalkingCorridor,'unverified');
 assert.equal(candidate.routeAudit.bankLandManager,'unverified');
 assert.equal(candidate.routeAudit.signedOfficialParkingArea,'unverified');
 assert.equal(candidate.routeAudit.segments.length,5);
 assert.ok(candidate.sources.length>=7);
 assert.equal(candidate.promotionEvidenceNeeded.length,4);
 assert.ok(!hub.includes('data-id="upper-eagle-river-ten-foot-falls"'));
 assert.ok(!sitemap.includes(slug));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/ten-foot-falls/'));
 assert.equal((sitemap.match(/<loc>/g)||[]).length,78);
 assert.match(research,/<meta name="robots" content="noindex,follow">/);
 assert.match(research,/VISITOR ROUTE NOT FULLY VERIFIED/);
 assert.match(research,/438 m/);
 assert.match(research,/47\.39735, -88\.28439/);
 assert.match(research,/47\.4000, -88\.2887/);
 assert.match(research,/not<\/strong> a site-specific authorization|site-specific authorization/);
 assert.match(research,/landowner|Landowner|riverbank|bank rights/);
 assert.match(research,/Lower Eagle River Falls/);
 assert.match(research,/Published|tourism|Tourism/i);
 assert.match(research,/Built by.*Chris Izworski/);
 assert.ok(!research.includes('data-parking-lat='));
 assert.ok(!research.includes('google.com/maps/dir/'));
 assert.ok(!research.includes('"@type":"TouristAttraction"'));
 assert.ok(!research.includes('"@type":"Place"'));
 assert.ok(!research.includes('href="https://maps.google.com/?q=47.'));
 const title=research.match(/<title>([^<]+)<\/title>/)?.[1];
 const description=research.match(/<meta name="description" content="([^"]+)"/)?.[1];
 assert.ok(title&&title.length<=60);
 assert.ok(description&&description.length<=158);
 assert.ok(research.includes('<link rel="canonical" href="https://chrisizworski.com'+slug+'">'));
 const first=research.indexOf('<script type="application/ld+json">')+'<script type="application/ld+json">'.length;
 const schema=JSON.parse(research.slice(first,research.indexOf('</script>',first)));
 const person=schema['@graph'].find(node=>node['@type']==='Person');
 const page=schema['@graph'].find(node=>node['@type']==='WebPage');
 assert.equal(person['@id'],'https://chrisizworski.com/#person');
 assert.equal(person.name,'Chris Izworski');
 assert.equal(page.author['@id'],person['@id']);
 assert.equal(page.publisher['@id'],person['@id']);
 assert.equal(page.dateModified,'2026-11-03');
});

test('B65: the existing bridge-side visitor guide distinguishes names without redirecting to research coordinates',()=>{
 assert.ok(lower.includes('id="upper-eagle-river-identity"'));
 assert.ok(lower.includes(slug));
 assert.match(lower,/Eagle River Bridge Park/);
 assert.match(lower,/which|Upper Eagle River Falls is not this waterfall/i);
 assert.match(lower,/dateModified":"2026-11-03"/);
 assert.ok(lower.includes('"@id":"https://chrisizworski.com/#person"'));
 assert.ok(lower.includes('<link rel="canonical" href="https://chrisizworski.com/upper-peninsula-waterfalls/eagle-river-falls/">'));
 assert.ok(sitemap.includes('<loc>https://chrisizworski.com/upper-peninsula-waterfalls/eagle-river-falls/</loc><lastmod>2026-11-12</lastmod>'));
 assert.ok(!sitemap.includes('/research/upper-eagle-river-ten-foot-falls/'));
 assert.ok(!source.some(x=>x.id==='upper-eagle-river-ten-foot-falls'));
});
