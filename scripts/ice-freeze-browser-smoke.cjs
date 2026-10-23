#!/usr/bin/env node
'use strict';
/* Real Chromium smoke test against committed Michigan Ice HTML+JS.
 * NOAA/GLERL data and the map-image response are deterministic fixtures.
 * The SSO-protected Vercel preview is not accessed or impersonated here. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const out=path.join(process.cwd(),'artifacts/ice-freeze-browser');
fs.mkdirSync(out,{recursive:true});
const asJSON=x=>({status:200,contentType:'application/json',body:JSON.stringify(x)});
const now=new Date().toISOString();
const series=[
  {date:'2025-12-01',huron:4,michigan:2,stclair:8,superior:1,erie:3,ontario:1,total:2},
  {date:'2026-01-10',huron:22,michigan:15,stclair:40,superior:9,erie:35,ontario:10,total:17},
  {date:'2026-03-01',huron:45,michigan:30,stclair:65,superior:22,erie:42,ontario:21,total:32}
];
const winterSeries=series.map(r=>({...r,date:r.date.replace('2025-12','2026-12').replace('2026-01','2027-01').replace('2026-03','2027-03')}));
const cold={ok:true,cold:[],cover:null,climatology:{}};
const region=(slug)=>({slug,name:slug,available:true,supported:true,stale:false,
  rangeLabel:'1/10–3/10 ice',validAt:now,confidence:'high'});
function data(iceSeason,regionSlug){
  const regions={};
  for(const s of ['saginaw-bay','lake-st-clair','little-bay-de-noc','grand-traverse-bay'])
    regions[s]=region(s);
  return {
    ok:true,iceSeason,
    observed:{lakeWide:iceSeason?
      {current:{total:32,huron:45,michigan:30,stclair:65},
       observedAt:now,stale:false,series:winterSeries,change72h:{total:2,huron:3,michigan:2,stclair:4}}
      :null,regions},
    historical:iceSeason?null:{seasonStartYear:2025,series},
    forecast:null,
    safety:'Ice concentration does not assess safe ice.'
  };
}
async function run(){
 const browser=await chromium.launch({headless:true});
 const log=[];
 try{
  for(const width of [320,390,1280]){
   for(const season of ['offseason','winter']){
    const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
    const errors=[]; const exports=[];
    page.on('pageerror',e=>errors.push(e.stack||String(e)));
    const inWinter=season==='winter';
    await page.route('**/api/ice-now**',route=>route.fulfill(asJSON(data(inWinter))));
    await page.route('**/api/ice',route=>route.fulfill(asJSON(cold)));
    await page.route('**/api/carto-basemap-config',route=>route.fulfill(asJSON({provider:'CARTO',key:'test-public-key'})));
    await page.route('https://api.weather.gov/**',route=>route.fulfill({status:503,body:'Unavailable'}));
    // Local pinned Leaflet exactly matches production 1.9.4 without CDN dependency.
    await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({
      status:200,contentType:'application/javascript',
      body:fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'),'utf8')
    }));
    await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({
      status:200,contentType:'text/css',
      body:fs.readFileSync(require.resolve('leaflet/dist/leaflet.css'),'utf8')
    }));
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/RRkAAAAASUVORK5CYII=','base64');
    await page.route('https://mapservices.weather.noaa.gov/**',route=>{
      const u=new URL(route.request().url());
      if(u.pathname.endsWith('/export')){
        exports.push(u.toString());
        assert.equal(u.searchParams.get('layers'),'show:0');
        assert.equal(u.searchParams.get('bboxSR'),'3857');
        return route.fulfill({status:200,contentType:'image/png',body:png});
      }
      return route.abort();
    });
    await page.route('https://basemaps.cartocdn.com/**',route=>route.fulfill({status:200,contentType:'image/png',body:png}));
    await page.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:png}));
    await page.route('https://fonts.googleapis.com/**',route=>route.abort());
    await page.route('https://fonts.gstatic.com/**',route=>route.abort());
    await page.goto('http://127.0.0.1:8126/michigan-ice/',{waitUntil:'domcontentloaded'});
    await page.locator('#ice-freeze-explorer').waitFor({timeout:15000});
    await page.waitForFunction(()=>document.querySelector('#ice-ex-map')?.classList.contains('leaflet-container'));
    await page.locator('#ice-ex-reset').click();
    await page.waitForFunction(()=>document.querySelector('#ice-ex-chart-value')?.textContent?.includes('2026') ||
      document.querySelector('#ice-ex-chart-value')?.textContent?.includes('2027'),{timeout:12000});
    assert.equal(errors.length,0,'Page JS error at '+width+' '+season+': '+errors.join('\n'));
    assert.match(await page.locator('#ice-ex-chart-value').textContent(),/Lake Huron/);
    const note=await page.locator('#ice-ex-timeline-note').textContent();
    assert.match(note,inWinter?/whole-lake coverage/:/last completed winter/);
    const chartPoints=await page.locator('#ice-ex-chart path').count();
    assert.ok(chartPoints>0,'SVG data trend missing');
    const slider=page.locator('#ice-ex-slider');
    assert.equal(await slider.isEnabled(),true);
    await slider.fill('0');
    assert.match(await page.locator('#ice-ex-chart-value').textContent(),/4%/);
    await page.locator('#ice-ex-region').selectOption('lake-st-clair');
    await page.waitForFunction(()=>document.querySelector('#ice-ex-chart-value')?.textContent?.includes('Lake St. Clair'));
    assert.match(await page.locator('#ice-ex-detail').getAttribute('href'),/lake-st-clair.html/);
    await slider.fill('0');
    assert.match(await page.locator('#ice-ex-chart-value').textContent(),/8%/);
    await page.locator('#ice-ex-play').click();
    await page.waitForTimeout(900);
    assert.notEqual(await slider.inputValue(),'0','Playback did not advance');
    await page.locator('#ice-ex-play').click().catch(()=>{});
    if(inWinter){
      await page.waitForFunction(()=>!!document.querySelector('#ice-ex-map .leaflet-container') ||
        !!document.querySelector('#ice-ex-map.leaflet-container'));
      await page.waitForTimeout(850);
      assert.ok(exports.length>0,'Current NOAA map image not requested');
      const zoom=page.locator('#ice-ex-map .leaflet-control-zoom-in');
      const beforeZoom = exports.length;
      await zoom.click();
      // Leaflet zoom animation (~250ms) + NOAA request debounce (180ms) + image load.
      await page.waitForTimeout(1050);
      const currentZoom = await page.locator('#ice-ex-map').evaluate(el=>el.classList.contains('leaflet-container'));
      assert.equal(currentZoom,true,'Leaflet controls lost the map container');
      assert.ok(exports.length>beforeZoom,'Map zoom did not request a new NOAA extent; '+JSON.stringify({beforeZoom,afterZoom:exports.length}));
    }else{
      assert.equal(exports.length,0,'An off-season historical chart must not load live mapped ice');
      assert.match(await page.locator('#ice-ex-map-stamp').textContent(),/Off season/);
    }
    assert.match(await page.locator('#ice-freeze-explorer .ice-ex-limit').textContent(),/Not a safe-ice assessment/);
    const widthCheck=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
    assert.ok(widthCheck.scroll<=widthCheck.view+2,
      'Horizontal overflow '+width+'px '+season+' '+JSON.stringify(widthCheck));
    await page.locator('#ice-freeze-explorer').screenshot({path:path.join(out,season+'-'+width+'.png')});
    log.push({width,season,maps:exports.length});
    await page.close();
   }
  }
  const failed=await browser.newPage({viewport:{width:390,height:820}});
  await failed.route('**/api/ice-now**',route=>route.fulfill({status:503,body:'Unavailable'}));
  await failed.route('**/api/ice',route=>route.fulfill(asJSON(cold)));
  await failed.route('**/api/carto-basemap-config',route=>route.fulfill({status:503,body:'Map key unavailable'}));
  await failed.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'),'utf8')}));
  await failed.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',route=>route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync(require.resolve('leaflet/dist/leaflet.css'),'utf8')}));
  await failed.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/RRkAAAAASUVORK5CYII=','base64')}));
  await failed.route('https://api.weather.gov/**',route=>route.fulfill({status:503,body:'Unavailable'}));
  await failed.goto('http://127.0.0.1:8126/michigan-ice/',{waitUntil:'domcontentloaded'});
  await failed.locator('#ice-freeze-explorer').waitFor({timeout:10000});
  await failed.waitForFunction(()=>/NOAA ice data unavailable/.test(document.querySelector('#ice-ex-map-stamp')?.textContent||''),{timeout:10000});
  await failed.waitForFunction(()=>document.querySelector('#ice-ex-map')?.classList.contains('leaflet-container'),{timeout:10000});
  await failed.waitForFunction(()=>/OpenStreetMap/.test(document.querySelector('#ice-ex-basemap-status')?.textContent||''),{timeout:10000});
  await failed.locator('#ice-ex-reset').click();
  assert.equal(await failed.locator('#ice-ex-map .leaflet-control-zoom-in').count(),1,'Map must work while NOAA and CARTO are unavailable');
  assert.match(await failed.locator('#ice-freeze-explorer').textContent(),/Not a safe-ice assessment/);
  await failed.close();
  console.log(JSON.stringify({result:'PASS',cases:log,missingData:'PASS'},null,2));
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
