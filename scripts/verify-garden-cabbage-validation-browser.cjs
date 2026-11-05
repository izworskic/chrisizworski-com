'use strict';
// Real webpage browser gate: original MSU reported evidence cannot become
// fabricated first-flight accuracy or location/first-day precision.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8792';
const widths=[360,390,768,1440];
async function ready(){
 for(let i=0;i<48;i++){
  try{const r=await fetch(base+'/michigan-garden-pest-watch/',{signal:AbortSignal.timeout(850)});if(r.ok)return;}catch(_){}
  await new Promise(f=>setTimeout(f,160));
 }
 throw Error('Local regional field validation webserver not ready');
}
(async()=>{
 const server=spawn('python3',['-m','http.server','8792','--bind','127.0.0.1','--directory','public'],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
   headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  fs.mkdirSync('artifacts/garden-cabbage-validation',{recursive:true});
  for(const width of widths){
   const ctx=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   await page.goto(base+'/michigan-garden-pest-watch/?crop=brassicas',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.getElementById('cm-status')?.textContent.includes('SOURCE-REVIEWED'));
   assert.ok(await page.locator('#cm-ui').isVisible());
   assert.equal(await page.locator('.cm-validate__record').count(),4);
   assert.match(await page.locator('#cm-truth').innerText(),/cannot grade the model against first adult flights/i);
   assert.match(await page.locator('#cm-evaluation').innerText(),/zero matched first-adult trap-flight station-years/i);
   assert.match(await page.locator('#cm-method-sensitivity').innerText(),/1–15 days earlier/);
   assert.equal(await page.locator('#cm-city').inputValue(),'grand-rapids');
   assert.equal(await page.locator('#cm-model-dates .cm-validate__model-day').count(),3);
   assert.match(await page.locator('#cm-model-dates').innerText(),/May 6, 2025/);
   assert.match(await page.locator('#cm-model-dates').innerText(),/Apr 28, 2025/);
   assert.match(await page.locator('#cm-model-dates').innerText(),/May 26, 2025/);
   assert.equal(await page.locator('#cm-field-reports a[href^="https://www.canr.msu.edu/news/"]').count(),4);
   assert.equal(await page.locator('#cm-validation a[href^="https://www.canr.msu.edu/news/"]').count(),7);
   await page.locator('#cm-city').selectOption('bay-city');
   assert.match(await page.locator('#cm-model-dates').innerText(),/May 13, 2025/);
   await page.locator('#cm-city').selectOption('marquette');
   assert.match(await page.locator('#cm-model-dates').innerText(),/Jun 2, 2025/);
   assert.equal(await page.locator('#crop').inputValue(),'brassicas');
   const dims=await page.evaluate(()=>({
    viewport:window.innerWidth,full:document.documentElement.scrollWidth,
    panel:document.getElementById('cm-validation').getBoundingClientRect().right
   }));
   assert.ok(dims.panel<=dims.viewport+2,'Field validation panel overflows at '+width);
   assert.ok(dims.full<=dims.viewport+2,'Garden page overflows at '+width);
   assert.deepEqual(errors,[],'No JS errors in official field report panel at '+width);
   if(width===390){
    await page.locator('#cm-validation').screenshot({
     path:'artifacts/garden-cabbage-validation/mobile-real-msu-observations.png',animations:'disabled'});
   }
   await ctx.close();
  }
  const c=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'});
  const p=await c.newPage();
  // Register catchall before special route; Playwright prioritizes later routes.
  await p.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await p.route('**/assets/garden-cabbage-validation-data.js*',route=>route.fulfill({
   status:200,contentType:'application/javascript',body:'window.GardenCabbageValidation={schema:"invalid",evaluation:{promotionAllowed:true}};'
  }));
  await p.goto(base+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.getElementById('cm-status')?.textContent.includes('could not be verified'));
  assert.ok(await p.locator('#cm-ui').isHidden());
  assert.equal(await p.locator('#cm-field-reports .cm-validate__record').count(),0);
  assert.ok(await p.locator('.cm-validate__footnotes a').count()>=4);
  await c.close();
  const nojs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
  const n=await nojs.newPage();
  await n.goto(base+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  assert.equal(await n.locator('#cm-validation').count(),1);
  assert.ok(await n.locator('#cm-ui').isHidden());
  assert.match(await n.locator('#cm-status').innerText(),/requires JavaScript/);
  assert.ok(await n.locator('.cm-validate__footnotes a').count()>=4);
  await nojs.close();
  console.log('MSU cabbage evidence browser PASS: 4 original reports, 7 reference climate grids, two formulas, 0 fake first flights, source fail-closed and 360/390/768/1440 mobile.');
 }finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
 }
})().catch(err=>{console.error(err);process.exitCode=1;});
