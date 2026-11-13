#!/usr/bin/env node
'use strict';
/* Real Chrome mobile+desktop: successful DNR route download to GPX, copy,
 * invalidation on edit, closure block, unavailable API, no Leaflet reliance.
 * Every network route response is an explicit fixture, never a fabricated
 * production-source claim. Standard Playwright download event verifies blob.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'};
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://127.0.0.1').pathname;
 const file=path.resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
});
const route={
 routable:true,stopCount:2,distanceMiles:1.6,estimatedMinutes:7,assumedAvgMph:14,
 segmentsTraversed:1,segments:[{segmentId:'LP7-01',trailNetwork:'LP 7',band:'UNKNOWN',score:null,miles:1.6}],
 worstSegmentOnRoute:null,trailsVia:['LP 7'],closedSegmentsExcludedFromRegion:1,
 geometry:{type:'LineString',coordinates:[[-84.772,44.662],[-84.766,44.665],[-84.760,44.669]]},
 truth:'Distance follows mapped DNR trail centerline only.'
};
const fixture={region:'grayling-gaylord',route,closureVerification:false,generatedAt:'2026-11-13T20:00:00.000Z',season:{active:false}};
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [label,width,height] of [['phone390',390,844],['desktop1440',1440,900]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://unpkg.com/**',r=>r.fulfill({status:200,body:'',contentType:'text/javascript'}));
   await page.route('https://pagead2.googlesyndication.com/**',r=>r.abort());
   await page.route('https://www.googletagmanager.com/**',r=>r.abort());
   await page.route('**/api/snowmobile?**',r=>r.fulfill({status:503,body:'{"error":"fixture"}',contentType:'application/json'}));
   await page.route('**/api/snowmobile-route?**',r=>r.fulfill({status:200,body:JSON.stringify(fixture),contentType:'application/json'}));
   const response=await page.goto('http://127.0.0.1:'+server.address().port+'/snowmobile/regions/grayling-gaylord.html',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200,label);
   await page.waitForFunction(()=>!!window.SnowmobileRouteExport&&document.querySelector('#status')?.textContent==='DATA UNAVAILABLE',{timeout:12000});
   await page.evaluate(()=>{
    DATA={key:'grayling-gaylord',season:{active:false},closures:{verified:false},routeJunctions:{features:[]}};
    MAP=null;ROUTE_MODE=true;
    ROUTE_POINTS=[
     {lat:44.662,lng:-84.772,label:'LP 7 first junction',junctionId:'n0',component:0},
     {lat:44.669,lng:-84.760,label:'LP 7 next junction',junctionId:'n1',component:0}
    ];
   });
   await page.evaluate(()=>computeRoute());
   assert.equal(await page.locator('#downloadRouteGpx').isVisible(),true,label);
   assert.equal(await page.locator('#copyRouteSummary').isVisible(),true,label);
   assert.match(await page.locator('#routeResult').innerText(),/Off-season/);
   assert.match(await page.locator('.route-export-warning').innerText(),/permission to cross a road/i);
   const downloadPromise=page.waitForEvent('download',{timeout:12000});
   await page.locator('#downloadRouteGpx').click();
   const download=await downloadPromise;
   assert.equal(download.suggestedFilename(),'michigan-snowmobile-grayling-gaylord-2026-11-13.gpx');
   const xml=fs.readFileSync(await download.path(),'utf8');
   assert.equal((xml.match(/<trkpt /g)||[]).length,3);
   assert.equal((xml.match(/<wpt /g)||[]).length,2);
   assert.ok(/current official DNR closure source was NOT verified/i.test(xml));
   assert.ok(xml.includes('NOT a parking location or confirmed physical entrance'));
   assert.match(await page.locator('#routeExportStatus').innerText(),/download requested/i);
   await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__rideCopy=text;}}}));
   await page.locator('#copyRouteSummary').click();
   await page.waitForFunction(()=>typeof window.__rideCopy==='string',{timeout:7000});
   assert.match(await page.evaluate(()=>window.__rideCopy),/mapped DNR trail centerlines/);
   const bounds=await page.locator('.route-export-panel').boundingBox();
   assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=width+4,label+' GPX panel overflows viewport');
   await page.evaluate(()=>editRoute());
   assert.equal(await page.locator('#downloadRouteGpx').count(),0,'edited route must not offer stale GPX');
   assert.equal(await page.evaluate(()=>LAST_ROUTE_EXPORT),null,'no stale export context');
   await page.evaluate(()=>{ROUTE_MODE=true;});
   await page.unroute('**/api/snowmobile-route?**');
   await page.route('**/api/snowmobile-route?**',r=>r.fulfill({status:200,body:JSON.stringify({...fixture,route:{...route,segments:[{band:'CLOSED'}]}}),contentType:'application/json'}));
   await page.evaluate(()=>computeRoute());
   assert.equal(await page.locator('#downloadRouteGpx').count(),0,'closed segment route cannot be downloaded');
   await page.unroute('**/api/snowmobile-route?**');
   await page.route('**/api/snowmobile-route?**',r=>r.fulfill({status:503,body:'{"error":"DNR source unavailable"}',contentType:'application/json'}));
   await page.evaluate(()=>{ROUTE_MODE=true;});
   await page.evaluate(()=>computeRoute());
   assert.equal(await page.locator('#downloadRouteGpx').count(),0,'failed route request cannot reuse old GPX');
   assert.ok(!errors.some(s=>/SyntaxError|TypeError|ReferenceError/.test(s)),label+' browser JS errors: '+errors.join(' | '));
   console.log('PASS '+label+' GPX file, copy, caution text, viewport, edit/closure/offline fail-closed');
   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
