#!/usr/bin/env node
'use strict';

// Deterministic browser acceptance of the actual Manistee field map.
// This test runs against checked-in HTML, Leaflet, and source-owned APIs.
// It does not claim live access, flow direction, or navigable float mileage.

const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const hydro=require('../api/manistee-river-hydrography.js');
const floatApi=require('../api/manistee-float-v1.js');
const field=require('../public/assets/manistee-river-data.js');

const webRoot=path.resolve(__dirname,'../public');
const artifactRoot=path.resolve(__dirname,'../artifacts/manistee-float');
const leafJs=require.resolve('leaflet/dist/leaflet.js');
const leafCss=require.resolve('leaflet/dist/leaflet.css');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
fs.mkdirSync(artifactRoot,{recursive:true});

const start=field.places.find(p=>p.id==='pine-elm-flats');
const end=field.places.find(p=>p.id==='pine-peterson');
if(!start||!end)throw Error('Canonical Pine River access IDs missing');

const line=Array.from({length:33},(_,i)=>{
  const t=i/32;
  return [start.lon+(end.lon-start.lon)*t,start.lat+(end.lat-start.lat)*t];
});
const source={
  type:'FeatureCollection',complete:true,sourceCompleteness:'complete-retrieved-set',
  fetched_at:'2026-11-17T00:00:00.000Z',
  features:[{type:'Feature',properties:{name:'Pine River'},geometry:{type:'LineString',coordinates:line}}]
};
let offline=false;
const originalFetch=hydro.fetchHydrography;
hydro.fetchHydrography=async()=>{if(offline)throw Error('Simulated official-source outage');return source;};

function check(value,message){if(!value)throw Error(message);}
function respondJson(res,code,payload){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','X-Robots-Tag':'noindex, nofollow'});res.end(JSON.stringify(payload));}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/api/manistee-river-hydrography'){
      return offline?respondJson(res,502,{error:'source unavailable'}):respondJson(res,200,source);
    }
    if(url.pathname==='/api/manistee-float-v1'){
      req.query=Object.fromEntries(url.searchParams);
      res.status=function(status){this.statusCode=status;return this;};
      res.json=function(body){this.setHeader('Content-Type','application/json; charset=utf-8');this.end(JSON.stringify(body));return this;};
      await floatApi(req,res);
      return;
    }
    if(url.pathname.startsWith('/api/'))return respondJson(res,503,{error:'simulated optional source outage'});
    const pathname=url.pathname==='/manistee-river-map/'?'/manistee-river-map/index.html':url.pathname;
    const filepath=path.resolve(webRoot,'.'+pathname);
    if(!filepath.startsWith(webRoot+path.sep)){res.writeHead(403);res.end();return;}
    const stat=await fs.promises.stat(filepath).catch(()=>null);
    if(!stat?.isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(filepath).toLowerCase()]||'application/octet-stream'});
    res.end(await fs.promises.readFile(filepath));
  }catch(error){
    if(!res.headersSent)res.writeHead(500);
    if(!res.writableEnded)res.end('Fixture server failed');
  }
});

