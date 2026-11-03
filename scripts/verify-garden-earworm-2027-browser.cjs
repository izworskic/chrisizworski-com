'use strict';
// Deterministic 2027 source-gate browser QA. Fixtures are hypothetical and are
// NEVER evidence of actual 2027 MSU publications or observed pest activity.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {chromium}=require('playwright');
const ORIGIN='http://127.0.0.1:8788';
const frames=[360,390,768,1440];
async function ready(){
 for(let i=0;i<35;i++){
   try{const r=await fetch(ORIGIN+'/michigan-garden-pest-watch/',{signal:AbortSignal.timeout(700)});if(r.ok)return}catch(_){}
   await new Promise(resolve=>setTimeout(resolve,160));
 }
 throw Error('2027 browser test static server not ready');
}
function value(week,count,avg,star=false){
 if(count===null)return {week,status:'NOT_REPORTED',publishedCell:'-',total:null,avgPerNight:null,twoWeekTotal:false};
 return {week,status:'REPORTED',publishedCell:String(count)+(avg===null?'':' ('+avg+')')+(star?'*':''),
   total:count,avgPerNight:avg,twoWeekTotal:star};
}
function fixture(opts={}){
 const published=opts.published||'2027-07-15',last=opts.latest||'2027-07-14';
 const weeks=opts.old?['2027-05-21','2027-05-28']:['2027-07-07','2027-07-14'];
 return {schema:'garden-earworm-trap-archive-v1',species:'Helicoverpa zea',season:2027,
  seasonState:'SOURCE_REPORTED_NOT_OUTBREAK_FORECAST',reviewFlags:opts.flags||[],
  source:{publisher:'Michigan State University Extension',dataType:'INDEPENDENT_REGIONAL_PHEROMONE_TRAPS',
   articleTitle:'Michigan vegetable crop report - July 14, 2027',
   url:'https://www.canr.msu.edu/news/michigan-vegetable-crop-report-july-14-2027',
   publishedDate:published,latestCollectionWeek:last,sourceTableSha256:'a'.repeat(64)},
  counties:[
   {id:'saginaw',name:'Saginaw County',trapType:'CLOTH_HELIOTHIS',
    samples:[value(weeks[0],0,null),value(weeks[1],2,'0.3')]},
   {id:'ottawa',name:'Ottawa County',trapType:'WIRE_HARTSTACK',
    samples:[value(weeks[0],20,'2.9'),value(weeks[1],null,null)]},
   {id:'midland',name:'Midland County',trapType:'TYPE_NOT_SPECIFIED',
    samples:[value(weeks[0],null,null),value(weeks[1],3,'0.4')]}
  ]};
}
async function context(browser,withYear=false){
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 if(withYear)await c.addInitScript(()=>{
  const NativeDate=Date,now=NativeDate.parse('2027-07-20T16:00:00Z');
  window.Date=class extends NativeDate{
   constructor(...args){super(...(args.length?args:[now]));}
   static now(){return now;}
  };
 });
 return c;
}
async function testPage(browser,width,d){
 const c=await context(browser,true);const page=await c.newPage();
 await page.setViewportSize({width,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>r.request().url().startsWith(ORIGIN)?r.continue():r.abort());
 await page.route('**/assets/garden-earworm-trap-2027-data.js*',r=>r.fulfill({
  status:200,contentType:'application/javascript',
  body:'window.GardenEarwormTrap2027Data='+JSON.stringify(d)+';'
 }));
 await page.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#earworm-2027-summary')?.textContent.includes('MSU published'),null,{timeout:8000});
 assert.match(await page.locator('#earworm-2027-summary').innerText(),/Jul 15, 2027/);
 assert.ok(await page.locator('#earworm-2027-observations').isVisible());
 assert.equal(await page.locator('#earworm-2027-observations .earworm-county').count(),3);
 assert.equal(await page.locator('#earworm-2027-observations tbody tr').count(),2);
 assert.match(await page.locator('#earworm-2027-observations tbody').innerText(),/Measured zero at this trap/);
 await page.locator('#earworm-2027-observations button[data-county="ottawa"]').click();
 assert.match(await page.locator('#earworm-2027-observations .earworm-next-readout').innerText(),/Wire Hartstack/);
 assert.match(await page.locator('#earworm-2027-observations tbody').innerText(),/Missing is not zero/);
 assert.ok(page.url().includes('trapCounty2027=ottawa'));
 assert.equal(await page.locator('#earworm-county-picker button').count(),8,'2026 archive stays intact');
 assert.match(await page.locator('#earworm-readout').innerText(),/2026 archive|2026 season closed/i);
 const overflow=await page.evaluate(()=>({right:document.getElementById('earworm-trap-desk').getBoundingClientRect().right,
   width:document.documentElement.clientWidth}));
 assert.ok(overflow.right<=overflow.width+2,'2027 panel extends beyond viewport');
 assert.ok(errors.every(x=>!x.includes('garden-earworm-2027.js')),errors.join('\n'));
 if(width===390){
  fs.mkdirSync('artifacts/garden-earworm-2027-browser',{recursive:true});
  await page.screenshot({path:'artifacts/garden-earworm-2027-browser/reviewed-2027-source-mobile.png',fullPage:true,animations:'disabled'});
 }
 await c.close();
}
(async()=>{
 const server=spawn('python3',['-m','http.server','8788','--bind','127.0.0.1','--directory','public'],{stdio:'ignore'});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage']});
  const baseline=await context(browser,false),p=await baseline.newPage();
  await p.route('**/*',r=>r.request().url().startsWith(ORIGIN)?r.continue():r.abort());
  await p.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.querySelector('#earworm-2027-summary')?.textContent.includes('not underway yet'));
  assert.ok(await p.locator('#earworm-2027-observations').isHidden());
  assert.match(await p.locator('#earworm-readout').innerText(),/2026 season closed/i);
  await baseline.close();
  for(const width of frames)await testPage(browser,width,fixture());
  // A flagged official table cannot become a published numeric chart.
  const flagged=await context(browser,true),a=await flagged.newPage();
  await a.route('**/*',r=>r.request().url().startsWith(ORIGIN)?r.continue():r.abort());
  await a.route('**/assets/garden-earworm-trap-2027-data.js*',r=>r.fulfill({
   status:200,contentType:'application/javascript',
   body:'window.GardenEarwormTrap2027Data='+JSON.stringify(fixture({flags:['COUNTY_ROSTER_CHANGED_FROM_2026']}))+';'
  }));
  await a.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await a.waitForFunction(()=>document.querySelector('#earworm-2027-summary')?.textContent.includes('not currently source-verified'));
  assert.ok(await a.locator('#earworm-2027-observations').isHidden());
  await flagged.close();
  // A previously documented report is dated, never described as fresh.
  const stale=await context(browser,true),b=await stale.newPage();
  await b.route('**/*',r=>r.request().url().startsWith(ORIGIN)?r.continue():r.abort());
  await b.route('**/assets/garden-earworm-trap-2027-data.js*',r=>r.fulfill({
   status:200,contentType:'application/javascript',
   body:'window.GardenEarwormTrap2027Data='+JSON.stringify(fixture({
    published:'2027-06-01',latest:'2027-05-28',old:true}))+';'
  }));
  await b.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await b.waitForFunction(()=>document.querySelector('#earworm-2027-summary')?.textContent.includes('DATED OFFICIAL REPORT'));
  assert.match(await b.locator('#earworm-2027-summary').innerText(),/May 28, 2027/);
  await stale.close();
  console.log('2027 MSU source gate browser PASS: null source, future-source mock, flagged veto, aged reports, 360/390/768/1440 layouts. Fixtures are NOT 2027 observations.');
 }finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
