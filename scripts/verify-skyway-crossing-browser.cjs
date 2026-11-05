#!/usr/bin/env node
'use strict';
// Deterministic source-HTML/browser QA: fixture FL511/NWS snapshots are NOT live observations.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/skyway-crossing');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css'};
const server=http.createServer(async(req,res)=>{
 try {
  const uri=new URL(req.url,'http://127.0.0.1');
  const file=path.resolve(root,'.'+(uri.pathname.endsWith('/')?uri.pathname+'index.html':uri.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const data=await fs.promises.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
function fixture(params,scenario){
 const direction=params.get('direction')||'northbound',vehicle=params.get('vehicle')||'car';
 const windSensitive=['rv','trailer','motorcycle','high_profile'].includes(vehicle);
 const closed=scenario==='closed',unknown=scenario==='unknown',wind=scenario==='wind';
 const operational=closed?'CLOSED':unknown?'UNKNOWN':'NO_CLOSURE_SIGNAL_FOUND';
 const speed=scenario==='stale'?'degraded_cached':'ok';
 return {
  generatedAt:new Date().toISOString(),
  officialStatus:{state:operational,label:operational,reason:'TEST_FIXTURE',officialText:closed?'FL511 fixture: full bridge closure reported.':'Fixture: no explicit Skyway closure signal returned.'},
  vehicle:{type:vehicle,state:closed?'PROHIBITED':unknown?'UNKNOWN':wind&&windSensitive?'CAUTION':'NO_SPECIAL_RESTRICTION_FOUND',label:'Fixture vehicle treatment',reason:'Interpretive class-specific context; official status always controls.'},
  traffic:{state:closed?'CLOSED':'NO_SPECIFIC_LIVE_EVENT_FOUND',officialMentions:[],flow:{selectedDirection:direction,selected:{state:scenario==='stale'?'STOP_AND_GO':'MOVING_WELL',label:'Moving well'}}},
  windContext:{level:wind?'HIGH_WIND_CLOSURE_RISK_CONTEXT':'ROUTINE_CONTEXT',maxWindMph:wind?45:12,sourceLabel:'NWS test forecast',periods:[{startTime:new Date(Date.now()+3600000).toISOString(),windSpeed:wind?'45 mph':'12 mph',windDirection:'N',shortForecast:'Fixture forecast'}],alerts:[]},
  sourceHealth:{alerts:{state:unknown?'unavailable':'ok'},traffic:{state:unknown?'unavailable':'ok'},trafficSpeeds:{state:speed},camera:{state:'unavailable'}},
  toll:{amount:direction==='southbound'?1.62:1.16,direction,plaza:direction==='southbound'?'North Plaza':'South Plaza',note:'Fixture only'},
  cameras:[]
 };
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const report={fixtureOnly:true,views:[],errors:[]};let browser;
 try {
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [360,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900},timezoneId:'America/New_York',reducedMotion:'reduce'});
   let scenario='normal';
   await context.route('**/*',route=>{
    const u=route.request().url();
    if(u.includes('/api/sunshine-skyway?')){
     const params=new URL(u).searchParams;
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(params,scenario))});
    }
    return u.startsWith(base)?route.continue():route.abort();
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/sunshine-skyway-bridge/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#statusWord').textContent.includes('NO CLOSURE SIGNAL'));
   assert.match(await page.locator('#tripDecision').innerText(),/No official Skyway closure signal/);
   assert.ok((await page.locator('#routeSteps').textContent()).includes('I-75 north'));
   const head=await page.locator('#statusPanel').boundingBox();
   assert.ok(head&&head.y<830,'Operational answer outside initial 900px viewport, width '+width);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=3,'Horizontal overflow at '+width+': '+overflow);
   await page.screenshot({path:path.join(out,'skyway-'+width+'-initial.png'),fullPage:true,animations:'disabled'});
   await page.locator('#direction').selectOption('southbound');
   await page.waitForFunction(()=>document.querySelector('#routeSteps').textContent.includes('I-75 south'));
   assert.match(await page.locator('#routeContext').textContent(),/Southbound/);
   assert.match(await page.locator('#shareTrip').getAttribute('href'),/direction=southbound/);
   await page.locator('#direction').selectOption('northbound');
   await page.waitForFunction(()=>document.querySelector('#routeSteps').textContent.includes('I-75 north'));
   assert.match(await page.locator('#shareTrip').getAttribute('href'),/direction=northbound/);
   await page.locator('#compareRoute').click();
   assert.equal(await page.locator('#alternativeRoute').getAttribute('open'),'');
   assert.match(await page.locator('#routeContext').innerText(),/not an official detour/i);
   await page.locator('#vehicle').selectOption('rv');
   scenario='wind';await page.locator('#refresh').click();
   await page.waitForFunction(()=>document.querySelector('#tripDecision').textContent.includes('Wind deserves extra attention'));
   assert.match(await page.locator('#tripReason').innerText(),/not itself a closure/);
   scenario='closed';await page.locator('#refresh').click();
   await page.waitForFunction(()=>document.querySelector('#statusWord').textContent.includes('CLOSED'));
   assert.match(await page.locator('#tripDecision').innerText(),/Do not attempt/);
   await page.screenshot({path:path.join(out,'skyway-'+width+'-closed.png'),fullPage:true,animations:'disabled'});
   scenario='unknown';await page.locator('#refresh').click();
   await page.waitForFunction(()=>document.querySelector('#statusWord').textContent.includes('UNKNOWN'));
   assert.match(await page.locator('#tripDecision').innerText(),/could not be verified/);
   scenario='stale';await page.locator('#refresh').click();
   await page.waitForFunction(()=>document.querySelector('#statusWord').textContent.includes('NO CLOSURE SIGNAL'));
   assert.doesNotMatch(await page.locator('#tripDecision').innerText(),/traffic is slow/i);
   assert.equal(errors.length,0,'JS errors at '+width+': '+errors.join('; '));
   report.views.push({width,overflow,statusTop:head.y,normal:true,reversed:true,wind:true,closed:true,unknown:true,stale:true});
   await context.close();
  }
  const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
  await ctx.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const noJs=await ctx.newPage();await noJs.goto(base+'/sunshine-skyway-bridge/',{waitUntil:'domcontentloaded'});
  assert.match(await noJs.locator('noscript').innerText(),/JavaScript is needed/);
  assert.ok(await noJs.locator('a[href="https://fl511.com/"]').count()>=1);
  await noJs.screenshot({path:path.join(out,'skyway-390-no-js.png'),fullPage:true});
  await ctx.close();
 }catch(e){report.errors.push(e.stack||String(e));}
 finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
