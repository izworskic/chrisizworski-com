#!/usr/bin/env node
'use strict';
/* NYC Bridges guide: responsive, real-photo, real-map and progressive-enhancement QA. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/nyc-bridges-qa');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const uri=new URL(req.url,'http://127.0.0.1');
  if(uri.pathname==='/api/carto-basemap-config'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return}
  const file=path.resolve(root,'.'+(uri.pathname.endsWith('/')?uri.pathname+'index.html':uri.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found')}
});
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/nyc-bridges/';
 const report={page:url,views:[],photos:[],failures:[]};
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const view of [{width:1366,height:900,name:'desktop1366'},{width:390,height:844,name:'mobile390'}]){
   const ctx=await browser.newContext({viewport:{width:view.width,height:view.height},reducedMotion:'reduce',locale:'en-US'});
   const page=await ctx.newPage(),jsErrors=[];
   page.on('pageerror',e=>jsErrors.push(e.message));
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   assert(response&&response.status()===200,'HTTP error on '+view.name);
   assert(await page.locator('.bridge-entry').count()===6,'Six bridge profiles missing');
   const crumbTop=await page.locator('.crumbs').evaluate(el=>el.getBoundingClientRect().top);
   assert(crumbTop<145,view.name+' first-screen gap exceeds 145px: '+crumbTop);

   await page.locator('.hero').screenshot({path:path.join(out,view.name+'-hero.png')});
   await page.locator('#bridge-map').scrollIntoViewIfNeeded();
   await page.waitForTimeout(4500);
   const mapTiles=await page.locator('.leaflet-tile-loaded').count();
   const mapPins=await page.locator('.leaflet-marker-icon').count();
   assert(mapPins===6,view.name+' bridge map markers '+mapPins);
   assert(mapTiles>=3,view.name+' fewer than three rendered map tiles '+mapTiles);
   await page.locator('.atlas-layout').screenshot({path:path.join(out,view.name+'-atlas.png')});
   await page.locator('.filter[data-filter="engineering"]').click();
   assert(await page.locator('.bridge-entry:visible').count()===3,'Engineering filter did not show three');
   assert(await page.locator('#bridge-map .leaflet-marker-icon').count()===3,'Filter not synced with pins');
   await page.locator('.filter[data-filter="all"]').click();
   assert(await page.locator('.bridge-entry:visible').count()===6,'Restore filter failed');
   await page.locator('#light-date').fill('2026-10-30');
   await page.locator('#light-form button').click();
   const txt=await page.locator('#light-results').innerText();
   assert(/Sunrise/.test(txt)&&/Sunset/.test(txt)&&/\b(?:AM|PM)\b/.test(txt),view.name+' light planner result missing '+txt);
   await page.locator('[data-day="uptown"]').click();
   assert(/High Bridge/.test(await page.locator('#day-panel').innerText()),view.name+' outing toggle failed');
   const images=page.locator('.bridge-photo img');
   for(let i=0;i<6;i++){
    const im=images.nth(i);await im.scrollIntoViewIfNeeded();
    let loaded=false;
    try{await page.waitForFunction(index=>{const img=document.querySelectorAll('.bridge-photo img')[index];return img&&img.complete&&img.naturalWidth>100},i,{timeout:18000});loaded=true}catch{}
    const state=await im.evaluate(el=>({url:el.currentSrc,loaded:el.complete,px:el.naturalWidth,alt:el.alt}));
    report.photos.push({viewport:view.name,index:i,id:await images.nth(i).locator('xpath=../..').getAttribute('class'),...state});
    assert(loaded,view.name+' photo '+i+' did not load: '+state.url);
    assert(state.alt.length>20,view.name+' photo '+i+' missing alt');
    assert(await im.locator('xpath=..').locator('figcaption a').count()>=2,view.name+' photo credits missing');
    if([0,3,5].includes(i))await page.locator('.bridge-entry').nth(i).screenshot({path:path.join(out,view.name+'-card-'+i+'.png')});
   }
   const heroImg=await page.locator('.hero-image img').evaluate(el=>({width:el.naturalWidth,complete:el.complete}));assert(heroImg.width>100,view.name+' hero photo did not load');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(overflow<=2,view.name+' horizontal overflow '+overflow);
   assert(jsErrors.length===0,view.name+' JS errors '+jsErrors.join('; '));
   report.views.push({name:view.name,tiles:mapTiles,pins:mapPins,photos:6,overflow,lightPlanner:'passed',itinerary:'passed',filters:'passed'});
   await ctx.close();
  }
  const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await ctx.newPage();await page.goto(url,{waitUntil:'domcontentloaded'});
  assert(await page.locator('.bridge-entry').count()===6,'No-JavaScript profiles missing');
  assert(await page.locator('.bridge-entry a:has-text("Official source")').count()===6,'No-JavaScript official sources missing');
  await ctx.close();
 }catch(e){report.failures.push(String(e.stack||e));}
 finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({views:report.views,photos:report.photos.map(x=>({index:x.index,viewport:x.viewport,px:x.px,loaded:x.loaded})),failures:report.failures},null,2));
  if(report.failures.length)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
