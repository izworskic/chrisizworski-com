'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Icons=require('../public/assets/seaway-vessel-icons.js');
const seaway=fs.readFileSync('public/assets/seaway.js','utf8');
const css=fs.readFileSync('public/assets/seaway.css','utf8');

test('Coast Guard AIS codes map to distinct, honestly labeled silhouettes',()=>{
 const samples=[
  [70,'cargo'],[79,'cargo'],[80,'tanker'],[89,'tanker'],
  [60,'passenger'],[69,'passenger'],[31,'tug'],[32,'tug'],[52,'tug'],[57,'tug'],
  [37,'pleasure'],[36,'sail'],[30,'fishing'],
  [33,'service'],[34,'service'],[50,'service'],[51,'service'],[53,'service'],[54,'service'],[55,'service'],[58,'service'],
  [0,'unknown'],[20,'unknown'],[35,'unknown'],[40,'unknown'],[56,'unknown'],[90,'unknown'],
  [null,'unknown'],[undefined,'unknown'],['70','unknown'],[70.5,'unknown']
 ];
 for(const [shipType,expected] of samples){
  const kind=Icons.classify({shipType});
  assert.equal(kind,expected,'AIS code '+String(shipType));
  const svg=Icons.svg(kind);
  assert.match(svg,/<svg viewBox="0 0 72 36"/);
  assert.match(svg,/class="ship-hull"/);
  assert.ok(svg.includes('</svg>'));
 }
 const all=Icons.KINDS.map(x=>x.kind);
 assert.deepEqual(all,['cargo','tanker','passenger','tug','pleasure','sail','fishing','service','unknown']);
 assert.equal(new Set(all.map(x=>Icons.svg(x))).size,all.length,'each vessel class needs a visibly different path');
});

test('vessel scale uses validated length, never invents type or hides small craft',()=>{
 for(const [length,band] of [[8,'small'],[39.99,'small'],[40,'medium'],[149,'medium'],
   [150,'large'],[400,'large'],[null,'unknown'],[undefined,'unknown'],[-5,'unknown'],
   [0,'unknown'],[NaN,'unknown'],['200','unknown'],[750,'unknown']]){
  assert.equal(Icons.sizeBand({lengthMeters:length}),band,String(length));
 }
 const small=Icons.icon({shipType:70,lengthMeters:12,speedKnots:1},{zoom:11});
 const medium=Icons.icon({shipType:70,lengthMeters:100,speedKnots:1},{zoom:11});
 const big=Icons.icon({shipType:70,lengthMeters:220,speedKnots:1},{zoom:11});
 const missing=Icons.icon({shipType:null,lengthMeters:220,speedKnots:1},{zoom:11});
 assert.deepEqual([small.size[0],medium.size[0],big.size[0]],[38,49,63]);
 assert.equal(missing.kind,'unknown','a 220m vessel with missing AIS type must not be called a freighter');
 assert.equal(missing.band,'large');
 assert.equal(Icons.icon({shipType:37,lengthMeters:12,speedKnots:3},{zoom:6}).size[0],35,
  'small pleasure craft remain visible at corridor zoom');
 assert.ok(Icons.icon({shipType:70,lengthMeters:220,speedKnots:3},{zoom:11,selected:true}).size[0]>big.size[0]);
 assert.ok(Icons.icon({shipType:70,lengthMeters:220,speedKnots:3},{zoom:11,selected:true}).size[0]<=76);
 assert.match(Icons.icon({shipType:70,lengthMeters:220,speedKnots:null}).className,/is-unknown/);
 assert.match(Icons.icon({shipType:70,lengthMeters:220,speedKnots:0}).className,/is-stopped/);
 assert.match(Icons.icon({shipType:70,lengthMeters:220,speedKnots:3}).className,/is-moving/);
 const changed=Icons.icon({shipType:37,lengthMeters:220,speedKnots:3},{zoom:11});
 assert.notEqual(changed.key,big.key,'type update changes the marker icon cache key');
 assert.ok(!Icons.svg('unknown').includes('Cargo'));
});

test('map and list both consume identical kind silhouettes; preserve cluster and AIS selection',()=>{
 assert.match(seaway,/Icons=window\.SeawayVesselIcons/);
 assert.match(seaway,/function shipIcon\(v\)/);
 assert.match(seaway,/Icons\?\.icon\(v,\{zoom:map\.getZoom\(\),selected:v\.mmsi===selectedShip\}\)/);
 assert.match(seaway,/if\(m\._seawayIcon!==glyph\.key\)m\.setIcon\(glyph\.icon\)/);
 assert.match(seaway,/v\.shipType,age\(v\.seen\)/,'card redraw if AIS type changes');
 assert.match(seaway,/symbol\.innerHTML=shape\?\.html\|\|shipSVG\(\)/);
 assert.match(seaway,/function vesselGroupIcon\(group\)/,'existing cluster workflow is intact');
 assert.match(seaway,/C\.groupMapReports\(/,'clustering unchanged');
 assert.match(seaway,/m\.on\('click',\(\)=>chooseShip\(v\.mmsi,false\)\)/);
 assert.match(seaway,/m\.on\('popupopen'/,'photo popup preserved');
 assert.match(seaway,/function renderVesselTypeLegend\(\)/);
 assert.match(seaway,/caption\.after\(legend\)/,'legend belongs BELOW map, not above map or on tiles');
 assert.match(seaway,/legend\.setAttribute\('aria-label','Reported AIS vessel type symbols'\)/);
 assert.match(css,/\.seaway-type-legend-item/);
 assert.match(css,/\.ship-mast/);
 assert.match(css,/\.ship-sail/);
 assert.doesNotMatch(css,/\.leaflet-pane\s*\{[^}]*z-index:9999/);
});

test('both canonical ship maps load type module BEFORE the map and ship popup helpers remain',()=>{
 for(const slug of ['st-lawrence-seaway','eisenhower-lock']){
  const html=fs.readFileSync('public/'+slug+'/index.html','utf8');
  const icon=html.indexOf('/assets/seaway-vessel-icons.js?v=20261108a');
  const map=html.indexOf('/assets/seaway.js?v=20261108i');
  const photo=html.indexOf('/assets/seaway-popup-photos.js?v=20261108f');
  assert.ok(icon>=0&&map>icon&&photo>=0&&map>photo,slug+' should load type icons and photo helper before map renderer');
  assert.match(html,/\/assets\/seaway\.css\?v=20261108i/);
  assert.match(html,/rel="canonical"/);
 }
 for(const path of ['scripts/generate-seaway.mjs','scripts/enhance-seaway-journey.mjs']){
  const s=fs.readFileSync(path,'utf8');
  assert.match(s,/seaway\.js\?v=20261108i/);
  assert.match(s,/seaway\.css\?v=20261108i/);
 }
 assert.match(fs.readFileSync('scripts/generate-seaway.mjs','utf8'),/seaway-vessel-icons\.js\?v=20261108a/);
});
