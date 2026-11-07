import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>fs.readFileSync(path,'utf8');
const evidence=JSON.parse(read('data/up-waterfall-chicagon-corridor-evidence.json'));
const proof=JSON.parse(read('data/up-waterfall-chicagon-corridor-proof.json'));
const reconciliation=JSON.parse(read('data/up-waterfall-reconciliation.json'));
const inventory=JSON.parse(read('data/up-waterfall-inventory-ledger.json'));
const reviews=JSON.parse(read('public/assets/up-waterfall-access-reviews.json'));
const queue=JSON.parse(read('data/up-waterfall-review-queue.json'));
const curated=JSON.parse(read('data/up-waterfalls.json')).waterfalls;
const sitemap=read('public/sitemap-up-waterfalls.xml');
const reviewPath='/upper-peninsula-waterfalls/research/chicagon-falls-private-corridor-review/';
const page=read('public'+reviewPath+'index.html');
const candidate=reconciliation.candidates.find(x=>x.gisObjectId===12);
const review=reviews.records.find(x=>x.gisObjectId===12);
const record=inventory.entries.find(x=>x.sourceId===12);
const priority=queue.candidates.find(x=>x.gisObjectId===12);
const pointMap=new Map(evidence.points.map(p=>[p.id,p]));
const rad=Math.PI/180;
function meters(a,b){
 const x=a.lat*rad,y=b.lat*rad,dlat=y-x,dlon=(b.lng-a.lng)*rad;
 const v=Math.sin(dlat/2)**2+Math.cos(x)*Math.cos(y)*Math.sin(dlon/2)**2;
 return 2*6371008.8*Math.asin(Math.min(1,Math.sqrt(v)));
}

