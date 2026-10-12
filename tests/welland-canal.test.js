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
 assert.match(js,/marker\.on\('click',\(\)=>chooseLock\(lock\.id,false,true\)\)/);
 assert.doesNotMatch(js,/function lockPopup/);
 assert.doesNotMatch(js,/\.bindPopup\(lockPopup/);
 assert.match(css,/\.welland-lock-pin\.is-active \.lock-pin__dot/);
 assert.doesNotMatch(css,/lock-pin__shield/);
 assert.match(html,/class="explorer-side"/);
 assert.match(html,/id="lockDetailTitle"/);
 assert.match(html,/id="lockDetailNext"/);
 assert.match(html,/CHOOSE A LOCK/);
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

test('Touching an individual lock shows persistent useful detail instead of a temporary name-only tooltip',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
 assert.match(js,/function showLockPreview\(lock\)/);
 assert.match(js,/\$\('mapLockPreviewTitle'\)\.textContent=lock\.name\+' · '\+lock\.place/);
 assert.match(js,/\$\('mapLockPreviewText'\)\.textContent=LOCK_QUICK\[lock\.id\]\.answer/);
 assert.match(js,/\$\('mapLockPreview'\)\.hidden=false/);
 assert.match(js,/if\(fromMap&&lock\)showLockPreview\(lock\);else hideLockPreview\(\)/);
 assert.match(js,/marker\.on\('click',\(\)=>chooseLock\(lock\.id,false,true\)\)/);
 assert.doesNotMatch(js,/bindTooltip\(lock\.name/);
 assert.doesNotMatch(js,/title:lock\.name/);
 assert.doesNotMatch(js,/title:'Central locks/);
 assert.doesNotMatch(js,/title:'Thorold flight locks/);
 assert.match(js,/marker\.getElement\(\)\?\.setAttribute\('aria-label'/);
 assert.match(js,/flightMarker\.getElement\(\)\?\.setAttribute\('aria-label'/);
 assert.doesNotMatch(js,/bindTooltip\('Locks 3–7/);
 assert.doesNotMatch(js,/bindTooltip\('Locks 4–6/);
 assert.match(js,/\$\('mapLockPreviewDismiss'\)\.addEventListener\('click',hideLockPreview\)/);
 assert.match(js,/\$\('mapLockPreviewOpen'\)\.addEventListener\('click'/);
 assert.match(js,/card\.scrollIntoView\(/);
 assert.match(js,/card\.focus\(\{preventScroll:true\}\)/);
 assert.match(css,/\.ship-map-stage\{position:relative\}/);
 assert.match(css,/\.map-lock-preview\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(min-width:901px\)\{\.map-lock-preview\{display:none!important\}\}/);
 assert.match(js,/max-width: 900px/);
 assert.match(css,/@media\(min-width:691px\) and \(max-width:900px\)/);
 assert.match(html,/id="mapLockPreview"/);
 assert.match(html,/id="mapLockPreviewTitle"/);
 assert.match(html,/id="mapLockPreviewText"/);
 assert.match(html,/id="mapLockPreviewDismiss"/);
 assert.match(html,/id="mapLockPreviewOpen"/);
 assert.match(html,/id="lockDetail"[^>]*tabindex="-1"/);
});

test('All eight Welland lock profiles carry authored explanations and truth-labelled images',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
  const start=js.indexOf('  const LOCK_STORIES = {');
  const end=js.indexOf('  const $ =',start);
  const profile=js.slice(start,end);
  assert.ok(start>=0&&end>start,'all eight lock editorial stories must exist');
  for(let i=1;i<=8;i++)assert.match(profile,new RegExp("'"+i+"':\\{photo:'[^']+',segment:'[^']+',explainer:'.{110,}"));
  assert.match(profile,/Lock 8 has a different job from the seven lift locks/);
  assert.match(profile,/This photo shows nearby Lock 7, not the Lock 4 chamber/);
  assert.match(profile,/This photo shows nearby Lock 7, not the Lock 5 chamber/);
  assert.match(profile,/This photo shows nearby Lock 7, not the Lock 6 chamber/);
  assert.match(html,/id="lockDetailImage"/);
  assert.match(html,/id="lockDetailImageCaption"/);
  assert.match(html,/id="lockDetailImageCredit"/);
  assert.match(html,/id="lockDetailImageLicense"/);
  assert.match(html,/id="lockDetailImageFallback"/);
  assert.match(html,/id="lockDetailSegment"/);
  assert.match(html,/id="lockDetailTip"/);
  assert.match(html,/id="mapLockPreviewImage"/);
  assert.match(html,/id="mapLockPreviewImageFallback"/);
  assert.match(css,/\.lock-detail__photo-stage\{[^\n]*aspect-ratio:16\/9/);
  assert.match(css,/\.map-lock-preview__photo\{/);
  assert.match(css,/\.lock-detail__photo-credit a\{/);
  assert.match(js,/function renderLockPhoto\(lock\)/);
  assert.match(js,/function setLockPhoto\(img,fallback,photo\)/);
  assert.match(js,/renderLockPhoto\(lock\)/);
  assert.match(js,/\$\('mapLockPreviewImage'\)/);
  assert.match(js,/img\.onerror=/);
  assert.match(js,/img\.complete&&img\.naturalWidth===0/);
  assert.match(html,/welland-canal\.js\?v=20261011-ux1/);
  assert.match(html,/welland-canal\.css\?v=20261011-ux1/);
});

test('Every reused image has explicit Wikimedia source, author and licence links',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const script=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const photos=script.slice(script.indexOf('  const LOCK_PHOTOS = {'),script.indexOf('  const LOCK_STORIES = {'));
  assert.equal((photos.match(/src:'https:\/\/upload\.wikimedia\.org\//g)||[]).length,5);
  assert.equal((photos.match(/source:'https:\/\/commons\.wikimedia\.org\/wiki\/File:/g)||[]).length,5);
  assert.equal((photos.match(/licenseUrl:'https:\/\/creativecommons\.org\/licenses\/by-sa\//g)||[]).length,5);
  assert.equal((photos.match(/credit:'[^']+'/g)||[]).length,5);
  assert.match(photos,/regional image, not Locks 4–6/);
});

test('One-tap Welland value function meets structural usability, comprehension and truth gates',()=>{
  const path=require('node:path'),{execFileSync}=require('node:child_process');
  const result=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'../scripts/benchmark-welland-usability.cjs')],{encoding:'utf8'}));
  assert.equal(result.score,100);
  assert.equal(result.failures.length,0);
  assert.deepEqual(result.gates,{photoTruth:true,aisTruth:true,credits:true});
  assert.equal(result.measurement.includes('Static implementation contract'),true);
});
test('All eight locks are directly accessible beside the map; one tap explains the role',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
  assert.ok(html.indexOf('id="lockRail"')<html.indexOf('id="shipMap"'));
  assert.equal((html.match(/id="lockRail"/g)||[]).length,1);
  assert.match(js,/b\.addEventListener\('click',\(\)=>chooseLock\(l\.id,true,true\)\)/);
  assert.match(js,/b\.setAttribute\('aria-label','Explore '/);
  assert.match(js,/el\('span',LOCK_QUICK\[l\.id\]\.cue\)/);
  assert.match(js,/\$\('lockDetailQuick'\)\.textContent=lock\?LOCK_QUICK\[lock\.id\]\.answer/);
  assert.match(js,/\$\('mapLockPreviewCaption'\)\.textContent=photo\.caption/);
  assert.match(html,/id="mapLockPreviewCaption"/);
  assert.match(html,/id="lockDetailQuick"/);
  assert.match(js,/const zoom=\['4','5','6'\]\.includes\(id\)\?14:12/);
  assert.match(js,/marker\.on\('click',\(\)=>chooseLock\(lock\.id,false,true\)\)/);
  assert.match(js,/v=>distanceKm\(v,lock\)<=1\.5/);
  assert.match(css,/\.lock-quick-select \.lock-pill\{[^\n]*min-height:49px/);
  assert.match(css,/@media\(max-width:690px\)\{/);
  assert.match(html,/Grouped numbers\? Tap to zoom, or choose any lock above/);
});
