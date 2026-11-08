#!/usr/bin/env node
// Synthetic browser acceptance. This server serves the actual generated Seaway
// page/assets but uses an invented TEST vessel as clearly isolated AIS fixture.
// No real provider, visitor behavior, map connectivity or production status claimed.
const {chromium}=require('playwright-core');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..','public'),CHROME=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const SHOTS=process.env.SHOTS||'';
const PORT=Number(process.env.PORT)||0;
let fakeMode='recent';
const REFERENCE=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/seaway/places.json'),'utf8'));
function responseFor(scope){
 const now=new Date(),v={mmsi:fakeMode==='photo'?'316009090':'316123456',name:fakeMode==='photo'?'ALGOMA EQUINOX':'TEST VESSEL — NOT REAL',lat:44.978,lon:-74.851,
  speedKnots:5.2,heading:240,course:220,shipType:70,lengthMeters:200,beamMeters:24,seen:new Date(+now-120000).toISOString(),
  regionIds:['massena']};
 if(fakeMode==='unavailable')return{status:502,data:{ok:false,state:'unavailable'}};
 const includes=scope==='all'||scope==='massena';
 const vessels=fakeMode==='empty'||!includes?[]:[v];
 const regions=(scope==='all'?REFERENCE.regions.filter(r=>r.id):REFERENCE.regions.filter(r=>r.id===scope))
   .map(r=>({id:r.id,name:r.name,state:r.id==='massena'&&vessels.length?'recent':'no-reports',checkedAt:now.toISOString(),
     count:r.id==='massena'?vessels.length:0}));
 return{status:200,data:{ok:true,state:vessels.length?'recent':'no-reports',checkedAt:now.toISOString(),
    maxAgeMinutes:30,coverage:'received-reports-only',isSchedule:false,lockStatus:'unknown',lockQueue:'unknown',
    vessels,regions,attribution:[],provider:'synthetic-browser-fixture'}};
}
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/api/st-lawrence-seaway'){
   const r=responseFor(url.searchParams.get('region')||'all');
   res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify(r.data));return;
 }
 const pathname=decodeURIComponent(url.pathname);const rel=pathname==='/'?'st-lawrence-seaway/index.html':pathname.endsWith('/')?pathname.replace(/^\//,'')+'index.html':pathname.replace(/^\//,'');
 const filepath=path.resolve(ROOT,rel);
 if(!filepath.startsWith(ROOT+path.sep)){res.writeHead(404);res.end('not found');return;}
 try{
  const buf=fs.readFileSync(filepath);
  const ext=path.extname(filepath).toLowerCase();
  res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'})[ext]||'application/octet-stream'});
  res.end(buf);
 }catch(_){res.writeHead(404);res.end('not found');}
});
async function run(base,browser,width){
 const context=await browser.newContext({viewport:{width,height:width<600?840:960},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/googlesyndication|googletagmanager|doubleclick/,r=>r.abort());
 // Offline browser verification remains useful if Leaflet or cameras fail:
 // the ship list and selected journey must work without map tiles.
 await page.route('https://*.tile.openstreetmap.org/**',r=>r.abort());
 await page.route('https://*.basemaps.cartocdn.com/**',r=>r.abort());
 const response=await page.goto(base+'/st-lawrence-seaway/',{waitUntil:'domcontentloaded',timeout:40000});
 assert.equal(response.status(),200);
 const panel=page.locator('#followFreighter');
 assert.equal(await panel.isVisible(),false,'must not overwhelm page before vessel selection');
 assert.equal(await page.locator('#followSelectedShip').isVisible(),false);
 assert.equal(await page.locator('#seawayMap').count(),1);
 assert.equal(await page.locator('#shipList').count(),1);
 const card=page.locator('#shipList .ship-card').first();
 await card.waitFor({state:'visible',timeout:25000});
 assert.match(await card.textContent(),/656 ft/,'200 meters should be shown as 656 ft on ship card');
 assert.doesNotMatch(await card.textContent(),/200 m(?!eters)/,'ship list must not show metric length');
 await card.click();
 await panel.waitFor({state:'visible',timeout:6000});
 assert.equal(await page.locator('#followSelectedShip').isVisible(),true);
 assert.match(await panel.textContent(),/TEST VESSEL — NOT REAL/);
 assert.match(await panel.textContent(),/Massena · Eisenhower & Snell/);
 assert.equal(await panel.locator('.follow-rail li.is-current').count(),1);
 assert.match(await panel.locator('.follow-actions').textContent(),/Explore Dwight D. Eisenhower/);
 assert.match(await panel.locator('.follow-actions').textContent(),/Plan Seaway Visitor Center viewing/);
 assert.match(await panel.textContent(),/not a verified voyage direction/);
 assert.doesNotMatch(await panel.textContent(),/arriving at.*\d+:\d+|ship will reach/i);
 const popupText=page.locator('#seawayMap .leaflet-popup-content').first();
 if(await popupText.isVisible()){
   assert.match(await popupText.textContent(),/Reported length 656 ft · beam 79 ft/,'popup shows rounded feet for length and beam');
   assert.equal(await popupText.locator('a').count(),0,'individual ship bubble should have zero links');
   assert.equal(await popupText.locator('.seaway-popup-figure').count(),0,'unverified test ship receives no fake image');
 }
 const size=await panel.evaluate(el=>({cw:el.clientWidth,sw:el.scrollWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));
 assert.ok(size.sw<=size.cw+3,width+'px no horizontal panel scrolling '+JSON.stringify(size));
 assert.ok(size.left>=-12&&size.right<=width+12,width+'px panel inside viewport '+JSON.stringify(size));
 await page.locator('#followSelectedShip').click();
 assert.ok(await panel.evaluate(el=>el.getBoundingClientRect().top<window.innerHeight),'follow CTA actually navigates to panel');
 if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await panel.screenshot({path:path.join(SHOTS,'follow-freighter-'+width+'.png')});}
 await page.getByRole('button',{name:/Recheck this vessel across the Seaway/}).click();
 assert.equal(await page.locator('#shipSearch').inputValue(),'316123456');
 assert.equal(await page.locator('#regionSelect').inputValue(),'all');
 assert.equal(await panel.isVisible(),false,'corridor recheck must clear old selection until reselected');
 await page.locator('#shipList .ship-card').first().click();
 assert.equal(await panel.isVisible(),true,'can reselect vessel after corridor search');
 await page.locator('#regionSelect').selectOption('montreal');
 assert.equal(await panel.isVisible(),false,'different river region clears selected journey');
 assert.ok(errors.every(msg=>!msg.includes('SeawayFollow')&&!msg.includes('followFreighter')),'follow code page errors '+errors.join('; '));
 await context.close();
}

async function verifyPhoto(base,browser,broken=false){
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await ctx.newPage();
 // Deterministic 1x1 PNG fixture: tests layout and fallback, not Wikimedia availability.
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAJUbZYQAAAAASUVORK5CYII=','base64');
 let interceptedImages=0;
 await page.route(/Algoma_Equinox|(?:commons|thumb|upload)\.wikimedia\.org/,route=>{
   interceptedImages++;
   return route.fulfill({
     status:broken?404:200,contentType:broken?'text/plain':'image/png',body:broken?'not found':image
   });
 });
 await page.route(/googlesyndication|googletagmanager|doubleclick/,r=>r.abort());
 await page.goto(base+'/st-lawrence-seaway/',{waitUntil:'domcontentloaded',timeout:40000});
 const card=page.locator('#shipList .ship-card').first();
 await card.waitFor({state:'visible',timeout:25000});
 await card.click();
 const popup=page.locator('#seawayMap .leaflet-popup-content').first();
 await popup.waitFor({state:'visible',timeout:8000});
 assert.equal(await popup.locator('a').count(),0,'photo popup has no external links');
 assert.match(await popup.textContent(),/ALGOMA EQUINOX/);
 await page.waitForFunction(()=>Boolean(document.querySelector('#seawayMap .leaflet-popup-content img')),null,{timeout:7000}).catch(()=>{});
 assert.ok(interceptedImages>=1,'historical photo request should be routed through deterministic image fixture');
 if(broken){
   // A failed remote image must never occupy visible space, regardless of
   // whether Leaflet has replaced the popup DOM while the request settled.
   await page.waitForTimeout(500);
   assert.equal(await popup.locator('.seaway-popup-figure:visible').count(),0,
     'failed photo must never leave a visible empty image box');
   assert.equal(await page.locator('#mapSelection .seaway-photo-credit-outside').count(),0,
     'no attribution links for a missing image');
 }else{
   const figure=popup.locator('.seaway-popup-figure');
   await figure.waitFor({state:'visible',timeout:10000});
   const img=figure.locator('img');
   assert.equal(await img.getAttribute('width'),'220');
   assert.equal(await img.getAttribute('height'),'112');
   assert.match(await img.getAttribute('alt'),/Algoma Equinox.*2019/);
   const box=await img.boundingBox();
   assert.ok(box.width<=230&&box.height<=120,'thumbnail stays bubble-sized');
   assert.match(await figure.locator('figcaption').textContent(),/GriffBill.*CC BY-SA 4\.0/);
   assert.equal(await page.locator('#mapSelection .seaway-photo-credit-outside a').count(),2,
     'credit and license links are outside bubble only');
   if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await popup.screenshot({path:path.join(SHOTS,'seaway-ship-popup-photo-390.png')});}
 }
 await ctx.close();
}

