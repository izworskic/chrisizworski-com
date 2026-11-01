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
  for(const width of [390,1440]){
   const ctx=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',route=>route.request().url().startsWith(ORIGIN)?route.continue():route.abort());
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
       daily:[{date:'2026-11-02',highF:53,precipPeakPct:30,signal:'COOL_DAY'},{date:'2026-11-03',highF:56,precipPeakPct:25,signal:'COOL_DAY'}]};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto(ORIGIN+'/leafcutter-bees/',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('h1').innerText(),'Meet the leafcutter bee.');
   assert.ok(await page.locator('#bee-forecast-desk').isVisible());
   assert.match(await page.locator('#bee-flower-guide').innerText(),/typical flowering month|climatological/i);
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelectorAll('.bee-day').length===2,null,{timeout:6000});
   assert.match(await page.locator('#bee-weather-status').innerText(),/No sustained 75°F warm stretch/);
   assert.equal(await page.locator('.bee-day').count(),2);
   await page.locator('#bee-zip').fill('48706');
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelector('#bee-geo-note').textContent.includes('ZIP 48706'),null,{timeout:6000});
   assert.match(await page.locator('#bee-geo-note').innerText(),/not a USPS boundary/);
   assert.equal(await page.locator('.bee-day').count(),2);
   await page.locator('#bee-zip').fill('48707');
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelector('#bee-weather-status')?.textContent.includes('no mapped Census area'),null,{timeout:6000});
   assert.match(await page.locator('#bee-weather-status').innerText(),/no mapped Census area/);
   assert.equal(await page.locator('.bee-day').count(),0,'Unmapped ZIP must not retain prior forecast cards');
   await page.locator('#bee-zip').fill('');
   await page.locator('#bee-check').click();
   await page.waitForFunction(()=>document.querySelectorAll('.bee-day').length===2,null,{timeout:6000});
   const overflow=await page.evaluate(()=>({content:document.documentElement.scrollWidth,window:window.innerWidth,
    offenders:[...document.body.querySelectorAll('*')].filter(el=>{const b=el.getBoundingClientRect();const st=getComputedStyle(el);return b.right>window.innerWidth+2&&b.width>0&&st.position!=='fixed';}).slice(0,10).map(el=>({tag:el.tagName,class:el.className,id:el.id,right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width)}))}));
   assert.ok(overflow.content<=overflow.window+1,'Horizontal overflow at '+width+': '+JSON.stringify(overflow));
   assert.deepEqual(errors,[],'No browser JavaScript errors expected');
   await page.screenshot({path:'artifacts/leafcutter-browser/leafcutter-'+width+'.png',fullPage:true,animations:'disabled'});
   await page.locator('#region').selectOption('elsewhere');
   assert.ok(!(await page.locator('#bee-forecast-desk').isVisible()),'Michigan forecast must hide for other locations');
   await ctx.close();
  }
  const noJs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
  const page=await noJs.newPage();await page.goto(ORIGIN+'/leafcutter-bees/',{waitUntil:'domcontentloaded'});
  assert.match(await page.locator('body').innerText(),/This optional forecast requires JavaScript/);
  assert.ok(await page.locator('#research').isVisible());
  await noJs.close();
  console.log('Leafcutter weather desk browser QA passed at 390/1440 px, including no-JS fallback.');
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1});