async function fixtureRoutes(page,port){
  await page.route('**/*',async route=>{
    const request=route.request().url();
    if(request.startsWith('http://127.0.0.1:'+port+'/'))return route.continue();
    if(request==='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
      return route.fulfill({path:leafJs,contentType:'application/javascript'});
    if(request==='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css')
      return route.fulfill({path:leafCss,contentType:'text/css'});
    return route.abort();
  });
}

async function verifyApi(origin,report){
  let response=await fetch(origin+'/api/manistee-float-v1?mode=access');
  check(response.status===200,'Access API HTTP 200');
  check((response.headers.get('x-robots-tag')||'').includes('noindex'),'Access API noindex');
  const catalog=await response.json();
  check(catalog.contract==='manistee-float/v1','Access contract version');
  check(catalog.access.length>=37,'Complete source-owned access inventory');
  check(catalog.access.every(p=>p.currentAccessVerified===false),'No invented current-access approval');
  report.cases.push('HTTP access catalog, provenance and noindex');

  response=await fetch(origin+'/api/manistee-float-v1?mode=route&from=pine-elm-flats&to=pine-peterson&geometry=1');
  check(response.status===200,'Source-backed route HTTP 200');
  const route=await response.json();
  check(route.route.miles>0,'NHD graph mileage');
  check(route.route.geometry?.type==='LineString','GeoJSON geometry present');
  check(route.directionVerified===false&&route.navigabilityVerified===false,'No downstream/navigability certification');
  report.cases.push('HTTP source-backed route and source uncertainty');

  response=await fetch(origin+'/api/manistee-float-v1?mode=route&from=ccc&to=pine-peterson');
  check(response.status===422,'Cross-waterway route refused');
  check((await response.json()).error==='DIFFERENT_WATERWAYS','Cross-waterway error is explicit');
  report.cases.push('HTTP cross-waterway refusal');
}

async function verifyFieldMap(browser,origin,port,viewport,report){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await fixtureRoutes(page,port);
    const response=await page.goto(origin+'/manistee-river-map/',{waitUntil:'domcontentloaded',timeout:35000});
    check(response.status()===200,viewport.name+' HTML 200');
    await page.waitForFunction(()=>document.querySelector('#planner-status')?.textContent==='River-network routing ready.',null,{timeout:18000});
    check(await page.locator('#plan-from option').count()>=38,viewport.name+' full landing selector');
    await page.locator('.tab-button[data-tab="plan"]').click();
    await page.locator('#plan-from').selectOption('pine-elm-flats');
    await page.locator('#plan-to').selectOption('pine-peterson');
    await page.locator('#plan-result .plan-number').waitFor({state:'visible',timeout:5000});
    const miles=await page.locator('#plan-result .plan-number').innerText();
    check(/^[0-9]+(?:\.[0-9]+)? mi$/.test(miles),viewport.name+' NHD route distance displayed: '+miles);
    check((await page.locator('#plan-result').innerText()).includes('NHD river-network distance'),viewport.name+' source explanation visible');
    const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    check(overflow.width<=overflow.viewport+3,viewport.name+' horizontal overflow '+JSON.stringify(overflow));
    const screenshot=path.join(artifactRoot,viewport.name+'-route.png');
    await page.screenshot({path:screenshot,fullPage:true});
    report.screens.push(path.basename(screenshot));

    await page.locator('#plan-from').selectOption('ccc');
    await page.waitForFunction(()=>document.querySelector('#plan-result')?.textContent.includes('Planner refuses cross-waterway routing'),null,{timeout:5000});
    check(await page.locator('#plan-result .plan-number').count()===0,viewport.name+' must not show mileage for mixed rivers');
    check(errors.length===0,viewport.name+' uncaught JavaScript errors: '+errors.join(' | '));
    report.cases.push(viewport.name+' complete field-map planner, route, cross-waterway refusal and overflow');
  }finally{await context.close();}
}

async function verifyOutage(browser,origin,port,report){
  offline=true;
  let response=await fetch(origin+'/api/manistee-float-v1?mode=route&from=pine-elm-flats&to=pine-peterson');
  check(response.status===503,'Outage HTTP 503');
  const output=await response.json();
  check(output.status==='unavailable'&&!('miles' in output),'Outage never invents distance');
  report.cases.push('HTTP hydrography outage with no mileage');

  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  try{
    await fixtureRoutes(page,port);
    const r=await page.goto(origin+'/manistee-river-map/',{waitUntil:'domcontentloaded'});
    check(r.status()===200,'Field map remains online during NHD outage');
    await page.waitForFunction(()=>document.querySelector('#planner-status')?.textContent.includes('unavailable'),null,{timeout:18000});
    await page.locator('.tab-button[data-tab="plan"]').click();
    await page.locator('#plan-from').selectOption('pine-elm-flats');
    await page.locator('#plan-to').selectOption('pine-peterson');
    check(await page.locator('#plan-result .plan-number').count()===0,'No invented browser route mileage during outage');
    check((await page.locator('#plan-result').innerText()).includes('No trustworthy NHD route'),'Explicit field-map outage');
    const screenshot=path.join(artifactRoot,'phone-source-unavailable.png');
    await page.screenshot({path:screenshot,fullPage:true});
    report.screens.push(path.basename(screenshot));
    report.cases.push('Phone map still usable and correctly withholds mileage on source outage');
  }finally{await context.close();}
}

async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  const origin='http://127.0.0.1:'+port;
  let browser;
  const report={checkedAt:new Date().toISOString(),source:'checked-in Manistee field map and stubbed official-geometry fixtures',cases:[],screens:[],status:'failed'};
  try{
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    await verifyApi(origin,report);
    await verifyFieldMap(browser,origin,port,{name:'desktop',width:1366,height:900},report);
    await verifyFieldMap(browser,origin,port,{name:'phone',width:390,height:844},report);
    await verifyOutage(browser,origin,port,report);
    report.status='passed';
    process.stdout.write('Manistee browser acceptance PASS: '+report.cases.length+' scenarios\n');
  }catch(error){
    report.error=String(error.stack||error);
    process.stderr.write('Manistee browser acceptance FAIL: '+String(error.message||error)+'\n');
    process.exitCode=1;
  }finally{
    fs.writeFileSync(path.join(artifactRoot,'acceptance.json'),JSON.stringify(report,null,2)+'\n');
    if(browser)await browser.close();
    hydro.fetchHydrography=originalFetch;
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{process.stderr.write(String(error)+'\n');process.exitCode=1;});
