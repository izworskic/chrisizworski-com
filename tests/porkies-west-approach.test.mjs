import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const data=JSON.parse(read("public/porcupine-mountains/west-access-evidence.json"));
const html=read("public/porcupine-mountains/index.html");
test("DNR confirms the distinct CR519 western winter approach without granting east-to-west through travel",()=>{
 assert.match(data.officialDnr.park,/michigan.gov/);
 assert.ok(data.officialDnr.claims.some(x=>/County Road 519/.test(x)));
 assert.ok(data.officialDnr.claims.some(x=>/December 1/.test(x)));
 assert.match(data.routeRules.fromEastDuringWinter,/no verified through-park/i);
 assert.equal(data.routeRules.certifiedRoute,false);
 assert.equal(data.routeRules.liveGateStatus,null);
 assert.equal(data.routeRules.driveTimeMinutes,null);
});
test("source GIS has ten possible corridor centerlines but no ungrounded signed 519 classification",()=>{
 assert.equal(data.stateRoadGIS.sourceRoadName,"Presque Isle Rd");
 assert.equal(data.stateRoadGIS.sourceFeatureIds.length,10);
 assert.equal(new Set(data.stateRoadGIS.sourceFeatureIds).size,10);
 assert.match(data.stateRoadGIS.status,/not-individually-crosswalked/);
 assert.match(data.stateRoadGIS.note,/Do not equate/);
 assert.equal(data.lastMile.candidateParkingAssetId,841);
});
test("state road improvement announcement describes poor pavement, not confirmed road closure",()=>{
 assert.ok(data.officialRoadFunding.url.startsWith("https://www.michiganbusiness.org/press-releases/2026/08/"));
 assert.match(data.officialRoadFunding.note,/poor condition/);
 assert.match(data.officialRoadFunding.note,/not evidence construction or closure/);
 assert.match(html,/id="west-corridor-field-note"/);
 assert.match(html,/2 of 10/);
 assert.match(html,/not a current construction notice or closure/);
 assert.match(html,/Source crosswalk/);
 assert.match(html,/name="robots" content="noindex,follow"/);
});
