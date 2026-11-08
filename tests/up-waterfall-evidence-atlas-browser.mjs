#!/usr/bin/env node
// Independent Chromium acceptance checks for the research-only Evidence Atlas.
// Uses the same Playwright install as the existing U.P. waterfall browser smoke.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire('/tmp/up-waterfalls-playwright/package.json');
const {chromium}=require('playwright');
const base=process.env.SMOKE_URL||'http://127.0.0.1:8765';
const screenshots='/tmp/up-waterfalls-smoke-screens';
await fs.mkdir(screenshots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.UP_WATERFALL_CHROME?{executablePath:process.env.UP_WATERFALL_CHROME}:{})});
const errors=[];
async function run(name,fn){try{await fn();console.log('PASS '+name);}catch(e){errors.push(name+': '+e.message);console.error('FAIL '+name+': '+e.message);}}
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push('Unhandled Atlas JS error: '+e.message));
 await page.goto(base+'/upper-peninsula-waterfalls/atlas/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('.ea-record').first().waitFor({timeout:20000});
 await run('mobile: 544 source records are available without claiming 544 waterfalls',async()=>{
  assert.match(await page.locator('#ea-count').innerText(),/544 source records matching/);
  assert.match(await page.locator('.ea-hero').innerText(),/Not every name has a trail/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
  assert.equal(await page.locator('.ea-record').count(),30);
  assert.ok(await page.locator('#ea-map.leaflet-container').count()>0);
  assert.equal(await page.locator('.ea-map-head').innerText().then(s=>/Never parking/i.test(s)),true);
 });
 await run('mobile: research filters cause meaningful reversible output',async()=>{
  await page.locator('#ea-kind').selectOption('name');
  assert.match(await page.locator('#ea-count').innerText(),/291 source records matching/);
  assert.match(await page.locator('#ea-map-state').innerText(),/0 geographic dots/);
  await page.locator('#ea-search').fill('Pauls Falls');
  assert.match(await page.locator('#ea-count').innerText(),/1 source record matching/);
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/No verified geographic point/);
  assert.match(await page.locator('#ea-detail').innerText(),/Houghton County/);
  assert.ok(!/maps\.google|directions/.test(await page.locator('#ea-detail a').evaluateAll(arr=>arr.map(a=>a.href).join(' '))));
  await page.locator('#ea-reset').click();
  assert.match(await page.locator('#ea-count').innerText(),/544 source records matching/);
  await page.locator('#ea-kind').selectOption('gis');
  assert.match(await page.locator('#ea-count').innerText(),/161 source records matching/);
  assert.match(await page.locator('#ea-map-state').innerText(),/161 natural-feature dots/);
  await page.locator('#ea-county').selectOption('Iron');
  assert.match(await page.locator('#ea-count').innerText(),/source records matching/);
  const rows=await page.locator('.ea-record').count();
  assert.ok(rows>0&&rows<=30);
  await page.locator('#ea-reset').click();
  await page.locator('#ea-kind').selectOption('tourism');
  assert.match(await page.locator('#ea-count').innerText(),/12 source records matching/);
  assert.match(await page.locator('#ea-map-state').innerText(),/0 geographic dots/);
  await page.locator('.ea-record').filter({hasText:'Alger Falls'}).click();
  assert.match(await page.locator('#ea-detail').innerText(),/Tourism road label/);
  assert.match(await page.locator('#ea-detail').innerText(),/not a verified parking/i);
 });
 await run('mobile: source comparison works for existing curated waterfall',async()=>{
  await page.locator('#ea-reset').click();
  await page.locator('#ea-kind').selectOption('guide');
  assert.match(await page.locator('#ea-count').innerText(),/80 source records matching/);
  await page.locator('#ea-search').fill('Tahquamenon');
  assert.match(await page.locator('#ea-count').innerText(),/1 source record matching/);
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/Linked GIS IDs/);
  assert.match(await page.locator('#ea-detail').innerText(),/207, 208/);
  assert.ok(await page.locator('#ea-detail a[href="/tahquamenon-falls/"]').count()>0);
  const bounds=await page.evaluate(()=>({w:window.innerWidth,s:document.documentElement.scrollWidth}));
  assert.ok(bounds.s<=bounds.w+2,'mobile horizontal overflow: '+bounds.s);
  await page.screenshot({path:screenshots+'/evidence-atlas-mobile.png',fullPage:true,animations:'disabled'});
 });
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});
 await desktop.goto(base+'/upper-peninsula-waterfalls/atlas/',{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('.ea-record').first().waitFor();
 await run('desktop: evidence workbench is responsive and map fail-safe',async()=>{
  const b=await desktop.evaluate(()=>({w:window.innerWidth,s:document.documentElement.scrollWidth}));
  assert.ok(b.s<=b.w+2,'desktop horizontal overflow: '+b.s);
  assert.ok(await desktop.locator('#ea-map.leaflet-container').count()>0);
  await desktop.screenshot({path:screenshots+'/evidence-atlas-desktop.png',fullPage:true,animations:'disabled'});
 });
 const offline=await browser.newPage({viewport:{width:390,height:844}});
 await offline.route('**/assets/up-waterfall-evidence-atlas.json',r=>r.fulfill({status:503,contentType:'text/plain',body:'Unavailable'}));
 await offline.goto(base+'/upper-peninsula-waterfalls/atlas/',{waitUntil:'domcontentloaded',timeout:30000});
 await run('source outage fails closed without fabricated map points',async()=>{
  await offline.locator('#ea-count').getByText(/Atlas data is unavailable/).waitFor();
  assert.equal(await offline.locator('.ea-record').count(),0);
  assert.match(await offline.locator('#ea-map').innerText(),/Map withheld/);
 });
 await offline.close();await desktop.close();await page.close();
}finally{await browser.close();}
if(errors.length){console.error('\n'+errors.length+' evidence-atlas browser failures:\n'+errors.join('\n'));process.exitCode=1;}
else console.log('\nEvidence Atlas Chromium smoke passed.');
