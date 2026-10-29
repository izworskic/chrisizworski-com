#!/usr/bin/env node
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'artifacts/sleeping-giant-browser');
fs.mkdirSync(out,{recursive:true});
const preview=path.join(out,'preview');
execFileSync(process.execPath,[path.join(root,'scripts/export-sleeping-giant-visitor-preview.mjs'),preview],{
 encoding:'utf8',cwd:root,timeout:30000
});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname!=='/'&&url.pathname!=='/index.html'){res.writeHead(404);res.end();return}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 fs.createReadStream(path.join(preview,'index.html')).pipe(res);
});
const must=(condition,message)=>{if(!condition)throw Error(message)};
async function main(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const target='http://127.0.0.1:'+server.address().port+'/';
 const report={reviewOnly:true,sourceDate:'2026-10-29',viewports:[],failures:[],screenshots:[]};
 let browser;
 try{
   browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
     headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
   for(const viewport of [
     {name:'desktop',width:1440,height:900},
     {name:'phone',width:390,height:844}
   ]){
     const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
       deviceScaleFactor:1,reducedMotion:'reduce'});
     const page=await context.newPage(),errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     const response=await page.goto(target,{waitUntil:'domcontentloaded',timeout:25000});
     must(response?.status()===200,viewport.name+' local preview not 200');
     must(await page.locator('.route-card').count()===6,viewport.name+' six static cards missing');
     must((await page.locator('#result-hint').innerText()).includes('Only Ontario Parks'),viewport.name+' planner JS did not initialize');
     must(await page.locator('#route-shapes path').count()===2,viewport.name+' default Sea Lion map not 2 sections');
     const visible=await page.locator('[data-id="sea-lion"] .card-decision').innerText();
     must(visible.includes('Published hiking range fits')||visible.includes('Ontario Parks'),viewport.name+' source duration unavailable');
     // The hero is a CSS background: layout-only screenshots do not prove its
     // remote licensed photo has loaded, so validate the actual image bytes.
     const hero=await page.evaluate(async()=>{
       const css=getComputedStyle(document.querySelector('.hero-image')).backgroundImage;
       const match=css.match(/url\(["']?([^"')]+)["']?\)/);
       if(!match)return {ok:false,reason:'no CSS image url',css};
       const url=match[1];
       return await new Promise(resolve=>{
         const photo=new Image();
         const timer=setTimeout(()=>resolve({ok:false,reason:'timeout',url}),15000);
         photo.onload=()=>{clearTimeout(timer);resolve({ok:photo.naturalWidth>=600,
           url,width:photo.naturalWidth,height:photo.naturalHeight})};
         photo.onerror=()=>{clearTimeout(timer);resolve({ok:false,reason:'load error',url})};
         photo.src=url;
       });
     });
     must(hero.ok,viewport.name+' licensed Sleeping Giant hero did not load '+JSON.stringify(hero));
     const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,screen:innerWidth}));
     must(overflow.doc<=overflow.screen+3,viewport.name+' horizontal overflow '+JSON.stringify(overflow));
     await page.screenshot({path:path.join(out,viewport.name+'-hero.png'),animations:'disabled'});
     report.screenshots.push(viewport.name+'-hero.png');
     await page.locator('#hours').selectOption('12');
     await page.locator('#interest').selectOption('summit');
     await page.locator('input[name="mode"][value="bike-hike"]').check();
     const top=page.locator('[data-id="top-of-the-giant"]');
     must((await top.locator('.card-decision').innerText()).includes('no official total'),viewport.name+' bike timing shown as known');
     await top.locator('button[data-select="top-of-the-giant"]').click();
     must(await page.locator('#route-shapes path').count()===3,viewport.name+' Top bike/foot geometry missing');
     must(await page.locator('#bike-breakdown').isVisible(),viewport.name+' bike/walk section hidden');
     must((await page.locator('#bike-breakdown').innerText()).includes('13.4 km cycling'),viewport.name+' official split missing');
     must((await page.locator('#gap-note').innerText()).includes('unverified'),viewport.name+' parking gap not disclosed');
     await page.locator('#map-section').screenshot({path:path.join(out,viewport.name+'-map.png'),animations:'disabled'});
     report.screenshots.push(viewport.name+'-map.png');
     await page.locator('[data-id="middlebrun-beach"] button[data-select="middlebrun-beach"]').click();
     must(await page.locator('#route-shapes path').count()===0,viewport.name+' unmapped Middlebrun invented route');
     must((await page.locator('#mapped-distance').innerText())==='Not mapped',viewport.name+' missing map uncertainty');
     must(await page.locator('a[href*="maps/dir"]').count()===0,viewport.name+' forbidden directions');
     must(errors.length===0,viewport.name+' JS errors '+errors.join('; '));
     report.viewports.push({viewport:viewport.name,width:viewport.width,
       staticCards:6,defaultMappedSections:2,topMappedSections:3,
       bikeSplitTest:true,unmappedRouteTest:true,horizontalOverflow:false,scriptErrors:0});
     await context.close();
   }
   const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
   const page=await noJs.newPage();
   await page.goto(target,{waitUntil:'domcontentloaded'});
   must(await page.locator('.route-card').count()===6,'No-JavaScript route cards unavailable');
   must((await page.locator('body').innerText()).includes('21.8 km'),'No-JavaScript full official return unavailable');
   must((await page.locator('body').innerText()).includes('not a live trail report'),'No-JavaScript caveat missing');
   must(await page.locator('a[href*="ontarioparks.ca/park/sleepinggiant/alerts"]').count()>=1,
     'No-JavaScript official alerts link missing');
   report.viewports.push({viewport:'no-script',staticCards:6,sourceLinks:true});
   await noJs.close();
 }catch(e){report.failures.push(String(e.stack||e));throw e}
 finally {
   if(browser)await browser.close();
   await new Promise(ok=>server.close(ok));
   fs.writeFileSync(path.join(out,'browser-qa.json'),JSON.stringify(report,null,2)+'\n');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
