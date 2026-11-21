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
   assert.equal(await page.locator('.shore-stop').count(),16);
   await page.getByRole('button',{name:'Lake Ontario',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Hamlin Beach State Park'&&document.querySelector('#report-temp')?.textContent==='82°F');
   assert.match(await page.locator('#report-safety').getAttribute('href'),/beachadvisory.health.ny.gov/);
   await page.locator('[data-select="fair-haven-beach-state-park"]').click();
   await page.waitForFunction(()=>document.querySelector('#report-name')?.textContent==='Fair Haven Beach State Park'&&document.querySelector('#report-temp')?.textContent==='82°F');
   assert.equal(await page.locator('[data-select="fair-haven-beach-state-park"]').getAttribute('aria-pressed'),'true');
   assert.match(page.url(),/beach=fair-haven-beach-state-park/);
   await page.getByRole('button',{name:'Lake Huron',exact:true}).click();
   assert.match(await page.locator('#report-name').innerText(),/Lake Huron: Michigan shorelines/);
   assert.match(await page.locator('#report-safety').getAttribute('href'),/\/great-lakes-beaches\//);
   assert.equal(await page.locator('#report-temp').innerText(),'Explore Michigan');
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
  assert.equal(await plain.locator('.shore-stop').count(),16);
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
