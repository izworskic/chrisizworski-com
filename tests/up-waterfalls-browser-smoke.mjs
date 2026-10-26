#!/usr/bin/env node
// Real Chromium smoke test for source-backed Upper Peninsula waterfall pages.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire('/tmp/up-waterfalls-playwright/package.json');
const {chromium}=require('playwright');
const base=process.env.SMOKE_URL||'http://127.0.0.1:8765';
const screenshots='/tmp/up-waterfalls-smoke-screens';
await fs.mkdir(screenshots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const failures=[];
async function run(name,fn){try{await fn();console.log('PASS '+name)}catch(e){failures.push(name+': '+e.message);console.error('FAIL '+name+': '+e.message)}}
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.on('pageerror',err=>failures.push('Page JavaScript error: '+err.message));
  await page.route('https://pagead2.googlesyndication.com/**',r=>r.abort());
  await page.goto(base+'/upper-peninsula-waterfalls/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('[data-fall]').first().waitFor();
  await run('mobile hub contains 20 human-readable destinations',async()=>{
    assert.equal(await page.locator('[data-fall]').count(),20);
    assert.equal(await page.locator('h1').count(),1);
    assert.ok(await page.locator('#geographic-research').count()===1);
  });
  await run('mobile map initializes from local Leaflet JS and CARTO tiles',async()=>{
    await page.waitForFunction(()=>!!window.UPWaterfallMap,{timeout:15000});
    assert.ok(await page.locator('img.leaflet-tile[src*="cartocdn.com"]').count()>0);
    assert.ok(await page.locator('script[src="/assets/leaflet-1.9.4.js"]').count()>0);
  });
  await run('390px mobile document fits viewport',async()=>{
    const {width,scroll}=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(scroll<=width+2,'horizontal overflow '+scroll+' > '+width);
  });
  await page.screenshot({path:screenshots+'/hub-mobile.png',fullPage:true,animations:'disabled'});
  await run('search filters cards without changing canonical page',async()=>{
    await page.locator('#q').fill('Rainbow');
    const visible=page.locator('[data-fall]:visible');
    await visible.first().waitFor();
    assert.equal(await visible.count(),1);
    assert.match(await visible.first().innerText(),/Rainbow Falls/);
  });
  await run('saving a stop updates comparison list',async()=>{
    const save=page.locator('[data-fall]:visible .save');
    await save.click();
    assert.equal(await save.getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#selected-list').innerText(),/Rainbow Falls/);
  });
  await run('opt-in geographic layer never supplies parking routes',async()=>{
    await page.locator('#q').fill('');
    await page.locator('#show-geo-candidates').check();
    await page.waitForFunction(()=>document.querySelector('#geo-candidate-status')?.textContent.includes('additional geographic research points displayed'),{timeout:15000});
    assert.match(await page.locator('#geo-candidate-status').innerText(),/research points displayed/i);
  });
  await run('desktop layout and map usable',async()=>{
    await page.setViewportSize({width:1280,height:850});
    const {width,scroll}=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(scroll<=width+2,'horizontal overflow '+scroll+' > '+width);
    assert.ok(await page.locator('.leaflet-marker-icon').count()>10);
  });
  await page.screenshot({path:screenshots+'/hub-desktop.png',fullPage:true,animations:'disabled'});
  for(const [id,expectedIndex] of [['bond-falls',true],['munising-falls',true],['canyon-falls',true],['scott-falls',false],['o-kun-de-kun-falls',true]]){
    await run(id+' visitor page routes, sources, and indexing',async()=>{
      await page.setViewportSize({width:390,height:844});
      await page.goto(base+'/upper-peninsula-waterfalls/'+id+'/',{waitUntil:'domcontentloaded'});
      assert.ok(await page.locator('h1').count()===1);
      const robots=await page.locator('meta[name="robots"]').getAttribute('content');
      assert.equal(robots?.startsWith('noindex'),!expectedIndex);
      assert.ok(await page.locator('a[href^="https://"]').count()>=2);
      assert.ok(await page.locator('script[src="/assets/leaflet-1.9.4.js"]').count()>0);
      await page.waitForFunction(()=>!!document.querySelector('.detail-map .leaflet-pane'),{timeout:10000});
      const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(metrics.scroll<=metrics.width+2,id+' mobile horizontal overflow');
      if(id==='scott-falls')assert.match(await page.locator('body').innerText(),/not yet confirmed|noindex|access evidence/i);
      if(id==='munising-falls')assert.match(await page.locator('body').innerText(),/closed until further notice|trail closed/i);
      if(id==='bond-falls')await page.screenshot({path:screenshots+'/bond-falls-mobile.png',fullPage:true,animations:'disabled'});
    });
  }
}finally{await browser.close()}
if(failures.length){console.error('\n'+failures.length+' browser smoke failures:\n'+failures.join('\n'));process.exitCode=1}
else console.log('\nWaterfall Chromium smoke passed.');
