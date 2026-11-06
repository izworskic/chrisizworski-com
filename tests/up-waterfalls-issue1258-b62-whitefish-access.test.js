import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const evidence=JSON.parse(read('data/up-waterfall-whitefish-dnr-evidence.json'));
const proof=JSON.parse(read('data/up-waterfall-whitefish-dnr-proof.json'));
const rec=JSON.parse(read('data/up-waterfall-reconciliation.json'));
const ledger=JSON.parse(read('data/up-waterfall-inventory-ledger.json'));
const reviews=JSON.parse(read('public/assets/up-waterfall-access-reviews.json'));
const queue=JSON.parse(read('data/up-waterfall-review-queue.json'));
const curated=JSON.parse(read('data/up-waterfalls.json')).waterfalls;
const sitemap=read('public/sitemap-up-waterfalls.xml');
const slug='/upper-peninsula-waterfalls/research/whitefish-falls-dnr-access-review/';
const html=read('public'+slug+'index.html');
const candidate=rec.candidates.find(x=>x.gisObjectId===191);
const entry=ledger.entries.find(x=>x.sourceId===191);
const review=reviews.records.find(x=>x.gisObjectId===191);
const inQueue=queue.candidates.find(x=>x.gisObjectId===191);
const pts=new Map(evidence.points.map(p=>[p.id,p]));

function hav(a,b) {
 const rad=Math.PI/180,R=6371008.8,latA=a.lat*rad,latB=b.lat*rad;
 const dlat=latB-latA,dlng=(b.lng-a.lng)*rad;
 const q=Math.sin(dlat/2)**2+Math.cos(latA)*Math.cos(latB)*Math.sin(dlng/2)**2;
 return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));
}

test('B62: DNR access at falls is A-02-004 and never confused with A-02-010 upstream',()=>{
 assert.equal(evidence.schemaVersion,1);assert.equal(proof.schemaVersion,1);
 assert.equal(evidence.reviewed,'2026-11-03');assert.equal(proof.reviewed,'2026-11-03');
 assert.equal(evidence.gisObjectId,191);assert.equal(proof.gisObjectId,191);
 assert.equal(evidence.points.length,5);assert.equal(proof.pointsCompared,5);
 assert.deepEqual(proof.distances.map(d=>d.right),[
  'dnr-access-a-02-004','gnis-derived-whitefish','dnr-access-a-02-010','unrelated-township-park'
 ]);
 const expected=[24.3,171.6,7540.5,4911.7];
 assert.deepEqual(proof.distances.map(d=>d.straightLineMeters),expected);
 for(const pair of proof.distances)assert.ok(Math.abs(hav(pts.get(pair.left),pts.get(pair.right))-pair.straightLineMeters)<.051);
 const byId=new Map(evidence.dnrFacilities.map(s=>[s.legacyId,s]));
 assert.deepEqual([...byId.keys()],['A-02-004','A-02-010']);
 assert.equal(byId.get('A-02-004').name,'Whitefish River');
 assert.equal(byId.get('A-02-010').name,'West Branch of Whitefish River');
 assert.equal(byId.get('A-02-004').sourceObjectId,6286);
 assert.equal(byId.get('A-02-010').sourceObjectId,6285);
 assert.equal(byId.get('A-02-004').carryDown,true);
 assert.equal(byId.get('A-02-004').carryDownLaunches,1);
 assert.equal(byId.get('A-02-004').rampLanes,0);
 assert.equal(byId.get('A-02-004').vehicleOnlyParking,null,'unknown cannot be represented as zero/available');
 assert.equal(byId.get('A-02-004').trailerParking,null);
 assert.equal(proof.identity.upstreamDifferentBoatAccessId,'A-02-010');
 assert.equal(proof.identity.nearbyCarryDownVehicleParkingUnknown,true);
 assert.ok(pts.size===5&&[...pts.values()].every(p=>p.navigationAuthorized===false));
});

