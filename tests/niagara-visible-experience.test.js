'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/niagara-falls-today/index.html'),css=read('public/assets/niagara-falls-today.css'),js=read('public/assets/niagara-falls-today.js'),map=read('public/assets/niagara-visit-map.js');
test('visible release changes first-screen experience, not just internal QA',()=>{
 assert.match(css,/\.hero\{display:grid;grid-template-columns:minmax\(0,1\.02fr\)/);
 assert.match(css,/\.hero-photo\{margin:0;min-height:278px;height:278px/);
 assert.match(css,/\.controls \.visit-quick-start\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.equal((html.match(/class="intent-mark"/g)||[]).length,3);
 assert.match(html,/id="result-body" aria-busy="false"/);
 assert.match(html,/See the American Falls first/);
 assert.match(css,/\.plan-preview \.preview-places/);
 assert.match(css,/@media\(max-width:640px\)/);
});
test('side switch previews authentic, distinct same-country landmarks without claiming a planned route',()=>{
 assert.match(js,/function showOrientation\(side\)/);
 assert.match(js,/if\(hasPlanned\)submit\(\)/);
 assert.match(js,/else if\(field==='starting_side'\)showOrientation/);
 assert.match(js,/showOrientation\(form\.elements\.starting_side\.value/);
 for(const id of ['Prospect Point','Goat Island','Table Rock','Queen Victoria Park']){
  assert.ok(js.includes(id),id);
 }
 assert.match(js,/orientation landmarks—not a timed itinerary/);
 assert.match(map,/function preview\(side\)/);
 assert.match(map,/Orientation map/);
 assert.match(map,/Not a walking path|not a walking path/);
 assert.doesNotThrow(()=>new vm.Script(map,{filename:'niagara-visit-map.js'}));
});
test('map preview adds real pins without polylines and never fabricates boat access',()=>{
 const before=map.slice(map.indexOf('function preview(side)'),map.indexOf('function render(r){'));
 assert.match(before,/lat:43\.08623,lng:-79\.06987/);
 assert.match(before,/lat:43\.07896,lng:-79\.07816/);
 assert.match(before,/seasonal/);
 assert.doesNotMatch(before,/L\.polyline|dashArray/);
 assert.match(before,/mapsSearch\(s\.location\)/);
});

test('visible releases bypass stale four-hour browser asset cache',()=>{
 const manifest=JSON.parse(read('vercel.json'));
 for(const asset of ['niagara-falls-today.css','niagara-falls-today.js','niagara-visit-map.js']){
  assert.match(html,new RegExp('/assets/'+asset.replace('.','\\.')+'\\?v='+(asset==='niagara-visit-map.js'?'niagara-keyless-20261014a':'niagara-visible-20261013a')));
 }
 const rules=manifest.headers.filter(h=>/niagara-falls-today|niagara-visit-map/.test(h.source));
 assert.equal(rules.length,2);
 for(const rule of rules)assert.ok(rule.headers.some(h=>h.key==='Cache-Control'&&h.value.includes('max-age=0')));
});
