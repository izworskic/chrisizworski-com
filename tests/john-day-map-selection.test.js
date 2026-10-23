'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('raster map starts without WebGL, uses lock dots, and retains vessel selection before initialization',()=>{
 const els=new Map(),events={},moves=[],markers=[],circles=[];
 function el(){return {listeners:{},hidden:false,append(){},replaceChildren(){},setAttribute(){},addEventListener(k,f){this.listeners[k]=f}}}
 const get=id=>{if(!els.has(id))els.set(id,el());return els.get(id)};
 const map={setView(v){moves.push(v);return this},getZoom(){return 12},fitBounds(){},on(){}};
 const L={map(){return map},tileLayer(){return {addTo(){return this},on(){return this}}},layerGroup(){return {addTo(){return this},clearLayers(){}}},divIcon:o=>o,
 circleMarker(pos){circles.push(pos);return {addTo(){return this},bindTooltip(){return this},bindPopup(){return this},on(){return this},setStyle(){}}},
 marker(pos){const m={addTo(){return this},bindPopup(){return this},on(){return this},getLatLng(){return pos},openPopup(){this.open=true}};markers.push(m);return m}};
 const context={document:{getElementById:get,querySelectorAll:()=>[],createElement:el},window:{addEventListener(k,f){events[k]=f}},L,navigator:{},setTimeout:()=>1,clearTimeout(){},setInterval(){},Date,encodeURIComponent,CustomEvent:class{}};
 // Explicit missing-library start uses the cards fallback, then a later select retries safely.
 vm.runInNewContext(fs.readFileSync('public/assets/john-day-map.js','utf8'),context);
 assert.equal(get('mapRecover').hidden,false);
 events['john-day-ais-observations']({detail:{observations:[{mmsi:'123',lon:-120.6,lat:45.7,seen:new Date().toISOString()}]}});
 context.window.L=L;events['john-day-ais-select']({detail:{mmsi:'123'}});
 assert.equal(get('mapRecover').hidden,true);assert.equal(circles.length,6);assert.equal(markers.length,1);
 assert.equal(moves.at(-1)[1],-120.6);assert.equal(markers[0].open,true);
 events['john-day-ais-observations']({detail:{observations:[]}});
 events['john-day-ais-select']({detail:{mmsi:'123'}});assert.equal(markers.length,1);
});
