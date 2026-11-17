#!/usr/bin/env node
// Offline Chromium acceptance for the 72-hour lighthouse desk.
// Fixtures exercise visitor behavior, not the truth of the live weather feed.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require=createRequire('/tmp/lighthouse-playwright/package.json');
const {chromium}=require('playwright');
const screenshots='/tmp/lighthouse-browser-proof';
await fs.mkdir(screenshots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.LIGHTHOUSE_CHROME?{executablePath:process.env.LIGHTHOUSE_CHROME}:{})});
const base=process.env.LIGHTHOUSE_SMOKE_URL||'http://127.0.0.1:8765';
const now=new Date();
const timestamp=n=>new Date(now.getTime()+n*3600000).toISOString();
const ids=['st-joseph-outer','st-joseph-inner','south-haven','holland','grand-haven','muskegon','ludington','manistee','frankfort'];
function sample(id,index){
 const hours=Array.from({length:72},(_,i)=>{
  const signal=id==='st-joseph-outer'&&i>=4&&i<=7||id==='frankfort'&&i>=8&&i<=10;
  const missing=id==='frankfort'&&i===20;
  return {startTime:timestamp(i),windDirection:'WNW',windMph:signal?25:9,airF:12,
   gustMph:34,waterF:35,shortForecast:'Cloudy',score:missing?null:signal?80:0,
   reason:missing?'Water source unavailable':signal?'All spray gates met':'Wind below 15 mph',
   category:missing?null:signal?'heavy':'none'};
 });
 const groups=id==='st-joseph-outer'?[{startTime:timestamp(4),endTime:timestamp(8),hours:4,peakScore:80,peakTime:timestamp(4)}]:
  id==='frankfort'?[{startTime:timestamp(8),endTime:timestamp(11),hours:3,peakScore:80,peakTime:timestamp(8)}]:[];
 const names={'st-joseph-outer':'St. Joseph North Pierhead Light','frankfort':'Frankfort North Breakwater Light'};
 return {id,name:names[id]||id.replaceAll('-',' '),town:id==='st-joseph-outer'?'St. Joseph':id==='frankfort'?'Frankfort':id,
  lightList:String(19000+index),lat:42.116+index*.3,lon:-86.49,onshoreBearing:270,
  available:true,reason:'',hours,windows:groups,coverage:{forecastHours:72,evaluatedHours:id==='frankfort'?71:72,unknownHours:id==='frankfort'?1:0},
  best:groups.length?hours[id==='frankfort'?8:4]:null,current:hours[0],
  water:{tempF:35,station:'GLSEA Lake Michigan daily lakewide mean',kind:'lakewide-proxy',observedAt:timestamp(-2)},
  ice:{pct:null,coverage:'missing'},alerts:{zones:['LMZ843'],status:'complete',events:[],updatedAt:timestamp(-1)},
  forecastIssuedAt:timestamp(-1),persistence:{estimate:'May persist during freezing air',reason:'Not measured'}};
}
const fixture={ok:true,generatedAt:timestamp(0),horizonHours:72,piers:ids.map(sample)};
const failures=[];
async function check(label,fn){try{await fn();console.log('PASS '+label);}catch(e){failures.push(label+': '+e.message);console.error('FAIL '+label+': '+e.message);}}
async function setHour(page,index){
 await page.locator('#desk-slider').evaluate((input,value)=>{input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));},index);
}
async function prepare(page,fail=false){
 await page.route('https://pagead2.googlesyndication.com/**',r=>r.abort());
 await page.route('https://www.googletagmanager.com/**',r=>r.abort());
 await page.route('**/api/lighthouse-ice',r=>fail?r.abort():r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
 await page.goto(base+'/frozen-lighthouses-michigan/',{waitUntil:'domcontentloaded'});
 if(!fail)await page.locator('#coast-lights button').first().waitFor();
}
try{
 for(const width of [360,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:850}});
  page.on('pageerror',e=>failures.push('JavaScript '+width+': '+e.message));
  await prepare(page);
  await check('light winter palette and real hero photograph at '+width+'px',async()=>{
   await page.locator('.hero-photo img').evaluate(img=>img.decode());
   const design=await page.evaluate(()=>{
    const body=getComputedStyle(document.body);
    const hero=getComputedStyle(document.querySelector('.hero-photo img'));
    const img=document.querySelector('.hero-photo img');
    return {background:body.backgroundColor,colorScheme:body.colorScheme,
      naturalWidth:img.naturalWidth,complete:img.complete,heroDisplay:hero.display};
   });
   assert.equal(design.background,'rgb(247, 246, 242)');
   assert.equal(design.colorScheme,'light');
   assert.ok(design.naturalWidth>=640,'historical photo must actually load, not just have an src');
   assert.equal(design.heroDisplay,'block');
  });
  await check('licensed location-specific gallery photos load at '+width+'px',async()=>{
   const images=page.locator('#winter-gallery .gallery-card img');
   assert.equal(await images.count(),3);
   for(let i=0;i<3;i++){
    const photo=images.nth(i);
    await photo.scrollIntoViewIfNeeded();
    await photo.evaluate(img=>img.decode());
    assert.ok(await photo.evaluate(img=>img.naturalWidth)>=640);
   }
   assert.equal(await page.locator('#winter-gallery figcaption a[href*="creativecommons.org"]').count(),3);
   assert.equal(await page.locator('#winter-gallery figcaption a[href*="commons.wikimedia.org"]').count(),3);
  });
  await check('gallery chooses its own lighthouse forecast at '+width+'px',async()=>{
   await page.locator('[data-select-lighthouse="holland"]').click();
   assert.match(await page.locator('#desk-place').innerText(),/Holland/);
   assert.equal(await page.locator('#coast-lights button[data-pier="holland"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('[data-select-lighthouse="holland"]').getAttribute('aria-current'),'true');
   await page.locator('[data-select-lighthouse="st-joseph-outer"]').click();
   assert.match(await page.locator('#desk-place').innerText(),/St. Joseph/);
  });
  await check('no horizontal overflow at '+width+'px',async()=>{
   const [sw,cw]=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
   assert.ok(sw<=cw+2,'overflow '+sw+' / '+cw);
   assert.equal(await page.locator('#coast-lights button').count(),9);
   assert.equal(await page.locator('#coast-lights button').first().getAttribute('data-pier'),'st-joseph-outer','Initial selected light must appear first in the visible coast selector');
  });
  await check('detailed card appendix is accessible but initially compact at '+width+'px',async()=>{
   const appendix=page.locator('details.lighthouse-appendix');
   assert.equal(await appendix.count(),1);
   assert.equal(await appendix.getAttribute('open'),null);
   await page.locator('details.lighthouse-appendix > summary').click();
   assert.equal(await appendix.locator('.pier-card').count(),9);
   await page.locator('details.lighthouse-appendix > summary').click();
  });
  await check('forecast desk fits its actual visible bounds at '+width+'px',async()=>{
   const result=await page.evaluate(()=>{
    const shell=document.querySelector('.coast-desk');
    const edge=shell.getBoundingClientRect().right;
    return ['.desk-layout','.desk-places','.desk-main','.desk-current','#desk-outcome','#desk-window','.desk-clock','.desk-chart','.desk-chart__note','#desk-readings','.desk-provenance','.desk-footer']
     .map(selector=>{
      const element=document.querySelector(selector);
      const box=element.getBoundingClientRect();
      return {selector,right:box.right,shellRight:edge,visibleWidth:box.width,contentWidth:element.scrollWidth,clientWidth:element.clientWidth};
     });
   });
   for(const item of result){
    assert.ok(item.right<=item.shellRight+2,item.selector+' exceeds clipped desk boundary: '+JSON.stringify(item));
    assert.ok(item.contentWidth<=item.clientWidth+2,item.selector+' hides horizontally clipped text: '+JSON.stringify(item));
   }
  });
  await page.screenshot({path:path.join(screenshots,'desk-'+width+'.png'),fullPage:width===390});
  if(width===390){
   await check('selected place, hourly readout and Google Maps stay synchronized',async()=>{
    assert.match(await page.locator('#desk-place').innerText(),/St\. Joseph/);
    await page.locator('#coast-lights button[data-pier="frankfort"]').click();
    assert.match(await page.locator('#desk-place').innerText(),/Frankfort/);
    assert.match(await page.locator('#desk-window').innerText(),/3 consecutive forecast hours/);
    assert.match(await page.locator('#desk-maps').getAttribute('href'),/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.equal(await page.locator('#coast-lights button[data-pier="frankfort"]').getAttribute('aria-pressed'),'true');
    await setHour(page,9);
    assert.match(await page.locator('#desk-readings').innerText(),/index 80\/100/);
    assert.match(await page.locator('#coast-lights button[data-pier="frankfort"] .desk-location__state').innerText(),/possible spray 80\/100/);
    assert.match(await page.locator('#coast-lights button[data-pier="st-joseph-outer"] .desk-location__state').innerText(),/no modeled spray/);
    const time=await page.locator('#desk-time').innerText();
    await page.locator('#coast-lights button[data-pier="st-joseph-outer"]').click();
    await page.locator('#coast-lights button[data-pier="frankfort"]').click();
    assert.equal(await page.locator('#desk-time').innerText(),time,'time must survive A to B to A');
    assert.equal(await page.locator('#desk-slider').inputValue(),'9');
    await page.locator('#desk-next').click();
    assert.equal(await page.locator('#desk-slider').inputValue(),'10');
    await page.locator('#desk-previous').click();
    assert.equal(await page.locator('#desk-slider').inputValue(),'9');
   });
   await check('missing hour remains unknown, not zero',async()=>{
    await setHour(page,20);
    assert.match(await page.locator('#desk-readings').innerText(),/Unknown from available evidence/);
    assert.match(await page.locator('#desk-chart').getAttribute('aria-label'),/striped slots mean missing/);
   });
   await check('selected time and location are shareable',async()=>{
    assert.match(page.url(),/[?&]light=frankfort/);
    assert.match(page.url(),/[?&]at=/);
    const shared=await browser.newPage({viewport:{width:390,height:844}});
    try{
     await shared.route('**/api/lighthouse-ice',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
     await shared.goto(page.url(),{waitUntil:'domcontentloaded'});
     await shared.locator('#coast-lights button').first().waitFor();
     assert.equal(await shared.locator('#desk-slider').inputValue(),'20');
     assert.equal(await shared.locator('#coast-lights button[data-pier="frankfort"]').getAttribute('aria-pressed'),'true');
    }finally{await shared.close();}
   });
  }
  await page.close();
 }
 await check('failed feed fails closed without a low-ice claim',async()=>{
  const page=await browser.newPage();
  try{
   await prepare(page,true);
   await page.locator('#desk-outcome').getByText('No reliable model verdict').waitFor();
   assert.equal(await page.locator('#desk-slider').isDisabled(),true);
   assert.equal(await page.locator('#desk-maps').getAttribute('href'),null);
  }finally{await page.close();}
 });
 await check('page retains useful official resources with JavaScript disabled',async()=>{
  const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
  try{
   await page.goto(base+'/frozen-lighthouses-michigan/',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('.faq').count(),4);
   assert.match(await page.locator('.warning').innerText(),/View from shore/);
   assert.ok(await page.locator('a[href*="weather.gov"]').count()>0);
  }finally{await page.close();}
 });
}finally{await browser.close();}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log('All offline lighthouse browser acceptance scenarios passed.');
