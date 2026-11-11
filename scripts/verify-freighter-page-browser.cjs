// Local acceptance: controlled AIS fixtures; not evidence of live traffic or growth.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createPageHandler } = require('../lib/freighter-page');
const root=path.resolve('public'), out=path.resolve('docs/shipping-acquisition-2026-11-09');
let outage=false;
const feed=()=>({ok:true,checkedAt:new Date().toISOString(),attribution:[{credit:'Controlled browser fixture, not live AIS'}],vessels:[
 {mmsi:'366904950',name:'LEE A. TREGURTHA',lat:46.5036,lon:-84.36,seen:new Date(Date.now()-60000).toISOString(),speedKnots:12,course:90,shipType:70,source:'fixture',destination:'DULUTH',lengthMeters:250},
 {mmsi:'367000002',name:'SAGINAW TEST VESSEL',lat:43.657,lon:-83.874,seen:new Date().toISOString(),speedKnots:null,course:null,shipType:null,source:'fixture',destination:null,lengthMeters:null}
]});
const handler=createPageHandler(()=>fs.readFileSync(path.join(root,'great-lakes-freighter-tracking/index.html'),'utf8'),async()=>{if(outage)throw Error('fixture outage');return feed();});
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://local').pathname;
 if(pathname==='/great-lakes-freighter-tracking/'){
  res.status=n=>{res.statusCode=n;return res;};res.send=b=>res.end(b);return handler(req,res);
 }
 let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 fs.mkdirSync(out,{recursive:true});const results=[];
 try{
  for(const width of [360,390,1440])for(const javaScriptEnabled of [false,true]){
   outage=false;
   const context=await browser.newContext({viewport:{width,height:1000},javaScriptEnabled,reducedMotion:'reduce'});
   await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});
    if(u.hostname==='unpkg.com'&&u.pathname.endsWith('/leaflet.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync('public/vendor/leaflet/leaflet.js')});
    if(u.hostname==='unpkg.com'&&u.pathname.endsWith('/leaflet.css'))return process.env.QA_LEAFLET_CSS ? route.fulfill({contentType:'text/css',body:fs.readFileSync(process.env.QA_LEAFLET_CSS)}) : route.continue();
    return u.origin===base?route.continue():route.abort();
   });
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(base+'/great-lakes-freighter-tracking/',{waitUntil:'networkidle'});
   assert.ok((await response.text()).includes('<strong>LEE A. TREGURTHA</strong>'));
   const list=page.locator('#freighterVessels');
   assert.equal(await list.locator('li').count(),2);
   if(javaScriptEnabled){
    assert.match(await page.locator('#mapStatusText').innerText(),/Refresh unavailable; retained 2/);
    assert.equal(await page.locator('.tracker-ship-marker').count(),2);
    await page.locator('#freighterNameSearch').fill('tregurtha');
    assert.equal(await list.locator('li').count(),1);
    await list.getByRole('button',{name:'LEE A. TREGURTHA'}).click();
    assert.match(await page.locator('#ship-inspector-facts').innerText(),/DULUTH/);
    await page.locator('#freighterClearSearch').click();
    await page.locator('.view-tab[data-freighter-view="saginaw"]').click();
    assert.match(await list.innerText(),/SAGINAW TEST VESSEL/);assert.ok(!(await list.innerText()).includes('TREGURTHA'));
    await page.locator('.view-tab[data-freighter-view="overview"]').click();
    assert.equal(await list.locator('li').count(),2);
   }else{
    assert.match(await list.innerText(),/AIS destination: DULUTH/);
    assert.equal(await list.locator('time').count(),2);
    assert.match(await page.locator('.vessel-results noscript').innerText(),/timestamped snapshot/);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page width');
   if(width===390)await page.locator('.vessel-results').screenshot({path:path.join(out,javaScriptEnabled?'reports-hydrated-mobile.png':'reports-nojs-mobile.png')});
   if(javaScriptEnabled){
    await page.clock.install();await page.clock.setSystemTime(new Date(Date.now()+31*60000));
    await page.locator('#mapRefresh').click();
    await page.waitForFunction(()=>document.querySelector('#freighterVessels').textContent.includes('No recent reports'));
    assert.equal(await page.locator('.tracker-ship-marker').count(),0);
    assert.ok(!(await list.innerText()).includes('TREGURTHA'));
   }
   assert.deepEqual(errors,[]);results.push({width,javaScriptEnabled,initialHTML:'two dated fixture reports',refreshOutage:'passed',expiry:javaScriptEnabled?'passed':'absolute report times shown',overflow:'passed'});
   await context.close();
  }
  outage=true;const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const res=await page.goto(base+'/great-lakes-freighter-tracking/');
  assert.equal(res.status(),200);assert.match(await page.locator('#freighterVessels').innerText(),/not a zero-traffic report/);
  assert.equal(await page.getByRole('navigation',{name:'Local ship-watching tools'}).locator('a').count(),3);
  await context.close();results.push({serverFeedOutage:'complete HTML, honest fallback, handoffs preserved'});
  fs.writeFileSync(path.join(out,'browser-acceptance.json'),JSON.stringify({checkedAt:new Date().toISOString(),scope:'Local deterministic AIS fixtures. Map library loaded; external tiles blocked. No live AIS, ranking, revenue or production claim.',results},null,2)+'\n');
  console.log('Passed six rendered/hydrated phone/desktop scenarios, expiry and server outage.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
