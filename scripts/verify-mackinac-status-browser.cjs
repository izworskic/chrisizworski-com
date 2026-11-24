'use strict';
// Deterministic browser regression: fixtures are not actual bridge conditions.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.BRIDGE_PW_MODULE||'playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve('artifacts/mackinac-status-qa');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1'),file=path.resolve(root,'.'+(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const bytes=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
function fixture(mode){
 const now=Date.now(),closed=mode==='closed';
 return {fetched_at:new Date(now-(mode==='stale'?301000:0)).toISOString(),
 official:{available:true,level:closed?'closed':'open',title:closed?'Fixture: closed':'Fixture: open',message:'TEST FIXTURE ONLY',updated_text:'Fixture check',traffic_notes:[],wind_related:false},
 current_wind:null,forecast:{hours:[]},approach_traffic:{available:false,complete:false,events:[]}};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [360,390,768,1280,1440]){
   const context=await browser.newContext({viewport:{width,height:900},timezoneId:'America/Detroit',reducedMotion:'reduce',serviceWorkers:'block'});
   let mode='open',requests=0;
   await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.origin!==base)return route.abort();
    if(u.pathname==='/api/mackinac'){
     requests++;
     if(mode==='offline')return route.abort('failed');
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(mode))});
    }
    if(u.pathname==='/api/mackinac-media')return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><text x="10" y="40">Camera test fixture</text></svg>'});
    return route.continue();
   });
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/mackinac-bridge-live/',{waitUntil:'domcontentloaded'});
   const expectLevel=async(level,confidence)=>{
    await page.waitForFunction(({level,confidence})=>document.querySelector('#statusCard')?.dataset.level===level&&document.querySelector('#personalAnswer')?.dataset.level===level&&document.querySelector('#confidenceScore')?.textContent===confidence,{level,confidence});
    assert.equal(await page.locator('#confidenceRing').getAttribute('data-level'),level);
    assert.equal(await page.locator('#refreshButton').isEnabled(),true);
   };
   const refresh=async(next,level,confidence)=>{
    mode=next;const before=requests;
    await page.locator('#refreshButton').click();
    await page.waitForFunction(()=>!document.querySelector('#refreshButton').disabled);
    assert.ok(requests>before);
    await expectLevel(level,confidence);
   };
   await expectLevel('open','CLEAR');
   await page.locator('[data-vehicle="rv"]').click();
   assert.equal(await page.locator('[data-vehicle="rv"]').getAttribute('aria-pressed'),'true');
   await refresh('offline','unknown','VERIFY');
   assert.match(await page.locator('#officialMessage').innerText(),/previous crossing verdict is no longer current/i);
   assert.match(await page.locator('#answerHeadline').innerText(),/check the official report/i);
   assert.match(await page.locator('#ribbonStatus').innerText(),/unavailable/i);
   assert.equal(await page.locator('#statusHistory li').count(),1);
   await page.locator('#statusCard').screenshot({path:path.join(out,'bridge-'+width+'-offline.png'),animations:'disabled'});
   await refresh('open','open','CLEAR');
   assert.equal(await page.locator('[data-vehicle="rv"]').getAttribute('aria-pressed'),'true');
   await refresh('stale','unknown','VERIFY');
   assert.match(await page.locator('#officialMessage').innerText(),/too old/i);
   assert.equal(await page.locator('#statusHistory li').count(),1);
   await refresh('closed','closed','CLOSED');
   assert.equal(await page.locator('#statusHistory li').count(),2);
   await refresh('open','open','CLEAR');
   assert.equal(await page.locator('#statusHistory li').count(),3);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=3,'horizontal overflow at '+width);
   assert.deepEqual(errors,[],'uncaught script errors');
   await page.locator('#statusCard').screenshot({path:path.join(out,'bridge-'+width+'-recovered.png'),animations:'disabled'});
   console.log('MACKINAC_STATUS_BROWSER_PASS',width,'open/offline/open/stale/closed/open; vehicle retained; history accurate; fixture only');
   await page.goto(base+'/mackinac-bridge-tolls/',{waitUntil:'domcontentloaded'});
   const price=async(cash,round,card,cardRound,eligible)=>{
    for(const [id,value] of Object.entries({guideTollTotal:cash,guideRoundTripTotal:round,guideCardOne:card,guideCardReturn:cardRound})){
     assert.equal(await page.locator('#'+id).innerText(),value,id+' at '+width);
    }
    assert.match(await page.locator('#guideMacPassExample').innerText(),eligible?/qualify: \$4\.00/:/does not qualify/);
   };
   await price('$4.00','$8.00','$4.09','$8.18',true);
   await page.locator('#guideTowedAxles').fill('2');
   await price('$8.00','$16.00','$8.18','$16.36',false);
   await page.locator('#guideTollClass').selectOption('other');
   await price('$20.00','$40.00','$20.46','$40.92',false);
   await page.locator('#guideMotorhomeAuto').check();
   await price('$14.00','$28.00','$14.32','$28.64',false);
   await page.locator('#guideTowedAxles').fill('0');
   await price('$10.00','$20.00','$10.23','$20.46',false);
   assert.equal(await page.locator('#guideMotorhomeAuto').isChecked(),false);
   assert.equal(await page.locator('#guideMotorhomeAuto').isEnabled(),false);
   await page.locator('#guideTollClass').selectOption('passenger');
   await price('$4.00','$8.00','$4.09','$8.18',true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)<=3,'toll horizontal overflow at '+width);
   assert.deepEqual(errors,[],'uncaught script errors');
   await page.locator('#calculator').screenshot({path:path.join(out,'toll-'+width+'.png'),animations:'disabled'});
   console.log('MACKINAC_TOLL_BROWSER_PASS',width,'cash/card/conditional MacPass; towing exception and reset');
   await context.close();
  }
 }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
