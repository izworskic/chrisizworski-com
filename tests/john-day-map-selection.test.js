'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('raster map starts without WebGL, uses lock dots, and retains vessel selection before initialization',()=>{
 const els=new Map(),events={},mapEvents={},moves=[],markers=[],circles=[],circleClicks=[];let clears=0;
 function el(){return {listeners:{},hidden:false,append(){},replaceChildren(){},setAttribute(){},addEventListener(k,f){this.listeners[k]=f}}}
 const get=id=>{if(!els.has(id))els.set(id,el());return els.get(id)};
 const map={setView(v){moves.push(v);return this},getZoom(){return 12},fitBounds(){},on(k,f){mapEvents[k]=f},getBounds(){return {getWest:()=>-180,getEast:()=>180,getSouth:()=>-90,getNorth:()=>90}}};
 const L={map(){return map},tileLayer(){return {addTo(){return this},on(){return this}}},layerGroup(){return {addTo(){return this},clearLayers(){clears++},removeLayer(m){m.removed=true}}},divIcon:o=>o,
 circleMarker(pos){circles.push(pos);return {addTo(){return this},bindTooltip(){return this},bindPopup(){return this},openPopup(){return this},on(k,f){if(k==='click')circleClicks.push(f);return this},setStyle(){}}},
 marker(pos){const m={addTo(){return this},bindPopup(){return this},on(){return this},getLatLng(){return pos},setLatLng(v){pos=v;this.moves=(this.moves||0)+1;return this},setIcon(){this.iconChanges=(this.iconChanges||0)+1;return this},setPopupContent(){return this},openPopup(){this.open=true}};markers.push(m);return m}};
 const context={document:{getElementById:get,querySelectorAll:()=>[],createElement:el},window:{addEventListener(k,f){events[k]=f}},L,navigator:{},setTimeout:()=>1,clearTimeout(){},setInterval(){},Date,encodeURIComponent,CustomEvent:class{}};
 // Explicit missing-library start uses the cards fallback, then a later select retries safely.
 vm.runInNewContext(fs.readFileSync('public/assets/john-day-map.js','utf8'),context);
 assert.equal(get('mapRecover').hidden,false);
 events['john-day-ais-observations']({detail:{observations:[{mmsi:'123',lon:-120.6,lat:45.7,seen:new Date().toISOString()}]}});
 context.window.L=L;context.window.JohnDayVessels=require('../public/assets/john-day-vessels');context.window.JohnDayMapTiles=require('../lib/john-day-map-ais');events['john-day-ais-select']({detail:{mmsi:'123'}});
 assert.equal(get('mapRecover').hidden,true);assert.equal(circles.length,6);assert.equal(markers.length,1);
 assert.equal(moves.at(-1)[1],-120.6);assert.equal(markers[0].open,true);
 // Repeated AIS refreshes and map moves keep the same DOM-backed Leaflet marker and popup.
 const update={mmsi:'123',lon:-120.6,lat:45.7,seen:new Date().toISOString()};
 events['john-day-ais-observations']({detail:{observations:[update]}});mapEvents.moveend();
 assert.equal(markers.length,1);assert.equal(markers[0].open,true);assert.equal(clears,0);assert.ok(!markers[0].iconChanges);
 events['john-day-ais-observations']({detail:{observations:[{...update,lon:-120.5}]}});
 assert.equal(markers.length,1);assert.equal(markers[0].moves,1);assert.equal(markers[0].open,true);
 circleClicks[0]();assert.equal(markers[0].iconChanges,1); // Lock selection immediately clears orange/large ship styling.

 events['john-day-ais-observations']({detail:{observations:[]}});
 events['john-day-ais-select']({detail:{mmsi:'123'}});assert.equal(markers.length,1);assert.ok(markers[0].removed);
});
