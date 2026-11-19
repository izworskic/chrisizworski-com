'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('public/rideau-canal/index.html','utf8');
const js=fs.readFileSync('public/assets/rideau-canal.js','utf8');
const css=fs.readFileSync('public/assets/rideau-canal.css','utf8');

test('visitor map is a leading place chooser rather than buried after long guide',()=>{
  const map=html.indexOf('id="rideau-lookout"');
  const detail=html.indexOf('id="selected-place"');
  const image=html.indexOf('id="feature-photo-wrap"');
  const guide=html.indexOf('id="rideau-watch-guide"');
  assert.ok(map>0&&detail>map,'Map should precede destination story');
  assert.ok(image>detail&&guide>image,'Real destination photo should precede extended watch instructions');
  for(const id of ['rideau-lookout-title','rideau-lookout-selection','rideau-map','rideau-map-jump','map-fallback'])
    assert.match(html,new RegExp('id="'+id+'"'),id);
  assert.equal((html.match(/id="rideau-map"/g)||[]).length,1);
  assert.match(html,/href="#rideau-lookout"/);
  assert.match(css,/\.rideau-lookout #rideau-map\{height:330px\}/);
  assert.match(css,/\.workspace\[data-mode-current="visit"\] \.work-left\{position:sticky/);
  assert.match(css,/@media\(max-width:600px\)/);
});
test('a map pin outside editorial filters remains selected without pretending to be a recommendation',()=>{
  assert.match(js,/const outOfFilter=state\.mode==='visit'/);
  assert.match(js,/const displayed=outOfFilter\?\[outOfFilter,\.\.\.candidates\]:candidates/);
  assert.match(js,/Selected on map · outside filters/);
  assert.match(js,/chooseFilteredDefault\(\);renderCandidates\(\);renderPlace\(\)/);
  assert.match(js,/setText\('rideau-lookout-selection',p\.name\)/);
  assert.match(js,/const marker=L\.marker/);
  assert.match(js,/marker\.addTo\(map\)\.on\('click',\(\)=>choosePlace\(p\.id,true\)\)/);
});
test('all three journey modes, the five-stage lab, SEO, ads, and season source remain intact',()=>{
  for(const x of ['data-mode="visit"','data-mode="cruise"','data-mode="paddle"','id="lock-lab-forward"','id="rideau-flight-enhanced"'])
    assert.ok(html.includes(x),x);
  assert.match(html,/https:\/\/chrisizworski\.com\/rideau-canal\//);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/October 12, 2026/);
  assert.match(html,/2027 hours have not been verified/);
  assert.match(html,/\/assets\/rideau-canal\.js\?v=20261119-lookout/);
  assert.match(html,/\/assets\/rideau-canal\.css\?v=20261119-lookout/);
  assert.doesNotMatch(js,/WebGL|React|navigator\.geolocation/);
});

test('map pins have stable numbered partners and map failure preserves named location choices',()=>{
  assert.match(html,/id="rideau-station-strip"/);
  assert.match(html,/id="rideau-map-readiness"/);
  assert.match(js,/function renderStationPicker\(/);
  assert.match(js,/function syncStationPicker\(/);
  assert.match(js,/highlights\.forEach\(\(place,index\)=>/);
  assert.match(js,/button\.dataset\.placeId=place\.id/);
  assert.match(js,/button\.setAttribute\('aria-pressed'/);
  assert.match(js,/html:'<span class="lock-pin">'\+\(index\+1\)\+'<\/span>'/);
  assert.match(js,/loaded=true; \$\('rideau-map-readiness'\)\.hidden=true/);
  assert.match(html,/Choose a named lockstation below/);
});
