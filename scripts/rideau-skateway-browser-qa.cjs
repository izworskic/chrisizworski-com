#!/usr/bin/env node
'use strict';
const {chromium}=require(process.env.SKATEWAY_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public'),out=path.resolve(process.env.SKATEWAY_QA_OUTPUT||'artifacts/rideau-skateway-browser');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),name=decodeURIComponent(url.pathname);
 let f=path.resolve(root,'.'+name);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{
  if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');
  const type={'.json':'application/json','.js':'application/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'}[path.extname(f)]||'application/octet-stream';
  res.setHeader('Content-Type',type);res.end(fs.readFileSync(f));
 }catch(_){res.writeHead(404);res.end('Not found');}
});
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={source:'local branch HTTP server; NCC external source blocked by fixture',scenarios:[],images:[],productionLive:false};
 try{
  for(const width of [360,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:850}});
    await context.route('**/services2.arcgis.com/**',route=>route.abort());
    await context.route('**/api/carto-basemap-config',route=>route.fulfill({status:503,body:'{}'}));
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/rideau-canal-skateway/',{waitUntil:'domcontentloaded'});
    await page.locator('#section-list button').first().waitFor({timeout:20000});
    assert.equal(await page.locator('#section-list button').count(),14);
    assert.equal(await page.locator('#static-sections').isHidden(),true);
    assert.match(await page.locator('#overall-verdict').innerText(),/No current skating opening verified/);
    assert.match(await page.locator('#selected-status').innerText(),/unverified/);
    await page.locator('#section-list button[data-section-id="11"]').click();
    assert.match(await page.locator('#selected-title').innerText(),/Bank to Bronson/);
    assert.match(new URL(page.url()).search,/section=11/);
    assert.match(await page.locator('#selected-access').innerText(),/Bronson/);
    assert.ok((await page.locator('#selected-access a[href*="google.com/maps/search"]').count())>=1);
    await page.locator('#section-list button[data-section-id="1"]').click();
    assert.match(await page.locator('#selected-title').innerText(),/Rideau to Mackenzie King/);
    await page.locator('[data-filter="open"]').click();
    assert.match(await page.locator('#section-list').innerText(),/no fresh NCC-reported skating openings/);
    await page.locator('[data-filter="all"]').click();
    assert.equal(await page.locator('#section-list button').count(),14);
    const dimensions=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));
    assert.ok(dimensions.scrollWidth<=dimensions.viewport+1,'Unexpected horizontal scroll: '+JSON.stringify(dimensions));
    assert.deepEqual(errors,[]);
    if(width===390){
      await page.locator('.winter-story img').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>{const img=document.querySelector('.winter-story img');return img&&img.complete&&img.naturalWidth>=900;},null,{timeout:12000});
      assert.equal(await page.locator('.winter-story img').getAttribute('src'),'/assets/rideau-skateway-dows-lake-2025.jpg');
      const photoShot=path.join(out,'skateway-real-photo-390.png');
      await page.screenshot({path:photoShot,fullPage:false});
      report.images.push(photoShot);
      report.scenarios.push({name:'real-dows-lake-2025-photo-loaded',localLicensedAsset:true,licence:'CC0 1.0',creditPresent:true});
    }
    const shot=path.join(out,'skateway-'+width+'.png');
    await page.screenshot({path:shot,fullPage:true});report.images.push(shot);
    report.scenarios.push({width,sectionSelection:true,reverseSelection:true,sourceFailure:true,openFilterUnknown:true,noOverflow:true});
    await context.close();
  }
  const nojs=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false});
  const p=await nojs.newPage();await p.goto(origin+'/rideau-canal-skateway/',{waitUntil:'domcontentloaded'});
  assert.equal(await p.locator('#static-sections').isVisible(),true);
  assert.equal(await p.locator('#interactive').isHidden(),true);
  assert.equal(await p.locator('#static-sections ol li').count(),14);
  report.scenarios.push({name:'no-javascript',officialSourcesRemain:true});
  await nojs.close();
  // Exercise an actual fresh, complete NCC-shaped report with a controlled winter clock.
  // This does not claim the NCC really issued these fixture statuses.
  const winter=await browser.newContext({viewport:{width:390,height:850}});
  const oneOpen=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/rideau-skateway/official-sections-v1.json'),'utf8'));
  await winter.route('**/services2.arcgis.com/**',route=>{
    const u=route.request().url();
    const metadata={editingInfo:{dataLastEditDate:Date.parse('2027-01-21T13:00:00Z')}};
    const features=oneOpen.sections.map(s=>({attributes:{OBJECTID:s.id,ID:s.id,From_:s.from,To_:s.to,Length_KM:s.id===11?'1.0 km':s.km+' km',Status:s.id===1?'Good':'Closed'}}));
    const body=u.includes('/query?')?{features}:metadata;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body),headers:{'access-control-allow-origin':'*'}});
  });
  await winter.route('**/api/carto-basemap-config',r=>r.fulfill({status:503,body:'{}'}));
  const fresh=await winter.newPage();
  await fresh.clock.setFixedTime(new Date('2027-01-21T15:00:00Z'));
  await fresh.goto(origin+'/rideau-canal-skateway/',{waitUntil:'domcontentloaded'});
  await fresh.locator('#section-list button').first().waitFor({timeout:20000});
  await fresh.waitForFunction(()=>document.getElementById('overall-verdict').textContent.includes('1 section'),null,{timeout:15000});
  assert.match(await fresh.locator('#overall-verdict').innerText(),/1 section/);
  assert.match(await fresh.locator('#source-time').innerText(),/passes freshness check/);
  await fresh.locator('[data-filter="open"]').click();
  assert.equal(await fresh.locator('#section-list button').count(),1);
  assert.match(await fresh.locator('#selected-status').innerText(),/NCC reports: Good/);
  const winterShot=path.join(out,'skateway-fixture-current-390.png');
  await fresh.screenshot({path:winterShot,fullPage:false});
  report.images.push(winterShot);
  report.scenarios.push({name:'fresh-winter-NCC-shaped-fixture',openingFixtureOnly:true,onlyOneReportedSection:true,clock:'2027-01-21T15:00:00Z'});
  await winter.close();
  // Try the actual public NCC feed from a browser origin, without substituting
  // archived statuses for a 2026-27 opening. Network errors are recorded as
  // source delivery blockers; they are not converted into positive status.
  const providerContext=await browser.newContext({viewport:{width:390,height:850}});
  const providerPage=await providerContext.newPage();
  await providerPage.goto(origin+'/rideau-canal-skateway/',{waitUntil:'domcontentloaded'});
  const nccProbe=await providerPage.evaluate(async()=>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    const base='https://services2.arcgis.com/WLyMuW006nKOfa5Z/arcgis/rest/services/NCC_Rideau_Canal_Skateway_Ice_condition/FeatureServer/0';
    const query=base+'/query?where=1%3D1&outFields=OBJECTID%2CID%2CFrom_%2CTo_%2CLength_KM%2CStatus&returnGeometry=false&returnCentroid=true&outSR=4326&f=json';
    try{
      const [metadata,inventory]=await Promise.all([base+'?f=json',query].map(async url=>{
        const r=await fetch(url,{signal:controller.signal,mode:'cors',cache:'no-store'});
        if(!r.ok)throw Error('NCC HTTP '+r.status);
        return r.json();
      }));
      if(!Number.isFinite(metadata.editingInfo?.dataLastEditDate)||!Array.isArray(inventory.features))throw Error('Unexpected NCC JSON');
      return {reachable:true,corsBrowserVerified:true,recordCount:inventory.features.length,
        dataLastEdit:new Date(metadata.editingInfo.dataLastEditDate).toISOString(),
        archiveNotReusedAsOpening:true};
    }catch(e){return {reachable:false,corsBrowserVerified:false,issue:String(e?.message||e).slice(0,150)};}
    finally{clearTimeout(timeout);}
  });
  report.externalNccBrowserReachability=nccProbe;
  if(nccProbe.reachable)assert.equal(nccProbe.recordCount,14,'Actual NCC feed changed inventory: must reconcile it');
  report.scenarios.push({name:'real-provider-browser-cors-probe',...nccProbe});
  await providerContext.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: Skateway source failure, mobile, reversible section, Google Maps search and no-JS fallback. Current NCC source availability and public deployment are not implied.');
 }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1;});
