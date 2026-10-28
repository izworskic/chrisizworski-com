import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>JSON.parse(fs.readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const source=read("data/porkies-junction-crossing-ledger.json");
const report=read("public/porcupine-mountains/crossing-evidence.json");
const html=fs.readFileSync(new URL("../public/porcupine-mountains/index.html",import.meta.url),"utf8");
test("all 23 published relationships retain original DNR source and absolute route denial",()=>{
 assert.equal(source.records.length,23);
 assert.equal(report.registry.length,23);
 assert.deepEqual(report.registry.map(x=>x.id),source.records.map(x=>x.id));
 for(const x of report.registry){
   assert.equal(x.coordinatePublished,false);
   assert.equal(x.routeEligible,false);
   assert.equal(x.bridgeOrFord,"unknown");
   assert.ok(x.source.startsWith("https://"));
   assert.equal(x.location,undefined);
   assert.equal(x.coordinate,undefined);
 }
});
test("priority matching distinguishes exact GIS lines, near river banks, and verified DNR text",()=>{
 assert.equal(report.priorityEvidence.length,5);
 const q=Object.fromEntries(report.priorityEvidence.map(x=>[x.ledgerId,x]));
 assert.equal(q["beaver-littlecarp-ford"].lineIntersections,1);
 assert.equal(q["govtpeak-uppercarp-cross"].lineIntersections,1);
 assert.equal(q["presque-west"].lineIntersections,0);
 assert.equal(q["pinkerton-creek"].lineIntersections,1);
 for(const p of report.priorityEvidence){
   assert.equal(p.coordinatePublished,false);
   assert.match(p.navigationStatus,/blocked/);
 }
 assert.match(q["govtpeak-uppercarp-cross"].comment,/Carp River Inlet/);
 assert.match(q["pinkerton-creek"].comment,/NOT explicitly/);
});
test("state GIS candidate count is disclosed but no candidate coordinates leak into public JSON",()=>{
 assert.equal(report.status,"crossing-research-not-route-approved");
 assert.equal(report.counts.sourceTrails,819);
 assert.equal(report.counts.sourceStreams,1190);
 assert.equal(report.counts.geometricIntersections,86);
 assert.equal(report.counts.nearLineCandidates,88);
 assert.equal(report.counts.totalCandidates,174);
 assert.equal(report.safety.officialCrossingCoordinatesCertified,false);
 assert.equal(report.safety.anyAutoRouteAcrossStream,false);
 assert.equal(report.safety.fieldVerificationRequired,true);
 const raw=JSON.stringify(report);
 assert.doesNotMatch(raw,/allCandidates|priorityRiverMatches|"location":\[/);
});
test("historical 2016 washout is never promoted to a current status or ford",()=>{
 const x=source.records.find(x=>x.id==="bigcarp-2016-bridge");
 assert.equal(x.status,"historical-only");
 assert.equal(x.referenceMiles,null);
 assert.equal(x.routeEligible,false);
 assert.ok(x.note.includes("not evidence")||x.note.includes("Not evidence"));
 assert.match(report.safety.historicalBigCarpBridgeStatus,/2016/);
});
test("visitor guide is readable without Javascript and prohibits inferred crossing",()=>{
 assert.match(html,/id="crossings"/);
 assert.match(html,/Beaver Creek \/ Little Carp River/);
 assert.match(html,/Government Peak \/ upper Carp River/);
 assert.match(html,/Presque Isle waterfalls/);
 assert.match(html,/Big Carp River bridge/);
 assert.match(html,/No automated through-route/);
 assert.match(html,/name="robots" content="noindex,follow"/);
});
