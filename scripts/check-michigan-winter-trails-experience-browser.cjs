'use strict';
/* Full browser gate for Winter Trails Experience Investment.
 * Runs a real baseline/candidate browser comparison using original Git blobs.
 * NOAA/NWS are fixture data. No production visitor metrics are implied.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const BASE=process.env.BASE_URL||'http://127.0.0.1:4173/michigan-winter-trails/';
const BEFORE='49bf85a36cb38c5b9b2f7f9d7cd433ca6cd1a74a';
const OUT='artifacts/michigan-winter-trails-experience-20261122';
const FROM_GIT=Object.freeze({
 '/michigan-winter-trails/':'public/michigan-winter-trails/index.html',
 '/assets/michigan-winter-trails.css':'public/assets/michigan-winter-trails.css',
 '/assets/michigan-winter-trail-desk.js':'public/assets/michigan-winter-trail-desk.js',
 '/assets/michigan-winter-trail-weather.js':'public/assets/michigan-winter-trail-weather.js'
});
const before=Object.fromEntries(Object.entries(FROM_GIT).map(([url,path])=>
 [url,execFileSync('git',['show',BEFORE+':'+path],{encoding:'utf8',maxBuffer:2*1024*1024})]));
const stamp=()=>new Date().toISOString();
const detroitToday=()=>{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'})
  .formatToParts(new Date());
 const p=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join('-');
};
const today=detroitToday();
function weatherFixture(id,date){
 const coords={
  'stop-1':[46.4100,-86.6400],'stop-2':[46.60549,-85.20342]
 };
 const p=coords[id]||[44.750594,-85.493329];
 return {status:'area-weather-context-not-trip-clearance',trailId:id,tripDate:date,checkedAt:stamp(),
  referencePoint:{lat:p[0],lon:p[1]},
  snow:{status:'modeled',depthInches:7.6,validDate:today},
  forecast:{status:'forecast',updatedAt:stamp(),
   sourceUrl:'https://api.weather.gov/gridpoints/APX/35,42/forecast/hourly',
   tempMinF:19,tempMaxF:27,windMph:10,windChillF:8,freezeThaw:false,rainOrFreezingRain:false},
  alerts:{status:'checked',checkedAt:stamp(),events:[]},
  access:{status:'not-verified',navigationReady:false}
 };
}
async function run(){
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
 const observations={sourceBaseline:BEFORE,source:'deterministic browser renders, not production user outcomes',viewports:[],journeys:[],axe:[]};
 await fs.mkdir(OUT,{recursive:true});
 try{
  for(const width of [360,390,768,1280,1440]){
   const baseline=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
   await baseline.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(Object.hasOwn(before,url.pathname))return route.fulfill({status:200,
      contentType:url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.js')?'application/javascript':'text/html',
      body:before[url.pathname]});
    if(url.hostname.includes('googlesyndication.com')||url.hostname.includes('doubleclick.net'))
      return route.abort();
    return route.continue();
   });
   await baseline.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
   await baseline.locator('.trl-desk-option h3').first().waitFor({timeout:12000});
   const baseY=(await baseline.locator('.trl-desk-option h3').first().boundingBox())?.y;
   if(width===390||width===1280)await baseline.screenshot({path:OUT+'/before-'+width+'.png'});
   await baseline.close();

   const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname.includes('googlesyndication.com')||url.hostname.includes('doubleclick.net'))
      return route.abort();
    if(url.pathname==='/api/winter-hike-lab'&&url.searchParams.get('mode')==='field-weather'){
     const id=url.searchParams.get('trail'),date=url.searchParams.get('date');
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify(weatherFixture(id,date))});
    }
    return route.continue();
   });
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('.trl-desk-option h3').first().waitFor({timeout:12000});
   const option=await page.locator('.trl-desk-option h3').first().boundingBox();
   const scroll=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(scroll<=1,'Page overflows '+scroll+'px at '+width+'px');
   assert.ok(option&&Number.isFinite(baseY),'Comparison title missing at '+width);
   if(width<=390){
    assert.ok(option.y<844,'First option must be visible in initial phone screen at '+width+'; observed y='+option.y);
    assert.ok(baseY-option.y>=100,'The compact design must move first choice at least 100px up; moved '+(baseY-option.y));
   }
   await page.screenshot({path:OUT+'/after-'+width+'.png'});
   assert.equal(await page.locator('.wf-story').count(),15);
   assert.equal(await page.locator('.trl-desk-option').count(),2);
   assert.equal(await page.locator('.trl-desk-weather-action').count(),2);
   const selected=await page.locator('.trl-desk-weather-action').first().getAttribute('data-weather-for');
   assert.equal(selected,'stop-1');
   await page.locator('.trl-desk-weather-action').first().click();
   await page.locator('#trl-weather-lens[open]').waitFor();
   await page.locator('#trl-weather-report .trl-weather-reading').waitFor({timeout:15000});
   assert.equal(await page.locator('#trl-weather-trail').inputValue(),selected);
   assert.match(await page.locator('#trl-weather-report').innerText(),/7\.6 in/);
   assert.match(await page.locator('#trl-weather-report').innerText(),/not a trail measurement/);
   assert.equal(await page.locator('#trl-weather-return').isVisible(),true);
   await page.locator('#trl-weather-return').click();
   const focus=await page.evaluate(()=>document.activeElement.closest('.trl-desk-option')?.dataset.routeId);
   assert.equal(focus,selected,'Return must focus the same compared trail at '+width);
   if(width===390||width===1280)await page.locator('#trl-weather-lens').screenshot({path:OUT+'/weather-'+width+'.png'});

   if(width===390){
    await page.locator('#trl-desk-mode').selectOption('bike');
    await page.locator('#trl-desk-region').selectOption('up');
    await page.locator('#trl-desk-effort').selectOption('easy');
    await page.locator('#trl-desk-official').check();
    assert.match(await page.locator('#trl-desk-outcome').innerText(),/No matches/);
    assert.equal(await page.locator('.trl-desk-weather-action').count(),0);
    await page.locator('#trl-desk-clear').click();
    assert.equal(await page.locator('.trl-desk-weather-action').first().getAttribute('data-weather-for'),'stop-1');
    observations.journeys.push({name:'filter-empty-then-reset',passed:true});
   }
   if(width===390||width===1280){
    try{
     await page.addScriptTag({path:require.resolve('axe-core')});
     const violations=await page.evaluate(async()=>(
       await window.axe.run(document.querySelector('.trl-desk'),{
        runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}
       })
     ).violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.map(n=>n.target).slice(0,3)})));
     observations.axe.push({width,violations});
     const blocking=violations.filter(x=>x.impact==='critical'||x.impact==='serious');
     assert.deepEqual(blocking,[],'Critical/serious axe violations in the decision desk');
    }catch(error){
     if(error.code==='MODULE_NOT_FOUND')throw Error('axe-core is required in isolated browser QA');
     throw error;
    }
   }
   assert.deepEqual(errors,[],'JavaScript console exceptions at '+width);
   observations.viewports.push({width,baselineFirstOptionTop:baseY,candidateFirstOptionTop:option.y,
    gainedPixels:+(baseY-option.y).toFixed(1),horizontalOverflow:scroll,
    weatherAndReturn:true});
   await page.close();
  }
  const noJs=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});
  await noJs.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(await noJs.locator('.wf-story').count(),15,'No-JS dossiers survive');
  assert.ok(await noJs.locator('a[href="#stop-1"]').count());
  assert.equal(await noJs.locator('#trl-weather-return').isVisible(),false);
  observations.journeys.push({name:'no-script-evidence',passed:true});
  await noJs.close();
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await reduced.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(await reduced.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  observations.journeys.push({name:'reduced-motion',passed:true});
  await reduced.close();
 }finally{
  await fs.writeFile(OUT+'/report.json',JSON.stringify(observations,null,2));
  await browser.close();
 }
 console.log(JSON.stringify(observations));
}
run().catch(err=>{console.error(err);process.exitCode=1});
