'use strict';
const assert=require('node:assert/strict'),{spawn}=require('node:child_process'),fs=require('node:fs');
const {chromium}=require('playwright');
const BASE='http://127.0.0.1:8783';
async function ready(){for(let i=0;i<35;i++){try{const r=await fetch(BASE+'/michigan-garden-pest-watch/',{signal:AbortSignal.timeout(500)});if(r.ok)return}catch{}await new Promise(ok=>setTimeout(ok,170))}throw Error('SERVER_NOT_READY')}
async function fixtures(page){
 await page.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await page.route('**/api/japanese-beetle-monitoring-coverage?*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
 schema:'japanese-beetle-monitoring-coverage-v1',year:2027,status:'NO_NPN_MICHIGAN_ADULT_RECORDS',checkedAt:'2027-07-01T16:00:00Z',
 accuracyClaimsAllowed:false,coverage:{monitoredSites:0,candidateIntervals:0}})}));
 await page.route('**/api/japanese-beetle-forecast?*',r=>r.fulfill({status:503,contentType:'application/json',body:'{"status":"UNAVAILABLE"}'}));
 await page.route('**/api/michigan-garden-pest-watch?*',r=>r.fulfill({status:503,contentType:'application/json',body:'{"status":"UNAVAILABLE"}'}));
}
function freezeDate(){const NativeDate=Date;class FrozenDate extends NativeDate{
 constructor(...args){super(...(args.length?args:['2027-07-01T16:00:00Z']))}
 static now(){return new NativeDate('2027-07-01T16:00:00Z').getTime()}
}window.Date=FrozenDate;}
async function visit(page,date,status,count){
 await page.locator('#monitor-date').fill(date);
 await page.locator('#monitor-status').selectOption(status);
 await page.locator('#monitor-count').fill(String(count));
 await page.locator('#monitor-save').click();
}
(async()=>{
 const server=spawn('python3',['-m','http.server','8783','--bind','127.0.0.1','--directory','public'],{stdio:'ignore'});
 let browser;try{
  await ready();
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [360,390,768,1440]){
   const ctx=await browser.newContext({viewport:{width,height:820},reducedMotion:'reduce',acceptDownloads:true});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.addInitScript(freezeDate);await fixtures(page);
   await page.goto(BASE+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
   assert.ok(await page.locator('#beetle-monitoring').count()===1);
   assert.equal(await page.locator('#beetle-monitoring').getAttribute('open'),null);
   await page.locator('.beetle-study-summary').click();
   await page.waitForFunction(()=>!document.getElementById('monitor-save').disabled,null,{timeout:5000});
   assert.match(await page.locator('#monitor-season-status').innerText(),/2027 field season/);
   await visit(page,'2027-06-20','no',0);
   await visit(page,'2027-06-24','no',0);
   assert.match(await page.locator('#monitor-verdict').innerText(),/Keep recording real no visits/i);
   await visit(page,'2027-06-27','yes',2);
   assert.match(await page.locator('#monitor-verdict').innerText(),/after 2027-06-24 through 2027-06-27/);
   assert.match(await page.locator('#monitor-reason').innerText(),/self-reported detection interval/i);
   assert.equal(await page.locator('#monitor-visits tr').count(),4);
   await page.locator('#monitor-site').fill('other-plot');
   await page.locator('#monitor-site').dispatchEvent('change');
   assert.match(await page.locator('#monitor-verdict').innerText(),/Keep recording real no visits/);
   await page.locator('#monitor-site').fill('roses-1');
   await page.locator('#monitor-site').dispatchEvent('change');
   assert.match(await page.locator('#monitor-verdict').innerText(),/after 2027-06-24/);
   await page.locator('#monitor-npn-check').click();
   await page.waitForFunction(()=>document.getElementById('monitor-npn-result').textContent.includes('no Michigan Japanese beetle adult status records'),null,{timeout:5000});
   assert.match(await page.locator('#monitor-npn-result').innerText(),/NOT evidence that beetles were absent/);
   await page.locator('#monitor-snapshot').click();
   await page.waitForFunction(()=>document.getElementById('monitor-snapshot-status').textContent.includes('No eligible official'),null,{timeout:5000});
   const download=page.waitForEvent('download');await page.locator('#monitor-export').click();const file=await download;
   const contents=fs.readFileSync(await file.path(),'utf8');assert.match(contents,/2027-06-24/);assert.match(contents,/2027-06-27/);
   assert.match(contents,/modelCapturedOn/);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'horizontal overflow '+width+': '+overflow);
   assert.deepEqual(errors,[],'JS errors at '+width+': '+errors.join(' | '));
   await ctx.close();
  }
  const ctx=await browser.newContext({viewport:{width:390,height:820},javaScriptEnabled:false}),page=await ctx.newPage();
  await page.goto(BASE+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  assert.ok(await page.locator('a[href$="japanese-beetle-monitoring-2027-template.csv"]').count()===1);
  assert.ok((await page.locator('#beetle-monitoring').innerText()).includes('Zero sightings are data, too.'));
  await ctx.close();
  console.log('PASS 2027 controlled beetle monitoring field station: 360/390/768/1440, no-JS, no/yes interval, locality switch, official no-cohort, fail-closed snapshot, CSV export.');
 }finally{if(browser)await browser.close();server.kill('SIGTERM')}
})().catch(e=>{console.error(e);process.exitCode=1});
