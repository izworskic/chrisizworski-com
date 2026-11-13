#!/usr/bin/env node
'use strict';
// Real DOM on desktop + 390px phone. No remote data dependency: source
// responses are explicit fixtures from the official DNR parking GIS.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../public');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://127.0.0.1').pathname;
  const file=path.resolve(ROOT,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end('missing');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  });
});
const sites=[
 {id:28,lat:44.6625778531048,lon:-84.7672618993167,name:'Snowmobile Trail LP 7',directionsNote:'Snowmobile Parking / ORV Parking NW of Int of M72 and South Blue Bear Trail'},
 {id:242,lat:45.0281285882645,lon:-84.6782500186266,name:'Snowmobile Trail LP / Gaylord Gateway Trailhead',directionsNote:'Snowmobile Parking & Staging in winter. Heated restrooms.'}
];
const body={sites,sourceRecords:127,sourceCheckedAt:'2026-11-13T20:20:00.000Z',accessStatus:'NOT_VERIFIED'};
const geometry={type:'FeatureCollection',features:[
 {type:'Feature',properties:{trailNetwork:'LP7',band:'UNKNOWN'},geometry:{type:'LineString',coordinates:[[-84.772,44.662],[-84.763,44.666]]}},
 {type:'Feature',properties:{trailNetwork:'LP4',band:'UNKNOWN'},geometry:{type:'LineString',coordinates:[[-84.681,45.025],[-84.675,45.032]]}}
]};
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [label,width,height] of [['phone390',390,844],['desktop1440',1440,900]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   const page=await context.newPage();
   // Remote scripts / map tiles are not needed for text-only parking UX.
   await page.route('https://unpkg.com/**',route=>route.fulfill({status:200,body:'',contentType:'text/javascript'}));
   await page.route('https://www.googletagmanager.com/**',route=>route.abort());
   await page.route('https://pagead2.googlesyndication.com/**',route=>route.abort());
   await page.route('**/api/snowmobile?**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'fixture'})}));
   await page.route('**/api/snowmobile-parking',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)}));
   const response=await page.goto('http://127.0.0.1:'+server.address().port+'/snowmobile/regions/grayling-gaylord.html',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200,label);
   await page.waitForFunction(()=>!!window.SnowmobileAccessEvidence&&!!window.SnowmobileParking&&typeof window.SnowmobileRoutePicker==='object',{timeout:15000});
   await page.evaluate(geometry=>{
     DATA={key:'grayling-gaylord',scoredGeometry:geometry,season:{active:false},closures:{verified:false},
       routeJunctions:{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[-84.766,44.664]},properties:{id:'n1',label:'LP7 mapped junction',component:0}}]}};
     // Production app may not initialize MAP due unavailable Leaflet; the
     // parking and route text interfaces must remain available independently.
     MAP=null;
   },geometry);
   await page.locator('#loadParking').click();
   await page.waitForFunction(()=>document.querySelectorAll('#parkingResults .parking-card').length===2,{timeout:12000});
   const cards=await page.locator('#parkingResults .parking-card').allTextContents();
   assert.match(cards[0],/DNR county-map parking \/ trail pairing/);
   assert.match(cards[0],/LP7/);
   assert.match(cards[0],/not a surveyed or legally verified connection/);
   assert.match(cards[1],/DNR parking asset only/);
   assert.ok((await page.locator('a[data-parking-directions="28"]').getAttribute('href')).includes('44.662578,-84.767262'));
   assert.match(await page.locator('a[data-parking-map="28"]').getAttribute('href'),/snowmobile_crawford\.pdf$/);
   await page.locator('button[data-parking-trail="LP7"]').click();
   assert.equal(await page.locator('#junctionSearch').inputValue(),'LP7');
   assert.equal(await page.locator('#routeStops').isHidden(),true,'parking lookup must never create an actual route stop');
   const cardBounds=await page.locator('.parking-card').first().boundingBox();
   assert.ok(cardBounds&&cardBounds.x>=0&&cardBounds.x+cardBounds.width<=width+4,label+' card overflows screen');
   await page.unroute('**/api/snowmobile-parking');
   await page.route('**/api/snowmobile-parking',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"DNR unavailable"}'}));
   await page.locator('#loadParking').click();
   await page.waitForFunction(()=>document.querySelector('#parkingStatus')?.textContent?.includes('data unavailable'),{timeout:12000});
   assert.equal(await page.locator('#parkingResults .parking-card').count(),0,'upstream failure cannot leave stale parking suggestions');
   console.log('PASS '+label+' DNR pairing, unsupported-lot caveat, directions, route separation, responsive cards, 503 reset');
   const keweenawResponse=await page.goto('http://127.0.0.1:'+server.address().port+'/snowmobile/regions/keweenaw-copper-country.html',{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(keweenawResponse.status(),200);
   await page.waitForFunction(()=>document.querySelectorAll('#clubStaging .club-staging-card').length===5,{timeout:15000});
   const clubText=await page.locator('#clubStaging').innerText();
   assert.match(clubText,/56953 Osceola Road/);
   assert.match(clubText,/Overnight parking permitted/);
   assert.match(clubText,/No overnight parking/);
   assert.match(clubText,/Do not park in front of the chain-link fence/);
   assert.equal(await page.locator('#clubStaging [data-club-staging]').count(),5);
   assert.ok((await page.locator('#clubStaging [data-club-staging="calumet"]').getAttribute('href')).includes('56953%20Osceola%20Road'));
   assert.equal(await page.locator('#routeStops').isHidden(),true,'club staging cannot create a route stop');
   console.log('PASS '+label+' Keweenaw official club staging rules and source-backed address directions');

   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
