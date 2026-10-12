'use strict';
/* Run in a CI runner with playwright installed. No paid APIs, pass-account data, or JEV needed. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base=process.env.EPIC_IKON_BROWSER_BASE||'http://127.0.0.1:4173';
const out=process.env.EPIC_IKON_SCREENSHOT_DIR||'artifacts/epic-ikon-v3';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let failed=0;
 async function check(mode,width,height){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errs=[];
  page.on('pageerror',error=>errs.push(error.message));
  await page.goto(base+'/epic-ikon-pass/?pass=epicLocal&resort=vail&date=2026-12-25&used=0&last=2026-12-29', {waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#v3-slice').waitFor({state:'visible',timeout:12000});
  const firstFold=await page.evaluate(()=>({decisionTop:document.getElementById('decision').getBoundingClientRect().top,scrollWidth:document.documentElement.scrollWidth}));
  await page.locator('#v3-gallery').scrollIntoViewIfNeeded();
  await page.locator('#v3-gallery img').last().scrollIntoViewIfNeeded();
  try{await page.waitForFunction(()=>[...document.querySelectorAll('#v3-gallery img')].every(i=>i.complete&&i.naturalWidth>0),{timeout:15000});}catch{}
  const verdict=await page.locator('#verdict-title').innerText();
  const decisions=await page.locator('#v3-day-by-day .v3-date-list li').allTextContents();
  const badCount=await page.locator('#v3-day-by-day .v3-date-list li[data-status="NO"]').count();
  const metrics={...firstFold,...await page.evaluate(()=>({
     width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
     decisionScrollAfterPhotoLoad:document.getElementById('decision').getBoundingClientRect().top,
     imageReports:[...document.querySelectorAll('#v3-gallery img')].map(i=>({url:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth,alt:i.alt})),
     hasCanvases:!!document.getElementById('v3-map-canvas'),
  }))};
  await page.screenshot({path:out+'/vail-'+mode+'.png',fullPage:true,animations:'disabled'});
  try {
   assert.match(verdict,/do not book/i,'first day valid but later blackout must govern entire trip');
   assert.equal(decisions.length,5,'all five selected ski days must appear');
   assert.equal(badCount,4,'Dec 26–29 must be blocked');
   assert.ok(metrics.scrollWidth<=width+1,'no horizontal overflow');
   assert.ok(metrics.decisionTop<height,'decision must begin on mobile first viewport');
   assert.equal(metrics.imageReports.length,3,'three Vail photographs');
   assert.ok(metrics.imageReports.every(x=>x.alt&&x.naturalWidth>0),'three actual files must load, not a hidden broken image');
   assert.equal(errs.length,0,'no uncaught client-side errors: '+errs.join('; '));
  }catch(error){failed++;console.error('FAIL '+mode,error.message);}
  console.log(JSON.stringify({mode,verdict,decisions,badCount,metrics,errors:errs},null,2));
  await page.close();
 }
 try{await check('390px',390,844);await check('desktop',1440,900)}
 finally{await browser.close();}
 if(failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
