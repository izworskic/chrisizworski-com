#!/usr/bin/env node
'use strict';
/* Deterministic Florida two-range integration browser QA.
 * Fixtures contain no claimed live mission, admission or weather. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {buildGeographicViewing}=require('../lib/space-coast-geo');
const {buildFloridaViewingDeck}=require('../lib/florida-viewing-deck');
const {VIEWPOINTS}=require('../lib/space-coast-decision');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(__dirname,'../artifacts/rocket-florida-facility-qa');
fs.mkdirSync(out,{recursive:true});
const CAPE='11111111-1111-4111-8111-111111111111';
const KSC='22222222-2222-4222-8222-222222222222';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const sources={
 viewing:'https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations/',
 calendar:'https://www.kennedyspacecenter.com/launches-and-events/',
 nps:'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm'
};
const launches=[
 {id:CAPE,name:'Fixture Cape launch',net:'2026-11-11T18:00:00Z',netPrecision:'minute',
   pad:'Space Launch Complex 40',location:'Cape Canaveral SFS, FL',locationId:12,
   rocket:'Falcon 9',scheduleConfidence:{level:'medium',label:'Published target',detail:'Not a commitment'}},
 {id:KSC,name:'Fixture Kennedy launch',net:'2026-11-12T18:00:00Z',netPrecision:'minute',
   pad:'Launch Complex 39A',location:'Kennedy Space Center, FL',locationId:27,
   rocket:'Falcon 9',scheduleConfidence:{level:'medium',label:'Published target',detail:'Not a commitment'}}
];
function fixture(id){
 const selected=launches.find(x=>x.id===id)||launches[0];
 const isKsc=selected.id===KSC;
 const selectedName=isKsc?'Kennedy Space Center':'Cape Canaveral Space Force Station';
 const now=Date.parse('2026-11-03T16:00:00Z');
 const accessSource={verified:false,checkedAt:null,alerts:[]};
 const viewpoints=VIEWPOINTS.map(v=>({...v,
   level:['space-view','rotary','parrish'].includes(v.id)?'candidate':'unknown',
   label:'Published candidate; launch-day access not confirmed',
   reason:'The land manager may impose capacity and event restrictions.'}));
 const launch={...selected,lat:isKsc?28.608:28.563,lon:isKsc?-80.604:-80.577};
 const geographicViewing=buildGeographicViewing(launch,viewpoints,accessSource,now,[]);
 const floridaViewingDeck=buildFloridaViewingDeck({launch,geographicViewing,viewpoints,
   accessSource,kscViewing:{state:'unverified'},scheduleFreshness:'recent'});
 const network={
  facilities:[
   {id:'kennedy',name:'Kennedy Space Center',countInFeed:1,nextLaunchId:KSC},
   {id:'cape',name:'Cape Canaveral Space Force Station',countInFeed:1,nextLaunchId:CAPE}
  ],
  selected:{
   id:isKsc?'kennedy':'cape',name:selectedName,shortName:isKsc?'Kennedy':'Cape Canaveral',pad:selected.pad,
   description:isKsc?'Restricted Kennedy LC-39 area.':'Restricted Cape SLC-40 area.',
   viewing:'Published public viewpoints are only candidates; tickets must be checked for this mission.',
   padRule:isKsc?{
    code:'gantry-excluded',
    headline:'The Gantry is not a viewing option for this pad',
    note:'KSC excludes LC-39A and LC-39B.'
   }:{
    code:'mission-confirm',
    headline:'Ticketed viewing depends on this mission',
    note:'SLC-40 does not establish ticket eligibility.'
   }
  },
  unassignedCount:0,references:sources
 };
 return {
  ok:true,selectedLaunchId:id||selected.id,generatedAt:'2026-11-03T16:00:00Z',
  scheduleCheckedAt:'2026-11-03T16:00:00Z',scheduleFreshness:'recent',
  scheduleWarning:null,upcoming:launches,next:selected,facilityNetwork:network,
  nextDecision:{schedule:selected.scheduleConfidence,
    viewingWeather:{level:'unknown',label:'Sky unverified',detail:'No forecast assertion'}},
  viewingWeatherByArea:[],viewpoints,parkAlerts:[],
  accessSource,
  mediaDesk:null,kscViewing:{state:'unverified'},
  geographicViewing,floridaViewingDeck,arrivalGuidance:{label:'Check NPS entry',level:'unknown'},
  skyComparison:{label:'No current sky comparison',level:'unknown'}
 };
}
const json=(res,status,payload)=>{
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(payload));
};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/api/space-coast-launch'){
   const requested=u.searchParams.get('launchId');
   if(requested && !launches.some(x=>x.id===requested))return json(res,404,{ok:false,error:'This mission is no longer in the current Florida launch list.'});
   return json(res,200,fixture(requested||CAPE));
  }
  if(u.pathname.startsWith('/api/'))return json(res,503,{ok:false,error:'No official source check in fixtures.'});
  let pathname=u.pathname;
  if(pathname.startsWith('/national-tools/space-coast-launch/'))
   pathname=pathname.replace('/national-tools/space-coast-launch/','/synced-national-tools/space-coast-launch/');
  if(pathname.startsWith('/national-tools/assets/'))
   pathname=pathname.replace('/national-tools/assets/','/synced-national-tools/assets/');
  if(pathname.startsWith('/national-tools/rocket-launch-live/'))
   pathname=pathname.replace('/national-tools/rocket-launch-live/','/synced-national-tools/rocket-launch-live/');
  if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  const bytes=await fs.promises.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
async function expectName(page,name){
 await page.waitForFunction(expected=>document.querySelector('#fl-origin-name')?.textContent===expected,
   name,{timeout:12000});
}
(async()=>{
 let browser;
 const report={scenarios:[],screenshots:[],errors:[]};
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const url='http://127.0.0.1:'+server.address().port+'/national-tools/space-coast-launch/';
  for(const size of [{name:'phone360',width:360,height:780},{name:'phone390',width:390,height:844},
    {name:'tablet768',width:768,height:1024},{name:'desktop1440',width:1440,height:900}]){
   const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   await page.route('**/unpkg.com/**',route=>route.abort());
   await page.route('**/tile.openstreetmap.org/**',route=>route.abort());
   await page.route('**/*.basemaps.cartocdn.com/**',route=>route.abort());
   const response=await page.goto(url+'?launchId='+KSC,{waitUntil:'domcontentloaded',timeout:30000});
   assert(response.status()===200,size.name+' Florida page HTTP');
   await expectName(page,'Kennedy Space Center');
   assert(await page.locator('#fl-origin-pad').innerText().then(x=>x.includes('39A')),size.name+' Kennedy pad');
   assert(await page.locator('#fl-origin-rule').getAttribute('data-rule')==='gantry-excluded',size.name+' Gantry excluded');
   assert(await page.locator('[data-fl-facility="kennedy"]').getAttribute('aria-pressed')==='true',size.name+' KSC selected');
   await page.waitForFunction(()=>document.querySelector('#fl-deck-primary-map')?.disabled===false);
   assert((await page.locator('#fl-deck-headline').innerText()).includes('Titusville'),size.name+' northern shoreline guidance');
   assert((await page.locator('#fl-deck-primary-name').innerText()).includes('Space View Park'),size.name+' Kennedy public site');
   assert((await page.locator('#fl-deck-ticket-rule').innerText()).includes('LC-39A'),size.name+' Gantry LC-39A safety exclusion');
   await page.locator('#fl-deck-primary-map').click();
   await page.waitForFunction(()=>document.querySelector('[data-geo-id="space-view"]')?.dataset.active==='true');
   assert((await page.locator('#geo-pad-detail').innerText()).includes('restricted'),size.name+' no pad driving');
   assert((await page.locator('#fl-deck-provenance').innerText()).includes('never a verified parking stall'),size.name+' access honesty');
   await page.locator('[data-fl-facility="cape"]').click();
   await expectName(page,'Cape Canaveral Space Force Station');
   await page.waitForFunction(id=>new URL(location.href).searchParams.get('launchId')===id,CAPE);
   assert(await page.locator('#fl-origin-pad').innerText().then(x=>x.includes('40')),size.name+' Cape pad');
   assert(await page.locator('#fl-origin-rule').getAttribute('data-rule')==='mission-confirm',size.name+' Cape ticket caveat');
   assert((await page.locator('#fl-national-mission-link').getAttribute('href')).includes(CAPE),size.name+' national link preserves mission');
   assert((await page.locator('#mission-name').innerText()).includes('Fixture Cape launch'),size.name+' downstream mission desk follows selection');
   assert((await page.locator('#fl-deck-headline').innerText()).includes('Port Canaveral'),size.name+' southern shoreline guidance');
   assert((await page.locator('#fl-deck-primary-name').innerText()).includes('Jetty Park'),size.name+' southern park');
   assert((await page.locator('#fl-deck-ticket-tag').innerText()).includes('UNVERIFIED'),size.name+' no automatic KSC ticket');
   assert((await page.locator('#fl-deck-beach-copy').innerText()).includes('30 minutes'),size.name+' NPS inbound cutoff');
   await page.locator('[data-fl-facility="kennedy"]').click();
   await expectName(page,'Kennedy Space Center');
   await page.waitForFunction(id=>new URL(location.href).searchParams.get('launchId')===id,KSC);
   assert((await page.locator('#mission-name').innerText()).includes('Fixture Kennedy launch'),size.name+' reverse mission sync');
   assert((await page.locator('#fl-deck-primary-name').innerText()).includes('Space View Park'),size.name+' reverse site sync');
   const deckShot=size.name+'-pad-to-shore.png';
   await page.locator('#florida-viewing-plan').screenshot({path:path.join(out,deckShot),animations:'disabled'});
   report.screenshots.push(deckShot);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=2,size.name+' horizontal overflow '+overflow);
   assert((await page.locator('#geo-map-status').innerText()).length>0,size.name+' GIS fallback text absent');
   assert((await page.locator('#ksc-mission-viewing').innerText()).includes('before buying tickets'),size.name+' unverified tickets warning');
   assert(errors.length===0,size.name+' JS exceptions '+errors.join('; '));
   const shot=size.name+'-florida-facilities.png';
   await page.locator('#florida-launch-facilities').screenshot({path:path.join(out,shot),animations:'disabled'});
   report.screenshots.push(shot);
   report.scenarios.push({name:size.name,facilityCycle:'A-B-A',missionLinks:'passed',siteChanges:'Kennedy to Cape to Kennedy',mapFocus:'passed',tickets:'unverified',noTileFallback:'passed',overflowPx:overflow});
   await ctx.close();
  }
  const staleContext=await browser.newContext({viewport:{width:390,height:844}});
  const stale=await staleContext.newPage();
  await stale.goto(url+'?launchId=33333333-3333-4333-8333-333333333333',{waitUntil:'domcontentloaded'});
  await expectName(stale,'Cape Canaveral Space Force Station');
  assert((await stale.locator('#fl-facility-hint').innerText()).includes('no longer'), 'Missing stale deep-link fallback warning');
  report.scenarios.push({name:'stale-deep-link',fallback:'source-invalid mission disclosed'});
  await staleContext.close();
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const staticPage=await noJs.newPage();await staticPage.goto(url,{waitUntil:'domcontentloaded'});
  assert(await staticPage.locator('#florida-launch-facilities a[href^="https://www.kennedyspacecenter.com/"]').count()===1,'No-JS KSC source missing');
  assert(await staticPage.locator('#florida-launch-facilities a[href^="https://www.nps.gov/"]').count()===1,'No-JS NPS source missing');
  assert(await staticPage.locator('[data-fl-facility]:disabled').count()===2,'No-JS buttons must not claim data');
  assert(await staticPage.locator('#fl-deck-primary-map').isDisabled(),'No-JS plan falsely claims a destination');
  assert((await staticPage.locator('#fl-deck-beach-copy').innerText()).includes('it can close or fill'),'No-JS NPS qualifier missing');
  report.scenarios.push({name:'no-js',officialSources:'present',unsupportedControls:'disabled'});
  await noJs.close();
 }catch(e){report.errors.push(e.stack||String(e))}
 finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
