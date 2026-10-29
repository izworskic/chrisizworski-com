import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const src=JSON.parse(read("public/porcupine-mountains/west-approach-evidence.json"));
const geo=JSON.parse(read("public/porcupine-mountains/west-approach-reference.geojson"));
const html=read("public/porcupine-mountains/index.html");
const js=read("public/assets/porkies-route-evidence.js");
test("MGF western corridor is complete, connected and independently road-name corroborated",()=>{
 assert.equal(src.status,"west-approach-source-crosswalk-not-road-route");
 assert.equal(src.sourceMGFPropertyReference,1475809);
 assert.equal(src.westRecords,27);
 assert.deepEqual(src.sourceNames,{"Presque Isle Rd":17,"Thomaston Rd":10});
 assert.equal(src.graphComponents.length,3);
 for(const n of src.graphComponents){assert.equal(n.components,1);assert.equal(n.endpoints,2);}
 assert.equal(src.northBoundaryRecords,3);
 assert.equal(src.scenicAreaAccessRecords,9);
 assert.ok(src.sourceLineworkMiles>=14&&src.sourceLineworkMiles<=17);
 assert.ok(src.sourceLineDistanceToParkingMeters>1200);
 assert.ok(src.nearestParkAccessCenterlineMeters>100);
 assert.equal(new Set(src.originalRoadIDs).size,27);
 assert.equal(geo.features.length,27);
});
test("MGF geometry cannot be mistaken for open highway, live closure or legal turn-by-turn",()=>{
 for(const f of geo.features){
  assert.equal(f.properties.notRoute,true);
  assert.equal(f.properties.mgfPR,1475809);
  assert.equal(f.properties.seasonalStatus,"not-live-verified");
  assert.ok(["Presque Isle Rd","Thomaston Rd"].includes(f.properties.name));
  assert.equal(f.geometry.type,"LineString");
 }
 assert.equal(src.crossParkThroughVehicleRouteCertified,false);
 assert.equal(src.pointToPointDrivingDirectionsCertified,false);
 assert.equal(src.seasonalRoadOpeningCertified,false);
 assert.equal(src.currentRoadStatus,"unverified");
 assert.match(src.mapDisplayRule,/does not|not/i);
 assert.match(src.visitorGuidance,/north from US-28/);
});
test("visible fallback labels alias, parking separation and official crossing caution",()=>{
 assert.match(html,/County Road 519 from US-28/);
 assert.match(html,/Thomaston Road/);
 assert.match(html,/Presque Isle Road/);
 assert.match(html,/27 connected road features/);
 assert.match(html,/1\.3 km/);
 assert.match(html,/id="porkies-west-toggle"/);
 assert.match(html,/id="west-access-status"/);
 assert.match(html,/noindex,follow/);
 assert.match(js,/west-approach-reference\.geojson/);
 assert.match(js,/mgfPR!==1475809/);
 assert.match(js,/No road-to-lot connection/);
});
