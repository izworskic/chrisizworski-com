#!/usr/bin/env node
'use strict';
/* Browser integration smoke. Runs in GitHub Action with Playwright installed at CI time;
 * intercepts only the planner API with the actual deterministic planner output.
 * No fabricated attraction results and no outbound API keys. */
const {chromium}=require('playwright');
const {plan}=require('../lib/niagara-falls/planner.js');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.join(process.cwd(),'artifacts/niagara-v3-browser');
fs.mkdirSync(output,{recursive:true});
async function check(){
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [375,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',err=>errors.push(String(err)));
   await page.route('**/api/niagara-falls-today',async route=>{
    try{
     const req=JSON.parse(route.request().postData()||'{}');
     const data=plan(req,new Date('2026-10-12T13:00:00.000Z'));
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    }catch(e){await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:String(e)})});}
   });
   await page.route('https://www.youtube-nocookie.com/**',route=>route.abort());
   await page.goto('http://127.0.0.1:8123/niagara-falls-today/',{waitUntil:'networkidle'});
   await page.locator('.stop .guide-scene').first().waitFor({timeout:15000});
   assert.equal(errors.length,0,'Browser JS error: '+errors.join('; '));
   const photo=await page.locator('.hero-photo img').evaluate(el=>({loaded:el.complete&&el.naturalWidth>0,width:el.naturalWidth,height:el.naturalHeight}));
   assert.deepEqual(photo,{loaded:true,width:1600,height:900},'First-party Niagara hero did not decode');
   assert.equal(await page.locator('.hero-photo img').count(),1);
   assert.equal(await page.locator('.field-scene,.scene-grid,.film-grid,.stop-visual').count(),0);
   assert.ok(await page.locator('.stop .guide-scene').count()>=1);
   assert.equal(await page.locator('iframe').count(),0,'unexpected video on initial load');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
   assert.equal(overflow,false,'Horizontal overflow at '+width+'px');
   await page.screenshot({path:path.join(output,'ny-'+width+'.png'),fullPage:true});
   const nyText=await page.locator('#guide-side').textContent();
   assert.match(nyText,/Starting in New York/);
   await page.locator('label:has(input[name="starting_side"][value="CA"])').click();
   await page.waitForFunction(()=>document.querySelector('#guide-side')?.textContent?.includes('Starting in Ontario'));
   await page.locator('.stop .guide-scene').first().waitFor({timeout:8000});
   assert.ok(await page.locator('.preview-inline').count()===1,'Canadian Table Rock preview missing');
   assert.equal(await page.locator('.preview-inline iframe').count(),0);
   const btn=page.locator('[data-niagara-video]');
   await btn.click();
   const frame=page.locator('.preview-inline iframe');
   await frame.waitFor({timeout:7000});
   assert.match(await frame.getAttribute('src'),/youtube-nocookie\.com\/embed\/DlMgURteL3E/);
   await page.screenshot({path:path.join(output,'on-'+width+'.png'),fullPage:true});
   console.log('Niagara V3 browser pass '+width+'px, local photo '+photo.width+'x'+photo.height+', source-backed US and Canada guide');
   await page.close();
  }
 }finally{await browser.close();}
}
check().catch(e=>{console.error(e);process.exitCode=1;});
