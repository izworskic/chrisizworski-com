const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('public/manistee-river-map/index.html','utf8');
const data=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const ui=fs.readFileSync('public/assets/manistee-ausable-ui.js','utf8');
const css=fs.readFileSync('public/assets/manistee-ausable-ui.css','utf8');
const map=fs.readFileSync('public/assets/manistee-river-map.js','utf8');

test('Au Sable-style layer is loaded without replacing the source-backed Manistee engine',()=>{
  assert.match(data,/\/assets\/manistee-ausable-ui\.js/);
  assert.match(ui,/\/assets\/manistee-ausable-ui\.css/);
  assert.match(map,/fetch\('\/api\/manistee-river-hydrography'\)/);
  assert.match(map,/routeGraph\(state\.graphs\[from\.waterway\],from,to\)/);
});

test('field shell is map-first instead of a permanent desktop sidebar',()=>{
  assert.match(css,/\.shell\{display:flex!important;flex-direction:column!important/);
  assert.match(css,/\.map-wrap\{position:relative!important/);
  assert.match(css,/height:min\(61vh,690px\)!important/);
  assert.doesNotMatch(css,/grid-template-columns:minmax\(0,1\.45fr\)/);
});

test('masthead is deliberately terse and gives the screen back to the map',()=>{
  assert.match(ui,/Manistee River Field Map/);
  assert.match(ui,/mast\.dataset\.compacted='true'/);
  assert.match(ui,/\.crumb,\.source-strip,\.field-brandbar,\.field-kicker,\.field-counts/);
  assert.match(ui,/intro\?\.remove\(\)/);
  assert.doesNotMatch(ui,/river: live data/);
  assert.doesNotMatch(ui,/agency coordinates/);
  assert.match(css,/\.mast\{background:var\(--field-paper\)!important/);
  assert.match(css,/\.source-strip\{display:none!important/);
});

test('one simple task switcher retains the Au Sable Places Plan River Guide model',()=>{
  for(const tab of ['places','plan','river','guide'])assert.match(html,new RegExp(`data-tab="${tab}"`));
  assert.match(ui,/riverTab\.textContent='River'/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test('Places follows search then reach then Plan by then grouped compact rows',()=>{
  assert.match(html,/id="place-search"/);
  assert.match(ui,/River reach filters/);
  for(const label of ['Upper Manistee','Middle \/ Hodenpyl','Tippy','Lower Manistee','Pine River'])assert.match(ui,new RegExp(label));
  assert.match(ui,/>Plan by<\/div>/);
  assert.match(ui,/reach-divider/);
  assert.match(css,/\.place-row\{[^}]*border:0!important[^}]*border-bottom:1px/s);
});

test('persona wall is removed from the primary human workflow',()=>{
  assert.match(css,/\.persona-deck\{display:none!important\}/);
  assert.doesNotMatch(ui,/Choose your river lens/);
});

test('planner exposes common starts, NHD results, and shareable state without invented mileage',()=>{
  for(const preset of ['upper-short','upper-long','tippy-lower','lower','pine-upper','pine-lower'])assert.match(ui,new RegExp(`'${preset}'`));
  assert.match(ui,/Popular starts/);
  assert.match(ui,/Copy trip link/);
  assert.match(ui,/searchParams\.set\('from'/);
  assert.match(ui,/searchParams\.set\('to'/);
  assert.match(map,/No trustworthy NHD route could be built/);
});

test('deep access and seasonal detail use progressive disclosure',()=>{
  assert.match(ui,/River, weather & field details/);
  assert.match(ui,/Seasonal gauge detail/);
  assert.match(ui,/document\.createElement\('details'\)/);
  assert.match(css,/\.field-more>summary/);
});

test('River opens with a compact conditions-now strip before full gauge detail',()=>{
  assert.match(ui,/conditions-now-strip/);
  assert.match(ui,/Upper flow/);
  assert.match(ui,/Upper water/);
  assert.match(ui,/Lower flow/);
  assert.match(ui,/Pine flow/);
  assert.match(css,/#conditions-now-strip\{display:grid/);
});

test('mobile field use keeps the map substantial and touch targets at least 44px',()=>{
  assert.match(css,/@media\(max-width:900px\)/);
  assert.match(css,/height:58svh!important/);
  assert.match(css,/\.reach-filter[^}]*min-height:44px!important/s);
  assert.match(css,/\.map-toolbar button\{min-height:44px!important\}/);
  assert.match(css,/\.place-row\{min-height:52px!important\}/);
});