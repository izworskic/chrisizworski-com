"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const engine=require("../lib/blue-ridge-parkway/engine.js");
const {ROUTES}=require("../lib/blue-ridge-parkway/catalog.js");
const T=engine._test;

const ROAD_HTML=`
<h3>Road status as of 7:30 A.M, Wednesday, September 23, 2026.</h3>
<p>Status is subject to change throughout the day after the page has been updated.</p>
<table>
<tr><td>61.4 - 66.3</td><td>VA Route 130 to VA Route 501</td><td>Partially closed</td><td>CLOSED from MP 63.5 - MP 63.9 for Bridge rehabilitation. Detour signs in place from MP 61.4 - MP 64.</td></tr>
<tr><td>261.2 - 276.4</td><td>NC-16 to US 421</td><td>Ungated</td><td>Full closure around the Deep Gap Bridge for repairs MP 274.3 - MP 276.5 with signed detour from MP 269.8 to MP 276.5.</td></tr>
<tr><td>324.7 - 330.9</td><td>Jacksontown to NC 226</td><td>Closed</td><td>OPEN from milepost 327.5 - milepost 330.9. Recreation of any kind is PROHIBITED in this section. (MP 324.7-327.5)</td></tr>
<tr><td>355.3 - 364.5</td><td>NC 128 to Craggy Gardens</td><td>Open</td><td></td></tr>
<tr><td>364.5 - 367.6</td><td>Craggy tunnel to picnic area</td><td>Open</td><td>Craggy Gardens Picnic Area CLOSED for a facility closure.</td></tr>
</table>`;

test("road parser separates official open, partial and hard-closed milepost ranges",()=>{
  const road=T.parseRoadStatus(ROAD_HTML);
  assert.match(road.updatedLabel,/September 23, 2026/);
  assert.equal(road.rows.length,5);
  assert.deepEqual(road.rows[0].hardClosed,[{start:63.5,end:63.9}]);
  assert.deepEqual(road.rows[1].hardClosed,[{start:274.3,end:276.5}]);
  assert.deepEqual(road.rows[2].hardClosed,[{start:324.7,end:327.5}]);
  assert.deepEqual(road.rows[3].hardClosed,[]);
  assert.deepEqual(road.rows[4].hardClosed,[],"facility closure without a road mile range must not become a road closure");
});

test("a closure that cuts the Boone north route hard-vetoes that route",()=>{
  const road=T.parseRoadStatus(ROAD_HTML);
  const route=ROUTES.find(r=>r.id==="boone-doughton");
  const result=T.roadAssessment(route,road);
  assert.equal(result.blocked,true);
  assert.ok(result.blocks.some(x=>x.start===274.3&&x.end===276.5));
});

test("an open Asheville-Craggy stretch is not vetoed by an unrelated facility note",()=>{
  const road=T.parseRoadStatus(ROAD_HTML);
  const route=ROUTES.find(r=>r.id==="asheville-craggy");
  const result=T.roadAssessment(route,road);
  assert.equal(result.blocked,false);
});

test("fall color is explicitly a modeled seasonal estimate",()=>{
  const high=ROUTES.find(r=>r.id==="asheville-craggy");
  const fall=T.foliageEstimate(high,"2026-10-12");
  assert.equal(fall.active,true);
  assert.equal(fall.kind,"modeled");
  assert.match(fall.detail,/NPS does not predict an exact peak date|live canopy report/i);
  const summer=T.foliageEstimate(high,"2026-07-12");
  assert.equal(summer.active,false);
});

test("modeled duration includes road time and planned stops",()=>{
  const route=ROUTES.find(r=>r.id==="asheville-graveyard");
  assert.ok(T.modeledDuration(route)>=route.minHours);
});

test("anti-slop writer gate rejects tourism filler",()=>{
  assert.equal(T.writerPasses("A practical route with two stops and enough time to walk them."),true);
  assert.equal(T.writerPasses("Discover a breathtaking hidden gem for the perfect day."),false);
});

test("crawlable page preserves canonical, entity, first-answer language and SERP limits",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../public/blue-ridge-parkway/index.html"),"utf8");
  const title=(html.match(/<title>(.*?)<\/title>/i)||[])[1]||"";
  const description=(html.match(/<meta name="description" content="([^"]+)"/i)||[])[1]||"";
  assert.ok(title.replace(/&amp;/g,"&").length<=60);
  assert.ok(description.length<=158);
  assert.match(html,/https:\/\/chrisizworski\.com\/blue-ridge-parkway\//);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/Which part of the Parkway is worth driving\?/);
  assert.match(html,/Fall color, without pretending/);
  assert.doesNotMatch(html,/breathtaking|hidden gem|perfect day/i);
});
