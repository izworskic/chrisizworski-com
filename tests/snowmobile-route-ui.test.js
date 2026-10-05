import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/assets/snowmobile-region.js',import.meta.url),'utf8');
function harness(){
 const elements=new Map();
 for(const id of ['map','routeModeToggle','routeHint','mapRouteHint','routeResult','clearRoute','buildRoute','undoRoute','editRoute','routeStops'])elements.set('#'+id,{hidden:false,innerHTML:'',textContent:'',style:{},setAttribute(){},scrollIntoView(){this.scrolled=true;}});
 const features=[];const mapEvents={};let markers=0;
 const map={setView(){return this;},once(){},on(name,fn){mapEvents[name]=fn;},getContainer(){return elements.get('#map');},fitBounds(){},closePopup(){},};
 const L={map(){return map;},tileLayer(){return{addTo(){}};},geoJSON(fc,opts){for(const f of fc.features){const layer={feature:f,handlers:{},bindPopup(){return this;},on(name,fn){this.handlers[name]=fn;return this;}};opts.onEachFeature?.(f,layer);features.push(layer);}return{addTo(){return this;},getBounds(){},remove(){}};},circleMarker(){markers++;return{addTo(){return this;},remove(){}};},polyline(){return{addTo(){return this;},getBounds(){},remove(){}};}};
 // Loading the page is kept pending; each test supplies its own map fixture.
 const context=vm.createContext({document:{querySelector:s=>elements.get(s),addEventListener(){}},window:{L,matchMedia:()=>({matches:true})},L,fetch:(_url,options)=>new Promise((_resolve,reject)=>options?.signal.addEventListener('abort',()=>reject(Object.assign(new Error('Aborted'),{name:'AbortError'})))),AbortController,setTimeout,clearTimeout,URLSearchParams,console});
 vm.runInContext(source,context);
 const fixture={routeJunctions:{type:'FeatureCollection',features:[44.7,44.8,44.9,45].map((lat,i)=>({type:'Feature',geometry:{type:'Point',coordinates:[-84.7,lat]},properties:{id:'n'+i,component:i===3?1:0,label:'Trail A'}}))},key:'grayling-gaylord',scoredGeometry:{features:[{properties:{id:'trail-a'},geometry:{type:'LineString',coordinates:[[-84.7,44.7],[-84.7,44.8]]}}]}};
 context.fixture=fixture;
 const run=s=>vm.runInContext(s,context);
 const tap=lat=>features.find(l=>l.feature.geometry.type==='Point'&&l.feature.geometry.coordinates[1]===lat).handlers.click({latlng:{lat:0,lng:0},originalEvent:{}});
 return {run,context,elements,features,mapEvents,tap,get markers(){return markers;}};
}
test('junction dots select exact nodes and a bubbled event cannot select twice',()=>{
 const h=harness();h.run('DATA=fixture;drawMap(DATA);toggleRouteMode();');
 assert.equal(h.elements.get('#routeModeToggle').textContent,'Start over');
 const start={latlng:{lat:44.7,lng:-84.7},originalEvent:{}};
 h.features[1].handlers.click(start);h.mapEvents.click(start);
 assert.equal(h.markers,1);assert.match(h.elements.get('#mapRouteHint').textContent,/Start selected/);
 h.tap(44.8);
 assert.equal(h.markers,2);assert.equal(h.run('ROUTE_MODE'),true);
 assert.equal(h.elements.get('#buildRoute').disabled,false);
 assert.equal(h.elements.get('#routeResult').innerHTML,'');
 h.run('computeRoute();');
 assert.match(h.elements.get('#routeResult').innerHTML,/Building your route/);
 h.run('clearRoute();');
});
test('unavailable geometry does not enter endpoint selection',()=>{
 const h=harness();h.run('toggleRouteMode();');
 assert.equal(h.run('ROUTE_MODE'),false);assert.equal(h.elements.get('#routeModeToggle').disabled,true);
 assert.match(h.elements.get('#mapRouteHint').textContent,/Loading trail map/);
 h.run('DATA={scoredGeometry:{features:[]}};toggleRouteMode();');
 assert.match(h.elements.get('#mapRouteHint').textContent,/unavailable/);
});
test('ordinary trail clicks preserve information behavior without selecting a point',()=>{
 const h=harness();h.run('DATA=fixture;drawMap(DATA);');
 h.features[0].handlers.click({latlng:{lat:44.7,lng:-84.7},originalEvent:{}});
 assert.equal(h.markers,0);
});
test('clearing a pending route prevents its response from restoring the result',async()=>{
 const h=harness();let resolve;
 h.context.fetch=()=>new Promise(r=>{resolve=r;});
 h.run('DATA=fixture;drawMap(DATA);toggleRouteMode();');
 h.tap(44.7);
 h.tap(44.8);
 h.run('computeRoute();clearRoute();');
 resolve({ok:true,json:async()=>({route:{routable:false,reason:'old result'}})});
 await new Promise(r=>setImmediate(r));
 assert.equal(h.elements.get('#routeResult').hidden,true);
 assert.equal(h.elements.get('#routeResult').innerHTML,'');
});

