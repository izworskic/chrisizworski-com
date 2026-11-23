#!/usr/bin/env node
'use strict';
// Controlled browser fixtures are not live ECCC data or beach measurements.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.SHORE_PW_MODULE||'playwright');
const ROOT=path.resolve(__dirname,'../public'),OUT=path.resolve(process.env.SHORE_QA_OUTPUT||'artifacts/shorefeel-canada-qa');
fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{let url=new URL(req.url,'http://127.0.0.1'),file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
 if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'text/plain'});fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
});
function fixture(slug,missing=false){
 const ts=new Date(Date.now()-10*60000).toISOString();
 return missing?{status:'unavailable',beach:slug,reason:'No sufficiently local ECCC city forecast is available.'}:
 {status:'forecast-based',beach:slug,temperatureC:5,temperatureF:41,apparentC:2,
  method:'Calculated Canadian wind chill from ECCC forecast',windKmh:21,windDirection:'NW',
  validAt:ts,forecastIssueAt:ts,forecastPlace:'Nearby ECCC town',forecastDistanceKm:20,
  heading:'The breeze across the shoreline',note:'A cooler breeze near the water.',
  isUpcoming:false,scope:'City forecast not an on-sand measurement'};
}
async function main(){
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const output=[];
 for(const width of [360,390,768,1280,1440]){
  const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
  await ctx.route('**/api/shorefeel-ca?*',route=>{
   const slug=new URL(route.request().url()).searchParams.get('beach');
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(slug))});
  });
  await ctx.route('https://**/*',route=>route.abort());
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto(origin+'/great-lakes-beaches/canada/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#report-temp')?.textContent==='2°C',{timeout:14000});
  assert.equal(await page.locator('.shore-stop').count(),30);
  assert.equal(await page.locator('.shore-stop:visible').count(),30,'all lakes visible on arrival');
  assert.equal(await page.locator('[data-lake-filter="All"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.shore-region-tabs [aria-current="page"]').getAttribute('href'),'/great-lakes-beaches/canada/');
  await page.locator('#shore-search').fill('Sandbanks');
  await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent?.includes('Sandbanks'));
  assert.equal(await page.locator('.shore-stop:visible').count(),1);
  await page.locator('#shore-search').fill('no-such-shore-999');
  assert.equal(await page.locator('.shore-stop:visible').count(),0);
  assert.equal(await page.locator('#shore-no-match').isVisible(),true);
  assert.equal(await page.locator('#field-report').isVisible(),false,'stale beach answer is hidden');
  await page.locator('#shore-search').fill('');
  await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent?.includes('Agawa Bay'));
  assert.equal(await page.locator('.shore-stop:visible').count(),30);
  assert.match(await page.locator('#report-name').innerText(),/Agawa Bay/);
  await page.waitForFunction(()=>document.querySelector('#report-scope')?.textContent?.includes('20 km'),{timeout:14000});
  assert.match(await page.locator('#report-scope').innerText(),/20 km/);
  assert.match(await page.locator('#report-advisory').getAttribute('href'),/ontarioparks.ca\/beachresults/);
  await page.locator('[data-select="batchawana-bay"]').click();
  await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent?.includes('Batchawana Bay'));
  await page.getByRole('button',{name:'Erie',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent?.includes('Port Burwell')&&document.querySelector('#report-temp')?.textContent==='2°C');
  await page.locator('[data-select="bay-beach-crystal"]').click();
  await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent?.includes('Crystal Beach'));
  assert.match(await page.locator('#report-advisory').getAttribute('href'),/niagararegion.ca/);
  await page.getByRole('button',{name:'Huron',exact:true}).click();
  await page.locator('[data-select="killbear-georgian-bay"]').click();
  await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent?.includes('Killbear'));
  await page.getByRole('button',{name:'Ontario',exact:true}).click();
  await page.locator('[data-select="toronto-woodbine"]').click();
  await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent?.includes('Woodbine'));
  assert.match(await page.locator('#report-advisory').getAttribute('href'),/toronto.ca/);
  await page.locator('[data-select="toronto-bluffers-beach"]').click();
  await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent?.includes('Bluffer'));
  await page.getByRole('button',{name:'Michigan',exact:true}).click();
  assert.equal(await page.locator('#report-temp').innerText(),'Explore the U.S.');
  assert.match(await page.locator('#report-park').getAttribute('href'),/around-the-lakes/);
  await page.getByRole('button',{name:'Superior',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#report-temp')?.textContent==='2°C');
  await page.waitForFunction(()=>document.querySelector('#map-fallback')?.hidden===false,{timeout:14000});
  const metrics=await page.evaluate(()=>({
   view:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
   font:parseFloat(getComputedStyle(document.querySelector('.shore-stop-name')).fontSize),
   mapHidden:document.querySelector('#shore-map').hidden
  }));
  assert.ok(metrics.scroll<=metrics.view+2,'Horizontal overflow '+width);
  assert.ok(metrics.font>=14,'Small type '+width);
  assert.ok(metrics.mapHidden,'Tile fallback must collapse a blank map');
  assert.deepEqual(errors,[],'Browser runtime errors');
  await page.screenshot({path:path.join(OUT,'canada-'+width+'.png'),fullPage:true});
  output.push({width,...metrics});
  await ctx.close();
 }
 // Unlike the blocked-tile fallback scenarios above, this exercises a working
 // map with deterministic tile responses, including the actual Leaflet controls.
 // No network calls to OpenStreetMap are made by this fixture.
 const zoomCtx=await browser.newContext({
  viewport:{width:390,height:850},isMobile:true,hasTouch:true,reducedMotion:'reduce'
 });
 const tile=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pQAAAABJRU5ErkJggg==','base64');
 await zoomCtx.route('https://**/*',route=>route.abort());
 await zoomCtx.route('https://tile.openstreetmap.org/**',route=>route.fulfill({
  status:200,contentType:'image/png',body:tile
 }));
 await zoomCtx.route('**/api/shorefeel-ca?*',route=>{
  const slug=new URL(route.request().url()).searchParams.get('beach');
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(slug))});
 });
 const zoomPage=await zoomCtx.newPage();
 await zoomPage.goto(origin+'/great-lakes-beaches/canada/',{waitUntil:'domcontentloaded'});
 await zoomPage.waitForFunction(()=>document.querySelector('#report-temp')?.textContent==='2°C');
 await zoomPage.waitForFunction(()=>document.querySelector('#shore-map .leaflet-tile-loaded')!==null,{timeout:14000});
 assert.equal(await zoomPage.locator('#map-fallback').isVisible(),false,'working tile layer must remain available');
 const mapSurface=zoomPage.locator('#shore-map');
 assert.equal(await mapSurface.evaluate(el=>el.classList.contains('leaflet-touch-zoom')),true,
  'mobile map must register Leaflet two-finger touch zoom');
 const zoomIn=zoomPage.locator('#shore-map .leaflet-control-zoom-in');
 const zoomOut=zoomPage.locator('#shore-map .leaflet-control-zoom-out');
 assert.ok(await zoomIn.isVisible(),'visible zoom-in control');
 assert.ok(await zoomOut.isVisible(),'visible zoom-out control');
 const touchSettings=await mapSurface.evaluate(el=>({
  touchAction:getComputedStyle(el).touchAction,
  pinch:el.classList.contains('leaflet-touch-zoom'),
  drag:el.classList.contains('leaflet-touch-drag')
 }));
 assert.equal(touchSettings.pinch,true,'Leaflet pinch handler active');
 assert.equal(touchSettings.drag,true,'Leaflet drag handler active');
 assert.equal(touchSettings.touchAction,'none','Prevent native touch cancellation');
 const readTileZoom=()=>zoomPage.evaluate(()=>{
  const imgs=[...document.querySelectorAll('#shore-map img.leaflet-tile-loaded')];
  return Math.max(-1,...imgs.map(img=>{
   const m=new URL(img.src).pathname.match(/^\/(\d+)\//);
   return m?Number(m[1]):-1;
  }));
 });
 const before=await readTileZoom();
 assert.ok(before>=0,'real map tile was loaded before zoom test');
 await zoomIn.click();
 await zoomPage.waitForFunction(before=>{
  const imgs=[...document.querySelectorAll('#shore-map img.leaflet-tile-loaded')];
  return imgs.some(img=>{
   const m=new URL(img.src).pathname.match(/^\/(\d+)\//);
   return m&&Number(m[1])>before;
  });
 },before,{timeout:10000});
 await zoomOut.click();
 await zoomPage.waitForFunction(before=>{
  const imgs=[...document.querySelectorAll('#shore-map img.leaflet-tile-loaded')];
  return imgs.some(img=>{
   const m=new URL(img.src).pathname.match(/^\/(\d+)\//);
   return m&&Number(m[1])===before;
  });
 },before,{timeout:10000});
 // Prove pinch-zoom using two real touchscreen contacts, not map controls.
 await mapSurface.scrollIntoViewIfNeeded();
 const rect=await mapSurface.boundingBox();
 assert.ok(rect&&rect.width>150&&rect.height>150,'Visible map gesture surface');
 const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
 const zoomBeforePinch=await readTileZoom();
 const cdp=await zoomCtx.newCDPSession(zoomPage);
 const finger=(id,x,y)=>({id,x,y,force:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[
  finger(1,cx-24,cy),finger(2,cx+24,cy)
 ]});
 for(let step=1;step<=12;step++){
  const spread=24+step*7;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
   finger(1,cx-spread,cy),finger(2,cx+spread,cy)
  ]});
  await zoomPage.waitForTimeout(24);
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await zoomPage.waitForFunction(before=>{
  const imgs=[...document.querySelectorAll('#shore-map img.leaflet-tile-loaded')];
  return imgs.some(img=>{
   const z=Number(new URL(img.src).pathname.split('/')[1]);
   return Number.isFinite(z)&&z>before;
  });
 },zoomBeforePinch,{timeout:10000});
 assert.equal(await zoomPage.locator('#map-fallback').isVisible(),false);
 await zoomPage.screenshot({path:path.join(OUT,'canada-mobile-working-map-zoom-390.png')});
 await zoomCtx.close();
 const ctx=await browser.newContext({viewport:{width:390,height:850}});
 await ctx.route('**/api/shorefeel-ca?*',route=>route.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify(fixture(new URL(route.request().url()).searchParams.get('beach'),true))}));
 await ctx.route('https://**/*',route=>route.abort());
 const page=await ctx.newPage();
 await page.goto(origin+'/great-lakes-beaches/canada/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#report-temp')?.textContent==='Forecast unavailable');
 assert.match(await page.locator('#report-scope').innerText(),/No nearest-town air value/);
 await ctx.close();
 const noJs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
 const plain=await noJs.newPage();await plain.goto(origin+'/great-lakes-beaches/canada/',{waitUntil:'domcontentloaded'});
 assert.equal(await plain.locator('.shore-stop').count(),30);
 assert.equal(await plain.locator('noscript').isVisible(),true);
 assert.equal(await plain.locator('.shore-stop .shore-stop-links > a[href^="https://"]').count(),30);
  assert.equal(await plain.locator('.shore-stop .shore-stop-links > a[href^="/great-lakes-beaches/canada/"]').count(),30);
 await noJs.close();
 console.log(JSON.stringify({passed:true,screenSizes:output,staleData:'No fabricated temperature',noJs:'30 park links available'},null,2));
 }finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
