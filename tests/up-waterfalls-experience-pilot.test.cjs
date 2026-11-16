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
  assert.match(h,/Explore 80 waterfall destinations and scenic stops/);
  assert.ok(h.includes('open its guide for the walk, parking, and what to expect along the way'));
  assert.match(h,/Access notices were checked November 2, 2026/);
  assert.match(h,/Munising Falls remains closed/);
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

test('waterfall map uses visitor-facing labels while preserving required tile attribution',()=>{
  const map=fs.readFileSync('public/assets/up-waterfalls.js','utf8');
  assert.match(h,/<p>Explore the waterfall map<\/p>/);
  assert.match(h,/Loading the map\. Waterfall guides and official sources are available below\./);
  assert.doesNotMatch(h,/Waterfalls · CARTO basemap|Loading the keyed basemap/);
  assert.match(map,/Map ready\. Pins mark waterfalls, not visitor parking\./);
  assert.doesNotMatch(map,/CARTO basemap loaded with the configured public key|OpenStreetMap basemap in use|CARTO map tiles unavailable/);
  // The provider attribution and tile configuration must remain in map internals.
  assert.match(map,/attribution:'&copy; OpenStreetMap contributors &copy; CARTO'/);
  assert.match(map,/fetch\('\/api\/carto-basemap-config'/);
  assert.match(map,/tile\.openstreetmap\.org/);
});
