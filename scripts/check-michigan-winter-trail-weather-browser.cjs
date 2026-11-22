'use strict';
/* Browser proof for the on-demand regional weather lens.
 * All NOAA/NWS replies are deterministic fixtures. This checks UI interaction,
 * responsive layout and failure behavior, NOT current field conditions.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const BASE=process.env.BASE_URL||'http://127.0.0.1:4173/michigan-winter-trails/';
const OUT='artifacts/michigan-winter-trails-weather';
const dayIso=(delta=0)=>{
 const d=new Date();d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);
};
const stamp=()=>new Date().toISOString();
const dateFromUtcNoon=dayIso(-1);
function fixture(id,date){
 const stale=id==='stop-2';
 return {
  status:'area-weather-context-not-trip-clearance',
  trailId:id,tripDate:date,checkedAt:stamp(),
  referencePoint:id==='stop-2'?{lat:46.60549,lon:-85.20342}:
   {lat:46.41,lon:-86.64},
  snow:{status:'modeled',depthInches:stale?9:7.6,
   validDate:stale?dayIso(-7):dateFromUtcNoon},
  forecast:{status:'forecast',updatedAt:stamp(),
   sourceUrl:'https://api.weather.gov/gridpoints/APX/35,42/forecast/hourly',
   tempMinF:16,tempMaxF:26,windMph:13,windChillF:4,
   freezeThaw:false,rainOrFreezingRain:false},
  alerts:{status:'checked',checkedAt:stamp(),events:stale?['Winter Storm Warning']:[]},
  access:{status:'not-verified',navigationReady:false}
 };
}
async function run(){
const pages=[],screens=[],failures=[],browser=await chromium.launch({
 headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']
});
try{
 await fs.mkdir(OUT,{recursive:true});
 for(const width of [360,390,768,1280,1440]){
  const page=await browser.newPage({viewport:{width,height:880}});
  pages.push(page);
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.route('**/api/winter-hike-lab?*',async route=>{
   const url=new URL(route.request().url());
   const id=url.searchParams.get('trail'),date=url.searchParams.get('date');
   assert.equal(url.searchParams.get('mode'),'field-weather');
   const b=fixture(id,date);
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
  });
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#trl-weather-trail:not([disabled])').waitFor({state:'attached',timeout:12000});
  assert.equal(await page.locator('details#trl-weather-lens').getAttribute('open'),null,'weather must be collapsed');
  assert.equal(await page.locator('.wf-story').count(),15,'all field-guide dossiers remain present');
  const layout=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(layout<=1,'horizontal overflow '+layout+'px at '+width);
  await page.screenshot({path:OUT+'/collapsed-'+width+'.png'});
  await page.locator('#stop-1 button.trl-weather-entry').click();
  await page.locator('#trl-weather-lens[open]').waitFor({timeout:10000});
  await page.locator('#trl-weather-report .trl-weather-reading').waitFor({timeout:12000});
  const text=await page.locator('#trl-weather-report').innerText();
  assert.match(text,/7\.6 in/,'NOAA model reading');
  assert.match(text,/16–26°F/,'NWS daytime forecast');
  assert.match(text,/No active alerts in the checked NWS feed/);
  assert.match(text,/parking/);
  assert.ok(!/trail open|parking is plowed|safe to go/i.test(text));
  await page.locator('#trl-weather-lens').screenshot({path:OUT+'/reading-'+width+'.png'});
  if(width===390||width===1280){
   await page.locator('#trl-weather-trail').selectOption('stop-2');
   await page.locator('#trl-weather-check').click();
   await page.locator('#trl-weather-report .trl-weather-reading').waitFor();
   const changed=await page.locator('#trl-weather-report').innerText();
   assert.match(changed,/Tahquamenon/);
   assert.match(changed,/Unknown/,'stale NOAA must not display 9 modeled inches');
   assert.match(changed,/Winter Storm Warning/);
   await page.locator('#trl-weather-lens').screenshot({path:OUT+'/stale-source-'+width+'.png'});
   // A map popup action must use the same inspector rather than a second overlay.
   await page.locator('#wf-map').scrollIntoViewIfNeeded();
   await page.locator('.leaflet-marker-icon').first().click({timeout:8000});
   await page.locator('.trl-popup-weather-link').first().click();
   await page.locator('#trl-weather-report .trl-weather-reading').waitFor({timeout:12000});
   await page.locator('.leaflet-popup:visible').waitFor({state:'hidden',timeout:3000});
   assert.equal(await page.locator('#trl-weather-lens').getAttribute('open'),'');
  }
  assert.deepEqual(errors,[],'browser JavaScript errors '+width);
  screens.push({width,overflow:layout,weatherOpened:true});
  await page.close();
 }
 const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:800}});
 await nojs.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(await nojs.locator('.wf-story').count(),15);
 assert.equal(await nojs.locator('a[href="https://www.nohrsc.noaa.gov/nsa/"]').count(),1);
 await nojs.locator('details#trl-weather-lens summary').click();
 assert.equal(await nojs.locator('details#trl-weather-lens').getAttribute('open'),'');
 await nojs.close();
}finally{
 await browser.close();
 await fs.writeFile(OUT+'/report.json',JSON.stringify({screens,failures},null,2));
}
console.log(JSON.stringify({screens,output:OUT}));
}
run().catch(error=>{console.error(error);process.exitCode=1});
