#!/usr/bin/env node
'use strict';
/* Real Chrome at 360, 390, 768 and 1440 px: the loop finder on a region page.
 * Start search, ride length, option compare (A, B, back to A), keyboard,
 * GPX export, hand-off to the stop-by-stop planner, and fail-closed behavior
 * for a closed segment, a failed request and a stale slow reply. Also checks
 * the no-JavaScript fallback.
 *
 * Loop replies are produced by the real server module (lib/snowmobile/loops.mjs)
 * over a small fixture network, never hand-written. Optional real-data run:
 *   node scripts/verify-snowmobile-loop-browser.cjs --live=/path/region-api.json --shots=/tmp/shots
 * where the JSON is a saved /api/snowmobile?region=<key> response.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const arg=name=>(process.argv.find(a=>a.startsWith('--'+name+'='))||'').slice(name.length+3)||null;
const livePath=arg('live'),shots=arg('shots');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const p=new URL(req.url,'http://127.0.0.1').pathname;
 const file=path.resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
});
const S=[-84.70,45.00],A=[-84.60,45.00],B=[-84.60,45.07],C=[-84.70,45.07],D=[-84.50,45.07],E=[-84.40,45.07],F=[-84.45,45.14];
const make=(id,name,coords)=>({type:'Feature',properties:{id,trailNetwork:name,band:'OFF_SEASON',score:null},geometry:{type:'LineString',coordinates:coords}});
const fixtureGeometry={type:'FeatureCollection',features:[make('s1','LP 7',[S,A]),make('s2','LP 7',[A,B]),make('s3','LP 79',[B,C]),make('s4','LP 79',[C,S]),make('s5','LP 4',[B,D]),make('s6','LP 4',[D,E]),make('s7','LP 487',[E,F]),make('s8','LP 487',[F,D])]};

(async()=>{
 const {findLoops}=await import('../lib/snowmobile/loops.mjs');
 const {routeJunctions}=await import('../lib/snowmobile/routing.mjs');
 const live=livePath?JSON.parse(fs.readFileSync(livePath,'utf8')):null;
 const regionKey=live?live.region.key:'grayling-gaylord';
 const geometry=live?live.region.scoredGeometry:fixtureGeometry;
 const junctions=live?live.region.routeJunctions:routeJunctions(fixtureGeometry);
 const generatedAt=live?live.generatedAt:'2026-11-15T20:00:00.000Z';
 const loopReply=url=>{
  const q=new URL(url).searchParams,[lat,lon]=q.get('loop').split(',').map(Number);
  return {region:regionKey,loop:{lat,lon},miles:Number(q.get('miles')),closureVerification:false,generatedAt,season:{active:false},engine:'deterministic-loop-search',loops:findLoops(geometry,{lat,lon,targetMiles:Number(q.get('miles'))})};
 };
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/snowmobile/regions/'+regionKey+'.html';
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [label,width,height] of [['phone360',360,740],['phone390',390,844],['tablet768',768,1024],['desktop1440',1440,900]]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   let mode='ok',delay=0,requests=0;
   if(!live)await page.route('https://unpkg.com/**',r=>r.fulfill({status:200,body:'',contentType:'text/javascript'}));
   await page.route('https://pagead2.googlesyndication.com/**',r=>r.abort());
   await page.route('https://www.googletagmanager.com/**',r=>r.abort());
   await page.route('**/api/snowmobile?**',r=>live?r.fulfill({status:200,body:JSON.stringify(live),contentType:'application/json'}):r.fulfill({status:503,body:'{"error":"fixture"}',contentType:'application/json'}));
   await page.route('**/api/snowmobile-route?**',async r=>{
    requests++;
    if(delay)await new Promise(done=>setTimeout(done,delay));
    if(mode==='down')return r.fulfill({status:503,body:'{"error":"DNR source unavailable"}',contentType:'application/json'});
    const reply=loopReply(r.request().url());
    if(mode==='closed'&&reply.loops.options)reply.loops.options[0].segments[0].band='CLOSED';
    return r.fulfill({status:200,body:JSON.stringify(reply),contentType:'application/json'});
   });
   const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200,label);
   if(live){
    await page.waitForFunction(()=>typeof DATA==='object'&&DATA&&DATA.routeJunctions?.features?.length>0,{timeout:20000});
   }else{
    await page.waitForFunction(()=>!!window.SnowmobileLoopFinder&&document.querySelector('#status')?.textContent==='DATA UNAVAILABLE',{timeout:12000});
    await page.evaluate(j=>{DATA={key:'grayling-gaylord',season:{active:false},closures:{verified:false},routeJunctions:j};JUNCTIONS_BY_ID=new Map();MAP=null;updateRouteAvailability();},junctions);
   }
   // Closed by default; nothing is searchable until a start is chosen.
   assert.equal(await page.locator('#loopFinder').getAttribute('open'),null,label+' panel starts collapsed');
   await page.locator('#loopFinder > summary').click();
   assert.equal(await page.locator('#loopStartSearch').isEnabled(),true,label);
   assert.equal(await page.locator('#findLoops').isDisabled(),true,label+' no start yet');
   const query=live?String(junctions.features[0].properties.label).split(' / ')[0].slice(0,6):'LP 7';
   await page.locator('#loopStartSearch').fill(query);
   await page.locator('[data-loop-start]').first().waitFor({timeout:5000});
   const startCount=await page.locator('[data-loop-start]').count();
   assert.ok(startCount>=1&&startCount<=6,label);
   await page.locator('[data-loop-start]').first().click();
   assert.match(await page.locator('#loopStartChosen').innerText(),/^Start: /);
   await page.locator('[data-loop-miles="30"]').click();
   assert.equal(await page.locator('#loopMiles').inputValue(),'30');
   assert.equal(await page.locator('[data-loop-miles="30"]').getAttribute('aria-pressed'),'true');
   await page.locator('#loopMiles').fill('3');
   assert.equal(await page.locator('#findLoops').isDisabled(),true,label+' out-of-range miles cannot search');
   await page.locator('#loopMiles').fill(live?'60':'20');
   await page.locator('#findLoops').click();
   await page.locator('[data-loop-option]').first().waitFor({timeout:15000});
   const optionCount=await page.locator('[data-loop-option]').count();
   assert.ok(optionCount>=1&&optionCount<=4,label);
   assert.equal(await page.locator('[data-loop-option]').first().getAttribute('aria-checked'),'true',label+' first option is drawn');
   const first=await page.locator('#routeResult').innerText();
   assert.match(first,/Off-season/);
   assert.match(first,/Loop start and finish/);
   assert.match(first,/Distance planning, not a ride recommendation/);
   assert.match(await page.locator('#loopStatus').innerText(),/not a promise of rideable snow/);
   assert.equal(await page.locator('#downloadRouteGpx').isVisible(),true,label);
   if(shots){fs.mkdirSync(shots,{recursive:true});await page.locator('#routePlanner').screenshot({path:path.join(shots,label+'-loop.png')});}
   if(optionCount>1){
    // A, B, back to A: the detail and the export always follow the checked option.
    await page.locator('[data-loop-option]').nth(1).click();
    assert.equal(await page.locator('[data-loop-option]').nth(1).getAttribute('aria-checked'),'true');
    assert.equal(await page.locator('[data-loop-option]').first().getAttribute('aria-checked'),'false');
    const second=await page.locator('#routeResult').innerText();
    assert.notEqual(second,first,label+' second option must change the detail');
    await page.locator('[data-loop-option]').first().click();
    assert.equal(await page.locator('#routeResult').innerText(),first,label+' A, B, A restores the first plan exactly');
    // Arrow keys behave like a radio group.
    await page.locator('[data-loop-option]').first().focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('[data-loop-option]').nth(1).getAttribute('aria-checked'),'true',label+' keyboard selects');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator('[data-loop-option]').first().getAttribute('aria-checked'),'true');
   }
   const downloadPromise=page.waitForEvent('download',{timeout:12000});
   await page.locator('#downloadRouteGpx').click();
   const download=await downloadPromise;
   assert.match(download.suggestedFilename(),new RegExp('^michigan-snowmobile-'+regionKey+'-\\d{4}-\\d\\d-\\d\\d\\.gpx$'));
   const xml=fs.readFileSync(await download.path(),'utf8');
   assert.equal((xml.match(/<wpt /g)||[]).length,3,label+' start, halfway, finish');
   assert.ok(xml.includes('Loop start: ')&&xml.includes('Halfway: '));
   const trk=[...xml.matchAll(/<trkpt lat="([-\d.]+)" lon="([-\d.]+)"/g)];
   assert.ok(trk.length>=3&&Math.abs(trk[0][1]-trk.at(-1)[1])<0.001&&Math.abs(trk[0][2]-trk.at(-1)[2])<0.001,label+' GPX track returns to its start');
   for(const selector of ['#loopFinder','#loopOptions','#routeResult']){
    const box=await page.locator(selector).boundingBox();
    assert.ok(box&&box.x>=-1&&box.x+box.width<=width+2,label+' '+selector+' overflows the viewport');
   }
   for(const selector of ['#findLoops','[data-loop-option]','[data-loop-miles="60"]']){
    const box=await page.locator(selector).first().boundingBox();
    assert.ok(box.height>=44,label+' '+selector+' tap target under 44px');
   }
   // Starting the stop-by-stop planner takes over the one shared plan.
   await page.evaluate(()=>toggleRouteMode());
   assert.equal(await page.locator('[data-loop-option][aria-checked="true"]').count(),0,label+' loop is deselected');
   assert.equal(await page.evaluate(()=>LAST_ROUTE_EXPORT),null,label+' no stale export');
   assert.equal(await page.locator('#routeResult').isHidden(),true);
   await page.evaluate(()=>clearRoute());
   // A closed segment anywhere in the reply shows nothing.
   mode='closed';
   await page.locator('#findLoops').click();
   await page.waitForFunction(()=>/could not be verified/.test(document.querySelector('#loopStatus')?.textContent||''),{timeout:15000});
   assert.equal(await page.locator('[data-loop-option]').count(),0,label);
   assert.equal(await page.locator('#downloadRouteGpx').count(),0,label);
   // A failed request says so and shows nothing.
   mode='down';
   await page.locator('#findLoops').click();
   await page.waitForFunction(()=>/Loop search unavailable/.test(document.querySelector('#loopStatus')?.textContent||''),{timeout:15000});
   assert.equal(await page.locator('[data-loop-option]').count(),0,label);
   // A slow reply for an old start is ignored once a new start is chosen.
   mode='ok';delay=700;
   await page.locator('#findLoops').click();
   await page.locator('#loopStartSearch').fill(query);
   await page.locator('[data-loop-start]').last().click();
   await page.waitForTimeout(1100);
   assert.equal(await page.locator('[data-loop-option]').count(),0,label+' stale reply must not render');
   delay=0;
   assert.ok(requests>=4,label);
   assert.ok(!errors.some(s=>/SyntaxError|TypeError|ReferenceError/.test(s)),label+' browser JS errors: '+errors.join(' | '));
   console.log('PASS '+label+' loop search, compare, keyboard, GPX, planner hand-off, closed/failed/stale fail-closed, viewport'+(live?' (real production trail data)':''));
   await context.close();
  }
  const plain=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
  const page=await plain.newPage();
  await page.route('https://**',r=>r.abort());
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#loopFinder > summary').click();
  assert.match(await page.locator('#loopFinder noscript').innerText(),/official DNR snowmobile trail map/);
  console.log('PASS no-JavaScript fallback points to the official DNR map');
  await plain.close();
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
