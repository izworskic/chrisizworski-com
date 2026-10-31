#!/usr/bin/env node
'use strict';
/**
 * Experience OS V1: source-backed Gooseberry Falls visitor browser QA.
 * Uses deterministic local fixtures for CARTO/OSM tiles and vicinity NWS.
 * It does not turn fixture weather or map pins into official park observations.
 */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const pub=path.join(root,'public');
const out=path.join(root,'artifacts','gooseberry-browser');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const htmlDir='/gooseberry-falls/';
const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://127.0.0.1').pathname;
  if(p==='/api/gooseberry-conditions'){
    res.writeHead(200,{'Content-Type':'application/json'});
    return res.end(JSON.stringify({scope:'regional-weather-only',parkAccess:'UNVERIFIED',checkedAt:new Date().toISOString(),
      weather:{state:'unavailable',periods:[]},alerts:{state:'reported',items:[]}}));
  }
  if(p==='/api/carto-basemap-config'){
    res.writeHead(200,{'Content-Type':'application/json'});
    return res.end(JSON.stringify({provider:'CARTO',key:'public-test-only-key'}));
  }
  let file=null;
  if(p===htmlDir||p==='/gooseberry-falls/index.html')file=path.join(pub,'gooseberry-falls','index.html');
  else if(p.startsWith('/assets/'))file=path.join(pub,p);
  if(!file||!file.startsWith(pub)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    res.writeHead(404);return res.end('Not found');
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
const ok=(condition,msg)=>{if(!condition)throw Error(msg);};
const tile=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4evcqAATiAnhnXAhlAAAAAElFTkSuQmCC','base64');
const scans=[],errors=[];
let browser;
async function scenario({name,width,height}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',deviceScaleFactor:1});
 const page=await context.newPage(),pageerrors=[];
 page.on('pageerror',err=>pageerrors.push(err.message));
 let mapTileRequests=0;
 await page.route(/\/rastertiles\/voyager\//,route=>{
   mapTileRequests++;
   ok(new URL(route.request().url()).searchParams.get('key')==='public-test-only-key','CARTO public-key contract broken');
   return route.fulfill({status:200,contentType:'image/png',body:tile});
 });
 await page.route(/tile\.openstreetmap\.org/,route=>{mapTileRequests++;return route.fulfill({status:200,contentType:'image/png',body:tile});});
 const response=await page.goto('http://127.0.0.1:'+server.address().port+htmlDir,{waitUntil:'domcontentloaded',timeout:25000});
 ok(response?.status()===200,name+' local page not found');
 await page.waitForFunction(()=>document.getElementById('answer-name')?.textContent.includes('Upper'),{timeout:15000});
 ok((await page.locator('#answer-name').innerText()).includes('Upper'),name+' default 60-minute recommendation incorrect');
 const isMobile=width<=390;
 const dimensions=await page.evaluate(()=>({
   doc:document.documentElement.scrollWidth,window:innerWidth,
   heroBottom:document.querySelector('h1').getBoundingClientRect().bottom,
   answerText:getComputedStyle(document.getElementById('answer-name')).fontSize,
   imageCount:document.querySelectorAll('.experience-photo img').length
 }));
 ok(dimensions.doc<=dimensions.window+2,name+' horizontal overflow '+JSON.stringify(dimensions));
 ok(dimensions.imageCount===4,name+' must render four credited images');
 if(isMobile)ok(dimensions.heroBottom<680,name+' oversized hero hides primary visitor task');
 await page.locator('#visit-time').selectOption('90');
 ok((await page.locator('#answer-name').innerText()).includes('Three-falls'),name+' 90 minute change had no effect');
 await page.locator('#visit-mobility').selectOption('stepfree');
 ok((await page.locator('#answer-name').innerText()).includes('Upper'),name+' mobility priority violated');
 await page.locator('#visit-season').selectOption('snow-covered');
 ok((await page.locator('#answer-name').innerText()).includes('Winter'),name+' winter route did not change');
 ok((await page.locator('#answer-warning').innerText()).includes('River ice'),name+' ice warning missing');
 await page.locator('#visit-season').selectOption('snow-free');
 await page.locator('#visit-mobility').selectOption('standard');
 await page.locator('#visit-time').selectOption('150');
 await page.locator('#visit-interest').selectOption('long-hike');
 ok((await page.locator('#answer-name').innerText()).includes('Fifth'),name+' woodland intent did not choose Fifth Falls');
 await page.locator('#visit-interest').selectOption('shoreline');
 ok((await page.locator('#answer-name').innerText()).includes('Picnic Flow'),name+' shoreline intent did not choose shore');
 ok((await page.locator('#answer-permit').innerText()).includes('permit is required'),name+' shoreline vehicle-permit rule missing');
 ok((await page.locator('#answer-warning').innerText()).includes('not been automatically verified'),name+' access unknown caveat missing');
 const state=await page.evaluate(()=>new URL(location.href).searchParams.get('interest'));
 ok(state==='shoreline',name+' shareable state not reflected in URL');
 await page.waitForFunction(()=>document.querySelector('#map-status')?.textContent.includes('tile loaded'),{timeout:17000});
 ok(mapTileRequests>=1,name+' no map tiles requested');
 ok(await page.locator('#gb-map .leaflet-tile-loaded').count()>=1,name+' blank basemap');
 ok(await page.locator('#gb-map .leaflet-control-attribution').count()===1,name+' no map attribution');
 ok(await page.locator('#gb-map .leaflet-interactive').count()>=3,name+' orientation markers missing');
 await page.locator('[data-place="beach"]').click();
 ok((await page.locator('.map-guide h3').innerText()).includes('Agate Beach'),name+' list->map selection failed');
 ok(pageerrors.length===0,name+' JS runtime errors: '+pageerrors.join('; '));
 const photos=page.locator('.experience-photo img');
 for(let i=0;i<await photos.count();i++){
   await photos.nth(i).scrollIntoViewIfNeeded();
   await page.waitForFunction(index=>{
     const photo=document.querySelectorAll('.experience-photo img')[index];
     return photo?.complete&&photo?.naturalWidth>=300;
   },i,{timeout:18000});
 }
 ok((await page.locator('.experience-photo figcaption a').count())===4,name+' photograph credit links missing');
 await page.screenshot({path:path.join(out,name+'.png'),fullPage:true,animations:'disabled'});
 scans.push({name,width,height,mapTileRequests,dimensions,jsErrors:pageerrors});
 await context.close();
}
async function noJavascript(){
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:'+server.address().port+htmlDir,{waitUntil:'domcontentloaded'});
 ok((await page.locator('#answer-name').innerText()).includes('Upper'),'no-JS source-backed default answer missing');
 ok(await page.locator('#answer-source').getAttribute('href'),'no-JS official source link missing');
 ok(await page.locator('#answer-map').getAttribute('href'),'no-JS park map link missing');
 await page.screenshot({path:path.join(out,'no-js-phone.png'),fullPage:false});
 await context.close();
}
async function unavailableMap(){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.route(/basemaps\.cartocdn\.com|tile\.openstreetmap\.org/,route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+htmlDir,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.map-wrap')?.dataset.failed==='true',{timeout:19000});
 ok(await page.locator('#gb-map').isHidden(),'failed map still reserves empty map panel');
 ok((await page.locator('#map-status').innerText()).includes('official DNR'),'fallback lost official park map');
 await page.screenshot({path:path.join(out,'no-map-phone.png'),fullPage:false});
 await context.close();
}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const v of [{name:'phone-360',width:360,height:800},{name:'phone-390',width:390,height:844},
                   {name:'tablet-768',width:768,height:1024},{name:'desktop-1440',width:1440,height:900}])await scenario(v);
  await noJavascript();
  await unavailableMap();
 }catch(e){errors.push(e.stack||String(e));throw e;}
 finally{
  const report={checkedAt:new Date().toISOString(),scenarios:scans,errors,
    note:'Local page+fixed NWS/CARTO fixtures; this cannot establish current official park access or production image loading.'};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();server.close();
 }
}
main().then(()=>process.stdout.write('Gooseberry Chromium QA passed: responsive choices, map tiles, no-JS and blocked-map fallback.\n'))
  .catch(e=>{console.error(e.stack||e);process.exitCode=1;});
