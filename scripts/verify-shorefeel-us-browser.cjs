#!/usr/bin/env node
'use strict';
// Browser acceptance of the source-controlled U.S. Great Lakes ShoreFeel atlas.
// Network responses below are fixtures, not claims about current observed weather.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.SHORE_PW_MODULE||'playwright');
const ROOT=path.resolve(__dirname,'../public'),OUT=path.resolve(process.env.SHORE_QA_OUTPUT||'artifacts/shorefeel-beach-qa');
fs.mkdirSync(OUT,{recursive:true});
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  let file=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));
  if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'text/plain; charset=utf-8'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
});
function fixture(slug,mode='valid'){
 const issuedAt=new Date(Date.now()-25*60000).toISOString();
 const at=new Date(Date.now()-10*60000).toISOString();
 return mode==='missing'?{status:'unavailable',beach:slug,reason:'A recent NWS land forecast could not be verified'}
  :{status:'forecast-based',beach:slug,source:'National Weather Service hourly area forecast',
    issuedAt,asOf:at,airF:82,feelsLikeF:82,method:'NWS forecast air',windMph:11,
    windFrom:'NE',heading:'A breeze on the open shore',
    guide:'Wind on the beach will be more noticeable than behind sheltered buildings.',
    scope:'Nearby land grid, not an on-sand thermometer'};
}
async function start(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/great-lakes-beaches/around-the-lakes/';
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const report=[];
  for(const width of [360,390,768,1280,1440]){
   const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
   await ctx.route('**/api/shorefeel-us?*',route=>{
    const u=new URL(route.request().url()),slug=u.searchParams.get('beach');
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(slug))});
   });
   await ctx.route('https://**/*',route=>route.abort());
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#report-temp')?.textContent==='82°F',{timeout:14000});
   assert.match(await page.locator('#report-name').innerText(),/Park Point Beach House/);
   assert.match(await page.locator('#report-safety').getAttribute('href'),/mnbeaches.org/);
   assert.equal(await page.locator('.shore-stop').count(),997,'16 curated guides plus 981 EPA shoreline entries');
   assert.equal(await page.locator('.shore-stop:visible').count(),48,'bounded first 48 of all U.S. entries');
   assert.match(await page.locator('#result-count').innerText(),/997 matching/);
   assert.equal(await page.locator('#shore-show-more').isVisible(),true);
   assert.equal(await page.locator('[data-lake-filter="All"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('.shore-region-tabs [aria-current="page"]').getAttribute('href'),'/great-lakes-beaches/around-the-lakes/');
   await page.locator('#shore-search').fill('Chicago');
   await page.locator('[data-select="north-avenue-beach"]').click();
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='North Avenue Beach');
   assert.ok(await page.locator('.shore-stop:visible').count()>=1,'Chicago results from source inventory');
   assert.match(await page.locator('#result-count').innerText(),/matching/);
   await page.locator('#shore-search').fill('no-such-shore-999');
   assert.equal(await page.locator('.shore-stop:visible').count(),0);
   assert.equal(await page.locator('#shore-no-match').isVisible(),true);
   assert.equal(await page.locator('#field-report').isVisible(),false,'no stale answer on no-match');
   await page.locator('#shore-search').fill('');
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Park Point Beach House');
   assert.equal(await page.locator('.shore-stop:visible').count(),48,'clearing search restores bounded list');
   assert.equal(await page.locator('#shore-show-more').isVisible(),true);
   await page.locator('#shore-show-more').click();
   assert.equal(await page.locator('.shore-stop:visible').count(),96,'show-more adds 48 results');
   await page.getByRole('button',{name:'Lake Ontario',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Hamlin Beach State Park'&&document.querySelector('#report-temp')?.textContent==='82°F');
   assert.match(await page.locator('#report-safety').getAttribute('href'),/beachadvisory.health.ny.gov/);
   await page.locator('[data-select="fair-haven-beach-state-park"]').click();
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Fair Haven Beach State Park'&&document.querySelector('#report-temp')?.textContent==='82°F');
   assert.equal(await page.locator('[data-select="fair-haven-beach-state-park"]').getAttribute('aria-pressed'),'true');
   assert.match(page.url(),/beach=fair-haven-beach-state-park/);
   await page.getByRole('button',{name:'Lake Huron',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#report-temp')?.textContent==='82°F');
   assert.match(await page.locator('#report-safety').getAttribute('href'),/mienviro.michigan.gov/);
   assert.match(await page.locator('#result-count').innerText(),/matching/);
   assert.ok(await page.locator('.shore-stop:visible').count()>0,'actual EPA Lake Huron entries from Michigan');
   await page.locator('#shore-search').fill('MI000290');
   await page.waitForFunction(()=>document.querySelector('#result-count')?.textContent?.startsWith('1 matching'));
   await page.locator('[data-select="epa-mi000290"]').click();
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Bay City State Recreation Area');
   assert.match(page.url(),/beach=epa-mi000290/);
   assert.match(await page.locator('#report-park').getAttribute('href'),/beacon.epa.gov/);
   assert.equal(await page.locator('#report-detail').getAttribute('href'),'/great-lakes-beaches/around-the-lakes/?beach=epa-mi000290');
   await page.getByRole('button',{name:'Lake Superior',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Park Point Beach House'&&document.querySelector('#report-temp')?.textContent==='82°F');
   await page.locator('[data-select="big-bay-state-park"]').click();
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Big Bay State Park');
   assert.match(await page.locator('#report-alert').innerText(),/2027|construction/i);
   assert.match(await page.locator('#report-safety').getAttribute('href'),/dnr.wi.gov\/beachhealth/);
   await page.waitForFunction(()=>document.querySelector('#map-tile-note')?.hidden===false,{timeout:14000});
   const metrics=await page.evaluate(()=>{
     const temp=document.querySelector('#report-temp');
     const item=document.querySelector('.shore-stop-name');
     return {clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
       itemFont:parseFloat(getComputedStyle(item).fontSize),
       temp:temp.textContent,mapCollapsed:document.querySelector('#shore-map').hidden};
   });
   assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,'horizontal scroll at '+width+' '+JSON.stringify(metrics));
   assert.ok(metrics.itemFont>=14,'readability at '+width);
   assert.equal(metrics.mapCollapsed,false,'failed tiles must not remove the beach map');
   assert.ok(await page.locator('#shore-map .shore-marker, #shore-map .shore-cluster').count()>0,'beaches survive blocked background tiles');
   assert.deepEqual(errors,[],'JS errors at '+width);
   await page.screenshot({path:path.join(OUT,'shorefeel-us-'+width+'.png'),fullPage:true});
   report.push({width,...metrics});
   await ctx.close();
  }

  // Working-map acceptance: use deterministic tiles to exercise the actual
  // Leaflet map and real two-finger touch input, not merely the error fallback.
  const mapCtx=await browser.newContext({viewport:{width:390,height:850},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const tile=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pQAAAABJRU5ErkJggg==','base64');
  await mapCtx.route('https://**/*',route=>route.abort());
  await mapCtx.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:tile}));
  await mapCtx.route('**/api/shorefeel-us?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(new URL(route.request().url()).searchParams.get('beach')))}));
  await mapCtx.route('**/assets/shorefeel-us.js*',route=>{
   const source=fs.readFileSync(path.join(ROOT,'assets/shorefeel-us.js'),'utf8');
   assert.ok(source.includes('map=window.L.map('));
   return route.fulfill({status:200,contentType:'application/javascript',body:source.replace('map=window.L.map(','map=window.__shoreTestMap=window.L.map(')});
  });
  const mapPage=await mapCtx.newPage(),mapErrors=[];
  mapPage.on('pageerror',e=>mapErrors.push(String(e)));
  await mapPage.goto(url,{waitUntil:'domcontentloaded'});
  await mapPage.waitForFunction(()=>!!document.querySelector('#shore-map .leaflet-tile-loaded'));
  const surface=mapPage.locator('#shore-map');
  await surface.scrollIntoViewIfNeeded();
  assert.ok(await mapPage.locator('#shore-map .shore-cluster').count()>0,'overview contains beach groups');
  assert.equal(await mapPage.locator('#shore-map .leaflet-popup').count(),0,'no auto popup blocking gesture');
  assert.equal(await surface.evaluate(el=>getComputedStyle(el).touchAction),'none');
  assert.equal(await surface.evaluate(el=>getComputedStyle(el.closest('.map-shell')).touchAction),'none');
  assert.equal(await surface.evaluate(el=>el.classList.contains('leaflet-touch-zoom')&&el.classList.contains('leaflet-touch-drag')),true);
  const zoom=()=>mapPage.evaluate(()=>window.__shoreTestMap.getZoom());
  const initialZoom=await zoom();
  const plus=surface.locator('.leaflet-control-zoom-in');
  assert.ok(await plus.evaluate(el=>el.getBoundingClientRect().width>=44));
  await plus.click();
  await mapPage.waitForFunction(z=>window.__shoreTestMap.getZoom()>z,initialZoom);
  await mapPage.reload({waitUntil:'domcontentloaded'});
  await mapPage.waitForFunction(()=>!!document.querySelector('#shore-map .leaflet-tile-loaded'));
  await surface.scrollIntoViewIfNeeded();
  await mapPage.waitForTimeout(400);
  const box=await surface.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
  const before=await zoom(),scale=await mapPage.evaluate(()=>visualViewport.scale);
  const cdp=await mapCtx.newCDPSession(mapPage);
  const finger=(id,x,y)=>({id,x,y,force:1});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,cx-24,cy)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,cx-24,cy),finger(2,cx+24,cy)]});
  for(let i=1;i<=12;i++){
   const spread=24+i*7;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(1,cx-spread,cy),finger(2,cx+spread,cy)]});
   await mapPage.waitForTimeout(24);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mapPage.waitForFunction(z=>window.__shoreTestMap.getZoom()>z,before,{timeout:10000});
  assert.ok(Math.abs(await mapPage.evaluate(()=>visualViewport.scale)-scale)<0.02,'pinch zooms map, not page');
  // Search a source-listed beach not in the original 16, then use the actual
  // map pin to select its forecast. The search must not be reset.
  await mapPage.locator('#shore-search').fill('MI000290');
  await mapPage.waitForFunction(()=>document.querySelector('#result-count')?.textContent.startsWith('1 matching'));
  const pin=surface.locator('.leaflet-marker-icon[title="Bay City State Recreation Area"]');
  await pin.click();
  await mapPage.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Bay City State Recreation Area');
  assert.equal(await mapPage.locator('#shore-search').inputValue(),'MI000290');
  assert.ok(await surface.locator('.leaflet-popup').isVisible(),'beach pin opens its popup without rebuilding map');
  assert.equal(await mapPage.locator('#map-tile-note').isVisible(),false);
  assert.deepEqual(mapErrors,[]);
  await surface.screenshot({path:path.join(OUT,'shorefeel-us-working-map-390.png')});
  await mapCtx.close();
  const ctx=await browser.newContext({viewport:{width:390,height:850}});
  await ctx.route('**/api/shorefeel-us?*',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify(fixture(new URL(route.request().url()).searchParams.get('beach'),'missing'))}));
  await ctx.route('https://**/*',route=>route.abort());
  const page=await ctx.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#report-temp')?.textContent==='No recent forecast');
  assert.match(await page.locator('#report-scope').innerText(),/No temperature is being inferred/);
  await page.screenshot({path:path.join(OUT,'shorefeel-us-source-missing.png'),fullPage:true});
  await ctx.close();
  const noJs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
  const plain=await noJs.newPage();
  await plain.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(await plain.locator('.shore-stop').count(),16,'no-JS preserves 16 original park links');
  assert.match(await plain.locator('noscript').innerText(),/EPA BEACON/);
  assert.equal(await plain.locator('noscript').isVisible(),true);
  assert.equal(await plain.locator('.shore-stop a[href^="https://"]').count(),16);
  await noJs.close();
  console.log(JSON.stringify({passed:true,report,noJs:'16 official source links remain available',
    missing:'No fabricated temperature',map:'Beach markers survive blocked tiles; working map interaction and mobile pinch tested with fixture tiles'},null,2));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
start().catch(e=>{console.error(e);process.exitCode=1;});
