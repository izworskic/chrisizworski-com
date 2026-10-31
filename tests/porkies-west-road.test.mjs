import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {graphAudit} from "../lib/porkies/route-topology.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const text=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const require=createRequire(import.meta.url);
const ledger=read("data/porkies-west-road-ledger.json");
const audit=read("public/porcupine-mountains/west-road-evidence.json");
const legacy=read("public/porcupine-mountains/west-access-evidence.json");
const geometry=read("public/porcupine-mountains/west-road-reference.geojson");
const prior=read("public/porcupine-mountains/park-road-reference.geojson");
const guide=text("public/porcupine-mountains/index.html");
const ui=text("public/assets/porkies-route-evidence.js");
const parking=require("../public/assets/porkies-access-map.js");
const points=read("public/porcupine-mountains/access-points.json").points;

test("reviewed west road traces are exactly the 17+15 official-source GIS records, not navigation",()=>{
 assert.equal(geometry.type,"FeatureCollection");
 assert.equal(geometry.features.length,32);
 const west=geometry.features.filter(f=>f.properties.corridor==="mgf-presque-isle-west-road");
 const boundary=geometry.features.filter(f=>f.properties.corridor==="west-of-pinkerton-south-boundary");
 assert.equal(west.length,17);
 assert.equal(boundary.length,15);
 assert.deepEqual(west.map(f=>f.properties.id).sort((a,b)=>a-b),[...ledger.westApproach.namedMgFeatureIds].sort((a,b)=>a-b));
 assert.deepEqual(boundary.map(f=>f.properties.id).sort((a,b)=>a-b),[...ledger.westernSouthBoundary.featureIds].sort((a,b)=>a-b));
 assert.equal(graphAudit(west,5,"name").componentCount,1);
 assert.equal(graphAudit(west,5,"name").degreeOneNodes,2);
 assert.equal(prior.features.filter(f=>f.properties.corridor==="south-boundary").length,59);
 for(const f of geometry.features){
  assert.equal(f.properties.routingCertified,false);
  assert.equal(f.properties.temporaryGateVerified,false);
  assert.equal(f.properties.plowingVerified,false);
  assert.equal(f.properties.noThroughParkDrive,true);
 }
 assert.equal(audit.westRoadFeatureCount,17);
 assert.equal(audit.westSouthBoundaryFeatureCount,15);
 assert.equal(audit.westToBoundarySourceOffsetMeters,0);
 assert.equal(audit.parkLot.routeFromRoadCertified,false);
 assert.equal(audit.routesAllowed,false);
 assert.equal(audit.ETAallowed,false);
});

test("township work zone is source-linked, never silently treated as reopened",()=>{
 assert.equal(audit.sources.wakefieldTownshipNotice,"https://wakefieldtownship.com/north-county-road-519-will-be-closed/");
 assert.equal(audit.workZone.sourceNoticeDate,"2026-09-22");
 assert.equal(audit.workZone.townshipNamedDetour,"Johnson Road");
 assert.equal(audit.workZone.reopeningVerified,false);
 assert.equal(audit.workZone.turnByTurnVerified,false);
 assert.equal(audit.workZone.googleDrivingLinksToPresqueSuppressed,true);
 assert.equal(legacy.townshipWorkZone.automaticDrivingLinksAllowed,false);
 assert.equal(legacy.townshipWorkZone.verifiedReopening,false);
 assert.equal(ledger.allowTurnByTurn,false);
 assert.equal(ledger.currentRoadOpenStatus,"unknown");
 const p=points.find(x=>x.id==="presque"); assert.ok(p);
 for(const date of ["2026-09-22","2026-10-31","2027-01-15","2027-07-15"]){
  for(const origin of ["west","east","inpark"])
   assert.equal(parking.eligibility(p,date,origin,"car").canDirect,false,date+"/"+origin);
 }
 assert.match(parking.eligibility(p,"2027-07-15","west","car").notice,/Johnson Road/);
 assert.equal(parking.eligibility(p,"2026-09-21","west","car").canDirect,true,"earlier historical dates are not rewritten as part of a later construction notice");
});

test("road overlay remains opt-in, fail-closed and legible without JavaScript",()=>{
 assert.match(guide,/id="porkies-west-toggle"/);
 assert.match(guide,/id="west-corridor-field-note"/);
 assert.match(guide,/17 connected Presque Isle Road line records/);
 assert.match(guide,/15 western South Boundary source segments/);
 assert.match(guide,/wakefieldtownship\.com\/north-county-road-519-will-be-closed/);
 assert.match(guide,/September 22, 2026 township roadwork notice/);
 assert.match(guide,/id="parking-map"/);
 assert.match(guide,/name="robots" content="noindex,follow"/);
 assert.match(ui,/async function loadWest/);
 assert.match(ui,/west-road-evidence\.json/);
 assert.match(ui,/audit\.routesAllowed!==false/);
 assert.match(ui,/westEvidence=geo/);
 assert.match(ui,/porkies-west-evidence/);
 assert.match(ui,/westStyle/);
 assert.doesNotMatch(ui,/turnByTurnDirections|routeTimeMinutes|trafficStatus==="open"/);
});
