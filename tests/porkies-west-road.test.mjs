import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {graphAudit} from "../lib/porkies/route-topology.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),"utf8"));
const ledger=read("data/porkies-west-road-ledger.json");
const m=read("public/porcupine-mountains/west-access-evidence.json");
const g=read("public/porcupine-mountains/west-road-reference.geojson");
const current=read("public/porcupine-mountains/park-road-reference.geojson");
const body=fs.readFileSync(path.join(ROOT,"public/porcupine-mountains/index.html"),"utf8");
const js=fs.readFileSync(path.join(ROOT,"public/assets/porkies-route-evidence.js"),"utf8");
test("DNR CR519 crosswalk does not equate MGF road name or claim real-time operations",()=>{
 assert.equal(ledger.sourceNameCrosswalk.officialParkAccessName,"County Road 519");
 assert.equal(ledger.sourceNameCrosswalk.mgfCenterlineName,"Presque Isle Rd");
 assert.equal(ledger.sourceNameCrosswalk.mgfPrincipalRouteId,1475809);
 assert.equal(ledger.currentRoadOpenStatus,"unknown");
 assert.equal(m.status,"western-approach-evidence-not-turn-by-turn");
 assert.equal(m.routesAllowed,false);
 assert.equal(m.ETAallowed,false);
 assert.equal(m.seasonal.presentAccessVerified,false);
 assert.equal(m.seasonal.parkParkingOpenVerified,false);
 assert.equal(m.parkLot.routeFromRoadCertified,false);
 assert.match(m.doNotConfuse,/Wakefield/);
});
test("recovered exact MGF Presque Isle Road centerlines form one 5m network, NOT a legal route",()=>{
 const west=g.features.filter(x=>x.properties.corridor==="mgf-presque-isle-west-road");
 assert.equal(west.length,17);
 assert.deepEqual(west.map(x=>x.properties.id).sort((a,b)=>a-b),[...ledger.westApproach.namedMgFeatureIds].sort((a,b)=>a-b));
 assert.equal(g.features.length,32);
 const topo=graphAudit(west,5,"name");
 assert.equal(topo.componentCount,1);
 assert.equal(topo.degreeOneNodes,2);
 assert.equal(m.presquIsleRoadNetworkAt5m,1);
 assert.ok(m.westRoadGeometryMiles>10&&m.westRoadGeometryMiles<17);
 assert.ok(m.westToBoundarySourceOffsetMeters<15);
 assert.ok(west.every(x=>x.properties.routingCertified===false&&x.properties.plowingVerified===false));
});
test("South Boundary road west of Pinkerton is exact signed-off source subset, not all seasonal closed",()=>{
 const west=g.features.filter(x=>x.properties.corridor==="west-of-pinkerton-south-boundary");
 assert.equal(west.length,15);
 const published=new Map(current.features.map(x=>[x.properties.id,x]));
 for(const f of west){
  assert.ok(ledger.westernSouthBoundary.featureIds.includes(f.properties.id));
  assert.equal(published.get(f.properties.id)?.properties.corridor,"south-boundary");
  assert.equal(f.properties.temporaryGateVerified,false);
 }
 assert.equal(current.features.filter(f=>f.properties.corridor==="south-boundary").length,59);
 assert.ok(current.features.some(f=>f.properties.corridor==="south-boundary"&&!ledger.westernSouthBoundary.featureIds.includes(f.properties.id)));
});
test("map shows explicit CR519 caveats in static HTML and cannot leak route promotion",()=>{
 assert.match(body,/id="porkies-west-toggle"/);
 assert.match(body,/The Michigan Geographic Framework labels/);
 assert.match(body,/not.*proof of plowing/i);
 assert.match(body,/DNR's seasonal South Boundary closure applies from Headquarters Road to the Pinkerton Trailhead/);
 assert.match(body,/noindex,follow/);
 assert.match(js,/WEST_BOUNDARY_IDS/);
 assert.match(js,/west-access-evidence\.json/);
 assert.match(js,/routingCertified!==false/);
 assert.match(js,/m\.routesAllowed!==false/);
 assert.doesNotMatch(js,/routeTimeMinutes|turnByTurnDirections|currentOpen=true/);
});
test("west map styling is distinct, but no layer represents currently open roads",()=>{
 assert.ok(js.includes('color:"#4a8c77"'));
 assert.ok(js.includes('color:"#ad4839"'));
 assert.ok(js.includes('color:"#1d735d"'));
 assert.ok(g.features.every(f=>f.properties.noThroughParkDrive===true));
});
