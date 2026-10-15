'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('premium Michigan hub uses one map, one snowfall bar chart, and simple primary selectors',()=>{
 const h=read('scripts/generate-michigan-ski-pages.mjs');
 const i=h.slice(h.indexOf('function index(){'));
 assert.ok(i.includes('id="ski-point-map"'));
 assert.ok(i.includes('id="ski-snow-bars"'));
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
 assert.ok(i.indexOf('ski-photo-strip')<i.indexOf('resort-list'));
 assert.ok(i.indexOf('ski-photo-strip')>i.indexOf('ski-decision-results'));
 for(const name of ['Boyne_Mountain.JPG','Crystal_Mountain_-_Cheers_Chair.jpg','Caberfae_Peaks.jpg','Looking_over_Lac_La_Belle.jpg'])assert.ok(g.includes(name));
 for(const term of ['CC BY-SA 3.0','CC BY-SA 4.0','creativecommons.org','Historical photo, cropped to fit; not live'])assert.ok(g.includes(term),term);
 assert.ok(!g.includes('PHOTO_BOYNE'));
 assert.ok(!g.includes('640px-Caberfae_Peaks.jpg'));
 assert.ok(g.includes('1280px-Caberfae_Peaks.jpg'));
 assert.ok(g.includes('loading="lazy"'));
});

test('map and graph respond to day selection and preserve keyboard operation',()=>{
 const map=read('public/assets/michigan-ski-map.js');
 const d=read('public/assets/michigan-ski-decision.js');
 const board=read('public/assets/michigan-ski.js');
 for(const k of ['snowChart(day)','selectedForecast(day)','snow-chart-row','ski-day-bar',"addEventListener('keydown'"])assert.ok(map.includes(k),k);
 assert.ok(map.includes("document.getElementById('ski-day')?.addEventListener('change',render)"));
 assert.ok(d.includes("offSeason&&S.goal==='powder'?[]:candidates()"));
 assert.match(d,/function childTicket\(\)\{return null/);
 assert.ok(board.includes('hill-extra'));
 assert.ok(board.includes("document.dispatchEvent(new CustomEvent('michigan-ski:data'"));
 for(const p of ['public/assets/michigan-ski.js','public/assets/michigan-ski-decision.js','public/assets/michigan-ski-map.js']){
  assert.doesNotThrow(()=>new Function(read(p)),p);
 }
});
