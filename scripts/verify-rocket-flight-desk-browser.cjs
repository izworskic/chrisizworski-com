#!/usr/bin/env node
'use strict';
// Fixture-based national Experience OS browser QA. Faked schedules are NOT
// evidence of an actual launch, public range access, or a good forecast.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {REGIONS,regionalAccess}=require('../lib/rocket-launch-usa');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(__dirname,'../artifacts/rocket-flight-desk-qa');
fs.mkdirSync(out,{recursive:true});
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const D='44444444-4444-4444-8444-444444444444';
const E='55555555-5555-4555-8555-555555555555';
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
  detail:'Not launch GO'},status:'To Be Confirmed'},
 {id:D,region:'texas',name:'Fixture non-default Starship D',net:'2026-11-24T13:00:00Z',
  netPrecision:'minute',rocket:'Starship',provider:'Fixture Operator',pad:'Starbase pad',
  lat:25.997,lon:-97.157,scheduleConfidence:{level:'medium',label:'Target published',
  detail:'Not launch GO'},status:'To Be Confirmed'}
];
const wallopsFixture={id:E,region:'virginia',name:'Fixture Wallops research rocket E',
 net:new Date(Date.now()+3*86400000).toISOString(),netPrecision:'minute',rocket:'Terrier Improved Malemute',
 provider:'Fixture NASA',pad:'Wallops restricted launch range',lat:37.84,lon:-75.48,
 scheduleConfidence:{level:'medium',label:'Target published',detail:'Fixture target, not a launch event opening'},
 status:'To Be Confirmed'};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
