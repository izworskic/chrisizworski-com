'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/eagle-basemap-config.js');
const EagleMap=require('../public/winter-eagle-watching/eagle-map.js');
function res(){
 const r={statusCode:200,headers:{},body:null};
 r.setHeader=(k,v)=>{r.headers[k]=v;return r};
 r.status=n=>{r.statusCode=n;return r};
 r.json=obj=>{r.body=obj;return r};
 return r;
}
function config(method,key){
 const before=process.env.CARTO_BASEMAP_PUBLIC_KEY;
 try{
  if(key===undefined)delete process.env.CARTO_BASEMAP_PUBLIC_KEY;
  else process.env.CARTO_BASEMAP_PUBLIC_KEY=key;
  const r=res();handler({method},r);return r;
 }finally{if(before===undefined)delete process.env.CARTO_BASEMAP_PUBLIC_KEY;else process.env.CARTO_BASEMAP_PUBLIC_KEY=before}
}
test('CARTO key missing: no unauthenticated CARTO requests, use OpenFreeMap vector style',()=>{
 const r=config('GET');
 assert.equal(r.statusCode,200);
 assert.equal(r.body.provider,'openfreemap');
 assert.equal(r.body.enabled,false);
 assert.ok(r.body.styleUrl.startsWith('https://tiles.openfreemap.org/'));
 assert.equal(r.body.key,undefined);
 assert.match(r.headers['X-Robots-Tag'],/noindex/);
});
test('CARTO key is explicitly PUBLIC, domain-restricted by its owner, and never a platform token',()=>{
 const key='test-public-carto-basemap-key';
 const r=config('GET',key);
 assert.equal(r.body.enabled,true);
 assert.equal(r.body.provider,'carto');
 assert.equal(r.body.key,key);
 assert.equal(r.body.styleUrl,EagleMap.CARTO_STYLE);
 assert.equal(config('GET','bad key?unsafe').body.enabled,false);
 assert.equal(config('POST',key).statusCode,405);
});
test('CARTO key propagation covers style, vector tiles, glyphs and sprites; other hosts untouched',()=>{
 const key='domain-restricted-public-key';
 const hosts=[
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  'https://basemaps.cartocdn.com/data/voyager/5/8/12.pbf',
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/sprite.json',
  'https://basemaps.cartocdn.com/fonts/Arial%20Regular/0-255.pbf'
 ];
 for(const src of hosts){const u=new URL(EagleMap.cartoResourceUrl(src,key));assert.equal(u.searchParams.get('key'),key)}
 assert.equal(EagleMap.cartoResourceUrl('https://tiles.openfreemap.org/styles/liberty',key),'https://tiles.openfreemap.org/styles/liberty');
 assert.equal(EagleMap.cartoResourceUrl('http://basemaps.cartocdn.com/a',key),'http://basemaps.cartocdn.com/a');
});
test('map source preserves site ID, order, coordinates and selected state',()=>{
 const geo=EagleMap.placeData([{id:'soo',lon:-84.35,lat:46.5,name:'Soo',city:'Sault Ste. Marie',state:'MI',type:'habitat',selected:true,number:4}]);
 assert.equal(geo.type,'FeatureCollection');assert.equal(geo.features[0].id,'soo');
 assert.deepEqual(geo.features[0].geometry.coordinates,[-84.35,46.5]);
 assert.equal(geo.features[0].properties.selected,true);
 assert.equal(geo.features[0].properties.number,'4');
});
class E {
 constructor(){this.children=[];this.listeners={};this.classList={add(){},remove(){}};this.style={};this.attrs={}}
 append(...a){this.children.push(...a)}
 replaceChildren(...a){this.children=[...a]}
 addEventListener(k,fn){this.listeners[k]=fn}
 click(){this.listeners.click?.()}
 setAttribute(k,v){this.attrs[k]=v}
}
function browserMap(configPayload,hash=""){
 const prior=global.fetch,priorLocation=global.location;
 global.location={hash};
 global.fetch=async()=>({ok:true,json:async()=>configPayload});
 const made=[];
 class FakeMap {
  constructor(o){this.opts=o;this.events={};this.sources={};this.layers=[];this.zoom=5;this.moves=[];made.push(this)}
  on(...a){this.events[a.length===2?a[0]:a[0]+':'+a[1]]=a.at(-1)}
  addControl(){}
  addSource(id,cfg){this.sources[id]={data:cfg.data,setData(data){this.data=data}}}
  addLayer(l){this.layers.push(l)}
  getSource(id){return this.sources[id]}
  getCanvas(){return {style:{}}}
  getZoom(){return this.zoom}
  fitBounds(b,o){this.moves.push({kind:'fit',b,o})}
  setStyle(style){this.opts.style=style;this.sources={};this.layers=[];this.events['style.load']?.()}
  easeTo(o){this.moves.push({kind:'focus',...o})}
  remove(){this.removed=true}
  emit(k){this.events[k]?.()}
 }
 const documentPrior=global.document;
 global.document={createElement:()=>new E()};
 const spots=[
  {id:'detroit',lon:-83.18,lat:42.1,name:'Detroit',city:'Trenton',state:'MI',type:'resident'},
  {id:'soo',lon:-84.35,lat:46.5,name:'Soo',city:'Sault Ste. Marie',state:'MI',type:'habitat'}
 ];
 let selected=spots.find(x=>"#"+x.id===hash)||spots[0];
 const holder=new E(),caption={textContent:''};
 const controller=EagleMap.init({holder,caption,spots,maplibregl:{Map:FakeMap,NavigationControl:class{},AttributionControl:class{}},getSelected:()=>selected,onSelect:(s)=>{selected=s;controller.select(s)},onLocate:()=>{holder.nearMeRequested=true},onFatal:()=>{holder.nativeFallbackRequested=true}});
 const settle=async()=>{
  for(let n=0;n<5;n++)await new Promise(resolve=>setImmediate(resolve));
  const m=made.at(-1);m?.emit('load');return m;
 };
 const restore=()=>{global.fetch=prior;global.document=documentPrior;
   if(priorLocation===undefined)delete global.location;else global.location=priorLocation;
   controller?.dispose()};
 return {made,controller,spots,holder,caption,settle,restore};
}
test('CARTO map loads clustered selectable sites, filters pins, zooms into location and supports view all',async()=>{
 const t=browserMap({provider:'carto',enabled:true,key:'public-basemap-key',styleUrl:EagleMap.CARTO_STYLE});
 try{
  const map=await t.settle();
  assert.ok(map.opts.style.includes('voyager-gl-style/style.json?key='));
  assert.ok(map.layers.some(l=>l.id==='eagle-cluster'));
  assert.ok(map.layers.some(l=>l.id==='eagle-pin-halo'));
  assert.equal(map.getSource('eagle-sites').data.features.length,2);
  t.controller.select(t.spots[1]);
  assert.equal(map.getSource('eagle-sites').data.features[1].properties.selected,true);
  assert.ok(map.moves.some(x=>x.kind==='focus'&&x.center[1]===46.5));
  t.controller.filter([t.spots[1]]);
  assert.equal(map.getSource('eagle-sites').data.features.length,1);
  t.holder.children[2].children[0].click();
  assert.ok(map.moves.some(x=>x.kind==='fit'));
 }finally{t.restore()}
});
test('missing key uses full interactive Liberty map (not the old stretched SVG)',async()=>{
 const t=browserMap({enabled:false,provider:'openfreemap',styleUrl:EagleMap.FALLBACK_STYLE});
 try{
  const m=await t.settle();
  assert.equal(m.opts.style,EagleMap.FALLBACK_STYLE);
  assert.ok(t.caption.textContent.includes('OpenFreeMap Liberty'));
  assert.ok(m.layers.some(l=>l.id==='eagle-pin-halo'));
 }finally{t.restore()}
});

