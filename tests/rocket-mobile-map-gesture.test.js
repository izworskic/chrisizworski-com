'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const html=source('public/synced-national-tools/rocket-launch-live/index.html');
const css=source('public/synced-national-tools/rocket-launch-live/styles.css');
const js=source('public/synced-national-tools/rocket-launch-live/app.js');
test('national map exposes accessible enlarged mobile mode without JS route duplication',()=>{
 assert.match(html,/id="rl-map-wrap"/);
 assert.match(html,/id="rl-map-expand"[^>]*type="button"[^>]*aria-controls="rl-coast-map"[^>]*aria-expanded="false"[^>]*disabled/);
 assert.match(html,/id="rl-map-details"/);
 assert.match(js,/mountMapTouchControls\(map,root\)/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/invalidateSize\(\{pan:false,animate:false\}\)/);
 assert.match(js,/toggle\.focus\(\{preventScroll:true\}\)/);
 assert.match(js,/details\?\.addEventListener\('click',\(\)=>setExpanded\(false\)\)/);
});
test('pinch stays in Leaflet, with mobile-safe action area and reversible page scroll',()=>{
 assert.match(js,/touchZoom:\s*true,\s*dragging:\s*true/);
 assert.match(js,/bounceAtZoomLimits:\s*false/);
 assert.match(css,/#rl-coast-map\.leaflet-container\{touch-action:none!important;overscroll-behavior:contain;overflow-anchor:none\}/);
 assert.match(css,/\.rl-map\{height:345px\}/);
 assert.match(css,/\.rl-map-wrap\[data-expanded="true"\]\{position:fixed;inset:0/);
 assert.match(css,/html\.rl-map-fullscreen,html\.rl-map-fullscreen body\{overflow:hidden!important/);
 assert.match(css,/#rl-coast-map \.leaflet-control-zoom a\{width:44px;height:44px/);
 assert.doesNotMatch(css,/body\s*\{[^}]*touch-action:\s*none/);
});
test('tapping a rocket marker selects without yanking the document to another section',()=>{
 const from=js.indexOf('onSelect:(id,region)=>{'),to=js.indexOf('\n        }\n      });',from);
 assert(from>=0&&to>from,'Rocket pin selection callback was lost');
 const body=js.slice(from,to);
 assert.match(body,/void load\(region,id\)/);
 assert.doesNotMatch(body,/scrollIntoView|scrollTo\(/);
 assert.match(html,/href="#rl-next-title" id="rl-map-details"/);
});
test('source-independent fallback keeps the expand button disabled without Leaflet',()=>{
 assert.match(html,/id="rl-map-expand"[^>]*disabled/);
 const start=js.indexOf('function initMap()');
 const end=js.indexOf('function renderMission(',start);
 assert(start>=0&&end>start);
 assert.match(js.slice(start,end),/Map tiles unavailable/);
});
