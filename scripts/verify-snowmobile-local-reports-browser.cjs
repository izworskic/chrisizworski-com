#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../public');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 let file;
 try{file=path.resolve(ROOT,'.'+decodeURIComponent(pathname.endsWith('/')?pathname+'index.html':pathname));}catch{res.writeHead(400);res.end();return;}
 if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,bytes)=>{
  if(err){res.writeHead(404);res.end('missing');return;}
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'});res.end(bytes);
 });
});
const reports=[
 {name:'Sault Snowmobile Association',scope:'Sault / Brimley / Kinross',url:'https://misorva.org/trail-reports/sault-snowmobile-association/',state:'STALE',reportedAt:'2026-01-15',reportAgeDays:302,lastGroomedAt:null,groomingFreshness:'NOT_CURRENT',condition:null},
 {name:'Paradise Area Night Riders',scope:'Paradise / Whitefish Point',url:'https://misorva.org/trail-reports/paradise-area-night-riders/',state:'RECENT',reportedAt:'2026-11-13',reportAgeDays:0,lastGroomedAt:'2026-11-13',groomingFreshness:'NOT_CURRENT',condition:null},
 {name:'Tahquamenon Snowmobile Association',scope:'Newberry / Tahquamenon area',url:'https://misorva.org/trail-reports/tahquamenon-snowmobile-association/',state:'UNAVAILABLE',reportedAt:null,reportAgeDays:null,lastGroomedAt:null,groomingFreshness:'NOT_CURRENT',condition:null}
];
const fixture={region:'eastern-up',checkedAt:'2026-11-13T21:00:00Z',reports,totals:{monitored:3,available:2,recent:1,stale:1}};
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [name,width,height] of [['mobile390',390,844],['desktop1440',1440,900]]){
   const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://unpkg.com/**',route=>route.fulfill({status:200,body:'',contentType:'text/javascript'}));
   await page.route('https://www.googletagmanager.com/**',route=>route.abort());
   await page.route('https://pagead2.googlesyndication.com/**',route=>route.abort());
   await page.route('**/api/snowmobile?**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture source down"}'}));
   await page.route('**/api/snowmobile-local-reports**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
   const url='http://127.0.0.1:'+server.address().port+'/snowmobile/regions/eastern-up.html';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200);
   await page.waitForFunction(()=>document.querySelectorAll('#localClubReports .club-wire-card').length===3,{timeout:15000});
   const cards=await page.locator('#localClubReports .club-wire-card').allTextContents();
   assert.match(cards[0],/Old report — do not use as current conditions/);
   assert.match(cards[0],/Jan 15, 2026/);
   assert.doesNotMatch(cards[0],/Excellent|Good/,'old excellent not shown as current');
   assert.match(cards[1],/Published within 3 days/);
   assert.doesNotMatch(cards[1],/Club condition:.*Good/,'pre-season report cannot become ride advice');
   assert.match(cards[2],/Source could not be checked/);
   assert.match(await page.locator('#localClubStatus').innerText(),/source-check time is not a trail observation date/i);
   assert.equal(await page.locator('#localClubReports a[data-club-wire]').count(),3);
   assert.equal(await page.locator('#routeStops').isHidden(),true,'local reports must not create route stops');
   const bbox=await page.locator('#localClubReports .club-wire-card').first().boundingBox();
   assert.ok(bbox&&bbox.x>=0&&bbox.x+bbox.width<=width+3,name+' report cards exceed viewport');
   // A recently stamped wrapper over last year's narrative must not show
   // a green/current condition. The visitor must see both dates.
   await page.unroute('**/api/snowmobile-local-reports**');
   const conflictFixture={...fixture,reports:fixture.reports.map((r,i)=>i===0?{...r,state:'DATE_CONFLICT',reportedAt:'2026-11-13',reportAgeDays:0,narrativeAt:'2025-01-13',dateConflict:true,condition:null,groomingFreshness:'NOT_CURRENT'}:r),totals:{...fixture.totals,recent:1,stale:1,conflicts:1}};
   await page.route('**/api/snowmobile-local-reports**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(conflictFixture)}));
   await page.reload({waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>document.querySelector('#localClubReports .club-wire-card')?.textContent?.includes('Report header and narrative dates disagree'),{timeout:15000});
   const flagged=await page.locator('#localClubReports .club-wire-card').first().innerText();
   assert.match(flagged,/Older narrative date: Jan 13, 2025/);
   assert.doesNotMatch(flagged,/Club condition:\\s*Good/,'conflicting source must never appear as current GOOD');
   assert.match(await page.locator('#localClubStatus').innerText(),/report header\/narrative date conflict requires manual review/i);
   // Induce an upstream error after reload, ensure no guessed stale HTML.
   await page.unroute('**/api/snowmobile-local-reports**');
   await page.route('**/api/snowmobile-local-reports**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"MISORVA down"}'}));
   await page.reload({waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>document.querySelector('#localClubStatus')?.textContent?.includes('could not be checked'),{timeout:15000});
   assert.equal(await page.locator('#localClubReports .club-wire-card').count(),0,'no stale cards on fail');
   assert.ok((await page.locator('#localClubStatus').innerText()).includes('MISORVA groomer directory'));
   assert.ok(errors.length===0,name+' JS errors: '+errors.join(' | '));
   console.log('PASS '+name+' local-source report dates, offseason/stale suppression, source outage, route independence, responsive layout');
   await ctx.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
