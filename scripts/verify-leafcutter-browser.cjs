'use strict';
// Browser smoke for live forecast UX. No real NWS calls or personal geolocation.
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const fs=require('node:fs'),assert=require('node:assert/strict');
const ORIGIN='http://127.0.0.1:8767';
async function ready(){
 for(let i=0;i<30;i++){
  try{const x=await fetch(ORIGIN+'/leafcutter-bees/',{signal:AbortSignal.timeout(700)});if(x.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw Error('Leafcutter static server did not start');
}
(async()=>{
 const server=spawn('python3',['-m','http.server','8767','--bind','127.0.0.1','--directory','public'],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  fs.mkdirSync('artifacts/leafcutter-browser',{recursive:true});
  for(const width of [360,390,768,1440]){
   const ctx=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',route=>route.request().url().startsWith(ORIGIN)?route.continue():route.abort());
   await page.route('**/api/garden-seasonal-heat*',async route=>{
    const u=new URL(route.request().url()),zip=u.searchParams.get('zip');
    if(zip==='48707'){
      await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'ZIP_NOT_MAPPED',status:'UNAVAILABLE'})});return;
    }
    const site=zip?{id:'zip:'+zip,zip,kind:'zcta-interior-point'}:{id:'bay-city',zip:null,kind:'named-city'};
    const partial=zip==='49931';
    const d={schema:'seasonal-heat-v1',provider:'USA National Phenology Network',status:partial?'PARTIAL':'AVAILABLE',
      site,asOfDate:'2026-10-31',totalGdd50F:2805.3,weekChangeGdd50F:87.4,
      comparison:partial?null:{anomalyGdd50F:237.4,referencePeriod:'1991-2020'},modelNotObservation:true};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(d)});
   });
   await page.route('**/api/leafcutter-release-weather*',async route=>{
    const url=new URL(route.request().url());
    const zip=url.searchParams.get('zip');
    if(zip==='48707'){
      await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'ZIP_NOT_MAPPED',scope:'no-weather-claim'})});return;
    }
    const data=url.searchParams.get('mode')==='locations'
     ?{locations:[{id:'bay-city',name:'Bay City',region:'Central Lower'},{id:'marquette',name:'Marquette',region:'Upper Peninsula'}]}
     :{scope:'forecast-planning-only',provider:'National Weather Service',forecastOnly:true,
       site:zip?{id:'zip:'+zip,name:'ZIP '+zip+' area',kind:'zcta-interior-point',zip,latitude:43.6234,longitude:-83.9251}:{id:'bay-city',name:'Bay City',kind:'named-city'},
       issuedAt:'2026-11-01T11:00:00-05:00',checkedAt:'2026-11-01T13:00:00-05:00',
       sourceUrl:'https://api.weather.gov/gridpoints/DTX/88,88/forecast/hourly',
       status:'NO_STRETCH',fresh:true,firstWarmStretch:null,
       heat:{status:'AVAILABLE',baseF:50,unit:'F-degree-days',completeDays:2,totalDegreeDaysF:32.5,warmDaytimeHours:0,scope:'forecast-only-garden-warmth-index',daily:[
        {date:'2026-11-02',gdd50F:20,coverage:'complete',hours:24,warmDaytimeHours:0},
        {date:'2026-11-03',gdd50F:12.5,coverage:'complete',hours:24,warmDaytimeHours:0}]},
       daily:[{date:'2026-11-02',highF:53,precipPeakPct:30,signal:'COOL_DAY'},{date:'2026-11-03',highF:56,precipPeakPct:25,signal:'COOL_DAY'}]};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto(ORIGIN+'/leafcutter-bees/',{waitUntil:'domcontentloaded'});
   assert.match(await page.locator('h1').innerText(),/Leafcutter bees: the leaf is only the beginning/);
   assert.ok(await page.locator('#bee-nest-year').isVisible(),'Seasonal nest journal is a prominent usable tool');
   const originalMonth=await page.locator('#month').inputValue();
   const originalAnswer=await page.locator('#bee-first-title').innerText();
   await page.locator('[data-journey-phase="spring"]').click();
   assert.equal(await page.locator('#month').inputValue(),'3');
   assert.match(await page.locator('#bee-story-title').innerText(),/Make a little room/);
   assert.equal(await page.locator('#bee-year-display').getAttribute('data-phase'),'spring');
   assert.equal(await page.locator('#bee-first-title').innerText(),await page.locator('#result-title').innerText());
   const springAnswer=await page.locator('#bee-story-action').innerText();
   await page.locator('[data-journey-phase="summer"]').click();
   assert.equal(await page.locator('#month').inputValue(),'6');
   assert.match(await page.locator('#bee-story-title').innerText(),/A small bee/);
   assert.notEqual(await page.locator('#bee-story-action').innerText(),springAnswer,'The season changes the field-journal action, not necessarily the safe habitat-first verdict');
   assert.equal(await page.locator('#bee-first-title').innerText(),await page.locator('#result-title').innerText(),'The first-screen answer follows the safeguarded decision engine');
   await page.locator('[data-journey-phase="spring"]').click();
   assert.equal(await page.locator('#bee-story-action').innerText(),springAnswer,'A to B to A restores the same field-journal action');
   await page.locator('#month').selectOption(originalMonth);
   assert.equal(await page.locator('#bee-first-title').innerText(),originalAnswer,'The original season restores the original answer');
   await page.locator('#flowers').selectOption('yes');
   assert.match(await page.locator('#bee-evidence-observed').innerText(),/You reported plentiful open flowers/);
   await page.locator('#flowers').selectOption('unknown');
   assert.match(await page.locator('#bee-evidence-observed').innerText(),/Flowering has not been confirmed/);
   assert.ok(await page.locator('#bee-forecast-desk').isVisible());
   assert.match(await page.locator('#bee-flower-guide').innerText(),/typical flowering month|climatological/i);
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelectorAll('.bee-day').length===2,null,{timeout:6000});
   assert.match(await page.locator('#bee-weather-status').innerText(),/No sustained 75°F warm stretch/);
   assert.equal(await page.locator('.bee-day').count(),2);
   await page.waitForFunction(()=>document.querySelector('#bee-seasonal-total')?.textContent.includes('2805.3'),null,{timeout:6000});
   assert.equal(await page.locator('#bee-seasonal-anomaly').innerText(),'+237.4 °F·days');
   assert.equal(await page.locator('#bee-seasonal-week').innerText(),'+87.4 °F·days');
   assert.match(await page.locator('#bee-evidence-accumulated').innerText(),/2805.3/);
   assert.match(await page.locator('#bee-evidence-forecast').innerText(),/No two-day 75°F/);
   assert.equal(await page.locator('#bee-gdd-total').innerText(),'32.5 °F·days');
   assert.equal(await page.locator('#bee-gdd-days').innerText(),'2');
   assert.equal(await page.locator('#bee-gdd-hours').innerText(),'0');
   assert.equal(await page.locator('.bee-gdd-col').count(),2);
   assert.match(await page.locator('#bee-gdd-note').innerText(),/not a season-to-date total/i);
   await page.locator('#bee-zip').fill('48706');
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelector('#bee-geo-note').textContent.includes('ZIP 48706'),null,{timeout:6000});
   assert.match(await page.locator('#bee-geo-note').innerText(),/not a USPS boundary/);
   assert.equal(await page.locator('.bee-day').count(),2);
   await page.locator('#bee-zip').fill('49931');
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelector('#bee-seasonal-anomaly')?.textContent==='Not mapped',null,{timeout:6000});
   assert.equal(await page.locator('#bee-seasonal-total').innerText(),'2805.3 °F·days');
   assert.match(await page.locator('#bee-seasonal-note').innerText(),/no published data/);
   assert.match(await page.locator('#bee-evidence-accumulated').innerText(),/Historical anomaly not mapped/);
      await page.locator('#bee-zip').fill('48707');
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelector('#bee-weather-status')?.textContent.includes('no mapped Census area'),null,{timeout:6000});
   assert.match(await page.locator('#bee-weather-status').innerText(),/no mapped Census area/);
   assert.equal(await page.locator('.bee-day').count(),0,'Unmapped ZIP must not retain prior forecast cards');
   assert.notEqual(await page.locator('#bee-seasonal-total').innerText(),'2805.3 °F·days','Unmapped ZIP must clear previous seasonal heat');
   assert.ok(!(await page.locator('#bee-heat-meter').isVisible()),'Unmapped ZIP must clear old warmth numbers');
   assert.doesNotMatch(await page.locator('#bee-evidence-accumulated').innerText(),/2805.3/,'Unmapped ZIP must not retain last location');
   assert.match(await page.locator('#bee-evidence-forecast').innerText(),/forecast could not be verified|No verified forecast/);
   await page.locator('#bee-zip').fill('');
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelectorAll('.bee-day').length===2,null,{timeout:6000});
   // Photographed field notes stay usable on all widths and are served locally, including with third-party requests blocked.
   const photoEssay=page.locator('#from-my-garden');
   assert.ok(await photoEssay.isVisible(),'From My Garden photo essay must be present');
   const photoItems=photoEssay.locator('img');
   assert.equal(await photoItems.count(),4);
   for(let i=0;i<4;i++){
    await photoItems.nth(i).scrollIntoViewIfNeeded();
    await page.waitForFunction(index=>{
     const el=document.querySelectorAll('#from-my-garden img')[index];
     return !!el&&el.complete&&el.naturalWidth>0&&el.currentSrc.includes('/images/leafcutter-fvf-');
    },i,{timeout:8000});
   }
   await photoEssay.screenshot({path:'artifacts/leafcutter-browser/fvf-field-notes-'+width+'.png',animations:'disabled'});
   const overflow=await page.evaluate(()=>({content:document.documentElement.scrollWidth,window:window.innerWidth,
    offenders:[...document.body.querySelectorAll('*')].filter(el=>{const b=el.getBoundingClientRect();const st=getComputedStyle(el);return b.right>window.innerWidth+2&&b.width>0&&st.position!=='fixed';}).slice(0,10).map(el=>({tag:el.tagName,class:el.className,id:el.id,right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width)}))}));
   assert.ok(overflow.content<=overflow.window+1,'Horizontal overflow at '+width+': '+JSON.stringify(overflow));
   assert.deepEqual(errors,[],'No browser JavaScript errors expected');
   await page.screenshot({path:'artifacts/leafcutter-browser/leafcutter-'+width+'.png',fullPage:true,animations:'disabled'});
   await page.waitForFunction(()=>document.querySelector('#bee-evidence-accumulated')?.textContent.includes('2805.3'),null,{timeout:6000});
   await page.locator('#region').selectOption('elsewhere');
   assert.ok(!(await page.locator('#bee-forecast-desk').isVisible()),'Michigan forecast must hide for other locations');
   assert.match(await page.locator('#bee-evidence-accumulated').innerText(),/not applicable/);
   await page.locator('#region').selectOption('michigan');
   assert.match(await page.locator('#bee-evidence-accumulated').innerText(),/2805.3/,'Restores correctly attributed Michigan seasonal evidence without refetching other-region data');
   await ctx.close();
  }
  // Missing third-party bee photo: the original next step must survive as a readable first-screen answer.
  const noPhotoCtx=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'});
  const noPhoto=await noPhotoCtx.newPage();
  await noPhoto.route('**/*',route=>route.request().url().endsWith('/images/leafcutter-bee-carrying-leaf-bob-peterson.jpg')?route.abort():route.request().url().startsWith(ORIGIN)?route.continue():route.abort());
  await noPhoto.goto(ORIGIN+'/leafcutter-bees/',{waitUntil:'domcontentloaded'});
  await noPhoto.waitForFunction(()=>document.querySelector('.hero-figure img')?.complete,null,{timeout:6000});
  await noPhoto.waitForFunction(()=>document.querySelector('.hero-figure')?.hidden===true,null,{timeout:6000});
  assert.ok(await noPhoto.locator('#bee-first-title').isVisible(),'A broken external bee photo cannot hide the primary action');
  assert.match(await noPhoto.locator('#bee-nest-year').innerText(),/whole year/i);
  await noPhotoCtx.close();
  const noJs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
  const page=await noJs.newPage();await page.goto(ORIGIN+'/leafcutter-bees/',{waitUntil:'domcontentloaded'});
  assert.match(await page.locator('body').innerText(),/This optional forecast requires JavaScript/);
  assert.ok(await page.locator('#research').isVisible());
  assert.match(await page.locator('.bee-first-answer').innerText(),/Start with the habitat/);
  assert.match(await page.locator('#bee-nest-year').innerText(),/LEAVE|Autumn|AUTUMN/i);
  assert.ok(await page.locator('[data-journey-phase="fall"]').isVisible());
  await noJs.close();
  console.log('Leafcutter nest-year Experience OS browser QA passed at 360/390/768/1440 px, including A-B-A seasons, source lanes and no-JS.');
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