test('ordinary page visit defaults to full regional overview despite script-generated URL hash',async()=>{
 const t=browserMap({provider:'openfreemap',enabled:false,styleUrl:EagleMap.FALLBACK_STYLE});
 try{
  // Existing app.js writes #detroit after initialization, before async map load.
  global.location.hash='#detroit';
  const map=await t.settle();
  assert.equal(map.moves[0]?.kind,'fit','must fit the region, not zoom to Detroit');
 }finally{t.restore()}
});
test('a user opening a pre-existing shared link still receives a focused site map',async()=>{
 const t=browserMap({provider:'openfreemap',enabled:false,styleUrl:EagleMap.FALLBACK_STYLE},'#soo');
 try{
  const map=await t.settle();
  assert.equal(map.moves[0]?.kind,'focus');
  assert.deepEqual(map.moves[0]?.center,[-84.35,46.5]);
 }finally{t.restore()}
});

test('cluster numbers are explicitly identified as viewing locations, not eagle counts',()=>{
 const script=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/winter-eagle-watching/eagle-map.js'),'utf8');
 assert.ok(script.includes('NOT eagle counts'));
 assert.ok(script.includes('Green = grouped viewing locations'));
 assert.ok(script.includes('"#286382"'));
 assert.ok(script.includes('"#a86119"'));
});

test('map-level nearby control requests location only on tap; coordinates are not sent to the server',async()=>{
 const t=browserMap({provider:'carto',enabled:true,key:'public-basemap-key'});
 try{
  const m=await t.settle();
  assert.equal(t.holder.nearMeRequested,undefined);
  t.holder.children[2].children[2].click();
  assert.equal(t.holder.nearMeRequested,true);
  t.controller.showUserLocation({latitude:43.6,longitude:-84.2});
  assert.deepEqual(m.getSource('eagle-visitor').data.features[0].geometry.coordinates,[-84.2,43.6]);
  assert.ok(m.layers.some(x=>x.id==='eagle-visitor-center'));
  assert.match(t.holder.children[4].textContent,/straight-line/);
  assert.doesNotMatch(t.holder.children[1].children[1].textContent,/exact.*coordinates/);
 }finally{t.restore()}
});
test('CARTO night basemap carries public key and retains selected location and visitor dot',async()=>{
 const t=browserMap({provider:'carto',enabled:true,key:'public-basemap-key'});
 try{
  const m=await t.settle();
  t.controller.showUserLocation({latitude:44,longitude:-85});
  t.controller.select(t.spots[1]);
  const night=t.holder.children[2].children[3];
  assert.equal(night.hidden,false);
  night.click();
  assert.match(m.opts.style,/dark-matter-gl-style/);
  assert.match(m.opts.style,/key=public-basemap-key/);
  assert.equal(m.getSource('eagle-sites').data.features.length,2);
  assert.equal(m.getSource('eagle-sites').data.features[1].properties.selected,true);
  assert.ok(m.getSource('eagle-visitor'),'Visitor marker restored after CARTO style change');
  night.click();
  assert.match(m.opts.style,/voyager-gl-style/);
 }finally{t.restore()}
});
test('failed CARTO style retries independent vector source; failed backup requests native map',async()=>{
 const t=browserMap({provider:'carto',enabled:true,key:'public-basemap-key'});
 try{
  const carto=await t.settle();
  carto.emit('error');
  for(let n=0;n<4;n++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(t.made.length,2);
  const free=t.made[1];free.emit('error');
  assert.equal(t.holder.nativeFallbackRequested,true);
 }finally{t.restore()}
});
