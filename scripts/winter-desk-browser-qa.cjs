#!/usr/bin/env node
/* Reproducible browser proof for the noindex Lake Superior field desk.
 * Usage: WINTER_DESK_BASE=http://127.0.0.1:8765/previews/great-lakes-winter-desk/ node scripts/winter-desk-browser-qa.cjs
 * Requires Playwright and a locally installed Chromium, not a production dependency.
 * Real photos and map tiles load; NWS hourly output is a deterministic fixture.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.WINTER_DESK_BASE||'http://127.0.0.1:8765/previews/great-lakes-winter-desk/';
const screenshotDir=process.env.WINTER_DESK_SCREENSHOTS||'/tmp/winter-desk-browser-qa';
const {chromium}=require('playwright');
function hourly(){
  const now=Date.now();
  const periods=Array.from({length:75},(_,i)=>{
    const start=new Date(now+(i+1)*3600000);
    const end=new Date(now+(i+2)*3600000);
    const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',hourCycle:'h23'}).format(start));
    return {
      startTime:start.toISOString(),endTime:end.toISOString(),isDaytime:h>=8&&h<=18,
      temperature:20+(i%8),temperatureUnit:'F',
      windSpeed:i%9===0?'32 mph':'7 mph',shortForecast:i%9===0?'Snow':'Mostly Cloudy',
      probabilityOfPrecipitation:{value:(i*5)%95}
    };
  });
  return {properties:{updateTime:new Date(now).toISOString(),periods}};
}
async function mockNws(page,failed=false){
  await page.route('https://api.weather.gov/**',route=>{
    if(failed)return route.abort('failed');
    const url=route.request().url();
    const body=url.includes('/points/')
      ?{properties:{forecastHourly:'https://api.weather.gov/gridpoints/WINTERQA/1,1/forecast/hourly'}}
      :hourly();
    return route.fulfill({status:200,contentType:'application/geo+json',body:JSON.stringify(body)});
  });
}
async function main(){
  fs.mkdirSync(screenshotDir,{recursive:true});
  const browser=await chromium.launch({
    headless:true,args:['--no-sandbox'],
    ...(process.env.WINTER_DESK_BROWSER_EXECUTABLE?{executablePath:process.env.WINTER_DESK_BROWSER_EXECUTABLE}:{})
  });
  const summary=[];
  try{
    for(const width of [360,390,768,1440]){
      const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
      const errors=[],unkeyedCarto=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',request=>{
        if(/basemaps\\.cartocdn\\.com/.test(request.url())&&!new URL(request.url()).searchParams.get('key'))unkeyedCarto.push(request.url());
      });
      await mockNws(page);
      await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
      await page.waitForTimeout(1300);
      await page.locator('#day').selectOption('tomorrow');
      const original=await page.locator('#stage-title').textContent();
      assert.match(original,/Upper Falls/);
      assert.match(await page.locator('#quick-outing').textContent(),/Upper Falls/);
      await page.waitForFunction(()=>document.querySelector('#route-policy')?.textContent.includes('Upper Falls'),null,{timeout:10000});
      assert.match(await page.locator('#route-access').textContent(),/not confirmed/);
      const localDate=await page.evaluate(()=>{const c=window.GreatLakesWinterDesk;return c.targetKey(new Date(),'America/Chicago','tomorrow');});
      assert.equal(await page.locator('#route-day').textContent(),localDate);
      await page.waitForFunction(()=>document.querySelector('#arrival-title')?.textContent.includes('Gooseberry Falls Visitor Center'),null,{timeout:10000});
      await page.waitForFunction(()=>{
        const text=document.querySelector('#operator-statement')?.textContent||'';
        return text.includes('Minnesota DNR identifies')||text.includes('needs a new source check');
      },null,{timeout:10000});
      assert.equal(await page.locator('#arrival-directions').isVisible(),false);
      assert.match(await page.locator('#arrival-category').textContent(),/DOCUMENTED WINTER ARRIVAL/);
      const evidence=await page.locator('#source-signal').textContent();
      assert.match(evidence,/unverified|out of date|No trustworthy|source check|source was|source could/i);
      for(const [goal,text] of [['snowshoe','blue posts'],['coast','sandstone'],['falls','Upper Falls']]){
        await page.locator('[data-goal="'+goal+'"]').click();
        assert.match((await page.locator('#stage-title').textContent()).toLowerCase(),new RegExp(text.toLowerCase()));
        assert.equal(await page.locator('[data-goal="'+goal+'"]').getAttribute('aria-pressed'),'true');
        assert.equal(await page.locator('#route-policy-link').getAttribute('href'),await page.locator('#official-link').getAttribute('href'));
        const expectedArrival={snowshoe:'Pictured Rocks Ski Trail Parking',coast:'Meyers Beach Parking',falls:'Gooseberry Falls Visitor Center'};
        await page.waitForFunction(expected=>document.querySelector('#arrival-title')?.textContent.includes(expected),expectedArrival[goal],{timeout:10000});
        const notice=await page.locator('#operator-statement').textContent();
        assert.ok(notice.length>25,'operator source note visible');
        if(goal==='coast'){
          assert.match(await page.locator('#arrival-category').textContent(),/WINTER ROAD ACCESS NOT CONFIRMED/);
          assert.equal(await page.locator('#arrival-directions').isVisible(),true);
          assert.match(await page.locator('#arrival-evidence-link').getAttribute('href'),/nps\.gov\/apis\/planyourvisit\/directions\.htm/);
        }else{
          assert.equal(await page.locator('#arrival-directions').isVisible(),false,'no premature driving directions');
        }

        await page.waitForFunction(()=>{const img=document.querySelector('#stage-photo');return img?.complete&&img.naturalWidth>0;},null,{timeout:10000});
        assert.equal(await page.locator('#stage-photo').evaluate(img=>img.complete&&img.naturalWidth>0),true,'real place photo');
        assert.match(await page.locator('#source-direct').getAttribute('href'),/^https:\/\/(?:www\.nps\.gov|www\.dnr\.state\.mn\.us)\//);
      }
      const metrics=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth,
        tiles:document.querySelectorAll('.leaflet-tile-loaded').length,
        photoLoaded:document.querySelector('#stage-photo').naturalWidth>0,
        forecastHours:document.querySelectorAll('#weather-hours li').length,
      }));
      assert.equal(metrics.overflow,false,'horizontal scroll');
      assert.equal(metrics.photoLoaded,true);
      assert.ok(metrics.tiles>=2,'real map tiles');
      assert.equal(errors.length,0,'browser JavaScript errors');
      assert.equal(unkeyedCarto.length,0,'no unauthenticated CARTO raster tile requests');
      await page.screenshot({path:path.join(screenshotDir,'desk-'+width+'.png'),fullPage:true,animations:'disabled'});
      summary.push({width,...metrics,errors});
      await page.close();
    }
    // A valid public key must reach CARTO tiles. When that CDN fails, the
    // independently loaded OpenStreetMap map still serves visitor selection.
    const keyed=await browser.newPage({viewport:{width:390,height:850}});
    let keyedRequests=0;
    await keyed.route('**/api/carto-basemap-config',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({provider:'CARTO',key:'qa-public-map-key'})
    }));
    await keyed.route(/basemaps\.cartocdn\.com/,route=>{
      const u=new URL(route.request().url());
      assert.equal(u.searchParams.get('key'),'qa-public-map-key');
      keyedRequests++;
      return route.abort('failed');
    });
    await mockNws(keyed,true);
    await keyed.goto(base,{waitUntil:'domcontentloaded'});
    await keyed.waitForFunction(()=>document.querySelectorAll('.leaflet-tile-loaded').length>=2,null,{timeout:12000});
    await keyed.waitForTimeout(900);
    assert.ok(keyedRequests>0,'keyed CARTO requested before fallback');
    assert.equal(await keyed.locator('#map-fallback').isVisible(),false,'OSM tiles remain usable when CARTO fails');
    await keyed.locator('[data-place="meyers-lakeshore"]').click();
    assert.match(await keyed.locator('#stage-title').textContent(),/sandstone|Meyers|shore/i);
    await keyed.close();

    const failure=await browser.newPage({viewport:{width:390,height:850}});
    await failure.route(/(?:basemaps\.cartocdn\.com|tile\.openstreetmap\.org)/,route=>route.abort('failed'));
    await failure.route('**/api/carto-basemap-config',route=>route.fulfill({
      status:200,contentType:'application/json',
      body:JSON.stringify({provider:'CARTO',key:'qa-public-map-key'})
    }));
    await mockNws(failure,true);
    await failure.goto(base,{waitUntil:'domcontentloaded'});
    await failure.waitForFunction(()=>!document.querySelector('#map-fallback').hidden,null,{timeout:10000});
    assert.equal(await failure.locator('#map-fallback').isVisible(),true,'both basemaps unavailable shows a source-linked list');
    assert.match(await failure.locator('#weather-head').textContent(),/not available/i);
    assert.match(await failure.locator('#quick-reason').textContent(),/No usable hourly forecast/i);
    assert.ok(await failure.locator('#conditions-link').getAttribute('href'));
    await failure.close();
    // Synthetic closed-trail fixture is browser-only and never written to the
    // actual route-access-evidence.json. A failed NWS fetch must not erase it.
    const closedPage=await browser.newPage({viewport:{width:390,height:850}});
    const D=require(path.resolve(__dirname,'../previews/great-lakes-winter-desk/core.js'));
    const go=D.getPlace('gooseberry-upper'),targetDate=D.targetKey(new Date(),go.tz,'today');
    const checkedAt=new Date().toISOString();
    const closure={schemaVersion:1,operatorAccessReady:false,routes:{
      [go.id]:{routeId:go.id,routePage:go.official,conditionsPage:go.conditions,
        policy:{text:'The Upper Falls winter approach is the maintained walking route.',sourceUrl:go.official},
        observations:[{
          routeId:go.id,scope:'exact-route',reviewMethod:'human-official-notice',routeExplicit:true,
          sourceUrl:go.conditions,sourceStatement:'Synthetic test-only operator closure naming the exact Upper Falls route.',
          checkedAt,publishedAt:checkedAt,validFrom:targetDate,validThrough:targetDate,status:'closed'
        }]
      }
    }};
    await closedPage.route('**/route-access-evidence.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(closure)}));
    await mockNws(closedPage,true);
    await closedPage.goto(base,{waitUntil:'domcontentloaded'});
    await closedPage.waitForFunction(()=>document.querySelector('#route-access')?.textContent.includes('reports this exact outing closed'),null,{timeout:10000});
    assert.match(await closedPage.locator('#quick-outing').textContent(),/Access warning/);
    assert.match(await closedPage.locator('#quick-reason').textContent(),/closed/);
    assert.match(await closedPage.locator('#stage-status').textContent(),/access restriction/);
    await closedPage.close();
    const noJs=await browser.newContext({javaScriptEnabled:false});
    const staticPage=await noJs.newPage();
    await staticPage.goto(base,{waitUntil:'domcontentloaded'});
    assert.match(await staticPage.locator('#stage-title').textContent(),/Upper Falls/);
    assert.match(await staticPage.locator('#arrival-title').textContent(),/Gooseberry Falls Visitor Center/);
    assert.match(await staticPage.locator('#arrival-evidence-link').getAttribute('href'),/spk00172_winter\.pdf/);
    assert.match(await staticPage.locator('#official-link').getAttribute('href'),/^https:\/\//);
    await noJs.close();
    console.log(JSON.stringify({status:'PASS',summary,verifiedArrivalSources:true,datedOfficialNoticeSnapshots:true,failedSourceFallback:true,syntheticClosureNotOverridden:true,noJs:true,screenshots:screenshotDir},null,2));
  }finally{await browser.close();}
}
main().catch(err=>{console.error(err.stack);process.exit(1);});
