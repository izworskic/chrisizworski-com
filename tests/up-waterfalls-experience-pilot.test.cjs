'use strict';
// Static regression gate for the reversible Penpot/Experience OS waterfall pilot.
// Run: node --test tests/up-waterfalls-experience-pilot.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const h=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const css=fs.readFileSync('public/assets/up-waterfalls-experience-pilot.css','utf8');
const photos=JSON.parse(fs.readFileSync('data/up-waterfall-photo-provenance.json','utf8')).photos;
const at=x=>h.indexOf(x);

test('map-first reader order, without a JavaScript-dependent reshuffle',()=>{
  assert.match(h,/<body class="up-waterfall-hub waterfall-experience-pilot">/);
  assert.match(h,/<link rel="stylesheet" href="\/assets\/up-waterfalls.css"><link rel="stylesheet" href="\/assets\/up-waterfalls-experience-pilot.css">/);
  assert.ok(at('id="visit-lens"') < at('class="explorer"'));
  assert.ok(at('class="explorer"') < at('id="falls-map"'));
  assert.ok(at('id="falls-map"') < at('id="results"'), 'Map must precede results in the actual DOM');
  assert.match(h,/<a class="pill-link" href="#falls-map">Explore the waterfall map<\/a>/);
  assert.ok(at('id="falls-map"') < at('class="upfall-photo-preview"'));
  assert.ok(at('class="upfall-photo-preview"') < at('id="waterfall-day-choices"'));
  assert.ok(at('id="waterfall-day-choices"') < at('id="munising-day"'));
  for(const id of ['visit-lens','visit-region','visit-budget','visit-date','falls-map','q','region','results','shortlist']){
    assert.equal((h.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'missing or duplicated '+id);
  }
});

test('keeps all destination cards, source-verified photographs and safety warnings',()=>{
  const catalog=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
  assert.equal((h.match(/<article class="waterfall-card" data-fall data-id=/g)||[]).length,catalog.length);
  assert.equal((h.match(/class="upfall-card-preview"/g)||[]).length,photos.length);
  assert.equal((h.match(/class="upfall-photo-preview-card"/g)||[]).length,3);
  for(const id of ['bond-falls','miners-falls','spray-falls']){
    const p=photos.find(photo=>photo.id===id);
    assert.ok(p&&h.includes(p.creator),'verified image attribution '+id);
  }
  assert.match(h,/Marker = waterfall\/attraction/);
  assert.ok(h.includes('<strong>not</strong> a validated trailhead or parking pin'));
  assert.match(h,/Nothing here verifies today's road, gate or trail status/);
  assert.match(h,/Munising Falls is closed/);
  assert.match(h,/Check parking source/);
});

test('preserves essential SEO, analytics, ads and Rust-backed planner connections',()=>{
  assert.match(h,/<link rel="canonical" href="https:\/\/chrisizworski.com\/upper-peninsula-waterfalls\/"/);
  assert.match(h,/<script type="application\/ld\+json">/);
  assert.match(h,/pagead2.googlesyndication.com\/pagead\/js\/adsbygoogle.js/);
  assert.match(h,/assets\/up-waterfalls-rust.js/);
  assert.match(h,/assets\/up-waterfalls-visit-lens.js/);
  assert.match(h,/assets\/shared-itinerary-engine.js/);
  assert.match(h,/assets\/up-waterfalls-evidence-rust.js/);
  assert.match(h,/assets\/up-waterfalls-regional-clusters.js/);
});

test('mobile map precedes long results; retains touch targets and source proof',()=>{
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/\.explorer\s*\{\s*display:flex;/);
  assert.match(css,/@media\(min-width:901px\)/);
  assert.match(css,/\.control-panel\{\s*grid-column:1;/);
  assert.match(css,/\.map-card\{\s*grid-column:2;/);
  // Match the CSS property, not the substring of border:1.
  assert.doesNotMatch(css,/(?:^|[;{])\s*order\s*:\s*[01](?:;|})/m,'CSS visual reordering breaks keyboard order');
  assert.match(css,/min-height:44px/);
  assert.match(css,/\.upfall-photo-preview-card figcaption a/);
  assert.doesNotMatch(css,/display:none/);
  assert.doesNotMatch(css,/touch-action:none/);
});
