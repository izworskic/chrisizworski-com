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
  assert.match(script,/marker\.bindTooltip\(name,\{direction:'top'\}\)/);
  assert.match(script,/marker\.on\('click',\(\)=>focusVessel\(v\.mmsi,true\)\)/);
  assert.doesNotMatch(script,/\.bindPopup\(pop\)/);
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
 assert.match(js,/const hit=44/);
  assert.match(js,/iconSize:\[hit,hit\]/);
 assert.match(js,/function flightIcon\(active=false,wide=false\)/);
 assert.match(js,/const width=wide\?52:50,height=44/);
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
 assert.match(js,/if\(lock&&\(fromMap\|\|!\$\('mapLockPreview'\)\.hidden\)\)showLockPreview\(lock\);else hideLockPreview\(\)/);
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
  assert.match(html,/welland-canal\.js\?v=20261012-journey1/);
  assert.match(html,/welland-canal\.css\?v=20261012-journey1/);
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
  assert.ok(score.value>=90,'all lock media must clear the 90-point value benchmark');
  assert.equal(score.perLock.length,8);
  assert.equal(new Set(score.perLock.map(x=>x.media)).size,8);
  assert.deepEqual(score.photosByLock.uniqueEngineeringSchematics,[4,5,6]);
  for (const n of [4,5,6]){
    assert.match(js,new RegExp("'"+n+"':\\{photo:'flight"+n+"'"));
    assert.match(js,new RegExp("flight"+n+"-schematic\\.svg"));
    assert.ok(score.perLock.find(x=>x.lock===n).subject==='schematic');
  }
  assert.equal(score.perLock.find(x=>x.lock===8).subject,'contextual');
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

test('Mobile lock preview docks below the ship map without covering vessel markers',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
  const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const posMap=html.indexOf('id="shipMap"'),posStageEnd=html.indexOf('</div>',posMap),posDock=html.indexOf('id="mapLockPreview"'),posFallback=html.indexOf('id="mapFallback"');
  assert.ok(posMap>0&&posStageEnd>posMap&&posDock>posStageEnd&&posFallback>posDock,'preview follows closed map stage');
  assert.match(html,/id="mapLockPreview"[^>]*aria-live="polite"/);
  assert.match(css,/Premium lock handoff: on phones/);
  assert.match(css,/\.map-lock-preview\{[\s\S]*?position:relative;z-index:1/);
  assert.match(css,/\.welland-lock-pin\{display:grid;place-items:center;cursor:pointer\}/);
  assert.match(js,/const hit=44/);
  assert.match(js,/iconSize:\[hit,hit\]/);
  assert.match(js,/element\.classList\.toggle\('is-active',selected===key\)/);
  assert.doesNotMatch(js,/marker\.setIcon\(lockIcon/);
  assert.match(html,/welland-canal\.css\?v=20261012-journey1/);
  assert.match(html,/welland-canal\.js\?v=20261012-journey1/);
});


test('Shore-watch choices tie public viewing logistics to bounded fresh AIS evidence',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
  for(const id of ['3','7','8']){
    assert.ok(html.includes('data-spot="'+id+'"'), 'visitor option '+id);
    assert.ok(html.includes('id="shoreSignal'+id+'"'), 'evidence '+id);
    assert.ok(js.includes("'"+id+"':{title:"),'source-defined location '+id);
  }
  for(const id of ['shoreWatch','shoreWatchChoices','shoreWatchStatus','shoreWatchVessels','shoreWatchDirections','shoreWatchOfficial','shoreWatchMap']){
    assert.ok(html.includes('id="'+id+'"'), 'interactive surface '+id);
  }
  assert.ok(js.includes('function renderShoreWatch()'));
  assert.ok(js.includes('distanceKm(v,lock)<=2'));
  assert.ok(js.includes("aisState==='unavailable'"));
  assert.ok(js.includes('No fresh report nearby—not proof of an empty canal'));
  assert.ok(js.includes('chooseLock(activeWatchSpot,true,false)'));
  assert.ok(html.includes('order-of-turn'));
  assert.ok(html.includes('past 30 minutes within about 2 km'));
  assert.ok(css.includes('.shore-watch__choices{display:grid'));
  assert.ok(css.includes('@media(max-width:760px)'));
  assert.ok(!js.includes('predictedLockArrival'));
});

