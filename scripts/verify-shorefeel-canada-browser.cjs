#!/usr/bin/env node
'use strict';
// Chromium tests of the Canadian Ontario Parks atlas. Weather values are
// explicit fixtures; these tests do not assert a live beach measurement.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.SHORE_PW_MODULE||'playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve(process.env.SHORE_QA_OUTPUT||'artifacts/shorefeel-canada-qa');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 try{const u=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain'});
 fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
});
function reply(slug,missing=false){
 const issuedAt=new Date(Date.now()-20*60000).toISOString(),validAt=new Date(Date.now()+15*60000).toISOString();
 return missing?{status:'unavailable',beach:slug,reason:'No recent ECCC city forecast within 60 km.'}:{
   status:'regional-forecast',beach:slug,temperatureC:6,temperatureF:43,windKmh:22,
   windFrom:'NW',city:'Official test city',cityDistanceKm:18,
   forecastValidAt:validAt,issuedAt,heading:'The breeze shapes a visit',
   guide:'Open shoreline wind can be stronger than sheltered park paths.',
   scope:'Regional ECCC city forecast, not an air thermometer on the beach.'
 };
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/great-lakes-beaches/canada/';
 let browser;
 try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 for(const width of [360,390,768,1280,1440]){
  const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
  await ctx.route('**/api/shorefeel-canada?*',route=>{
   const name=new URL(route.request().url()).searchParams.get('beach');
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(reply(name))});
  });
  await ctx.route('https://**/*',route=>route.abort());
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#forecast-air')?.textContent==='6°C',{timeout:15000});
  assert.match(await page.locator('#selected-name').innerText(),/Pancake Bay/);
  assert.match(await page.locator('#forecast-units').innerText(),/43°F/);
  assert.match(await page.locator('#source-note').innerText(),/Regional ECCC city forecast/);
  await page.locator('[data-lake="Ontario"]').click();
  await page.waitForFunction(()=>document.querySelector('#selected-name')?.textContent==='Sandbanks Provincial Park'&&document.querySelector('#forecast-air')?.textContent==='6°C');
  assert.match(await page.locator('#park-samples').getAttribute('href'),/ontarioparks.ca\/beachresults/);
  await page.locator('[data-select="presquile"]').click();
  await page.waitForFunction(()=>document.querySelector('#selected-name')?.textContent.includes("Presqu'ile"));
  assert.equal(await page.locator('[data-select="presquile"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-lake="Huron"]').click();
  await page.waitForFunction(()=>document.querySelector('#selected-name')?.textContent.includes('Pinery'));
  assert.match(await page.locator('#selected-story').innerText(),/Lake Huron|dunes/i);
  await page.locator('[data-lake="Superior"]').click();
  await page.waitForFunction(()=>document.querySelector('#selected-name')?.textContent==='Pancake Bay Provincial Park');
  await page.waitForFunction(()=>document.querySelector('#map-fallback')?.hidden===false,{timeout:17000});
  const metrics=await page.evaluate(()=>{
    const link=document.querySelector('.park-choice strong');
    return {clientWidth:document.documentElement.clientWidth,
      scrollWidth:document.documentElement.scrollWidth,
      font:parseFloat(getComputedStyle(link).fontSize),
      collapsed:document.querySelector('#canada-map').hidden};
  });
  assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,'horizontal scroll at '+width);
  assert.ok(metrics.font>=14,'small unreadable text');
  assert.equal(metrics.collapsed,true,'map failure must collapse');
  assert.deepEqual(errors,[],'JS errors at '+width);
  await page.screenshot({path:path.join(out,'canada-'+width+'.png'),fullPage:true});
  results.push({width,...metrics});
  await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:390,height:850}});
 await ctx.route('**/api/shorefeel-canada?*',route=>route.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify(reply(new URL(route.request().url()).searchParams.get('beach'),true))}));
 await ctx.route('https://**/*',route=>route.abort());
 const page=await ctx.newPage();
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#forecast-air')?.textContent==='Not available');
 assert.match(await page.locator('#source-note').innerText(),/No air reading is inferred/);
 await page.screenshot({path:path.join(out,'canada-source-unavailable.png'),fullPage:true});
 await ctx.close();
 const noJs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
 const p=await noJs.newPage();await p.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(await p.locator('.park-item').count(),16);
 assert.equal(await p.locator('.park-item a[href^="https://www.ontarioparks.ca/"]').count(),16);
 assert.equal(await p.locator('noscript').isVisible(),true);
 await noJs.close();
 console.log(JSON.stringify({status:'passed',results,fallback:'source absent and tiles blocked',noJs:'all 16 official park links'},null,2));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
