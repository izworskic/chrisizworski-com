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
  assert.match(profile,/This is a Lock 4 engineering schematic, not a photograph/);
  assert.match(profile,/This is a Lock 5 engineering schematic, not a photograph/);
  assert.match(profile,/This is a Lock 6 engineering schematic, not a photograph/);
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
  assert.match(js,/img\.dataset\.photoToken/);
  assert.match(js,/if\(!triedRemote&&photo\.remote\)/);
  assert.match(html,/welland-canal\.js\?v=20261012-historic2/);
  assert.match(html,/welland-canal\.css\?v=20261012-historic2/);
});

test('Every reused image has explicit Wikimedia source, author and licence links',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const script=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const photos=script.slice(script.indexOf('  const LOCK_PHOTOS = {'),script.indexOf('  const LOCK_STORIES = {'));
  assert.equal((photos.match(/src:'\/assets\/welland\/photos\/[a-z0-9]+\.jpg'/g)||[]).length,5);
  assert.equal((photos.match(/remote:'https:\/\/upload\.wikimedia\.org\//g)||[]).length,5);
  assert.equal((photos.match(/source:'https:\/\/commons\.wikimedia\.org\/wiki\/File:/g)||[]).length,5);
  assert.equal((photos.match(/licenseUrl:'https:\/\/creativecommons\.org\/licenses\/by-sa\//g)||[]).length,5);
  assert.equal((photos.match(/credit:'[^']+'/g)||[]).length,8);
  assert.match(photos,/Lock 7 chamber · Thorold, Ontario/);
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
  assert.match(js,/b\.addEventListener\('click',\(\)=>chooseLock\(l\.id,true,false\)\)/);
  assert.match(js,/b\.setAttribute\('aria-label','Explore '/);
  assert.match(js,/el\('span',LOCK_QUICK\[l\.id\]\.cue\)/);
  assert.match(js,/\$\('lockDetailQuick'\)\.textContent=lock\?LOCK_QUICK\[lock\.id\]\.answer/);
  assert.match(js,/function renderInstantAnswer\(lock\)/);
  assert.match(js,/\$\('lockInstantText'\)\.textContent=LOCK_QUICK\[lock\.id\]\.answer/);
  assert.match(js,/\$\('lockInstantPhotoCaption'\)\.textContent=photo\.caption/);
  assert.match(html,/id="lockInstantAnswer"/);
  assert.match(html,/id="lockInstantOpen"/);
  assert.match(html,/id="lockInstantImage"/);
  assert.ok(html.indexOf('id="lockInstantAnswer"')>html.indexOf('id="lockRail"'));
  assert.ok(html.indexOf('id="lockInstantAnswer"')<html.indexOf('id="shipMap"'));
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

test('Lock photographs are imported as local first-party static assets, with licensed fallback',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
 const importer=fs.readFileSync(path.join(__dirname,'../scripts/fetch-welland-photos.cjs'),'utf8');
 const expected=['north1','north2','north3','thorold','south8'];
 for(const name of expected){
   assert.match(js,new RegExp("src:'/assets/welland/photos/"+name+"\\.jpg'"));
   assert.match(importer,new RegExp(name+":'"));
 }
 assert.match(js,/fallback\.textContent='Photograph unavailable/);
 assert.match(importer,/Not a valid JPEG or unsafe size/);
 assert.match(importer,/Do not silently publish image-free cards/);
 assert.match(importer,/Special:Redirect\/file/);
 assert.match(js,/img\.getAttribute\('src'\)!==photo\.src/);
});

test('Welland hero actually shows a real licensed canal freighter photo and preserves accessibility',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
 const importer=fs.readFileSync(path.join(__dirname,'../scripts/fetch-welland-hero.cjs'),'utf8');
 const optimizer=fs.readFileSync(path.join(__dirname,'../scripts/optimize-welland-hero.py'),'utf8');
 assert.match(html,/<figure class="hero-visual">/);
 assert.match(html,/<img src="\/assets\/welland\/photos\/hero-algoberta\.jpg"/);
 assert.match(html,/alt="The freighter Algoberta entering Lock 3 of the Welland Canal/);
 assert.match(html,/loading="eager" fetchpriority="high"/);
 assert.match(html,/commons\.wikimedia\.org\/wiki\/File:Algoberta_heading_into_Welland_Canal_Lock_3\.jpeg/);
 assert.match(html,/creativecommons\.org\/licenses\/by-sa\/4\.0/);
 assert.match(html,/Photo:.*Dough4872/);
 assert.match(html,/Cropped<\/figcaption>/);
 assert.match(html,/property="og:image" content="https:\/\/chrisizworski\.com\/assets\/welland\/photos\/hero-algoberta\.jpg"/);
 assert.match(html,/name="twitter:image" content="https:\/\/chrisizworski\.com\/assets\/welland\/photos\/hero-algoberta\.jpg"/);
 assert.match(html,/rel="preload" as="image" href="\/assets\/welland\/photos\/hero-algoberta\.jpg"/);
 assert.match(css,/\.hero-visual img\{[^}]*object-fit:cover/);
 assert.match(css,/@media\(max-width:760px\)\{[^}]*\.hero::before/);
 assert.match(css,/\.hero-visual figcaption a\{/);
 assert.match(importer,/Algoberta_heading_into_Welland_Canal_Lock_3\.jpeg/);
 assert.match(importer,/Not JPEG or unsafe bytes/);
 assert.match(optimizer,/ImageOps\.fit\(image,\(1600,900\)/);
 assert.doesNotMatch(html,/og:image" content="https:\/\/chrisizworski\.com\/assets\/soo-locks\/freighter\.jpg"/);
});


test('Every lock has a unique, grounded image rather than a repeated wrong Lock 7 photo',()=>{
  const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
  const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  const score=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'../scripts/benchmark-welland-media.cjs')],{encoding:'utf8'}));
  assert.equal(score.hardViolations.length,0,JSON.stringify(score.hardViolations));
  assert.ok(score.value>=85,'truthful media release contract must score at least 85');
  assert.equal(score.verifiedPhotoCoverage,'6/8');
  assert.equal(score.modernExactCoverage,'4/8');
  assert.deepEqual(score.missingPhotos,[4,6]);
  assert.equal(score.completePhotoMission,false);
  assert.equal(score.perLock.length,8);
  assert.equal(new Set(score.perLock.map(x=>x.media)).size,8);
  assert.deepEqual(score.photosByLock.uniqueEngineeringSchematics,[4,6]);
  for (const n of [4,6]){
    assert.match(js,new RegExp("'"+n+"':\\{photo:'flight"+n+"'"));
    assert.match(js,new RegExp("flight"+n+"-schematic\\.svg"));
    assert.ok(score.perLock.find(x=>x.lock===n).subject==='schematic');
  }
  for(const n of [5,8])assert.equal(score.perLock.find(x=>x.lock===n).subject,'historical-exact');
  assert.match(html,/id="lockDetailImageFormat"/);
  assert.match(js,/photo\.kind==='schematic'\?'Diagram: ':'Photo: '/);
  assert.doesNotMatch(js,/This photo shows nearby Lock 7, not the Lock [456] chamber/);
});

test('Camera source is explicitly Bridge 21 and only loads on user demand',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
  assert.match(html,/id="canal-cameras"/);
  assert.match(html,/PORT COLBORNE · BRIDGE 21 AREA/);
  assert.match(html,/This is not a camera inside Lock 8/);
  assert.match(html,/Current stream status unverified/);
  assert.match(html,/id="canalCameraFrame"[^>]*hidden/);
  assert.match(html,/id="canalCameraStop"[^>]*hidden/);
  assert.match(html,/id="lockDetailWatchCam"/);
  assert.match(js,/cameraFrame\.src='https:\/\/www\.youtube-nocookie\.com\/embed\/yF7XdpkL34w\?autoplay=1/);
  assert.match(js,/cameraFrame\.removeAttribute\('src'\)/);
  assert.match(html,/https:\/\/streamtimelive\.com\/port-colborne\//);
  assert.match(html,/current availability not verified/);
  assert.match(css,/\.welland-camera-player\{aspect-ratio:16\/9/);
});

test('Verified public-domain photographs replace fake Lock 5 and Lock 8 representations with historic truth',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const script=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  const importer=fs.readFileSync(path.join(__dirname,'../scripts/fetch-welland-historic-locks.cjs'),'utf8');
  for(const [n,file,date] of [['5','lock5-construction-1916.jpg','1916'],['8','lock8-gates-1929.jpg','1929']]){
    assert.ok(fs.statSync(path.join(__dirname,'../public/assets/welland/photos',file)).size>30000);
    assert.ok(script.includes("subjectLock:'"+n+"'"));
    assert.ok(script.includes("taken:'"+date+"'"));
    assert.ok(script.includes("src:'/assets/welland/photos/"+file+"'"));
  }
  assert.match(script,/HISTORIC SEPTEMBER 1929/);
  assert.match(script,/HISTORIC 1916/);
  assert.match(script,/photo\.taken\?'· Historic '/);
  assert.match(html,/id="lockDetailAerial"/);
  assert.match(html,/id="lockInstantPhotoLink"/);
  assert.match(importer,/LicenseShortName/);
});
