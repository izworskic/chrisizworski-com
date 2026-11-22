#!/usr/bin/env node
'use strict';
// Local real-Chromium acceptance. No production mutation, user identifiers, or tracking.
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../artifacts/michigan-adventure-intent');
const url=process.env.MICHIGAN_DESTINATIONS_URL||'http://127.0.0.1:4179/michigan-destinations/';
fs.mkdirSync(root,{recursive:true});
const report={url,checkedAt:new Date().toISOString(),views:[],errors:[]};
function assert(ok,message){if(!ok)throw new Error(message)}
async function check(browser,width){
 const context=await browser.newContext({viewport:{width,height:840},deviceScaleFactor:1,
   reducedMotion:'reduce',locale:'en-US'});
 const page=await context.newPage(),jsErrors=[];
 page.on('pageerror',e=>jsErrors.push(e.message));
 // Product imagery is already covered by the independent photo audit. Keep
 // this interaction-focused run deterministic and cheap.
 await page.route(/\.(png|jpg|jpeg|webp)(\?|$)/i,route=>route.abort());
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 assert(response?.status()===200,'missing local page');
 await page.waitForFunction(()=>document.getElementById('intent-search')?.hidden===false);
 assert(await page.locator('article.destination:visible').count()===20,'initial no-search catalog changed');
 await page.locator('#intent-query').fill('leave the car behind and explore by bicycle after a lake crossing');
 await page.locator('#intent-query').press('Enter');
 await page.waitForFunction(()=>document.getElementById('intent-leading')?.getAttribute('href')==='#mackinac-island');
 await page.locator('#quick-find').screenshot({path:path.join(root,'search-'+width+'.png')});
 await page.locator('.result-bar').screenshot({path:path.join(root,'result-'+width+'.png')});
 const result=await page.locator('#result-title').innerText();
 const visible=await page.locator('article.destination:visible').count();
 assert(visible>=1&&visible<=8,'search result bound failed: '+visible);
 assert((await page.locator('#intent-leading').innerText()).includes('Mackinac Island'),'no field-note explanation');
 assert(!(await page.evaluate(()=>location.search)).includes('car') &&
   !(await page.evaluate(()=>location.search)).includes('intent'),'private query leaked to URL');
 await page.locator('#intent-query').fill('a huge tea-colored cascade and wooded walks in eastern Upper Michigan');
 await page.locator('#finder-form button[type="submit"]').click();
 assert((await page.locator('#intent-leading').getAttribute('href'))==='#tahquamenon','amber falls query failed');
 await page.locator('#region').selectOption('Southeast');
 assert(await page.locator('article.destination:visible').count()===0,'region filter did not override text relevance');
 await page.locator('#region').selectOption('all');
 assert((await page.locator('#intent-leading').getAttribute('href'))==='#tahquamenon','A→B→A selection failed');
 await page.locator('#intent-query').fill('Which beach has lifeguards supervising swimming today');
 await page.locator('#finder-form button[type="submit"]').click();
 assert(await page.locator('article.destination:visible').count()===0,'unsupported safety request was not rejected');
 assert((await page.locator('#result-context').innerText()).includes('lifeguards'),'unsupported reason not explained');
 await page.locator('#quick-find').screenshot({path:path.join(root,'no-match-'+width+'.png')});
 const alignment=await page.evaluate(()=>{
   const input=document.querySelector('#intent-query').getBoundingClientRect();
   const clear=document.querySelector('#clear-intent').getBoundingClientRect();
   const context=window.getComputedStyle(document.querySelector('#result-context'));
   return {inputBottom:input.bottom,clearBottom:clear.bottom,contextFont:parseFloat(context.fontSize)};
 });
 // Assert while Clear is visible (before reset), so hidden control has no zero box.
 assert(await page.locator('#clear-intent').isVisible(),'Clear action missing for filled search');
 // The 390px regression previously let a legacy selector push Clear into
 // its own row above the input while both source and functionality tests passed.
 assert(Math.abs(alignment.inputBottom-alignment.clearBottom)<22,
   width+': Clear is not on the search input row: '+JSON.stringify(alignment));
 if(width<600)assert(alignment.contextFont>=14,width+': result explanation is too small');
 await page.locator('#clear-intent').click();
 assert(await page.locator('article.destination:visible').count()===20,'clearing description did not recover all destinations');
 await page.locator('#when').selectOption('winter');
 const winterCount=await page.locator('article.destination:visible').count();
 assert(winterCount>0&&winterCount<20,'season select broken after search');
 await page.locator('#reset').click();
 assert(await page.locator('article.destination:visible').count()===20,'reset did not recover source catalog');
 assert(await page.locator('#intent-query').inputValue()==='','reset did not clear search');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert(overflow<=2,width+': page has '+overflow+'px horizontal overflow');
 await page.locator('#quick-find').screenshot({path:path.join(root,'finder-'+width+'.png')});
 const snapshot={viewport:width,searchResult:result,results:visible,seasonCount:winterCount,
   overflowPx:overflow,errors:jsErrors};
 report.views.push(snapshot);
 assert(!jsErrors.length,'page errors: '+jsErrors.slice(0,3).join(' / '));
 await context.close();
}
async function checkUnavailable(browser){
 const c=await browser.newContext({viewport:{width:390,height:844}});
 const p=await c.newPage();
 await p.route('**/assets/adventure-intent.js*',route=>route.abort());
 await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 assert(await p.locator('#intent-search').isHidden(),'search without engine must not be advertised');
 await p.locator('#region').selectOption('Southeast');
 assert(await p.locator('article.destination:visible').count()>0,'existing dropdown no longer works on engine failure');
 await c.close();
}
async function checkNoJs(browser){
 const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const p=await c.newPage();
 await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 assert(await p.locator('article.destination:visible').count()===20,'no-JS HTML list is missing');
 assert(await p.locator('#intent-search').isHidden(),'inert form is visible without JS');
 await c.close();
}
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',
    headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  await check(browser,390);
  await check(browser,1366);
  await checkUnavailable(browser);
  await checkNoJs(browser);
 }catch(e){report.errors.push(String(e.stack||e))}
 finally{
  if(browser)await browser.close();
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length)process.exitCode=1;
 }
})();
