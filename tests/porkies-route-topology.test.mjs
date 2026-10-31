import test from "node:test";
import assert from "node:assert/strict";
import {graphAudit,closestLine,roadGate,classifyRoad,parts,lengthMeters} from "../lib/porkies/route-topology.mjs";
const seg=(id,name,coords)=>({type:"Feature",id,properties:{OBJECTID:id,TrailNamePrimary:name,RDNAME:name},geometry:{type:"LineString",coordinates:coords}});
test("endpoint graph joins real contiguous lines and leaves disconnected corridors separate",()=>{
 const f=[seg(1,"A",[[-89.8,46.7],[-89.799,46.7]]),seg(2,"A",[[-89.799,46.7],[-89.798,46.7]]),seg(3,"B",[[-89.9,46.7],[-89.899,46.7]])];
 for(const tol of [3,5,10]){const s=graphAudit(f,tol);assert.equal(s.sourceFeatureCount,3);assert.equal(s.lineParts,3);assert.equal(s.componentCount,2);assert.equal(s.degreeOneNodes,4);}
});
test("at-grade geometry crossings are not assumed connected without endpoints",()=>{
 const f=[seg(1,"X",[[-89.8,46.7],[-89.78,46.7]]),seg(2,"Y",[[-89.79,46.69],[-89.79,46.71]])];
 assert.equal(graphAudit(f,10).componentCount,2,"No fake bridge/intersection based on line crossings");
});
test("unresolved gaps remain separate at strict thresholds and can join only at declared endpoint tolerance",()=>{
 const f=[seg(1,"A",[[-89.8,46.7],[-89.799,46.7]]),seg(2,"A",[[-89.7989,46.7],[-89.798,46.7]])];
 assert.equal(graphAudit(f,3).componentCount,2);
 assert.equal(graphAudit(f,10).componentCount,1);
});
test("nearest geometry measures line offset, not merely start-point proximity",()=>{
 const f=[seg(10,"Line",[[-89.82,46.7],[-89.8,46.7]])];
 const near=closestLine([-89.81,46.70005],f);
 assert.ok(near.meters>4&&near.meters<7);
 assert.equal(near.sourceId,10);
});
test("multi lines are decomposed separately and measured",()=>{
 const f={type:"Feature",id:1,properties:{OBJECTID:1,TrailNamePrimary:"A"},geometry:{type:"MultiLineString",coordinates:[[[0,0],[.001,0]],[[1,0],[1.001,0]]]}};
 assert.equal(parts(f).length,2);
 assert.ok(lengthMeters(f.geometry.coordinates[0])>75);
 assert.equal(graphAudit([f],5).componentCount,2);
});
test("official road geometry classification never upgrades seasonal restriction into live opening",()=>{
 for(const name of ["S Boundary Rd","107th Engineers Memorial Hwy","Summit Peak Road"]){
  const x=classifyRoad({properties:{RDNAME:name}});
  assert.equal(roadGate(x,"winter").routeEligible,false);
  assert.equal(roadGate(x,"spring").routeEligible,false);
  assert.equal(roadGate(x,"november").routeEligible,false);
 }
 assert.equal(classifyRoad({properties:{RDNAME:"Old Boundary Rd"}}),"unclassified");
 assert.equal(roadGate("county-519","summer").routeEligible,false,"A centerline is never an operational road clearance");
});
test("zero-length and invalid geometry are rejected, not magically bridged",()=>{
 assert.equal(graphAudit([seg(1,"A",[[-89.8,46.7],[-89.8,46.7]])],5).lineParts,0);
 assert.throws(()=>graphAudit([seg(1,"A",[[-89.8,46.7],[null,46.7]])],5),/Invalid/);
});
