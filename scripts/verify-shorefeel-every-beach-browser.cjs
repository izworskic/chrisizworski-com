#!/usr/bin/env node
'use strict';
/* Real Chrome phone/desktop checks. API responses here are explicitly synthetic. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.SHORE_PW_MODULE||'playwright');
const root=path.resolve(__dirname,'../public');
const output=path.resolve(process.env.SHORE_QA_OUTPUT||'artifacts/shorefeel-beach-qa');
fs.mkdirSync(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  let file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
});
const cases=[
 {region:'around-the-lakes',code:'us',slug:'park-point-beach-house',kind:'good'},
 {region:'around-the-lakes',code:'us',slug:'edgewater-beach',kind:'none'},
 {region:'canada',code:'ca',slug:'agawa-bay',kind:'good'},
 {region:'canada',code:'ca',slug:'toronto-woodbine',kind:'none'}
];
function mock(c){
 if(c.kind==='none')return {status:'unavailable',beach:c.slug,
  reason:'Real source check did not return an up-to-date forecast'};
 if(c.code==='us')return {status:'forecast-based',beach:c.slug,airF:72,feelsLikeF:72,
  method:'NWS forecast air',windMph:12,windFrom:'NW',
  asOf:'2026-07-01T14:00:00Z',issuedAt:'2026-07-01T13:12:00Z',
  guide:'The wind will be noticeable where the dunes open to the lake.'};
 return {status:'forecast-based',beach:c.slug,temperatureC:7,apparentC:3,
  method:'Calculated Canadian wind chill from ECCC forecast',windKmh:22,windDirection:'NW',
  validAt:'2026-11-21T18:00:00Z',forecastIssueAt:'2026-11-21T16:00:00Z',
  forecastPlace:'Wawa',forecastDistanceKm:12,isUpcoming:false,
  note:'Cool air may feel more exposed at the waterline.'};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const results=[];
  for(const width of [390,1280]){
   for(const item of cases){
    const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
    const errors=[];
    await context.route('https://**/*',route=>route.abort());
    const page=await context.newPage();
    page.on('pageerror',err=>errors.push(String(err)));
    await page.route('**/api/shorefeel-??beach=*',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(mock(item))}));
    const url=origin+'/great-lakes-beaches/'+item.region+'/'+item.slug+'/';
    const resp=await page.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(resp.status(),200,url);
    const expected=item.kind==='none'?'No recent forecast':item.code==='ca'?'3°C':'72°F';
    await page.waitForFunction(x=>document.getElementById('feel-value')?.textContent===x,expected,{timeout:15000});
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),
      'https://chrisizworski.com/great-lakes-beaches/'+item.region+'/'+item.slug+'/');
    assert.equal(await page.locator('#shorefeel-live').getAttribute('data-status'),
      item.kind==='none'?'unavailable':'forecast');
    assert.match(await page.locator('#feel-evidence').innerText(),/not|No /i);
    assert.ok((await page.locator('a[href*="google.com/maps/search"]').count())>=1);
    assert.ok((await page.locator('a[href*="/great-lakes-beaches/'+item.region+'/?beach="]').count())>=1);
    const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
      sections:[...document.querySelectorAll('main > section')].map(x=>x.className)}));
    assert.ok(dims.scroll<=dims.width+2,item.slug+' overflows viewport '+JSON.stringify(dims));
    assert.equal(dims.sections[1],'shore-answer','Weather must appear before long story');
    assert.deepEqual(errors,[],item.slug+' JavaScript page errors');
    const screenshot=path.join(output,item.code+'-'+item.slug+'-'+width+'.png');
    await page.screenshot({path:screenshot,fullPage:true});
    results.push({beach:item.slug,width,status:item.kind,weather:expected,screenshot});
    await context.close();
   }
  }
  fs.writeFileSync(path.join(output,'every-beach-browser.json'),JSON.stringify(results,null,2));
  console.log('SHOREFEEL_EVERY_BEACH_BROWSER_PASS',JSON.stringify(results.map(x=>x.beach+':'+x.width)));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