(async()=>{
 await new Promise(resolve=>server.listen(PORT,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({executablePath:CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [360,390,768,1440])await run(base,browser,width);
  fakeMode='empty';
  const ctx=await browser.newContext({viewport:{width:390,height:850}});
  const page=await ctx.newPage();await page.goto(base+'/st-lawrence-seaway/',{waitUntil:'domcontentloaded'});
  await page.locator('#shipList .empty').waitFor({state:'visible',timeout:25000});
  assert.equal(await page.locator('#followFreighter').isVisible(),false,'empty AIS cannot fabricate a journey');
  await ctx.close();
  fakeMode='photo';
  await verifyPhoto(base,browser,false);
  await verifyPhoto(base,browser,true);
  const nojs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
  const staticPage=await nojs.newPage();await staticPage.goto(base+'/st-lawrence-seaway/',{waitUntil:'domcontentloaded'});
  assert.equal(await staticPage.locator('#journey .journey-stop').count(),5,'five static geography links survive without JS');
  assert.equal(await staticPage.locator('#viewing-plan').count(),1,'official visitor source remains available without JS');
  assert.equal(await staticPage.locator('#followFreighter').isVisible(),false);
  await nojs.close();
  console.log('Follow the Freighter browser acceptance passed: 4 viewports, manual selected ship, corridor search, region reset, verified-photo/fallback, empty source and no-JS.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
