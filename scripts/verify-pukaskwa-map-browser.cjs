#!/usr/bin/env node
'use strict';
/**
 * Validates the actual user-visible Pukaskwa access map, not just its data.
 * Tests official map image, seven real GIS markers, OSM fallback, map/chooser
 * synchronization, 360/390/768/1366 responsive, blocked tiles, no-JS source.
 */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(__dirname,'../artifacts/pukaskwa-access-map');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.jpg':'image/jpeg'};
const fixture={
  ok:true,park:'pukaskwa',
  monitor:{health:'ok',recent:true,checkedAt:'2026-10-31T14:40:21Z',lastSuccessAt:'2026-10-31T14:40:21Z'},
  dayHikes:[
    ['boardwalk-beach','Boardwalk Beach Trail',30,1.2,'easy','stale','2026-10-12'],
    ['hattie-cove-fire-walk','Hattie Cove Fire Walk',20,.7,'easy','source-unverified',null],
    ['beach','Beach Trail',60,2,'moderate','stale','2026-10-12'],
    ['southern-headland','Southern Headland Trail',75,2.2,'moderate','stale','2026-10-12'],
    ['manito-miikana','Manito Miikana',60,2,'moderate','stale','2026-10-12'],
    ['bimose-kinoomagewnan','Bimose Kinoomagewnan',120,3.7,'moderate','stale','2026-10-12'],
    ['combination-hike','Combination Hike',210,6.3,'moderate','stale','2026-10-12'],
    ['white-river-bridge','White River Suspension Bridge',540,18,'difficult','closed','2026-10-22'],
  ].map(([id,name,hikingMinutes,distanceKm,difficulty,status,issuedOn])=>({
    id,name,hikingMinutes,distanceKm,difficulty,status,
    observations:issuedOn?[{name,status,issuedOn}]:[],
  })),
};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/api/pukaskwa-conditions'){
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify(fixture));return;
    }
    if(url.pathname==='/api/carto-basemap-config'){
      res.writeHead(503,{'Content-Type':'application/json'});
      res.end('{"error":"Unavailable in test"}');return;
    }
    const rel=url.pathname==='/pukaskwa-national-park/'?'/pukaskwa-national-park/index.html':url.pathname;
    const file=path.resolve(root,'.'+rel);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const st=await fs.promises.stat(file).catch(()=>null);
    if(!st?.isFile()){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(await fs.promises.readFile(file));
  }catch(e){res.writeHead(500);res.end('server error');}
});
const check=(ok,message)=>{if(!ok)throw Error(message)};
(async()=>{
 let browser;
 const report={views:[],photos:[],failures:[],screenshots:[],source:'Parks Canada / public official POIs',mapProvider:'OSM fallback fixture'};
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/pukaskwa-national-park/';
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const view of [{name:'phone360',width:360,height:760},{name:'phone390',width:390,height:844},{name:'tablet768',width:768,height:1024},{name:'desktop1366',width:1366,height:900}]){
    const context=await browser.newContext({viewport:{width:view.width,height:view.height},reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    check(response?.status()===200,view.name+' page HTTP status');
    await page.locator('#pk-official-map-image').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{const image=document.querySelector('#pk-official-map-image');return image&&image.complete;},null,{timeout:25000});
    const visual=await page.locator('#pk-official-map-image').evaluate(el=>({naturalWidth:el.naturalWidth,url:el.currentSrc,alt:el.alt}));
    check(visual.naturalWidth>=500,view.name+' official diagram image decoded');
    check((await page.locator('#pk-official-map-tab').getAttribute('aria-pressed'))==='true',view.name+' official map default');
    check(await page.locator('.pk-map-place').count()===7,view.name+' seven static GIS points');
    check(await page.locator('.pk-map-place-actions a[href^="https://www.google.com/maps/search/"]').count()===7,view.name+' 7 native map links');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    check(overflow<=2,view.name+' horizontal overflow: '+overflow);
    report.photos.push({view:view.name,...visual});
    await page.locator('#pk-interactive-map-tab').click();
    await page.waitForFunction(()=>document.body.dataset.pkMapReady==='true'||document.body.dataset.pkMapReady==='fallback',null,{timeout:35000});
    const ready=await page.evaluate(()=>document.body.dataset.pkMapReady);
    check(ready==='true',view.name+' real basemap never loaded; state='+ready+' status='+await page.locator('#pk-map-status').innerText());
    const tiles=await page.evaluate(()=>({
      provider:document.querySelector('#pk-interactive-map')?.dataset.tiles,
      tileCount:[...document.querySelectorAll('#pk-interactive-map img.leaflet-tile-loaded')].filter(img=>img.naturalWidth>0).length,
      pinCount:document.querySelectorAll('#pk-interactive-map path.leaflet-interactive:not(.pk-community-trail)').length,
      trailCount:document.querySelectorAll('#pk-interactive-map path.pk-community-trail').length,
      trailVerified:document.querySelector('#pk-interactive-map')?.dataset.trailLines
    }));
    check(tiles.tileCount>0,view.name+' no actual raster tiles');
    check(tiles.pinCount===7,view.name+' GIS pin count '+tiles.pinCount);
    check(tiles.trailCount===14,view.name+' approved community path segments '+tiles.trailCount);
    check(tiles.trailVerified==='14',view.name+' source-qualified line layer missing');
    check((await page.locator('#pk-show-trail-lines').isChecked())===true,view.name+' trail overlay switch on');
    check(tiles.provider==='osm'||tiles.provider==='carto',view.name+' missing tile provider confirmation');
    await page.locator('#pk-map-focus-choice').click();
    check((await page.locator('#pk-map-place-southern-headland-chair').getAttribute('data-picked'))==='true',view.name+' default trail-chair synchronization');
    await page.locator('#pk-map-focus-trail').click();
    check((await page.locator('#pk-interactive-map').getAttribute('data-active-trail'))==='southern-headland',view.name+' default mapped line selected');
    check(await page.locator('#pk-interactive-map path.pk-community-trail').count()===14,view.name+' actual vector line shapes retained');

    await page.locator('input[name="pk-time"][value="30"]').check();
    await page.locator('#pk-effort').selectOption('easy');
    await page.locator('#pk-vibe').selectOption('beach');
    check((await page.locator('#pk-result-heading').innerText())==='Boardwalk Beach Trail',view.name+' chooser changed');
    check((await page.locator('#pk-map-choice-title').innerText())==='Boardwalk Beach Trail',view.name+' map reason tracks chooser');
    await page.locator('#pk-map-focus-choice').click();
    check((await page.locator('#pk-map-place-horseshoe-beach').getAttribute('data-picked'))==='true',view.name+' beach destination highlighted');
    check((await page.locator('#pk-map-choice-body').innerText()).includes('not a starting point'),view.name+' shoreline pin caveat');
    await page.locator('#pk-map-focus-trail').click();
    check((await page.locator('#pk-interactive-map').getAttribute('data-active-trail'))==='boardwalk-beach',view.name+' chooser-highlighted boardwalk route');
    check(await page.locator('#pk-interactive-map .leaflet-popup').count()===0,view.name+' place popup no longer obscures requested trail line');
    await page.locator('#pk-show-trail-lines').uncheck();
    check(await page.locator('#pk-interactive-map path.pk-community-trail').count()===0,view.name+' community trail toggle off');
    check(await page.locator('#pk-interactive-map path.leaflet-interactive').count()===7,view.name+' source GIS pins unaffected when paths hidden');
    await page.locator('#pk-show-trail-lines').check();
    check(await page.locator('#pk-interactive-map path.pk-community-trail').count()===14,view.name+' community route toggle restored');
    const lineShot=view.name+'-trail-lines.png';
    await page.locator('.pk-map-shell').screenshot({path:path.join(out,lineShot),timeout:20000});
    report.screenshots.push(lineShot);

    await page.locator('#pk-official-map-tab').click();
    check(await page.locator('#pk-official-map-image').isVisible(),view.name+' original map restores');
    check(errors.length===0,view.name+' JS errors: '+errors.slice(0,3).join('; '));
    const filename=view.name+'-access-map.png';
    await page.locator('.pk-map-shell').screenshot({path:path.join(out,filename),timeout:20000});
    report.screenshots.push(filename);
    report.views.push({...view,overflowPx:overflow,provider:tiles.provider,loadedTiles:tiles.tileCount,gisPins:tiles.pinCount,osmTrailLines:tiles.trailCount,connectedChoice:'Boardwalk Beach',errors});
    await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    await page.route('**/pukaskwa-national-park/trail-centerlines.geojson',route=>route.fulfill({
      status:503,contentType:'application/json',body:'{"error":"source disconnected"}'
    }));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    await page.locator('#pk-interactive-map-tab').click();
    await page.waitForFunction(()=>document.body.dataset.pkMapReady==='true'||document.body.dataset.pkMapReady==='fallback',null,{timeout:35000});
    check((await page.locator('#pk-interactive-map').getAttribute('data-trail-lines'))==='unavailable','missing trail data clearly marked');
    check(await page.locator('#pk-interactive-map path.leaflet-interactive').count()===7,'missing OSM route source keeps official GIS pins and tiles');
    check((await page.locator('#pk-trail-lines-status').innerText()).includes('unavailable'),'missing lines explained visibly');
    report.views.push({name:'trail-source-failure',mapPins:7,routeStatus:'unavailable',officialMapStillExists:true});
    await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    await page.route('**/tile.openstreetmap.org/**',route=>route.abort());
    await page.route('**/basemaps.cartocdn.com/**',route=>route.abort());
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    await page.locator('#pk-interactive-map-tab').click();
    await page.waitForFunction(()=>document.body.dataset.pkMapReady==='fallback',null,{timeout:35000});
    check(await page.locator('#pk-official-map-image').isVisible(),'tile failure should show official map, not blank space');
    check((await page.locator('#pk-map-status').innerText()).includes('original Parks Canada trail map'),'fallback status must explain authoritative map remains');
    check(await page.locator('.pk-map-place-actions a[href^="https://www.google.com/maps/search/"]').count()===7,'tile failure retains native links');
    report.views.push({name:'tile-failure',fallback:'official-illustrated-map',gisLinks:7});
    await context.close();
  }
  {
    const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:760}});
    const page=await context.newPage();
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    check(await page.locator('#pk-official-map-image').isVisible(),'noJS official map');
    check(await page.locator('.pk-map-place').count()===7,'noJS seven public places');
    check(await page.locator('.pk-map-place-actions a[href^="https://www.google.com/maps/search/"]').count()===7,'noJS native map links');
    check((await page.locator('.pk-map-evidence').innerText()).includes('OpenStreetMap contributors'),'no-JS license and path disclaimer visible');
    report.views.push({name:'no-JS',officialDiagram:true,placeLinks:7});
    await context.close();
  }
 }catch(e){report.failures.push(String(e.stack||e));}
 finally{
  if(browser)await browser.close();
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.failures.length)process.exitCode=1;
 }
})();
