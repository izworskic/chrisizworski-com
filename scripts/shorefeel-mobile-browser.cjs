'use strict';
// Browser-quality test using locally served final HTML and mocked *labeled* NOAA response.
// Run with NODE_PATH pointing to an isolated playwright-core install; no project dependency.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const ROOT=path.join(__dirname,'../public'),OUT=path.join(__dirname,'../artifacts/shorefeel-mobile');
fs.mkdirSync(OUT,{recursive:true});
const pages=[
 ['/great-lakes-water-temperature/','hub'],
 ['/lake-michigan-water-temperature/','lake'],
 ['/lake-michigan-water-temperature/grand-haven/','grand'],
 ['/lake-michigan-water-temperature/traverse-city/','traverse']
];
const sample={date:'2026-10-12',tempF:62.1},history=[{date:'2026-10-11',tempF:61.8},sample];
const lakes=Object.fromEntries(['superior','michigan','huron','erie','ontario'].map(k=>[k,{status:'recent',latest:sample,history,trend7:null}]));
const activities=['swim','family','paddle','relax'];
const assessments=Object.fromEntries(activities.map(a=>[a,{
 heading:'Decision for '+a,beach:'Sunny air and moderate wind can feel warm on the sand.',
 water:'An offshore buoy observation is not the beach water temperature.',
 after:'Wet skin cools quickly in wind.',decision:'Check official beach safety information separately.',state:'contextual'
}]));
function fixture(url){
 const place=url.searchParams.get('place');
 return JSON.stringify({product:'ShoreFeel',lake:'michigan',lakes,local:place?{
  name:place,waterBody:place==='grand-haven'?'Lake Michigan off Grand Haven':'Grand Traverse Bay',stationId:place==='grand-haven'?'45029':'45020',
  stationName:'Test offshore buoy',lat:43.2,lon:-86.2,caveat:'Station is offshore, not the beach.',
  measurement:place==='traverse-city'?null:{tempF:60.8,observedAt:'2026-10-13T11:00:00.000Z'},
  periods:[{startsAt:'2026-10-13T13:00:00-04:00',tempF:75,windMph:12,summary:'Sunny',daylight:true}],
 }:null,
 // Evidence ladder: the API resolves `water` (buoy > nearest valid satellite pixel > null).
 water:place==='grand-haven'?{kind:'buoy',tempF:60.8,observedAt:'2026-10-13T11:00:00.000Z',label:'Test offshore buoy 45029',where:'Lake Michigan off Grand Haven',caveat:'A buoy reading is the water at the buoy, not the shallow water at the beach.'}:null,
 regionalSatellite:place?{status:'unavailable',cells:[{key:'west-bay',short:'West Bay',label:'West Grand Traverse Bay',measurement:null}]}:null,
 normal:{date:'2026-10-12',tempF:57.1,deltaF:5},
 weatherNow:place?{startsAt:'2026-10-13T13:00:00-04:00',tempF:75,windMph:12,summary:'Sunny',daylight:true}:null,
 assessments:place?assessments:null,weatherWindow:place?{startsAt:'2026-10-13T13:00:00-04:00'}:null});
}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/shorefeel'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(fixture(url));return;}
  const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname),(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  const stat=fs.statSync(file);
  if(!stat.isFile()){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(404).end();}
});
(async()=>{
 const ch=process.env.CHROME_BIN||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
 assert.ok(ch,'Chrome/Chromium is required for an actual browser pass');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:ch,args:['--no-sandbox','--disable-dev-shm-usage']});
 const audit=[];
 try{
  for(const width of [320,375,390,768,1024,1280,1440]){
   for(const [route,key] of pages){
    const height=width===1024?768:width===1280?800:870;
    const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<769,isMobile:width<769});
    const page=await ctx.newPage();
    // Deliberately simulate unavailable external media/tiles to test the fallback.
    await page.route(/(?:upload\.wikimedia\.org|unpkg\.com|tile\.openstreetmap\.org)/,r=>r.abort());
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+route,{waitUntil:'load',timeout:18000});
    await page.waitForFunction(()=>document.getElementById('data-status')?.textContent.includes('NOAA'),null,{timeout:7000});
    const detail=await page.evaluate(()=>{
     const photo=document.querySelector('.hero-photo');
     return {documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
      photoComplete:photo?.complete,photoVisible:!!photo&&photo.getBoundingClientRect().height>0,
      photographSource:photo?.currentSrc,
      titleVisible:document.querySelector('h1')?.getBoundingClientRect().width>0,
      temp:document.querySelector('#lake-temp')?.textContent||null};
    });
    assert.ok(detail.documentWidth<=width+1,key+' '+width+'px overflow: '+JSON.stringify(detail));
    assert.ok(detail.photoVisible,key+' photo not rendered');
    assert.ok(detail.titleVisible,key+' title missing');
    if(key==='hub')assert.match(await page.locator('#lake-michigan').textContent(),/62\.1°F/);
    if(key==='grand'||key==='traverse'){
     if(key==='grand'){
      await page.waitForFunction(()=>document.querySelector('.hero-photo')?.dataset.shorefeelFallbackUsed==='1',null,{timeout:6500});
      assert.match(await page.locator('.hero-media figcaption').textContent(),/Destination photograph unavailable/);
     }else{
      // Traverse uses the stable first-party shoreline photo and local Leaflet assets.
      await page.waitForFunction(()=>window.L && document.querySelector('#shore-map.leaflet-container'),null,{timeout:7500});
      await page.waitForFunction(()=>document.querySelector('.hero-photo')?.dataset.shorefeelFallbackUsed==='1',null,{timeout:6500});
      assert.match(await page.locator('.hero-photo').getAttribute('src'),/^\/assets\/great-lakes-beaches\/lake-michigan-hero\.jpg$/);
      assert.match(await page.locator('.hero-media figcaption').textContent(),/Destination photograph unavailable/);
      assert.ok(await page.locator('#shore-map .leaflet-pane').count()>0,'Traverse real Leaflet map not initialized');
     }
     await page.getByRole('button',{name:'With family'}).click();
     assert.match(await page.locator('#feel-title').textContent(),/family/);
     await page.getByRole('button',{name:'Paddling'}).click();
     assert.match(await page.locator('#feel-title').textContent(),/paddle/);
     assert.match(await page.locator('#local-source').textContent(),key==='traverse'?/No buoy observation/:/Buoy 45029 · /);
     if(key==='traverse'){
      // No buoy and no valid bay pixel: the headline says so. The whole-lake mean is
      // context on its own line and is never promoted to a bay reading.
      const answer=await page.locator('#lead-temp').textContent();
      assert.equal(answer,'No current reading','whole-lake mean must not lead as a bay reading');
      assert.match(await page.locator('#lead-temp-label').textContent(),/GRAND TRAVERSE BAY · NOT VERIFIED/);
      assert.match(await page.locator('#lead-bay-status').textContent(),/Not reporting/);
      assert.match(await page.locator('#lead-grid-status').textContent(),/No valid pixel/);
      assert.match(await page.locator('#lead-lake-context').textContent(),/62\.1°F on Oct 12 · \+5\.0°F vs the long-term normal/);
      const answerStyle=await page.locator('#lead-temp').evaluate(el=>getComputedStyle(el).fontSize);
      assert.ok(parseFloat(answerStyle)>=40,'temperature reading must be the dominant feature');
      if(width===1024||width===1280){
       const hero=await page.evaluate(()=>{
        const head=document.querySelector('.hero').getBoundingClientRect();
        const photo=document.querySelector('.hero-photo').getBoundingClientRect();
        const figure=document.querySelector('.hero-media').getBoundingClientRect();
        const evidence=document.querySelector('#shorefeel-now').getBoundingClientRect();
        const style=getComputedStyle(document.querySelector('.hero'));
        const after=getComputedStyle(document.querySelector('.hero-media'),'::after');
        return {heroHeight:head.height,heroWidth:head.width,photoWidth:photo.width,photoHeight:photo.height,
          figureWidth:figure.width,evidenceY:evidence.y+window.scrollY,background:style.backgroundColor,
          overlay:after.display};
       });
       assert.ok(hero.heroHeight<=435,'Traverse temperature-first hero must fit above fold '+width+': '+JSON.stringify(hero));
       assert.ok(hero.photoWidth>width*.27 && hero.photoWidth<width*.52,
         'Traverse photo must be a separate, visible editorial card '+width+': '+JSON.stringify(hero));
       assert.ok(hero.photoHeight>=160 && hero.photoHeight<=260,'secondary photo size '+width+': '+JSON.stringify(hero));
       assert.ok(hero.evidenceY<560,'real readings should be above fold '+width+': '+JSON.stringify(hero));
       assert.equal(hero.overlay,'none','dark photo overlay must be removed');
       assert.notEqual(hero.background,'rgb(9, 42, 59)','remove blue full-bleed hero');
      }
      const dims=await page.evaluate(()=>({
       documentWidth:document.documentElement.scrollWidth,
       bodyWidth:document.body.scrollWidth,viewport:innerWidth,
       mapWidth:document.querySelector('#shore-map')?.getBoundingClientRect().width
      }));
      assert.ok(dims.documentWidth<=width+1 && dims.bodyWidth<=width+1,
        'Traverse must not scroll sideways after live Leaflet/map and activity updates at '+width+'px: '+JSON.stringify(dims));
      assert.ok(dims.mapWidth<=width+1,'Traverse map wider than viewport');
     }
    }
    assert.equal(errors.length,0,key+' browser JS exceptions: '+errors.join('; '));
    if(width===375||(width===1440&&key==='lake')||(key==='traverse'&&(width===1024||width===1280)))await page.screenshot({path:path.join(OUT,key+'-'+width+'.png'),fullPage:true});
    audit.push({page:key,width,overflow:false,photoRendered:true,interaction:key==='grand'||key==='traverse'?'passed':'not applicable'});
    await ctx.close();
   }
  }
  // Fail-closed state must be legible if the upstream API is unavailable.
  const ctx=await browser.newContext({viewport:{width:375,height:812},isMobile:true});
  const page=await ctx.newPage();
  await page.route(/(?:upload\.wikimedia\.org|unpkg\.com|tile\.openstreetmap\.org)/,r=>r.abort());
  await page.route('**/api/shorefeel?*',r=>r.fulfill({status:503,body:'unavailable'}));
  await page.goto(base+'/lake-michigan-water-temperature/grand-haven/',{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#feel-title')?.textContent.includes('Evidence unavailable'));
  assert.match(await page.locator('#local-temp').textContent(),/Unavailable/);
  await ctx.close();

  // When the NOAA satellite bay grid is fresh and the seasonal bay buoy is
  // absent, use the gridded SST ahead of the coarser whole-lake number.
  const gridCtx=await browser.newContext({viewport:{width:1024,height:768}});
  const gridPage=await gridCtx.newPage();
  await gridPage.route(/(?:upload\.wikimedia\.org|tile\.openstreetmap\.org)/,r=>r.abort());
  await gridPage.route('**/api/shorefeel?*',route=>{
   const payload=JSON.parse(fixture(new URL('http://localhost/api/shorefeel?lake=michigan&place=traverse-city')));
   const m={tempF:64.4,observedAt:'2026-10-13T12:00:00.000Z',distanceKm:4.2};
   payload.regionalSatellite={status:'recent',cells:[{key:'west-bay',short:'West Bay',label:'West Grand Traverse Bay, 4 km north of Clinch Park',measurement:m},{key:'east-bay',short:'East Bay',label:'East Grand Traverse Bay',measurement:{...m,tempF:64.9}}]};
   payload.water={kind:'satellite',tempF:64.4,observedAt:m.observedAt,label:'West Grand Traverse Bay, 4 km north of Clinch Park',cellKey:'west-bay',where:'Grand Traverse Bay',caveat:'NOAA satellite surface analysis for a pixel 4.2 km from Clinch Park beach, not a beach thermometer; sunlit shallows can run warmer.'};
   for(const a of activities)payload.assessments[a].water='Cold · 64.4°F at West Grand Traverse Bay, 4 km north of Clinch Park. In the 60s.';
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await gridPage.goto(base+'/lake-michigan-water-temperature/traverse-city/',{waitUntil:'load'});
  await gridPage.waitForFunction(()=>document.querySelector('#lead-temp')?.textContent==='64.4°F',{timeout:7000});
  assert.match(await gridPage.locator('#lead-temp-label').textContent(),/GRAND TRAVERSE BAY · NOAA SATELLITE SURFACE/);
  assert.match(await gridPage.locator('#lead-temp-caveat').textContent(),/not a beach thermometer/);
  assert.match(await gridPage.locator('#lead-grid-status').textContent(),/West Bay 64\.4°F · East Bay 64\.9°F/);
  await gridPage.getByRole('button',{name:'Paddling'}).click();
  assert.match(await gridPage.locator('#feel-water').textContent(),/64\.4°F at West Grand Traverse Bay/);
  await gridCtx.close();

  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({tested:new Date().toISOString(),cases:audit,upstreamUnavailable:'passed'},null,2));
  process.stdout.write('ShoreFeel browser QA passed '+audit.length+' viewports/pages + upstream failure case\n');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
