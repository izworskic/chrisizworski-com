const {chromium}=require(process.env.ICE_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true}),base=process.env.ICE_BASE_URL||'http://127.0.0.1:4177';
 const paths=['','eben/','grand-island/','sand-point/','wagner-falls/','tahquamenon-falls/'];const results=[];
 for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/pagead2.googlesyndication.com/**',r=>r.abort());
  for(const slug of paths){
   await page.goto(base+'/michigan-ice-caves/'+slug,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#feed-stamp').textContent.startsWith('Sources checked'),null,{timeout:35000});
   assert.equal(await page.locator('h1').count(),1);assert(await page.locator('.hero img').evaluate(i=>i.complete&&i.naturalWidth>0));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Horizontal overflow '+slug+' '+width);
   assert.match(await page.locator('#formation').innerText(),/season ahead|confirmation|Form/);
   await page.selectOption('#range','previous');await page.locator('#chart-wrap').waitFor({state:'visible'});
   const before=await page.locator('#day-readout').innerText();await page.click('#previous-day');assert.notEqual(await page.locator('#day-readout').innerText(),before);
   await page.locator('[data-stage="2"]').click();assert.match(await page.locator('#stage-title').innerText(),/thaw/);assert.equal(await page.locator('#scene-thaw').getAttribute('hidden'),null);
   await page.selectOption('#origin','detroit');assert.match(await page.locator('#drive-context').innerText(),/Detroit/);
   if(slug==='grand-island/')assert.match(await page.locator('#safety').innerText(),/Stay off the lake ice/);
   results.push({slug:slug||'hub',width,chart:true,overflow:false});
  }
  await page.goto(base+'/michigan-ice-caves/?site=grand-island&origin=grand-rapids&visit=2026-99-99&compare=eben,sand-point,wagner-falls,tahquamenon-falls',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#feed-stamp').textContent.startsWith('Sources checked'));
  assert.equal(await page.locator('#site-picker').inputValue(),'grand-island');assert.equal(await page.locator('#compare-options input:checked').count(),3);
  await page.selectOption('#site-picker','eben');await page.goBack();assert.equal(await page.locator('#site-picker').inputValue(),'grand-island');
  if(width===390)await page.screenshot({path:'/tmp/ice-caves-mobile.png',fullPage:true});
  else if(width===1280)await page.screenshot({path:'/tmp/ice-caves-desktop.png',fullPage:true});
  await page.click('#share');await page.waitForFunction(()=>document.querySelector('#share-status').textContent.length>0);assert.match(await page.locator('#share-status').innerText(),/copied|Copy this plan link/);await page.click('#reset');assert.equal(await page.locator('#origin').inputValue(),'bay-city');
  assert.deepEqual(errors,[]);await page.close();
 }
 const late=await browser.newPage({viewport:{width:1280,height:900}});await late.route('**/api/ice?view=caves',async r=>{await new Promise(resolve=>setTimeout(resolve,600));await r.continue();});await late.goto(base+'/michigan-ice-caves/');await late.selectOption('#site-picker','grand-island');await late.selectOption('#site-picker','eben');await late.waitForFunction(()=>document.querySelector('#feed-stamp').textContent.startsWith('Sources checked'));assert.match(await late.locator('#view-scope').innerText(),/Rock River/i);await late.evaluate(()=>document.documentElement.style.zoom='2');assert.equal(await late.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'200% zoom overflow');await late.locator('[data-stage="1"]').focus();await late.keyboard.press('Enter');assert.match(await late.locator('#stage-title').innerText(),/Cold builds/);await late.close();
 const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});await nojs.goto(base+'/michigan-ice-caves/grand-island/');assert.match(await nojs.locator('#safety').innerText(),/Stay off the lake ice/);assert.match(await nojs.locator('#route-link').getAttribute('href'),/Sand%20Point/);assert.match(await nojs.locator('#nws-link').getAttribute('href'),/lat=46.449/);assert.match(await nojs.locator('body').innerText(),/Closed until further notice/);await nojs.close();
 const fail=await browser.newPage();await fail.route('**/api/ice?view=caves',r=>r.fulfill({status:503,body:'{}'}));await fail.goto(base+'/michigan-ice-caves/');await fail.waitForFunction(()=>document.querySelector('#feed-stamp').textContent.includes('could not be checked'));assert.equal(await fail.locator('#chart-wrap').isVisible(),false);assert.match(await fail.locator('#safety').innerText(),/ice/);await fail.close();
 fs.writeFileSync('/tmp/ice-caves-browser-results.json',JSON.stringify({results,noJsSafety:true,failureFallback:true,zoom200:true,keyboard:true,lateResponse:true,shareReset:true},null,2));
 console.log(JSON.stringify({pages:results.length,noJsSafety:true,failureFallback:true,zoom200:true,keyboard:true,lateResponse:true,shareReset:true,errors:0}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
