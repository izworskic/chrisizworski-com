#!/usr/bin/env node
'use strict';
/**
 * Pukaskwa visitor journey Chromium QA: 390/1366, closed-bridge gate,
 * scenario changes, source outage, real licensed photos and no-JS fallback.
 * No need to access the site's production APIs or user browser location.
 */
const http=require('node:http'), fs=require('node:fs'), path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(__dirname,'../artifacts/pukaskwa-chooser');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const route=url.pathname==='/pukaskwa-national-park/'?'/pukaskwa-national-park/index.html':url.pathname;
    const file=path.resolve(root,'.'+route);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const stat=await fs.promises.stat(file).catch(()=>null);
    if(!stat?.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(await fs.promises.readFile(file));
  }catch{res.writeHead(500);res.end('test server error');}
});
const entries=[
  ['boardwalk-beach','Boardwalk Beach Trail',30,1.2,'easy','stale','2026-10-12'],
  ['hattie-cove-fire-walk','Hattie Cove Fire Walk',20,.7,'easy','source-unverified',null],
  ['beach','Beach Trail',60,2,'moderate','stale','2026-10-12'],
  ['southern-headland','Southern Headland Trail',75,2.2,'moderate','stale','2026-10-12'],
  ['manito-miikana','Manito Miikana',60,2,'moderate','stale','2026-10-12'],
  ['bimose-kinoomagewnan','Bimose Kinoomagewnan',120,3.7,'moderate','stale','2026-10-12'],
  ['combination-hike','Combination Hike',210,6.3,'moderate','unverified','2026-10-12'],
  ['white-river-bridge','White River Suspension Bridge',540,18,'difficult','closed','2026-10-22'],
];
const healthy={
  ok:true,park:'pukaskwa',monitor:{health:'ok',recent:true,checkedAt:'2026-10-31T14:40:21Z',lastSuccessAt:'2026-10-31T14:40:21Z'},
  dayHikes:entries.map(([id,name,hikingMinutes,distanceKm,difficulty,status,issuedOn])=>({
    id,name,hikingMinutes,distanceKm,difficulty,status,observations:issuedOn?[{name,status,issuedOn}]:[],
  })),
};
const unavailable={...healthy,ok:false,monitor:{health:'source-error',recent:false,lastSuccessAt:'2026-10-29T14:40:21Z'},
  dayHikes:healthy.dayHikes.map(x=>({...x,status:x.status==='closed'?'closed':'source-unverified'}))};
function check(value,message){if(!value)throw Error(message);}
(async()=>{
 let browser;
 const report={scenarios:[],screenshots:[],errors:[],photoChecks:[]};
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/pukaskwa-national-park/';
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const size of [{name:'phone390',width:390,height:844},{name:'desktop1366',width:1366,height:900}]){
    const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    page.on('pageerror',e=>report.errors.push(size.name+' pageerror: '+e.message));
    await page.route('**/api/pukaskwa-conditions',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(healthy)}));
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    check(response?.status()===200,size.name+' page status');
    await page.waitForFunction(()=>document.body.dataset.pkReady==='true',{timeout:15000});
    check(await page.locator('.pk-trail').count()===8,size.name+' static trail inventory');
    check((await page.locator('#pk-result-heading').innerText())==='Southern Headland Trail',size.name+' default headland ranking');
    check((await page.locator('#pk-result-badge').innerText()).includes('outdated'),size.name+' report date truth');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    check(overflow<=2,size.name+' horizontal overflow '+overflow);
    await page.locator('input[name="pk-time"][value="30"]').check();
    await page.locator('#pk-effort').selectOption('easy');
    await page.locator('#pk-vibe').selectOption('beach');
    check((await page.locator('#pk-result-heading').innerText())==='Boardwalk Beach Trail',size.name+' short beach result');
    await page.locator('input[name="pk-time"][value="540"]').check();
    await page.locator('#pk-effort').selectOption('difficult');
    await page.locator('#pk-vibe').selectOption('challenge');
    check((await page.locator('#pk-result-heading').innerText())!=='White River Suspension Bridge',size.name+' closure excluded');
    check(await page.locator('#pk-white-river-bridge .pk-trail-status').innerText()==='Officially reported closed',size.name+' closure remains visible');
    const choiceShot=size.name+'-chooser.png';
    await page.locator('.pk-layout').screenshot({path:path.join(out,choiceShot)});
    report.screenshots.push(choiceShot);
    const photos=page.locator('.pk-photo-row img');
    check(await photos.count()===3,size.name+' three genuine photos');
    let good=0;
    for(let i=0;i<3;i++){
      const img=photos.nth(i);
      await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(index=>{
        const image=document.querySelectorAll('.pk-photo-row img')[index];
        return image&&image.complete;
      },i,{timeout:18000});
      const meta=await img.evaluate(x=>({width:x.naturalWidth,url:x.currentSrc,alt:x.alt}));
      report.photoChecks.push({size:size.name,index:i,...meta});
      if(meta.width>100)good++;
    }
    check(good===3,size.name+' genuine image loading '+good+'/3');
    report.scenarios.push({size:size.name,shortBeach:'passed',bridgeExcluded:'passed',overflowPx:overflow,photos:good});
    await ctx.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.route('**/api/pukaskwa-conditions',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify(unavailable)}));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>document.body.dataset.pkReady==='true',{timeout:15000});
  check((await page.locator('#pk-source-head').innerText()).includes('cannot be confirmed'),'source outage recognized');
  check((await page.locator('#pk-result-badge').innerText()).includes('not confirmed'),'no green access on outage');
  report.scenarios.push({size:'source-outage',failClosed:true});
  await context.close();
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const noJsPage=await noJs.newPage();
  await noJsPage.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
  check(await noJsPage.locator('.pk-trail').count()===8,'all eight routes available without JS');
  check(await noJsPage.locator('.pk-trail a[href^="https://parks.canada.ca/"]').count()===8,'all trail source links without JS');
  report.scenarios.push({size:'no-JS',cards:8,officialSources:8});
  await noJs.close();
 }catch(e){report.errors.push(e.stack||String(e));}
 finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length)process.exitCode=1;
 }
})();
