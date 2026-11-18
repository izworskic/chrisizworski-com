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
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: Skateway source failure, mobile, reversible section, Google Maps search and no-JS fallback. Current NCC source availability and public deployment are not implied.');
 }finally{await browser.close();server.close();}
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1;});
