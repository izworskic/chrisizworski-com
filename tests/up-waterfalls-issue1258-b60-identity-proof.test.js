import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const R=JSON.parse(read('data/up-waterfall-reconciliation.json'));
const L=JSON.parse(read('data/up-waterfall-inventory-ledger.json'));
const V=JSON.parse(read('public/assets/up-waterfall-access-reviews.json'));
const Q=JSON.parse(read('data/up-waterfall-review-queue.json'));
const S=JSON.parse(read('data/up-waterfall-identity-evidence.json'));
const D=JSON.parse(read('data/up-waterfall-identity-calculations.json'));
const sitemap=read('public/sitemap-up-waterfalls.xml');
const page=path=>read('public/upper-peninsula-waterfalls/research/'+path+'/index.html');
const meters=(a,b)=>{
 const rad=Math.PI/180,R=6371008.8,la=a.lat*rad,lb=b.lat*rad;
 const q=Math.sin((lb-la)/2)**2+Math.cos(la)*Math.cos(lb)*Math.sin((b.lng-a.lng)*rad/2)**2;
 return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));
};
test('B60: point matches are reproducible Haversine comparisons, never parking or visitor permissions',()=>{
 assert.equal(S.schemaVersion,1);assert.equal(D.schemaVersion,1);
 assert.equal(S.reviewed,'2026-11-03');assert.equal(D.reviewed,S.reviewed);
 assert.deepEqual(D.clusters.map(c=>c.slug),['upper-silver','mill-pond','alger']);
 for(const cluster of D.clusters){
  const original=S.clusters.find(c=>c.slug===cluster.slug);
  const points=new Map(original.points.map(x=>[x.id,x]));
  assert.equal(cluster.publicRouteCleared,false);
  assert.equal(cluster.parkingVerified,false);
  assert.equal(cluster.publicationEligible,false);
  for(const p of cluster.pairs){
   assert.ok(points.has(p.left)&&points.has(p.right));
   assert.ok(Math.abs(meters(points.get(p.left),points.get(p.right))-p.straightLineMeters)<0.051);
  }
 }
 const silver=D.clusters.find(c=>c.slug==='upper-silver').pairs.map(c=>c.straightLineMeters);
 assert.deepEqual(silver,[150.7,121,12409.9]);
 const mill=D.clusters.find(c=>c.slug==='mill-pond').pairs.map(c=>c.straightLineMeters);
 assert.deepEqual(mill,[496.4,884.2,387.8]);
 assert.deepEqual(D.clusters.find(c=>c.slug==='alger').pairs.map(c=>c.straightLineMeters),[42.3]);
 assert.ok(silver[2]>12000,'the remote Herman Upper Silver waterfall cannot be the nearby Lower Silver picnic upper chute');
});
test('B60: unresolved access gates stay blocked across ledger, queue and research-only map popup data',()=>{
 assert.equal(R.counts.curatedTotal,79);
 assert.equal(R.counts.exactIdMatched,69);
 assert.equal(R.counts.pending,92);
 assert.equal(L.curatedCount,79);
 assert.equal(L.unresolvedCandidates,92);
 assert.equal(Q.candidates.length,92);
 assert.equal(V.records.length,97);
 for(const oid of [8,68,213]){
  const source=R.candidates.find(x=>x.gisObjectId===oid);
  const ledger=L.entries.find(x=>x.sourceId===oid);
  const review=V.records.find(x=>x.gisObjectId===oid);
  const queue=Q.candidates.find(x=>x.gisObjectId===oid);
  assert.ok(source&&ledger&&review&&queue);
  assert.equal(source.curatedId,null);
  assert.equal(ledger.curatedId,null);
  assert.equal(review.publicationEligible,false);
  assert.equal(queue.publicationEligible,false);
  assert.equal(queue.reviewStage,'awaiting-new-authoritative-evidence');
  assert.equal(review.geographicIdentityProof.sourceArtifact,'data/up-waterfall-identity-calculations.json');
  assert.ok(!sitemap.includes(review.researchPage||'/research/nonexistent'));
 }
 for(const oid of [68,213]){
  const r=R.candidates.find(x=>x.gisObjectId===oid);
  const v=V.records.find(x=>x.gisObjectId===oid);
  assert.equal(r.publicAccessVerified,false);assert.equal(r.parkingVerified,false);
  assert.equal(r.publicationEligible,false);
  assert.equal(r.accessRouteAudit.outcome,'not-cleared');
  assert.equal(r.accessRouteAudit.destinationCoordinatesForDriving,false);
  assert.equal(r.accessRouteAudit.routePolylineAuthorized,false);
  assert.equal(r.accessRouteAudit.segments.length,6);
  assert.equal(v.routeAudit.outcome,'not-cleared');
  assert.equal(v.routeAudit.segments.length,6);
  assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);
  assert.equal(v.routeAudit.routePolylineAuthorized,false);
  assert.equal(v.sourceLinks.length,4);
 }
 const upper=R.candidates.find(x=>x.gisObjectId===68);
 assert.match(upper.sourceNotes,/12.4 km south/);
 assert.match(upper.sourceNotes,/independent/);
 assert.match(upper.outstandingGate,/land manager/);
 const lower=R.candidates.find(x=>x.gisObjectId===110);
 assert.equal(lower.curatedId,'lower-silver-falls','do not repoint curated lower picnic card to GIS 68');
 const alger=R.candidates.find(x=>x.gisObjectId===213);
 assert.match(alger.sourceNotes,/No safe parking options|no safe parking options/);
 assert.match(alger.outstandingGate,/MDOT/);
 const mill=R.candidates.find(x=>x.gisObjectId===8);
 assert.equal(mill.geographicIdentityProof.aliasesResolved,false);
 assert.match(mill.sourceNotes,/496 metres/);
});
test('B60: new editorial research pages are accessible, noindex and never become driving instructions',()=>{
 for(const [oid,slug] of [[68,'upper-silver-falls-herman-geographic-review'],[213,'alger-falls-highway-parking-review']]){
  const r=V.records.find(x=>x.gisObjectId===oid);
  assert.equal(r.researchPage,'/upper-peninsula-waterfalls/research/'+slug+'/');
  const html=page(slug);
  assert.match(html,/<meta name="robots" content="noindex,follow">/);
  assert.match(html,/NOT CLEARED FOR PUBLIC WATERFALL NAVIGATION/);
  assert.match(html,/Built by Chris Izworski/);
  assert.match(html,/id="main"/);
  assert.match(html,/Six access checkpoints/);
  assert.ok(!html.includes('google.com/maps/dir'));
  assert.ok(!sitemap.includes(slug));
  const canonical='https://chrisizworski.com'+r.researchPage;
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'));
  const tag='<script type="application/ld+json">';
  const start=html.indexOf(tag);
  assert.ok(start>0);
  const schema=JSON.parse(html.slice(start+tag.length,html.indexOf('</script>',start)));
  assert.equal(schema['@type'],'WebPage');
  assert.equal(schema.author['@id'],'https://chrisizworski.com/#person');
  assert.equal(schema.publisher['@id'],'https://chrisizworski.com/#person');
  assert.ok(!html.includes('TouristAttraction'));
  assert.equal((html.match(/Original evidence for this checkpoint/g)||[]).length,6);
 }
 const upper=page('upper-silver-falls-herman-geographic-review');
 assert.match(upper,/12.4 km/);
 assert.match(upper,/151 m/);
 const alger=page('alger-falls-highway-parking-review');
 assert.match(alger,/no safe parking options/i);
 assert.match(alger,/Wagner Falls/);
 const mill=page('mill-pond-falls-sundholm-creek-identity-review');
 assert.match(mill,/Python Haversine geodesic audit/);
 assert.match(mill,/496 metres/);
 assert.match(mill,/884 metres/);
 assert.match(mill,/388 metres/);
 assert.match(mill,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
});
test('B60: Python source regeneration matches checked-in identity proof',t=>{
 const child=spawnSync('python3',['scripts/build-up-waterfall-identity-proof.py','--check'],{encoding:'utf8'});
 if(child.error?.code==='ENOENT'){t.diagnostic('No Python3 interpreter on runner; JS independent geodesic math already checked');return;}
 assert.equal(child.status,0,child.stderr||child.stdout);
});
