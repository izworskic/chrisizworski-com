#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const origin='http://127.0.0.1:4179';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={checked_at:new Date().toISOString(),sha:process.env.GITHUB_SHA||'local',scope:'Offline HTML fixture; live data, maps and ads not assessed',checks:[]};
 let criticalCount=0;
 let adventureSeriousCount=0;
 try{
  for(const route of ['/michigan-destinations/','/michigan-snow-totals/','/michigan-ski-hills/']){
   for(const width of [390,1280]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    try{
     await page.route('**/*',request=>request.request().url().startsWith(origin+'/')?request.continue():request.abort());
     const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:20000});
     assert.equal(response.status(),200,route+' HTTP 200');
     assert.ok(await page.locator('main').count(),route+' has main');
     assert.ok(await page.locator('h1').count(),route+' has h1');
     const metadata=await page.evaluate(()=>({
      title:document.title,lang:document.documentElement.lang,
      canonical:document.querySelector('link[rel="canonical"]')?.href||''
     }));
     assert.ok(metadata.title&&metadata.lang,route+' has metadata');
     assert.match(metadata.canonical,/^https:\/\/chrisizworski\.com\//,route+' canonical remains owned');
     const scan=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
     const violations=scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}));
     const critical=violations.filter(v=>v.impact==='critical');
     criticalCount+=critical.length;
     if(route==='/michigan-destinations/') adventureSeriousCount+=violations.filter(v=>v.impact==='serious').length;
     report.checks.push({route,width,metadata,violations});
     console.log(route+' width='+width+' violations='+violations.length+' critical='+critical.length);
    }finally{await context.close();}
   }
  }
 }finally{
  await browser.close();
  const dest=path.resolve('artifacts/web-quality');
  fs.mkdirSync(dest,{recursive:true});
  fs.writeFileSync(path.join(dest,'axe-browser.json'),JSON.stringify(report,null,2)+'\n');
 }
 assert.equal(criticalCount,0,'No critical axe violations in the pilot main regions');
 assert.equal(adventureSeriousCount,0,'No serious axe violations on the Adventure Finder pilot');
})().catch(error=>{console.error(error);process.exitCode=1;});
