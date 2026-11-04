'use strict';
// Browser QA for regional historical archive. Real original NASA values are
// precompiled by Python. No observation/emergence inference in these checks.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {chromium}=require('playwright');
const ORIGIN='http://127.0.0.1:8791';
const widths=[360,390,768,1440];
async function ready(){
 for(let n=0;n<42;n++){
  try{const r=await fetch(ORIGIN+'/michigan-garden-pest-watch/',{signal:AbortSignal.timeout(700)});if(r.ok)return;}catch(_){}
  await new Promise(resolve=>setTimeout(resolve,170));
 }
 throw Error('Regional Python fieldbook browser server unavailable');
}
async function setup(browser,width,disabled=false){
 const ctx=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,javaScriptEnabled:!disabled,reducedMotion:'reduce'});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',route=>route.request().url().startsWith(ORIGIN)?route.continue():route.abort());
 return {ctx,page,errors};
}
(async()=>{
 const server=spawn('python3',['-m','http.server','8791','--bind','127.0.0.1','--directory','public'],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
   headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  fs.mkdirSync('artifacts/garden-pest-python-fieldbook',{recursive:true});
  for(const width of widths){
   const {ctx,page,errors}=await setup(browser,width);
   await page.goto(ORIGIN+'/michigan-garden-pest-watch/?crop=brassicas',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.getElementById('pest-python-status')?.textContent.includes('35 COMPLETE'));
   assert.ok(await page.locator('#pest-python-ui').isVisible(),'Python historical selections must render');
   assert.equal(await page.locator('#pest-python-ladder [role="listitem"]').count(),7);
   assert.match(await page.locator('#pest-python-readout').innerText(),/Bay City/);
   assert.match(await page.locator('#pest-python-readout').innerText(),/Jun 22/);
   assert.match(await page.locator('#pest-python-readout').innerText(),/Jul 2/);
   assert.equal(await page.locator('#pest-python-years .pest-regional__year-grid>div').count(),5);
   assert.match(await page.locator('#pest-python-status').innerText(),/NO PEST SIGHTINGS MEASURED/);
   assert.equal(await page.locator('#pest-python-model').inputValue(),'japanese-beetle');
   assert.equal(await page.locator('#pest-python-city').inputValue(),'bay-city');
   assert.equal(await page.locator('#pest-python-stage option').count(),2);
   await page.locator('#pest-python-model').selectOption('cabbage-maggot');
   assert.equal(await page.locator('#pest-python-stage option').count(),3);
   assert.match(await page.locator('#pest-python-readout').innerText(),/Unverified calculation method/);
   assert.match(await page.locator('#pest-python-readout').innerText(),/May 4/);
   assert.match(await page.locator('#pest-python-readout').innerText(),/May 14/);
   assert.match(await page.locator('#pest-python-method').innerText(),/not specify complete accumulation/);
   assert.equal(await page.locator('#pest-python-model-source').getAttribute('href'),
    'https://enviroweather.msu.edu/crops/coleCrops/cabbagemaggot');
   await page.locator('#pest-python-city').selectOption('marquette');
   assert.match(await page.locator('#pest-python-readout').innerText(),/Marquette/);
   assert.match(await page.locator('#pest-python-readout').innerText(),/May 24/);
   assert.match(await page.locator('#pest-python-readout').innerText(),/Jun 2/);
   await page.locator('#pest-python-stage').selectOption('cabbage-third');
   assert.match(await page.locator('#pest-python-readout').innerText(),/Third-generation/);
   // Historical science must not rewrite the current tool's crop selector or ZIP.
   assert.equal(await page.locator('#crop').inputValue(),'brassicas');
   const overflow=await page.evaluate(()=>({
    body:document.documentElement.scrollWidth,
    viewport:window.innerWidth,
    fieldbook:document.getElementById('pest-regional-fieldbook').getBoundingClientRect().right
   }));
   assert.ok(overflow.fieldbook<=overflow.viewport+2,'Regional science feature spills off mobile viewport '+width);
   assert.ok(overflow.body<=overflow.viewport+2,'Page horizontal overflow at '+width);
   assert.deepEqual(errors,[],'No JavaScript error in Python regional fieldbook interactions');
   if(width===390){
    await page.locator('#pest-regional-fieldbook').screenshot({
     path:'artifacts/garden-pest-python-fieldbook/mobile-cabbage-third.png',animations:'disabled'});
    await page.locator('#pest-python-model').selectOption('japanese-beetle');
    await page.locator('#pest-python-city').selectOption('bay-city');
    await page.locator('#pest-regional-fieldbook').screenshot({
     path:'artifacts/garden-pest-python-fieldbook/mobile-japanese-beetle.png',animations:'disabled'});
   }
   await ctx.close();
  }
  // Source state "unverified" may never accidentally reveal an invented date.
  const {ctx,page,errors}=await setup(browser,390);
  await page.route('**/assets/garden-pest-python-fieldbook-data.js*',route=>route.fulfill({
   status:200,contentType:'application/javascript',
   body:'window.GardenPestRegionalFieldbook={schema:"untrusted",cities:[]};'
  }));
  await page.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('pest-python-status')?.textContent.includes('did not pass'));
  assert.ok(await page.locator('#pest-python-ui').isHidden());
  assert.equal(await page.locator('#pest-python-ladder [role="listitem"]').count(),0);
  assert.equal(await page.locator('#earworm-trap-desk').count(),1);
  assert.deepEqual(errors,[]);
  await ctx.close();
  const disabled=await setup(browser,390,true);
  await disabled.page.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  assert.equal(await disabled.page.locator('#pest-regional-fieldbook').count(),1);
  assert.ok(await disabled.page.locator('#pest-python-ui').isHidden());
  assert.match(await disabled.page.locator('#pest-python-status').innerText(),/requires JavaScript/);
  await disabled.ctx.close();
  console.log('Python regional pest fieldbook browser PASS: seven real regional thermal archives, two model families, historic stage changes, no-JS/invalid source and 360/390/768/1440px.');
 }finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
