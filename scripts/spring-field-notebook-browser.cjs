#!/usr/bin/env node
'use strict';
/* Browser acceptance for the source-owned Michigan Spring Field Notebook. */
const {chromium}=require(process.env.SPRING_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(process.env.SPRING_QA_OUTPUT||'artifacts/spring-notebook-browser');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const uri=new URL(req.url,'http://127.0.0.1');
  let file=path.resolve(root,'.'+decodeURIComponent(uri.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try {
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.end(fs.readFileSync(file));
  }catch(_){res.writeHead(404);res.end('Not found');}
});
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port+'/michigan-spring-awakening-field-guide/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={source:'isolated static source',viewports:[],noJs:false,keyboard:false,externalPhotoLoading:'NOT_VERIFIED',production:'NOT_VERIFIED'};
 try {
  for(const width of [360,390,768,1280,1440]){
   const ctx=await browser.newContext({viewport:{width,height:840},reducedMotion:'reduce'});
   // Screenshots measure our authored layout without relying on outside image or tag endpoints.
   await ctx.route('**/*',r=>new URL(r.request().url).host==='127.0.0.1:'+new URL(origin).port?r.continue():r.abort());
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin,{waitUntil:'domcontentloaded'});
   const notebook=page.locator('#spring-field-notebook');
   assert.ok(await notebook.isVisible(),'Notebook absent at '+width);
   assert.match(await page.locator('#sp-notebook-title').innerText(),/first chorus/i);
   const rect=await notebook.boundingBox();
   assert.ok(rect && rect.y<420,'Notebook appears too far below heading at '+width+': '+rect?.y);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=1,'Horizontal page overflow '+overflow+'px at '+width);
   assert.ok(await page.locator('#sp-notebook-chapters a').count()>=3);
   await page.locator('[data-sp-month="may"]').click();
   assert.match(await page.locator('#sp-notebook-title').innerText(),/woodland bloom/i);
   assert.match(await page.locator('#sp-notebook-next').getAttribute('href'),/bloom-tracker/);
   await page.locator('#sp-notebook-region').selectOption('46.4');
   assert.match(await page.locator('#sp-zone-name').innerText(),/Upper Peninsula/);
   assert.equal(await page.locator('#sp-lat-slider').inputValue(),'46.4');
   await page.locator('[data-sp-month="march"]').click();
   assert.match(await page.locator('#sp-notebook-title').innerText(),/tapping/i);
   assert.equal(await page.locator('#sp-notebook-next').getAttribute('href'),'/michigan-maple-sap-run/');
   await page.locator('#sp-notebook-region').selectOption('43.5');
   await page.locator('[data-sp-month="april"]').click();
   assert.match(await page.locator('#sp-notebook-title').innerText(),/first chorus/i);
   assert.equal(await page.locator('[data-sp-month="april"]').getAttribute('aria-pressed'),'true');
   await page.locator('[data-pheno-filter="wildflower"]').click();
   assert.equal(await page.locator('#vernal-pool-wood-frog').isVisible(),false);
   await page.locator('#sp-notebook-chapters a[href="#vernal-pool-wood-frog"]').click();
   assert.equal(await page.locator('#vernal-pool-wood-frog').isVisible(),true);
   const overflowAfter=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflowAfter<=1,'Post-interaction overflow at '+width);
   assert.deepEqual(errors,[],'Browser JS errors at '+width);
   // Focus location and button without requiring pointer hover or gesture.
   await page.locator('[data-sp-month="may"]').focus();
   await page.keyboard.press('Enter');
   assert.match(await page.locator('#sp-notebook-title').innerText(),/woodland bloom/i);
   if(width===390||width===1280){
     await page.locator('#spring-field-notebook').screenshot({path:path.join(out,'notebook-'+width+'.png')});
     await page.screenshot({path:path.join(out,'page-'+width+'.png'),fullPage:false});
   }
   report.viewports.push({width,notebookY:Math.round(rect.y),overflow,maxAfter:overflowAfter,interactions:'PASS'});
   await ctx.close();
  }
  const nj=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:800}});
  await nj.route('**/*',r=>new URL(r.request().url).host==='127.0.0.1:'+new URL(origin).port?r.continue():r.abort());
  const noJs=await nj.newPage();
  await noJs.goto(origin,{waitUntil:'domcontentloaded'});
  assert.match(await noJs.locator('#sp-notebook-title').innerText(),/first chorus/i);
  assert.equal(await noJs.locator('#sp-notebook-chapters a').count(),3);
  assert.ok(await noJs.locator('#sp-notebook-next').isVisible());
  await noJs.screenshot({path:path.join(out,'no-js-390.png')});
  report.noJs=true;report.keyboard=true;
  await nj.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: Spring Field Notebook source Chromium widths, causal A-B-A, category re-entry, keyboard and no-JS. Real Commons photos, protected preview and production remain separately unverified.');
 }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1;});
