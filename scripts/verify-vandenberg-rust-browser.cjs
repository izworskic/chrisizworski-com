#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../public');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.b64':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  const parsed=new URL(req.url,'http://127.0.0.1');
  if(parsed.pathname==='/api/carto-basemap-config'){
    res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return;
  }
  let decoded;
  try{decoded=decodeURIComponent(parsed.pathname)}catch{res.writeHead(400);res.end();return;}
  const chosen=decoded.endsWith('/')?decoded+'index.html':decoded;
  const file=path.resolve(ROOT,'.'+chosen);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  });
});
const mapStub=()=>{
  // Browser QA exercises actual DOM, Rust WASM and async source retrieval without
  // depending on remote tile/CDN services; dedicated Leaflet tests cover map rendering.
  window.L={
    map(){return {_layers:new Set(),hasLayer(o){return this._layers.has(o)},removeLayer(o){this._layers.delete(o);return this},fitBounds(){return this},panTo(){return this},invalidateSize(){return this}};},
    tileLayer(){return {on(){return this},addTo(map){map._layers.add(this);return this}};},
    divIcon(config){return config;},
    marker(coords){const node=document.createElement('span');return {
      addTo(map){map._layers.add(this);return this},
      getLatLng(){return coords},
      getElement(){return node},
      setZIndexOffset(){return this},
      bindPopup(){return this},
      on(){return this}
    };}
  };
};
(async()=>{
  let browser,report={scenarios:[],errors:[]};
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url='http://127.0.0.1:'+server.address().port+'/vandenberg-rocket-launch-viewing/';
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const [name,width,height] of [['phone390',390,844],['desktop1440',1440,900]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(mapStub);
      await page.addInitScript(()=>{window.__VG_RUST_QA_DEBUG=true;});
      await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({status:200,body:'',contentType:'text/javascript'}));
      await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({status:200,body:'',contentType:'text/css'}));
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(response.status(),200);
      await page.waitForFunction(()=>document.querySelector('#vg-viewing-map')?.dataset.rust==='ready',null,{timeout:10000})
        .catch(async error=>{
          const diagnostic=await page.evaluate(()=>({
            mapReady:document.querySelector('#vg-viewing-map')?.dataset.mapReady,
            rust:document.querySelector('#vg-viewing-map')?.dataset.rust,
            mapError:document.querySelector('#vg-viewing-map')?.dataset.mapQaError,
            mapMarkup:document.querySelector('#vg-viewing-map')?.textContent?.slice(0,350),
            leaflet:!!window.L,
            guideLoaded:!!document.querySelector('#vg-map-places button'),
            controls:!!document.getElementById('vg-rust-choices'),
            wasmNative:typeof WebAssembly,
            wasmUrl:'/vandenberg-rocket-launch-viewing/viewpoint-engine.wasm.b64'
          }));
          throw new Error(name+' Rust/WASM did not initialize: '+JSON.stringify({diagnostic,pageErrors:errors,original:String(error)}));
        });
      assert.equal(await page.locator('#vg-rust-choices').isVisible(),true,name+' Rust panel should appear');
      assert.equal(await page.locator('#vg-rust-choices').getAttribute('data-engine'),'rust-wasm');
      assert.equal(await page.locator('#vg-rust-choice-link').innerText(),'Ocean Beach Park',name+' coastal-first default');
      await page.locator('[data-rust-priority="0"]').click();
      assert.equal(await page.locator('#vg-rust-choice-link').innerText(),'Riverbend Park',name+' family ranking');
      assert.equal((await page.locator('#vg-map-places button').count()),6,name+' six published venues');
      await page.locator('[data-rust-priority="1"]').click();
      assert.equal(await page.locator('#vg-rust-choice-link').innerText(),'Allan Hancock College — Lompoc',name+' photography ranking');
      await page.locator('[data-rust-priority="2"]').click();
      assert.equal(await page.locator('#vg-rust-choice-link').innerText(),'Ocean Beach Park',name+' coastal ranking');
      await page.locator('#vg-rust-marine').check();
      assert.equal(await page.locator('#vg-rust-choice-link').innerText(),'Allan Hancock College — Lompoc',name+' fog choice');
      assert.match(await page.locator('#vg-rust-choice-context').innerText(),/not a measured condition/);
      await page.locator('[data-map-filter="coast"]').click();
      assert.equal(await page.locator('#vg-map-places button').count(),2,name+' Rust coastal filter');
      assert.equal(await page.locator('#vg-rust-choice-link').innerText(),'Ocean Beach Park',name+' comparison obeys coast-only selection');
      await page.locator('[data-map-filter="town"]').click();
      assert.equal(await page.locator('#vg-map-places button').count(),4,name+' Rust town filter');
      assert.equal(await page.locator('#vg-rust-choice-link').innerText(),'Allan Hancock College — Lompoc',name+' comparison obeys town-only selection');
      await page.locator('[data-map-filter="all"]').click();
      assert.equal(await page.locator('#vg-map-places button').count(),6,name+' restored inventory');
      assert.equal(errors.length,0,name+' JavaScript page errors '+errors.join('; '));
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=2,name+' layout overflow '+overflow);
      report.scenarios.push({name,engine:'rust-wasm',filter:'coast-town-all',priorities:'family-photo-coast',fog:'manual',overflow});
      await context.close();
    }
    const badContext=await browser.newContext({viewport:{width:390,height:844}});
    const unavailable=await badContext.newPage();
    await unavailable.addInitScript(mapStub);
    await unavailable.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({status:200,body:'',contentType:'text/javascript'}));
    await unavailable.route('**/viewpoint-engine.wasm.b64',route=>route.abort());
    await unavailable.goto(url,{waitUntil:'domcontentloaded'});
    await unavailable.waitForFunction(()=>document.querySelector('#vg-viewing-map')?.dataset.rust==='unavailable',{timeout:15000});
    assert.equal(await unavailable.locator('#vg-rust-choices').isVisible(),false,'Failed WASM must not show inert controls');
    assert.equal(await unavailable.locator('#vg-map-places button').count(),6,'WASM failure must retain all six places');
    await unavailable.locator('[data-map-filter="coast"]').click();
    assert.equal(await unavailable.locator('#vg-map-places button').count(),2,'WASM failure must retain JS map filters');
    report.scenarios.push({name:'wasm-outage',map:'works',publicPlaces:6});
    await badContext.close();
    const noJsContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const noJs=await noJsContext.newPage();
    await noJs.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(await noJs.locator('.vg-place-card').count(),6,'No JS must preserve all six original public place descriptions');
    assert.equal(await noJs.locator('#vg-rust-choices').isVisible(),false);
    assert.match(await noJs.locator('.vg-map-placeholder').innerText(),/requires JavaScript/);
    report.scenarios.push({name:'no-JS',staticPlaces:6,originalGuide:'available'});
    await noJsContext.close();
    console.log(JSON.stringify(report,null,2));
  }catch(error){console.error(error.stack||String(error));process.exitCode=1}
  finally{
    if(browser)await browser.close();
    if(server.listening)await new Promise(resolve=>server.close(resolve));
  }
})();
