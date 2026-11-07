'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pins=require('../public/assets/rocket-map-pins');
const {REGIONS}=require('../lib/rocket-launch-usa');
const ROOT=path.join(__dirname,'..');
const ID=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
const centers=pins.centersOf(REGIONS);
const mission=(id,region,lat,lon,pad='Published test pad')=>({id,region,lat,lon,pad,name:'Rocket / '+region,netPrecision:'day'});
test('all six regional map centers are valid; invalid coordinates cannot become pad pins',()=>{
 assert.deepEqual(Object.keys(centers).sort(),Object.keys(pins.BOX).sort());
 for(const [r,p] of Object.entries(centers)){assert.equal(pins.inRegion(r,p.lat,p.lon),true);assert.equal(pins.inRegion(r,0,0),false);}
});
test('every scheduled mission is included, with multiple launches at one pad grouped',()=>{
 const launches=[mission(ID[0],'florida',28.608,-80.604),mission(ID[1],'florida',28.608,-80.604),mission(ID[2],'florida',28.56,-80.57),mission(ID[3],'virginia',37.84,-75.48)];
 const groups=pins.groupsOf(launches,'all',centers);
 assert.equal(groups.length,3);assert.equal(groups.reduce((n,g)=>n+g.launches.length,0),4);
 assert.equal(groups.find(g=>g.launches.length===2).kind,'pad');
 assert.equal(pins.groupsOf(launches,'florida',centers).reduce((n,g)=>n+g.launches.length,0),3);
});
test('missing, implausible and off-range pad geometry must use a dashed region marker',()=>{
 const groups=pins.groupsOf([mission(ID[0],'texas',null,null),mission(ID[1],'texas',0,0),mission(ID[2],'texas',25.999,-97.155)],'texas',centers);
 assert.equal(groups.length,2);const area=groups.find(x=>x.kind==='region');
 assert.equal(area.launches.length,2);assert.equal(area.lat,centers.texas.lat);
 assert.match(pins.placeLabel(area),/NOT confirmed/);
 assert.deepEqual(pins.groupsOf([mission('bad','texas',25.997,-97.157),mission(ID[0],'unknown',25.997,-97.157)],'all',centers),[]);
 assert.deepEqual(pins.groupsOf([mission(ID[0],'alaska',null,null)],'all',{}),[]);
});
test('national low-zoom aggregates by region then restores exact pads when zoomed',()=>{
 const launches=[mission(ID[0],'florida',28.608,-80.604),mission(ID[1],'florida',28.56,-80.57),mission(ID[2],'texas',25.998,-97.16)];
 const low=pins.groupsOf(launches,'all',centers,true);
 assert.equal(low.length,2);assert.equal(low.find(x=>x.region==='florida').kind,'cluster');
 assert.equal(low.find(x=>x.region==='florida').launches.length,2);
 assert.equal(pins.groupsOf(launches,'all',centers,false).length,3);
});
test('map popup is safe DOM, launches select the corresponding mission, and no directions are created',()=>{
 const old=global.document,events=[],markers=[];
 function node(tag){return {tag,children:[],listeners:{},textContent:'',
   append(...x){this.children.push(...x);},appendChild(x){this.children.push(x);return x;},
   addEventListener(name,cb){this.listeners[name]=cb;},setAttribute(name,val){this[name]=val;}};}
 try{
  global.document={createElement:node};
  const L={divIcon:x=>x,marker:(coords,opts)=>{const m={coords,opts,addTo(){markers.push(this);return this;},bindPopup(p){this.popup=p;return this;},bindTooltip(){return this;}};return m;}};
  const map={removed:[],on(){},getZoom(){return 11;},removeLayer(x){this.removed.push(x);},closePopup(){}};
  const layer=pins.mount(map,{L,region:'texas',centers,onSelect:(id,region)=>events.push([id,region])});
  layer.update([mission(ID[0],'texas',25.997,-97.157)],ID[0]);
  const popup=markers[0].popup;
  assert.match(popup.children[1].textContent,/NOT a public entrance/);
  popup.children[2].children[0].listeners.click({preventDefault(){}});
  assert.deepEqual(events,[[ID[0],'texas']]);
  assert.equal(popup.children.some(x=>x.tag==='a'),false);
  assert.match(markers[0].opts.icon.html,/<svg/);
  layer.update([],null);assert.equal(layer.getGroups().length,0);
  assert.equal(map.removed.length,1);
 }finally{global.document=old;}
});
test('national and all five separate regional page implementations load and sync the common layer',()=>{
 const items=[
  ['public/synced-national-tools/rocket-launch-live/index.html','public/synced-national-tools/rocket-launch-live/app.js'],
  ['public/synced-national-tools/space-coast-launch/index.html','public/synced-national-tools/space-coast-launch/geo-map.js'],
  ['public/starbase-rocket-launch-viewing/index.html','public/starbase-rocket-launch-viewing/app.js'],
  ['public/wallops-rocket-launch-viewing/index.html','public/wallops-rocket-launch-viewing/app.js'],
  ['public/kodiak-rocket-launch-viewing/index.html','public/kodiak-rocket-launch-viewing/app.js'],
  ['public/barking-sands-rocket-launch-viewing/index.html','public/barking-sands-rocket-launch-viewing/app.js']
 ];
 for(const [html,js]of items){
  const h=fs.readFileSync(path.join(ROOT,html),'utf8'),s=fs.readFileSync(path.join(ROOT,js),'utf8');
  assert.match(h,/\/assets\/rocket-map-pins\.js\?v=20261107-origin-v1/);
  assert.match(h,/\/assets\/rocket-map-pins\.css\?v=20261107-origin-v1/);
  assert.match(s,/RocketMapPins\?\.mount\(/);
  assert.match(s,/rocketPins\?\.update\(/);
 }
});

test('source failure clears stale national map choices and regional body races cannot reverse selections',()=>{
 const national=fs.readFileSync(path.join(ROOT,'public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
 const fail=national.slice(national.indexOf('} catch (err) {\n      if (sequence !== state.request) return;',national.indexOf('async function load(region, launchId)')));
 assert.match(fail,/state\.rocketPins\?\.update\(\[\],null\)/);
 assert.match(fail,/state\.data=null/);
 for(const [filename,serial] of [
  ['public/kodiak-rocket-launch-viewing/app.js','serial'],
  ['public/barking-sands-rocket-launch-viewing/app.js','seq']
 ]){
  const source=fs.readFileSync(path.join(ROOT,filename),'utf8');
  assert.match(source,new RegExp('const (?:data|d)=await (?:response|r)\\.json\\(\\);\\s+if\\('+serial+'!==state\\.request\\)return;'));
 }
 const wallops=fs.readFileSync(path.join(ROOT,'public/wallops-rocket-launch-viewing/app.js'),'utf8');
 assert.match(wallops,/frameMissionOrigins\(\)/);
 assert.match(wallops,/rocketPins\?\.getGroups\(\)/);
});
