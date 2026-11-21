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
function fixture(){
 const time=new Date(Date.now()-10*60000).toISOString();
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
   await context.route('**/api/shorefeel?*',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(fixture())
   }));
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
   assert.match(await page.locator('#lead-source').innerText(),/NWS land-side area forecast/);
   assert.match(await page.locator('#lead-band-note').innerText(),/No exact degree correction/);
   await page.locator('details.shore-physics summary').click();
   assert.match(await page.locator('#physics-forecast-contrast').innerText(),/-4\.0°F/);
   assert.match(await page.locator('#physics-model-range').innerText(),/°F \(scenarios\)/);
   assert.match(await page.locator('#physics-model-limits').innerText(),/not an actual beach forecast/i);
   assert.match(await page.locator('#physics-grid-info').innerText(),/different 2\\.5 km NWS forecast grid cells/i);
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
   await context.close();
  }
  const offline=await browser.newContext({viewport:{width:390,height:860}});
  await offline.route('**/api/shorefeel?*',route=>route.fulfill({status:503,body:'offline'}));
  await offline.route('**/api/carto-basemap-config',route=>route.fulfill({status:503,body:'{}'}));
  await offline.route('https://**/*',route=>route.abort());
  const failure=await offline.newPage();
  await failure.goto(origin+'/lake-huron-water-temperature/saginaw-bay/',{waitUntil:'domcontentloaded'});
  await failure.waitForFunction(()=>document.querySelector('#lead-temp')?.textContent==='Beach feel unavailable',{timeout:12000});
  assert.match(await failure.locator('#lead-band-note').innerText(),/could not be retrieved/);
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
