"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("one chosen stop synchronizes map, timeline and individual detail controls",()=>{
 const html=read("public/blue-ridge-parkway/index.html"),js=read("public/assets/blue-ridge-parkway.js");
 assert.match(html,/id="stopRouteStrip"/);assert.match(html,/id="stopFocus"/);assert.match(html,/id="stopSelectionStatus" class="brp-sr-only" aria-live="polite"/);
 assert.match(html,/id="parkwayMap" role="region"/);
 assert.match(html,/id="parkwayMapFallback" hidden role="status"/);
 assert.match(html,/visitor-map-links\.js/);
 assert.match(js,/function selectStop\(index,origin="list"\)/);
 assert.match(js,/function prepareStopControls\(\)/);
 assert.match(js,/marker\.on\("click",\(\)=>selectStop\(index,"map"\)\)/);
 assert.match(js,/data-stop-index=/);
 assert.match(js,/aria-pressed/);
 assert.doesNotMatch(js,/\.bindPopup\(/);
});
test("stop links are named place searches, not invented driving directions",()=>{
 const js=read("public/assets/blue-ridge-parkway.js");
 assert.match(js,/VisitorMapLinks\?\.placeSearch\(\{role:"public-place"/);
 assert.match(js,/not verified parking or driving directions/);
 assert.match(js,/item\.source\?safeUrl\(item\.source\)/);
 assert.doesNotMatch(js,/verifiedDirections|maps\/dir\//);
});
test("stop markers draw before optional GIS corridor requests",()=>{
 const js=read("public/assets/blue-ridge-parkway.js");
 const draw=js.slice(js.indexOf("  function drawMap(payload)"),js.indexOf("  function render(payload)"));
 assert.ok(draw.indexOf("markerLayer.clearLayers()")<draw.indexOf("corridorRequest=fetch("));
 assert.match(js,/tiles\.on\("tileerror"/);
 assert.match(js,/tiles\.on\("tileload"/);assert.match(js,/holder\.hidden=false;map\?\.invalidateSize\(\)/);
 assert.match(js,/mapUnavailable\("The interactive map library could not load\."/);
});
