'use strict';
// Experience OS v1.2.1 Garden Pest Watch browser test. Fixture-based scientific
// states are NOT a validation of live Michigan pest emergence or NWS availability.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {chromium}=require('playwright');
const {decision}=require('../lib/garden-pest-watch.cjs');
const ORIGIN='http://127.0.0.1:8779';
const frames=[360,390,768,1440];
const weather={status:'AVAILABLE',source:'National Weather Service',sourceUrl:'https://www.weather.gov/documentation/services-web-api',issuedAt:'2026-07-12T15:00:00Z',forecastLowF:65,forecastHighF:87,summary:'Several hot, dry forecast hours suggest scouting for mites.',tags:['hot_dry']};
async function ready(){
 for(let n=0;n<35;n++){try{const x=await fetch(ORIGIN+'/michigan-garden-pest-watch/',{signal:AbortSignal.timeout(600)});if(x.ok)return;}catch{} await new Promise(resolve=>setTimeout(resolve,180));}
 throw Error('Garden Watch static test server unavailable');
}
function mockPayload(url,month=7){
 const crop=url.searchParams.get('crop')||'squash',stage=url.searchParams.get('stage')||'growing',observed=url.searchParams.get('observed')||null;
 const decisionData=decision({crop,stage,month,observed,weather});
 return {...decisionData,location:{name:url.searchParams.get('zip')?'ZIP '+url.searchParams.get('zip')+' area':'Bay City',kind:url.searchParams.get('zip')?'zcta-interior-point':'named-city',coordinateMeaning:'2020 Census ZCTA interior point, not a property'},weather,regionalObservation:{status:'UNAVAILABLE'},biologicalForecast:{status:'UNAVAILABLE'}};
}
async function routeFixtures(page,month=7){
 await page.route('**/api/michigan-garden-pest-watch?*',async route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.get('zip')==='48707'){
   await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'UNAVAILABLE',code:'ZIP_LOOKUP_UNAVAILABLE'})});return;
  }
  if(url.searchParams.get('crop')==='tomatoes' && url.searchParams.get('stage')==='seedling'){
    await new Promise(resolve=>setTimeout(resolve,180));
  }
  const body=JSON.stringify(mockPayload(url,month));
  await route.fulfill({status:200,contentType:'application/json',body});
 });
 await page.route('**/*',route=>route.request().url().startsWith(ORIGIN)?route.continue():route.abort());
}
async function waitForAnswer(page,pest){await page.waitForFunction(name=>document.querySelector('#watch-cards')?.textContent?.includes(name),pest,{timeout:6000});}
(async()=>{
 const server=spawn('python3',['-m','http.server','8779','--bind','127.0.0.1','--directory','public'],{stdio:'ignore'});
 let browser=null;
 try{
  await ready();browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  fs.mkdirSync('artifacts/garden-pest-watch-browser',{recursive:true});
  for(const width of frames){
   const ctx=await browser.newContext({viewport:{width,height:820},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await routeFixtures(page);
   await page.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
   await waitForAnswer(page,'Squash vine borer');
   const first=await page.locator('#primary-answer').innerText();
   assert.match(first,/squash/i);
   assert.match(await page.locator('#season-evidence').innerText(),/July/);
   assert.match(await page.locator('#weather-evidence').innerText(),/National Weather Service|NWS|forecast hours|hot/i);
   assert.match(await page.locator('#evidence-heading').innerText(),/actually know/);
   assert.ok(await page.locator('#watch-cards .watch-card').count()>=2);
   const current=await page.locator('#crop').inputValue();
   assert.equal(current,'squash');
   await page.locator('#crop').selectOption('tomatoes');
   await page.locator('#stage').selectOption('growing');
   await page.locator('#watch-form button[type=submit]').click();
   await waitForAnswer(page,'Tomato hornworm');
   assert.notEqual(await page.locator('#primary-answer').innerText(),first);
   assert.match(await page.locator('#primary-answer').innerText(),/tomato|leaf/i);
   await page.locator('#crop').selectOption('squash');
   await page.locator('#watch-form button[type=submit]').click();
   await waitForAnswer(page,'Squash vine borer');
   assert.equal(await page.locator('#primary-answer').innerText(),first,'A→B→A must restore the same garden answer');
   assert.ok(page.url().includes('crop=squash'));
   assert.equal(await page.locator('#observed option[value="squash-vine-borer"]').count(),1);
   await page.locator('#observed').selectOption('squash-vine-borer');
   await page.locator('#use-observation').click();
   await page.waitForFunction(()=>document.querySelector('.watch-card .pest-status')?.textContent?.includes('You reported'),null,{timeout:6000});
   assert.match(await page.locator('#watch-source-label').innerText(),/Scouting guidance/);
   assert.match(await page.locator('.watch-card').first().innerText(),/unverified report/);
   await page.locator('#observed').selectOption('');
   await page.locator('#use-observation').click();
   await page.waitForFunction(()=>!document.querySelector('.watch-card .pest-status')?.textContent?.includes('You reported'),null,{timeout:6000});
   const geometry=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,buttonHeight:document.querySelector('.update-button').getBoundingClientRect().height}));
   assert.ok(geometry.pageWidth<=geometry.innerWidth+1,'Horizontal overflow at '+width+': '+JSON.stringify(geometry));
   assert.ok(geometry.buttonHeight>=44,'Mobile/desktop action target minimum 44px');
   assert.deepEqual(errors,[],'JavaScript errors at '+width);
   await page.screenshot({path:'artifacts/garden-pest-watch-browser/watch-'+width+'.png',fullPage:true,animations:'disabled'});
   await ctx.close();
  }
  // Missing API must not claim zero risk, and the HTML field guide survives.
  const broken=await browser.newContext({viewport:{width:390,height:820}});
  const p=await broken.newPage();
  await p.route('**/api/michigan-garden-pest-watch?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"status":"UNAVAILABLE"}'}));
  await p.route('**/*',route=>route.request().url().startsWith(ORIGIN)?route.continue():route.abort());
  await p.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.querySelector('#watch-source-label')?.textContent.includes('unavailable'),null,{timeout:6000});
  assert.match(await p.locator('#primary-answer').innerText(),/squash/i);
  assert.match(await p.locator('#weather-evidence').innerText(),/could not be verified/);
  await p.screenshot({path:'artifacts/garden-pest-watch-browser/forecast-unavailable.png',fullPage:true,animations:'disabled'});
  await broken.close();
  const noJS=await browser.newContext({viewport:{width:390,height:820},javaScriptEnabled:false});
  const n=await noJS.newPage();await n.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  assert.match(await n.locator('#primary-answer').innerText(),/squash stems/i);
  assert.ok(await n.locator('.nojs-guides').isVisible());
  assert.ok(await n.locator('.primary-sources a').count()>=3);
  await noJS.close();
  console.log('Garden Pest Watch browser QA PASS: 360/390/768/1440px, crop A-B-A, self-report, evidence, mobile overflow, 503 and no-JS. These checks use deterministic fixtures, not live pest/meteorology validation.');
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(err=>{console.error(err);process.exitCode=1;});
