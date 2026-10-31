import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SOURCES,MANUAL_SOURCES,plainText,assessSource,checkSources} from "../scripts/check-porkies-access-sources.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const file=p=>fs.readFileSync(path.join(root,p),"utf8");
const json=p=>JSON.parse(file(p));
const proof=json("public/porcupine-mountains/access-proof.json");
const geometry=json("public/porcupine-mountains/west-road-reference.geojson");
const guide=file("public/porcupine-mountains/index.html");

const docs={
 "township-notice":"<article><h1>North County Road 519 will be closed…</h1><p>North County Road 519 will be closed from the intersection of 519 and M-28 due to a water main replacement project. Please use Johnson Road as the detour route to access the Industrial Park and Porcupine Mt. State Park. Please drive slowly on Johnson Road because residential traffic is present.</p></article>",
 "township-news":"<main>Township news listing: North County Road 519 will be closed from the intersection at M-28 for water-main work. Johnson Road is the detour. Old notice remains on the site. Upcoming meeting agenda and holiday schedule.</main>",
 "dnr-park":"<main>Winter closures and snowmobile access on park roads. South Boundary Road closes at Headquarters Road south to Pinkerton Trailhead. Access to Presque Isle Scenic Area remains available via County Road 519 just east of Wakefield. Reopening of interior roads depends on safe conditions.</main>",
 "gogebic-road-commission":"<main>The Gogebic County Road Commission issues a winter parking notice. NO PARKING on Gogebic County Roads and State Highways (outside the City Limits) from November 1st to April 15th between the hours of 2:00am-7:00am. Vehicles may be towed.</main>"
};
test("HTML normalizer preserves public content and excludes scripts",()=>{
 const t=plainText("<script>County Road 519 reopened</script><p>County Road 519 &amp; Johnson Road</p>");
 assert.equal(t,"County Road 519 & Johnson Road");
});

test("official published claims are detectable without granting a road-open verdict",async()=>{
 for(const source of SOURCES){
  const s=assessSource(source.id,docs[source.id]);
  assert.equal(s.reviewReasons.length,0,source.id);
  assert.equal(s.evidencePresent,true,source.id);
 }
 const r=await checkSources(async item=>docs[item.id],()=>new Date("2026-10-31T13:00:00.000Z"));
 assert.equal(r.checkedAt,"2026-10-31T13:00:00.000Z");
 assert.equal(r.conclusion,"monitored-county-notices-unchanged-dnr-manual-only");
 assert.equal(r.accessOpenVerified,false);
 assert.equal(r.verifiedParkingEntrance,false);
 assert.equal(r.mayEnableDirections,false);
 assert.equal(r.results.length,3);
 assert.equal(r.manualSources.length,1);
 assert.equal(r.manualSources[0].id,"dnr-park");
 assert.match(r.manualSources[0].reason,/HTTP 403/);
 assert.equal(assessSource("dnr-park",docs["dnr-park"]).reviewReasons.length,0);
});

test("new township reopening language only triggers manual review, never automatic opening",async()=>{
 const changing={...docs,
  "township-news":docs["township-news"]+" <article>County Road 519 has reopened to traffic following repairs; check the new municipal notice for exact signed access.</article>"};
 const r=await checkSources(async item=>changing[item.id]);
 assert.equal(r.conclusion,"manual-source-review-needed");
 assert.ok(r.reviewSignals.some(x=>x.id==="township-news"&&x.reason.includes("reopening")));
 assert.equal(r.mayEnableDirections,false);
});

test("missing current notice or site outage fails closed",async()=>{
 const missing=await checkSources(async item=>item.id==="township-notice"?"<p>The old township work-zone notice has been changed and has no verifiable closure details. This requires source review.</p>":docs[item.id]);
 assert.equal(missing.conclusion,"manual-source-review-needed");
 assert.ok(missing.reviewSignals.some(x=>x.id==="township-notice"));
 assert.equal(missing.accessOpenVerified,false);
 const outage=await checkSources(async item=>{if(item.id==="township-news")throw Error("timeout");return docs[item.id];});
 assert.equal(outage.conclusion,"official-source-check-incomplete");
 assert.equal(outage.mayEnableDirections,false);
 assert.ok(outage.results.some(x=>x.id==="township-news"&&x.availability==="unavailable"));
});

function parts(feature){
 return feature.geometry.type==="MultiLineString"?feature.geometry.coordinates:[feature.geometry.coordinates];
}
function minMeters(lon,lat,features){
 const cos=Math.cos(46.7*Math.PI/180),mx=lon*111320*cos,my=lat*111320;
 let shortest=Infinity,closestId=null;
 for(const f of features){
  for(const points of parts(f))for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];
   const ax=a[0]*111320*cos,ay=a[1]*111320,bx=b[0]*111320*cos,by=b[1]*111320;
   const dx=bx-ax,dy=by-ay,v=dx*dx+dy*dy;
   const t=v?Math.max(0,Math.min(1,((mx-ax)*dx+(my-ay)*dy)/v)):0;
   const d=Math.hypot(mx-ax-t*dx,my-ay-t*dy);
   if(d<shortest){shortest=d;closestId=f.properties.id;}
  }
 }
 return {distance:shortest,id:closestId};
}
test("measured road-to-parking separation uses government GIS records, never invented access",()=>{
 const p=proof.parkingAsset,{longitude,latitude}=p;
 const west=geometry.features.filter(x=>x.properties.corridor==="west-of-pinkerton-south-boundary");
 const main=geometry.features.filter(x=>x.properties.corridor==="mgf-presque-isle-west-road");
 assert.equal(west.length,15);assert.equal(main.length,17);
 const a=minMeters(longitude,latitude,west),b=minMeters(longitude,latitude,main);
 assert.ok(Math.abs(a.distance-1217)<2);
 assert.ok(Math.abs(b.distance-1316)<2);
 assert.equal(a.id,proof.lastMileAudit.westSouthBoundarySourceId);
 assert.equal(b.id,proof.lastMileAudit.presqueIsleRoadSourceId);
 assert.equal(proof.lastMileAudit.nearestReviewedWestSouthBoundaryCenterlineMetres,1217);
 assert.equal(proof.lastMileAudit.nearestReviewedPresqueIsleCenterlineMetres,1316);
 assert.equal(proof.lastMileAudit.legalTurnVerified,false);
 assert.equal(proof.lastMileAudit.lastLotEntranceVerified,false);
 assert.equal(proof.safeToIssueDirections,false);
 assert.equal(proof.state,"access-unverified-not-navigable");
});

test("visitor guide shows authoritative dates, the unknown last mile, winter shoulder rule and source fallback",()=>{
 assert.match(guide,/id="porkies-access-proof"/);
 assert.match(guide,/1\.2 km/);
 assert.match(guide,/not a walking or driving distance/);
 assert.match(guide,/September 22, 2026/);
 assert.match(guide,/Johnson Road/);
 assert.match(guide,/November 1 through April 15/);
 assert.match(guide,/2–7 a\.m\./);
 assert.match(guide,/gogebiccountyroadcommission\.org/);
 assert.match(guide,/access-proof\.json/);
 assert.match(guide,/noindex,follow/);
});
