'use strict';
// B73: A historic USGS stream station is not a waterfall, MDOT project, or parking waypoint.
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=JSON.parse(read('data/up-waterfall-warner-coordinate-roles.json'));
const output=JSON.parse(read('data/up-waterfall-warner-coordinate-audit.json'));

test('B73 evidence keeps historic stream station separate from natural falls and highway work',()=>{
 assert.equal(source.batch,'B73');
 assert.equal(source.reviewDate,'2026-11-06');
 assert.equal(source.fall.stateGisObjectId,172);
 assert.deepEqual(source.fall.coordinates,[46.433378,-87.59896]);
 assert.equal(source.usgs.siteId,'USGS-04058240');
 assert.equal(source.usgs.observationEnd,'1976-08-30');
 assert.equal(source.usgs.recentContinuousStreamflow,false);
 assert.equal(source.usgs.coordinateMethod,'map-interpolated');
 assert.ok(source.usgs.source.startsWith('https://waterdata.usgs.gov/'));
 assert.equal(source.mdotProjects.length,2);
 for(const p of source.mdotProjects){
  assert.equal(p.coordinates,null,'MDOT press releases do not carry a surveyed worksite');
  assert.equal(p.waterfallIdentityEstablished,false);
 }
 assert.equal(source.mdotProjects[0].usgsSiteIdentityEstablished,false);
 assert.equal(source.parcel.proofOfCurrentOwner,false);
 assert.equal(source.parcel.proofOfPublicWalkingRight,false);
 assert.equal(source.outreach,'not-sent-no-official-reply');
});
test('B73 reproducible Python distance proof, never a trip distance or visitor arrival',()=>{
 const result=cp.spawnSync('python3',['scripts/audit-up-waterfall-warner-coordinate-roles.py','--check'],
  {cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.equal(output.method,'haversine-straight-line-geodesic-not-road-or-trail');
 assert.equal(output.tourismToWaterfallMetres,8.1);
 assert.equal(output.usgsCrossingToWaterfallMetres,475);
 assert.equal(output.legalVisitorArrivalResolved,false);
 assert.equal(output.routeToCreekOrUSGSPoint,false);
 assert.equal(output.mdotProjectGeometryResolved,false);
});
test('B73 research page explains the source-role distinction and retains noindex / no car directions',()=>{
 const html=read('public/upper-peninsula-waterfalls/research/warner-falls/index.html');
 assert.match(html,/<meta name="robots" content="noindex,follow">/);
 assert.match(html,/"dateModified":"2026-11-06"/);
 assert.match(html,/USGS station 04058240/);
 assert.match(html,/475 meters straight-line/);
 assert.match(html,/1970–1976/);
 assert.match(html,/map<\/em>/);
 assert.match(html,/must not be silently joined/i);
 assert.match(html,/MDOT Superior Region/);
 assert.match(html,/Marquette County Equalization/);
 assert.match(html,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
 assert.doesNotMatch(html,/google\.com\/maps\/dir\/|@type":"TouristAttraction"/i);
 assert.doesNotMatch(read('public/sitemap-up-waterfalls.xml'),/\/research\/warner-falls\//);
});
test('B73 is research-only and does not modify the 75/68/93 visitor inventory',()=>{
 const rec=JSON.parse(read('data/up-waterfall-reconciliation.json'));
 const row=rec.candidates.find(x=>x.gisObjectId===172);
 assert.ok(row);
 assert.equal(row.curatedId,null);
 assert.equal(row.publicationEligible,false);
 assert.deepEqual([rec.counts.curatedTotal,rec.counts.exactIdMatched,rec.counts.pending],[75,68,93]);
 for(const k of ['noVerifiedDrivingDestination','noCurrentParkingPermissionOrSafeShoulderWidth',
  'noContinuousLawfulFootRoute','notOpenNowClaim','sameCreekDoesNotProveSameProject'])assert.equal(source.access[k],true,k);
 assert.equal(source.access.curated,false);
 assert.equal(source.access.indexable,false);
 assert.equal(source.access.addNaturalOrUSGSPointToCarRouting,false);
});
