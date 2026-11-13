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
 await run('mobile: real Rust Evidence Atlas gates 640 sources and suppresses duplicate GIS points',async()=>{
  await page.waitForFunction(()=>window.UPWaterfallEvidenceRust?.atlas?.()?.engine==='rust-wasm',{timeout:20000});
  assert.equal(await page.evaluate(()=>window.UPWaterfallEvidenceRust.atlas().engine),'rust-wasm');
  const decisions=await page.evaluate(()=>{
    const r=window.UPWaterfallEvidenceRust.atlas();
    const data=window.__upfallAtlasTestData;
    return {
      name:r.canPlot({kind:'name',mapRole:'no-geographic-point',lat:null,lng:null},new Set(),'all'),
      tourism:r.canPlot({kind:'tourism',mapRole:'tourism-index-no-geographic-point-or-arrival',lat:null,lng:null},new Set(),'all'),
      umbrella:r.canPlot({kind:'guide',mapRole:'multi-falls-day-use-reference-not-natural-waterfall-feature',lat:null,lng:null},new Set(),'all'),
      shadow:r.canPlot({kind:'guide',mapRole:'natural-waterfall-feature-not-arrival',lat:46.4,lng:-89.1,linkedGisIds:[27]},new Set([27]),'all'),
      guideOnly:r.canPlot({kind:'guide',mapRole:'natural-waterfall-feature-not-arrival',lat:46.4,lng:-89.1,linkedGisIds:[27]},new Set([27]),'guide')
    };
  });
  assert.deepEqual(decisions,{name:false,tourism:false,umbrella:false,shadow:false,guideOnly:true});
 });
 await run('mobile: 640 source records are available without claiming 640 waterfalls',async()=>{
  assert.match(await page.locator('#ea-count').innerText(),/640 source records matching/);
  assert.match(await page.locator('.ea-hero').innerText(),/Not every name has a trail/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
  assert.equal(await page.locator('.ea-record').count(),30);
  assert.ok(await page.locator('#ea-map.leaflet-container').count()>0);
  assert.equal(await page.locator('.ea-map-head').innerText().then(s=>/Never parking/i.test(s)),true);
 });
 await run('mobile: research filters cause meaningful reversible output',async()=>{
  await page.locator('#ea-kind').selectOption('name');
  assert.match(await page.locator('#ea-count').innerText(),/291 source records matching/);
  assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0,'name-only source must not create map pins');
  await page.locator('#ea-search').fill('Pauls Falls');
  assert.match(await page.locator('#ea-count').innerText(),/1 source record matching/);
  await page.locator('#ea-search').fill('Paul’s Falls');
  assert.match(await page.locator('#ea-count').innerText(),/1 source record matching/,'curly possessive apostrophe must resolve');
  await page.locator('#ea-search').fill("Paul's Falls");
  assert.match(await page.locator('#ea-count').innerText(),/1 source record matching/,'straight possessive apostrophe must resolve');
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/No verified geographic point/);
  assert.match(await page.locator('#ea-detail').innerText(),/County\s+Houghton/);
  assert.ok(!/maps\.google|directions/.test(await page.locator('#ea-detail a').evaluateAll(arr=>arr.map(a=>a.href).join(' '))));
  await page.locator('#ea-reset').click();
  assert.match(await page.locator('#ea-count').innerText(),/640 source records matching/);
  await page.locator('#ea-kind').selectOption('gis');
  assert.match(await page.locator('#ea-count').innerText(),/161 source records matching/);
  assert.ok(await page.locator('#ea-map .leaflet-interactive').count()>0,'GIS source must provide natural-feature pins');
  await page.locator('#ea-county').selectOption('Iron');
  assert.match(await page.locator('#ea-count').innerText(),/source records matching/);
  const rows=await page.locator('.ea-record').count();
  assert.ok(rows>0&&rows<=30);
  await page.locator('#ea-reset').click();
  await page.locator('#ea-kind').selectOption('tourism');
  assert.match(await page.locator('#ea-count').innerText(),/108 source records matching/);
  assert.match(await page.locator('#ea-map-state').innerText(),/0 geographic dots/);
  await page.locator('.ea-record').filter({hasText:'Alger Falls'}).click();
  assert.match(await page.locator('#ea-detail').innerText(),/Tourism road label/);
  assert.match(await page.locator('#ea-detail').innerText(),/NOT been validated as visitor parking|no safe parking/i);
  assert.match(await page.locator('#ea-detail').innerText(),/Observed as a directory card/);
  assert.match(await page.locator('#ea-detail').innerText(),/Same-name GIS objects/);
  assert.ok(await page.locator('#ea-detail .ea-compare-btn').count()>0,'Alger has a same-name GIS comparison');
  await page.locator('#ea-detail .ea-compare-btn').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/State GIS|STATE GIS/);
  // Tile-load notices may replace the map status; verify the actual one-point GIS selection instead.
  assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),1,'GIS comparison must focus one natural-feature marker, not a parking pin');
  await page.locator('#ea-reset').click();
  await page.locator('#ea-kind').selectOption('tourism');
  await page.locator('#ea-search').fill('Pauls Falls');
  assert.match(await page.locator('#ea-count').innerText(),/1 source record matching/);
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/not been confirmed as a current directory card|NOT been confirmed as a current directory card/i);
  assert.match(await page.locator('#ea-detail').innerText(),/No verified geographic point/);
  assert.equal(await page.locator('#ea-detail .ea-compare-btn').count(),0,'Pauls source name must not invent a state GIS match');
  await page.locator('#ea-search').fill('Bond Falls Outpost');
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail .ea-decision').innerText(),/NOT a separately confirmed natural waterfall/);
  await page.locator('#ea-search').fill('Alger Falls Motel');
  assert.match(await page.locator('#ea-count').innerText(),/0 source records matching/,'motel is excluded from waterfall research index');
  await page.locator('#ea-reset').click();
  assert.match(await page.locator('#ea-count').innerText(),/640 source records matching/);
 });
 await run('mobile: thirteen source identity reviews distinguish coverage, closed waterfalls, and remote unknowns',async()=>{
  await page.locator('#ea-reset').click();
  await page.locator('#ea-kind').selectOption('tourism');
  await page.locator('#ea-search').fill('Greenwood Bonanza');
  assert.match(await page.locator('#ea-count').innerText(),/1 source record matching/);
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/Existing waterfall, alternate name/);
  assert.match(await page.locator('#ea-detail').innerText(),/Bonanza Falls \(Greenwood Falls\)/);
  assert.ok(await page.locator('#ea-detail a[href="/upper-peninsula-waterfalls/bonanza-falls/"]').count()>0,'published Bonanza guide is linked');
  await page.locator('#ea-search').fill('Hungarian Falls');
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/Upper, Middle & Lower Hungarian Falls/);
  assert.equal(await page.locator('#ea-detail a[href*="/upper-peninsula-waterfalls/"][href*="hungarian"]').count(),3,'one tourism title links to three distinct curated guides');
  await page.locator('#ea-search').fill('Tannery Falls');
  assert.match(await page.locator('#ea-count').innerText(),/2 source records matching/,'historical alias should include both the Tannery source and reviewed Rudy Olson source');
  await page.locator('.ea-record').filter({hasText:'Rudolph Olson Memorial Falls'}).click();
  assert.match(await page.locator('#ea-detail').innerText(),/LAND-MANAGER CLOSED/);
  assert.match(await page.locator('#ea-detail .ea-decision').innerText(),/NO authorized visitor route/);
  assert.ok(await page.locator('#ea-detail a[href*="twin-waterfalls-memorial-preserve"]').count()>0);
  await page.locator('#ea-search').fill('Munising Falls');
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/LAND-MANAGER CLOSED/);
  await page.locator('#ea-search').fill('Chipmunk Falls Amasa');
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/GIS #17|state GIS #17/);
  assert.equal(await page.locator('#ea-detail .ea-compare-btn').count(),1,'Amasa must expose exactly one reviewed state feature');
  assert.match(await page.locator('#ea-detail .ea-compare-btn').first().innerText(),/#17/);
  assert.ok(!/#205/.test(await page.locator('#ea-detail .ea-compare-btn').first().innerText()),'Alger Chipmunk cannot be offered as Amasa comparison');
  await page.locator('#ea-search').fill('Bulldog Falls');
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/Distinct remote waterfall; no approved route/);
  assert.match(await page.locator('#ea-detail').innerText(),/No new destination or visitor route authorized/);
  assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0,'no new map dot for Bulldog Falls');
  await page.locator('#ea-search').fill('Siskiwit Falls');
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/Cornucopia, Wisconsin/);
  assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0,'Isle Royale source stays location-only');
  await page.locator('#ea-search').fill('Unnamed Falls Pinkerton');
  await page.locator('.ea-record').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/Identity unresolved/);
  assert.match(await page.locator('#ea-detail').innerText(),/KEEP UNRESOLVED/);
  assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0);
  await page.locator('#ea-reset').click();
  assert.match(await page.locator('#ea-count').innerText(),/640 source records matching/);
 });
 await run('mobile: primary-source investigation cards open exact evidence with no new destination',async()=>{
   await page.locator('#ea-reset').click();
   const pinkerton=page.locator('[data-review-listing="4474"]');
   assert.equal(await pinkerton.isDisabled(),false);
   await pinkerton.click();
   assert.equal(await page.locator('#ea-kind').inputValue(),'tourism');
   assert.match(await page.locator('#ea-search').inputValue(),/Unnamed Falls Pinkerton Creek/);
   assert.match(await page.locator('#ea-detail').innerText(),/NO VERIFIED WATERFALL ROUTE/);
   assert.match(await page.locator('#ea-detail').innerText(),/South Boundary Road/);
   assert.match(await page.locator('#ea-detail').innerText(),/Traders Falls/);
   assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0);
   await page.locator('.ea-access-sources summary').click();
   assert.ok(await page.locator('#ea-detail a[href*="michigan.gov/recsearch"]').count()>=1,'DNR source should be linked');
   assert.match(await page.locator('#ea-detail').innerText(),/1.4 miles/);
   await page.screenshot({path:screenshots+'/evidence-atlas-pinkerton-access-mobile.png',fullPage:true,animations:'disabled'});
   const compare=page.locator('#ea-detail .ea-compare-action');
   assert.equal(await compare.count(),1);
   assert.equal(await compare.getAttribute('aria-pressed'),'false');
   assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0,'source-only record has no default geographic pin');
   await compare.click();
   await page.waitForFunction(()=>document.querySelector('#ea-detail .ea-compare-action')?.getAttribute('aria-pressed')==='true',{timeout:10000});
   const facts=await page.locator('#ea-detail .ea-federal-compare').innerText();
   assert.match(facts,/Pinkerton Falls · USGS 2126322/);
   assert.match(facts,/364 m straight-line/);
   assert.match(facts,/Traders Falls · USGS 1615029/);
   assert.match(facts,/70 m straight-line/);
   assert.match(facts,/1.97 km/);
   assert.match(facts,/66 approved segments/);
   assert.match(facts,/No waterfall approaches, connectors or parking markers/);
   assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),2,'only 2 federal natural-feature circles, no visitor connector');
   assert.ok(await page.locator('#ea-detail a[href*="nationalmap.gov"]').count()>=1);
   assert.ok(await page.locator('#ea-detail a[href*="gisagodnr.state.mi.us"]').count()>=1);
   await page.screenshot({path:screenshots+'/evidence-atlas-pinkerton-official-trail-comparison-mobile.png',fullPage:true,animations:'disabled'});
   await compare.click();
   assert.equal(await compare.getAttribute('aria-pressed'),'false');
   assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0,'hide clears official research overlay');
   await compare.click();
   await page.waitForFunction(()=>document.querySelector('#ea-detail .ea-compare-action')?.getAttribute('aria-pressed')==='true',{timeout:10000});
   assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),2);
   await page.locator('[data-review-listing="5457"]').click();
   assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0,'switching to Bulldog clears Pinkerton official source geometry');
   assert.match(await page.locator('#ea-detail').innerText(),/McCormick Wilderness/);
   assert.match(await page.locator('#ea-detail').innerText(),/NO VERIFIED WATERFALL ROUTE/);
   assert.match(await page.locator('#ea-detail').innerText(),/White Deer Lake Trail/);
   assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0);
   await page.locator('[data-review-listing="3701"]').click();
   assert.match(await page.locator('#ea-detail').innerText(),/PARK CLOSED NOVEMBER 1/);
   assert.match(await page.locator('#ea-detail').innerText(),/0.3-mile Malone Bay/);
   assert.match(await page.locator('#ea-detail').innerText(),/November 1 through April 15/);
   assert.match(await page.locator('#ea-detail').innerText(),/not a confirmed route to a waterfall viewpoint/);
   assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0);
   await page.locator('.ea-access-sources summary').click();
   assert.ok(await page.locator('#ea-detail a[href*="Web_Optimized_2026-Greenstone.pdf"]').count()===1);
   assert.ok(await page.locator('#ea-detail a[href*="/isro/planyourvisit/hours.htm"]').count()===1);
   await page.locator('#ea-reset').click();
   assert.match(await page.locator('#ea-count').innerText(),/640 source records matching/);
 });
 await run('mobile: guide points survive hidden or spelling-mismatched linked GIS records',async()=>{
  await page.locator('#ea-reset').click();
  for(const name of ['Manido Falls','Shining Cloud Falls','Lower Silver Falls','Potawatomi Falls']){
    await page.locator('#ea-search').fill(name);
    assert.ok(await page.locator('.ea-record').count()>0,'source must remain searchable: '+name);
    assert.ok(await page.locator('#ea-map .leaflet-interactive').count()>0,'curated natural waterfall must not vanish: '+name);
  }
  await page.locator('#ea-reset').click();
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
  assert.match(await page.locator('#ea-detail').innerText(),/Upper Falls day-use reference is deliberately omitted/);
  assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),0,'day-use area may not be plotted as a waterfall');
  assert.equal(await page.locator('#ea-detail .ea-compare-btn').count(),2,'Upper and Lower Falls keep separate natural-feature identities');
  await page.locator('#ea-detail .ea-compare-btn').first().click();
  assert.match(await page.locator('#ea-detail').innerText(),/State GIS/i,'evidence type may render in uppercase under page typography');
  assert.equal(await page.locator('#ea-map .leaflet-interactive').count(),1,'one independently mapped natural feature is shown on explicit inspection');
  assert.ok(await page.locator('#ea-detail a[href="/tahquamenon-falls/"]').count()>0);
  const bounds=await page.evaluate(()=>({w:window.innerWidth,s:document.documentElement.scrollWidth}));
  assert.ok(bounds.s<=bounds.w+2,'mobile horizontal overflow: '+bounds.s);
  await page.setViewportSize({width:360,height:760});
  const narrow=await page.evaluate(()=>({w:window.innerWidth,s:document.documentElement.scrollWidth}));
  assert.ok(narrow.s<=narrow.w+2,'360px horizontal overflow: '+narrow.s);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:screenshots+'/evidence-atlas-mobile.png',fullPage:true,animations:'disabled'});
 });
 const desktop=await browser.newPage({viewport:{width:1440,height:900}});
 await desktop.goto(base+'/upper-peninsula-waterfalls/atlas/',{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('.ea-record').first().waitFor();
 await run('desktop: evidence workbench is responsive and map fail-safe',async()=>{
  const b=await desktop.evaluate(()=>({w:window.innerWidth,s:document.documentElement.scrollWidth}));
  assert.ok(b.s<=b.w+2,'desktop horizontal overflow: '+b.s);
  assert.ok(await desktop.locator('#ea-map.leaflet-container').count()>0);
  await desktop.setViewportSize({width:768,height:900});
  const mid=await desktop.evaluate(()=>({w:window.innerWidth,s:document.documentElement.scrollWidth}));
  assert.ok(mid.s<=mid.w+2,'768px horizontal overflow: '+mid.s);
  await desktop.setViewportSize({width:1440,height:900});
  await desktop.screenshot({path:screenshots+'/evidence-atlas-desktop.png',fullPage:true,animations:'disabled'});
 });
 const geoUnavailable=await browser.newPage({viewport:{width:390,height:844}});
 await geoUnavailable.route('**/assets/up-waterfall-pinkerton-official-comparison.json',route=>route.fulfill({status:503,contentType:'text/plain',body:'Unavailable'}));
 await geoUnavailable.goto(base+'/upper-peninsula-waterfalls/atlas/',{waitUntil:'domcontentloaded',timeout:30000});
 await geoUnavailable.locator('.ea-record').first().waitFor();
 await geoUnavailable.locator('[data-review-listing="4474"]').click();
 await geoUnavailable.locator('.ea-compare-action').click();
 await geoUnavailable.waitForFunction(()=>document.querySelector('.ea-federal-state')?.textContent?.includes('cannot be verified'),{timeout:10000});
 await run('authoritative geometry HTTP503 fails closed and preserves original DNR references',async()=>{
   assert.equal(await geoUnavailable.locator('#ea-map .leaflet-interactive').count(),0);
   assert.equal(await geoUnavailable.locator('#ea-detail .ea-federal-measures').count(),0);
   assert.match(await geoUnavailable.locator('#ea-detail').innerText(),/USGS directly confirms Pinkerton Falls/);
   assert.ok(await geoUnavailable.locator('#ea-detail a[href*="nationalmap.gov"]').count()>=1);
   assert.equal(await geoUnavailable.locator('.ea-compare-action').getAttribute('aria-pressed'),'false');
 });
 await geoUnavailable.close();
 const rustMissing=await browser.newPage({viewport:{width:390,height:844}});
 await rustMissing.route('**/assets/up-waterfalls-atlas-regional.wasm.b64',route=>route.abort());
 await rustMissing.goto(base+'/upper-peninsula-waterfalls/atlas/',{waitUntil:'domcontentloaded',timeout:30000});
 await run('blocked Rust module preserves source-only evidence atlas and no invented map points',async()=>{
   await rustMissing.locator('.ea-record').first().waitFor({timeout:15000});
   assert.equal(await rustMissing.evaluate(()=>window.UPWaterfallEvidenceRust?.atlas?.()?.engine||'javascript-fallback'),'javascript-fallback');
   await rustMissing.locator('#ea-kind').selectOption('name');
   assert.match(await rustMissing.locator('#ea-count').innerText(),/291 source records matching/);
   assert.equal(await rustMissing.locator('#ea-map .leaflet-interactive').count(),0);
 });
 await rustMissing.close();
 const offline=await browser.newPage({viewport:{width:390,height:844}});
 await offline.route('**/assets/up-waterfall-evidence-atlas.json*',r=>r.fulfill({status:503,contentType:'text/plain',body:'Unavailable'}));
 await offline.goto(base+'/upper-peninsula-waterfalls/atlas/',{waitUntil:'domcontentloaded',timeout:30000});
 await run('source outage fails closed without fabricated map points',async()=>{
  await offline.waitForFunction(()=>document.querySelector('#ea-count')?.textContent?.includes('Atlas data is unavailable'));
  assert.equal(await offline.locator('.ea-record').count(),0);
  assert.match(await offline.locator('#ea-map').innerText(),/Map withheld/);
 });
 await offline.close();await desktop.close();await page.close();
}finally{await browser.close();}
if(errors.length){console.error('\n'+errors.length+' evidence-atlas browser failures:\n'+errors.join('\n'));process.exitCode=1;}
else console.log('\nEvidence Atlas Chromium smoke passed.');
