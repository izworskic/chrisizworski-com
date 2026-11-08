#!/usr/bin/env node
'use strict';
/* Real Chromium checks with synthetic AIS fixtures. Never claim live provider verification. */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const pub=path.join(root,'public');
const shots=path.join(root,'artifacts/freighter-watch-desk-browser');
fs.mkdirSync(shots,{recursive:true});
const leafletJs='/tmp/fwd-playwright/node_modules/leaflet/dist/leaflet.js';
const leafletCss='/tmp/fwd-playwright/node_modules/leaflet/dist/leaflet.css';
const now=Date.now(),iso=x=>new Date(x).toISOString();
const ship={mmsi:'366123456',name:'Browser fixture freighter',lat:46.52,lon:-84.41,
  seen:iso(now-4*60000),speedKnots:8,course:90,lengthMeters:300,confidence:.83,
  window:{start:iso(now+15*60000),end:iso(now+75*60000)}};
const soo={ok:true,checkedAt:iso(now),vessels:[ship],
  nextShip:{ok:true,pick:ship,candidates:[ship],inLock:[]}};
const general={ok:true,checkedAt:iso(now),
  vessels:[{...ship,lat:42.98,lon:-82.42,seen:iso(now-3*60000)}]};
const server=http.createServer((req,res)=>{
  let pathName;
  try{pathName=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
  catch{res.writeHead(400).end();return;}
  if(pathName.endsWith('/'))pathName+='index.html';
  const file=path.resolve(pub,'.'+pathName);
  if(!file.startsWith(pub+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    const type=file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':
      file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/plain';
    res.writeHead(200,{'Content-Type':type});res.end(data);
  });
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({
    headless:true,
    executablePath:process.env.CHROME_PATH||undefined,
    args:['--no-sandbox','--disable-dev-shm-usage']
  });
  let cases=0;
  try {
    for(const width of [360,390,768,1440]){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      const page=await context.newPage();
      const pageErrors=[];
      page.on('pageerror',error=>pageErrors.push(String(error.message || error)));
      await page.route('**/leaflet.js',r=>r.fulfill({path:leafletJs,contentType:'application/javascript'}));
      await page.route('**/leaflet.css',r=>r.fulfill({path:leafletCss,contentType:'text/css'}));
      await page.route('**/api/soo-ais',r=>r.fulfill({json:soo}));
      await page.route('**/api/freighter-ais',r=>r.fulfill({json:general}));
      await page.route('**/api/duluth-canal',r=>r.fulfill({json:{ok:true,checkedAt:iso(now),candidates:[],mapVessels:[],watchPick:null}}));
      await page.goto(base+'/great-lakes-ship-watching-spots/',{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('text=October 11, 2026').count(),0,'hard-coded stale hero date removed');
      await page.waitForFunction(()=>['observed','window','unknown','unavailable'].includes(document.querySelector('#fwd-status').dataset.status));
      await page.waitForFunction(()=>document.querySelector('#fwd-map').dataset.ready==='true');
      assert.match(await page.textContent('#fwd-local-date'),/November 8, 2026/);
      assert.match(await page.textContent('#fwd-viewing-location'),/Soo Locks observation platform/);
      assert.equal(pageErrors.length,0,'no startup page errors on default load');
      await page.selectOption('#fwd-when','now');
      await page.waitForFunction(()=>document.querySelector('#fwd-status').dataset.status==='window');
      assert.match(await page.textContent('#fwd-headline'),/Browser fixture freighter/);
      assert.match(await page.textContent('#fwd-message'),/Estimated passage/);
      await page.waitForFunction(()=>document.querySelector('#fwd-map').dataset.ready==='true');
      assert.equal(await page.locator('#fwd-ships button[data-mmsi]').count(),1);
      assert.equal(await page.locator('#fwd-map .leaflet-map-pane').count(),1,'map draws an interactive Leaflet pane');
      const dimensions=await page.locator('#freighter-watch-desk').evaluate(el=>{
        const rect=el.getBoundingClientRect();
        return {left:rect.left,right:rect.right,viewport:window.innerWidth};
      });
      assert.ok(dimensions.left>=-1&&dimensions.right<=width+2,'desk within viewport '+width);
      await page.screenshot({path:path.join(shots,'soo-'+width+'.png'),fullPage:false});
      await page.selectOption('#fwd-place','port');
      await page.waitForFunction(()=>document.querySelector('#fwd-status').dataset.status==='observed');
      assert.match(await page.textContent('#fwd-message'),/cannot confirm when one will pass/);
      assert.match(await page.textContent('#fwd-viewing-location'),/Vantage Point/);
      assert.doesNotMatch(await page.textContent('#fwd-message'),/Estimated passage/);
      await page.selectOption('#fwd-when','tomorrow');
      await page.waitForFunction(()=>document.querySelector('#fwd-status').dataset.status==='unknown');
      assert.match(await page.textContent('#fwd-headline'),/Tomorrow is not confirmed/);
      assert.equal(pageErrors.length,0,'no script errors after changing region and time');
      await context.close();
      cases+=4;
    }
    const noMap=await browser.newContext({viewport:{width:390,height:800}});
    const p=await noMap.newPage();
    await p.route('**/leaflet.js',r=>r.abort());
    await p.route('**/api/soo-ais',r=>r.fulfill({json:soo}));
    await p.goto(base+'/great-lakes-ship-watching-spots/',{waitUntil:'domcontentloaded'});
    await p.selectOption('#fwd-when','now');
    await p.waitForFunction(()=>document.querySelector('#fwd-status').dataset.status==='window');
    assert.equal(await p.locator('#fwd-ships li').count(),1,'list remains without map library');
    await noMap.close();
    cases++;
    const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:800}});
    const staticPage=await noJS.newPage();
    await staticPage.goto(base+'/great-lakes-ship-watching-spots/',{waitUntil:'domcontentloaded'});
    assert.ok(await staticPage.locator('#viewing-guide').isVisible());
    assert.ok(await staticPage.locator('text=Visitor sources').isVisible());
    await noJS.close();
    cases++;
    console.log('Freighter Watch Desk: '+cases+' synthetic Chromium checks passed; real DOM startup, map, dynamic date, 4 widths, source states, no-map and no-JS.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
