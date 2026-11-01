import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const {recommend,vehicleCautions,seasonFor}=require("../public/assets/porkies-explorer.js");
const html=fs.readFileSync(path.join(root,"public/porcupine-mountains/index.html"),"utf8");
const js=fs.readFileSync(path.join(root,"public/assets/porkies-explorer.js"),"utf8");
const compare=fs.readFileSync(path.join(root,"public/assets/porkies-experience-compare.js"),"utf8");
const css=fs.readFileSync(path.join(root,"public/assets/porkies-explorer.css"),"utf8");
const trip=(overrides={})=>({date:"2027-08-16",arrival:"east",vehicle:"car",hours:4,ability:"moderate",interest:"mix",path:"local",...overrides});
const all=(r)=>JSON.stringify(r);

test("vehicle mode changes the first plan, not only the deep map or comparison",()=>{
 for(const vehicle of ["rv","trailer"]){
  const c=recommend(trip({vehicle,arrival:"east",hours:4,interest:"views"}));
  assert.ok(c.stops.some(x=>/Lake of the Clouds/.test(x.name)));
  assert.ok(c.vehicleWarnings?.length>1);
  assert.match(c.vehicleWarnings.join(" "),/middle ski hill parking area off M-107/);
  assert.match(c.vehicleWarnings.join(" "),/NOT a verified RV route/);
  assert.ok(c.sources.some(x=>/DNR 2025 scenic-area vehicle staging guidance/.test(x.name)));
  const w=recommend(trip({vehicle,arrival:"west",hours:8,interest:"falls"}));
  assert.ok(w.vehicleWarnings.some(x=>/Presque Isle.*#841/.test(x)));
  assert.ok(w.vehicleWarnings.some(x=>/Summit Peak.*South Boundary Road turn-off/.test(x)));
  assert.ok(w.vehicleWarnings.some(x=>/cross-park itinerary is not verified/.test(x)));
  const winter=recommend(trip({vehicle,arrival:"west",date:"2027-02-17",ability:"low",hours:4,interest:"falls"}));
  assert.ok(winter.vehicleWarnings.some(x=>/County Road 519 work-zone reopening/.test(x)));
  assert.ok(winter.vehicleWarnings.some(x=>/Seasonal M-107 and South Boundary/.test(x)));
  assert.ok(winter.stops.every(x=>!x.name.includes("Summit Peak")));
 }
 const car=recommend(trip({vehicle:"car",arrival:"east",hours:4,interest:"views"}));
 assert.deepEqual(car.vehicleWarnings,[]);
 assert.equal(vehicleCautions("car",car.stops,"ordinary").length,0);
});

test("two short-visit attraction conflicts produce source-led reversible plans",()=>{
 const west=trip({arrival:"west",interest:"views",hours:2,ability:"low"});
 const near=recommend(west),far=recommend({...west,path:"desired"});
 assert.equal(near.tradeoff?.active,"local");
 assert.match(near.tradeoff.explanation,/No verified cross-park driving time/);
 assert.match(near.stops[0].name,/Presque Isle/);
 assert.match(near.tradeoff.desired.name,/Lake of the Clouds/);
 assert.match(far.stops[0].name,/Lake of the Clouds/);
 assert.match(far.intro,/NOT confirmed within your 2-hour window/);
 assert.ok(far.warnings.some(x=>/two-hour total visit is verified/.test(x)));
 assert.equal(far.tradeoff.localId,"river");
 assert.equal(far.tradeoff.desiredId,"clouds");
 const east=trip({arrival:"east",interest:"falls",hours:2});
 const nearEast=recommend(east),farEast=recommend({...east,path:"desired"});
 assert.match(nearEast.stops[0].name,/Lake of the Clouds/);
 assert.match(nearEast.tradeoff.desired.name,/Presque Isle River/);
 assert.match(farEast.stops[0].name,/Presque Isle/);
 assert.match(farEast.intro,/NOT confirmed within your 2-hour window/);
 assert.equal(farEast.tradeoff.localId,"clouds");
 assert.equal(farEast.tradeoff.desiredId,"river");
});

test("non-conflict outings do not show a meaningless tradeoff",()=>{
 for(const item of [
 trip({arrival:"west",interest:"falls",hours:2}),
 trip({arrival:"east",interest:"views",hours:2}),
 trip({arrival:"east",interest:"falls",hours:8}),
 trip({arrival:"east",interest:"views",date:"2027-01-14",hours:2}),
 trip({arrival:"east",interest:"forest",date:"2027-05-10",hours:4})
 ]) assert.equal(recommend(item).tradeoff,undefined);
});

test("safe normal-season and winter defaults remain correctly qualified",()=>{
 assert.equal(seasonFor("2027-02-30"),"unknown");
 for(const v of ["car","rv","trailer"]){
  const winter=recommend(trip({date:"2027-01-12",vehicle:v,arrival:"east",interest:"forest",hours:8}));
  assert.match(winter.title,/Winter opens/);
  assert.doesNotMatch(winter.stops.map(x=>x.name).join(" "),/Summit Peak|Lake of the Clouds/);
  assert.ok(winter.warnings.some(x=>/closed sections of M-107/.test(x)));
  const spring=recommend(trip({date:"2027-05-10",vehicle:v,arrival:"east",interest:"forest"}));
  assert.match(spring.title,/reopening|waking/i);
  assert.ok(spring.excluded.some(x=>/Lake of the Clouds summer road approach/.test(x)));
 }
});

test("HTML-first entry options and official source warnings remain accessible",()=>{
 assert.match(html,/class="hero-quickstart"/);
 for(const x of ["views","falls","forest"])assert.match(html,new RegExp('data-porkies-start="'+x+'"'));
 assert.match(html,/plan-vehicle-source/);
 assert.match(html,/DNR 2025 visitor guidance/);
 assert.match(html,/plan-choice-static/);
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(html,/id="planner"/);
 assert.match(css,/\.plan-fork-choice\[aria-pressed=true\]/);
 assert.match(css,/\.hero-quickstart-choices a:focus-visible/);
 assert.match(js,/porkies:plan-picked/);
 assert.match(compare,/porkies:plan-picked/);
 assert.match(js,/\["arrival","vehicle","hours","ability","interest"\]/);
 assert.doesNotMatch(js,/calculateRoute|assumeOpenParking|googleMapsDistance/);
});
