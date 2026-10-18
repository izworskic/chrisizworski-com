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
function browserMap(configPayload){
 const prior=global.fetch;global.fetch=async()=>({ok:true,json:async()=>configPayload});
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
 let selected=spots[0];
 const holder=new E(),caption={textContent:''};
 const controller=EagleMap.init({holder,caption,spots,maplibregl:{Map:FakeMap,NavigationControl:class{},AttributionControl:class{}},getSelected:()=>selected,onSelect:(s)=>{selected=s;controller.select(s)}});
 const settle=async()=>{
  for(let n=0;n<5;n++)await new Promise(resolve=>setImmediate(resolve));
  const m=made.at(-1);m?.emit('load');return m;
 };
 const restore=()=>{global.fetch=prior;global.document=documentPrior;controller?.dispose()};
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
