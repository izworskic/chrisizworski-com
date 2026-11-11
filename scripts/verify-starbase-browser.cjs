#!/usr/bin/env node
'use strict';
/* Fixture-based browser QA: does not pretend that the mocked missions, city
   notices or tile responses prove current launch-day access. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const model=require('../lib/starbase-viewing');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/starbase-browser-qa');
fs.mkdirSync(out,{recursive:true});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const missions=[
 {id:A,region:'texas',name:'Fixture Starship A',net:'2026-11-09T14:30:00Z',
  netPrecision:'minute',pad:'Starbase Orbital Pad',lat:25.998,lon:-97.155,
  scheduleConfidence:{level:'medium',label:'Target',detail:'Not launch approval'}},
 {id:B,region:'texas',name:'Fixture Starship B',net:'2026-11-20T15:00:00Z',
  netPrecision:'day',pad:'Pad not verified',lat:null,lon:null,
  scheduleConfidence:{level:'low',label:'Day only',detail:'No confirmed launch hour'}}
];
const fails=[],scenarios=[],shots=[];
let sourceOutage=false,forceTileFailure=false;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const assert=(condition,text)=>{if(!condition)throw Error(text)};
function fixture(id){
 const picked=missions.find(x=>x.id===id)||missions[0];
 const now=Date.now(),check=new Date(now-5*60*1000).toISOString();
 return {
  ok:true,selectedRegion:'texas',selectedLaunchId:picked.id,selectedLaunch:picked,
  generatedAt:new Date(now).toISOString(),scheduleCheckedAt:check,scheduleFreshness:'recent',
  scheduleWarning:null,
  region:{id:'texas',timezone:'America/Chicago',specialist:'/starbase-rocket-launch-viewing/'},
  regions:[{id:'texas',launches:missions}],
  weather:{
   level:'assessed',places:[{id:'south-padre',name:'South Padre Island',status:'ok',
     cloudStatus:'ok',cloudCoverPercent:46,updatedAt:check},
    {id:'port-isabel',name:'Port Isabel',status:'ok',
     cloudStatus:'ok',cloudCoverPercent:68,updatedAt:check}],
   comparison:{state:'relative',winner:'south-padre'}
  },
  starbaseViewing:model.buildStarbaseViewing(picked,{state:'open-general',checkedAt:check},
    {level:'assessed',places:[]},now)
 };
}
const server=http.createServer(async(req,res)=>{
 const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body))};
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/api/rocket-launch-usa'){
   if(sourceOutage)return send(503,{ok:false,error:'Fixture source outage'});
   const id=url.searchParams.get('launchId');
   if(id && !missions.some(x=>x.id===id))return send(404,{ok:false,error:'Mission no longer in bounded schedule'});
   return send(200,fixture(id||A));
  }
  if(url.pathname==='/api/carto-basemap-config')return send(503,{provider:'unavailable'});
  const name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const full=path.resolve(root,'.'+name);
  if(!full.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const bytes=await fs.promises.readFile(full);
  res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Fixture file not found')}
});
async function routeLeaflet(page){
 // Load the exact intended Leaflet version without relying on a CDN test hit.
 for(const ext of ['js','css']){
  const original=require.resolve('leaflet/dist/leaflet.'+ext);
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.'+ext,
   route=>route.fulfill({status:200,contentType:ext==='js'?'application/javascript':'text/css',body:fs.readFileSync(original)}));
 }
}
async function waitReady(page){
 await page.waitForFunction(()=>document.querySelector('#sb-mission-picker')?.disabled===false,{timeout:15000});
 await page.waitForFunction(()=>document.querySelectorAll('#sb-map .leaflet-marker-icon').length>=4,{timeout:15000});
}
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const url='http://127.0.0.1:'+server.address().port+'/starbase-rocket-launch-viewing/';
  for(const v of [{name:'phone360',width:360,height:780},{name:'phone390',width:390,height:844},
   {name:'tablet768',width:768,height:1024},{name:'desktop1440',width:1440,height:900}]){
   const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},reducedMotion:'reduce'});
   const page=await ctx.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await routeLeaflet(page);
   const response=await page.goto(url+'?launchId='+A,{waitUntil:'domcontentloaded',timeout:30000});
   assert(response.status()===200,v.name+' HTTP');
   await waitReady(page);
   assert((await page.locator('#sb-mission-name').innerText()).includes('Fixture Starship A'),v.name+' mission A');
   assert((await page.locator('#sb-access-label').innerText()).includes('beach generally open'),v.name+' city notice scoped');
   assert((await page.locator('#sb-access-note').innerText()).includes('NOT an authorized launch'),v.name+' no beach-open implication');
   assert(await page.locator('#sb-map .sb-restricted-pin').count()===1,v.name+' restricted pad symbol');
   assert((await page.locator('#sb-selected-geometry').innerText()).includes('straight line'),v.name+' geometry qualifier');
   await page.locator('label:has(input[value="no-causeway"]) span').click();
   assert((await page.locator('#sb-selected-name').innerText()).includes('Zapata'),v.name+' mainland persona');
   await page.locator('[data-site-select="lighthouse"]').click();
   assert((await page.locator('#sb-selected-name').innerText()).includes('Lighthouse'),v.name+' map-card selection');
   await page.locator('label:has(input[value="first-time"]) span').click();
   assert((await page.locator('#sb-selected-name').innerText()).includes('Isla Blanca'),v.name+' restore first-time');
   await page.locator('#sb-mission-picker').selectOption(B);
   await page.waitForFunction(id=>new URL(location.href).searchParams.get('launchId')===id,B);
   assert(await page.locator('#sb-map .sb-restricted-pin').count()===0,v.name+' unknown pad hidden');
   assert((await page.locator('#sb-selected-geometry').innerText()).includes('no reliable distance or direction'),v.name+' unknown bearing label');
   await page.locator('#sb-mission-picker').selectOption(A);
   await page.waitForFunction(id=>new URL(location.href).searchParams.get('launchId')===id,A);
   assert(await page.locator('#sb-map .sb-restricted-pin').count()===1,v.name+' pad restored after B→A');
   assert((await page.locator('#sb-national-link').getAttribute('href')).includes(A),v.name+' national handoff UUID');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=2,v.name+' horizontal overflow '+overflow);
   assert(errors.length===0,v.name+' browser JS exceptions: '+errors.join('; '));
   await page.locator('#viewing-map').screenshot({path:path.join(out,v.name+'-atlas.png'),animations:'disabled'});
   shots.push(v.name+'-atlas.png');
   scenarios.push({name:v.name,missionCycle:'A-B-A',locationProfile:'reversible',mapPins:4,overflowPx:overflow,jsErrors:0});
   await ctx.close();
  }
  const staleContext=await browser.newContext({viewport:{width:390,height:844}});
  const stale=await staleContext.newPage();await routeLeaflet(stale);
  await stale.goto(url+'?launchId=33333333-3333-4333-8333-333333333333',{waitUntil:'domcontentloaded'});
  await waitReady(stale);
  assert((await stale.locator('#sb-mission-source').innerText()).includes('A different mission is shown'),
   'Expired deep link must disclose replaced mission');
  scenarios.push({name:'expired-link',fallback:'disclosed, first bounded mission'});
  await staleContext.close();
  sourceOutage=true;
  const failCtx=await browser.newContext({viewport:{width:390,height:844}});
  const failed=await failCtx.newPage();await routeLeaflet(failed);
  await failed.goto(url,{waitUntil:'domcontentloaded'});
  await failed.waitForFunction(()=>document.querySelectorAll('#sb-map .sb-public-pin').length===3,{timeout:12000});
  assert(await failed.locator('.sb-place-card').count()===3,'Outage lost static places');
  assert((await failed.locator('#sb-mission-name').innerText()).includes('unavailable'),'Outage not disclosed');
  assert(await failed.locator('#sb-access-status').getAttribute('data-state')==='unknown','Outage promoted beach open');
  scenarios.push({name:'source-outage',places:'retained',access:'unknown'});
  await failCtx.close();
  sourceOutage=false;
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const noJsPage=await noJs.newPage();
  await noJsPage.goto(url,{waitUntil:'domcontentloaded'});
  assert(await noJsPage.locator('.sb-place-card').count()===3,'No-JS lost static guides');
  assert(await noJsPage.locator('#sb-mission-picker').isDisabled(),'No-JS invented schedule');
  assert(await noJsPage.locator('.sb-sources a[href^="https://"]').count()>=6,'No-JS source ledger absent');
  scenarios.push({name:'no-js',staticCards:3,officialLinks:'present'});
  await noJs.close();
  const tileCtx=await browser.newContext({viewport:{width:390,height:844}});
  const noTile=await tileCtx.newPage();await routeLeaflet(noTile);
  await noTile.route('https://tile.openstreetmap.org/**',route=>route.abort());
  await noTile.route('https://*.basemaps.cartocdn.com/**',route=>route.abort());
  await noTile.goto(url,{waitUntil:'domcontentloaded'});
  await noTile.waitForFunction(()=>document.querySelectorAll('#sb-map .sb-public-pin').length===3,{timeout:12000});
  await noTile.waitForTimeout(650);
  assert(await noTile.locator('.sb-place-card').count()===3,'Tile outage lost place cards');
  assert((await noTile.locator('#sb-map-status').innerText()).length>30,'Tile outage lacks explanation');
  scenarios.push({name:'tile-outage',sourceCards:3,tiles:'unavailable disclosed'});
  await tileCtx.close();
 }catch(e){fails.push(e.stack||String(e))}
 finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  const result={scenarios,shots,errors:fails};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  if(fails.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
