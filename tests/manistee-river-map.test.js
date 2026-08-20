const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const conditions=require('../api/manistee-river-conditions.js')._test;
const hydro=require('../api/manistee-river-hydrography.js')._test;
const html=fs.readFileSync('public/manistee-river-map/index.html','utf8');
const js=fs.readFileSync('public/assets/manistee-river-map.js','utf8');
const dataSource=fs.readFileSync('public/assets/manistee-river-data.js','utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(dataSource,context);const data=context.window.MANISTEE_FIELD_DATA;

test('fabrication loss: every mapped place has coordinates, provenance and a source URL',()=>{
  assert.ok(data.places.length>=15);
  for(const p of data.places){
    assert.ok(p.id&&p.name&&p.waterway&&p.reach,JSON.stringify(p));
    assert.equal(Number.isFinite(p.lat),true,p.name);
    assert.equal(Number.isFinite(p.lon),true,p.name);
    assert.ok(p.lat>=44&&p.lat<=45&&p.lon>=-86.4&&p.lon<=-84.6,p.name);
    assert.match(p.source.url,/^https:\/\//,p.name);
    assert.ok(['agency','mapped-agency-site','community-verified'].includes(p.confidence),p.name);
    assert.ok(p.locationSource,p.name);
  }
});

test('identity loss: place IDs are unique and every selection surface keeps exact record identity',()=>{
  const ids=data.places.map(p=>p.id);assert.equal(new Set(ids).size,ids.length);
  assert.match(js,/encodeURIComponent\(`\$\{p\.lat\},\$\{p\.lon\}`\)/);
  assert.match(js,/destination=\$\{q\}/);
  assert.match(js,/m\.bindPopup\(\(\)=>accessPopupHtml\(p\)/);
  assert.match(js,/m\.on\('click',\(\)=>selectPlace\(p\.id,false\)\)/);
  assert.match(js,/selectPlace\(b\.dataset\.id,true\)/);
  assert.match(js,/data-id="\$\{esc\(p\.id\)\}"/);
});

test('hydrography loss: source geometry is bounded USGS NHD, not hand-drawn river coordinates',()=>{
  const url=new URL(hydro.queryUrl());
  const where=url.searchParams.get('where')||'';
  assert.equal(url.hostname,'hydro.nationalmap.gov');
  assert.match(where,/gnis_name='Manistee River'/);
  assert.match(where,/gnis_name='Pine River'/);
  assert.match(where,/gnis_name='Bear Creek'/);
  assert.match(where,/gnis_name='Little Manistee River'/);
  assert.equal(url.searchParams.get('geometry'),'-86.35,44.02,-84.68,44.95');
  assert.equal(url.searchParams.get('outFields'),'gnis_name,reachcode,fcode');
  assert.equal(url.searchParams.get('f'),'geojson');
  assert.doesNotMatch(dataSource,/riverGeometry\s*:/);
});

test('tributary identity loss: Little Manistee is explicitly a companion, not a direct tributary',()=>{
  const little=data.waterways.find(w=>w.id==='little-manistee');
  assert.equal(little.kind,'companion');
  assert.match(little.note,/separate|not labeled as a direct tributary/i);
  assert.match(html,/companion.*not.*tributary|not mislabeled as a direct Manistee River tributary/is);
});

test('freshness loss: active USGS gauges include four Manistee stations and Pine',()=>{
  assert.deepEqual(conditions.SITES,['04123500','04124000','04124200','04125550','04125460']);
  assert.equal(data.gauges.filter(g=>!g.historic).length,5);
  assert.match(fs.readFileSync('api/manistee-river-conditions.js','utf8'),/age_minutes/);
  assert.match(fs.readFileSync('api/manistee-river-conditions.js','utf8'),/<=180/);
  assert.match(js,/Stale \/ unavailable/);
});

test('temperature context is care guidance, never a legal closure or safety verdict',()=>{
  assert.equal(conditions.tempContext(64).key,'cool');
  assert.equal(conditions.tempContext(66).key,'warm');
  assert.equal(conditions.tempContext(68).key,'thermal-stress');
  assert.match(html,/not a legal closure/i);
  assert.doesNotMatch(js,/safe to fish|safe to paddle|river is safe/i);
});

test('planner loss: route distance uses a graph along NHD geometry and refuses cross-waterway routing',()=>{
  assert.match(js,/function buildGraph\(features\)/);
  assert.match(js,/function routeGraph\(graph,start,end\)/);
  assert.match(js,/Planner refuses cross-waterway routing/);
  assert.match(js,/No trustworthy NHD route could be built/);
  assert.doesNotMatch(js,/straightLineDistance|crowFlies/);
  assert.match(html,/measures along the river instead of drawing a straight line/i);
});

test('regulation loss: tool links current DNR rules instead of hardcoding reach-specific legal claims',()=>{
  assert.match(html,/2026 DNR fishing rules/);
  assert.match(html,/March 31, 2027/);
  assert.match(html+js,/does not replace Michigan fishing regulations|does not turn a point location into a legal-rule claim/i);
  assert.match(data.sources.regulations.url,/michigan\.gov\/dnr/);
  assert.doesNotMatch(dataSource,/artificial flies only|daily possession limit|minimum size/i);
});

test('mobile task loss: map, places, directions and planner have responsive affordances',()=>{
  assert.match(html,/@media\(max-width:900px\)/);
  assert.match(html,/height:58vh/);
  assert.match(html,/Nearest access/);
  assert.match(js,/scrollIntoView/);
  assert.match(html+js,/Directions/);
  assert.match(html,/Put-in/);
  assert.match(html,/Takeout/);
});

test('browser dependency loss: Leaflet has a runtime stylesheet fallback',()=>{
  assert.match(js,/function ensureLeafletCss\(\)/);
  assert.match(js,/leaflet@1\.9\.4\/dist\/leaflet\.css/);
  assert.match(js,/data-manistee-leaflet|dataset\.manisteeLeaflet/);
});

test('SEO and AI-discovery loss: canonical, source-rich schema and visible field guide are present',()=>{
  assert.match(html,/<title>Manistee River Map & Trip Planner \| Access, Flows, Fishing<\/title>/);
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/manistee-river-map\/"/);
  assert.match(html,/"@type":"WebApplication"/);
  assert.match(html,/"@type":"Dataset"/);
  assert.match(html,/"@type":"FAQPage"/);
  assert.match(html,/Primary sources and verification links/);
  assert.match(html,/Data honesty/);
});

test('graceful degradation loss: live-service failures preserve the static map guide',()=>{
  assert.match(js,/USGS river geometry unavailable — access points and guide still work/);
  assert.match(js,/Live USGS readings are unavailable right now/);
  assert.match(html,/source-backed|field guide/i);
});

test('hydrography normalizer accepts live lowercase fields and alias-style fields',()=>{
  const result=hydro.cleanGeoJson({features:[
    {type:'Feature',geometry:{type:'LineString',coordinates:[[-85,44],[-85.1,44.1]]},properties:{gnis_name:'Manistee River',reachcode:'x',fcode:46006}},
    {type:'Feature',geometry:{type:'LineString',coordinates:[[-85.2,44.1],[-85.3,44.2]]},properties:{GNIS_NAME:'Pine River',REACHCODE:'y',FCode:46006}},
    {type:'Feature',geometry:{type:'LineString',coordinates:[[-80,40],[-80.1,40.1]]},properties:{gnis_name:'Other River'}}
  ]});
  assert.equal(result.features.length,2);
  assert.equal(result.features[0].properties.role,'mainstem');
  assert.equal(result.features[1].properties.role,'tributary');
});

test('USGS normalizer preserves missing values rather than fabricating readings',()=>{
  const out=conditions.normalize({value:{timeSeries:[]}});
  assert.equal(out.length,5);
  for(const g of out){assert.equal(g.discharge_cfs,null);assert.equal(g.water_temp_f,null);assert.equal(g.gage_height_ft,null);}
});
