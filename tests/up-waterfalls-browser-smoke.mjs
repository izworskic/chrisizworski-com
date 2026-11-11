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
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.UP_WATERFALL_CHROME?{executablePath:process.env.UP_WATERFALL_CHROME}:{})});
const failures=[];
async function run(name,fn){try{await fn();console.log('PASS '+name)}catch(e){failures.push(name+': '+e.message);console.error('FAIL '+name+': '+e.message)}}
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.on('pageerror',err=>failures.push('Page JavaScript error: '+err.message));
  // Test GA4 interactions using a local test double; never contact the real property.
  await page.addInitScript(()=>{window.__upfallCaptured=[];window.gtag=(...args)=>window.__upfallCaptured.push(args);});
  await page.route('https://pagead2.googlesyndication.com/**',r=>r.abort());
  await page.goto(base+'/upper-peninsula-waterfalls/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('[data-fall]').first().waitFor();
  const expectedFalls=JSON.parse(await fs.readFile('data/up-waterfalls.json','utf8')).waterfalls.length;
  await run('mobile hub count matches curated waterfall data',async()=>{
    assert.equal(await page.locator('[data-fall]').count(),expectedFalls);
    assert.equal(await page.locator('h1').count(),1);
    assert.ok(await page.locator('#geographic-research').count()===1);
    for(const id of ['mosquito-falls','elliot-falls','manido-falls','bridalveil-falls'])assert.equal(await page.locator('[data-id="'+id+'"]').count(),1);
  });
  await run('existing Tahquamenon planner owns two source waterfall identities',async()=>{
    assert.equal(await page.locator('[data-id="tahquamenon"][data-gis-multi-oid="207,208"]').count(),1);
    assert.equal(await page.locator('[data-id="tahquamenon"] a[href="/tahquamenon-falls/"]').count()>0,true);
  });
  await run('mobile map initializes from local Leaflet JS and CARTO tiles',async()=>{
    await page.waitForFunction(()=>!!window.UPWaterfallMap,{timeout:15000});
    await page.waitForFunction(()=>[...document.querySelectorAll('img.leaflet-tile')].some(x=>x.complete&&x.naturalWidth>=200&&(x.src.includes('tile.openstreetmap.org')||x.src.includes('cartocdn.com')&&x.src.includes('?key='))),{timeout:15000});
    assert.ok(await page.locator('img.leaflet-tile[src*="tile.openstreetmap.org"],img.leaflet-tile[src*="cartocdn.com"][src*="?key="]').count()>0,'only licensed OSM or keyed CARTO tiles may render');
    assert.ok(await page.locator('#falls-basemap-status').count()>0);
    const sources=await page.locator('img.leaflet-tile').evaluateAll(imgs=>imgs.map(x=>x.src));
    assert.ok(!sources.some(src=>src.includes('cartocdn.com')&&!src.includes('?key=')),'keyless CARTO renders watermark');
    assert.ok(await page.locator('script[src="/assets/leaflet-1.9.4.js"]').count()>0);
  });
  await run('390px mobile document fits viewport',async()=>{
    const {width,scroll}=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(scroll<=width+2,'horizontal overflow '+scroll+' > '+width);
  });
  await page.screenshot({path:screenshots+'/hub-mobile.png',fullPage:true,animations:'disabled'});

  await run('B59 Python nearby lab: source-gated radius, map focus and shared shortlist on mobile',async()=>{
    await page.waitForFunction(()=>document.querySelector('#nearby-origin')?.disabled===false,{timeout:15000});
    await page.locator('#nearby-origin').selectOption('wagner-falls');
    await page.locator('#nearby-radius').selectOption('10');
    assert.match(await page.locator('#nearby-status').innerText(),/10 straight-line miles/);
    assert.equal(await page.locator('[data-nearby-id="miners-falls"]').count(),1);
    assert.equal(await page.locator('[data-nearby-id="munising-falls"]').count(),0,'closed waterfall cannot be suggested');
    await page.locator('[data-nearby-id="miners-falls"] .nearby-map-action').click();
    assert.match(await page.locator('.leaflet-popup-content').innerText(),/Miners Falls/);
    await page.locator('[data-nearby-id="miners-falls"] .nearby-save-action').click();
    assert.match(await page.locator('#selected-list').innerText(),/Miners Falls/);
    await page.locator('#clear-list').click();
    assert.equal(await page.locator('#selected-list').innerText(),'Nothing added yet. Save a few falls to compare before your drive.');
    const {width,scroll}=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(scroll<=width+2,'nearby panel causes mobile horizontal overflow');
    await page.screenshot({path:screenshots+'/python-nearby-waterfalls-mobile.png',fullPage:true,animations:'disabled'});
  });

  await run('B72: six-stop day sheet stays opt-in, includes source details and prints without extra page furniture',async()=>{
    await page.locator('#clear-list').click();
    assert.equal(await page.locator('#upfall-day-sheet').isVisible(),false);
    await page.locator('[data-id="wagner-falls"] .save').click();
    await page.locator('#open-day-sheet').click();
    assert.equal(await page.locator('#upfall-day-sheet').isVisible(),true);
    assert.match(await page.locator('.day-sheet-stop').first().innerText(),/Wagner Falls|Arrival:|Walk:/);
    assert.equal(await page.locator('.day-sheet-stop').count(),1);
    assert.equal(await page.locator('#open-day-sheet').getAttribute('aria-expanded'),'true');
    assert.ok(await page.locator('.day-sheet-links a').count()>0,'source evidence should stay with the saved stop');
    await page.evaluate(()=>{window.__waterfallTestPrintCalls=0;window.print=()=>{window.__waterfallTestPrintCalls++};});
    await page.locator('.day-sheet-actions button').nth(2).click();
    assert.equal(await page.evaluate(()=>window.__waterfallTestPrintCalls),1);
    assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('upfall-print-mode')),true);
    await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('upfall-print-mode')),false);
    await page.locator('#clear-list').click();
    assert.equal(await page.locator('.day-sheet-stop').count(),0);
    assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth))<=390+2,'day sheet causes mobile overflow');
  });
  await run('B72: shared links hydrate only safe stops, drop closed/unknown and retain trip date',async()=>{
    const trip=await browser.newPage({viewport:{width:390,height:844}});
    try{
      await trip.route('https://pagead2.googlesyndication.com/**',r=>r.abort());
      await trip.goto(base+'/upper-peninsula-waterfalls/?falls=wagner-falls,munising-falls,not-real&day=2026-11-29',{waitUntil:'domcontentloaded',timeout:30000});
      await trip.locator('#upfall-day-sheet').waitFor();
      assert.equal(await trip.locator('#visit-date').inputValue(),'2026-11-29');
      assert.equal(await trip.locator('.day-sheet-stop').count(),1);
      assert.match(await trip.locator('#upfall-day-sheet .day-sheet-stop').first().innerText(),/Wagner Falls/);
      assert.match(await trip.locator('#upfall-day-sheet .day-sheet-status').innerText(),/2 shared stop/);
      assert.equal(await trip.locator('a[href*="destination=0%2C0"]').count(),0);
    }finally{await trip.close();}
  });

  await run('B81 Munising plans: source-gated 3-stop day, winter refusal and forest swap on mobile',async()=>{
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2027-06-15');
    await page.locator('[data-munising-preset="shoreline"]').click();
    assert.equal(await page.locator('#upfall-day-sheet .day-sheet-stop').count(),3);
    const shoreline=await page.locator('#selected-list').innerText();
    for(const name of ['Wagner Falls','Miners Falls','Elliot Falls'])assert.match(shoreline,new RegExp(name));
    assert.doesNotMatch(shoreline,/Munising Falls|Chapel Falls/);
    assert.match(await page.locator('#munising-day-status').innerText(),/not verified driving access/i);
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2027-01-15');
    await page.locator('[data-munising-preset="shoreline"]').click();
    assert.equal(await page.locator('#upfall-day-sheet .day-sheet-stop').count(),0,'winter plan must not save road-dependent falls');
    assert.match(await page.locator('#munising-day-status').innerText(),/December 1.*March 31/);
    await page.locator('#visit-date').fill('2027-06-15');
    await page.locator('[data-munising-preset="forest"]').click();
    assert.equal(await page.locator('#upfall-day-sheet .day-sheet-stop').count(),3);
    const forest=await page.locator('#selected-list').innerText();
    assert.match(forest,/Chapel Falls/);
    assert.doesNotMatch(forest,/Elliot Falls|Munising Falls/);
    const {width,scroll}=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(scroll<=width+2,'Munising day causes horizontal overflow');
    await page.screenshot({path:screenshots+'/munising-day-mobile.png',fullPage:true,animations:'disabled'});
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2026-11-02');
  });

  await run('B82 Presque Isle: one arrival, winter policy and conditional three-falls sheet',async()=>{
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2027-01-15');
    await page.locator('[data-presque-preset="circuit"]').click();
    assert.equal(await page.locator('#upfall-day-sheet .day-sheet-stop').count(),0,'winter circuit must fail without adding records');
    assert.match(await page.locator('#presque-isle-feedback').innerText(),/winter gorge-walk hold/);
    await page.locator('[data-presque-preset="overlook"]').click();
    assert.equal(await page.locator('#upfall-day-sheet .day-sheet-stop').count(),1,'winter arrival is conditional; shorter Nawadaha may be considered');
    assert.match(await page.locator('#upfall-day-sheet').innerText(),/Nawadaha Falls/);
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2027-06-15');
    await page.locator('[data-presque-preset="circuit"]').click();
    assert.equal(await page.locator('#upfall-day-sheet .day-sheet-stop').count(),3);
    assert.match(await page.locator('.day-sheet-shared-arrival').innerText(),/ONE DNR scenic-area arrival/);
    assert.match(await page.locator('.day-sheet-shared-arrival').innerText(),/West\/East River Trail repairs/);
    for(const name of ['Nawadaha Falls','Manido Falls','Manabezho Falls'])
      assert.match(await page.locator('#selected-list').innerText(),new RegExp(name));
    assert.match(await page.locator('#presque-isle-feedback').innerText(),/NOT three separate vehicle stops/);
    assert.equal(await page.locator('#presque-isle-outing a[href^="https://www.michigan.gov/recsearch/parks/porkies"]').count()>0,true);
    const dimensions=await page.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));
    assert.ok(dimensions.s<=dimensions.w+2,'Presque Isle panel horizontal overflow');
    await page.screenshot({path:screenshots+'/presque-isle-outing-mobile.png',fullPage:true,animations:'disabled'});
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2026-11-02');
  });

  await run('B84 regional choice finder: all four jump links and 15 source-checked cards',async()=>{
    assert.equal(await page.locator('#waterfall-day-choices .fall-cluster-jump').count(),4);
    assert.equal(await page.locator('#results .fall-card-region-link').count(),15);
    for(const id of ['munising-day','presque-isle-outing','keweenaw-waterfall-day','black-river-waterfall-day'])
      assert.equal(await page.locator('#waterfall-day-choices a[href="#'+id+'"]').count(),1,id);
    assert.equal(await page.locator('[data-id="sandstone-falls"] .fall-card-region-link').getAttribute('href'),'#black-river-waterfall-day');
    assert.match(await page.locator('[data-id="sandstone-falls"] .fall-card-region-link').innerText(),/Closed/);
    const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(dimensions.scroll<=dimensions.width+2,'Regional jump nav causes mobile overflow');
  });
  await run('B84 map popup joins verified guide to regional plan without a fabricated parking point',async()=>{
    await page.locator('#q').fill('');
    await page.locator('#region').selectOption('all');
    await page.locator('#effort').selectOption('all');
    await page.locator('#access').selectOption('all');
    const focused=await page.evaluate(()=>window.UPWaterfallFocus('eagle-river-falls'));
    assert.equal(focused,true);
    const keweenawPopup=page.locator('.leaflet-popup-content .waterfall-popup-cluster-link[href="/upper-peninsula-waterfalls/#keweenaw-waterfall-day"]');
    await keweenawPopup.waitFor();
    assert.equal(await keweenawPopup.getAttribute('href'),'/upper-peninsula-waterfalls/#keweenaw-waterfall-day');
    assert.match(await page.locator('.leaflet-popup-content').innerText(),/waterfall pin|not visitor parking|parking/i);
    const closed=await page.evaluate(()=>window.UPWaterfallFocus('sandstone-falls'));
    assert.equal(closed,true);
    const closurePopup=page.locator('.leaflet-popup-content .waterfall-popup-cluster-link[href="/upper-peninsula-waterfalls/#black-river-waterfall-day"]');
    await closurePopup.waitFor();
    assert.match(await closurePopup.innerText(),/closure and alternative/);
    assert.match(await closurePopup.locator('xpath=..').innerText(),/closed|closure/i);
  });
  await run('B84 field guide to source-safe regional itinerary and back to selected map marker',async()=>{
    const detail=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    try{
      await detail.goto(base+'/upper-peninsula-waterfalls/eagle-river-falls/',{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(await detail.locator('.fall-guide-region-bridge').count(),1);
      assert.equal(await detail.locator('.fall-guide-region-primary').getAttribute('href'),'/upper-peninsula-waterfalls/#keweenaw-waterfall-day');
      assert.equal(await detail.locator('.fall-guide-region-actions a[href*="focus=eagle-river-falls"]').count(),1);
      await detail.locator('.fall-guide-region-primary').click();
      await detail.waitForURL(/#keweenaw-waterfall-day$/);
      assert.equal(await detail.locator('#keweenaw-waterfall-day').count(),1);
      await detail.goto(base+'/upper-peninsula-waterfalls/eagle-river-falls/',{waitUntil:'domcontentloaded',timeout:30000});
      await detail.locator('a[href="/upper-peninsula-waterfalls/?focus=eagle-river-falls#falls-map"]').click();
      await detail.waitForURL(/focus=eagle-river-falls#falls-map$/);
      await detail.waitForFunction(()=>document.getElementById('cluster-map-focus-status')?.textContent.includes('Eagle River Falls waterfall pin selected'),{timeout:15000});
      assert.match(await detail.locator('.leaflet-popup-content').innerText(),/Eagle River Falls/);
      assert.match(await detail.locator('#cluster-map-focus-status').innerText(),/NOT a parking or trailhead direction/);
      const note=await detail.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));
      assert.ok(note.s<=note.w+2,'field guide/map navigation caused horizontal overflow');
      await detail.goto(base+'/upper-peninsula-waterfalls/sandstone-falls/',{waitUntil:'domcontentloaded',timeout:30000});
      assert.match(await detail.locator('.fall-guide-region-bridge h2').innerText(),/Sandstone remains closed/);
      assert.equal(await detail.locator('.fall-guide-region-primary').getAttribute('href'),'/upper-peninsula-waterfalls/#black-river-waterfall-day');
    }finally{await detail.close();}
    // Do not alter the ongoing primary-page filters, visit date or shortlist.
  });
  
  await run('B85 GA4: direct regional navigation and only genuine plan outcomes',async()=>{
    await page.locator('#clear-list').click();
    if(await page.locator('#upfall-day-sheet').evaluate(el=>!el.hidden))await page.locator('#open-day-sheet').click();
    // Other smoke cases already clicked the sheet. Isolate events to THIS scenario.
    await page.evaluate(()=>{window.__upfallCaptured=[];});
    await page.locator('#visit-date').fill('2027-01-20');
    await page.locator('#waterfall-day-choices a[href="#presque-isle-outing"]').click();
    await page.locator('#q').fill('');
    await page.locator('#region').selectOption('all');
    await page.locator('#effort').selectOption('all');
    await page.locator('#access').selectOption('all');
    await page.locator('[data-id="eagle-river-falls"] .fall-card-region-link').click();
    await page.locator('[data-presque-preset="circuit"]').click();
    assert.match(await page.locator('#presque-isle-feedback').innerText(),/winter gorge-walk hold/);
    assert.equal(await page.locator('.day-sheet-stop').count(),0,'blocked plan must add no stops');
    await page.locator('[data-presque-preset="overlook"]').click();
    assert.equal(await page.locator('.day-sheet-stop').count(),1);
    await page.locator('[data-presque-preset="overlook"]').click();
    await page.locator('#open-day-sheet').click(); // close auto-opened sheet
    await page.locator('#open-day-sheet').click(); // manually open once
    const tracked=await page.evaluate(()=>window.__upfallCaptured);
    const nav=tracked.filter(x=>x[1]==='waterfall_region_open');
    assert.ok(nav.some(x=>x[2].wf_region==='presque_isle'&&x[2].wf_surface==='hub_jump'));
    assert.ok(nav.some(x=>x[2].wf_region==='keweenaw'&&x[2].wf_surface==='waterfall_card'));
    const applied=tracked.filter(x=>x[1]==='waterfall_plan_apply');
    assert.ok(applied.some(x=>x[2].wf_region==='presque_isle'&&x[2].wf_variant==='circuit'&&x[2].wf_outcome==='blocked'&&x[2].wf_stops_added===0));
    assert.ok(applied.some(x=>x[2].wf_region==='presque_isle'&&x[2].wf_variant==='overlook'&&x[2].wf_outcome==='added'&&x[2].wf_stops_added===1));
    assert.ok(applied.some(x=>x[2].wf_variant==='overlook'&&x[2].wf_outcome==='already_saved'&&x[2].wf_stops_added===0));
    const opens=tracked.filter(x=>x[1]==='waterfall_day_sheet_action'&&x[2].wf_action==='sheet_open');
    assert.equal(opens.length,1,'automatic programmatic sheet reveal must not inflate explicit opens');
    assert.equal(opens[0][2].wf_stop_count,1);
    assert.ok(tracked.every(x=>x[0]==='event'));
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2026-11-02');
  });
  await run('B85 GA4: guide link and real map deep-link measure without URL/visitor details',async()=>{
    const detail=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    try{
      await detail.addInitScript(()=>{window.__upfallCaptured=[];window.gtag=(...args)=>window.__upfallCaptured.push(args);});
      await detail.goto(base+'/upper-peninsula-waterfalls/haven-falls/',{waitUntil:'domcontentloaded',timeout:30000});
      await detail.evaluate(()=>document.addEventListener('click',e=>{if(e.target.closest('.fall-guide-region-actions'))e.preventDefault();},true));
      await detail.locator('.fall-guide-region-primary').click();
      await detail.locator('.fall-guide-region-actions a[href*="?focus="]').click();
      const ev=await detail.evaluate(()=>window.__upfallCaptured);
      assert.ok(ev.some(x=>x[1]==='waterfall_region_open'&&x[2].wf_surface==='guide_bridge'&&x[2].wf_region==='keweenaw'));
      assert.ok(ev.some(x=>x[1]==='waterfall_map_request'&&x[2].wf_surface==='guide_bridge'&&x[2].wf_region==='keweenaw'));
      assert.ok(ev.every(x=>!('page_location' in x[2])&&!('travel_date' in x[2])&&!('visitor_id' in x[2])));
      await detail.goto(base+'/upper-peninsula-waterfalls/?focus=haven-falls#falls-map',{waitUntil:'domcontentloaded',timeout:30000});
      await detail.waitForFunction(()=>document.querySelector('#cluster-map-focus-status')?.textContent.includes('Haven Falls waterfall pin selected'),{timeout:15000});
      const m=await detail.evaluate(()=>window.__upfallCaptured.filter(x=>x[1]==='waterfall_map_focus'));
      assert.equal(m.length,1);
      assert.equal(m[0][2].wf_region,'keweenaw');
      assert.equal(m[0][2].wf_outcome,'selected');
    }finally{await detail.close();}
  });

  await run('B83: Keweenaw easy parks versus conditional Manganese gorge on mobile',async()=>{
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2027-01-22');
    await page.locator('[data-regional-preset="keweenaw-gorge"]').click();
    assert.equal(await page.locator('.day-sheet-stop').count(),0,'winter gorge recipe must not be saved');
    assert.match(await page.locator('#keweenaw-waterfall-day [data-regional-feedback]').innerText(),/Winter precaution/);
    await page.locator('[data-regional-preset="keweenaw-parks"]').click();
    assert.equal(await page.locator('.day-sheet-stop').count(),2);
    assert.match(await page.locator('#upfall-day-sheet .day-sheet-regional-note').innerText(),/TWO independent park arrivals/);
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2027-06-15');
    await page.locator('[data-regional-preset="keweenaw-gorge"]').click();
    assert.equal(await page.locator('.day-sheet-stop').count(),3);
    assert.match(await page.locator('#upfall-day-sheet .day-sheet-regional-note').innerText(),/Manganese Falls: no independently certified visitor parking coordinate/);
    assert.match(await page.locator('#keweenaw-waterfall-day [data-regional-feedback]').innerText(),/conditional research itinerary/);
    await page.screenshot({path:screenshots+'/keweenaw-regional-day-mobile.png',fullPage:true,animations:'disabled'});
    await page.locator('#clear-list').click();
  });
  await run('B83: Black River construction controls refuse Sandstone, winter byway and unsafe assumptions',async()=>{
    await page.locator('#visit-date').fill('2027-01-22');
    await page.locator('[data-regional-preset="black-river-corridor"]').click();
    assert.equal(await page.locator('.day-sheet-stop').count(),0);
    await page.locator('[data-regional-preset="black-river-one"]').click();
    assert.equal(await page.locator('.day-sheet-stop').count(),1,'Conglomerate can be researched conditionally');
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2027-06-16');
    await page.locator('[data-regional-preset="black-river-corridor"]').click();
    assert.equal(await page.locator('.day-sheet-stop').count(),4);
    for(const name of ['Great Conglomerate Falls','Potawatomi Falls','Gorge Falls','Rainbow Falls']){
      assert.match(await page.locator('#selected-list').innerText(),new RegExp(name));
    }
    assert.doesNotMatch(await page.locator('#selected-list').innerText(),/Sandstone Falls/);
    assert.match(await page.locator('#black-river-waterfall-day [data-regional-feedback]').innerText(),/Sandstone Falls is CLOSED and omitted/);
    assert.match(await page.locator('#upfall-day-sheet .day-sheet-regional-note').innerText(),/Forest Service May 2026/);
    const dimensions=await page.evaluate(()=>({w:innerWidth,s:document.documentElement.scrollWidth}));
    assert.ok(dimensions.s<=dimensions.w+2,'Regional cluster caused horizontal overflow');
    await page.screenshot({path:screenshots+'/black-river-regional-day-mobile.png',fullPage:true,animations:'disabled'});
    await page.locator('#clear-list').click();
    await page.locator('#visit-date').fill('2026-11-02');
  });

  await run('visit lens: filter by 30-minute full on-site range and exclude agency closure',async()=>{
    await page.locator('#visit-region').selectOption('Pictured Rocks / Munising');
    await page.locator('#visit-budget').selectOption('30');
    assert.equal(await page.locator('#region').inputValue(),'Pictured Rocks / Munising');
    assert.equal(await page.locator('[data-visit-pick="wagner-falls"]').count(),1);
    assert.equal(await page.locator('[data-visit-pick="munising-falls"]').count(),0);
    assert.equal(await page.locator('[data-visit-pick="chapel-falls"]').count(),0);
    assert.match(await page.locator('#visit-baseline').innerText(),/high end|at most 30/i);
  });
  await run('visit lens: winter Bond source caution and reversibility',async()=>{
    await page.locator('#visit-region').selectOption('Western U.P.');
    await page.locator('#visit-budget').selectOption('60');
    await page.locator('#q').fill('Bond');
    await page.locator('#visit-date').fill('2026-12-10');
    assert.equal(await page.locator('[data-visit-pick="bond-falls"]').count(),1);
    assert.match(await page.locator('#visit-picks').innerText(),/mid-May through mid-October/);
    await page.locator('[data-visit-pick="bond-falls"] .visit-focus').click();
    assert.equal(await page.locator('[data-visit-pick="bond-falls"] .visit-focus').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#visit-selection').innerText(),/Bond Falls/);
    assert.ok(await page.locator('.leaflet-popup-content').count()>0,'map popup should match selection');
    await page.locator('#q').fill('Rainbow');
    await page.locator('#visit-budget').selectOption('90');
    assert.equal(await page.locator('[data-visit-pick="rainbow-falls"]').count(),1);
    await page.locator('#q').fill('Bond');
    assert.equal(await page.locator('[data-visit-pick="bond-falls"]').count(),1);
    await page.screenshot({path:screenshots+'/visit-lens-bond-mobile.png',fullPage:true,animations:'disabled'});
    await page.locator('#q').fill('');
    await page.locator('#visit-region').selectOption('all');
    await page.locator('#visit-budget').selectOption('60');
    await page.locator('#visit-date').fill('2026-11-02');
    assert.ok(await page.locator('.visit-pick').count()>0);
  });
  await run('visit lens: park-side-only and unfinished viewing do not masquerade as cleared routes',async()=>{
    await page.locator('#visit-region').selectOption('Pictured Rocks / Munising');
    await page.locator('#visit-budget').selectOption('30');
    await page.locator('#q').fill('Scott Falls');
    assert.equal(await page.locator('[data-visit-pick="scott-falls"]').count(),1);
    assert.match(await page.locator('#visit-picks').innerText(),/Do not cross the highway|park side of busy M-28/i);
    await page.locator('#q').fill('');
    await page.locator('#visit-region').selectOption('all');
    assert.equal(await page.locator('[data-visit-pick="scott-falls"]').count(),0,'other safer 30-minute options should rank ahead');
    await page.locator('#visit-region').selectOption('Western U.P.');
    await page.locator('#visit-budget').selectOption('90');
    await page.locator('#q').fill('Houghton-Douglass');
    assert.match(await page.locator('#visit-picks').innerText(),/phased development|accessible falls overlook is not verified/i);
    await page.locator('#q').fill('');
    await page.locator('#visit-region').selectOption('all');
    await page.locator('#visit-budget').selectOption('60');
  });
  await run('visit lens: future dates identify superseded historic source window',async()=>{
    await page.locator('#visit-date').fill('2028-02-10');
    assert.match(await page.locator('#visit-verdict').innerText(),/beyond this source review period|historical/i);
    await page.locator('#visit-date').fill('2026-11-02');
  });
  await run('visit lens: 360px and 1440px layout has no horizontal overflow',async()=>{
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:880});
      const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(metrics.scroll<=width+2,'visit lens '+width+' horizontal overflow: '+metrics.scroll);
      await page.screenshot({path:screenshots+'/visit-lens-'+width+'.png',fullPage:false,animations:'disabled'});
    }
    await page.setViewportSize({width:390,height:844});
  });
  await run('visit lens: no-JS retains fallback source guidance and full destination list',async()=>{
    const staticPage=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});
    try{
      await staticPage.goto(base+'/upper-peninsula-waterfalls/',{waitUntil:'domcontentloaded'});
      assert.equal(await staticPage.locator('[data-fall]').count(),expectedFalls);
      assert.match(await staticPage.locator('.visit-noscript').innerText(),/requires JavaScript/);
      assert.ok(await staticPage.locator('a[href="https://www.michigan.gov/recsearch/parks/porkies"]').count()>=1);
    }finally{await staticPage.close();}
  });
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

  await run('Chicagon research pin remains blocked while Gabbro is promoted to a single curated marker',async()=>{
    const data=await page.evaluate(()=>{
      const map=window.UPWaterfallMap;
      const target={lat:46.134032,lng:-88.452985};
      let found=null;
      map.eachLayer(layer=>{
        if(typeof layer.getLayers!=='function')return;
        for(const marker of layer.getLayers()){
          if(typeof marker.getLatLng!=='function')continue;
          const p=marker.getLatLng();
          if(Math.abs(p.lat-target.lat)<0.00006&&Math.abs(p.lng-target.lng)<0.00006)found=marker;
        }
      });
      if(!found||!found.getPopup())throw Error('Chicagon geographic research point missing');
      const body=found.getPopup().getContent();
      return {text:body.textContent,rows:body.querySelectorAll('ol.route-evidence-list li').length,links:body.querySelectorAll('ol.route-evidence-list a[href^="https://"]').length};
    });
    assert.ok(data.rows>=6);assert.equal(data.links,data.rows);
    assert.match(data.text,/Public access not established/);
    assert.match(data.text,/Do not drive|Do NOT navigate|do NOT navigate/i);
    assert.doesNotMatch(data.text,/Google Maps driving directions/);
    assert.equal(await page.locator('[data-fall][data-gis-oid="38"][data-id="gabbro-falls"]').count(),1);
    assert.ok(!await page.evaluate(()=>[...document.querySelectorAll('[data-fall]')].some(x=>x.dataset.id==='gabbro-falls'&&x.dataset.arrivalVerified!=='verified')));
    assert.equal(await page.locator('[data-id="gabbro-falls"] a[href="/upper-peninsula-waterfalls/gabbro-falls/"]').count()>0,true);
  });
  await run('B61 Chicagon conflict page stays noindex and readable at 390px without driving advice',async()=>{
    const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true});
    try{
      await p.goto(base+'/upper-peninsula-waterfalls/research/chicagon-falls-private-corridor-review/',{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(await p.locator('h1').count(),1);
      assert.equal(await p.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
      assert.equal(await p.locator('.cp-gate').count(),6);
      assert.match(await p.locator('body').innerText(),/county.*private|classified.*Private/i);
      assert.match(await p.locator('body').innerText(),/DNR-managed land/);
      assert.match(await p.locator('body').innerText(),/no confirmed open-now trip/i);
      assert.ok(!await p.locator('a[href*="google.com/maps/dir"]').count());
      assert.equal(await p.locator('a[href*="Recreation-Paln-2022-2026.pdf"]').count()>0,true);
      const size=await p.evaluate(()=>({viewport:window.innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(size.scroll<=size.viewport+2,'Chicagon source page horizontally overflows mobile');
      await p.screenshot({path:screenshots+'/chicagon-source-conflict-mobile.png',fullPage:true,animations:'disabled'});
    }finally{await p.close();}
  });
  await run('B62 Whitefish water-access research pin never invents public falls parking or confuses upstream boat launch',async()=>{
    const info=await page.evaluate(()=>{
      const map=window.UPWaterfallMap;
      if(!map)throw Error('Missing waterfall map');
      let marker=null;
      map.eachLayer(layer=>{
        if(typeof layer.getLayers!=='function')return;
        for(const item of layer.getLayers()){
          if(typeof item.getLatLng!=='function')continue;
          const loc=item.getLatLng();
          if(Math.abs(loc.lat-46.217693)<0.00006&&Math.abs(loc.lng+87.050041)<0.00006)marker=item;
        }
      });
      if(!marker||!marker.getPopup())throw Error('Whitefish research-only GIS #191 not shown');
      const body=marker.getPopup().getContent();
      return {text:body.textContent,gates:body.querySelectorAll('ol.route-evidence-list li').length,links:body.querySelectorAll('ol.route-evidence-list a[href^="https://"]').length,research:body.querySelector('a[href="/upper-peninsula-waterfalls/research/whitefish-falls-dnr-access-review/"]')?.getAttribute('href')};
    });
    assert.equal(info.gates,6);assert.equal(info.links,6);
    assert.match(info.text,/A-02-004/);assert.match(info.text,/A-02-010/);
    assert.match(info.text,/parking.*(NULL|unknown)|NULL.*parking/i);
    assert.match(info.text,/water-access.*falls|watercraft.*falls|DNR.*site/i);
    assert.equal(info.research,'/upper-peninsula-waterfalls/research/whitefish-falls-dnr-access-review/');
    assert.doesNotMatch(info.text,/Google Maps driving directions/);
  });
  await run('B62 Whitefish DNR research page is noindex, readable at mobile width and provides no falls driving point',async()=>{
    const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true});
    try{
      await p.goto(base+'/upper-peninsula-waterfalls/research/whitefish-falls-dnr-access-review/',{waitUntil:'domcontentloaded',timeout:30000});
      assert.equal(await p.locator('h1').count(),1);
      assert.equal(await p.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');
      assert.equal(await p.locator('.wf-source-card').count(),4);
      assert.equal(await p.locator('.wf-gate').count(),6);
      assert.match(await p.locator('body').innerText(),/ROUTE UNVERIFIED/);
      assert.match(await p.locator('body').innerText(),/A-02-004/);
      assert.match(await p.locator('body').innerText(),/A-02-010/);
      assert.match(await p.locator('body').innerText(),/24 m/);
      assert.match(await p.locator('body').innerText(),/parking fields are unknown/i);
      assert.equal(await p.locator('a[href*="google.com/maps/dir"]').count(),0);
      const dim=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(dim.scroll<=dim.width+2,'Whitefish source page horizontally overflows mobile');
      await p.screenshot({path:screenshots+'/whitefish-dnr-evidence-mobile.png',fullPage:true,animations:'disabled'});
    }finally{await p.close();}
  });
  await run('desktop layout and map usable',async()=>{
    await page.setViewportSize({width:1280,height:850});
    const {width,scroll}=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(scroll<=width+2,'horizontal overflow '+scroll+' > '+width);
    assert.ok(await page.locator('.leaflet-marker-icon').count()>10);
  });
  await page.screenshot({path:screenshots+'/hub-desktop.png',fullPage:true,animations:'disabled'});
  await run('Bonanza signed township park page distinguishes three map points and rejects private-waterfall driving',async()=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+'/upper-peninsula-waterfalls/bonanza-falls/',{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(await page.locator('h1').count(),1);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/^index,follow/);
    const body=await page.locator('body').innerText();
    assert.match(body,/Township.*Park|Greenwoods township park/i);
    assert.match(body,/signed.*parking|signed.*entrance/i);
    assert.match(body,/private LLC|private.*parcel|private.*riverfront/i);
    assert.match(body,/current opening and road conditions are unverified/i);
    assert.equal(await page.locator('#mini-map[data-lat="46.818863"][data-visit-lat="46.8176942"][data-view-lat="46.817719"]').count(),1);
    await page.waitForFunction(()=>document.querySelectorAll('#mini-map .leaflet-interactive').length>=3,{timeout:12000});
    assert.ok(await page.locator('#mini-map .leaflet-interactive').count()>=3);
    const html=await page.content();
    assert.ok(html.includes('destination=46.8176942%2C-89.5674561'));
    assert.ok(!html.includes('destination=46.818863'));
    assert.ok(!html.includes('data-parking-lat='));
    const {width,scroll}=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(scroll<=width+2,'Bonanza page horizontal overflow '+scroll+' > '+width);
    await page.screenshot({path:screenshots+'/bonanza-township-park-mobile.png',fullPage:true,animations:'disabled'});
  });
  for(const [id,expectedIndex] of [['gabbro-falls',true],['wright-street-falls',true],['bond-falls',true],['munising-falls',true],['canyon-falls',true],['scott-falls',true],['o-kun-de-kun-falls',true],['upper-hungarian-falls',true],['lower-hungarian-falls',true],['fumee-falls',true],['sand-portage-falls',true],['quiver-falls',true],['pemene-falls',true],['misicot-falls',true],['duppy-falls',true],['mex-i-min-e-falls',true],['jacobs-falls',true],['manganese-falls',true],['wyandotte-falls',true],['rock-river-falls',true],['morgan-falls',true],['falls-river-trail',true],['sturgeon-falls',true],['twin-waterfalls-memorial-preserve',true],['houghton-douglass-falls',true],['power-house-falls',true],['lower-silver-falls',false],['tibbets-falls',true],['bridalveil-falls',true],['lepisto-falls',true],['trappers-falls',true],['explorers-falls',true],['shining-cloud-falls',true],['big-erics-falls',true],['tioga-park-falls',true],['yondota-falls',true]]){
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
      if(id==='gabbro-falls'){
        const text=await page.locator('body').innerText();
        assert.match(text,/Snowriver/);
        assert.match(text,/City of Bessemer/);
        assert.match(text,/0\.3.mile/i);
        assert.match(text,/non.guest|not.*guest/i);
        assert.match(text,/service road/i);
        assert.match(text,/winter.*not.*open|winter.*not.*guarantee|Winter: not an open-now/i);
        assert.equal(await page.locator('#mini-map[data-lat="46.502079"][data-lng="-89.992485"]').count(),1);
        assert.ok(!await page.locator('#mini-map').getAttribute('data-parking-lat'),'Gabbro has no surveyed parking point');
        await page.waitForFunction(()=>[...document.querySelectorAll('#mini-map img.leaflet-tile')].some(x=>x.complete&&x.naturalWidth>=180),{timeout:18000});
        await page.screenshot({path:screenshots+'/gabbro-falls-mobile.png',fullPage:true,animations:'disabled'});
      }
      if(id==='wright-street-falls'){
        const body=await page.locator('body').innerText();
        assert.match(body,/Wright Street/);
        assert.match(body,/Dead River Falls/);
        assert.match(body,/Board of Light and Power/);
        assert.match(body,/Noquemanon/);
        assert.ok(!await page.locator('#mini-map').getAttribute('data-parking-lat'),'no unverified GPS parking');
        await page.waitForFunction(()=>[...document.querySelectorAll('#mini-map img.leaflet-tile')].some(i=>i.complete&&i.naturalWidth>=180),{timeout:18000});
        assert.ok((await page.locator('#mini-map img.leaflet-tile[src*="tile.openstreetmap.org"],#mini-map img.leaflet-tile[src*="cartocdn.com"][src*="?key="]').count())>0,'detail basemap must use keyed CARTO or OSM');
        await page.screenshot({path:screenshots+'/wright-street-falls-mobile.png',fullPage:true,animations:'disabled'});
      }
      if(id==='scott-falls'){
        const body=await page.locator('body').innerText();
        assert.match(body,/without crossing M-28|Do not cross M-28|do not cross busy M-28/i);
        assert.match(body,/park-side|roadside park/i);
        assert.ok(!body.includes('Google Maps directions to the waterfall coordinate'));
      }
      if(id==='tioga-park-falls'){
        const body=await page.locator('body').innerText();
        assert.match(body,/separate|distinct/i);
        assert.match(body,/2\.2 kilometres|2\.2 km|2\.19km/);
        assert.match(body,/seasonal|late October/i);
      }
      if(id==='shining-cloud-falls'){
        const body=await page.locator('body').innerText();
        assert.match(body,/Big Carp River/i);
        assert.match(body,/Pinkerton/i);
      }
      if(id==='munising-falls')assert.match(await page.locator('body').innerText(),/closed until further notice|trail closed/i);
      if(id==='bridalveil-falls'){const body=await page.locator('body').innerText();assert.match(body,/Miners Castle/);assert.match(body,/Miners Beach/);assert.match(body,/No maintained hiking path|No maintained trail/i);await page.screenshot({path:screenshots+'/bridalveil-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='sand-portage-falls'){const body=await page.locator('body').innerText();assert.match(body,/Knutson|Knuston/);assert.match(body,/0.5-mile/);assert.match(body,/not.*parking/i);}
      if(id==='quiver-falls'){const body=await page.locator('body').innerText();assert.match(body,/Pemene Dam Road/);assert.match(body,/accessible/i);assert.match(body,/not.*parking/i);await page.screenshot({path:screenshots+'/quiver-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='pemene-falls'){const body=await page.locator('body').innerText();assert.match(body,/Verheyen Lane/);assert.match(body,/primitive overlook/);assert.match(body,/0.5 mile|0.5-mile/);assert.match(body,/not.*parking|not public parking|not a parking/i);assert.equal(await page.locator('#mini-map[data-visit-lat="45.5884"][data-lat="45.594123"]').count(),1);await page.waitForFunction(()=>document.querySelectorAll('#mini-map .leaflet-interactive').length>=2,{timeout:10000});await page.screenshot({path:screenshots+'/pemene-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='misicot-falls'){const body=await page.locator('body').innerText();assert.match(body,/Third Pier/);assert.match(body,/Piers Gorge Road/);assert.match(body,/1.5-mile/);assert.match(body,/not.*parking|not public parking|not a parking/i);await page.screenshot({path:screenshots+'/misicot-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='duppy-falls'){const body=await page.locator('body').innerText();assert.match(body,/Forest Road 3610/);assert.match(body,/unmarked/i);assert.match(body,/3645/);assert.match(body,/current opening and road conditions are unverified/i);assert.match(body,/not.*parking|not a.*parking|not public parking/i);await page.screenshot({path:screenshots+'/duppy-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='mex-i-min-e-falls'){const body=await page.locator('body').innerText();assert.match(body,/Forest Road 4500/);assert.match(body,/quarter-mile|quarter mile/);assert.match(body,/round trip/i);assert.match(body,/May.*September/i);assert.match(body,/current opening and road conditions are unverified/i);assert.equal(await page.locator('#mini-map[data-visit-lat="46.31379535"][data-lat="46.313443"]').count(),1);await page.waitForFunction(()=>document.querySelectorAll('#mini-map .leaflet-interactive').length>=2,{timeout:10000});await page.screenshot({path:screenshots+'/mex-i-min-e-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='jacobs-falls'){const b=await page.locator('body').innerText();assert.match(b,/M-26/);assert.match(b,/Jampot/);assert.match(b,/roadside/i);assert.match(b,/current opening and road conditions are unverified/i);}
      if(id==='manganese-falls'){const b=await page.locator('body').innerText();assert.match(b,/Manganese Road/);assert.match(b,/deep gorge|steep gorge/i);assert.match(b,/children/);assert.match(b,/current opening and road conditions are unverified/i);await page.screenshot({path:screenshots+'/manganese-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='wyandotte-falls'){const b=await page.locator('body').innerText();assert.match(b,/Poyhonen Road/);assert.match(b,/250-yard/);assert.match(b,/Misery River/);assert.match(b,/current opening and road conditions are unverified/i);await page.screenshot({path:screenshots+'/wyandotte-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='rock-river-falls'){const b=await page.locator('body').innerText();assert.match(b,/FR 2293|FR2293/);assert.match(b,/FR 2276|FR2276/);assert.match(b,/1.2-mile/);assert.match(b,/current opening and road conditions are unverified/i);assert.match(b,/not automatically the Rock River Falls parking lot/i);await page.screenshot({path:screenshots+'/rock-river-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='morgan-falls'){const b=await page.locator('body').innerText();assert.match(b,/NTN South Trailhead/);assert.match(b,/M-553/);assert.match(b,/designated.*crossing/i);assert.match(b,/closed to motor/i);assert.match(b,/Do not park/i);assert.match(b,/current opening and road conditions are unverified/i);await page.screenshot({path:screenshots+'/morgan-falls-mobile.png',fullPage:true,animations:'disabled'});}
      if(id==='bond-falls')await page.screenshot({path:screenshots+'/bond-falls-mobile.png',fullPage:true,animations:'disabled'});
    });
  }

  await run('Carp River segment map loads only after explicit visitor action',async()=>{
    const embeds=[];
    await page.route('https://www.trailforks.com/widgets/trail/**',async route=>{
      embeds.push(route.request().url());
      await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><title>NTN mapped trail test</title></head><body>Trailforks widget test fixture</body></html>'});
    });
    await page.goto(base+'/upper-peninsula-waterfalls/carp-river-falls/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#cr-show-falls').waitFor();
    assert.equal(await page.locator('iframe.cr-trail-embed').count(),0);
    assert.equal(embeds.length,0,'no third-party trail map should preload');
    assert.equal(await page.locator('#cr-show-falls').getAttribute('aria-pressed'),'true');
    await page.locator('#cr-show-trail').click();
    assert.equal(await page.locator('#cr-show-trail').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#cr-trail-panel').isVisible(),true);
    assert.equal(await page.locator('iframe.cr-trail-embed').count(),0);
    assert.match(await page.locator('#cr-trail-panel').innerText(),/3,363 feet/);
    assert.match(await page.locator('#cr-trail-panel').innerText(),/not.*parking-to-overlook|not.*complete|not a verified continuous/i);
    await page.locator('#cr-load-trail-map').click();
    await page.locator('iframe.cr-trail-embed').waitFor();
    assert.equal(await page.locator('iframe.cr-trail-embed').count(),1);
    assert.ok((await page.locator('iframe.cr-trail-embed').getAttribute('src')).includes('trailid=766002'));
    assert.equal(embeds.length,1,'map request should follow exactly one click');
    const networkEmbeds=[];
    await page.route(url=>String(url).includes('trailforks.com/widgets/region_map/'),async route=>{
      networkEmbeds.push(route.request().url());
      await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>NTN South Trails 11149 published network test fixture</body></html>'});
    });
    assert.equal(networkEmbeds.length,0);
    assert.equal(await page.locator('#cr-network-panel').isVisible(),false);
    await page.locator('#cr-show-network').click();
    assert.equal(await page.locator('#cr-network-panel').isVisible(),true);
    assert.equal(await page.locator('iframe[src*="region_map"]').count(),0,'never preload third-party region map');
    assert.match(await page.locator('#cr-network-panel').innerText(),/connecting trails|South Trails/i);
    await page.locator('#cr-load-network-map').click();
    await page.locator('iframe[src*="region_map"]').waitFor();
    assert.equal(networkEmbeds.length,1,'one consented network widget request');
    assert.ok((await page.locator('iframe[src*="region_map"]').getAttribute('src')).includes('rid=11149'));
    await page.locator('#cr-open-network').click();
    assert.equal(await page.locator('#cr-show-network').getAttribute('aria-pressed'),'true');
    assert.equal(networkEmbeds.length,1,'do not reload a consented widget');
    for(const item of await page.locator('.cr-route-chain details').all()){await item.locator('summary').click();assert.equal(await item.getAttribute('open'),'');}
    assert.equal(await page.locator('.cr-route-chain details').count(),5);
    assert.match(await page.locator('#cr-approach').innerText(),/not.*verified lot-to-railing|not.*measured|not.*certified|Distance is still an open question/i);
    await page.locator('#cr-show-falls').click();
    assert.equal(await page.locator('#cr-trail-panel').isVisible(),false);
    assert.equal(await page.locator('#cr-falls-panel').isVisible(),true);
    assert.ok(await page.locator('#cr-geo-map.leaflet-container').count()>0,'native CARTO map should remain operable');
    const widths=await page.evaluate(()=>({viewport:window.innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(widths.scroll<=widths.viewport+2,'Carp map controls horizontally overflow mobile');
    await page.screenshot({path:screenshots+'/carp-mapped-trail-mobile.png',fullPage:true,animations:'disabled'});
  });
}finally{await browser.close()}
if(failures.length){console.error('\n'+failures.length+' browser smoke failures:\n'+failures.join('\n'));process.exitCode=1}
else console.log('\nWaterfall Chromium smoke passed.');
