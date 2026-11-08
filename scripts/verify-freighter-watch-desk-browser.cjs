#!/usr/bin/env node
'use strict';
/* Real Chromium checks with synthetic AIS fixtures. Never claim live provider verification. */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {publicSite}=require('../lib/freighter-watch-sites');
const root=path.resolve(__dirname,'..');
const pub=path.join(root,'public');
const shots=path.join(root,'artifacts/freighter-watch-desk-browser');
fs.mkdirSync(shots,{recursive:true});
const leafletJs='/tmp/fwd-playwright/node_modules/leaflet/dist/leaflet.js';
const leafletCss='/tmp/fwd-playwright/node_modules/leaflet/dist/leaflet.css';
const now=Date.now(),iso=x=>new Date(x).toISOString();
const tilePng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==','base64');
const ship={mmsi:'366123456',name:'Browser fixture freighter',lat:46.52,lon:-84.41,
  seen:iso(now-4*60000),speedKnots:8,course:90,lengthMeters:300,confidence:.83,
  window:{start:iso(now+15*60000),end:iso(now+75*60000)}};
const sunny={ok:true,checkedAt:iso(now),alertsStatus:'available',
  sourceUrl:'https://www.weather.gov/',alerts:[],periods:[
    {starts:iso(now-30*60000),ends:iso(now+30*60000),isDaytime:true,temperatureF:46,
      windMph:7,precipProbability:5,shortForecast:'Mostly sunny'},
    {starts:iso(now+30*60000),ends:iso(now+90*60000),isDaytime:true,temperatureF:47,
      windMph:8,precipProbability:10,shortForecast:'Mostly sunny'},
    {starts:iso(now+24*3600000),ends:iso(now+25*3600000),isDaytime:true,temperatureF:45,
      windMph:9,precipProbability:15,shortForecast:'Partly cloudy'}
  ]};
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
      const missingKeyTiles=[];
      const pageErrors=[];
      page.on('pageerror',error=>pageErrors.push(String(error.message || error)));
      await page.route('**/leaflet.js',r=>r.fulfill({path:leafletJs,contentType:'application/javascript'}));
      await page.route('**/leaflet.css',r=>r.fulfill({path:leafletCss,contentType:'text/css'}));
      await page.route('**/api/soo-ais',r=>r.fulfill({json:soo}));
      await page.route('**/api/freighter-watch-conditions**',r=>{
        const id=new URL(r.request().url()).searchParams.get('place');
        return r.fulfill({json:{ok:true,site:publicSite(id),weather:sunny}});
      });
      await page.route('**/api/carto-basemap-config',r=>r.fulfill({json:{provider:'CARTO',key:'test-public-key'}}));
      await page.route('**/light_all/**',r=>{
        if(new URL(r.request().url()).searchParams.get('key')!=='test-public-key')
          missingKeyTiles.push(r.request().url());
        return r.fulfill({body:tilePng,contentType:'image/png'});
      });
      await page.route('**/api/freighter-ais',r=>r.fulfill({json:general}));
      await page.route('**/api/duluth-canal',r=>r.fulfill({json:{ok:true,checkedAt:iso(now),candidates:[],mapVessels:[],watchPick:null}}));
      await page.goto(base+'/great-lakes-ship-watching-spots/',{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('text=October 11, 2026').count(),0,'hard-coded stale hero date removed');
      await page.waitForFunction(()=>['observed','window','unknown','unavailable'].includes(document.querySelector('#fwd-status').dataset.status));
      await page.waitForFunction(()=>document.querySelector('#fwd-map').dataset.ready==='true');
      await page.waitForFunction(()=>document.querySelector('#fwd-map').dataset.basemap==='carto');
      assert.equal(missingKeyTiles.length,0,'no unkeyed CARTO tile requests');
      assert.match(await page.textContent('#fwd-local-date'),/November 8, 2026/);
      assert.match(await page.textContent('#fwd-viewing-location'),/Soo Locks observation platform/);
      assert.equal(pageErrors.length,0,'no startup page errors on default load');
      await page.selectOption('#fwd-when','now');
      await page.waitForFunction(()=>document.querySelector('#fwd-status').dataset.status==='window');
      assert.match(await page.textContent('#fwd-headline'),/Browser fixture freighter/);
      await page.waitForFunction(()=>document.querySelector('#fwd-visit-plan').dataset.verdict==='PROMISING');
      assert.match(await page.textContent('#fwd-plan-title'),/Worth considering a shoreline visit/);
      assert.match(await page.textContent('#fwd-plan-where'),/Soo Locks observation platform/);
      assert.match(await page.textContent('#fwd-plan-when'),/Modeled passage/);
      assert.match(await page.textContent('#fwd-plan-weather'),/Mostly sunny|hourly limiter/i);
      assert.match(await page.textContent('#fwd-plan-access'),/published hours/);
      assert.ok(await page.locator('#fwd-plan-actions a').count()>=3);
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
      await page.waitForFunction(()=>document.querySelector('#fwd-visit-plan').dataset.verdict==='NEARBY_ONLY');
      assert.match(await page.textContent('#fwd-plan-title'),/already nearby/);
      assert.match(await page.textContent('#fwd-plan-where'),/Thomas Edison Parkway/);
      assert.doesNotMatch(await page.textContent('#fwd-message'),/Estimated passage/);
      await page.selectOption('#fwd-when','tomorrow');
      await page.waitForFunction(()=>document.querySelector('#fwd-status').dataset.status==='unknown');
      assert.match(await page.textContent('#fwd-headline'),/Tomorrow is not confirmed/);
      await page.waitForFunction(()=>document.querySelector('#fwd-visit-plan').dataset.verdict==='PLAN_SHORE');
      assert.match(await page.textContent('#fwd-plan-summary'),/no verified ship passage for tomorrow/i);
      assert.equal(pageErrors.length,0,'no script errors after changing region and time');
      await context.close();
      cases+=4;
    }
    const adverse=await browser.newContext({viewport:{width:390,height:800}});
    const adversePage=await adverse.newPage();
    await adversePage.route('**/leaflet.js',r=>r.fulfill({path:leafletJs,contentType:'application/javascript'}));
    await adversePage.route('**/leaflet.css',r=>r.fulfill({path:leafletCss,contentType:'text/css'}));
    await adversePage.route('**/api/soo-ais',r=>r.fulfill({json:soo}));
    await adversePage.route('**/api/freighter-watch-conditions**',r=>r.fulfill({json:{
      ok:true,site:publicSite('soo'),weather:{...sunny,alerts:[{
        event:'High Wind Warning',severity:'Severe',starts:iso(now-3600000),expires:iso(now+3600000)
      }]}
    }}));
    await adversePage.goto(base+'/great-lakes-ship-watching-spots/',{waitUntil:'domcontentloaded'});
    await adversePage.selectOption('#fwd-when','now');
    await adversePage.waitForFunction(()=>document.querySelector('#fwd-visit-plan').dataset.verdict==='WEATHER_HOLD');
    assert.match(await adversePage.textContent('#fwd-plan-title'),/Reconsider the outdoor trip/);
    await adverse.close();cases++;
    const fallback=await browser.newContext({viewport:{width:390,height:800}});
    const fallbackPage=await fallback.newPage();
    await fallbackPage.route('**/leaflet.js',r=>r.fulfill({path:leafletJs,contentType:'application/javascript'}));
    await fallbackPage.route('**/leaflet.css',r=>r.fulfill({path:leafletCss,contentType:'text/css'}));
    await fallbackPage.route('**/api/soo-ais',r=>r.fulfill({json:soo}));
    await fallbackPage.route('**/api/freighter-watch-conditions**',r=>r.fulfill({json:{ok:true,site:publicSite('soo'),weather:sunny}}));
    await fallbackPage.route('**/api/carto-basemap-config',r=>r.fulfill({status:503,json:{error:'unavailable'}}));
    await fallbackPage.route('**/tile.openstreetmap.org/**',r=>r.fulfill({body:tilePng,contentType:'image/png'}));
    await fallbackPage.goto(base+'/great-lakes-ship-watching-spots/',{waitUntil:'domcontentloaded'});
    await fallbackPage.waitForFunction(()=>document.querySelector('#fwd-map').dataset.basemap==='osm');
    assert.match(await fallbackPage.textContent('#fwd-map-note'),/OpenStreetMap fallback/);
    await fallback.close();
    cases++;
    const noMap=await browser.newContext({viewport:{width:390,height:800}});
    const p=await noMap.newPage();
    await p.route('**/leaflet.js',r=>r.abort());
    await p.route('**/api/soo-ais',r=>r.fulfill({json:soo}));
    await p.route('**/api/freighter-watch-conditions**',r=>r.fulfill({json:{ok:true,site:publicSite('soo'),weather:sunny}}));
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
