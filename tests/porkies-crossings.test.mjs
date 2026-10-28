import test from "node:test";
import assert from "node:assert/strict";
import {candidates,crossingPolicy} from "../lib/porkies/crossing-candidates.mjs";
const line=(id,name,coords,water=false)=>({type:"Feature",properties:water?{OBJECTID:id,GNIS_Name:name}:{OBJECTID:id,TrailNamePrimary:name},geometry:{type:"LineString",coordinates:coords}});
test("real geometry intersection is a candidate, never a bridge or passable ford",()=>{
 const trails=[line(1,"Little Carp",[[-89.8,46.7],[-89.79,46.7]])];
 const hydro=[line(99,"Little Carp River",[[-89.795,46.695],[-89.795,46.705]],true)];
 const c=candidates(trails,hydro);
 assert.equal(c.length,1);
 assert.equal(c[0].relationship,"line-intersection");
 assert.equal(c[0].bridgeOrFord,"unverified");
 assert.equal(c[0].routeEligible,false);
 assert.equal(c[0].river,"Little Carp River");
 assert.ok(Math.abs(c[0].location[0]+89.795)<1e-5);
});
test("close but separate lines are labeled near-line, never promoted to intersection",()=>{
 const trails=[line(1,"Trail",[[-89.8,46.7],[-89.79,46.7]])];
 const hydro=[line(99,"Stream",[[-89.795,46.70005],[-89.795,46.702]],true)];
 const c=candidates(trails,hydro,{nearMeters:12});
 assert.equal(c.length,1);
 assert.equal(c[0].relationship,"near-line");
 assert.ok(c[0].offsetMeters>4);
 assert.equal(c[0].routeEligible,false);
});
test("distant river must not generate fabricated crossing",()=>{
 const trails=[line(1,"Trail",[[-89.8,46.7],[-89.79,46.7]])];
 const hydro=[line(99,"Distant river",[[-89.795,46.71],[-89.795,46.72]],true)];
 assert.deepEqual(candidates(trails,hydro),[]);
});
test("identical duplicated trail feature geometry creates only independent source candidates",()=>{
 const trails=[line(1,"Trail",[[-89.8,46.7],[-89.79,46.7]]),line(2,"NCT",[[-89.8,46.7],[-89.79,46.7]])];
 const hydro=[line(9,"River",[[-89.795,46.69],[-89.795,46.71]],true)];
 const x=candidates(trails,hydro);assert.equal(x.length,2);assert.ok(x.every(a=>a.routeEligible===false));
});
test("invalid buffers are rejected as unsafe",()=>{
 assert.throws(()=>candidates([],[],{nearMeters:80}),/tolerance/);
 assert.match(crossingPolicy,/candidate-only/);
});