test('B61: Python landmark distances do not become driving or trail waypoints',()=>{
 assert.equal(evidence.schemaVersion,1);assert.equal(proof.schemaVersion,1);
 assert.equal(evidence.gisObjectId,12);assert.equal(proof.gisObjectId,12);
 assert.equal(proof.reviewed,'2026-11-03');
 assert.equal(proof.sourcePoints.length,3);
 const a=pointMap.get('michigan-gis-12');
 assert.equal(a.lat,candidate.lat);assert.equal(a.lng,candidate.lng);
 assert.ok(Math.abs(meters(a,pointMap.get('secondary-gazetteer'))-proof.distances.statePointToSecondaryMeters)<.051);
 assert.ok(Math.abs(meters(a,pointMap.get('inconsistent-tourism-point'))-proof.distances.statePointToConflictingTourismMeters)<.051);
 assert.equal(proof.distances.statePointToSecondaryMeters,67.2);
 assert.equal(proof.distances.statePointToConflictingTourismMeters,4010.1);
 assert.equal(proof.sourceConflict.dnrPointManagedParcel,true);
 assert.equal(proof.sourceConflict.countyPlanScenicOwnerPrivate,true);
 assert.equal(proof.sourceConflict.resolved,false);
 for(const [key,v] of Object.entries(proof.visitorDecision))assert.equal(v,false,'must never synthesize visitor clearance: '+key);
 assert.ok(proof.sourcePoints.every(p=>/not-parking|do-not-route/.test(p.evidenceScope)));
});
test('B61: all three sources of truth block visitor promotion and public route',()=>{
 assert.equal(reconciliation.counts.curatedTotal,78;
 assert.equal(reconciliation.counts.exactIdMatched,69);
 assert.equal(reconciliation.counts.pending,92);
 assert.equal(inventory.curatedCount,78;
 assert.equal(inventory.unresolvedCandidates,92);
 assert.equal(reviews.records.length,97);
 assert.equal(queue.candidates.length,92);
 for(const rec of [candidate,record]){
  assert.equal(rec.curatedId,null);
 }
 assert.ok(!curated.some(x=>x.gisObjectId===12));
 assert.equal(candidate.publicationEligible,false);
 assert.equal(candidate.parkingVerified,false);
 assert.equal(candidate.publicAccessVerified,false);
 assert.equal(candidate.parcelReview.dnrManagedLand.parID,258918);
 assert.equal(candidate.parcelReview.dnrManagedLand.acreage,47.8);
 assert.equal(candidate.sourceConflictProof.countyPlanScenicPrivate,true);
 assert.equal(candidate.sourceConflictProof.ownershipScopesReconciled,false);
 assert.equal(candidate.sourceConflictProof.publicCorridorCleared,false);
 assert.equal(candidate.sourceConflictProof.sourceArtifact,'data/up-waterfall-chicagon-corridor-proof.json');
 assert.match(candidate.sourceNotes,/Private.*different scopes|private.*different scopes/i);
 assert.match(record.accessAssessment,/ParID 258918/);
 assert.equal(record.publication,'research-only');
 assert.equal(review.publicationEligible,false);
 assert.equal(review.dnrManagedFallsParcel.parID,258918);
 assert.equal(review.researchPage,reviewPath);
 assert.match(review.summary,/private camps/);
 assert.match(review.reviewLimitations,/compartment.*not a survey/);
 assert.equal(priority.reviewStage,'awaiting-new-authoritative-evidence');
 assert.equal(priority.publicationEligible,false);
 assert.ok(!sitemap.includes(reviewPath));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/chicagon-falls/'));
 const gates=review.routeAudit.segments;
 assert.equal(gates.length,6);
 assert.deepEqual(gates.map(g=>g.status),['verified-geography','documented-not-live','not-verified','not-verified','not-verified','not-verified']);
 assert.ok(gates.every(g=>g.source.startsWith('https://')&&g.finding.length>=50));
 for(const audit of [candidate.accessRouteAudit,review.routeAudit]){
  assert.equal(audit.outcome,'not-cleared');
  assert.equal(audit.destinationCoordinatesForDriving,false);
  assert.equal(audit.routePolylineAuthorized,false);
 }
 for(const key of ['county-recreation-owner','state-feature-land','road-commission','private-camps'])assert.ok(evidence.evidence.some(x=>x.key===key));
 assert.equal(evidence.nextAuthorityActions.length,3);
});
test('B61: Chicagon HTML is a research-only evidence page, not a destination or accidental SEO landing',()=>{
 assert.match(page,/<meta name="robots" content="noindex,follow">/);
 assert.match(page,/Built by Chris Izworski/);
 assert.match(page,/id="main"/);
 assert.match(page,/state-managed parcel/i);
 assert.match(page,/classified “Private”/);
 assert.match(page,/47.8-acre/);
 assert.match(page,/2019|2022/);
 assert.match(page,/Do not route visitors here yet/);
 assert.match(page,/Six pieces of evidence required/);
 assert.match(page,/Road Commission/);
 assert.match(page,/Fumee Falls/);
 assert.doesNotMatch(page,/google\.com\/maps\/dir\/|TouristAttraction/);
 assert.ok(!sitemap.includes('chicagon-falls-private-corridor-review'));
 assert.match(page,new RegExp('<link rel="canonical" href="https://chrisizworski.com'+reviewPath+'">'));
 const title=page.match(/<title>([^<]+)<\/title>/)?.[1];
 const desc=page.match(/<meta name="description" content="([^"]+)">/)?.[1];
 assert.ok(title&&title.length<=60,'title too long');
 assert.ok(desc&&desc.length<=158,'meta description too long');
 const tag='<script type="application/ld+json">';
 const start=page.indexOf(tag);
 assert.ok(start>0);
 const schema=JSON.parse(page.slice(start+tag.length,page.indexOf('</script>',start)));
 assert.equal(schema['@type'],'WebPage');
 assert.equal(schema.author['@id'],'https://chrisizworski.com/#person');
 assert.equal(schema.publisher['@id'],'https://chrisizworski.com/#person');
 assert.equal((page.match(/Read original evidence/g)||[]).length,6);
});
test('B61: Python generator output is deterministic and up to date',t=>{
 const proc=spawnSync('python3',['scripts/build-up-waterfall-chicagon-proof.py','--check'],{encoding:'utf8'});
 if(proc.error?.code==='ENOENT'){t.diagnostic('Python 3 not installed here; independent Node Haversine assertions run');return;}
 assert.equal(proc.status,0,proc.stderr||proc.stdout);
});