test('B62: public water-access land is official but waterfall sightseeing route not cleared',()=>{
 assert.ok(candidate&&entry&&review&&inQueue);
 assert.equal(rec.counts.curatedTotal,76);assert.equal(rec.counts.exactIdMatched,69);
 assert.equal(rec.counts.pending,92);assert.equal(ledger.curatedCount,76);
 assert.equal(ledger.unresolvedCandidates,92);assert.equal(queue.candidates.length,92);
 assert.equal(reviews.records.length,97);
 assert.equal(candidate.curatedId,null);assert.equal(entry.curatedId,null);
 assert.ok(!curated.some(p=>p.gisObjectId===191));
 assert.equal(candidate.publicationEligible,false);
 assert.equal(candidate.publicAccessVerified,false);
 assert.equal(candidate.parkingVerified,false);
 assert.equal(candidate.dnrLandAndAccessProof.parcelId,1122650);
 assert.equal(candidate.dnrLandAndAccessProof.parcelAcres,38);
 assert.equal(candidate.dnrLandAndAccessProof.officialNearFallsAccessId,'A-02-004');
 assert.equal(candidate.dnrLandAndAccessProof.nearFallsSiteParkingCount,'unknown-not-zero');
 assert.equal(candidate.dnrLandAndAccessProof.wrongUpstreamAccessId,'A-02-010');
 assert.equal(candidate.dnrLandAndAccessProof.allFallsParkingTrailViewpointGatesPassed,false);
 assert.equal(evidence.dnrParcel.ProjectName,'PUBLIC WATER ACCESS SITE');
 assert.equal(evidence.dnrParcel.DivisionDepartment,'Parks and Recreation Division');
 assert.equal(evidence.dnrParcel.ParID,1122650);
 assert.equal(review.researchPage,slug);
 assert.equal(review.publicationEligible,false);
 assert.equal(review.routeAudit.outcome,'not-cleared');
 assert.equal(review.routeAudit.destinationCoordinatesForDriving,false);
 assert.equal(review.routeAudit.routePolylineAuthorized,false);
 assert.equal(review.routeAudit.segments.length,6);
 assert.ok(review.sourceLinks.length>=6);
 assert.equal(inQueue.reviewStage,'awaiting-new-authoritative-evidence');
 assert.equal(inQueue.publicationEligible,false);
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/whitefish-falls/'));
 assert.ok(!sitemap.includes(slug));
 for(const [key,v] of Object.entries(proof.visitorDecision)){
  if(!key.endsWith('Confirmed')&&!key.endsWith('Corroborated'))assert.equal(v,false,'visitor gate '+key);
 }
 assert.equal(proof.visitorDecision.stateManagedWaterAccessLandAtFallsConfirmed,true);
 assert.equal(proof.visitorDecision.dnrCarryDownNearFallsConfirmed,true);
 assert.equal(evidence.bureauEvidence.specificRoadTurn,null);
 assert.equal(evidence.bureauEvidence.designatedVehicleParking,null);
});

test('B62: source-backed research page is noindex, accessible, non-navigational and name-safe',()=>{
 assert.match(html,/<meta name="robots" content="noindex,follow">/);
 assert.match(html,/Built by Chris Izworski/);
 assert.match(html,/<main class="wf-wrap" id="main">/);
 assert.match(html,/ROUTE UNVERIFIED/);
 assert.match(html,/24 m/);
 assert.match(html,/A-02-004/);
 assert.match(html,/A-02-010/);
 assert.match(html,/7.5 km/);
 assert.match(html,/38-acre/);
 assert.match(html,/parking fields are unknown/);
 assert.match(html,/DNR.*carry-down|carry-down.*DNR/i);
 assert.match(html,/Laughing Whitefish Falls State Park/);
 assert.doesNotMatch(html,/TouristAttraction|google\.com\/maps\/dir/);
 assert.equal((html.match(/class="wf-gate"/g)||[]).length,6);
 assert.equal((html.match(/class="wf-source-card"/g)||[]).length,4);
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
 const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
 assert.ok(title&&title.length<=60);
 assert.ok(description&&description.length<=158);
 const canonical='https://chrisizworski.com'+slug;
 assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'));
 const begin=html.indexOf('<script type="application/ld+json">')+'<script type="application/ld+json">'.length;
 const ld=JSON.parse(html.slice(begin,html.indexOf('</script>',begin)));
 assert.equal(ld['@type'],'WebPage');
 assert.equal(ld.author['@id'],'https://chrisizworski.com/#person');
 assert.equal(ld.publisher['@id'],'https://chrisizworski.com/#person');
 assert.equal(ld.dateModified,'2026-11-03');
});

test('B62: checked-in DNR distances match deterministic pure Python',t=>{
 const p=spawnSync('python3',['scripts/build-up-waterfall-whitefish-proof.py','--check'],{encoding:'utf8'});
 if(p.error?.code==='ENOENT'){t.diagnostic('Python3 unavailable on runner, independent Node Haversine was still checked');return;}
 assert.equal(p.status,0,p.stderr||p.stdout);
});
