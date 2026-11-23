'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cal=fs.readFileSync('public/calumet-freighter-watch/index.html','utf8');
const cuy=fs.readFileSync('public/cuyahoga-freighter-watch/index.html','utf8');
const css=fs.readFileSync('public/assets/working-rivers-family.css','utf8');
const calApp=fs.readFileSync('public/assets/calumet-watch-app.js','utf8');
const cuyApp=fs.readFileSync('public/assets/cuyahoga-watch-app.js','utf8');
const calGuide=require('../public/calumet-freighter-watch/guide.json');

test('the two sister river desks have matching branded shell, paired navigation and distinct canonical ownership',()=>{
 for(const [html,slug,other,city] of [
  [cal,'calumet','cuyahoga','CHICAGO'],[cuy,'cuyahoga','calumet','CLEVELAND']]){
  assert.match(html,new RegExp('<body class="river-family river-family--'+slug+'"'));
  assert.match(html,/class="river-family__switch"/);
  assert.match(html,new RegExp('href="/'+slug+'-freighter-watch/" aria-current="page"'));
  assert.match(html,new RegExp('href="/'+other+'-freighter-watch/"'));
  assert.match(html,/WORKING RIVERS/);
  assert.ok(html.includes(city));
  assert.match(html,/\/assets\/working-rivers-family\.css/);
  assert.equal((html.match(/class="river-family__switch"/g)||[]).length,1);
  assert.match(html,/meta name="robots" content="noindex,follow"/);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,new RegExp('<link rel="canonical" href="https://chrisizworski.com/'+slug+'-freighter-watch/"'));
  assert.match(html,/Ship tracker/);
  assert.match(html,/© 2026 Chris Izworski/);
  assert.match(html,/All freighter tools/);
 }
 assert.match(css,/body\.river-family--calumet/);
 assert.match(css,/body\.river-family--cuyahoga/);
 assert.match(css,/\.river-family__switch a\[aria-current="page"\]/);
 assert.match(css,/@media\(max-width:590px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/@import|@font-face|url\(|!important/);
});

test('both river desks show a source-backed map, ship evidence and park choices in the same sequence',()=>{
 assert.ok(cal.indexOf('id="calumet-map"')<cal.indexOf('class="reports"'));
 assert.ok(cal.indexOf('class="reports"')<cal.indexOf('class="choices"'));
 assert.ok(cal.indexOf('class="choices"')<cal.indexOf('id="selection"'));
 assert.ok(cuy.indexOf('id="cuyahoga-map"')<cuy.indexOf('id="live-controls"'));
 assert.ok(cuy.indexOf('id="live-controls"')<cuy.indexOf('class="panel places"'));
 assert.ok(cuy.indexOf('class="panel places"')<cuy.indexOf('id="river-focus"'));
 assert.match(cal,/01 \/ RECENT AIS/);assert.match(cal,/02 \/ CHOOSE A VIEW/);
 assert.match(cuy,/STEP 01 \/ RECENT AIS/);assert.match(cuy,/STEP 02 \/ CHOOSE A VIEW/);
 assert.match(cal,/id="calumet-type-counts"/);assert.match(cuy,/id="cuyahoga-type-counts"/);
 assert.match(cal,/<details class="river-type-strip"><summary>Ship types and counts/);
 assert.match(cuy,/<details class="river-type-strip"><summary>Ship types and counts/);
 assert.match(css,/\.river-family \.map-secondary/);
 assert.match(css,/\.river-family \.map-view-actions button/);
});

test('map framing has honest two-way controls and graceful missing observation behavior',()=>{
 assert.match(cal,/id="calumet-show-ships"[^>]*disabled/);
 assert.match(cal,/id="calumet-show-places"[^>]*disabled/);
 assert.match(cuy,/id="show-ships-on-map"/);
 assert.match(cuy,/id="show-parks-on-map"/);
 assert.match(calApp,/function frameMap\(mode='all'\)/);
 assert.match(calApp,/const points=mode==='places'/);
 assert.match(calApp,/state\.live\?\.state==='REPORTS_AVAILABLE'/);
 assert.match(calApp,/state\.map\.fitBounds\(/);
 assert.match(calApp,/function updateMapViewControls\(/);
 assert.match(calApp,/calumet-show-ships/);
 assert.match(calApp,/calumet-show-places/);
 assert.match(calApp,/Promise\.allSettled\(\[loadGuide\(\),loadShips\(\)\]\)/);
 assert.match(cuyApp,/function frameMap\(mode='all'\)/);
 assert.match(cuyApp,/show-ships-on-map/);
 assert.match(cuyApp,/show-parks-on-map/);
 assert.doesNotMatch(calApp,/setInterval|\/api\/cuyahoga|new\s+WebSocket/);
});

test('Calumet viewing choices are direct navigational handoffs, not unverified parking or sightline guarantees',()=>{
 assert.equal((cal.match(/class="view-entry"/g)||[]).length,2);
 assert.equal((cal.match(/class="view-choice"/g)||[]).length,2);
 assert.equal((cal.match(/class="view-entry-links"/g)||[]).length,2);
 assert.equal((cal.match(/href="https:\/\/www.google.com\/maps\/search\/\?api=1/g)||[]).length,2);
 assert.match(cal,/data-place="bridge95"/);
 assert.match(cal,/data-place="calumetpark"/);
 assert.match(cal,/General bridge area · confirm access/);
 assert.match(cal,/General park area · confirm access/);
 assert.match(cal,/sightline is not confirmed|clear view of passing ships is not established/);
 assert.equal(calGuide.viewpoints.length,2);
 assert.ok(calGuide.viewpoints.every(v=>typeof v.mapsQuery==='string'&&v.mapsQuery.length>10));
 assert.match(calApp,/core\.nearPlace/);
});

test('the pair share controls without erasing their different visitor experiences',()=>{
 assert.match(cal,/id="bridge-mechanics"/);
 assert.match(cal,/id="bridge-angle"/);
 assert.match(cal,/SCHEMATIC • NOT A LIVE BRIDGE/);
 assert.match(cal,/id="bridge-select"/);
 assert.match(cuy,/id="bend-lab"/);
 assert.match(cuy,/id="bend-diagram"/);
 assert.match(cuy,/id="bend-position"/);
 assert.match(cuy,/id="place-buttons"/);
 assert.match(cuy,/cuyahoga-sam-laud-roy-luck\.jpg/);
 assert.match(cal,/NOAA Coast Pilot/);
 assert.match(cuy,/NOAA Coast Pilot/);
 for(const html of [cal,cuy]){
  assert.match(html,/\/assets\/seaway-vessel-icons\.js/);
  assert.match(html,/\/assets\/river-watch-vessel-ui\.js/);
  assert.match(html,/\/assets\/river-watch-vessel-ui\.css/);
  assert.doesNotMatch(html,/adsbygoogle|data-ad-client|autoads\.js/i);
 }
 assert.match(calApp,/fetch\('\/api\/freighter-ais'/);
 assert.match(cuyApp,/fetch\('\/api\/freighter-ais\?region=cuyahoga'/);
});
