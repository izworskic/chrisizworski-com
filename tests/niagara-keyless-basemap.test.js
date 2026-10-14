'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const mapjs=fs.readFileSync(path.join(__dirname,'../public/assets/niagara-visit-map.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/niagara-falls-today/index.html'),'utf8');
function boot(withWebGL){
 const nodes={};for(const id of ['wayfinding-status','arrival-decision','wayfinding-stop-list','open-first-stop','open-route-map','niagara-travel-choices','niagara-route-map','niagara-basemap-status'])nodes[id]={innerHTML:'',textContent:'',href:''};
 const requested=[];
 const leafletMap={setView(){return this;},fitBounds(){return this;},invalidateSize(){},attributionControl:{addAttribution(text){requested.push({kind:'attribution',text})}},removeLayer(){}};
 const layers={clearLayers(){},addLayer(){},addTo(){return this}};
 const L={
  map(){return leafletMap;},
  layerGroup(){return layers;},
  divIcon(){return {};},
  marker(){return {bindPopup(){return this;}};},
  tileLayer(url,options){requested.push({kind:'raster',url,options});return {addTo(){return this}};},
  maplibreGL:withWebGL?function(options){requested.push({kind:'vector',style:options.style});return {addTo(){return this;},getMaplibreMap(){return {once(){},on(){},isStyleLoaded(){return true;}}}};}:undefined
 };
 const ctx={window:{L,maplibregl:{supported:()=>withWebGL}},L,document:{getElementById:id=>nodes[id]||null},setTimeout(){}};
 vm.runInNewContext(mapjs,ctx,{timeout:1000});
 return {...ctx,requested,nodes};
}
test('MAP-TILE-01: no CARTO key-required watermarks or tiles may return',()=>{
 assert.doesNotMatch(mapjs,/basemaps\.cartocdn\.com|rastertiles\/light_all|api\.mapbox/);
 assert.doesNotMatch(html,/CARTO/);
 assert.match(html,/maplibre-gl@4\.7\.1\/dist\/maplibre-gl\.js/);
 assert.match(html,/@maplibre\/maplibre-gl-leaflet@0\.0\.22/);
 assert.match(html,/niagara-visit-map\.js\?v=niagara-keyless-20261014a/);
 assert.ok(html.indexOf('leaflet@1.9.4/dist/leaflet.js')<html.indexOf('maplibre-gl@4.7.1/dist/maplibre-gl.js'));
 assert.ok(html.indexOf('maplibre-gl@4.7.1/dist/maplibre-gl.js')<html.indexOf('leaflet-maplibre-gl.js'));
});
test('MAP-TILE-02: compatible MapLibre uses genuinely keyless OpenFreeMap vector style',()=>{
 const {window,requested}=boot(true);window.NiagaraVisitMap.preview('US');
 assert.equal(requested.filter(x=>x.kind==='vector').length,1);
 assert.equal(requested.find(x=>x.kind==='vector').style,'https://tiles.openfreemap.org/styles/positron');
 assert.equal(requested.filter(x=>x.kind==='raster').length,0);
 assert.ok(requested.some(x=>x.kind==='attribution'&&x.text.includes('OpenStreetMap')));
});
test('MAP-TILE-03: unsupported WebGL falls back to OSM, never watermarked CARTO',()=>{
 const {window,requested,nodes}=boot(false);window.NiagaraVisitMap.preview('CA');
 assert.equal(requested.filter(x=>x.kind==='raster').length,1);
 assert.equal(requested.find(x=>x.kind==='raster').url,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
 assert.match(nodes['niagara-basemap-status'].textContent,/keyless backup/);
 assert.match(nodes['wayfinding-status'].textContent,/Ontario/);
 assert.match(nodes['wayfinding-stop-list'].innerHTML,/Table Rock/);
});
