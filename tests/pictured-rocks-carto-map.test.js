const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');

test('hard gate: CARTO Voyager requests are authenticated',()=>{
  assert.match(ui,/basemaps\.cartocdn\.com\/rastertiles\/voyager\/\{z\}\/\{x\}\/\{y\}\.png\?key=/);
});
test('hard gate: no world wrap and no continent-scale zoom',()=>{
  assert.match(ui,/noWrap:true/);
  assert.match(ui,/worldCopyJump:false/);
  assert.match(ui,/maxBounds:parkBounds/);
  assert.match(ui,/minZoom:8/);
});
test('hard gate: park locations stay visible',()=>{
  assert.match(ui,/map-place-hit/);
  assert.match(ui,/minersCastle:\[46\.4929,-86\.5489\]/);
  assert.match(ui,/grandMarais:\[46\.6713,-85\.9850\]/);
});
test('hard gate: fallback is also bounded and non-wrapping',()=>{
  assert.match(ui,/tile\.openstreetmap\.org/);
  assert.match(ui,/minZoom:8,maxZoom:19,noWrap:true,bounds:parkBounds/);
});
test('mobile clients get a fresh bundle',()=>{
  assert.match(html,/pictured-rocks-planner-v3\.js\?v=20260927-9/);
});
