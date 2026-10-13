'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const circle=fs.readFileSync('public/lake-superior-circle-tour/index.html','utf8');
const map=fs.readFileSync('public/assets/lake-superior-circle-tour-map.js','utf8');
const pictured=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const canonical='https://picturedrocks.chrisizworski.com/';

test('Circle Tour stop 11 already contains a discoverable Pictured Rocks V5 handoff',()=>{
  const body=circle.match(/<article class="stop-card" id="stop-11"[\s\S]*?<\/article>/)?.[0]||'';
  assert.match(body,/Pictured Rocks National Lakeshore/);
  assert.ok(body.includes('href="'+canonical+'"'));
  assert.ok(body.includes('Full Trip Planner'));
});
test('selecting Pictured Rocks on the interactive Circle Tour map opens the same canonical tool',()=>{
  assert.match(map,/planner\.id = "mapPicturedRocksPlanner"/);
  assert.ok(map.includes('planner.href = "'+canonical+'"'));
  assert.match(map,/planner\.hidden = selectedStopId !== "11"/);
  assert.match(map,/\.map-selection-actions"\)\.appendChild\(planner\)/);
  assert.match(map,/circle-tour-pictured-rocks-handoff/);
  assert.match(map,/page\.track\("circle-tour-pictured-rocks-handoff", \{stop: 11, surface: "map"\}\)/);
});
test('Pictured Rocks V5 returns to the full Circle Tour without an indexed duplicate',()=>{
  assert.ok(pictured.includes('href="https://chrisizworski.com/lake-superior-circle-tour/"'));
  assert.match(pictured,/<meta name="robots" content="noindex,nofollow">/);
  assert.ok(pictured.includes('rel="canonical" href="'+canonical+'"'));
  assert.equal((circle.match(/class="stop-card"/g)||[]).length,31);
});
