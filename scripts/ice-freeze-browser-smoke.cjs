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
  if(regionSlug && !regions[regionSlug])
    regions[regionSlug]={...region(regionSlug),scope:regionSlug.startsWith('lake-')?'lake-overview':'local-bay'};
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
    await page.route('**/api/ice-now**',route=>{
      const slug = new URL(route.request().url()).searchParams.get('region');
      return route.fulfill(asJSON(data(inWinter,slug)));
    });
    await page.route('**/api/ice-history?*',route=>{
      const value=new URL(route.request().url()).searchParams.get('season');
      if(value==='2022')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false})});
      const y=Number(value);
      if(!/^\d{4}$/.test(value)||y<2015) return route.fulfill({status:400,body:'Bad year'});
      const historical=[
        {date:y+'-12-01',superior:3,michigan:5,huron:7,erie:4,ontario:2,stclair:12,total:5},
        {date:(y+1)+'-01-10',superior:31,michigan:42,huron:53,erie:61,ontario:24,stclair:72,total:38},
        {date:(y+1)+'-03-01',superior:22,michigan:29,huron:33,erie:27,ontario:16,stclair:31,total:24}
      ];
      return route.fulfill(asJSON({ok:true,seasonStartYear:y,seasonLabel:y+'–'+String(y+1).slice(2),series:historical}));
    });
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
    await page.route('https://www.glerl.noaa.gov/data/ice/glicd/jpgs/**',route=>{
      if(/20251201\.jpg|20261201\.jpg/.test(route.request().url()))
        return route.fulfill({status:404,body:'NOAA daily image unavailable'});
      return route.fulfill({status:200,contentType:'image/png',body:png});
    });
    await page.route('https://fonts.googleapis.com/**',route=>route.abort());
    await page.route('https://fonts.gstatic.com/**',route=>route.abort());
    await page.goto('http://127.0.0.1:8126/michigan-ice/',{waitUntil:'domcontentloaded'});
    await page.locator('#ice-freeze-explorer').waitFor({timeout:15000});
    await page.waitForFunction(()=>document.querySelector('#ice-ex-map')?.classList.contains('leaflet-container'));
    await page.locator('#ice-ex-reset').click();
    await page.locator('#ice-ex-fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement?.id==='ice-ex-map-shell',{timeout:7000});
    const fullMap=await page.locator('#ice-ex-map').boundingBox();
    assert.ok(fullMap&&fullMap.height>500,'Fullscreen map did not expand over page overlays');
    await page.locator('#ice-ex-fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement===null,{timeout:7000});
    await page.waitForFunction(()=>document.querySelector('#ice-ex-chart-value')?.textContent?.includes('2026') ||
      document.querySelector('#ice-ex-chart-value')?.textContent?.includes('2027'),{timeout:12000});
    assert.equal(errors.length,0,'Page JS error at '+width+' '+season+': '+errors.join('\n'));
    assert.match(await page.locator('#ice-ex-chart-value').textContent(),/Lake Huron/);
    const note=await page.locator('#ice-ex-timeline-note').textContent();
    assert.match(note,inWinter?/Current winter/:/Latest completed winter/);
    const chartPoints=await page.locator('#ice-ex-chart path').count();
    assert.ok(chartPoints>0,'SVG data trend missing');
    const slider=page.locator('#ice-ex-slider');
    assert.equal(await slider.isEnabled(),true);
    const frame=page.locator('#ice-ex-daily-image');
    await frame.waitFor({state:'visible',timeout:10000});
    const initialSrc=await frame.getAttribute('src');
    assert.match(initialSrc,inWinter?/\/2027\/20270301\.jpg$/:/\/2026\/20260301\.jpg$/);
    assert.match(await page.locator('#ice-ex-daily-status').textContent(),/actual NOAA GLERL daily mapped ice concentration/);
    assert.equal(await page.locator('#ice-ex-daily-source').isVisible(),true);
    const focusedStyle=await frame.evaluate(img=>img.style.transform);
    assert.match(focusedStyle,/scale\(2/);
    // This button must OPEN an actual large image, not only unzoom a thumbnail.
    const openAll=page.locator('#ice-ex-daily-mode');
    assert.equal(await openAll.isEnabled(),true);
    await openAll.click();
    const dialog=page.locator('#ice-ex-daily-dialog');
    assert.equal(await dialog.evaluate(el=>el.open),true,'All-lakes dialog did not open');
    assert.equal(await page.locator('[data-ice-large-lake="all"]').getAttribute('aria-pressed'),'true');
    const enlarged=page.locator('#ice-ex-modal-image');
    await enlarged.waitFor({state:'visible',timeout:8000});
    assert.match(await enlarged.evaluate(el=>el.style.transform),/scale\(1\)/);
    assert.equal(await enlarged.getAttribute('src'),initialSrc);
    await page.locator('[data-ice-large-lake="superior"]').click();
    assert.match(await enlarged.evaluate(el=>el.style.transform),/scale\(2/);
    assert.equal(await page.locator('[data-ice-large-lake="superior"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-ice-large-lake="ontario"]').click();
    assert.match(await page.locator('#ice-ex-modal-metric').textContent(),/Lake Ontario/);
    await page.locator('[data-ice-large-lake="all"]').click();
    assert.match(await enlarged.evaluate(el=>el.style.transform),/scale\(1\)/);
    await page.locator('#ice-ex-modal-slider').fill('0');
    await page.waitForTimeout(1200);
    console.log('NOAA modal first-day diagnostic',JSON.stringify({season,inWinter,slider:await page.locator('#ice-ex-slider').inputValue(),chart:await page.locator('#ice-ex-chart-value').textContent(),status:await page.locator('#ice-ex-modal-status').textContent(),img:await page.locator('#ice-ex-daily-image').getAttribute('src'),hidden:await page.locator('#ice-ex-daily-image').isHidden()}));
    await page.waitForFunction(()=>/not provided|unavailable/i.test(document.querySelector('#ice-ex-modal-status')?.textContent||''),null,{timeout:8000});
    assert.equal(await enlarged.isVisible(),false,'Missing historical frame must not leave stale large image');
    await page.locator('#ice-ex-modal-slider').fill('2');
    await enlarged.waitFor({state:'visible',timeout:8000});
    await page.locator('#ice-ex-modal-close').click();
    assert.equal(await dialog.evaluate(el=>el.open),false);
    await openAll.press('Enter');
    assert.equal(await dialog.evaluate(el=>el.open),true,'Keyboard activation failed');
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(el=>el.open),false,'Escape did not close viewer');

    // Archived season persists across lake changes and synchronizes both viewers.
    const seasonSelect=page.locator('#ice-ex-season');
    assert.ok(await seasonSelect.locator('option').count()>=10,'Missing historical winter choices');
    await seasonSelect.selectOption('2023');
    await page.waitForFunction(()=>/2023–24/.test(document.querySelector('#ice-ex-chart-value')?.textContent||'') ||
      /Jan 10, 2024/.test(document.querySelector('#ice-ex-chart-value')?.textContent||''),null,{timeout:10000});
    assert.match(await page.locator('#ice-ex-chart-value').textContent(),/53%.*Lake Huron|53%.*Lake Erie|53%.*Lake St. Clair|53%/);
    assert.match(await page.locator('#ice-ex-daily-image').getAttribute('src'),/2024\/20240110\.jpg$/);
    await openAll.click();
    assert.equal(await page.locator('#ice-ex-modal-season').inputValue(),'2023');
    await page.locator('#ice-ex-modal-season').selectOption('2021');
    await page.waitForFunction(()=>/2022\/20220110\.jpg/.test(document.querySelector('#ice-ex-daily-image')?.getAttribute('src')||''),null,{timeout:10000});
    assert.equal(await seasonSelect.inputValue(),'2021');
    await page.locator('#ice-ex-modal-season').selectOption('2022');
    await page.waitForFunction(()=>/unavailable/i.test(document.querySelector('#ice-ex-season-status')?.textContent||''),null,{timeout:10000});
    assert.equal(await page.locator('#ice-ex-daily-image').isVisible(),false,
      'An unavailable archive must not reuse a previous winter image');
    await page.locator('#ice-ex-modal-season').selectOption('auto');
    await page.locator('#ice-ex-modal-close').click();
    await page.waitForFunction(()=>/2026|2027/.test(document.querySelector('#ice-ex-chart-value')?.textContent||''),null,{timeout:8000});


    await slider.fill('0');
    assert.match(await page.locator('#ice-ex-chart-value').textContent(),/4%/);
    await page.waitForFunction(()=>/not provided|unavailable/i.test(document.querySelector('#ice-ex-daily-status')?.textContent||''),{timeout:10000});
    assert.equal(await frame.isVisible(),false,'A missing NOAA daily image must not show a previous date frame');
    assert.equal(await page.locator('#ice-ex-daily-source').isVisible(),false);
    await page.locator('#ice-ex-region').selectOption('lake-st-clair');
    await page.waitForFunction(()=>document.querySelector('#ice-ex-chart-value')?.textContent?.includes('Lake St. Clair'));
    assert.equal(await openAll.isEnabled(),true,'All-lakes viewer must work from Lake St. Clair');
    await openAll.click();
    assert.equal(await dialog.evaluate(el=>el.open),true);
    await page.locator('#ice-ex-modal-close').click();
    assert.match(await page.locator('#ice-ex-detail').getAttribute('href'),/lake-st-clair.html/);
    await slider.fill('0');
    assert.match(await page.locator('#ice-ex-chart-value').textContent(),/8%/);
    await page.locator('#ice-ex-play').click();
    await page.waitForTimeout(900);
    assert.notEqual(await slider.inputValue(),'0','Playback did not advance');
    await page.locator('#ice-ex-play').click().catch(()=>{});
    // The map must cover all five lakes plus a true Tawas Bay scope.
    for(const [slug,name] of [['lake-superior','Lake Superior'],['lake-michigan','Lake Michigan'],['lake-huron','Lake Huron'],['lake-erie','Lake Erie'],['lake-ontario','Lake Ontario'],['tawas-bay','Lake Huron']]) {
      await page.locator('#ice-ex-region').selectOption(slug);
      await page.waitForFunction(expected =>
        document.querySelector('#ice-ex-chart-heading')?.textContent?.includes(expected),name,{timeout:7000});
      assert.ok((await page.locator('#ice-ex-detail').getAttribute('href')).includes('ice-region='+slug),
        'Missing deep link '+slug);
      assert.match(await page.locator('#ice-ex-chart-value').textContent(),new RegExp(name));
      await page.waitForFunction(expected=>document.querySelector('#ice-ex-daily-status')?.textContent?.includes(expected),
        /20261201|20251201/.test(await frame.getAttribute('src')||'')?'NOAA':'NOAA',{timeout:6000});
      if(slug==='lake-superior')assert.match(await frame.evaluate(img=>img.style.transform),/scale\(2/);
      if(slug==='tawas-bay')assert.match(await page.locator('#ice-ex-map-type').textContent(),/Bay map/);
      if(slug.startsWith('lake-'))assert.match(await page.locator('#ice-ex-map-type').textContent(),/Whole-lake map extent/);
    }
    // Preserve existing region behavior and verify zoom still refreshes NOAA imagery.
    await page.locator('#ice-ex-region').selectOption('lake-st-clair');
    // In Lake St. Clair mode, NOAA's Great Lakes chart is deliberately shown whole;
    // the small lake's local ice state is not inferred from a cropped regional chart.
    assert.match(await frame.evaluate(img=>img.style.transform),/scale\(1\)/);
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
  await failed.goto('http://127.0.0.1:8126/michigan-ice/?ice-region=tawas-bay',{waitUntil:'domcontentloaded'});
  assert.equal(await failed.locator('#ice-ex-region').inputValue(),'tawas-bay');
  await failed.locator('#ice-freeze-explorer').waitFor({timeout:10000});
  await failed.waitForFunction(()=>/NOAA ice data unavailable/.test(document.querySelector('#ice-ex-map-stamp')?.textContent||''),null,{timeout:10000});
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
