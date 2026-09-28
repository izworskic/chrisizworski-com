'use strict';

const fs=require('fs');
const path=require('path');
const test=require('node:test');
const assert=require('node:assert/strict');

const root=path.join(__dirname,'..');
const fall=fs.readFileSync(path.join(root,'public/assets/pictured-rocks-fall-ranger.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'public/assets/pictured-rocks-visual-layer.js'),'utf8');
const core=fs.readFileSync(path.join(root,'public/assets/pictured-rocks-visual-layer-core.js'),'utf8');

test('reuses the shared fall-color snapshot engine',()=>{
  assert.match(fall,/\/api\/fall-color\?view=snapshot/);
  assert.match(fall,/find\(x=>x\.id==='eup'\)/);
  assert.match(fall,/same Michigan Fall Color engine/);
});

test('does not overstate regional fall-color precision',()=>{
  assert.match(fall,/regional Eastern U\.P\./);
  assert.match(fall,/shoreline stands can run ahead or behind it/);
  assert.match(fall,/Regional peak window/);
});

test('fall color changes the actual trip-building interaction',()=>{
  assert.match(fall,/id="buildFallDay"/);
  assert.match(fall,/form\.elements\.priority\.value='photo'/);
  assert.match(fall,/form\.elements\.water\.value='land'/);
  assert.match(fall,/form\.requestSubmit/);
  assert.match(fall,/Fall-color pick now/);
});

test('guide copy is park-specific without impersonating an NPS ranger',()=>{
  assert.match(fall,/Pictured Rocks is a long Lake Superior shoreline/);
  assert.match(fall,/Pictured Rocks is long enough to punish backtracking/);
  assert.match(fall,/The postcard cliffs face Lake Superior/);
  assert.doesNotMatch(fall,/I am (?:an|a) (?:NPS|National Park Service|park ranger)/i);
  assert.doesNotMatch(fall,/official ranger/i);
});

test('fall interpretation keeps water behind marine conditions',()=>{
  assert.match(fall,/marine forecast still gets the final word/);
  assert.match(fall,/If marine conditions cooperate/);
});

test('NPS seasonal and park facts are linked to primary sources',()=>{
  assert.match(fall,/nps\.gov\/piro\/faqs\.htm/);
  assert.match(fall,/nps\.gov\/places\/miners-falls\.htm/);
  assert.match(fall,/nps\.gov\/places\/pictured-rocks-cliffs\.htm/);
});

test('visual loader preserves existing visual layer then loads fall/copy layer',()=>{
  assert.match(loader,/pictured-rocks-visual-layer-core\.js/);
  assert.match(loader,/pictured-rocks-fall-ranger\.js/);
  assert.match(loader,/addEventListener\('load'/);
  assert.match(core,/Six places\. Six different Pictured Rocks days\./);
  assert.match(core,/Official NPS park map/);
});
