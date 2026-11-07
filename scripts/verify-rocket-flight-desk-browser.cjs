#!/usr/bin/env node
'use strict';
// Fixture-based national Experience OS browser QA. Faked schedules are NOT
// evidence of an actual launch, public range access, or a good forecast.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {REGIONS}=require('../lib/rocket-launch-usa');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(__dirname,'../artifacts/rocket-flight-desk-qa');
fs.mkdirSync(out,{recursive:true});
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const launches=[
 {id:A,region:'florida',name:'Fixture Florida rocket A',net:'2026-11-12T19:30:00Z',
  netPrecision:'minute',rocket:'Falcon 9',provider:'Fixture Operator',pad:'SLC-40',
  lat:28.563,lon:-80.577,scheduleConfidence:{level:'medium',label:'Target published',
  detail:'Third-party schedule; not launch GO'},status:'To Be Confirmed'},
 {id:B,region:'florida',name:'Fixture Florida rocket B',net:'2026-11-15T00:00:00Z',
  netPrecision:'day',rocket:'New Glenn',provider:'Fixture Operator',pad:'LC-36',
  lat:null,lon:null,scheduleConfidence:{level:'low',label:'Day only',
  detail:'Time not published'},status:'To Be Determined'},
 {id:C,region:'texas',name:'Fixture Texas Starship C',net:'2026-11-21T13:00:00Z',
  netPrecision:'minute',rocket:'Starship',provider:'Fixture Operator',pad:'Starbase launch pad',
  lat:25.997,lon:-97.157,scheduleConfidence:{level:'medium',label:'Target published',
  detail:'Not launch GO'},status:'To Be Confirmed'}
];
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
let failedSource=false;
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const stamp=()=>new Date(Date.now()-60000).toISOString();
function payload(region='florida',id=null,stale=false){
 const r=REGIONS.find(x=>x.id===region)||REGIONS[1];
 const missions=launches.filter(x=>x.region===r.id);
 const selected=missions.find(x=>x.id===id)||missions[0]||null;
 const regions=REGIONS.map(p=>({id:p.id,name:p.name,subtitle:p.subtitle,coast:p.coast,
  lat:p.lat,lon:p.lon,timezone:p.timezone,description:p.description,
  authority:p.authority,access:p.access,specialist:p.specialist||null,
  launches:launches.filter(m=>m.region===p.id),feedState:'ok',feedTruncated:false}));
 const weather=selected?.netPrecision==='minute'?
  {level:'assessed',label:'Fixture local NWS surface reference',
   detail:'Model reference only, not rocket visibility or launch GO',
   places:[{name:'Public waterfront',status:'ok',cloudStatus:'ok',cloudCoverPercent:40,
    assessment:{label:'Sky-cover reference only',detail:'Not a visibility guarantee'},
    period:{shortForecast:'Partly cloudy'}}]}:
  {level:'unknown',label:'No precise target for a forecast',places:[],
   detail:'No launch-time NWS grid could be matched'};
 return {
  ok:true,generatedAt:stamp(),scheduleCheckedAt:stamp(),
  scheduleFreshness:stale?'stale':'recent',scheduleComplete:true,
  scheduleSource:'fixture-no-live-source',scheduleWarning:stale?'Schedule overdue':null,
  selectedRegion:r.id,selectedLaunchId:selected?.id||null,selectedLaunch:selected,
  nationalNext:launches[0],
  region:{id:r.id,name:r.name,subtitle:r.subtitle,coast:r.coast,
   timezone:r.timezone,description:r.description,authority:r.authority,
   access:r.access,specialist:r.specialist||null,context:r.context},
  regions,
  access:{guidance:'Public access is not verified by a launch calendar. Read official range notices.',
   sites:[{id:'source-venue',name:'Official range viewing guidance',kind:'mission-confirm',
    source:r.access,reason:'Launch-day public entry must be verified separately.',
    label:'Event-specific permission unverified',state:'mission',directionsAllowed:false}]},
  weather,launchWeather:{status:'unavailable',label:'Range weather unverified',
   detail:'No official rocket-specific flight weather or mission GO.'},
  independentReporting:{status:'unavailable',stories:[],checkedAt:null},
  mediaDesk:null,officialLaunchWeather:null,
  coverage:{partial:false,regions:6,locationIds:[1,11,12,21,25,27,143],
    checkedAt:stamp(),complete:true,freshness:stale?'stale':'recent',
    feedHealth:[{id:'primary',status:'ok'}]},
  vandenbergViewing:null,starbaseViewing:null,wallopsViewing:null
 };
}
const server=http.createServer(async(req,res)=>{
 const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/api/rocket-launch-usa'){
   if(failedSource)return send(503,{ok:false,error:'Fixture source unavailable'});
   const id=u.searchParams.get('launchId'),region=u.searchParams.get('region')||'florida';
   if(id&&!launches.some(m=>m.id===id&&m.region===region))
    return send(404,{ok:false,error:'Fixture mission no longer in bounded feed'});
   return send(200,payload(region,id,u.searchParams.get('stale')==='1'));
  }
  if(u.pathname.startsWith('/api/'))return send(503,{ok:false,error:'Fixture upstream intentionally unavailable'});
  let loc=u.pathname;
  if(loc.startsWith('/national-tools/rocket-launch-live/'))
   loc=loc.replace('/national-tools/rocket-launch-live/','/synced-national-tools/rocket-launch-live/');
  if(loc.startsWith('/national-tools/assets/'))
   loc=loc.replace('/national-tools/assets/','/synced-national-tools/assets/');
  if(loc.endsWith('/'))loc+='index.html';
  const file=path.resolve(root,'.'+loc);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const bytes=await fs.promises.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
async function localLeaflet(page){
 for(const ext of ['js','css']){
  const file=require.resolve('leaflet/dist/leaflet.'+ext);
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.'+ext,
   route=>route.fulfill({status:200,contentType:ext==='js'?'application/javascript':'text/css',
    body:fs.readFileSync(file)}));
 }
}
const whenReady=page=>page.waitForFunction(id=>
 document.querySelector('#rl-flight-desk')?.dataset.launchId===id,A,{timeout:15000});
