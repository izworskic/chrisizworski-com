#!/usr/bin/env node
'use strict';
// Real local-page browser acceptance: beach-feel answers at two widths, missing
// NOAA data, NWS outage and no-JS page content. External ads and basemap
// requests are blocked; this is not a live tile-provider or NWS uptime test.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.SHORE_PW_MODULE||'playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {beachFeel}=require('../lib/shorefeel/beach-feel.js');
const {scenario}=require('../lib/shorefeel/physics.js');

const root=path.resolve(__dirname,'../public');
const output=path.resolve(process.env.SHORE_QA_OUTPUT||'artifacts/shorefeel-beach-qa');
fs.mkdirSync(output,{recursive:true});
const contentType={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml',
 '.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  const uri=decodeURIComponent(u.pathname);
  let file=path.resolve(root,'.'+uri);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'Content-Type':contentType[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end('not found');}
});
function fixture(now=Date.now()){
 const time=new Date(now-10*60000).toISOString();
 const weather={startsAt:time,tempF:82,windMph:12,windDirection:'NE',humidity:45,
  summary:'Partly Sunny',daylight:true};
 const water={kind:'satellite',tempF:58.5,observedAt:time,caveat:'NOAA offshore pixel is not a beach thermometer'};
 const beach={lat:43.6714,lon:-83.9068},cell={lat:43.702,lon:-83.858};
 const impact=beachFeel(weather,water,beach,cell);
 const physics=scenario({beachWeather:weather,inlandWeather:{startsAt:time,tempF:86},
   water,beach,waterReference:cell,
   shoreGrid:{office:'DTX',x:100,y:60},inlandGrid:{office:'DTX',x:95,y:60}},new Date(time));
 const assessment=heading=>({heading,beach:'Cooler air is possible near the shore.',
  water:'Cold-water exposure is possible.',after:'Dry off after immersion.',
  decision:'Consult official safety and beach hazard information.'});
 return {product:'ShoreFeel',generatedAt:time,weatherNow:weather,water,
  beachFeel:impact,shorelinePhysics:physics,lakes:{huron:{status:'recent',latest:{tempF:63,date:time.slice(0,10)}}},
  local:{measurement:null},
  regionalSatellite:{cells:[
   {key:'inner-bay',measurement:{tempF:58.5,sampleLat:43.702,sampleLon:-83.858,observedAt:time}},
   {key:'west-bay',measurement:null}
  ]},
  assessments:{relax:assessment('Enjoy the shore'),swim:assessment('Swimming preparation'),
   family:assessment('Family preparation'),paddle:assessment('Paddling preparation')},
  weatherWindows:{relax:{startsAt:time},swim:{startsAt:time}}};
}
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report=[];
 try{
  for(const width of [390,1366]){
   const context=await browser.newContext({viewport:{width,height:860},reducedMotion:'reduce'});
   let mode='normal';
   await context.route('**/api/shorefeel?*',route=>{
    if(mode==='outage')return route.fulfill({status:503,body:'offline'});
    const data=fixture();
    if(mode==='weather-lost'){data.weatherNow=null;data.beachFeel=null;}
    if(mode==='water-lost'){
     // A stale water record must not lend validity to retained derived fields.
     data.water.observedAt=new Date(Date.now()-80*3600000).toISOString();
     data.regionalSatellite.cells[0].measurement.observedAt=data.water.observedAt;
    }
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   });
   await context.route('**/api/carto-basemap-config',route=>route.fulfill({status:503,body:'{}'}));
   await context.route('https://**/*',route=>route.abort());
   const page=await context.newPage();
   const errors=[];page.on('pageerror',error=>errors.push(String(error)));
   await page.goto(origin+'/lake-huron-water-temperature/saginaw-bay/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#lead-band')?.textContent==='Lake-breeze cooling possible',{timeout:15000});
   assert.match(await page.locator('h1').innerText(),/feel like at the beach/);
   assert.match(await page.locator('#lead-temp').innerText(),/°F/);
   assert.match(await page.locator('#lead-wind').innerText(),/12 mph from NE/);
   assert.match(await page.locator('#lead-water').innerText(),/58.5°F/);
   assert.match(await page.locator('#lead-source').innerText(),/National Weather Service park-area forecast/);
   assert.match(await page.locator('#hero-scope').innerText(),/At the beach · Bay City State Park/);
   assert.match(await page.locator('#lead-band-note').innerText(),/No exact degree correction/);
   await page.locator('details.shore-physics summary').click();
   assert.match(await page.locator('#physics-forecast-contrast').innerText(),/-4\.0°F/);
   assert.match(await page.locator('#physics-model-range').innerText(),/°F \(scenarios\)/);
   assert.match(await page.locator('#physics-model-limits').innerText(),/not an actual beach forecast/i);
   assert.match(await page.locator('#physics-grid-info').innerText(),/different 2\.5 km NWS forecast grid cells/i);
   assert.equal(await page.locator('#bay-map').getAttribute('data-basemap'),'openstreetmap');
   await page.locator('button[data-activity="swim"]').click();
   assert.match(await page.locator('#activity-heading').innerText(),/Swimming preparation/);
   await page.locator('button[data-activity="relax"]').click();
   assert.match(await page.locator('#activity-heading').innerText(),/Enjoy the shore/);
   const metrics=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth,headline:document.querySelector('#lead-band').textContent}));
   assert.ok(metrics.pageWidth<=metrics.viewport+2,'Horizontal overflow at '+width);
   assert.deepEqual(errors,[],'No browser runtime errors');
   await page.screenshot({path:path.join(output,'beach-feel-'+width+'.png'),fullPage:true});
   report.push({width,mode:'data',...metrics});
   async function refresh(next,selector,value){
    mode=next;
    const done=page.waitForResponse(r=>r.url().includes('/api/shorefeel?'));
    await page.locator('#refresh-shorefeel').click();
    await done;
    await page.waitForFunction(({selector,value})=>document.querySelector(selector)?.textContent.includes(value),{selector,value},{timeout:15000});
    await page.waitForFunction(()=>!document.getElementById('refresh-shorefeel').disabled);
   }
   await page.locator('button[data-activity="swim"]').click();
   await refresh('weather-lost','#lead-temp','Beach feel unavailable');
   assert.match(await page.locator('#lead-water').innerText(),/58.5°F/);
   assert.match(await page.locator('#in-water').innerText(),/58.5°F/);
   assert.match(await page.locator('#physics-forecast-contrast').innerText(),/unavailable/i);
   assert.match(await page.locator('#physics-model-range').innerText(),/unavailable/i);
   assert.match(await page.locator('#window').innerText(),/No suitable/);
   assert.equal(await page.locator('button[data-activity="swim"]').getAttribute('aria-pressed'),'true');
   await page.screenshot({path:path.join(output,'recovery-weather-lost-'+width+'.png'),fullPage:true});
   await refresh('water-lost','#lead-water','Not verified');
   assert.match(await page.locator('#lead-temp').innerText(),/°F/);
   assert.match(await page.locator('#lead-band').innerText(),/uncertain/i);
   assert.match(await page.locator('#physics-model-range').innerText(),/unavailable/i);
   assert.match(await page.locator('#in-water').innerText(),/No site-specific/);
   assert.match(await page.locator('#value-inner-bay').innerText(),/Unavailable/);
   await page.screenshot({path:path.join(output,'recovery-water-lost-'+width+'.png'),fullPage:true});
   await refresh('outage','#last-updated','Latest data not verified');
   assert.match(await page.locator('#lead-temp').innerText(),/unavailable/i);
   assert.match(await page.locator('#lead-water').innerText(),/Not verified/);
   assert.match(await page.locator('#window').innerText(),/No suitable/);
   assert.equal(await page.locator('#bay-map .bay-marker').count(),3);
   await refresh('normal','#lead-band','Lake-breeze cooling possible');
   assert.match(await page.locator('#lead-water').innerText(),/58.5°F/);
   assert.match(await page.locator('#activity-heading').innerText(),/Swimming preparation/);
   assert.equal(await page.locator('#bay-map .bay-marker').count(),3);
   assert.deepEqual(errors,[],'No browser runtime errors through recovery');
   await page.screenshot({path:path.join(output,'recovered-'+width+'.png'),fullPage:true});
   report.push({width,mode:'recovery',states:['weather-lost','water-lost','outage','restored'],selectedActivity:'swim'});
   await context.close();
  }
  for(const width of [390,1366]){
   const ctx=await browser.newContext({viewport:{width,height:860},reducedMotion:'reduce'});
   let mode='temporal',requests=0,advanced=0;
   await ctx.route('**/api/shorefeel?*',route=>{
    requests++;
    const d=fixture(Date.now()+advanced);
    if(mode==='temporal'){
     const n=Date.now(),at=offset=>new Date(n+offset).toISOString();
     d.generatedAt=at(-25*60000);
     d.weatherNow.startsAt=at(-58*60000);
     d.beachFeel.startsAt=d.weatherNow.startsAt;
     d.water.observedAt=at(-72*3600000+60000);
     d.regionalSatellite.cells[0].measurement.observedAt=d.water.observedAt;
     d.regionalSatellite.cells[1].measurement={tempF:61,observedAt:at(-3600000),sampleLat:43.799,sampleLon:-83.861};
    }
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});
   });
   await ctx.route('**/api/carto-basemap-config',route=>route.fulfill({status:503,body:'{}'}));
   await ctx.route('https://**/*',route=>route.abort());
   const pg=await ctx.newPage(),errors=[];
   pg.on('pageerror',e=>errors.push(String(e)));
   await pg.clock.install({time:new Date()});
   await pg.goto(origin+'/lake-huron-water-temperature/saginaw-bay/',{waitUntil:'domcontentloaded'});
   await pg.waitForFunction(()=>document.querySelector('#lead-water')?.textContent.includes('58.5°F'),null,{timeout:15000});
   await pg.locator('button[data-activity="swim"]').click();
   await pg.locator('[data-point="west-bay"]').first().click();
   assert.equal(requests,1);
   advanced+=65000;await pg.clock.fastForward(65000);
   await pg.waitForFunction(()=>document.querySelector('#lead-water')?.textContent==='Not verified',null,{timeout:15000});
   assert.match(await pg.locator('#lead-temp').innerText(),/°F/);
   assert.match(await pg.locator('#value-west-bay').innerText(),/61.0°F/);
   assert.equal(await pg.locator('button[data-activity="swim"]').getAttribute('aria-pressed'),'true');
   assert.match(await pg.locator('#selected-heading').innerText(),/Nayanquing/);
   assert.equal(requests,1,'expiration must not fetch');
   advanced+=65000;await pg.clock.fastForward(65000);
   await pg.waitForFunction(()=>document.querySelector('#lead-temp')?.textContent==='Beach feel unavailable',null,{timeout:15000});
   assert.match(await pg.locator('#value-west-bay').innerText(),/61.0°F/);
   assert.equal(requests,1);
   advanced+=180000;await pg.clock.fastForward(180000);
   await pg.waitForFunction(()=>document.querySelector('#last-updated')?.textContent.includes('Readings expired'),null,{timeout:15000});
   assert.match(await pg.locator('#value-west-bay').innerText(),/Unavailable/);
   assert.equal(await pg.locator('#bay-map .bay-marker').count(),3);
   assert.equal(requests,1);
   await pg.screenshot({path:path.join(output,'temporal-expired-'+width+'.png'),fullPage:true});
   mode='normal';
   const response=pg.waitForResponse(r=>r.url().includes('/api/shorefeel?'));
   await pg.locator('#refresh-shorefeel').click();
   await response;
   await pg.waitForFunction(()=>document.querySelector('#lead-water')?.textContent.includes('58.5°F'),null,{timeout:15000});
   assert.equal(requests,2);
   assert.match(await pg.locator('#activity-heading').innerText(),/Swimming preparation/);
   assert.match(await pg.locator('#selected-heading').innerText(),/Nayanquing/);
   assert.deepEqual(errors,[]);
   report.push({width,mode:'temporal-expiry',states:['water','hour','packet','manual-recovery'],requests});
   await ctx.close();
  }
  for(const width of [390,1366]){
   const ctx=await browser.newContext({viewport:{width,height:860},reducedMotion:'reduce'});
   let mode='valid';
   await ctx.route('**/api/shorefeel?*',route=>{
    const d=fixture(),now=Date.now(),H=3600000,at=t=>new Date(t).toISOString();
    const start=Math.ceil(now/H)*H;
    const {decisionWindow}=require('../lib/shorefeel/decision-window.js');
    const rows=[start,start+H].map(t=>({startsAt:at(t),endsAt:at(t+H),tempF:72,windMph:5,rainChance:0,daylight:true}));
    if(mode==='gap')rows[1].startsAt=at(start+2*H);
    d.weatherNow=null;d.beachFeel=null;d.water=null;
    d.decisionWindows=Object.fromEntries(['swim','relax','family','paddle'].map(a=>[a,decisionWindow(rows,a,new Date(now),at(now-H))]));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});
   });
   await ctx.route('**/api/carto-basemap-config',route=>route.fulfill({status:503,body:'{}'}));
   await ctx.route('https://**/*',route=>route.abort());
   const pg=await ctx.newPage(),errors=[];
   pg.on('pageerror',e=>errors.push(String(e)));
   await pg.goto(origin+'/lake-huron-water-temperature/saginaw-bay/',{waitUntil:'domcontentloaded'});
   await pg.waitForFunction(()=>document.querySelector('#window')?.textContent.includes('two-hour daylight period'),null,{timeout:15000});
   assert.match(await pg.locator('#lead-temp').innerText(),/unavailable/i);
   assert.match(await pg.locator('#window').innerText(),/highest hourly rain chance 0%/);
   assert.match(await pg.locator('#window').innerText(),/not swimming or paddling safety/);
   await pg.locator('button[data-activity="paddle"]').click();
   assert.match(await pg.locator('#window').innerText(),/two-hour daylight period/);
   await pg.screenshot({path:path.join(output,'decision-window-'+width+'.png'),fullPage:true});
   mode='gap';
   const response=pg.waitForResponse(r=>r.url().includes('/api/shorefeel?'));
   await pg.locator('#refresh-shorefeel').click();await response;
   await pg.waitForFunction(()=>document.querySelector('#window')?.textContent.includes('No suitable'),null,{timeout:15000});
   assert.deepEqual(errors,[]);
   report.push({width,mode:'decision-window',states:['independent future forecast','gap rejected']});
   await ctx.close();
  }
  const offline=await browser.newContext({viewport:{width:390,height:860}});
  await offline.route('**/api/shorefeel?*',route=>route.fulfill({status:503,body:'offline'}));
  await offline.route('**/api/carto-basemap-config',route=>route.fulfill({status:503,body:'{}'}));
  await offline.route('https://**/*',route=>route.abort());
  const failure=await offline.newPage();
  await failure.goto(origin+'/lake-huron-water-temperature/saginaw-bay/',{waitUntil:'domcontentloaded'});
  await failure.waitForFunction(()=>document.querySelector('#lead-temp')?.textContent==='Beach feel unavailable',{timeout:12000});
  assert.match(await failure.locator('#lead-band-note').innerText(),/could not be retrieved/);
  await failure.locator('details.shore-physics summary').click();
  assert.match(await failure.locator('#physics-model-range').innerText(),/unavailable/);
  report.push({width:390,mode:'upstream-offline',result:'fail closed'});
  await offline.close();
  const noJs=await browser.newContext({viewport:{width:390,height:860},javaScriptEnabled:false});
  const pg=await noJs.newPage();
  await pg.goto(origin+'/lake-huron-water-temperature/saginaw-bay/',{waitUntil:'domcontentloaded'});
  assert.match(await pg.locator('h1').innerText(),/feel like at the beach/);
  await pg.locator('details.evidence summary').click();
  assert.match(await pg.locator('#lead-caveat').innerText(),/not a thermometer on the sand/);
  assert.ok((await pg.locator('a[href*="weather.gov/apx/lake_breeze"]').count())>=1);
  await pg.locator('details.shore-physics summary').click();
  assert.match(await pg.locator('#physics-model-limits').innerText(),/not calibrated/);
  report.push({width:390,mode:'no-javascript',result:'readable source and limits'});
  await noJs.close();
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,journeys:report},null,2));
  process.stdout.write('ShoreFeel beach browser QA passed: '+JSON.stringify(report)+'\n');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
run().catch(err=>{console.error(err);process.exitCode=1});