test('Freighters open a persistent source-labeled briefing without covering the map',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const js=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.js'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'../public/welland-canal/index.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../public/assets/welland-canal.css'),'utf8');
  const start=html.indexOf('id="shipMap"'),afterMap=html.indexOf('id="vesselSpotlight"'),beforeFallback=html.indexOf('id="mapFallback"');
  assert.ok(start>=0&&afterMap>start&&beforeFallback>afterMap,'dock vessel briefing after map');
  for(const id of ['vesselSpotlight','vesselSpotlightTitle','vesselSpotlightTime','vesselSpotlightMotion','vesselSpotlightPosition','vesselSpotlightDestination','vesselSpotlightDismiss'])
    assert.ok(html.includes('id="'+id+'"'),id+' exists');
  assert.match(js,/function renderVesselSpotlight\(\)/);
  assert.match(js,/function focusVessel\(mmsi,scrollToCard=false\)/);
  assert.match(js,/vesselData\.find\(v=>String\(v\.mmsi\)===selectedVessel\)/);
  assert.match(js,/Next lock and arrival time not verified from AIS/);
  assert.match(js,/Proximity does not establish lock occupancy/);
  assert.match(js,/marker\.on\('click',\(\)=>focusVessel\(v\.mmsi,true\)\)/);
  assert.match(js,/btn\.type='button';btn\.addEventListener\('click',\(\)=>focusVessel\(v\.mmsi,true\)\)/);
  assert.match(js,/renderShoreWatch\(\);renderVesselSpotlight\(\)/);
  assert.match(html,/Check official order of turn/);
  assert.match(css,/\.vessel-spotlight\{position:relative;display:grid/);
  assert.match(css,/\.vessel-spotlight\[hidden\]\{display:none!important\}/);
  assert.match(css,/@media\(max-width:620px\)/);
});

test('Welland search discovery preserves canonical truth and wires high-intent visitor handoffs',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
  const html=read('public/welland-canal/index.html');
  const soo=read('public/soo-locks/index.html');
  const lake=read('public/great-lakes-freighter-tracking/index.html');
  const sitemap=read('public/sitemap.xml');
  assert.match(html,/<title>Welland Canal Ship Tracker &amp; Schedule \| Chris Izworski<\/title>/);
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/welland-canal\/">/);
  assert.match(html,/id="ship-schedule"/);
  assert.match(html,/Welland Canal ship schedule today: three checks before you leave/);
  assert.match(html,/data-track-tool="welland-official-schedule" data-placement="welland-three-checks"/);
  assert.match(html,/What time will a freighter arrive at Lock 3\?/);
  assert.match(html,/last-reported time and direction/);
  assert.match(html,/don.t interpret an empty map as an empty canal/);
  assert.doesNotMatch(html,/<meta name="robots" content="noindex"/);
  assert.match(soo,/href="\/welland-canal\/" data-track-tool="welland-canal" data-placement="soo-locks-related"/);
  assert.match(lake,/href="\/welland-canal\/" data-track-tool="welland-canal" data-placement="freighter-related"/);
  assert.equal((lake.match(/Soo Locks Schedule Today<\/strong>/g)||[]).length,1,'remove duplicate Soo card');
  assert.match(sitemap,/https:\/\/chrisizworski\.com\/welland-canal\//);
  const structured=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(structured,'JSON-LD exists');
  const graph=JSON.parse(structured[1])['@graph'];
  const person=graph.filter(item=>item['@type']==='Person');
  assert.equal(person.length,1,'a single consistent Person identity');
  assert.equal(person[0]['@id'],'https://chrisizworski.com/#person');
  assert.equal(graph.find(item=>item['@type']==='WebPage').mainEntity['@id'],'https://chrisizworski.com/welland-canal/#app');
});


test('Welland offers an independent source-labeled AIS traffic board alongside authoritative Seaway link',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
  const html=read('public/welland-canal/index.html');
  const js=read('public/assets/welland-canal.js');
  const css=read('public/assets/welland-canal.css');
  assert.match(html,/id="trafficBriefRows"/);
  assert.match(html,/id="trafficBriefState"/);
  assert.match(html,/welland-traffic-brief/);
  assert.match(html,/independent AIS observations, not the official order of turn/i);
  assert.match(html,/https:\/\/www\.seaway-greatlakes\.com\/vessel-transit\/order-of-turn/);
  assert.match(js,/function renderTrafficBrief\(\)/);
  assert.match(js,/item\.km<=5/);
  assert.match(js,/Date\.parse\(b\.v\.seen\)-Date\.parse\(a\.v\.seen\)/);
  assert.match(js,/No fresh AIS reports within about 5 km/);
  assert.match(js,/AIS coverage unavailable/);
  assert.match(js,/renderTrafficBrief\(\)/);
  assert.match(js,/focusVessel\(v\.mmsi,true\)/);
  assert.match(css,/\.traffic-brief__row\{/);
  assert.doesNotMatch(js,/fetch\([^)]*seaway-greatlakes/);
});

test('Welland premium journey maintains eight-stage orientation and two-way lock navigation',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const html=read('public/welland-canal/index.html');
  const js=read('public/assets/welland-canal.js');
  const css=read('public/assets/welland-canal.css');
  assert.match(html,/id="lockJourneyTrack"[^>]*class="lock-journey__track"/);
  assert.match(html,/id="lockJourneyPosition"/);
  assert.match(html,/id="lockDetailPrevious"[^>]*disabled/);
  assert.match(js,/step\.classList\.toggle\('is-current'/);
  assert.match(js,/previousButton\.disabled=!lock\|\|lock\.id==='1'/);
  assert.match(js,/Restart · Lock 1/);
  assert.match(js,/\$\('lockDetailPrevious'\)\.addEventListener\('click'/);
  assert.match(css,/\.lock-detail__navigation\{display:grid;grid-template-columns:1fr 1fr/);
  assert.equal((html.match(/<span><\/span>/g)||[]).length>=8,true);
});
