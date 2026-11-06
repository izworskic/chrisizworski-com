#!/usr/bin/env node
'use strict';
// Live provider diagnostics; results are observations, not safety/bridge-status assertions.
// This probe does not use cookies, credentials, hotlink bypass, or a camera stream proxy.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../artifacts/skyway-camera-live');
fs.mkdirSync(out,{recursive:true});
const PAGE='https://chrisizworski.com/sunshine-skyway-bridge/';
const IMAGE='https://fl511.com/map/Cctv/2553';
(async()=>{
 const report={checkedAt:new Date().toISOString(),page:PAGE,source:IMAGE,events:[],errors:[],probes:[]};
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',ignoreHTTPSErrors:false});
  const page=await ctx.newPage();
  page.on('pageerror',e=>report.errors.push('pageerror: '+e.message));
  page.on('requestfailed',request=>{if(request.url().includes('fl511.com/map/Cctv'))report.events.push({kind:'requestfailed',url:request.url(),error:request.failure()?.errorText})});
  page.on('response',response=>{
   if(response.url().includes('fl511.com/map/Cctv'))report.events.push({kind:'response',status:response.status(),url:response.url(),contentType:response.headers()['content-type'],corp:response.headers()['cross-origin-resource-policy'],cors:response.headers()['access-control-allow-origin']});
  });
  const nav=await page.goto(PAGE,{waitUntil:'domcontentloaded',timeout:30000});
  report.pageStatus=nav?.status();
  await page.locator('#skywayCameraImage').waitFor({timeout:30000});
  await page.locator('#skywayCameraImage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(6000);
  report.initial=await page.locator('#skywayCameraImage').evaluate(el=>({complete:el.complete,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,hidden:el.hidden,src:el.currentSrc}));
  report.initialText=await page.locator('#skywayCameraImageStatus').textContent();
  report.pageCsp=await page.locator('meta[http-equiv="Content-Security-Policy"]').count();
  await page.locator('#cameras').screenshot({path:path.join(out,'initial-camera.png')});
  // A no-referrer load may distinguish vendor hotlink controls from image decode failure.
  await page.locator('#skywayCameraImage').evaluate(el=>{
   el.referrerPolicy='no-referrer';
   el.hidden=false;
   el.src='https://fl511.com/map/Cctv/2553?cameraProbe='+Date.now();
  });
  await page.waitForTimeout(5000);
  report.noReferrer=await page.locator('#skywayCameraImage').evaluate(el=>({complete:el.complete,naturalWidth:el.naturalWidth,hidden:el.hidden,src:el.currentSrc}));
  await page.locator('#cameras').screenshot({path:path.join(out,'no-referrer-camera.png')});
  try{
   const direct=await ctx.request.get(IMAGE+'?probe='+Date.now(),{timeout:15000});
   report.direct={status:direct.status(),contentType:direct.headers()['content-type'],corp:direct.headers()['cross-origin-resource-policy'],cors:direct.headers()['access-control-allow-origin']};
  }catch(e){report.direct={error:String(e.message||e).slice(0,500)}}
  await ctx.close();
 }catch(e){report.errors.push(e.stack||String(e));}
 finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
