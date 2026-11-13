'use strict';
// Local Playwright acceptance, real responsive rendering against deterministic
// server-owned source values. No external traffic API or asserted current closure.
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {buildSnapshot}=require('../lib/nyc-crossing/engine');
const root=path.resolve(__dirname,'..');
const dest=path.join(root,'artifacts/experience-foundry');
fs.mkdirSync(dest,{recursive:true});
const sampleTraffic={
 state:'PARTIAL',routes:[
 {crossingId:'gwb',etaMinutes:14,scope:'CROSSING_APPROACH',direction:'Inbound'},
 {crossingId:'lincoln',etaMinutes:16,scope:'CROSSING_APPROACH',direction:'Inbound'},
 {crossingId:'holland',etaMinutes:17,scope:'CROSSING_APPROACH',direction:'Inbound'},
 {crossingId:'queens-midtown',etaMinutes:11,scope:'CROSSING_APPROACH',direction:'Inbound'},
 {crossingId:'brooklyn',etaMinutes:20,scope:'APPROACH_CORRIDOR',direction:'Toward Manhattan'},
 {crossingId:'manhattan',etaMinutes:19,scope:'APPROACH_CORRIDOR',direction:'Toward Manhattan'},
 {crossingId:'williamsburg',etaMinutes:15,scope:'CROSSING_APPROACH',direction:'Toward Manhattan'},
 {crossingId:'rfk',etaMinutes:12,scope:'APPROACH_SEGMENT',direction:'Toward Manhattan'},
 {crossingId:'verrazzano',etaMinutes:10,scope:'CROSSING_ONLY',direction:'Brooklyn-bound'}
 ],comparable:false
};
let calls=0;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/nyc-crossing'){
   calls++;
   const data=buildSnapshot({payment:url.searchParams.get('payment')||'ny-ezpass',
    vehicle:{type:url.searchParams.get('vehicle')||'car'},
    destinationZone:url.searchParams.get('destinationZone')!=='false',
    travelAt:url.searchParams.get('travelAt')||'2026-11-10T08:00:00',
    traffic:sampleTraffic,ny511:{state:'STALE',updatedAt:null,events:{updatedAt:null},signs:{updatedAt:null},crossings:{}}});
   data.departure={state:'UNAVAILABLE',reason:'Verified source not available in offline browser QA.'};
   res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
   res.end(JSON.stringify(data));return;
 }
 let file=null;
 if(url.pathname==='/nyc-crossing/'||url.pathname==='/')file='public/nyc-crossing/index.html';
 else if(/^\/assets\/nyc-crossing\.(js|css)$/.test(url.pathname))file='public'+url.pathname;
 if(!file){res.writeHead(404);res.end('Not found');return;}
 const body=fs.readFileSync(path.join(root,file));
 res.writeHead(200,{'content-type':file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html'});
 res.end(body);
});
const listen=()=>new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const close=()=>new Promise(ok=>server.close(ok));
const summary=[];
(async()=>{
 await listen();
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
 try{
   for(const width of [360,390,768,1440]){
     const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
     await context.route(/pagead2|googletagmanager|google-analytics|doubleclick/,route=>route.abort());
     const page=await context.newPage();
     const errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await page.goto('http://127.0.0.1:'+server.address().port+'/nyc-crossing/',{waitUntil:'domcontentloaded'});
     await page.waitForSelector('.pair-card',{timeout:15000});
     const baseline=await page.locator('#pairResult').innerText();
     assert.match(baseline,/Queens–Midtown Tunnel/);
     assert.match(baseline,/Queensboro Bridge/);
     assert.match(baseline,/Live measurement unavailable/);
     assert.match(baseline,/cannot establish which route is fastest/);
     const index=await page.evaluate(()=>({
       form:document.getElementById('crossingForm').compareDocumentPosition(document.getElementById('nyc-toll-rates')),
       scroll:document.documentElement.scrollWidth,viewport:innerWidth
     }));
     assert(index.form & 4,'the trip form must precede the toll reference');
     assert(index.scroll<=index.viewport+2,'horizontal overflow at '+width+': '+JSON.stringify(index));
     const before=calls;
     await page.selectOption('#pairB','lincoln');
     const changed=await page.locator('#pairResult').innerText();
     assert.match(changed,/Lincoln Tunnel/);
     assert.notEqual(changed,baseline,'changing crossing must update the answer');
     await page.selectOption('#pairB','queensboro');
     const restored=await page.locator('#pairResult').innerText();
     assert.equal(restored,baseline,'return to original crossing must restore identical output');
     assert.equal(calls,before,'local selector must not call provider');
     await page.locator('#pairB').focus();
     assert.equal(await page.locator('#pairB').evaluate(el=>el===document.activeElement),true);
     const cardFile=path.join(dest,'nyc-pair-'+width+'.png');
     await page.locator('#crossing-pair').screenshot({path:cardFile});
     assert.equal(errors.length,0,'browser JS errors at '+width+': '+errors.join('; '));
     summary.push({width,passed:true,apiRequestsDuringPairChange:calls-before,screenshot:path.relative(root,cardFile)});
     await context.close();
   }
   const context=await browser.newContext({viewport:{width:390,height:850}});
   await context.route(/pagead2|googletagmanager|google-analytics|doubleclick/,route=>route.abort());
   const page=await context.newPage();
   await page.goto('http://127.0.0.1:'+server.address().port+'/nyc-crossing/',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('.pair-card');
   await page.locator('[name="vehicle"]').selectOption('large-truck');
   await page.locator('#crossingForm button[type=submit]').click();
   // The submit awaits a fresh asynchronous API response. Do not assert on
   // the previous car comparison before the restricted-vehicle cards render.
   await page.waitForFunction(() => /Vehicle:\s*(PROHIBITED|REVIEW)/.test(
     document.querySelector('#pairResult')?.textContent || ''), null, {timeout:15000});
   const vehicle=await page.locator('#pairResult').innerText();
   assert.match(vehicle,/PROHIBITED|REVIEW/);
   assert.match(vehicle,/prevent a valid price comparison|must be reviewed/);
   await page.route('**/api/nyc-crossing*',route=>route.fulfill({status:503,body:'Service unavailable'}));
   await page.locator('#crossingForm button[type=submit]').click();
   await page.getByText('Live crossing comparison unavailable',{exact:true}).waitFor();
   assert.doesNotMatch(await page.locator('#results').innerText(),/\d+ min/);
   summary.push({scenario:'prohibited vehicle and failed API',passed:true});
   await context.close();
   const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:850}});
   const fallback=await nojs.newPage();
   await fallback.goto('http://127.0.0.1:'+server.address().port+'/nyc-crossing/',{waitUntil:'domcontentloaded'});
   assert(await fallback.locator('table.static-toll-rates tbody tr').count()===11);
   assert(await fallback.locator('link[rel=canonical]').getAttribute('href')==='https://chrisizworski.com/nyc-crossing/');
   summary.push({scenario:'no-JavaScript official toll source and canonical',passed:true});
   await nojs.close();
   fs.writeFileSync(path.join(dest,'nyc-crossing-browser-results.json'),JSON.stringify({passed:true,summary},null,2));
   process.stdout.write(JSON.stringify({passed:true,summary})+'\n');
 }finally{await browser.close();}
})().catch(e=>{process.stderr.write(String(e.stack||e)+'\n');process.exitCode=1}).finally(async()=>{await close();});
