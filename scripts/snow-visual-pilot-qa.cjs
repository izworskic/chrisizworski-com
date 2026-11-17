// Final capture after spacing pass.
#!/usr/bin/env node
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('/tmp/snow-visual/node_modules/playwright');
const base=path.resolve('public'),evidence=path.resolve('docs/visual-pilots/michigan-snow-totals');
fs.mkdirSync(evidence,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.ico':'image/x-icon','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=path.resolve(base,'.'+decodeURIComponent(url.pathname));
 if(!p.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 const file=fs.existsSync(p)&&fs.statSync(p).isDirectory()?path.join(p,'index.html'):p;
 if(!fs.existsSync(file)){res.writeHead(404).end('Not found');return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(4173,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,executablePath:process.env.SNOW_CHROME||undefined,args:['--no-sandbox']});
 try {
   const observations=[];
   for(const width of [360,390,768,1280]){
     const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',deviceScaleFactor:1});
     const page=await context.newPage(),errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await page.route('**/api/michigan-snow-totals*',async route=>{
       const u=new URL(route.request().url());
       try{
         const reply=await fetch('https://chrisizworski.com'+u.pathname+u.search,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});
         if(!reply.ok)throw new Error('API '+reply.status);
         await route.fulfill({status:200,contentType:'application/json',body:await reply.text()});
       }catch(e){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:false,error:'source unavailable'})});}
     });
     await page.goto('http://127.0.0.1:4173/michigan-snow-totals/?window=72h',{waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>!/Loading the latest NWS snow reports/.test(document.getElementById('snowSummary')?.textContent||''),null,{timeout:30000});
     await page.locator('#snowMap').scrollIntoViewIfNeeded();
     await page.waitForTimeout(1200);
     await page.evaluate(()=>window.scrollTo(0,0));
     await page.waitForTimeout(250);
     const inspect=await page.evaluate(()=>{
       const answer=document.querySelector('.snow-answer').getBoundingClientRect(),map=document.querySelector('.map-wrap').getBoundingClientRect();
       const css=getComputedStyle(document.querySelector('.site-header'));
       return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,mapBelowAnswer:map.top>=answer.bottom-1,stickyHeader:css.position==='sticky',summary:document.getElementById('snowSummary').textContent.trim().slice(0,260),mapTiles:document.querySelectorAll('.leaflet-tile-loaded').length,guideLinksAboveMap:document.getElementById('headingOut').getBoundingClientRect().top<map.top};
     });
     console.log('VISUAL_LAYOUT '+JSON.stringify(inspect));
     assert(inspect.scrollWidth<=width+2,'Document horizontal overflow at '+width+': '+JSON.stringify(inspect));
     assert(inspect.mapBelowAnswer,'Map not directly after answer at '+width);
     assert(inspect.stickyHeader,'Header not sticky');
     assert(inspect.guideLinksAboveMap,'Related tools links unexpectedly below map');
     if(width===390 || width===1280){
       await page.screenshot({path:path.join(evidence,'after-'+width+'.png'),animations:'disabled'});
       await page.locator('.map-wrap').screenshot({path:path.join(evidence,'after-map-'+width+'.png'),animations:'disabled'});
     }
     await page.locator('.windows button[data-window="24h"]').click();
     assert.equal(await page.locator('.windows button[data-window="24h"]').getAttribute('aria-pressed'),'true');
     await page.locator('.windows button[data-window="168h"]').click();
     assert.equal(await page.locator('.windows button[data-window="168h"]').getAttribute('aria-pressed'),'true');
     await page.locator('.windows button[data-window="24h"]').click();
     assert.equal(await page.locator('.windows button[data-window="24h"]').getAttribute('aria-pressed'),'true');
     assert.equal(errors.length,0,'JavaScript errors: '+errors.join('; '));
     observations.push({width,...inspect,errors});
     await context.close();
   }
   const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
   const page=await context.newPage();await page.goto('http://127.0.0.1:4173/michigan-snow-totals/');
   assert(await page.locator('a[href="https://mesonet.agron.iastate.edu/lsr/"]').count()>0,'No NWS archive fallback');
   assert(await page.locator('noscript').count()>0,'No noscript map fallback');
   await page.locator('.answer-next summary').click();
   assert(await page.locator('#headingOut a').first().isVisible(),'Native disclosure unavailable without JavaScript');
   await context.close();
   fs.writeFileSync(path.join(evidence,'browser-qa.json'),JSON.stringify({checkedAt:new Date().toISOString(),observations,noJavaScript:'PASS',reducedMotion:'PASS'},null,2)+'\n');
   console.log(JSON.stringify(observations,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
