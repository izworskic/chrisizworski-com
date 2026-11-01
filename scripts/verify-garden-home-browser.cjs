'use strict';
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn('python3',['-u','-m','http.server','8765','--directory','public'],{stdio:['ignore','pipe','pipe']});
 const ready=new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',()=>reject(new Error('Test server stopped before startup')));setTimeout(()=>reject(new Error('Test server did not start')),10000).unref()});
 let browser;
 try{
  await ready;
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  fs.mkdirSync('artifacts/garden-home-browser',{recursive:true});
  for(const width of [360,390,768,1440]){
   const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
   const page=await ctx.newPage();
   page.on('pageerror',error=>console.error('Browser error:',error));
   await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
   await page.route('**/api/garden-seasonal-heat*',async route=>{
    const data={schema:'seasonal-heat-v1',provider:'USA National Phenology Network',status:'AVAILABLE',
      asOfDate:'2026-10-31',totalGdd50F:2805.3,comparison:{anomalyGdd50F:237.4,referencePeriod:'1991-2020'}};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto('http://127.0.0.1:8765/michigan-gardening/?place=Bay+City&date=2026-11-01',{waitUntil:'domcontentloaded'});
   assert.match(await page.locator('#welcomeSeasonLabel').innerText(),/current season/i);
   assert.match(await page.locator('#welcomeLocal').innerText(),/Bay City.*Oct 3/);
   await page.locator('[data-welcome-season="spring"]').click();
   assert.match(await page.locator('#welcomeSeasonTitle').innerText(),/first green things/);
   assert.match(await page.locator('#welcomeLocal').innerText(),/May 9/);
   await page.locator('#welcomeImage').evaluate(img=>img.decode());
   assert.ok(await page.locator('#welcomeImage').evaluate(img=>img.naturalWidth>0));
   await page.locator('[data-welcome-season="summer"]').click();
   assert.match(await page.locator('#welcomeSeasonTitle').innerText(),/finding its stride/);
   await page.locator('#welcomeImage').evaluate(img=>img.decode());
   assert.ok(await page.locator('#welcomeImage').evaluate(img=>img.naturalWidth>0));
   await page.locator('[data-welcome-season="winter"]').click();
   await page.locator('#welcomeImage').evaluate(img=>img.decode());
   assert.ok(await page.locator('#welcomeImage').evaluate(img=>img.naturalWidth>0));
   await page.locator('[data-welcome-season="spring"]').click();
   assert.match(await page.locator('#welcomeSeasonTitle').innerText(),/first green things/);
   assert.equal(await page.locator('[data-welcome-season="spring"]').getAttribute('aria-pressed'),'true');
   await page.locator('#welcomePlace').fill('Adrian');await page.locator('#welcomeApply').click();
   await page.locator('[data-welcome-season="fall"]').click();
   assert.match(await page.locator('#welcomeLocal').innerText(),/No typical fall frost date/);
   await page.locator('#welcomePlace').fill('Atlantis');await page.locator('#welcomeApply').click();
   assert.match(await page.locator('#welcomePlaceStatus').innerText(),/could not find/i);
   assert.match(await page.locator('#welcomeLocal').innerText(),/Adrian/);
   await page.locator('#welcomePlace').fill('Bay City');await page.locator('#welcomeApply').click();
   assert.match(await page.locator('#welcomeLocal').innerText(),/Oct 3/);
   await page.locator('#welcomeImage').evaluate(img=>img.decode());
   assert.ok(await page.locator('#welcomeImage').evaluate(img=>img.naturalWidth>0),'seasonal photo must load');
   await page.locator('.garden-welcome').screenshot({path:`artifacts/garden-home-browser/welcome-${width}.png`,animations:'disabled'});
   // Read the computed colors: shared site link styles must not override guide button text.
   const guideButtons=page.locator('a.card-link');
   assert.ok(await guideButtons.count()>=10,'guide buttons should be present');
   const checkContrast=async()=>{
    const low=await page.locator('a.card-link').evaluateAll(links=>{
     function lum(color){const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
     return links.map(link=>{const css=getComputedStyle(link),a=lum(css.color),b=lum(css.backgroundColor);return {label:link.textContent.trim(),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}}).filter(x=>x.ratio<4.5);
    });
    assert.deepEqual(low,[],'guide button text must have at least 4.5:1 contrast');
   };
   await checkContrast();await guideButtons.first().hover();await checkContrast();
   await guideButtons.first().focus();await checkContrast();
   assert.equal(await page.locator('#plant-now').getAttribute('open'),null);
   assert.equal(await page.locator('[data-garden-result]').count(),12);
   await page.screenshot({path:`artifacts/garden-home-browser/hub-${width}.png`,fullPage:true,animations:'disabled'});
   await page.locator('#garden-find').fill('tomatoes');
   assert.match(await page.locator('#garden-find-status').innerText(),/featured tools found/);
   assert.equal(await page.locator('[data-garden-result]:visible').count(),2);
   await page.locator('#garden-find').fill('nonexistent vegetable');
   assert.match(await page.locator('#garden-find-status').innerText(),/0 featured tools/);
   await page.locator('#garden-find').fill('');
   await page.getByRole('link',{name:/Plan my Michigan garden/}).click();
   assert.notEqual(await page.locator('#plant-now').getAttribute('open'),null);
   await page.locator('#gardenPick').selectOption('tomatoes');await page.locator('#gardenAdd').click();
   const ahead=page.locator('#gardenAhead');await ahead.waitFor({state:'visible'});
   assert.match(await ahead.innerText(),/Start indoors: Tomatoes/);assert.match(await ahead.innerText(),/2027/);
   assert.equal(await page.locator('h1').innerText(),'Michigan Gardening Tools');
   await page.locator('#garden-month-2027-03').click();
   assert.match(await ahead.locator('.garden-month-result').innerText(),/Mar 2027: 1 planning reference/);
   assert.match(await ahead.locator('.garden-ahead-list').innerText(),/Start indoors: Tomatoes/);
   await page.locator('#garden-month-2027-07').click();
   assert.match(await ahead.locator('.garden-month-result').innerText(),/No dated notes here yet/);
   await page.locator('#garden-month-2027-03').focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('#garden-month-2027-03').getAttribute('aria-pressed'),'true');
   assert.match(await ahead.locator('.garden-ahead-list').innerText(),/Start indoors: Tomatoes/);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'garden-month-2027-03');
   await page.locator('#garden-month-all').click();
   await page.locator('#gardenPick').selectOption('lettuce');await page.locator('#gardenDays').fill('48');await page.locator('#gardenAdd').click();
   assert.match(await ahead.innerText(),/Leaf lettuce/);
   await page.locator('#gardenPlanTitle').scrollIntoViewIfNeeded();
   await page.screenshot({path:`artifacts/garden-home-browser/garden-${width}.png`,fullPage:true,animations:'disabled'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'horizontal page overflow at '+width);
   await page.locator('#pnPlace').fill('Bay City');await page.locator('#pnPlace').press('Tab');
   await page.locator('#plant-now').evaluate(node=>node.open=true);
   await page.locator('#gardenThermal').evaluate(node=>node.open=true);
   await page.locator('#gardenThermalCheck').click();
   await page.waitForFunction(()=>document.querySelector('#gardenThermalResults')?.textContent.includes('2805.3'),null,{timeout:6000});
   assert.match(await page.locator('#gardenThermalResults').innerText(),/237.4/);
   assert.match(await page.locator('#gardenThermalResults').innerText(),/1991–2020/);
      await page.locator('#pnPlace').fill('Adrian');await page.locator('#pnPlace').press('Tab');
   assert.match(await page.locator('#gardenPlan').innerText(),/No sourced fall frost date/);
   await page.locator('.garden-plant').filter({hasText:'Tomatoes'}).getByRole('button',{name:/Remove/}).click();
   await page.waitForFunction(()=>!document.querySelector('#gardenAhead').textContent.includes('Tomatoes'),null,{timeout:5000});
   assert.doesNotMatch(await ahead.innerText(),/Tomatoes/);
   await ctx.close();
  }
  // Smooth-scroll motion can keep Playwright's off-screen summary outside the viewport for 30 seconds; test the user-facing no-JS interaction with reduced motion.
  const nojs=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce',viewport:{width:390,height:844}});
  const fallback=await nojs.newPage();await fallback.goto('http://127.0.0.1:8765/michigan-gardening/',{waitUntil:'domcontentloaded'});
  assert.equal(await fallback.getByRole('link',{name:/Seed trays/}).count(),1);
  assert.equal(await fallback.getByRole('link',{name:/When is frost likely/}).count(),1);
  await fallback.locator('#plant-now > summary').click();
  assert.match(await fallback.locator('body').innerText(),/Enable JavaScript to build a list/);await nojs.close();
  const noPhoto=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const noPhotoPage=await noPhoto.newPage();
  await noPhotoPage.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')&&!route.request().url().includes('/garden-notebook/')?route.continue():route.abort());
  await noPhotoPage.goto('http://127.0.0.1:8765/michigan-gardening/?date=2026-11-01',{waitUntil:'domcontentloaded'});
  assert.match(await noPhotoPage.locator('#welcomeSeasonTitle').innerText(),/Gather what is ready/);
  assert.equal(await noPhotoPage.getByRole('link',{name:/Find a tool now/}).count(),1);
  await noPhoto.close();
  console.log('Garden home browser scenarios passed at 360, 390, 768 and 1440 pixels.');
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
