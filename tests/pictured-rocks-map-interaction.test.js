const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-planner-v3.css','utf8');

test('hard gate: selecting a point has a non-popup DOM response',()=>{
  assert.match(ui,/function selectMapPoint\(id/);
  assert.match(ui,/mapStoryTitle/);
  assert.match(ui,/mapStoryText/);
  assert.match(ui,/detail\.innerHTML=mapDecisionHtml\(id\)/);
  assert.match(html,/id="mapStory" aria-live="polite"/);
});

test('hard gate: both point and visible name are explicit controls',()=>{
  assert.match(ui,/m\.on\('click'/);
  assert.match(ui,/interactive:true,direction:'top'/);
  assert.match(ui,/tip\.on\('click'/);
  assert.match(ui,/aria-label.*open planning details/);
  assert.match(css,/park-place-label\{pointer-events:auto!important;cursor:pointer/);
});

test('hard gate: keyboard users can activate a stop',()=>{
  assert.match(ui,/setAttribute\('tabindex','0'\)/);
  assert.match(ui,/setAttribute\('role','button'\)/);
  assert.match(ui,/event\.key==='Enter'\|\|event\.key===' '/);
});

test('hard gate: selected place fit stays synchronized with planner answers',()=>{
  assert.match(ui,/dataset\.selectedPoint/);
  assert.match(ui,/selectMapPoint\(selectedStory\.dataset\.selectedPoint,\{openPopup:false\}\)/);
});

test('mobile clients receive fresh interaction assets',()=>{
  assert.match(html,/pictured-rocks-planner-v3\.js\?v=20260927-8/);
  assert.match(html,/pictured-rocks-planner-v3\.css\?v=20260927-8/);
});
