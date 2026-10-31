import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const recon=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const source=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const publicReviews=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const curated=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const distance=(a,b,c,d)=>{const r=x=>x*Math.PI/180;const aa=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 6371*2*Math.asin(Math.sqrt(aa));};

test('batch 27 keeps each candidate research-only, source-ledger linked, and absent from public visitor publication',()=>{
 assert.equal(recon.candidates.length,161); assert.equal(curated.length,63);
 for(const id of [190,191,215]){
  const g=recon.candidates.find(x=>x.gisObjectId===id),s=source.entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===id),u=publicReviews.records.find(x=>x.gisObjectId===id);
  assert.ok(g&&s&&u,'missing source '+id);
  assert.equal(g.curatedId,null);assert.equal(g.publicGuide,null);assert.equal(g.publicationEligible,false);
  assert.equal(g.reconciliation,'pending-identity-and-access-research');
  assert.equal(s.publication,'research-only');assert.equal(s.reviewBatch,'27');assert.equal(s.curatedId,null);
  assert.equal(u.publicationEligible,false); assert.equal(u.routeAudit.outcome,'not-cleared');
  assert.equal(u.routeAudit.destinationCoordinatesForDriving,false);
  assert.equal(u.routeAudit.routePolylineAuthorized,false);
  assert.equal(u.routeAudit.segments.length,6);
  assert.ok(g.sourceLinks.length>=3);
  assert.ok(u.sourceLinks.every(v=>v.url.startsWith('https://')));
  assert.ok(queue.candidates.some(v=>v.gisObjectId===id&&v.publicationEligible===false&&v.sourceCount>=3));
 }
 assert.equal(queue.counts.pendingGisFeatures,103);
 assert.equal(queue.counts.matchedGisFeatures,58);
 assert.equal(queue.batches.length,13);
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/hunters-brooks-falls/'));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/whitefish-falls/'));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/big-garlic-falls/'));
 assert.ok(!hub.includes('data-gis-oid="190"')&&!hub.includes('data-gis-oid="191"')&&!hub.includes('data-gis-oid="215"'));
});
test('batch 27 disambiguates Whitefish and Big Garlic source coordinates instead of inventing parking',()=>{
 const a=recon.candidates.find(x=>x.gisObjectId===191),b=recon.candidates.find(x=>x.gisObjectId===215);
 assert.ok(distance(a.lat,a.lng,46.218839,-87.051534)<.2);
 assert.ok(distance(a.lat,a.lng,46.2122,-86.9867)>4.8);
 assert.ok(distance(b.lat,b.lng,46.68166,-87.57340)<.1);
 assert.ok(distance(b.lat,b.lng,46.66763,-87.61922)>3.8);
 assert.match(b.disposition,/probable-lower-big-garlic/);
 assert.match(b.sourceNotes,/Little Garlic Falls spur/i);
 const h=recon.candidates.find(x=>x.gisObjectId===190);
 assert.match(h.sourceNotes,/Escanaba River/);
 assert.match(h.outstandingGate,/farther-upstream DNR fishing access/i);
});
