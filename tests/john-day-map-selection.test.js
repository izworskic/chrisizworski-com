'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('vessel selection before lazy map initialization is replayed on load and cleared when its reports disappear',async()=>{
 const els=new Map(),events={},moves=[],handlers={},sources={};
 function el(){return {listeners:{},classList:{add(){},remove(){}},append(){},replaceChildren(){},setAttribute(){},querySelector(){return el()},addEventListener(k,f){this.listeners[k]=f}}}
 const get=id=>{if(!els.has(id))els.set(id,el());return els.get(id)};
 class FakeMap{addControl(){}on(k,...v){if(v.length===1)handlers[k]=v[0]}addSource(k,v){sources[k]={...v,setData(){}}}addLayer(){}getSource(k){return sources[k]}isStyleLoaded(){return true}easeTo(v){moves.push(v)}getZoom(){return 11}remove(){}}
 const script=fs.readFileSync('public/assets/john-day-map.js','utf8').replace("import('https://cdn.jsdelivr.net/npm/maplibre-gl@6.3.0/dist/maplibre-gl.mjs')",'Promise.resolve(fakeGL)');
 vm.runInNewContext(script,{document:{getElementById:get,querySelectorAll:()=>[],createElement:el,head:{append(){}}},window:{addEventListener(k,f){events[k]=f}},fakeGL:{Map:FakeMap,NavigationControl:class{},AttributionControl:class{}},matchMedia:()=>({matches:true}),URL,AbortSignal,fetch:async()=>({ok:false}),setTimeout:()=>1,clearTimeout(){},navigator:{}});
 events['john-day-ais-observations']({detail:{observations:[{mmsi:'123',lon:-120.6,lat:45.7}]}});
 events['john-day-ais-select']({detail:{mmsi:'123'}});assert.equal(moves.length,0);
 await get('lockMapStart').listeners.click();handlers.load();
 assert.equal(moves.length,1);assert.equal(moves[0].center[0],-120.6);assert.equal(moves[0].duration,0);
 events['john-day-ais-observations']({detail:{observations:[]}});
 // Simulate a style reload: stale selection must not reappear after the feed clears.
 handlers.load();assert.equal(moves.length,1);
});
