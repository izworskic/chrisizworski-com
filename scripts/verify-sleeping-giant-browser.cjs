#!/usr/bin/env node
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),siteMode=process.argv.includes('--site'),
 out=path.resolve(root,siteMode?'artifacts/sleeping-giant-site-browser':'artifacts/sleeping-giant-browser');
fs.mkdirSync(out,{recursive:true});
const preview=path.join(out,'preview');
execFileSync(process.execPath,[path.join(root,siteMode?'scripts/build-sleeping-giant-site.mjs':'scripts/export-sleeping-giant-visitor-preview.mjs'),...(siteMode?['--out',preview]:[preview])],{
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
 const report={reviewOnly:!siteMode,siteIntegration:siteMode,sourceDate:'2026-10-29',viewports:[],failures:[],screenshots:[]};
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
     if(siteMode){
       const metadata=await page.evaluate(()=>({
         canonical:document.querySelector('link[rel="canonical"]')?.href||null,
         robots:document.querySelector('meta[name="robots"]')?.content||null,
         adLoaders:document.querySelectorAll('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]').length,
         publisher:document.querySelector('meta[name="google-adsense-account"]')?.content||null,
         schema:JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
       }));
       must(metadata.canonical==='https://chrisizworski.com/sleeping-giant-provincial-park/',
         viewport.name+' canonical differs from dedicated park intent');
       must(metadata.robots.startsWith('index,follow'),viewport.name+' public page not indexable');
       must(metadata.adLoaders===1&&metadata.publisher==='ca-pub-8222782620788075',
         viewport.name+' standard one-ad-loader contract failed');
       const owner=metadata.schema['@graph'].find(x=>x['@type']==='WebPage');
       must(owner?.author?.['@id']==='https://chrisizworski.com/#person',
         viewport.name+' author identity contract failed');
     }

     must((await page.locator('#result-hint').innerText()).includes('Only Ontario Parks'),viewport.name+' planner JS did not initialize');
     must(await page.locator('#route-shapes path').count()===2,viewport.name+' default Sea Lion map not 2 sections');
     must((await page.locator('#map-canvas').getAttribute('aria-label')).includes('Sea Lion'),viewport.name+' default map accessibility name incorrect');
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
     must((await page.locator('#map-canvas').getAttribute('aria-label')).includes('Top of the Giant'),viewport.name+' mapped route accessible name stale');
     must(await page.locator('#bike-breakdown').isVisible(),viewport.name+' bike/walk section hidden');
     must((await page.locator('#bike-breakdown').innerText()).includes('13.4 km cycling'),viewport.name+' official split missing');
     must((await page.locator('#gap-note').innerText()).includes('unverified'),viewport.name+' parking gap not disclosed');
     const mapFocus=page.locator('#map-focus');
     must(await mapFocus.isEnabled(),viewport.name+' mapped route should enable inspection controls');
     await mapFocus.selectOption('destination');
     const destinationView=await page.locator('#map-canvas').getAttribute('viewBox');
     must(destinationView!=='0 0 820 610',viewport.name+' destination focus did not zoom map');
     await mapFocus.selectOption('parking');
     const parkingView=await page.locator('#map-canvas').getAttribute('viewBox');
     must(parkingView!==destinationView,viewport.name+' parking focus did not shift to the separate research point');
     must((await page.locator('#map-zoom-status').innerText()).includes('not for navigation'),
       viewport.name+' inspection mode must remain explicitly non-navigable');
     await mapFocus.selectOption('overview');
     must((await page.locator('#map-canvas').getAttribute('viewBox'))==='0.00 0.00 820.00 610.00',
       viewport.name+' full research route reset did not work');
     await page.locator('#map-section').screenshot({path:path.join(out,viewport.name+'-map.png'),animations:'disabled'});
     report.screenshots.push(viewport.name+'-map.png');
     await page.locator('[data-id="middlebrun-beach"] button[data-select="middlebrun-beach"]').click();
     must(await page.locator('#route-shapes path').count()===0,viewport.name+' unmapped Middlebrun invented route');
     const missingMapLabel=await page.locator('#map-canvas').getAttribute('aria-label');
     must(missingMapLabel.includes('Middlebrun Bay Beach')&&missingMapLabel.includes('No research trail outline'),viewport.name+' unmapped route accessible name misleading');
     must((await page.locator('#mapped-distance').innerText())==='Not mapped',viewport.name+' missing map uncertainty');
     must(await page.locator('#map-focus').isDisabled(),viewport.name+' no invented focus for unmapped destinations');
     must(await page.locator('a[href*="maps/dir"]').count()===0,viewport.name+' forbidden directions');
     must(errors.length===0,viewport.name+' JS errors '+errors.join('; '));
     report.viewports.push({viewport:viewport.name,width:viewport.width,
       staticCards:6,defaultMappedSections:2,topMappedSections:3,
       bikeSplitTest:true,mapFocusTest:true,unmappedRouteTest:true,horizontalOverflow:false,scriptErrors:0});
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
