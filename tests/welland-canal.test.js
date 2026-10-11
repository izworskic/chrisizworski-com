'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/welland-canal');
const { normalize } = require('../lib/soo-ais');
const bbox = [42.83, -79.34, 43.28, -79.10];
function makeRes() {
  return { headers:{}, code:200, body:null,
    setHeader(k,v){this.headers[k]=v;},
    status(n){this.code=n; return this;},
    json(j){this.body=j;return this;}
  };
}
test('Welland isolates fresh positions and never invents a schedule',async()=>{
  const original=global.fetch;
  const now=Date.now();
  const fresh=new Date(now-2*60*1000).toISOString();
  const stale=new Date(now-45*60*1000).toISOString();
  global.fetch=async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[
    {type:'Feature',geometry:{type:'Point',coordinates:[-79.1930,43.1552]},properties:{mmsi:316001111,name:'CANAL SHIP',sog:2,seen:fresh,source:'example'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[-79.20,43.15]},properties:{mmsi:316002222,name:'OLD SHIP',sog:3,seen:stale,source:'example'}},
    {type:'Feature',geometry:{type:'Point',coordinates:[-83.9,46.5]},properties:{mmsi:316003333,name:'SOO SHIP',sog:3,seen:fresh,source:'example'}}
  ]})});
  try{
    const res=makeRes();
    await handler({method:'GET'},res);
    assert.equal(res.code,200);
    assert.equal(res.headers['X-Robots-Tag'],'noindex, nofollow');
    assert.equal(res.body.isSchedule,false);
    assert.equal(res.body.vessels.length,1);
    assert.equal(res.body.vessels[0].name,'CANAL SHIP');
    assert.equal('eta' in res.body,false);
  }finally{global.fetch=original;}
});
test('Invalid methods and unavailable upstream fail closed',async()=>{
  const bad=makeRes();await handler({method:'POST'},bad);
  assert.equal(bad.code,405);
  const orig=global.fetch;global.fetch=async()=>{throw new Error('provider down')};
  try{
    const res=makeRes();await handler({method:'GET'},res);
    assert.equal(res.code,502);
    assert.equal(res.body.ok,false);
    assert.equal(res.headers['Cache-Control'],'no-store');
  }finally{global.fetch=orig;}
});
test('Normalization rejects stale and outside-corridor reports',()=>{
  const now=Date.now();
  const raw={type:'FeatureCollection',features:[]};
  const result=normalize(raw,now,bbox);
  assert.equal(result.vessels.length,0);
});

test('Welland map uses Duluth-style freighter SVG markers rather than anonymous dots',()=>{
  const fs=require('node:fs');
  const path=require('node:path');
  const script=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const style=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
  const page=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  assert.match(script,/function shipIcon\(v\)/);
  assert.match(script,/L\.divIcon\(\{className,html,iconSize:/);
  assert.match(script,/L\.marker\(\[v\.lat,v\.lon\],\{icon:shipIcon\(v\)/);
  assert.match(script,/class="ship-glyph"/);
  assert.match(script,/class="ship-hull"/);
  assert.match(script,/\.bindTooltip\(name,\{direction:'top'\}\)\.bindPopup\(pop\)/);
  assert.match(style,/\.welland-ship-marker\.is-stopped \.ship-hull\{fill:#8a6a42\}/);
  assert.match(page,/AIS vessels/);
  assert.doesNotMatch(script,/L\.circleMarker\(\[v\.lat,v\.lon\]/);
});

test('Maritime Minimalist lock markers are restrained and map-driven',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
 assert.match(js,/function lockIcon\(lock,active=false\)/);
 assert.match(js,/const size=active\?32:27/);
 assert.match(js,/function flightIcon\(active=false,wide=false\)/);
 assert.match(js,/const width=wide\?48:46,height=27/);
 assert.match(js,/const wide=map\.getZoom\(\)<12/);
 assert.match(js,/const combine=map\.getZoom\(\)<14/);
 assert.match(js,/map\.on\('zoomend',renderLockMarkers\)/);
 assert.match(js,/marker\.on\('click',\(\)=>chooseLock\(lock\.id\)\)/);
 assert.doesNotMatch(js,/function lockPopup/);
 assert.doesNotMatch(js,/\.bindPopup\(lockPopup/);
 assert.match(css,/\.welland-lock-pin\.is-active \.lock-pin__dot/);
 assert.doesNotMatch(css,/lock-pin__shield/);
 assert.match(html,/class="explorer-side"/);
 assert.match(html,/id="lockDetailTitle"/);
 assert.match(html,/id="lockDetailNext"/);
 assert.match(html,/LOCK LANDMARKS/);
 assert.match(html,/class="map-key__lock"/);
});
test('Selecting a lock uses a premium evidence-aware detail card',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
 assert.match(js,/function renderLockDetail\(\)/);
 assert.match(js,/visitor\.hidden=!lock\?\.url/);
 assert.match(js,/aisState==='unavailable'/);
 assert.match(js,/Not a lock occupancy count/);
 assert.match(js,/\$\('lockDetailNext'\)\.addEventListener/);
 assert.match(js,/\$\('showAllLocks'\)\.addEventListener/);
 assert.match(js,/lock\.note/);
 assert.match(html,/id="lockDetailVisitor"/);
 assert.match(html,/id="lockDetailAIS"/);
 assert.match(html,/not live lock-status indicators/);
});
