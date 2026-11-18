'use strict';
// /tools/ "this-week desk": search, monthly picks and starred tools come first,
// then every tool in a compact catalog, then the editorial sections.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/tools/index.html'),'utf8');

test('decision surfaces come before the catalog; editorial follows it',()=>{
  const at=m=>{const i=html.indexOf(m);assert.ok(i>0,`missing ${m}`);return i;};
  const order=['class="page-title"','id="finder"','class="season-desk"','data-tool-stars','class="cluster-nav"',
    'id="outdoors-tools-group"','id="great-lakes-tools-group"','id="trip-planners-group"','id="nature-tools-group"',
    'id="first-party-migrated-tools"','class="week-explorer"','<div data-finder-context>','id="tools-decision-title"',
    'class="winter-router"','class="featured-tools"'].map(at);
  assert.deepEqual(order,[...order].sort((a,b)=>a-b));
});

test('every catalog card stays in the static HTML with a stable id for starring',()=>{
  const cards=html.match(/<div class="tool-card" data-tool-id="[^"]+"/g)||[];
  assert.ok(cards.length>=90,`only ${cards.length} cards`);
  assert.equal(new Set(cards).size,cards.length,'tool ids are unique');
});

test('starred tools are progressive enhancement and stay local',()=>{
  assert.match(html,/<section class="starred-tools" data-tool-stars[^>]* hidden>/);
  assert.match(html,/<script defer src="\/assets\/tool-stars\.js\?v=\d+"><\/script>/);
  const js=fs.readFileSync(path.join(root,'public/assets/tool-stars.js'),'utf8');
  assert.match(js,/localStorage/);
  assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon/);
  assert.doesNotMatch(js,/innerHTML/);
});

test('jump menu sits outside the search-hidden context and is sticky on phones',()=>{
  const nav=html.indexOf('class="cluster-nav"');
  const ctx=html.indexOf('<div data-finder-context>');
  assert.ok(nav>0&&nav<ctx);
  assert.match(html,/\.cluster-nav\{position:sticky;top:0/);
  assert.match(html,/h2\.sh\{scroll-margin-top:64px\}/);
});

test('header portrait points at an image that exists',()=>{
  for(const page of ['tools','synced-national-tools','guides','michigan-rivers-field-guide','michigan-dark-sky-field-guide']){
    const h=fs.readFileSync(path.join(root,'public',page,'index.html'),'utf8');
    assert.doesNotMatch(h,/chris-izworski-portrait\.jpg/,page);
  }
  assert.ok(fs.existsSync(path.join(root,'public/assets/search/chris-izworski-profile.png')));
});
