#!/usr/bin/env node
'use strict';
// Real page, real Chromium, synthetic source packets only. No ads/telemetry.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/aurora-recovery');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 const name=u.pathname==='/northern-lights-michigan/'?'/northern-lights-michigan/index.html':u.pathname;
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 const data=await fs.promises.readFile(file).catch(()=>null);
 if(!data){res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
});
function fixture(mode){
 const now=Date.now(),iso=n=>new Date(now+n*3600000).toISOString();
 const date=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));
 const kp=mode==='zero'?0:6;
 const partial=mode==='partial';
 const regions=[['keweenaw','Keweenaw Peninsula',47.47,-87.89,4],['mackinaw-city','Mackinaw City',45.78,-84.73,5],['bay-city','Bay City',43.59,-83.89,7]];
 return {fetched_at:iso(mode==='expired'?-2:0),source_freshness:{ovation_fresh:true,kp_observed_fresh:true,solar_wind_fresh:true},
  forecast:{peak_24h:partial?null:kp,peak_72h:partial?null:kp,peak_24h_at:iso(1),current:{kp:4},periods:partial?[]:Array.from({length:24},(_,i)=>({time_tag:iso(i*3-1),kp}))},
  solar_wind:{bz_gsm_nt:-6,speed_km_s:450},moon:{phase:'Waxing Crescent',illumination_percent:15,date:date.year+'-'+date.month+'-'+date.day},
  ovation:{forecast_time:iso(.5),regions:regions.map(([id,label,latitude,longitude,planning_kp])=>({id,label,latitude,longitude,planning_kp,level:'possible',status_label:'Independent short-term model',detail:'Synthetic browser fixture',ovation_value:12,sky_cover:{periods:[{start_time:iso(-2),end_time:iso(24),percent:20}]}}))}
 };
}
async function main(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;const report=[];
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true});
  for(const width of [390,1280]){
   const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage();let mode='fresh',calls=0;const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await ctx.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.origin===origin&&u.pathname==='/api/aurora'){
     calls++;
     return route.fulfill({status:mode==='outage'?503:200,contentType:'application/json',body:JSON.stringify(mode==='outage'?{error:'fixture outage'}:fixture(mode))});
    }
    if(u.origin===origin)return route.continue();
    return route.abort();
   });
   const text=async(id)=>page.locator(id).textContent();
   const wait=async(id,value)=>page.waitForFunction(({id,value})=>document.querySelector(id)?.textContent?.includes(value),{id,value},{timeout:15000});
   const shot=async(state)=>{await page.locator('#aurora-decision').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,width+'-'+state+'.png'),animations:'disabled'});};
   const change=async(next,id,value)=>{mode=next;const prior=calls;await page.locator('#refreshBtn').click();await wait(id,value);assert.ok(calls>prior,'refresh contacted source');};
   await page.goto(origin+'/northern-lights-michigan/',{waitUntil:'domcontentloaded'});
   await wait('#gaugeNum','6.0');
   assert.ok(await page.locator('.forecast-bar').count()>0);
   await shot('fresh');
   await change('partial','#liveStatus','Kp forecast unavailable');
   assert.equal(await text('#gaugeNum'),'--');
   assert.equal(await page.locator('.forecast-bar').count(),0);
   assert.equal(await page.locator('.kp-step.current').count(),0);
   assert.equal(await page.locator('#smartCta.show').count(),0);
   assert.equal(await page.locator('#tonightsVerdict').getAttribute('data-verdict'),'unavailable');
   assert.match(await text('#swKpNow .sw-val'),/4\.0/);
   assert.match(await text('#swBz .sw-val'),/-6\.0/);
   assert.match(await text('#moonPhaseValue'),/Waxing Crescent/);
   assert.match(await text('#selectedCloud'),/20%/);
   assert.match(await text('#tonightWindow'),/Kp forecast is unavailable/);
   await page.locator('#regionSelect').selectOption('bay-city');
   assert.match(await text('#localRegion'),/Bay City/);
   assert.match(await text('#selectedCloud'),/20%/);
   await shot('partial');
   await change('outage','#liveStatus','manual guide active');
   assert.equal(await text('#gaugeNum'),'--');
   assert.equal(await page.locator('.forecast-bar').count(),0);
   assert.match(await text('#moonPhaseValue'),/unavailable/i);
   assert.equal(await text('#swKpNow .sw-val'),'--');
   assert.equal(await page.locator('#viewing-locations').count(),1);
   await shot('outage');
   await change('zero','#gaugeNum','0.0');
   assert.ok(await page.locator('.forecast-bar').count()>0);
   assert.match(await text('#liveStatus'),/Low Kp outlook/);
   assert.equal(await page.locator('#regionSelect').inputValue(),'bay-city');
   await shot('recovered-zero');
   await change('expired','#liveStatus','manual guide active');
   assert.equal(await text('#gaugeNum'),'--');
   assert.equal(await page.locator('.forecast-bar').count(),0);
   await change('fresh','#gaugeNum','6.0');
   assert.equal(await page.locator('#regionSelect').inputValue(),'bay-city');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'horizontal overflow');
   assert.deepEqual(errors,[],'browser JavaScript errors');
   report.push({width,states:['fresh','partial','outage','recovered-zero','expired','recovered'],requests:calls});
   await ctx.close();
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({fixture:'Synthetic, independent source responses; no live NOAA claims',report},null,2));
 }finally{await browser?.close();await new Promise(ok=>server.close(ok));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
