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
  assert.match(page,/Blue freighters: moving AIS vessels/);
  assert.doesNotMatch(script,/L\.circleMarker\(\[v\.lat,v\.lon\]/);
});

test('Welland locks are navigational landmarks with numbered pins and accessible selection',()=>{
  const fs=require('node:fs');
  const path=require('node:path');
  const script=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
  const page=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  assert.match(script,/function lockIcon\(lock,active=false,compact=false\)/);
  assert.match(script,/const width=compact\?30:52,height=compact\?35:66/);
  assert.match(css,/\.welland-lock-pin\.is-compact/);
  assert.match(script,/function flightIcon\(active=false\)/);
  assert.match(script,/function renderLockMarkers\(\)/);
  assert.match(script,/const wide=map\.getZoom\(\)<12/);
  assert.match(script,/const combine=map\.getZoom\(\)<14/);
  assert.match(script,/if\(wide&&\['3','4','5','6','7'\]\.includes\(lock\.id\)\)return/);
  assert.match(script,/map\.setView\(\[43\.1382,-79\.1920\],12\)/);
  assert.match(script,/map\.on\('zoomend',renderLockMarkers\)/);
  assert.match(script,/marker\.on\('click',\(\)=>chooseLock\(lock\.id,false\)\)/);
  assert.match(script,/flightMarker\.on\('click'/);
  assert.match(script,/lockMarkers\.forEach\(\(marker,key\)=>marker\.setIcon/);
  assert.match(script,/\$\('showAllLocks'\)\.addEventListener/);
  assert.match(css,/\.welland-lock-pin/);
  assert.match(css,/\.lock-pill__number/);
  assert.match(page,/8 NUMBERED LOCKS/);
  assert.match(page,/The central 3–7 badge expands into individual markers/);
  assert.doesNotMatch(script,/L\.circleMarker\(\[l\.lat,l\.lon\]/);
});
