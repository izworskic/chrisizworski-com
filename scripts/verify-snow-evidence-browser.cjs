#!/usr/bin/env node
'use strict';
// Test actual page with explicit synthetic reports, not current Michigan snowfall.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const C=require('../public/assets/snow-totals-core.js');
const origin='http://127.0.0.1:4179',url=origin+'/michigan-snow-totals/?window=24h';
const out=path.resolve(__dirname,'../artifacts/snow-evidence');
const old=execFileSync('git',['show','752cb8f48920a85b82403771acfa6019b66e544f:public/assets/michigan-snow-totals.js'],{encoding:'utf8'});
const leaflet=path.dirname(require.resolve('leaflet/dist/leaflet.js'));
fs.mkdirSync(out,{recursive:true});
const now=Date.now();
const row=(place,county,region,inches,lat,lon,age=2)=>({place,county,region,inches,lat,lon,reportedAt:new Date(now-age*3600000).toISOString(),measured:true,sourceLabel:'QA fixture observer',source:'QA fixture observer',remark:'Synthetic acceptance fixture',office:'MQT',productUrl:null});
const rows=[row('Herman','Baraga','keweenaw',6.4,46.7,-88.4),row('Example zero','Houghton','keweenaw',0,47.1,-88.5)];
const historical=row('Historical fixture','Baraga','keweenaw',3,46.7,-88.4,240);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=','base64');
function payload(mode){
 const reports=mode==='quiet'?[]:rows;
 const generatedAt=new Date(now-(mode==='stale'?3:0)*3600000).toISOString();
 return {ok:mode!=='failed',generatedAt,degraded:false,reports:mode==='failed'?[]:reports,windows:Object.fromEntries(C.WINDOWS.map(w=>[w,{placeCount:C.rowsFor(reports,w,now).length}])),alerts:[],offices:[],lastSnow:mode==='quiet'?{latest:historical,reportedAt:historical.reportedAt,sameDay:[historical]}:null};
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const report={fixture:'Synthetic NWS rows; pinned Leaflet; local fixture tiles, no live provider or ads',cases:[]};
 async function pageFor(width,mode='current',baseline=false,js=true){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',javaScriptEnabled:js});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===origin){
    if(u.pathname==='/api/michigan-snow-totals'){
     const data=u.searchParams.has('view')?{ok:true,generatedAt:new Date(now).toISOString(),season:null}:payload(mode);
     return route.fulfill({status:data.ok?200:503,json:data});
    }
    if(baseline&&u.pathname==='/assets/michigan-snow-totals.js')return route.fulfill({contentType:'application/javascript',body:old});
    return route.continue();
   }
   if(u.hostname==='unpkg.com'&&u.pathname.startsWith('/leaflet@1.9.4/dist/')){
    const f=path.resolve(leaflet,u.pathname.slice('/leaflet@1.9.4/dist/'.length));
    if(f.startsWith(leaflet+path.sep)&&fs.existsSync(f))return route.fulfill({path:f,headers:{'access-control-allow-origin':'*','content-type':f.endsWith('.css')?'text/css':f.endsWith('.js')?'application/javascript':'image/png'}});
   }
   if(u.hostname.endsWith('.tile.openstreetmap.org'))return route.fulfill({body:png,contentType:'image/png'});
   return route.abort();
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  return {ctx,page,errors};
 }
 async function screenshot(page,name,locator){await page.locator(locator).screenshot({path:path.join(out,name+'.png'),animations:'disabled'});}
 async function ready(page){await page.locator('#regionChips button[data-region="eastern-up"]').waitFor();}
 async function select(page,region){await page.locator('#regionChips button[data-region="'+region+'"]').click();}
 async function noOverflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
 try{
  // Capture the actual previous renderer's contradictory regional result.
  const base=await pageFor(390,'current',true);
  await ready(base.page);await select(base.page,'eastern-up');
  assert.match(await base.page.locator('#snowSummary').innerText(),/anywhere in Michigan/);
  assert.match(await base.page.locator('#regionChips button[data-region="eastern-up"]').innerText(),/\b0$/);
  await screenshot(base.page,'before-390-regional-empty','.snow-answer');await base.ctx.close();
  for(const width of [360,390,768,1280,1440]){
   const {ctx,page,errors}=await pageFor(width);await ready(page);
   assert.match(await page.locator('#snowSummary').innerText(),/6\.4 in\./);
   await select(page,'eastern-up');
   const summary=page.locator('#snowSummary');
   assert.match(await summary.innerText(),/Eastern U\.P\./);assert.match(await summary.innerText(),/Actual snowfall is unknown/);
   assert.doesNotMatch(await summary.innerText(),/anywhere in Michigan|Herman/);
   assert.match(await page.locator('#regionChips button[data-region="eastern-up"]').innerText(),/No reports/);
   assert.match(await page.locator('#mapNote').innerText(),/Actual snowfall is unknown/);
   await noOverflow(page);
   if(width===390||width===1280)await screenshot(page,'after-'+width+'-regional-empty','.snow-answer');
   await select(page,'keweenaw');
   assert.match(await summary.innerText(),/6\.4 in\./);
   await page.locator('.report-table-disclosure summary').click();
   assert.match(await page.locator('#snowTable tbody').innerText(),/0 in\./);
   await select(page,'');
   assert.match(await summary.innerText(),/Michigan/);
   assert.equal(await page.locator('#regionChips button[data-region=""]').getAttribute('aria-pressed'),'true');
   await noOverflow(page);
   assert.deepEqual(errors,[]);
   report.cases.push({width,state:'current-empty-recovery',result:'PASS'});await ctx.close();
  }
  for(const mode of ['quiet','stale','failed']){
   const {ctx,page,errors}=await pageFor(390,mode);
   const summary=page.locator('#snowSummary');
   if(mode==='quiet'){
    await ready(page);assert.match(await summary.innerText(),/Most recent archived report/);
    assert.match(await page.locator('#mapNote').innerText(),/Historical map/);
    await select(page,'eastern-up');
    assert.match(await summary.innerText(),/Actual snowfall is unknown/);
    assert.doesNotMatch(await summary.innerText(),/Historical fixture/);
    assert.doesNotMatch(await page.locator('#mapNote').innerText(),/Historical map/);
   }else{
    await page.waitForFunction(m=>document.querySelector('#snowSummary').textContent.includes(m),mode==='stale'?'rankings are paused':'did not respond');
    const first=await summary.innerText();
    if(mode==='failed')await page.locator('.windows button[data-window="168h"]').click();
    assert.equal(await summary.innerText(),first);
    await page.locator('#townSearch').fill('Marquette');
    await page.getByRole('button',{name:'Find',exact:true}).click();
    await page.locator('#townResult').getByText(/Current snow reports are not available/).waitFor();
    assert.equal(await page.locator('#shareBtn').isVisible(),false);
   }
   assert.deepEqual(errors,[]);await noOverflow(page);await screenshot(page,'after-390-'+mode,'.snow-answer');
   report.cases.push({width:390,state:mode,result:'PASS'});await ctx.close();
  }
  const no=await pageFor(390,'current',false,false);
  assert.ok(await no.page.locator('#snowSummary a[href*="mesonet"]').isVisible());await noOverflow(no.page);await no.ctx.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('Snow evidence-state browser acceptance passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
