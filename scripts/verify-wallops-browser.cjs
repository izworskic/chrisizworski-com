#!/usr/bin/env node
'use strict';
/* Deterministic browser QA. All missions, NASA notices and weather are fixtures;
 * passing does NOT establish a real launch, public opening, parking or visibility. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const model=require('../lib/wallops-viewing');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/wallops-rocket-browser-qa');
fs.mkdirSync(out,{recursive:true});
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const launches=[
 {id:A,region:'virginia',name:'Fixture Black Brant IX scientific mission',
  net:'2026-11-19T16:00:00Z',netPrecision:'minute',rocket:'Black Brant IX',
  pad:'Pad 0A (fixture)',lat:37.84,lon:-75.484,status:'Go for Launch',
  scheduleConfidence:{level:'medium',label:'Target',detail:'Not launch approval'}},
 {id:B,region:'virginia',name:'Fixture HASTE research mission',
  net:'2026-11-28T12:00:00Z',netPrecision:'day',rocket:'HASTE',
  pad:'Pad unverified',lat:null,lon:null,status:'To Be Determined',
  scheduleConfidence:{level:'low',label:'Day only',detail:'No exact hour'}}
];
const errors=[],scenarios=[],screenshots=[];let sourceOutage=false,officialOutage=false;
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
function responseFor(id){
 const m=launches.find(l=>l.id===id)||launches[0];
 const at=new Date().toISOString();
 return {ok:true,selectedRegion:'virginia',selectedLaunchId:m.id,selectedLaunch:m,
  scheduleCheckedAt:at,scheduleFreshness:'recent',scheduleWarning:null,
  region:{id:'virginia',timezone:'America/New_York',specialist:'/wallops-rocket-launch-viewing/'},
  regions:[{id:'virginia',launches}],
  weather:{places:[{name:'Wallops Visitor Center',status:'ok',cloudStatus:'ok',
    cloudCoverPercent:45,updatedAt:at}]},
  wallopsViewing:model.buildWallopsViewing(m,[],Date.now())
 };
}
const server=http.createServer(async(req,res)=>{
 const send=(status,payload)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(payload))};
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/api/rocket-launch-usa'){
   if(sourceOutage)return send(503,{ok:false,error:'Fixture shared schedule unavailable'});
   const id=u.searchParams.get('launchId');
   if(id&&!launches.some(x=>x.id===id))return send(404,{ok:false,error:'Mission no longer present'});
   return send(200,responseFor(id||A));
  }
  if(u.pathname==='/api/wallops-official'){
   if(officialOutage)return send(503,{ok:false,error:'Fixture NASA sources unavailable'});
   const checkedAt=new Date().toISOString();
   return send(200,{ok:true,checkedAt,
    schedule:{status:'no-public-listed',
      summary:'NASA public schedule fixture has no currently listed public launches; separate range activity may exist.',
      checkedAt,url:model.NASA_LAUNCH},
    range:{status:'source-checked',
      summary:'NASA Wallops Range Blog fixture checked; operations are separate from the public calendar.',
      checkedAt,url:model.NASA_RANGE},
    visitorCenterEventOpening:'unverified',youtubeLivestream:'unverified'});
  }
  if(u.pathname==='/api/carto-basemap-config')return send(503,{provider:'unavailable'});
  let name=u.pathname;if(name.endsWith('/'))name+='index.html';
  const full=path.resolve(root,'.'+name);
  if(!full.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  const bytes=await fs.promises.readFile(full);
  res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
async function routeLeaflet(page){
 for(const ext of ['js','css']){
  const file=require.resolve('leaflet/dist/leaflet.'+ext);
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.'+ext,
   route=>route.fulfill({status:200,contentType:ext==='js'?'application/javascript':'text/css',body:fs.readFileSync(file)}));
 }
}
async function ready(page){
 await page.waitForFunction(()=>document.querySelector('#w-mission-select')?.disabled===false,{timeout:12000});
 await page.waitForFunction(()=>document.querySelectorAll('#w-map .w-public-marker').length===3,{timeout:14000});
}
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const base='http://127.0.0.1:'+server.address().port+'/wallops-rocket-launch-viewing/';
  for(const v of [{label:'phone360',width:360,height:780},{label:'phone390',width:390,height:844},
   {label:'tablet768',width:768,height:1024},{label:'desktop1440',width:1440,height:900}]){
   const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},reducedMotion:'reduce'});
   const page=await ctx.newPage(),pageErrors=[];
   page.on('pageerror',e=>pageErrors.push(e.message));
   await routeLeaflet(page);
   const load=await page.goto(base+'?launchId='+A,{waitUntil:'domcontentloaded',timeout:30000});
   assert(load.status()===200,v.label+' page HTTP');
   await ready(page);
   assert((await page.locator('#w-mission-name').innerText()).includes('Black Brant'),v.label+' mission A');
   assert((await page.locator('#w-mission-type-tag').innerText()).includes('SCIENTIFIC SOUNDING'),v.label+' sounding rocket class');
   assert((await page.locator('#w-nasa-public-status').innerText()).includes('No upcoming public launch'),v.label+' public schedule separate');
   assert((await page.locator('#w-nasa-range-status').innerText()).includes('Range Blog checked'),v.label+' NASA range separate');
   assert((await page.locator('#w-decision-copy').innerText()).includes('has not verified'),v.label+' no false event opening');
   assert((await page.locator('#w-mission-time').innerText()).includes('target'),v.label+' exact target qualified');
   assert(await page.locator('#w-map .w-restricted-marker').count()===1,v.label+' restricted pad marker');
   assert((await page.locator('#w-selected-bearing').innerText()).includes('STRAIGHT LINE'),v.label+' no trajectory');
   await page.locator('label:has(input[value="backup"]) span').click();
   assert((await page.locator('#w-selected-name').innerText()).includes('Robert'),v.label+' town persona');
   await page.locator('label:has(input[value="photo"]) span').click();
   assert((await page.locator('#w-selected-name').innerText()).includes('Curtis'),v.label+' photo profile');
   await page.locator('label:has(input[value="first"]) span').click();
   assert((await page.locator('#w-selected-name').innerText()).includes('NASA Wallops'),v.label+' initial profile restored');
   await page.locator('#w-mission-select').selectOption(B);
   await page.waitForFunction(id=>new URL(location.href).searchParams.get('launchId')===id,B);
   assert((await page.locator('#w-mission-type-tag').innerText()).includes('SUBORBITAL HASTE'),v.label+' HASTE distinct');
   assert(await page.locator('#w-map .w-restricted-marker').count()===0,v.label+' removed unknown pad');
   assert((await page.locator('#w-selected-bearing').innerText()).includes('The pad isn’t confirmed'),v.label+' no invented bearings');
   assert((await page.locator('#w-decision-title').innerText()).includes('LAUNCH HOUR UNVERIFIED'),v.label+' no coarse countdown');
   await page.locator('#w-mission-select').selectOption(A);
   await page.waitForFunction(id=>new URL(location.href).searchParams.get('launchId')===id,A);
   assert(await page.locator('#w-map .w-restricted-marker').count()===1,v.label+' restored valid pad');
   assert((await page.locator('#w-national-link').getAttribute('href')).includes(A),v.label+' national UUID continuity');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=2,v.label+' horizontal overflow '+overflow);
   assert(pageErrors.length===0,v.label+' JS exceptions: '+pageErrors.join('; '));
   const shot=v.label+'-wallops-atlas.png';
   await page.locator('#viewing-atlas').screenshot({path:path.join(out,shot),animations:'disabled'});
   screenshots.push(shot);
   scenarios.push({scenario:v.label,missionCycle:'A-B-A',profiles:'first-backup-photo-first',
    nasaPublicAndRange:'separate',unknownPad:'hidden',overflowPx:overflow,pageErrors:0});
   await ctx.close();
  }
  const expired=await browser.newContext({viewport:{width:390,height:844}});
  const stale=await expired.newPage();await routeLeaflet(stale);
  await stale.goto(base+'?launchId=33333333-3333-4333-8333-333333333333',{waitUntil:'domcontentloaded'});
  await ready(stale);
  assert((await stale.locator('#w-mission-observed').innerText()).includes('a different mission is shown'),'Expired deep link not disclosed');
  scenarios.push({scenario:'expired-uuid',status:'disclosed'});
  await expired.close();
  sourceOutage=true;
  const outage=await browser.newContext({viewport:{width:390,height:844}});
  const offline=await outage.newPage();await routeLeaflet(offline);
  await offline.goto(base,{waitUntil:'domcontentloaded'});
  await offline.waitForFunction(()=>document.querySelectorAll('#w-map .w-public-marker').length===3,{timeout:14000});
  assert((await offline.locator('#w-mission-name').innerText()).includes('unavailable'),'Schedule outage unreported');
  assert((await offline.locator('#w-decision-title').innerText()).includes('CALENDAR UNAVAILABLE'),'Stale schedule promoted');
  assert(await offline.locator('.w-place').count()===3,'Map outage lost three public site cards');
  scenarios.push({scenario:'schedule-outage',threeStaticSites:'retained',mission:'unverified'});
  await outage.close();sourceOutage=false;
  officialOutage=true;
  const bad=await browser.newContext({viewport:{width:390,height:844}});
  const officialPage=await bad.newPage();await routeLeaflet(officialPage);
  await officialPage.goto(base,{waitUntil:'domcontentloaded'});
  await officialPage.waitForFunction(()=>document.querySelector('#w-nasa-public-status')?.textContent.includes('could not be checked'),{timeout:14000});
  assert(!(await officialPage.locator('#w-nasa-public-status').innerText()).includes('No upcoming public launch'),'Official outage mistaken for empty schedule');
  scenarios.push({scenario:'NASA-official-outage',status:'unavailable-not-empty'});
  await bad.close();officialOutage=false;
  const noJs=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
  const staticPage=await noJs.newPage();await staticPage.goto(base,{waitUntil:'domcontentloaded'});
  assert(await staticPage.locator('.w-place').count()===3,'No JS loses place descriptions');
  assert(await staticPage.locator('#w-mission-select').isDisabled(),'No JS invented flight');
  assert(await staticPage.locator('.w-source-links a[href^="https://"]').count()>=8,'No-JS sources missing');
  scenarios.push({scenario:'no-JS',officialSources:true,staticPlaces:3});
  await noJs.close();
  const tileContext=await browser.newContext({viewport:{width:390,height:844}});
  const tilePage=await tileContext.newPage();await routeLeaflet(tilePage);
  await tilePage.route('https://tile.openstreetmap.org/**',route=>route.abort());
  await tilePage.route('https://*.basemaps.cartocdn.com/**',route=>route.abort());
  await tilePage.goto(base,{waitUntil:'domcontentloaded'});
  await tilePage.waitForFunction(()=>document.querySelectorAll('#w-map .w-public-marker').length===3,{timeout:14000});
  assert(await tilePage.locator('.w-place').count()===3,'Tile failure lost place cards');
  assert((await tilePage.locator('#w-map-status').innerText()).length>30,'No tile fallback');
  scenarios.push({scenario:'tile-outage',publicPins:3,staticCards:3});
  await tileContext.close();
 }catch(e){errors.push(e.stack||String(e));}
 finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({scenarios,screenshots,errors},null,2)+'\n');
  console.log(JSON.stringify({scenarios,screenshots,errors},null,2));
  if(errors.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
