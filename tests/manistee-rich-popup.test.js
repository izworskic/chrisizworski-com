const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const core=fs.readFileSync('public/assets/manistee-river-map.js','utf8');
const depth=fs.readFileSync('public/assets/manistee-river-live-depth.js','utf8');

test('access markers open a real decision popup instead of only a name tooltip',()=>{
  assert.match(core,/m\.bindTooltip\(p\.name/);
  assert.match(core,/m\.bindPopup\(\(\)=>accessPopupHtml\(p\)/);
  assert.match(core,/data-manistee-popup/);
  assert.match(core,/mrp-note/);
  assert.match(core,/Location confidence/);
  assert.match(core,/Official \/ location source/);
  assert.match(core,/Navigate here/);
});

test('marker click keeps the popup as the primary interaction surface',()=>{
  assert.match(core,/m\.on\('click',\(\)=>selectPlace\(p\.id,false\)\)/);
  assert.doesNotMatch(core,/m\.on\('click',\(\)=>selectPlace\(p\.id,true\)\)/);
  assert.match(core,/maxWidth:360/);
  assert.match(core,/maxHeight:520/);
});

test('every access popup can progressively add same-waterway USGS conditions',()=>{
  assert.match(depth,/function enrichPopup\(id\)/);
  assert.match(depth,/g\.waterway===p\.waterway/);
  assert.match(depth,/Nearest gauge/);
  assert.match(depth,/Flow/);
  assert.match(depth,/Water \/ stage/);
  assert.match(depth,/Freshness/);
  assert.match(depth,/percent_of_median/);
  assert.match(depth,/seasonal_stats/);
});

test('every access popup can progressively add exact-point NWS weather and alerts',()=>{
  assert.match(depth,/manistee-river-weather\?lat=\$\{p\.lat\}&lon=\$\{p\.lon\}/);
  assert.match(depth,/Weather at this access/);
  assert.match(depth,/Wind \/ precipitation/);
  assert.match(depth,/NWS alerts/);
  assert.match(depth,/precipitation_context/);
});

test('popup enrichment is resilient to script timing and repeated Leaflet popup DOM',()=>{
  assert.match(core,/manistee:popup-open/);
  assert.match(depth,/document\.addEventListener\('manistee:popup-open'/);
  assert.match(depth,/MutationObserver/);
  assert.match(depth,/data-popup-live/);
  assert.match(depth,/dataset\.loaded/);
});

test('USGS gauge points also use rich popups',()=>{
  assert.match(core,/gaugePopupHtml\(meta,g\)/);
  assert.match(core,/Seasonal median/);
  assert.match(core,/Gage height/);
  assert.match(core,/Turbidity/);
  assert.match(core,/Dissolved oxygen/);
  assert.match(core,/Open USGS station/);
});

test('rich popups preserve source and safety boundaries',()=>{
  assert.match(depth,/Gauge data describes the gauge location/);
  assert.match(depth,/NWS data is nearby land-weather context/);
  assert.doesNotMatch(core+depth,/safe to wade|safe to paddle|safe to boat|safe to fish|prime fishing|stay home/i);
});

test('rich popup layout is bounded on phones',()=>{
  assert.match(depth,/manistee-rich-popup/);
  assert.match(depth,/max-width:calc\(100vw - 34px\)/);
  assert.match(depth,/@media\(max-width:480px\)/);
  assert.match(depth,/mrp-facts\{grid-template-columns:1fr\}/);
});
