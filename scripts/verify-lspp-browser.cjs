#!/usr/bin/env node
'use strict';
/* Browser verification: real checked-in HTML and JS; CARTO 503 intentionally
   tests live OpenStreetMap fallback. Screenshots retained as workflow artifacts. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const chromium=require('playwright').chromium;
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/lspp');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/api/carto-basemap-config'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"test OSM fallback"}');return;}
    const route=url.pathname==='/lake-superior-provincial-park/'?'/lake-superior-provincial-park/index.html':url.pathname;
    const f=path.resolve(root,'.'+route);
    if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const st=await fs.promises.stat(f).catch(()=>null);
    if(!st?.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(f).toLowerCase()]||'application/octet-stream'});
    res.end(await fs.promises.readFile(f));
  }catch{res.writeHead(500);res.end('Server error');}
});
function need(v,msg){if(!v)throw Error(msg);}
async function main(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port+'/lake-superior-provincial-park/';
 let browser;const report={date:new Date().toISOString(),cases:[],screens:[],failures:[]};
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const size of [{name:'phone',width:390,height:844},{name:'desktop',width:1366,height:900}]){
   const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   need(response.status()===200,size.name+' HTML status');
   need(await page.locator('#cards article.card').count()===10,size.name+' static card count');
   await page.waitForFunction(()=>window.L && document.querySelectorAll('.leaflet-marker-icon').length>=6,null,{timeout:25000});
   await page.waitForTimeout(7000);
   const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth,screen:window.innerWidth}));
   need(overflow.page<=overflow.screen+2,size.name+' horizontal overflow '+JSON.stringify(overflow));
   need(errors.length===0,size.name+' JavaScript errors '+errors.join('; '));
   const photos=await page.locator('.hero-gallery img').evaluateAll(nodes=>nodes.map(x=>({complete:x.complete,width:x.naturalWidth,src:x.currentSrc})));
   need(photos.length===2&&photos.every(x=>x.complete&&x.width>0),size.name+' real hero photos '+JSON.stringify(photos));
   await page.screenshot({path:path.join(out,size.name+'-top.png')});report.screens.push(size.name+'-top.png');
   // Show every guide card before testing its lazy image; default filters
   // intentionally hide closed hikes and longer walks.
   await page.locator('#season').selectOption('future');
   await page.locator('#budget').selectOption('480');
   await page.locator('#showClosed').check();
   const cardPhotos=page.locator('.card-photo img');
   need(await cardPhotos.count()===7,size.name+' seven licensed card photos');
   for(let pi=0;pi<await cardPhotos.count();pi++){
     const photo=cardPhotos.nth(pi);
     await photo.scrollIntoViewIfNeeded();
     await page.waitForFunction(index=>{
       const i=document.querySelectorAll('.card-photo img')[index];
       return i && i.complete;
     },pi,{timeout:15000});
     const state=await photo.evaluate(el=>({src:el.currentSrc,width:el.naturalWidth}));
     need(state.width>0,size.name+' card photo '+pi+' did not load '+state.src);
   }
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.locator('#access-map').scrollIntoViewIfNeeded();
   await page.waitForTimeout(5500);
   const tiles=await page.locator('.leaflet-tile-loaded').evaluateAll(nodes=>nodes.filter(x=>x.complete&&x.naturalWidth>0).length);
   need(tiles>=3,size.name+' needed three live fallback tiles, found '+tiles);
   const pins=await page.locator('.leaflet-marker-icon').count();
   need(pins>=6,size.name+' six official site pins, found '+pins);
   await page.locator('#access-map').screenshot({path:path.join(out,size.name+'-map.png')});report.screens.push(size.name+'-map.png');
   // Every government-located bubble needs a Google Maps place link.
   // Five confirmed destination positions may show driving directions for a future
   // operating season; the closed Agawa Rock pictograph site must remain view-only.
   const bubbleLabels=[];
   for(let mi=0;mi<pins;mi++){
     await page.locator('.leaflet-marker-icon').nth(mi).dispatchEvent('click');
     const popup=page.locator('.leaflet-popup-content:visible').last();
     await popup.waitFor({state:'visible',timeout:5000});
     const place=popup.locator('a.lspp-google-place');
     need(await place.count()===1,size.name+' marker '+mi+' Google Maps location link');
     const placeUrl=new URL(await place.getAttribute('href'));
     need(placeUrl.hostname==='www.google.com' && placeUrl.pathname==='/maps/search/' && placeUrl.searchParams.get('api')==='1',
       size.name+' marker '+mi+' Google Maps location URL invalid');
     const name=await popup.locator('strong').first().innerText();
     const directions=popup.locator('a.lspp-google-directions');
     if(name.includes('Agawa Rock')){
       need(await directions.count()===0,size.name+' sacred pictograph marker must never give driving directions');
       need((await popup.innerText()).includes('closed'),size.name+' sacred pictograph marker must explain closure');
     }else{
       need(await directions.count()===1,size.name+' '+name+' missing driving directions');
       const driveUrl=new URL(await directions.getAttribute('href'));
       need(driveUrl.hostname==='www.google.com' && driveUrl.pathname==='/maps/dir/' && driveUrl.searchParams.get('api')==='1',
         size.name+' '+name+' Google directions URI invalid');
       need(/^47\.[0-9]+,-84\.[0-9]+$/.test(driveUrl.searchParams.get('destination')||''),
         size.name+' '+name+' directions destination missing coordinates');
       need(driveUrl.searchParams.get('travelmode')==='driving' && !driveUrl.searchParams.has('origin'),
         size.name+' '+name+' directions should use visitor-supplied current origin');
     }
     bubbleLabels.push(name);
   }
   need(bubbleLabels.length===6,size.name+' all six map bubbles tested');

   await page.locator('#season').selectOption('future');
   await page.locator('#budget').selectOption('480');
   await page.locator('#build').click();
   need(!(await page.locator('#planStops').innerText()).includes('Agawa Rock'),size.name+' Agawa not recommended');
   const route=page.locator('#verified-drive-route a[href*="maps/dir"]');
   need(await route.count()===1,size.name+' future map route link');
   need(!(await route.getAttribute('href')).includes('47.370316'),size.name+' no sacred site routing');
   await page.locator('#season').selectOption('current');
   await page.locator('.leaflet-marker-icon').first().dispatchEvent('click');
   need(await page.locator('.leaflet-popup-content:visible a.lspp-google-place').count()===1,
     size.name+' off-season bubble still allows viewing Google Maps location');
   need(await page.locator('.leaflet-popup-content:visible a.lspp-google-directions').count()===0,
     size.name+' off-season bubble must not give driving directions');
   await page.locator('#build').click();
   need((await page.locator('#planIntro').innerText()).includes('No open-day-use itinerary'),size.name+' off-season access gate');
   need(await page.locator('#verified-drive-route a[href*="maps/dir"]').count()===0,size.name+' no current driving route');
   report.cases.push({viewport:size.name,photos:photos.length,tiles,pins,googleMapsPopups:bubbleLabels.length,closedSiteViewOnly:true,overflow:false,routeGuard:true});
   await ctx.close();
  }
  const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await ctx.newPage();await page.goto(url,{waitUntil:'domcontentloaded'});
  need(await page.locator('#cards article.card').count()===10,'no-JS cards');
  need(await page.locator('#verified-location-list li').count()===6,'no-JS sources');
  need(await page.locator('a[href*="ontarioparks.ca/park/lakesuperior/alerts"]').count()>=1,'no-JS official alerts');
  await ctx.close();report.cases.push({viewport:'no-js',cards:10,locations:6});
  console.log('LSPP browser QA PASSED',JSON.stringify(report.cases));
 }catch(e){report.failures.push(e.stack||String(e));console.error('LSPP browser QA FAILED',e.stack||e);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(ok=>server.close(ok));}
}
main();
