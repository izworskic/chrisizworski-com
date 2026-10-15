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
test('ski photographs have Michigan-specific provenance and license, not fabricated previews',()=>{
 const g=read('scripts/generate-michigan-ski-pages.mjs');
 assert.ok(g.includes('File:Boyne_Mountain.JPG'));
 assert.ok(g.includes('File:Crystal_Mountain_-_Cheers_Chair.jpg'));
 assert.ok(g.includes('creativecommons.org/licenses/by-sa/3.0'));
 assert.match(g,/Historical photograph, not a live conditions image/);
 assert.match(g,/slug==='boyne-mountain'\|\|slug===null/);
 assert.ok(!g.includes('Crystal_Mountain_skiers.jpg'));
});
test('map and graph respond to day selection and preserve keyboard operation',()=>{
 const map=read('public/assets/michigan-ski-map.js');
 const d=read('public/assets/michigan-ski-decision.js');
 const board=read('public/assets/michigan-ski.js');
 for(const k of ['snowChart(day)','selectedForecast(day)','snow-chart-row','ski-day-bar','addEventListener(\\'keydown\\''])assert.ok(map.includes(k),k);
 assert.ok(map.includes("document.getElementById('ski-day')?.addEventListener('change',render)"));
 assert.ok(d.includes('offSeason&&S.goal===\\'powder\\'?[]:candidates()'));
 assert.match(d,/function childTicket\(\)\{return null/);
 assert.ok(board.includes('hill-extra'));
 assert.ok(board.includes("document.dispatchEvent(new CustomEvent('michigan-ski:data'"));
 for(const p of ['public/assets/michigan-ski.js','public/assets/michigan-ski-decision.js','public/assets/michigan-ski-map.js']){
  assert.doesNotThrow(()=>new Function(read(p)),p);
 }
});
