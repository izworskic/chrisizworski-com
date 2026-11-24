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
   await ctx.route('**/assets/great-lakes-beach-registry.json',route=>route.abort());
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
   await page.waitForFunction(()=>document.querySelector('#map-fallback')?.hidden===false,{timeout:14000});
   const metrics=await page.evaluate(()=>{
     const temp=document.querySelector('#report-temp');
     const item=document.querySelector('.shore-stop-name');
     return {clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
       itemFont:parseFloat(getComputedStyle(item).fontSize),
       temp:temp.textContent,mapCollapsed:document.querySelector('#shore-map').hidden};
   });
   assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,'horizontal scroll at '+width+' '+JSON.stringify(metrics));
   assert.ok(metrics.itemFont>=14,'readability at '+width);
   assert.ok(metrics.mapCollapsed,'failed map must collapse, not remain blank');
   assert.deepEqual(errors,[],'JS errors at '+width);
   await page.screenshot({path:path.join(OUT,'shorefeel-us-'+width+'.png'),fullPage:true});
   report.push({width,...metrics});
   await ctx.close();
  }
  const ctx=await browser.newContext({viewport:{width:390,height:850}});
  await ctx.route('**/api/shorefeel-us?*',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify(fixture(new URL(route.request().url()).searchParams.get('beach'),'missing'))}));
  await ctx.route('**/assets/great-lakes-beach-registry.json',route=>route.abort());
  await ctx.route('https://**/*',route=>route.abort());
  const page=await ctx.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#report-temp')?.textContent==='No recent forecast');
  assert.match(await page.locator('#report-scope').innerText(),/No temperature is being inferred/);
  await page.screenshot({path:path.join(OUT,'shorefeel-us-source-missing.png'),fullPage:true});
  await ctx.close();

  // Primary cross-border experience: deterministic tiles and provider fixtures,
  // not live provider evidence. Preserve all prior fallback tests above.
  const mapCtx=await browser.newContext({viewport:{width:390,height:850},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const tile=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pQAAAABJRU5ErkJggg==','base64');
  await mapCtx.route('https://**/*',r=>r.abort());
  await mapCtx.route('https://tile.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'image/png',body:tile}));
  await mapCtx.route('**/assets/shorefeel-cross-border-map.js*',r=>{
   const source=fs.readFileSync(path.join(ROOT,'assets/shorefeel-cross-border-map.js'),'utf8');
   assert.ok(source.includes('map=window.L.map(surface,'));
   return r.fulfill({status:200,contentType:'application/javascript',body:source.replace('map=window.L.map(surface,','map=window.__shoreMap=window.L.map(surface,')});
  });
  const requests=[];
  await mapCtx.route('**/api/shorefeel-us?*',r=>{
   const u=new URL(r.request().url()),ids=(u.searchParams.get('id')||u.searchParams.get('ids')||'').split(',');
   requests.push({ids,detail:u.searchParams.has('id')});
   const t=Date.now(),validAt=new Date(t-60000).toISOString(),validUntil=new Date(t+3540000).toISOString();
   const results=ids.map(id=>({id,provider:id.startsWith('ca:')?'ECCC':'NWS',status:'forecast-based',validAt,validUntil,issuedAt:validAt,airF:84,feelsLikeF:82,windMph:11,windFrom:'NE',method:'Official area forecast fixture',hours:[{validAt,airF:84,feelsLikeF:82}],water:null}));
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:'shorefeel-2.0',results})});
  });
  const mp=await mapCtx.newPage(),mapErrors=[];
  mp.on('pageerror',e=>mapErrors.push(String(e)));
  await mp.goto(url,{waitUntil:'domcontentloaded'});
  await mp.waitForFunction(()=>document.querySelector('#gl-map')?.dataset.represented==='1050');
  await mp.waitForFunction(()=>!!document.querySelector('#gl-map .leaflet-tile-loaded'));
  assert.equal(await mp.locator('#legacy-explorer').isVisible(),false);
  assert.equal(await mp.locator('#gl-explorer').isVisible(),true);
  assert.equal(requests.length,0,'national overview does not fetch every beach');
  const surface=mp.locator('#gl-map');
  await surface.scrollIntoViewIfNeeded();
  const zoom=()=>mp.evaluate(()=>window.__shoreMap.getZoom());
  const beforeCluster=await zoom();
  await surface.locator('.gl-cluster').first().click();
  await mp.waitForFunction(z=>window.__shoreMap.getZoom()>z,beforeCluster);
  await mp.goto(url,{waitUntil:'domcontentloaded'});
  await mp.waitForFunction(()=>!!document.querySelector('#gl-map .leaflet-tile-loaded'));
  await surface.scrollIntoViewIfNeeded();
  const beforeButton=await zoom();
  await surface.locator('.leaflet-control-zoom-in').click();
  await mp.waitForFunction(z=>window.__shoreMap.getZoom()>z,beforeButton);
  await mp.goto(url,{waitUntil:'domcontentloaded'});
  await mp.waitForFunction(()=>!!document.querySelector('#gl-map .leaflet-tile-loaded'));
  await surface.scrollIntoViewIfNeeded();
  assert.equal(await surface.evaluate(e=>getComputedStyle(e).touchAction),'none');
  assert.ok(await surface.locator('.leaflet-control-zoom-in').evaluate(e=>e.getBoundingClientRect().width>=44));
  const box=await surface.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
  const beforePinch=await zoom(),scale=await mp.evaluate(()=>visualViewport.scale);
  const cdp=await mapCtx.newCDPSession(mp),finger=(id,x,y)=>({id,x,y,force:1});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,cx-24,cy)]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,cx-24,cy),finger(2,cx+24,cy)]});
  for(let i=1;i<=12;i++){
   const spread=24+i*7;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(1,cx-spread,cy),finger(2,cx+spread,cy)]});
   await mp.waitForTimeout(24);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mp.waitForFunction(z=>window.__shoreMap.getZoom()>z,beforePinch);
  assert.ok(Math.abs(await mp.evaluate(()=>visualViewport.scale)-scale)<0.02,'pinch zooms map not entire page');
  await mp.locator('#gl-search').fill('MI000290');
  await mp.waitForFunction(()=>document.querySelector('#gl-count')?.textContent.startsWith('1 beach record'));
  await mp.waitForFunction(()=>document.querySelector('#gl-map .gl-temperature')?.textContent==='82°F');
  await surface.locator('.gl-temperature').click();
  await mp.waitForFunction(()=>document.querySelector('#gl-name')?.textContent==='Bay City State Recreation Area'&&document.querySelector('#gl-feel')?.textContent==='82°F');
  assert.match(await mp.locator('#gl-advisory').getAttribute('href'),/michigan.gov/);
  await mp.locator('[data-units="C"]').click();
  assert.equal(await mp.locator('#gl-feel').innerText(),'28°C');
  await mp.locator('#gl-search').fill('Agawa Bay');
  await mp.locator('#gl-results button[data-id="ca:agawa-bay"]').click();
  await mp.waitForFunction(()=>document.querySelector('#gl-name')?.textContent.includes('Agawa Bay')&&document.querySelector('#gl-feel')?.textContent==='28°C');
  assert.match(await mp.locator('#gl-advisory').getAttribute('href'),/ontarioparks/);
  assert.equal(await mp.locator('#gl-hour-section').isVisible(),true);
  await mp.locator('#gl-search').fill('no-such-beach-xyz');
  await mp.waitForFunction(()=>!document.querySelector('#gl-no-match')?.hidden);
  assert.equal(await mp.locator('#gl-detail').isVisible(),false);
  assert.ok(requests.every(r=>r.ids.length<=4),'bounded viewport requests');
  assert.deepEqual(mapErrors,[]);
  assert.ok(await mp.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2));
  await mp.screenshot({path:path.join(OUT,'shorefeel-unified-mobile.png'),fullPage:true});
  await mapCtx.close();
  // If tiles fail, the beach positions and list are still available.
  const failedTiles=await browser.newContext({viewport:{width:1280,height:850}});
  await failedTiles.route('https://**/*',r=>r.abort());
  const fp=await failedTiles.newPage();await fp.goto(url,{waitUntil:'domcontentloaded'});
  await fp.waitForFunction(()=>!document.querySelector('#gl-tile-note')?.hidden);
  assert.equal(await fp.locator('#gl-map').isVisible(),true);
  assert.ok(await fp.locator('#gl-map .gl-cluster').count()>0);
  await failedTiles.close();
  const noJs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
  const plain=await noJs.newPage();
  await plain.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(await plain.locator('.shore-stop').count(),16,'no-JS preserves 16 original park links');
  assert.match(await plain.locator('noscript').innerText(),/EPA BEACON/);
  assert.equal(await plain.locator('noscript').isVisible(),true);
  assert.equal(await plain.locator('.shore-stop a[href^="https://"]').count(),16);
  await noJs.close();
  console.log(JSON.stringify({passed:true,report,noJs:'16 official source links remain available',
    missing:'No fabricated temperature',map:'Blocked tile fallback confirmed'},null,2));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
start().catch(e=>{console.error(e);process.exitCode=1;});