test('multiple points wait for explicit build, undo removes one, and main button starts fresh',async()=>{
 const h=harness();let requested='';
 h.context.fetch=(url)=>{requested=url;return Promise.resolve({ok:true,json:async()=>({closureVerification:true,route:{routable:false,reason:'fixture disconnected'}})});};
 h.run('DATA=fixture;drawMap(DATA);toggleRouteMode();');
 for(const lat of [44.7,44.8,44.9])h.tap(lat);
 assert.equal(requested,'');assert.equal(h.run('ROUTE_POINTS.length'),3);
 h.run('undoRoute();');assert.equal(h.run('ROUTE_POINTS.length'),2);
 h.run('computeRoute();');await new Promise(r=>setImmediate(r));
 assert.match(decodeURIComponent(requested),/points=44.70000,-84.70000;44.80000,-84.70000/);
 assert.equal(h.run('ROUTE_MODE'),false);assert.equal(h.elements.get('#editRoute').hidden,false);
 h.run('editRoute();');assert.equal(h.run('ROUTE_POINTS.length'),2);assert.equal(h.run('ROUTE_MODE'),true);
 h.run('toggleRouteMode();');assert.equal(h.run('ROUTE_POINTS.length'),0);assert.equal(h.run('ROUTE_MODE'),true);
 assert.equal(h.elements.get('#routeResult').hidden,true);assert.equal(h.elements.get('#buildRoute').disabled,true);
});
test('a request failure retains stops and enables retry',async()=>{
 const h=harness();h.context.fetch=async()=>{throw new Error('network failure');};
 h.run('DATA=fixture;drawMap(DATA);toggleRouteMode();');
 for(const lat of [44.7,44.8])h.tap(lat);
 h.run('computeRoute();');await new Promise(r=>setImmediate(r));
 assert.equal(h.run('ROUTE_POINTS.length'),2);assert.equal(h.run('ROUTE_MODE'),true);
 assert.equal(h.elements.get('#buildRoute').disabled,false);
 assert.match(h.elements.get('#mapRouteHint').textContent,/stops are saved/);
 h.run('clearRoute();');
});

test('unmarked taps, adjacent duplicate dots, and disconnected dots cannot add bad stops',()=>{
 const h=harness();h.run('DATA=fixture;drawMap(DATA);toggleRouteMode();');
 h.mapEvents.click({latlng:{lat:10,lng:10},originalEvent:{}});
 assert.equal(h.run('ROUTE_POINTS.length'),0);assert.match(h.elements.get('#mapRouteHint').textContent,/blue junction dot/);
 h.tap(44.7);h.tap(44.7);assert.equal(h.run('ROUTE_POINTS.length'),1);
 h.tap(45);assert.equal(h.run('ROUTE_POINTS.length'),1);assert.match(h.elements.get('#mapRouteHint').textContent,/disconnected/);
 h.tap(44.8);h.tap(44.7);assert.equal(h.run('ROUTE_POINTS.length'),3);
 assert.equal(h.run('ROUTE_POINTS[0].lat'),44.7);assert.equal(h.run('ROUTE_POINTS[0].lng'),-84.7);
 h.run('clearRoute();');
});
