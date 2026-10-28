import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const manifest=JSON.parse(read("public/porcupine-mountains/routing-evidence.json"));
const trails=JSON.parse(read("public/porcupine-mountains/trail-reference.geojson"));
const roads=JSON.parse(read("public/porcupine-mountains/park-road-reference.geojson"));
const ski=JSON.parse(read("public/porcupine-mountains/ski-reference.geojson"));
test("official road and trail source inventory is measured, not invented",()=>{
 assert.equal(manifest.status,"geometry-not-navigable");
 assert.equal(manifest.audit.trailFeatures,819);
 assert.equal(manifest.audit.roadFeatures,296);
 assert.equal(manifest.audit.skiFeatures,40);
 assert.equal(manifest.audit.trailComponents5m,7);
 assert.ok(manifest.audit.roadComponents5m>=1);
 assert.equal(trails.features.length,819);
 assert.equal(ski.features.length,40);
 assert.ok(roads.features.length>=50);
 assert.equal(manifest.noPublicRouteTimes,true);
 assert.equal(manifest.noCrossingSafetyCertification,true);
 assert.match(manifest.sources.map,/Porcupine-Mountains/);
});
test("trail coverage discrepancies block named full-length route and ETA",()=>{
 const a=manifest.audit.knownRouteCoverageDiscrepancies;
 assert.equal(a.length,4);
 const esc=a.find(x=>x.name.includes("Escarpment"));
 assert.ok(esc.coverageRatio<0.2);
 assert.ok(a.every(x=>x.fullTrailClaimAllowed===false));
 assert.ok(a.some(x=>x.coverageRatio>1),"The source can overcount some name-defined trails, too");
});
test("visible geometry is always research source linework, never certified directions",()=>{
 for(const f of [...trails.features,...roads.features,...ski.features]){
  assert.equal(f.properties.routingCertified,false);
  assert.equal(f.properties.source,"official-source-geometry");
  assert.ok(["LineString","MultiLineString"].includes(f.geometry.type));
 }
 assert.ok(roads.features.some(x=>x.properties.seasonalRoadClosureRisk===true));
 assert.ok(roads.features.some(x=>x.properties.seasonalRoadClosureRisk===false));
});
test("no mile, crossing, or open-gate assertions in page's overlay source",()=>{
 const html=read("public/porcupine-mountains/index.html"),js=read("public/assets/porkies-route-evidence.js");
 assert.match(html,/porkies-route-evidence\.js/);
 assert.match(html,/id="porkies-trails-toggle"/);
 assert.match(html,/id="porkies-roads-toggle"/);
 assert.match(html,/id="porkies-ski-toggle"/);
 assert.match(html,/40 separate DNR ski-trail records/);
 assert.match(html,/id="route-evidence-status"/);
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(html,/unbridged crossings/);
 assert.match(js,/routingCertified!==false/);
 assert.match(js,/not a live trail-grooming/);
 assert.ok(!/route\/navigate|ride ETA|current traffic|current trail status/.test(html));
});
