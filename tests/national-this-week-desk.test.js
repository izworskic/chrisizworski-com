'use strict';
// /national-tools/ this-week desk: peak windows from data/directory-peaks.json,
// worth checking now, starred tools and the region jump menu sit right after search.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/synced-national-tools/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/synced-national-tools/assets/national-tools-directory.js'),'utf8');

test('peak windows on the page match the reviewed source',()=>{
  execFileSync('python3',[path.join(root,'scripts/build-directory-peaks.py'),'--check'],{cwd:root,stdio:'pipe'});
});

test('desk sections follow search and precede the catalog',()=>{
  const at=m=>{const i=html.indexOf(m);assert.ok(i>0,`missing ${m}`);return i;};
  const order=['id="finder-title"','<section class="peak-now" data-peak-now','<section class="starred-tools" data-tool-stars','<nav class="region-jump"','id="national-tools-title"','id="regional-tools-title"'].map(at);
  assert.deepEqual(order,[...order].sort((a,b)=>a-b));
});

test('every region in the jump menu exists on the page',()=>{
  const nav=html.slice(html.indexOf('<nav class="region-jump"'),html.indexOf('</nav>',html.indexOf('<nav class="region-jump"')));
  const targets=[...nav.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
  assert.ok(targets.length>=10);
  for(const id of targets)assert.match(html,new RegExp(`id="${id}"`),id);
});

test('desk boxes are hidden until JavaScript fills them',()=>{
  assert.match(html,/<section class="peak-now" data-peak-now[^>]* hidden>/);
  assert.match(html,/<section class="starred-tools" data-tool-stars[^>]* hidden>/);
  assert.match(html,/data-link="a\.primary-action"/);
});

test('worth checking now ranks by window and handles year wrap and multiple windows',()=>{
  assert.match(js,/split\(','\)/);
  assert.match(js,/if\(end<start\)/);
  assert.match(js,/21\*DAY/);
  assert.match(js,/a\.rank-b\.rank/);
});
