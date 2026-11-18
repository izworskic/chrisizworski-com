#!/usr/bin/env node
'use strict';
/* Browser acceptance for the noindex Rideau pilot. Requires Playwright in CI. */
const {chromium}=require(process.env.RIDEAU_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public'),out=path.resolve(process.env.RIDEAU_QA_OUTPUT||'artifacts/rideau-browser');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(url.pathname);
  let file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    const ext=path.extname(file);
    res.setHeader('Content-Type',({'.json':'application/json','.js':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[ext]||'application/octet-stream'));
    res.end(fs.readFileSync(file));
  }catch(_){res.writeHead(404);res.end('Not found');}
});
async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const report={origin:'local static source',scenarios:[],screenshots:[],realExternalTiles:'unverified',realCommonsPhotos:'unverified'};
  try{
    for(const width of [360,390,768,1440]){
      const context=await browser.newContext({viewport:{width,height:850}});
      await context.route('**/api/carto-basemap-config',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
      let unkeyed=0;
      context.on('request',r=>{if(r.url().includes('basemaps.cartocdn.com')&&!new URL(r.url()).searchParams.has('key'))unkeyed++;});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(origin+'/rideau-canal/',{waitUntil:'domcontentloaded'});
      await page.locator('#recommendations .stop-button').first().waitFor({timeout:20000});
      assert.equal(await page.locator('#static-stops').isHidden(),true);
      assert.equal(await page.locator('[data-mode="visit"]').getAttribute('aria-pressed'),'true');
      assert.match(await page.locator('#feature-name').innerText(),/Ottawa Locks/);
       assert.equal(await page.locator('#rideau-watch-guide').isVisible(),true);
       assert.equal(await page.locator('#rideau-watch-options .rideau-watch-stop').count(),2);
       assert.match(await page.locator('#rideau-watch-guide').innerText(),/Plaza Bridge/);
       assert.equal(await page.locator('#rideau-film-player iframe').count(),0);
       assert.match(await page.locator('#lock-lab-step-title').innerText(),/Enter at the lower water level/);
       await page.locator('#lock-lab-forward').click();
       assert.match(await page.locator('#lock-lab-step-title').innerText(),/Close the gates/);
       await page.locator('#lock-lab-forward').click();
       assert.match(await page.locator('#lock-lab-step-title').innerText(),/Water rises/);
       assert.equal(await page.locator('#lock-lab-chamber-water').getAttribute('y'),'128');
       assert.equal(await page.locator('#lock-lab-upper-gate').getAttribute('opacity'),'1');
       await page.locator('#lock-lab-back').click();
       assert.equal(await page.locator('#lock-lab-chamber-water').getAttribute('y'),'246');
       await page.locator('#lock-lab-reset').click();
       assert.match(await page.locator('#lock-lab-step-title').innerText(),/Enter at the lower water level/);
       await page.locator('[data-rideau-diorama="jones"]').click();
       await page.waitForFunction(()=>{const i=document.getElementById('rideau-diorama-image');return i&&i.complete&&i.naturalWidth>=900;},null,{timeout:12000});
       assert.equal(await page.locator('#rideau-diorama-image').getAttribute('src'),'/assets/rideau-locks-jones-falls-diagram.svg');
       assert.match(await page.locator('#rideau-diorama-caption').innerText(),/three lower locks/i);
       await page.locator('[data-rideau-diorama="ottawa"]').click();
       await page.waitForFunction(()=>{const i=document.getElementById('rideau-diorama-image');return i&&i.complete&&i.naturalWidth>=900;},null,{timeout:12000});
       assert.equal(await page.locator('#rideau-diorama-image').getAttribute('src'),'/assets/rideau-locks-ottawa-diagram.svg');
       if(width===390){
         const dioramaShot=path.join(out,'rideau-dioramas-390.png');
         await page.locator('.rideau-diorama').screenshot({path:dioramaShot,animations:'disabled'});
         report.screenshots.push(dioramaShot);
       }
       if(width===390){
         const labShot=path.join(out,'rideau-lock-cutaway-390.png');
         await page.locator('#inside-the-lock').screenshot({path:labShot,animations:'disabled'});
         report.screenshots.push(labShot);
       }
      const startChoice=await page.locator('[data-mode="visit"]').boundingBox();
      const firstChoiceBottom=startChoice?Math.round(startChoice.y+startChoice.height):null;
      assert.ok(firstChoiceBottom!==null,'Visitor mode not rendered');
      if(width<=390)assert.ok(firstChoiceBottom<=795,'First visitor choice buried below the first screen: '+firstChoiceBottom+'px');
      const openingShot=path.join(out,'rideau-first-screen-'+width+'.png');
      await page.screenshot({path:openingShot,fullPage:false});
      report.screenshots.push(openingShot);
      await page.locator('#interest').selectOption('village');
      await page.locator('#time-budget').selectOption('short');
      assert.match(await page.locator('#answer-title').innerText(),/No exact match/);
      await page.locator('#time-budget').selectOption('half');
      await page.locator('#recommendations .stop-button').first().click();
      assert.match(await page.locator('#feature-name').innerText(),/Merrickville|Chaffeys/);
      await page.locator('[data-mode="cruise"]').click();
      assert.match(await page.locator('#channel-number').innerText(),/159\.0 km/);
      await page.locator('#cruise-to').selectOption('ottawa');
      assert.match(await page.locator('#channel-number').innerText(),/Choose two distinct places/);
      await page.locator('#cruise-to').selectOption('jones-falls');
      assert.match(await page.locator('#channel-number').innerText(),/159\.0 km/);
      await page.locator('[data-mode="paddle"]').click();
      assert.equal(await page.locator('#recommendations .stop-button').count(),2);
      assert.match(await page.locator('#answer-title').innerText(),/Explore a lock beyond your paddle/);
      await page.locator('#recommendations .stop-button').last().click();
      assert.match(await page.locator('#feature-name').innerText(),/Chaffeys/);
      await page.locator('#recommendations .stop-button').first().click();
      assert.match(await page.locator('#feature-name').innerText(),/Newboro/);
      await page.locator('#recommendations .stop-button').last().click();
      assert.match(await page.locator('#feature-name').innerText(),/Chaffeys/);
      if(width===390){
        await page.locator('#feature-photo-wrap').scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>{const img=document.getElementById('feature-photo');return img&&img.complete&&img.naturalWidth>=200&&!img.closest('[hidden]');},null,{timeout:20000});
        await page.locator('#rideau-map').scrollIntoViewIfNeeded();
        await page.waitForFunction(()=>[...document.querySelectorAll('#rideau-map img.leaflet-tile-loaded')].some(img=>img.complete&&img.naturalWidth>=200),null,{timeout:18000});
        const media=await page.evaluate(()=>({photo:{loaded:document.getElementById('feature-photo').naturalWidth>200,
          src:document.getElementById('feature-photo').currentSrc,credit:document.getElementById('feature-photo-credit').textContent},
          tiles:[...document.querySelectorAll('#rideau-map img.leaflet-tile-loaded')].filter(img=>img.naturalWidth>=200).length}));
        assert.ok(media.photo.credit.includes('Source and author'));
        report.realCommonsPhotos={status:'loaded-in-Chromium',evidence:media.photo};
        report.realExternalTiles={status:'loaded-in-Chromium',loadedTileImages:media.tiles};
        const loadedShot=path.join(out,'rideau-map-and-photo-390.png');
        await page.screenshot({path:loadedShot,fullPage:true});report.screenshots.push(loadedShot);
      }
      await page.locator('.directory summary').click();
      assert.equal(await page.locator('#directory-body tr').count(),42);
      const metrics=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,description:getComputedStyle(document.querySelector('.lead')).fontSize}));
      assert.ok(metrics.documentWidth<=metrics.viewportWidth+1,'Horizontal overflow '+width+': '+JSON.stringify(metrics));
      assert.equal(unkeyed,0,'No unkeyed CARTO tile requests');
      assert.deepEqual(errors,[],'Browser JS errors at '+width);
      const shot=path.join(out,'rideau-'+width+'.png');
      await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
      report.scenarios.push({width,visit:true,cruise:true,paddle:true,reverseSelection:true,fullDirectory:true,metrics,errors});
      await context.close();
    }
    const blocked=await browser.newContext({viewport:{width:390,height:800}});
    await blocked.route('**/assets/rideau-locations.json',r=>r.abort());
    const noData=await blocked.newPage();await noData.goto(origin+'/rideau-canal/',{waitUntil:'domcontentloaded'});
    await noData.waitForTimeout(1000);
    assert.equal(await noData.locator('#interactive').isHidden(),true);
    assert.equal(await noData.locator('#static-stops').isVisible(),true);
    assert.ok(await noData.locator('#static-stops a').count()>=14);
    report.scenarios.push({name:'inventory-failure',officialLinksRemain:true});
    await blocked.close();
    const noMap=await browser.newContext({viewport:{width:390,height:800}});
    await noMap.route('**/leaflet.js*',r=>r.abort());
    await noMap.route('**/api/carto-basemap-config',r=>r.fulfill({status:503,body:'{}'}));
    const mapPage=await noMap.newPage();
    await mapPage.goto(origin+'/rideau-canal/',{waitUntil:'domcontentloaded'});
    await mapPage.locator('#feature-name').waitFor();
    await mapPage.waitForFunction(()=>document.getElementById('map-fallback')&&!document.getElementById('map-fallback').hidden,{timeout:10000});
    assert.equal(await mapPage.locator('#map-shell').isHidden(),true);
    report.scenarios.push({name:'missing-map-script',sourceLinksRemain:true});
    await noMap.close();
    const staticContext=await browser.newContext({viewport:{width:390,height:800},javaScriptEnabled:false});
    const staticPage=await staticContext.newPage();
    await staticPage.goto(origin+'/rideau-canal/',{waitUntil:'domcontentloaded'});
    assert.equal(await staticPage.locator('#static-stops').isVisible(),true);
    assert.equal(await staticPage.locator('#interactive').isHidden(),true);
    assert.ok(await staticPage.locator('#static-stops a').count()>=14);
    assert.equal(await staticPage.locator('#inside-the-lock').isVisible(),true);
     assert.match(await staticPage.locator('#inside-the-lock').innerText(),/gravity moves water/);
     assert.ok(await staticPage.locator('#inside-the-lock a[href*="parks.canada.ca"]').count()>0);
     report.scenarios.push({name:'no-javascript',officialLinksRemain:true,staticTeachingDiagram:true});
    await staticContext.close();
    const missingWatch=await browser.newContext({viewport:{width:390,height:800}});
     await missingWatch.route('**/assets/rideau-watch.json',r=>r.abort());
     await missingWatch.route('**/api/carto-basemap-config',r=>r.fulfill({status:503,body:'{}'}));
     const watchPage=await missingWatch.newPage();
     await watchPage.goto(origin+'/rideau-canal/',{waitUntil:'domcontentloaded'});
     await watchPage.locator('#recommendations .stop-button').first().waitFor();
     assert.equal(await watchPage.locator('#rideau-watch-guide').isHidden(),true);
     assert.equal(await watchPage.locator('#interactive').isVisible(),true);
     assert.ok(await watchPage.locator('#feature-links a').count()>=2);
     report.scenarios.push({name:'viewpoint-source-missing',originalStationCardRemains:true});
     await missingWatch.close();
     const motion=await browser.newContext({viewport:{width:390,height:800},reducedMotion:'reduce'});
     const motionPage=await motion.newPage();
     await motionPage.goto(origin+'/rideau-canal/',{waitUntil:'domcontentloaded'});
     assert.equal(await motionPage.locator('#lock-lab-chamber-water').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
     await motionPage.locator('#lock-lab-forward').click();
     assert.match(await motionPage.locator('#lock-lab-step-title').innerText(),/Close the gates/);
     report.scenarios.push({name:'reduced-motion',manualControlsRemain:true});
     await motion.close();
     const keyCtx=await browser.newContext({viewport:{width:390,height:800}});
    let keyed=0;
    await keyCtx.route('**/api/carto-basemap-config',r=>r.fulfill({status:200,contentType:'application/json',body:'{"provider":"CARTO","key":"qa-only-public"}'}));
    await keyCtx.route('**/*.basemaps.cartocdn.com/**',r=>{assert.equal(new URL(r.request().url()).searchParams.get('key'),'qa-only-public');keyed++;return r.abort();});
    const kp=await keyCtx.newPage();await kp.goto(origin+'/rideau-canal/',{waitUntil:'domcontentloaded'});
    await kp.locator('#feature-name').waitFor();await kp.waitForTimeout(2500);
    assert.ok(keyed>=1,'Keyed CARTO tiles were requested when config available');
    report.scenarios.push({name:'keyed-provider-fallback',keyedTiles:keyed});
    await keyCtx.close();
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
    console.log('PASS: Rideau browser interaction, no-data, missing-map and keyed-provider scenarios. Browser loaded photo and map tile are asserted at 390px, but independent public production delivery still requires post-release smoke.');
  }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1;});
