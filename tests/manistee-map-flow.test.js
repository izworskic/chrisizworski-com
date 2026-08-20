const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const data=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const flow=fs.readFileSync('public/assets/manistee-map-flow.js','utf8');
const core=fs.readFileSync('public/assets/manistee-river-map.js','utf8');

test('Au Sable-style map flow enhancement loads additively',()=>{
  assert.match(data,/\/assets\/manistee-map-flow\.js/);
  assert.match(data,/Optional decision layers are additive/);
  assert.match(core,/fetch\('\/api\/manistee-river-hydrography'\)/);
  assert.doesNotMatch(flow,/fetch\('\/api\/manistee-river-hydrography'\)/);
});

test('river key is hidden by default and opens only from the map-key control',()=>{
  assert.match(flow,/className='manistee-key-toggle'/);
  assert.match(flow,/toggle\.textContent='Map key'/);
  assert.match(flow,/key\.dataset\.open='false'/);
  assert.match(flow,/aria-expanded','false'/);
  assert.match(flow,/data-flow-key="true"\]\{display:none!important/);
  assert.match(flow,/data-open="true"\]\{display:block!important/);
  assert.match(flow,/event\.key==='Escape'/);
});

test('point cards are visually detached from the marker and choose the open side of the map',()=>{
  assert.match(flow,/leaflet-popup-tip-container\{display:none!important\}/);
  assert.match(flow,/const dockRight=anchorX < mapRect\.left\+mapRect\.width\/2/);
  assert.match(flow,/wrapperRect\.width\/2\+18/);
  assert.match(flow,/popup\.style\.marginLeft/);
  assert.match(flow,/popup\.style\.marginBottom/);
  assert.match(flow,/popup\.dataset\.dock=dockRight\?'right':'left'/);
});

test('detached cards are wider and shallower instead of becoming long map-obscuring columns',()=>{
  assert.match(flow,/width:min\(540px,calc\(100vw - 56px\)\)/);
  assert.match(flow,/max-height:min\(58vh,440px\)/);
  assert.match(flow,/grid-template-columns:minmax\(0,\.9fr\) minmax\(0,1\.1fr\)/);
  assert.match(flow,/mrp-live-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(flow,/mrp-river>\.mrp-stat-list.*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
});

test('mobile keeps the detached card bounded and map-first',()=>{
  assert.match(flow,/@media\(max-width:560px\)/);
  assert.match(flow,/width:calc\(100vw - 24px\)/);
  assert.match(flow,/max-height:48vh/);
  assert.match(flow,/popup\.dataset\.dock='center'/);
});

test('live popup enrichment can resize without breaking detached positioning',()=>{
  assert.match(flow,/new MutationObserver\(\(\)=>schedulePopupLayout\(popup\)\)/);
  assert.match(flow,/observer\.observe\(content,\{childList:true,subtree:true,characterData:true\}\)/);
  assert.match(flow,/window\.addEventListener\('resize'/);
});