(async()=>{
 let browser;
 const report={cases:[],screenshots:[],errors:[],note:'Mock sources/tiles only. No live forecast, public entry or launch GO is proven.'};
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,
   headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const base='http://127.0.0.1:'+server.address().port+'/national-tools/rocket-launch-live/';
  for(const v of [{name:'phone360',width:360,height:780},{name:'phone390',width:390,height:844},
    {name:'tablet768',width:768,height:1024},{name:'desktop1440',width:1440,height:900}]){
   const context=await browser.newContext({viewport:{width:v.width,height:v.height},
    reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await localLeaflet(page);
   await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
   await page.route('https://*.basemaps.cartocdn.com/**',route=>route.abort());
   const response=await page.goto(base+'?region=florida&launchId='+A,{waitUntil:'domcontentloaded'});
   assert(response.status()===200,v.name+' public HTML HTTP failed');
   await whenReady(page);
   assert((await page.locator('#rl-flight-mission').innerText()).includes('Fixture Florida rocket A'),
    v.name+' hero mission not bound');
   assert((await page.locator('#rl-mission-name').innerText()).includes('Fixture Florida rocket A'),
    v.name+' original detail drift');
   assert((await page.locator('#rl-flight-headline').innerText()).includes('not cleared'),
    v.name+' false travel GO');
   assert((await page.locator('#rl-flight-sky').innerText()).includes('not rocket GO'),
    v.name+' weather described as launch GO');
   assert(await page.locator('#rl-flight-mission-select').isEnabled(),
    v.name+' hero mission picker disabled');
   assert(await page.locator('#rl-flight-locate').isEnabled(),
    v.name+' mapped mission focus disabled');
   const first=await page.locator('#rl-flight-headline').evaluate(n=>n.getBoundingClientRect().top);
   assert(first>=0 && first<v.height,v.name+' first useful answer below phone viewport '+first);
   await page.locator('#rl-flight-mission-select').selectOption(B);
   await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,B);
   assert((await page.locator('#rl-flight-headline').innerText()).includes('too uncertain'),
    v.name+' day-only mission falsely travel-ready');
   assert((await page.locator('#rl-flight-time').innerText()).includes('time TBD'),
    v.name+' date-only misused as a launch hour');
   assert((await page.locator('#rl-launch-select').inputValue())===B,
    v.name+' original mission picker drift');
   assert((await page.locator('#rl-flight-origin').innerText()).includes('Approximate'),
    v.name+' missing pad GPS described as exact');
   assert(new URL(await page.url()).searchParams.get('launchId')===B,
    v.name+' deep-link selection drift');
   const altShot=v.name+'-flight-desk-B.png';
   await page.locator('.rl-hero').screenshot({path:path.join(out,altShot),animations:'disabled'});
   report.screenshots.push(altShot);
   await page.locator('#rl-launch-select').selectOption(A);
   await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,A);
   assert((await page.locator('#rl-flight-mission-select').inputValue())===A,
    v.name+' reversing native picker did not return A');
   await page.locator('#rl-flight-locate').click();
   await page.waitForFunction(()=>document.activeElement?.id==='rl-coast-map'||
     document.activeElement?.classList.contains('rl-region-btn'));
   assert(await page.locator('#rl-coast-map .rocket-origin-icon').count()>0,
    v.name+' mission rocket markers not mapped');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-
     document.documentElement.clientWidth);
   assert(overflow<=2,v.name+' horizontal overflow '+overflow);
   const computed=await page.locator('#rl-flight-headline').evaluate(n=>parseFloat(getComputedStyle(n).fontSize));
   assert(computed>=14,v.name+' mission decision body too small '+computed);
   assert(errors.length===0,v.name+' JS exception '+errors.join('; '));
   const shot=v.name+'-flight-desk-A.png';
   await page.locator('.rl-hero').screenshot({path:path.join(out,shot),animations:'disabled'});
   report.screenshots.push(shot);
   // Small inspection frames in CI logs let code reviewers actually inspect
   // the viewport composition, not only a success flag or JSON metrics.
   if(['phone390','desktop1440'].includes(v.name)){
     const preview=await page.locator('.rl-hero').screenshot({type:'jpeg',quality:28,animations:'disabled'});
     console.log('ROCKET_FLIGHT_DESK_PREVIEW_'+v.name+'='+preview.toString('base64'));
   }
   report.cases.push({viewport:v.name,firstAnswerTop:first,
    mission:'A-B-A + native/hero sync',map:'focused',overflowPx:overflow,
    fontPx:computed,jsErrors:0});
   await context.close();
  }
  failedSource=true;
  const errCtx=await browser.newContext({viewport:{width:390,height:844}});
  const error=await errCtx.newPage();await localLeaflet(error);
  await error.goto(base,{waitUntil:'domcontentloaded'});
  await error.waitForFunction(()=>document.querySelector('#rl-flight-headline')?.textContent.includes('unavailable'));
  assert(await error.locator('#rl-flight-locate').isDisabled(),'Source outage retained stale rocket focus');
  assert(await error.locator('#rl-flight-mission-select').isDisabled(),'Source outage retained launch menu');
  report.cases.push({case:'source-outage',status:'unavailable; no source invented'});
  await errCtx.close();failedSource=false;
  const noCtx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const no=await noCtx.newPage();
  await no.goto(base,{waitUntil:'domcontentloaded'});
  assert((await no.locator('#rl-flight-source').innerText()).includes('Source status is unavailable'),
   'No-JS HTML implies current rocket status');
  assert((await no.locator('.rl-flight-noscript a').count())===6,
   'No-JS lost the six region guides');
  assert(await no.locator('#rl-flight-mission-select').isDisabled(),
   'No-JS invented a scheduled mission');
  report.cases.push({case:'no-JS',guideLinks:6,safetyStatus:'unverified'});
  await noCtx.close();
  const photoCtx=await browser.newContext({viewport:{width:390,height:844}});
  const photo=await photoCtx.newPage();await localLeaflet(photo);
  await photo.route('https://media.defense.gov/**',route=>route.abort());
  await photo.goto(base+'?region=florida&launchId='+A,{waitUntil:'domcontentloaded'});
  await whenReady(photo);
  await photo.waitForFunction(()=>document.querySelector('.rl-hero')?.dataset.photoUnavailable==='true',{timeout:10000});
  assert(await photo.locator('.rl-hero-photo').isHidden(),'Broken archival photo left a giant blank hero panel');
  assert((await photo.locator('#rl-flight-mission').innerText()).includes('Fixture Florida'),
   'Photo outage hides answer');
  report.cases.push({case:'image-outage',primaryAnswer:'preserved'});
  await photoCtx.close();
 }catch(e){report.errors.push(e.stack||String(e));}
 finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
