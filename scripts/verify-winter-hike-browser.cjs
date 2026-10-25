#!/usr/bin/env node
'use strict';
/**
 * Real Chromium/mobile smoke for noindex historical imagery research lab.
 * Local HTTP server only serves genuine checked-in static UI and invokes
 * the real route catalog handler; NASA and basemap image traffic is network.
 */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const handler=require('../api/winter-hike-lab.js');
const ROOT=path.resolve(__dirname,'../public');
const CONTENT={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
function api(req,res,query){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 const answer={setHeader:(k,v)=>{res.setHeader(k,v);return answer},
  status(n){res.statusCode=n;return answer},
  json(body){res.end(JSON.stringify(body));return answer}};
 return handler({method:req.method,query:Object.fromEntries(query)},answer);
}
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/api/carto-basemap-config'){
   res.setHeader('Content-Type','application/json');
   // Uncredentialed real CARTO basemap style if valid; don't expose Vercel key.
   res.end(JSON.stringify({provider:'unavailable'}));return;
  }
  if(u.pathname==='/api/winter-hike-lab'){
   await api(req,res,u.searchParams);return;
  }
  const target=u.pathname==='/'?'/winter-hike-snowshoe-lab/index.html':u.pathname;
  const file=path.resolve(ROOT,'.'+target);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
  const st=await fs.promises.stat(file).catch(()=>null);
  if(!st||!st.isFile()){res.writeHead(404);res.end('Not found');return}
  res.setHeader('Content-Type',CONTENT[path.extname(file)]||'application/octet-stream');
  res.end(await fs.promises.readFile(file));
 }catch(e){res.writeHead(500);res.end('Server error: '+e.message)}
});
const timeout=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const addr=server.address(),url='http://127.0.0.1:'+addr.port+'/winter-hike-snowshoe-lab/';
 let browser;
 const report=[];
 try{
  browser=await chromium.launch({headless:true,args:[
   '--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist',
   '--enable-unsafe-swiftshader','--disable-dev-shm-usage'
  ]});
  const sizes=[{w:390,h:844,deviceScaleFactor:2,isMobile:true,hasTouch:true},
   {w:768,h:1024,deviceScaleFactor:1,isMobile:true,hasTouch:true},
   {w:1365,h:900,deviceScaleFactor:1,isMobile:false,hasTouch:false}];
  const names=['phone-390','tablet-768','desktop-1365'];
  for(let i=0;i<sizes.length;i++){
   const device=sizes[i],context=await browser.newContext({...device,
    ignoreHTTPSErrors:false,serviceWorkers:'block'});
   const page=await context.newPage(),logs=[],tiles=[],exceptions=[];
   page.on('pageerror',e=>exceptions.push(e.message));
   page.on('console',m=>{if(m.type()==='error')logs.push(m.text().slice(0,260))});
   page.on('response',response=>{
    if(response.url().includes('gibs.earthdata.nasa.gov/wmts/')&&
       response.url().includes('MODIS_Terra_'))tiles.push({status:response.status(),url:response.url(),
         contentType:response.headers()['content-type']||''});
   });
   page.on('requestfailed',r=>{
    if(/gibs\.earthdata|cartocdn|openfreemap|maplibre/.test(r.url()))logs.push('FAILED '+r.url().slice(0,120)+' '+(r.failure()?.errorText||''));
   });
   // Test the actual checked-in client with a pinned local MapLibre vendor,
   // avoiding flaky CDN that is orthogonal to the satellite data itself.
   await page.route('https://unpkg.com/maplibre-gl@5.16.0/dist/maplibre-gl.js',async route=>{
    const bytes=fs.readFileSync(require.resolve('maplibre-gl/dist/maplibre-gl.js'));
    await route.fulfill({status:200,contentType:'application/javascript',body:bytes});
   });
   await page.route('https://unpkg.com/maplibre-gl@5.16.0/dist/maplibre-gl.css',async route=>{
    const bytes=fs.readFileSync(path.resolve('node_modules/maplibre-gl/dist/maplibre-gl.css'));
    await route.fulfill({status:200,contentType:'text/css',body:bytes});
   });
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.waitForFunction(()=>document.querySelectorAll('.route-card').length>=50,{timeout:12000});
   await page.locator('.route-card').first().click();
   await page.waitForSelector('#history-compare');
   await page.locator('#sat-date').fill('2025-02-15');
   await page.locator('#sat-date').dispatchEvent('change');
   await page.locator('#sat-mode').selectOption('trueColor');
   await page.locator('#sat-show').check();
   await page.waitForFunction(()=>document.getElementById('map-status').textContent.includes('map ·'),null,{timeout:18000}).catch(async e=>{
     const diagnostic=await page.evaluate(()=>({
      mapStatus:document.getElementById('map-status')?.textContent,
      typeofMaplibre:typeof window.maplibregl,
      satelliteStatus:document.getElementById('sat-status')?.textContent,
      routeCount:document.querySelectorAll('.route-card').length,
      mapHeight:document.querySelector('#map')?.clientHeight
     }));
     console.log('MOBILE MAP LOAD DIAGNOSTIC '+JSON.stringify({viewport:names[i],diagnostic,errors:exceptions,logs:logs.slice(0,12)}));
     throw e;
   });
   await page.waitForFunction(()=>{
    const map=window.WinterHikeSatelliteUI?.debugMap?.();
    return map && map.getSource('historic-modis') && map.getLayer('historic-modis');
   },{timeout:13000}).catch(()=>{});
   await timeout(2500);
   const first=await page.evaluate(()=>{
    const el=document.getElementById('map'),sat=document.getElementById('sat-status');
    return {status:document.getElementById('map-status').textContent,
      satStatus:sat.textContent,mapWidth:el.getBoundingClientRect().width,
      docWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
      layerToggle:document.getElementById('sat-show').checked,
      date:document.getElementById('sat-date').value,
      noindex:document.querySelector('meta[name="robots"]')?.getAttribute('content'),
      routes:document.querySelectorAll('.route-card').length,
      missingDirection:document.querySelectorAll('a[href*="google.com/maps/dir"]').length===0
    };
   });
   const img1=tiles.filter(x=>x.status===200&&x.contentType.startsWith('image/')&&x.url.includes('TrueColor'));
   await page.locator('#sat-mode').selectOption('snowCover');
   await timeout(2500);
   const img2=tiles.filter(x=>x.status===200&&x.contentType.startsWith('image/')&&x.url.includes('NDSI_Snow_Cover'));
   await page.locator('#sat-next').click();
   const next=await page.locator('#sat-date').inputValue();
   await page.locator('#sat-show').uncheck();
   const unchecked=await page.locator('#sat-show').isChecked();
   const screenshotDir=path.resolve('artifacts/winter-hike-browser');
   fs.mkdirSync(screenshotDir,{recursive:true});
   await page.screenshot({path:path.join(screenshotDir,names[i]+'.png'),fullPage:false});
   const passed=first.routes===50&&first.noindex.includes('noindex')&&
    first.viewport+4>=first.docWidth&&first.layerToggle&&first.missingDirection&&
    next==='2025-02-16'&&!unchecked&&
    img1.length>0&&img2.length>0&&exceptions.length===0;
   const row={viewport:names[i],passed,map:first,successfulRealNASA:{trueColor:img1.length,
    snow:img2.length},dateAfterNext:next,exceptions,logs:logs.slice(0,12)};
   report.push(row);
   console.log('BROWSER MOBILE MAP RESULT '+JSON.stringify(row));
   await context.close();
  }
  if(report.some(x=>!x.passed))throw Error('At least one real mobile/desktop map + historical satellite scene check failed');
  console.log('BROWSER HISTORICAL SATELLITE RELEASE GATE PASSED');
 }finally{
  await browser?.close();
  await new Promise(ok=>server.close(ok));
 }
}
run().catch(e=>{console.error('BROWSER HISTORICAL SATELLITE RELEASE GATE FAILED '+e.stack);process.exitCode=1});
