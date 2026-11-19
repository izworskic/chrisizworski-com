#!/usr/bin/env node
'use strict';
// Only the isolated noindex prototype is tested. Nothing here claims a live
// launch, a public access clearance, or a native Penpot MCP connection.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const pageUrl=pathToFileURL(path.resolve(__dirname,'../docs/visual-pilots/rocket-launch-live/preview.html')).href;
const out=path.resolve(__dirname,'../artifacts/rocket-penpot-pilot');
fs.mkdirSync(out,{recursive:true});
const errors=[],report=[];
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const v of [{name:'phone360',width:360,height:820},{name:'phone390',width:390,height:844},{name:'tablet768',width:768,height:960},{name:'desktop1440',width:1440,height:1000}]){
   const context=await browser.newContext({viewport:{width:v.width,height:v.height},reducedMotion:'reduce'});
   const page=await context.newPage();
   page.on('pageerror',e=>errors.push(v.name+': '+e.message));
   await page.goto(pageUrl,{waitUntil:'load'});
   assert.equal(await page.locator('.option[aria-pressed="true"]').count(),0,v.name+' pre-selected a location as a recommendation');
   assert.equal(await page.locator('#maps-link').isVisible(),false,v.name+' opened a map before a choice');
   const choose=async id=>{const b=page.locator('[data-site="'+id+'"]');await b.click();assert.equal(await b.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.option[aria-pressed="true"]').count(),1);};
   await choose('visitor');
   assert.match(await page.locator('#detail-title').innerText(),/NASA Wallops Visitor Center/);
   assert.match(await page.locator('#rules-link').getAttribute('href'),/nasa\.gov/);
   assert.match(decodeURIComponent(await page.locator('#maps-link').getAttribute('href')),/NASA Wallops Visitor Center/);
   await choose('waterfront');
   assert.match(await page.locator('#detail-title').innerText(),/Robert Reed Waterfront Park/);
   assert.match(await page.locator('#rules-link').getAttribute('href'),/chincoteague-va\.gov/);
   assert.match(decodeURIComponent(await page.locator('#maps-link').getAttribute('href')),/Robert N Reed Sr Downtown Waterfront Park/);
   await choose('harbor');
   assert.match(await page.locator('#detail-title').innerText(),/Curtis Merritt Harbor/);
   await choose('visitor');
   assert.match(await page.locator('#detail-title').innerText(),/NASA Wallops Visitor Center/);
   await page.locator('[data-site="waterfront"]').focus();
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('[data-site="waterfront"]').getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('#detail-title').innerText(),/Robert Reed Waterfront Park/);
   const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
   assert(overflow<=2,v.name+' has horizontal overflow: '+overflow);
   const shot=v.name+'-selected.png';
   await page.screenshot({path:path.join(out,shot),fullPage:true,animations:'disabled'});
   report.push({viewport:v.name,overflowPx:overflow,buttons:3,selected:'waterfront',keyboard:true,abareversible:true,screenshot:shot});
   await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({prototype:'Rocket mission-to-shore',status:'passed',browser:'chromium',report},null,2));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',report},null,2)+'\n');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e.stack||e);process.exitCode=1});
