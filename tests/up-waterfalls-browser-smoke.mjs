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

  await run('Chicagon and Gabbro geographic pins expose audited road gates, not directions',async()=>{
    const results=await page.evaluate(()=>{
      const map=window.UPWaterfallMap;
      if(!map)throw Error('Waterfall map absent');
      const targets=[{name:'Chicagon',lat:46.134032,lng:-88.452985},{name:'Gabbro',lat:46.502079,lng:-89.992485}];
      return targets.map(t=>{
        let found=null;
        map.eachLayer(layer=>{
          if(typeof layer.getLayers!=='function')return;
          for(const marker of layer.getLayers()){
            if(typeof marker.getLatLng!=='function')continue;
            const point=marker.getLatLng();
            if(Math.abs(point.lat-t.lat)<0.00006&&Math.abs(point.lng-t.lng)<0.00006)found=marker;
          }
        });
        if(!found||!found.getPopup())throw Error(t.name+' GIS research marker missing');
        const body=found.getPopup().getContent();
        return {name:t.name,text:body.textContent,rows:body.querySelectorAll('ol.route-evidence-list li').length,links:body.querySelectorAll('ol.route-evidence-list a[href^="https://"]').length};
      });
    });
    for(const v of results){
      assert.ok(v.rows>=6,v.name+' missing access route steps');
      assert.equal(v.links,v.rows,v.name+' must source each segment');
      assert.match(v.text,/Road-to-waterfall access evidence/);
      assert.match(v.text,/Public access not established/);
      assert.match(v.text,/Do not drive|Do NOT navigate|do NOT navigate/i);
      assert.doesNotMatch(v.text,/Google Maps driving directions/);
    }
    assert.match(results.find(x=>x.name==='Chicagon').text,/DNR.*forest parcel|state forest parcel|47\.8-acre/);
    assert.match(results.find(x=>x.name==='Gabbro').text,/Blackjack|ski hill/i);
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
  for(const [id,expectedIndex] of [['bond-falls',true],['munising-falls',true],['canyon-falls',true],['scott-falls',true],['o-kun-de-kun-falls',true],['upper-hungarian-falls',true],['lower-hungarian-falls',true],['fumee-falls',true],['sand-portage-falls',true],['quiver-falls',true],['pemene-falls',true],['misicot-falls',true],['duppy-falls',true],['mex-i-min-e-falls',true],['jacobs-falls',true],['manganese-falls',true],['wyandotte-falls',true],['rock-river-falls',true],['morgan-falls',true],['falls-river-trail',true],['sturgeon-falls',true],['twin-waterfalls-memorial-preserve',true],['houghton-douglass-falls',true],['power-house-falls',true],['lower-silver-falls',false],['tibbets-falls',true],['bridalveil-falls',true],['lepisto-falls',true],['trappers-falls',true],['explorers-falls',true],['shining-cloud-falls',true],['big-erics-falls',true],['tioga-park-falls',true],['yondota-falls',true]]){
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
    await page.route(url=>url.includes('trailforks.com/widgets/region_map/'),async route=>{
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
