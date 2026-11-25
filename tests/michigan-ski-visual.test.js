'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('premium Michigan hub uses one map carousel and simple primary selectors',()=>{
 const h=read('scripts/generate-michigan-ski-pages.mjs');
 const i=h.slice(h.indexOf('function index(){'));
 assert.ok(i.includes('id="ski-point-map"'));
 assert.ok(i.includes('id="ski-resort-carousel"'));
 assert.ok(i.includes('id="ski-carousel-prev"'));
 assert.ok(i.includes('id="ski-carousel-next"'));
 assert.ok(!i.includes('id="ski-snow-bars"'),'no duplicate snow-leaders chart');
 assert.equal((i.match(/Three checks before you buy or drive/g)||[]).length,1,'one readiness checklist, not repeated');
 assert.match(i,/<details class="panel s7-ski-readiness"[^>]*><summary id="s7-ski-title">Three checks before you buy or drive/);
 assert.ok(i.indexOf('id="ski-decision-results"')<i.indexOf('id="s7-ski-title"'),'checklist remains secondary to the planner');
 assert.ok(i.includes('ski-advanced-comparison')&&i.includes('ski-directory'),'optional detail and no-JS directory preserved');
 assert.ok(i.includes('id="ski-decision-results"'));
 assert.ok(i.includes('id="ski-goal"'));
 assert.ok(i.includes('id="ski-day"'));
 assert.ok(i.includes('id="origin"'));
 assert.equal((i.match(/id="origin"/g)||[]).length,1);
 assert.ok(i.indexOf('ski-point-map')<i.indexOf('02 / Lake-effect watch'));
 assert.ok(i.includes('trip-options'));
});
test('no hero photo; factual archival image strip appears after decision and matches actual ski resorts',()=>{
 const g=read('scripts/generate-michigan-ski-pages.mjs');
 const i=g.slice(g.indexOf('function index(){'));
 assert.ok(!g.includes('heroPhoto('));
 assert.ok(!g.includes('hero-photo'));
 assert.equal((g.match(/credit:'/g)||[]).length,4);
 assert.ok(g.includes('PHOTO_LIBRARY'));
 assert.ok(g.includes("photoFigure(r.slug)"));
 assert.ok(g.includes("photoFigure(k,'strip')"));
 assert.ok(i.indexOf('ski-photo-strip')>i.indexOf('ski-decision-results'));
 assert.ok(i.indexOf('ski-photo-strip')<i.indexOf('<div id="resort-list"')); // Compare with actual ranking container, not the new cross-link anchor
 assert.ok(i.indexOf('ski-photo-strip')>i.indexOf('ski-decision-results'));
 for(const name of ['Boyne_Mountain.JPG','Crystal_Mountain_-_Cheers_Chair.jpg','Caberfae_Peaks.jpg','Looking_over_Lac_La_Belle.jpg'])assert.ok(g.includes(name));
 for(const term of ['CC BY-SA 3.0','CC BY-SA 4.0','creativecommons.org','Historical, not live'])assert.ok(g.includes(term),term);
 assert.ok(!g.includes('PHOTO_BOYNE'));
 assert.ok(!g.includes('640px-Caberfae_Peaks.jpg'));
 assert.ok(g.includes('1280px-Caberfae_Peaks.jpg'));
 assert.ok(g.includes('loading="lazy"'));
});

test('map and carousel respond to day selection and preserve keyboard operation',()=>{
 const map=read('public/assets/michigan-ski-map.js');
 const d=read('public/assets/michigan-ski-decision.js');
 const board=read('public/assets/michigan-ski.js');
 for(const k of ['renderCarousel()','drawMap(','ski-card-select','ski-carousel-card',"addEventListener('keydown'","michigan-ski:filters",'requestAnimationFrame'])assert.ok(map.includes(k),k);
 assert.ok(map.includes('OPEN_PER_OPERATOR')&&map.includes('CLOSED_PER_OPERATOR'));
 assert.ok(!map.includes('PUBLISHED_OFFICIAL_REPORT'),'no obsolete status contract');
 assert.ok(map.includes("document.getElementById('ski-day')?.addEventListener('change',refresh)"));
 assert.ok(d.includes("stale||(offSeason&&S.goal==='powder')?[]:candidates()")); // Fails closed for old/invalid forecasts
 assert.ok(d.includes('snapshotAge>2*3600000'));
 assert.match(d,/function childTicket\(\)\{return null/);
 assert.ok(board.includes('hill-extra'));
 assert.ok(board.includes("document.dispatchEvent(new CustomEvent('michigan-ski:data'"));
 for(const p of ['public/assets/michigan-ski.js','public/assets/michigan-ski-decision.js','public/assets/michigan-ski-map.js']){
  assert.doesNotThrow(()=>new Function(read(p)),p);
 }
});

test('resort location searches use shared place contract and static fallback, never directions',()=>{
 const map=read('public/assets/michigan-ski-map.js'),g=read('scripts/generate-michigan-ski-pages.mjs');
 assert.match(map,/VisitorMapLinks\?\.placeSearch\(/);assert.match(g,/placeSearch\(\{role:'public-place'/);
 assert.ok(g.includes('ski-directory-maps'));assert.ok(g.includes('/assets/visitor-map-links.js'));
 assert.doesNotMatch(map,/verifiedDirections|maps\/dir/);
});
