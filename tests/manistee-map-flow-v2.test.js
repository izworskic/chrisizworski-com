const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('public/manistee-river-map/index.html','utf8');
const flow=fs.readFileSync('public/assets/manistee-map-flow-v2.js','utf8');

test('map flow v2 is loaded directly by the page with a cache-busting release id',()=>{
  assert.match(html,/\/assets\/manistee-map-flow-v2\.js\?v=20260820-0933/);
});

test('river key is truly collapsed by default and old key controls cannot win',()=>{
  assert.match(flow,/#manistee-river-key:not\(\[data-v2-open="true"\]\)\{display:none!important\}/);
  assert.match(flow,/#manistee-river-key\[data-v2-open="true"\]\{display:block!important/);
  assert.match(flow,/\.manistee-key-toggle:not\(\.manistee-key-toggle-v2\)\{display:none!important\}/);
  assert.match(flow,/btn\.textContent='Map key'/);
});

test('native Leaflet rich popup is hidden instead of stretched or cosmetically detached',()=>{
  assert.match(flow,/#manistee-map \.leaflet-popup\.manistee-rich-popup\{opacity:0!important;pointer-events:none!important\}/);
  assert.match(flow,/className='manistee-detached-card'/);
  assert.match(flow,/body\.innerHTML=html/);
});

test('desktop point details occupy the open side of the map without a popup tail',()=>{
  assert.match(flow,/width:min\(560px,calc\(100% - 32px\)\)/);
  assert.match(flow,/const gap=22,rightSpace=mr\.width-anchorX,leftSpace=anchorX/);
  assert.match(flow,/rightSpace>=leftSpace\?anchorX\+gap:anchorX-cr\.width-gap/);
  assert.doesNotMatch(flow,/leaflet-popup-tip-container/);
});

test('wide data layout reduces vertical card growth',()=>{
  assert.match(flow,/grid-template-columns:minmax\(0,\.92fr\) minmax\(0,1\.08fr\)/);
  assert.match(flow,/mrp-live-grid\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(flow,/mrp-river>\.mrp-stat-list.*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
});

test('small screens preserve the map with a bounded bottom detail card',()=>{
  assert.match(flow,/@media\(max-width:760px\)/);
  assert.match(flow,/bottom:10px!important/);
  assert.match(flow,/max-height:43vh!important/);
});