let failedSource=false,removedMission=null;
let floridaRich=false,floridaMismatch=false,floridaNpsClosure=false;
let wallopsScenario=false;
const activeLaunches=()=>wallopsScenario?[...launches,wallopsFixture]:launches;
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const stamp=()=>new Date(Date.now()-60000).toISOString();
function payload(region='florida',id=null,stale=false){
 const r=REGIONS.find(x=>x.id===region)||REGIONS[1];
 const missions=activeLaunches().filter(x=>x.region===r.id);
 const picked=missions.find(x=>x.id===id)||missions[0]||null;
 const selected=floridaRich&&r.id==='florida'&&picked?{...picked,locationId:27}:picked;
 const regions=REGIONS.map(p=>({id:p.id,name:p.name,subtitle:p.subtitle,coast:p.coast,
  lat:p.lat,lon:p.lon,timezone:p.timezone,description:p.description,
  authority:p.authority,access:p.access,specialist:p.specialist||null,
  launches:activeLaunches().filter(m=>m.region===p.id),feedState:'ok',feedTruncated:false}));
 const weather=selected?.netPrecision==='minute'?
  {level:'assessed',label:'Fixture local NWS surface reference',
   detail:'Model reference only, not rocket visibility or launch GO',
   places:[{name:'Public waterfront',status:'ok',cloudStatus:'ok',cloudCoverPercent:40,
    assessment:{level:'fair',label:'Sky-cover reference only',detail:'Not a visibility guarantee'},
    updatedAt:stamp(),period:{shortForecast:'Partly cloudy',
     startTime:new Date(Date.parse(selected.net)-30*60000).toISOString(),
     endTime:new Date(Date.parse(selected.net)+30*60000).toISOString()}}]}:
  {level:'unknown',label:'No precise target for a forecast',places:[],
   detail:'No launch-time NWS grid could be matched'};
 const floridaSites=[
  {id:'space-view',name:'Space View Park',address:'8 Broad Street, Titusville, FL',kind:'public-check',
   state:'candidate',label:'Public viewing candidate',
   source:'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/SpaceView',
   directionsAllowed:true,reason:'Public riverfront site; parking for this mission unverified.'},
  {id:'rotary',name:'Rotary Riverfront Park',address:'4141 S Washington Ave, Titusville, FL',kind:'public-check',
   state:'candidate',label:'Public viewing candidate',
   source:'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/RotaryRiverfront',
   directionsAllowed:true,reason:'County public launch viewing site; parking unverified.'},
  {id:'jetty',name:'Jetty Park',address:'9035 Campground Circle, Cape Canaveral, FL',kind:'port-hours',
   state:'verify',label:'Launch-day park hours unverified',
   source:'https://www.portcanaveral.com/recreation/jetty-park',
   directionsAllowed:true,reason:'Pass and park hours may change.'},
  {id:'playalinda-south',name:'Playalinda Beach, lots 4–7',address:'Playalinda Beach Road, Titusville, FL',
   kind:'conditional-nps',state:'verify',label:'Mission entry unverified',
   source:'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm',
   directionsAllowed:false,reason:'Launch security may close lots.'},
  {id:'ksc-visitor',name:'Kennedy Space Center Visitor Complex',address:'Space Commerce Way, Merritt Island, FL',
   kind:'ticketed',state:'verify',label:'Mission admission unverified',
   source:'https://www.kennedyspacecenter.com/launches-and-events/',
   directionsAllowed:false,reason:'Ordinary admission not a launch viewing ticket.'}
 ];
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
  access:wallopsScenario&&r.id==='virginia'?regionalAccess(r,selected):{
   guidance:'Public access is not verified by a launch calendar. Read official range notices.',
   sites:floridaRich&&r.id==='florida'?floridaSites:[{id:'source-venue',name:'Official range viewing guidance',kind:'mission-confirm',
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
   if(id&&(id===removedMission||!activeLaunches().some(m=>m.id===id&&m.region===region)))
    return send(404,{ok:false,error:'Fixture mission no longer in bounded feed'});
   return send(200,payload(region,id,u.searchParams.get('stale')==='1'));
  }
  if(u.pathname==='/api/space-coast-launch'){
   const id=u.searchParams.get('launchId');
   const found=launches.find(m=>m.id===id&&m.region==='florida');
   if(!found)return send(404,{ok:false,error:'No matching Florida mission'});
   const selected=floridaMismatch?B:id;
   return send(200,{ok:true,selectedLaunchId:selected,next:{...found,id:selected},
    scheduleFreshness:'recent',accessSource:{verified:true,checkedAt:stamp()},
    floridaViewingDeck:{missionId:selected,facility:'kennedy',
      cards:[{id:'space-view'},{id:'rotary'}],
      playalinda:{npsVerified:true,excluded:floridaNpsClosure},
      ksc:{officialEventMatched:false}},
    viewpoints:[
      {id:'space-view',name:'Space View Park',area:'Titusville',level:'candidate',
       label:'Public site',reason:'County riverfront; parking unverified.',address:'8 Broad Street, Titusville, FL',
       source:'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/SpaceView'},
      {id:'rotary',name:'Rotary Riverfront Park',area:'Titusville',level:'candidate',
       label:'Public site',reason:'County park; parking unverified.',address:'4141 S Washington Ave, Titusville, FL',
       source:'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/RotaryRiverfront'},
      {id:'playalinda-south',name:'Playalinda Beach, lots 4–7',area:'Canaveral National Seashore',
       level:floridaNpsClosure?'closed':'unknown',
       label:floridaNpsClosure?'Closed by NPS':'Gate unverified',
       reason:floridaNpsClosure?'Active NPS closure affects these lots.':'NASA can close the park.',
       source:'https://www.nps.gov/cana/planyourvisit/conditions.htm'}],
    kscViewing:{state:'unverified',sourceUrl:null}
   });
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
   await page.route('https://unpkg.com/**',route=>route.abort()); // Test same-origin Leaflet.
   await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
   await page.route('https://*.basemaps.cartocdn.com/**',route=>route.abort());
   const response=await page.goto(base+'?region=florida&launchId='+A,{waitUntil:'domcontentloaded'});
   assert(response.status()===200,v.name+' public HTML HTTP failed');
   await page.waitForFunction(()=>document.querySelector('#rl-coast-map')?.dataset.mapState==='ready');
   assert(await page.locator('#rl-coast-map .leaflet-control-zoom-in').count()===1,v.name+' local map controls missing');
   await whenReady(page);
   // The new first-screen answer is the schedule. The deeper flight desk only
   // earns an exposure event once the visitor scrolls to it.
   const frontTop=await page.locator('#rl-front-next-title').evaluate(n=>
     n.getBoundingClientRect().top+window.scrollY);
   assert(frontTop>=0 && frontTop<v.height,
     v.name+' next listed launch missing from first viewport '+frontTop);
   await page.locator('#rl-flight-desk').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>window.vaq?.some(a=>a[0]==='event'&&a[1]?.name==='Rocket Flight Desk Exposed'));
   const metrics=()=>page.evaluate(()=>window.vaq?.filter(a=>a[0]==='event').map(a=>a[1])||[]);
   let events=await metrics();
   assert(events.filter(a=>a.name==='Rocket Flight Desk Exposed').length===1,v.name+' initial exposure missing/duplicated');
   assert(!events.some(a=>a.name==='Rocket Mission Selected'),v.name+' auto-selected launch falsely counted as visitor choice');
   assert(await page.locator('script[src="/_vercel/insights/script.js"]').count()===1,v.name+' Vercel pageview loader missing');
   assert((await page.locator('#rl-flight-mission').innerText()).includes('Fixture Florida rocket A'),
    v.name+' hero mission not bound');
   assert((await page.locator('#rl-mission-name').innerText()).includes('Fixture Florida rocket A'),
    v.name+' original detail drift');
   assert((await page.locator('#rl-flight-headline').innerText()).includes('Now find your spot'),
    v.name+' false travel GO');
   assert(/forecast|uncertain|subject to change/i.test(await page.locator('#rl-flight-sky').innerText()),
    v.name+' weather described as launch GO');
   assert(await page.locator('#rl-flight-mission-select').isEnabled(),
    v.name+' hero mission picker disabled');
   assert(await page.locator('#rl-flight-locate').isEnabled(),
    v.name+' mapped mission focus disabled');
   assert((await page.locator('#rl-flight-next-title').innerText()).includes('Find a public place to watch'),
    v.name+' Foundry next evidence is not an access check for precise Florida mission');
   assert((await page.locator('#rl-flight-next-link').getAttribute('href'))==='/national-tools/space-coast-launch/?launchId='+A+'&via=rocket-foundry&stage=access',
    v.name+' Foundry source handoff misroutes the selected coast');
   // Above-the-fold next mission was verified before scrolling to the detail desk.
   assert((await page.locator('#rl-front-next-title').innerText()).includes('Fixture Florida rocket A'),
    v.name+' schedule-first next launch not linked to source fixture');
   await page.locator('#rl-flight-mission-select').selectOption(B);
   await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,B);
   events=await metrics();
   assert(events.filter(a=>a.name==='Rocket Mission Selected'&&a.data.surface==='flight_desk').length===1,
     v.name+' hero choice did not emit one committed selection');
   assert((await page.locator('#rl-flight-headline').innerText()).includes('still taking shape'),
    v.name+' day-only mission falsely travel-ready');
   assert((await page.locator('#rl-flight-time').innerText()).includes('liftoff time to come'),
    v.name+' date-only misused as a launch hour');
   assert((await page.locator('#rl-flight-next-title').innerText()).includes('Wait for a more precise liftoff time'),
    v.name+' date-only next action did not change to a timing verification');
   assert((await page.locator('#rl-flight-next-link').getAttribute('href'))===REGIONS.find(x=>x.id==='florida').authority,
    v.name+' a tentative launch target must hand off to the official range authority');
   assert((await page.locator('#rl-launch-select').inputValue())===B,
    v.name+' original mission picker drift');
   assert((await page.locator('#rl-flight-origin').innerText()).includes('General launch area'),
    v.name+' missing pad GPS described as exact');
   assert(new URL(await page.url()).searchParams.get('launchId')===B,
    v.name+' deep-link selection drift');
   const altShot=v.name+'-flight-desk-B.png';
   await page.locator('.rl-hero').screenshot({path:path.join(out,altShot),animations:'disabled'});
   report.screenshots.push(altShot);
   await page.locator('#rl-launch-select').selectOption(A);
   await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,A);
   events=await metrics();
   assert(events.filter(a=>a.name==='Rocket Mission Selected'&&a.data.surface==='native_picker').length===1,
     v.name+' reverse native choice was not attributed correctly');
   assert((await page.locator('#rl-flight-mission-select').inputValue())===A,
    v.name+' reversing native picker did not return A');
   assert((await page.locator('#rl-flight-next-title').innerText()).includes('Find a public place to watch'),
    v.name+' next-check answer did not reverse from B to A');
   await page.locator('#rl-flight-locate').click();
   await page.waitForFunction(()=>window.vaq?.some(a=>a[0]==='event'&&a[1]?.name==='Rocket Map Engaged'));
   events=await metrics();
   assert(events.some(a=>a.name==='Rocket Map Engaged'&&a.data.surface==='flight_desk'&&
     a.data.outcome==='pad_marker_focused'),v.name+' rocket-map focus not measured');
   await page.locator('#rl-flight-next-link').evaluate(a=>{
     a.addEventListener('click',e=>e.preventDefault(),{once:true});a.click();
   });
   events=await metrics();
   assert(events.some(a=>a.name==='Rocket Foundry Handoff Attempt'&&
     a.data.destination==='regional_guide'&&a.data.stage==='access'),
     v.name+' new primary Foundry attempt was not distinguished from older links');
   assert(!events.some(a=>a.name==='Rocket Foundry Mission Restored'),
     v.name+' a click alone cannot certify mission restoration');
   assert(!JSON.stringify(events).includes(A)&&!JSON.stringify(events).includes(B),
     v.name+' analytics leaked a mission identifier');
   assert(events.filter(a=>a.name==='Rocket Flight Desk Exposed').length===1,
     v.name+' exposure counted again on mission updates');
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
   if(['phone360','phone390','tablet768','desktop1440'].includes(v.name)){
     const preview=await page.locator('.rl-hero').screenshot({type:'jpeg',quality:28,animations:'disabled'});
     console.log('ROCKET_FLIGHT_DESK_PREVIEW_'+v.name+'='+preview.toString('base64'));
   }
   report.cases.push({viewport:v.name,firstAnswerTop:frontTop,
    mission:'A-B-A + native/hero sync',map:'focused',overflowPx:overflow,
    fontPx:computed,jsErrors:0});
   await context.close();
  }
  // Genuine touchscreen pinch gestures, not only map-control clicks.
  for(const width of [360,390]){
   const context=await browser.newContext({viewport:{width,height:800},
     deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await localLeaflet(page);
   await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
   await page.route('https://*.basemaps.cartocdn.com/**',route=>route.abort());
   await page.goto(base+'?region=florida&launchId='+A,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#rl-map-expand')?.disabled===false&&
     document.querySelector('#rl-coast-map')?.dataset.mapState==='ready'&&
     document.querySelector('#rl-coast-map')?.dataset.zoom,{timeout:15000});
   assert(await page.locator('#rl-coast-map .leaflet-map-pane').count()===1,
     width+' the real Leaflet map DOM did not mount');
   assert(await page.locator('#rl-coast-map .leaflet-control-zoom-in').count()===1,
     width+' zoom control missing while CDN blocked');
   assert(!(await page.locator('#rl-coast-map').innerText()).includes('Loading the coastal atlas'),
     width+' still shows loading placeholder');
   const map=page.locator('#rl-coast-map');
   await map.scrollIntoViewIfNeeded();
   const box=await map.boundingBox();
   assert(box&&box.height>=330,width+' map too short for finger gestures');
   const css=await map.evaluate(el=>({
     touch:getComputedStyle(el).touchAction,
     overscroll:getComputedStyle(el).overscrollBehavior
   }));
   assert(css.touch==='none',width+' page still owns map pinch');
   assert(css.overscroll.includes('contain'),width+' map overscroll leaks to page');
   const cdp=await context.newCDPSession(page);
   async function pinch(){
     const bounds=await map.boundingBox();
     assert(bounds&&bounds.width>260,'Map bounds missing');
     const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
     const fingers=d=>[
       {x:x-d/2,y,id:1,radiusX:3,radiusY:3,force:1},
       {x:x+d/2,y,id:2,radiusX:3,radiusY:3,force:1}
     ];
     const scrollBefore=await page.evaluate(()=>window.scrollY);
     const zoomBefore=Number(await map.getAttribute('data-zoom'));
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(60)});
     for(const d of [85,110,135,165,195,225]){
       await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(d)});
       await page.waitForTimeout(40);
     }
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     await page.waitForTimeout(420);
     const zoomAfter=Number(await map.getAttribute('data-zoom'));
     const scrollAfter=await page.evaluate(()=>window.scrollY);
     assert(zoomAfter>zoomBefore,width+' Leaflet did not zoom from a two-finger pinch ('+
       zoomBefore+' to '+zoomAfter+')');
     assert(Math.abs(scrollAfter-scrollBefore)<=3,width+
       ' whole page moved '+(scrollAfter-scrollBefore)+'px during pinch');
     return {zoomBefore,zoomAfter,pageScrollDelta:scrollAfter-scrollBefore};
   }
   const embedded=await pinch();
   await page.locator('#rl-map-expand').click();
   assert((await page.locator('#rl-map-wrap').getAttribute('data-expanded'))==='true',
     width+' map did not expand');
   assert(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow)==='hidden',
     width+' full map did not lock page scroll');
   const fullBounds=await map.boundingBox();
   assert(fullBounds&&fullBounds.height>500,width+' expanded map too short');
   const full=await pinch();
   const controlSize=await page.locator('#rl-coast-map .leaflet-control-zoom a').first()
     .evaluate(el=>el.getBoundingClientRect().height);
   assert(controlSize>=44,width+' zoom buttons too small '+controlSize);
   const screenshot='phone'+width+'-touch-expanded.png';
   await page.locator('#rl-map-wrap').screenshot({path:path.join(out,screenshot),animations:'disabled'});
   report.screenshots.push(screenshot);
   await page.keyboard.press('Escape');
   assert((await page.locator('#rl-map-wrap').getAttribute('data-expanded'))==='false',
     width+' Escape did not close map');
   assert(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow)!=='hidden',
     width+' page still scroll-locked after Escape');
   await page.locator('#rl-map-expand').click();
   await page.locator('#rl-map-details').click();
   assert(new URL(page.url()).hash==='#rl-next-title',
     width+' explicit mission details link not functional');
   assert(await page.evaluate(()=>!document.documentElement.classList.contains('rl-map-fullscreen')),
     width+' full-screen leaked after navigation');
   assert(errors.length===0,width+' touch JS errors '+errors.join('; '));
   report.cases.push({case:'phone'+width+'-physical-pinch',embedded,full,
     exit:'Escape and mission link',jsErrors:0});
   await cdp.detach();
   await context.close();
  }
  // Verify the actual visitor answer in the rendered national page.
 floridaRich=true;
 for(const scenario of [{name:'florida-verified',closed:false,mismatch:false},
  {name:'florida-closed',closed:true,mismatch:false},
  {name:'florida-wrong-mission',closed:true,mismatch:true}]){
  floridaNpsClosure=scenario.closed;floridaMismatch=scenario.mismatch;
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();await localLeaflet(page);
  await page.route('https://*.basemaps.cartocdn.com/**',route=>route.abort());
  await page.goto(base+'?region=florida&launchId='+A,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,A);
  await page.waitForFunction(mismatch=>{
    const text=document.querySelector('#rl-access-answer')?.textContent||'';
    return mismatch?text.includes('another mission, so no access status was adopted'):
      text.includes('Florida notices checked.');
  },scenario.mismatch,{timeout:18000});
  const summary=await page.locator('#rl-access-summary').innerText();
  assert(summary.includes('Titusville')&&summary.includes('Space View Park'),
    scenario.name+' still substitutes an engine description for an answer');
  assert((await page.locator('#rl-flight-next-link').getAttribute('href'))==='#rl-viewing',
    scenario.name+' should compare choices on national tool');
  assert(!(await page.locator('#rl-access-grade').innerText()).includes('engine'),
    scenario.name+' leaked technical implementation as visitor status');
  if(scenario.mismatch){
   assert(!(await page.locator('#rl-access-grade').innerText()).includes('NPS restriction'),
    'mission-mismatched beach closure leaked from another launch');
   assert((await page.locator('#rl-access-answer').innerText()).includes('another mission, so no access status was adopted'),
    'wrong mission must remain unresolved');
  }else if(scenario.closed){
   assert((await page.locator('#rl-access-grade').innerText()).includes('NPS restriction'),
    'NPS closure did not control Florida access response');
   assert((await page.locator('#rl-sites .rl-site-card[data-state="closed"]').count())>=1,
    'closed Playalinda lot group was omitted');
  }else{
   assert((await page.locator('#rl-access-grade').innerText()).includes('check access'),
    'source-checked park reported as open without mission confirmation');
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=2,scenario.name+' overflow '+overflow);
  const screenshot=scenario.name+'-access-decision.png';
  await page.locator('.rl-decision-grid').screenshot({path:path.join(out,screenshot),animations:'disabled'});
  report.screenshots.push(screenshot);
  report.cases.push({case:scenario.name,evidence:scenario.mismatch?'mismatch-discarded':
    scenario.closed?'official-closure-applied':'entry-remains-unverified',overflowPx:overflow});
  await context.close();
 }
 floridaRich=false;floridaNpsClosure=false;floridaMismatch=false;
 // Full browser handoff: a non-default national selection must be confirmed
  // from the regional app's OWN loaded schedule; then return to national and
  // reject a removed ID. Synthetic fixture values are never live launch facts.
  for(const v of [{name:'phone390',width:390,height:844},
    {name:'desktop1440',width:1440,height:900}]){
    const context=await browser.newContext({viewport:{width:v.width,height:v.height},
      reducedMotion:'reduce'});
    const page=await context.newPage();
    await localLeaflet(page);
    await page.route('https://*.basemaps.cartocdn.com/**',route=>route.abort());
    await page.route('https://tile.openstreetmap.org/**',route=>route.abort());
    const roundTripErrors=[];
    page.on('pageerror',error=>roundTripErrors.push(error.message));
    await page.goto(base+'?region=texas&launchId='+C,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,C);
    await page.locator('#rl-flight-mission-select').selectOption(D);
    await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,D);
    const handoff=await page.locator('#rl-flight-next-link').getAttribute('href');
    assert(handoff==='/starbase-rocket-launch-viewing/?launchId='+D+'&via=rocket-foundry&stage=access',
      v.name+' national next action omitted exact non-default mission');
    await Promise.all([
      page.waitForURL(u=>u.pathname==='/starbase-rocket-launch-viewing/'&&
        u.searchParams.get('launchId')===D,{timeout:15000}),
      page.locator('#rl-flight-next-link').click()
    ]);
    await page.locator('#rocket-foundry-receipt[data-restoration="restored"]')
      .waitFor({state:'visible',timeout:15000});
    assert((await page.locator('#sb-mission-name').innerText()).includes('non-default Starship D'),
      v.name+' destination receipt disagrees with regional loaded mission');
    const backlink=await page.locator('#sb-national-link').getAttribute('href');
    assert(new URL(backlink,base).searchParams.get('launchId')===D,
      v.name+' return link did not preserve exact mission D');
    await page.screenshot({path:path.join(out,v.name+'-regional-restored.png'),
      animations:'disabled'});
    report.screenshots.push(v.name+'-regional-restored.png');
    await page.locator('#sb-national-link').click();
    await page.waitForURL(u=>u.pathname==='/national-tools/rocket-launch-live/'&&
      u.searchParams.get('launchId')===D,{timeout:15000});
    await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,D);
    assert((await page.locator('#rl-flight-mission').innerText()).includes('non-default Starship D'),
      v.name+' returned national flight desk silently reverted to C');
    removedMission=D;
    try{
      await page.goto(new URL(handoff,base).href,{waitUntil:'domcontentloaded'});
      await page.locator('#rocket-foundry-receipt[data-restoration="unavailable"]')
        .waitFor({state:'visible',timeout:15000});
      assert((await page.locator('#sb-mission-name').innerText()).includes('Fixture Texas Starship C'),
        v.name+' fixture failed to exercise regional fallback to a NEW mission');
      assert((await page.locator('#rocket-foundry-receipt').innerText()).includes('NEW selection'),
        v.name+' fallback failed to explain removed mission');
      const overflow=await page.evaluate(()=>
        document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert(overflow<=2,v.name+' regional receipt horizontal overflow '+overflow);
    }finally{removedMission=null;}
    assert(roundTripErrors.length===0,v.name+' linked journey JS errors: '+
      roundTripErrors.join('; '));
    report.cases.push({case:v.name+'-nondefault-regional-roundtrip',
      stage:'national D → loaded Starbase D → national D → removed D explicitly unavailable',
      restoredFrom:'actual loaded fixture response',removedId:'unavailable',overflowPx:0});
    await context.close();
  }
  // Schedule-first UI: mobile + desktop visual evidence, filtering, local
  // precision labels and end-to-end mission selection from the new roster.
  for(const view of [{name:'roster-phone390',width:390,height:844},
    {name:'roster-desktop1440',width:1440,height:900}]){
    const context=await browser.newContext({viewport:{width:view.width,height:view.height},
      reducedMotion:'reduce'});
    const page=await context.newPage(),pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    await localLeaflet(page);
    await page.goto(base+'?region=florida&launchId='+A,{waitUntil:'domcontentloaded'});
    await whenReady(page);
    assert(await page.locator('#rl-front-mission-name').count()===0,
      view.name+' unexpected alternate roster markup');
    assert((await page.locator('#rl-front-next-title').innerText()).includes('Fixture Florida rocket A'),
      view.name+' next launch was not populated from selected source');
    assert(await page.locator('.rl-front-mission').count()===4,
      view.name+' expected four fixture missions in national roster');
    assert((await page.locator('.rl-front-mission').nth(1).innerText()).includes('Launch time TBD'),
      view.name+' date-only Florida target was falsely given an exact hour');
    const x=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
    assert(x<=2,view.name+' schedule-first layout horizontal overflow '+x);
    const shot=view.name+'-schedule-first.png';
    await page.locator('#launch-schedule').screenshot({
      path:path.join(out,shot),animations:'disabled'});
    report.screenshots.push(shot);
    const designPreview=await page.locator('#launch-schedule').screenshot({
      type:'jpeg',quality:32,animations:'disabled'});
    console.log('ROCKET_SCHEDULE_PREVIEW_'+view.name+'='+designPreview.toString('base64'));
    await page.locator('#rl-front-search-input').fill('Starship');
    assert(await page.locator('.rl-front-mission').count()===2,
      view.name+' rocket-name search failed');
    const first=page.locator('.rl-front-mission').first();
    await first.focus();
    await first.press('Enter');
    await page.waitForFunction(id=>document.querySelector('#rl-flight-desk')?.dataset.launchId===id,C);
    const visibleAccess=await page.locator('#rl-access-decision').evaluate(n=>{
      const r=n.getBoundingClientRect();return r.top<window.innerHeight&&r.bottom>0;
    });
    assert(visibleAccess,view.name+' selecting a mission must land on the public viewing decision');
    assert((await page.locator('#rl-launch-select').inputValue())===C,
      view.name+' roster choice failed to update existing mission selector');
    assert(new URL(await page.url()).searchParams.get('region')==='texas',
      view.name+' roster choice failed to update deep-link region');
    await page.locator('#rl-front-region-filter').selectOption('florida');
    assert(await page.locator('.rl-front-mission').count()===0,
      view.name+' region filter did not intersect search correctly');
    await page.locator('#rl-front-search-input').fill('');
    assert(await page.locator('.rl-front-mission').count()===2,
      view.name+' clearing search did not restore Florida list');
    await page.locator('.rl-front-window [data-window="10"]').click();
    assert((await page.locator('.rl-front-window [data-window="10"]')
      .getAttribute('aria-pressed'))==='true',
      view.name+' date-window control not activated');
    assert(pageErrors.length===0,view.name+' new roster JS errors: '+pageErrors.join('; '));
    report.cases.push({case:view.name,launchRows:4,search:'Starship matched 2',
      keyboardSelection:'C via shared mission pipeline',overflowPx:x});
    await context.close();
  }

  // The viewer asks WHERE, not which policy engine owns access. Test real
  // published public places in the mission decision across desktop & phone.
  wallopsScenario=true;
  try {
    for(const v of [{name:'wallops-map-phone390',width:390,height:844},
      {name:'wallops-map-desktop1440',width:1440,height:900}]){
      const context=await browser.newContext({viewport:{width:v.width,height:v.height},
        reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await localLeaflet(page);
      await page.goto(base+'?region=virginia&launchId='+E,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(id=>
        document.querySelector('#rl-flight-desk')?.dataset.launchId===id,E);
      await page.waitForFunction(()=>
        document.querySelectorAll('#rl-access-quick .rl-access-map').length===3);
      const summary=await page.locator('#rl-access-summary').innerText();
      assert(summary.includes('Wallops viewing places'),v.name+' still shows abstract NASA policy');
      const quick=await page.locator('#rl-access-quick').innerText();
      for(const name of ['NASA Wallops Visitor Center','Robert N. Reed','Curtis Merritt Harbor']){
        assert(quick.includes(name),v.name+' is missing the public place '+name);
      }
      assert(quick.includes('NASA opens this viewing lawn only for certain launches'),v.name+' falsely implies visitor-center admission');
      const mapLinks=await page.locator('#rl-access-quick a.rl-access-map').evaluateAll(
        nodes=>nodes.map(a=>a.href));
      assert(mapLinks.length===3,v.name+' did not offer three public Google Maps places');
      const queries=mapLinks.map(h=>{const u=new URL(h);assert(u.hostname==='www.google.com'&&
        u.pathname==='/maps/search/'&&u.searchParams.get('api')==='1','Invalid Maps location link');
        return u.searchParams.get('query');
      });
      assert(queries.some(q=>q.includes('175 Chincoteague Road')),
        v.name+' NASA map link does not lead to the PUBLIC visitor center');
      assert(queries.some(q=>/Robert Reed Waterfront Park/i.test(q)),
        v.name+' town waterfront map link missing');
      assert(queries.some(q=>/Curtis Merritt Harbor/i.test(q)),
        v.name+' town harbor map link missing');
      assert(!queries.some(q=>/Fulton|main gate|launch pad|Atlantic Rd/i.test(q)),
        v.name+' map links may send someone into a restricted facility');
      assert((await page.locator('#rl-access-quick a.rl-access-official').count())===3,
        v.name+' official evidence missing for public locations');
      const overflow=await page.evaluate(()=>
        Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth));
      assert(overflow<=2,v.name+' public view cards cause horizontal overflow '+overflow);
      const shot=v.name+'-public-viewing-answer.png';
      await page.locator('#rl-access-quick').screenshot({path:path.join(out,shot),animations:'disabled'});
      report.screenshots.push(shot);
      // The next mission/region must replace both access copy and links.
      await page.locator('.rl-region-btn[data-region="florida"]').click();
      await page.waitForFunction(id=>
        document.querySelector('#rl-flight-desk')?.dataset.launchId===id,A);
      assert(await page.locator('#rl-access-quick a.rl-access-map').count()===0,
        v.name+' retained Wallops map links after switching regions');
      assert(errors.length===0,v.name+' access card JS errors: '+errors.join('; '));
      report.cases.push({case:v.name,publicSiteLinks:3,
        missionBound:true,restrictedPadDirections:0,overflowPx:overflow});
      await context.close();
    }
  } finally { wallopsScenario=false; }

  failedSource=true;
  const errCtx=await browser.newContext({viewport:{width:390,height:844}});
  const error=await errCtx.newPage();await localLeaflet(error);
  await error.route('https://unpkg.com/**',route=>route.abort());
  await error.route('https://tile.openstreetmap.org/**',route=>route.abort());
  await error.route('https://*.basemaps.cartocdn.com/**',route=>route.abort());
  await error.goto(base,{waitUntil:'domcontentloaded'});
  await error.waitForFunction(()=>document.querySelector('#rl-coast-map')?.dataset.outline==='ready',{timeout:15000});
  assert((await error.locator('#rl-coast-map').getAttribute('data-map-state'))==='ready','Source outage removed reference atlas');
  assert((await error.locator('#rl-atlas-status').innerText()).includes('launch calendar isn’t loading'),'Atlas still implied live rockets');
  assert(await error.locator('#rl-coast-map .leaflet-rocket-reference-land-pane path').count()>0,'Both tile providers blocked without coastline');
  await error.waitForFunction(()=>document.querySelector('#rl-coast-map')?.dataset.tiles==='reference-only',{timeout:12000});
  assert((await error.locator('#rl-atlas-status').innerText()).includes('coastlines are shown instead'),'No tile-failure explanation');
  await error.waitForFunction(()=>document.querySelector('#rl-flight-headline')?.textContent.includes('unavailable'));
  assert(await error.locator('#rl-flight-locate').isDisabled(),'Source outage retained stale rocket focus');
  assert((await error.locator('#rl-flight-next-title').innerText()).includes('confirm the next flight yet'),
    'Source outage claimed an available next mission or viewing clearance');
  assert(await error.locator('#rl-flight-mission-select').isDisabled(),'Source outage retained launch menu');
  assert((await error.locator('#rl-front-next-title').innerText()).includes('Launch calendar unavailable'),
   'Source outage retained old national next-launch claim');
  assert(await error.locator('#rl-front-feature-action').isDisabled(),
   'Source outage retained an active launch planner link');
  assert(await error.locator('#rl-access-quick a.rl-access-map').count()===0,
   'Source outage must not retain old mission Google Maps links');
  assert((await error.locator('#rl-access-quick').innerText()).includes('could not be verified'),
   'Source outage must explain that viewing-site access is not established');
  report.cases.push({case:'source-outage',status:'unavailable; no source invented'});
  await errCtx.close();failedSource=false;
  const noCtx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const no=await noCtx.newPage();
  await no.goto(base,{waitUntil:'domcontentloaded'});
  assert((await no.locator('#rl-flight-source').innerText()).includes('Checking the launch calendar'),
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
