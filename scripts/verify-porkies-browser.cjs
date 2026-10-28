#!/usr/bin/env node
"use strict";
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'), out=path.resolve(__dirname,'../artifacts/porkies-browser');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
fs.mkdirSync(out,{recursive:true});
const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    const wanted=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname;
    const f=path.resolve(root,'.'+wanted);
    if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const data=await fs.promises.readFile(f).catch(()=>null);
    if(!data){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});
    res.end(data);
  }catch(e){res.writeHead(500);res.end('Server error');}
});
function need(value,message){if(!value)throw Error(message);}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/porcupine-mountains/';
 const report={reviewDate:new Date().toISOString(),cases:[],photos:[],screenshots:[],failures:[]};
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const device of [{name:'mobile',width:390,height:844},{name:'desktop',width:1366,height:900},{name:'narrow',width:340,height:750}]){
   const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:1,ignoreHTTPSErrors:false});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   need(response?.status()===200,device.name+' HTML load failed');
   need(await page.locator('h1').count()===1,device.name+' missing H1');
   need((await page.locator('h1').innerText()).includes('Porkies'),device.name+' missing identity');
   need(await page.locator('#planner select').count()===4,device.name+' planner inputs missing');
   need(await page.locator('article.story').count()===3,device.name+' static destination stories missing');
   need(await page.locator('#crossings .crossing-card').count()===4,device.name+' evidence-supported river crossing desk missing');
   await page.locator('.crossing-inventory summary').click();
   need(await page.locator('.crossing-inventory-row').count()===9,device.name+' nine independent current-condition records missing');
   need((await page.locator('.crossing-inventory').innerText()).includes('No currently verified route'),device.name+' current bridge conditions incorrectly cleared');
   need((await page.locator('#crossings').innerText()).includes('No automated through-route'),device.name+' safety blocker not visible');

   need(await page.locator('.parking-card').count()===6,device.name+' six static DNR crosschecked parking cards missing');
   await page.waitForFunction(()=>window.L && document.querySelectorAll('#parking-map .leaflet-interactive').length>=6,null,{timeout:20000});
   await page.waitForTimeout(2000);
   const pinCount=await page.locator('#parking-map .leaflet-interactive').count();
   need(pinCount>=6,device.name+' expected six mapped DNR parking pins, got '+pinCount);
   const tiles=await page.locator('#parking-map .leaflet-tile-loaded').evaluateAll(images=>images.filter(img=>img.complete&&img.naturalWidth>0).length);
   need(tiles>=3,device.name+' map has too few visible real tiles '+tiles);
   await page.locator('#parking-map').screenshot({path:path.join(out,device.name+'-parking-map.png')});
   report.screenshots.push(device.name+'-parking-map.png');
   if(device.name==='desktop'){
     await page.locator('#porkies-trails-toggle').click();
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('Showing 819 DNR hiking features'),null,{timeout:30000});
     need(await page.locator('#porkies-trails-toggle').getAttribute('aria-pressed')==='true','trail overlay should be enabled');
     const trailLines=await page.locator('.leaflet-porkies-trail-evidence-pane path').count();
     need(trailLines>=500,'DNR trail overlay lacks the expected source linework '+trailLines);
     await page.locator('#porkies-roads-toggle').click();
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('selected park-area road centerlines'),null,{timeout:25000});
     await page.locator('#porkies-ski-toggle').click();
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('Showing 40 DNR ski-trail records'),null,{timeout:25000});
     const skiLines=await page.locator('.leaflet-porkies-ski-evidence-pane path').count();
     need(skiLines>=20,'Official DNR ski routes not rendered '+skiLines);
     const roadLines=await page.locator('.leaflet-porkies-road-evidence-pane path').count();
     need(roadLines>=50,'Official park-road centerline layer missing '+roadLines);
     await page.locator('#parking-map').screenshot({path:path.join(out,'desktop-road-trail-evidence.png')});
     report.screenshots.push('desktop-road-trail-evidence.png');
     await page.locator('#travel-date').fill('2027-01-15');
     await page.locator('#planner button[type=submit]').click();
     const marked=await page.locator('.leaflet-porkies-road-evidence-pane path[stroke="#ad4839"]').count();
     need(marked>=10,'seasonal park road segments not visibly flagged in winter '+marked);
     await page.locator('#travel-date').fill('2026-10-28');
     await page.locator('#planner button[type=submit]').click();
     await page.locator('#porkies-trails-toggle').click();
     await page.locator('#porkies-roads-toggle').click();
     await page.locator('#porkies-ski-toggle').click();
   }
   await page.waitForFunction(()=>document.querySelector('#results h3')?.textContent.includes('Build around'),null,{timeout:10000});
   let overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   need(overflow.scroll<=overflow.viewport+2,device.name+' horizontal overflow '+JSON.stringify(overflow));
   need(errors.length===0,device.name+' JS errors '+errors.join('; '));
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(out,device.name+'-hero.png')});
   report.screenshots.push(device.name+'-hero.png');
   await page.locator('#arrival').selectOption('west');
   await page.locator('#hours').selectOption('2');
   await page.locator('#travel-date').fill('2026-10-28');
   await page.locator('#planner button[type=submit]').click();
   let content=await page.locator('#results').innerText();
   need(content.includes('Presque Isle River waterfalls'),device.name+' west 2h did not select waterfall district');
   need(content.includes('Lake of the Clouds is in a different area'),device.name+' did not disclose far-detour tradeoff');

   await page.locator('#parking-focus').click();
   need(await page.locator('.parking-card:visible').count()===1,device.name+' focused itinerary should show one west-side parking match');
   need(await page.locator('[data-parking-id="presque"]:visible').count()===1,device.name+' selected west-side parking card missing');
   await page.locator('#travel-date').fill('2027-01-15');
   await page.locator('#planner button[type=submit]').click();
   content=await page.locator('#results').innerText();
   need(content.includes('Presque Isle River scenic-area access'),device.name+' distinct west-side winter approach missing');
   need(content.includes('not assumed available'),device.name+' winter road exclusion missing');

   await page.locator('#parking-all').click();
   need(await page.locator('[data-parking-id="lake"] .parking-drive').count()===0,device.name+' lake summer-road directions leaked in winter');
   need(await page.locator('[data-parking-id="summit"] .parking-drive').count()===0,device.name+' summit summer-road directions leaked in winter');
   const cr519=page.locator('[data-parking-id="presque"] .parking-drive');
   need(await cr519.count()===1,device.name+' official CR519 independent winter approach missing');
   const googleLink=new URL(await cr519.getAttribute('href'));
   need(googleLink.hostname==='www.google.com'&&googleLink.pathname==='/maps/dir/'&&googleLink.searchParams.get('api')==='1',device.name+' DNR parking route URL malformed');
   await page.locator('#arrival').selectOption('east');
   await page.locator('#planner button[type=submit]').click();
   await page.waitForFunction(()=>!document.querySelector('[data-parking-id="presque"] .parking-drive'),null,{timeout:5000});
   need(await page.locator('[data-parking-id="presque"] .parking-drive').count()===0,device.name+' east-origin winter route incorrectly offered County Road 519 across closed park');
   need(await page.locator('[data-parking-id="ski"] .parking-drive').count()===1,device.name+' east-origin winter sports route missing');
   content=await page.locator('#results').innerText();
   need(content.includes('Winter Sports Complex'),device.name+' eastern winter planner did not select ski complex');
   await page.locator('#travel-date').fill('2027-05-02');
   await page.locator('#planner button[type=submit]').click();
   content=await page.locator('#results').innerText();
   need(content.includes('Spring road reopening must be confirmed'),device.name+' May guard missing');
   await page.locator('#travel-date').fill('2026-10-28');
   await page.locator('#arrival').selectOption('east');
   await page.locator('#hours').selectOption('8');
   await page.locator('#ability').selectOption('low');
   await page.locator('#planner button[type=submit]').click();
   content=await page.locator('#results').innerText();
   need(content.includes('Lake of the Clouds'),device.name+' accessible outlook missing');
   need(!content.includes('Suggested experiences\nSummit Peak'),device.name+' inappropriate tower suggestion');
   await page.locator('#results').screenshot({path:path.join(out,device.name+'-decision.png')});
   report.screenshots.push(device.name+'-decision.png');
   if(device.name!=='narrow'){
     const imgs=page.locator('.hero-photo img,.story img');
     for(let i=0;i<await imgs.count();i++){
       const img=imgs.nth(i);
       await img.scrollIntoViewIfNeeded();
       await page.waitForFunction(index=>{
         const e=document.querySelectorAll('.hero-photo img,.story img')[index];
         return Boolean(e&&e.complete);
       },i,{timeout:20000});
       const info=await img.evaluate(el=>({url:el.currentSrc,width:el.naturalWidth,height:el.naturalHeight}));
       report.photos.push({device:device.name,index:i,...info});
       need(info.width>0,device.name+' failed image '+i+' '+info.url);
     }
     await page.locator('.story-grid').screenshot({path:path.join(out,device.name+'-stories.png')});
     report.screenshots.push(device.name+'-stories.png');
   }
   report.cases.push({device:device.name,viewport:device.width+'x'+device.height,overflow:'pass',errors:0,planner:'pass'});
   await ctx.close();
  }
  const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await noJS.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  need(await page.locator('article.story').count()===3,'no JS static experiences missing');
  need(await page.locator('#crossings .crossing-card').count()===4,'no JS verified DNR crossing evidence missing');
  need(await page.locator('.crossing-inventory-row').count()===9,'no JS bridge source cards missing');
  need(await page.locator('#sources a').count()>=5,'no JS official sources missing');
  need(await page.locator('.parking-card').count()===6,'no JS six DNR parking source cards missing');
  need((await page.locator('#routing-explainer').innerText()).includes('7 separate groups'),'source-only trail topology fallback missing');
  need(await page.locator('.parking-maplink').count()===6,'no JS parking map pin links missing');
  need(await page.locator('.story a[href*="upper-peninsula-waterfalls"]').count()===3,'no JS waterfall handoffs missing');
  await page.screenshot({path:path.join(out,'no-js-mobile.png')});
  report.screenshots.push('no-js-mobile.png');
  report.cases.push({device:'no-JavaScript',stories:3,officialSources:true,fallWaterfallLinks:true});
  await noJS.close();
 }catch(e){report.failures.push(e.stack||String(e));}
 finally {
  await fs.promises.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
 }
 console.log(JSON.stringify(report,null,2));
 if(report.failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
