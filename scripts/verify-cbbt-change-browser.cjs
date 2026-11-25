'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.CBBT_PW_MODULE||'playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve('artifacts/cbbt-change-qa');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep))throw Error('path');
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,1366]){
   const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
   let mode='open',last=0;
   await context.route('**/api/cbbt?*',route=>{
    if(mode==='outage')return route.fulfill({status:503,body:'unavailable'});
    const now=Math.max(Date.now(),last+1);last=now;
    const [state,restrictionLevel]=mode==='restricted'?['OPEN_WITH_RESTRICTIONS','LEVEL_1']:mode==='closed'?['CLOSED','LEVEL_3']:mode==='conflict'?['OFFICIAL_STATUS_CONFLICT','UNKNOWN']:['OPEN','NONE'];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({engine:{generatedAt:new Date(now).toISOString()},officialStatus:{state,restrictionLevel},freshness:{officialStatus:{state:'fresh',ageMs:0,ageMinutes:0}},vehicleEligibility:{decision:'UNKNOWN',reason:'OFFICIAL_STATUS_UNRESOLVED'},activeIncidents:[],plannedAdvisories:[],alerts:[],provenance:[]})});
   });
   await context.route('https://**/*',route=>route.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/chesapeake-bay-bridge-tunnel/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#statusWord')?.textContent==='OPEN');
   assert.equal(await page.locator('#statusChange').isVisible(),false);
   async function refresh(next,word,pattern){
    mode=next;const response=page.waitForResponse(r=>r.url().includes('/api/cbbt?'));
    await page.locator('#refreshButton').click();await response;
    await page.waitForFunction(({word,pattern})=>document.querySelector('#statusWord')?.textContent===word&&new RegExp(pattern,'i').test(document.querySelector('#statusChangeText')?.textContent),{word,pattern});
   }
   await refresh('restricted','OPEN','open with Level 1');
   assert.match(await page.locator('#statusChangeTime').innerText(),/exact change time unknown/);
   const first=await page.locator('#statusChangeTime').innerText();
   await refresh('restricted','OPEN','open with Level 1');
   assert.equal(await page.locator('#statusChangeTime').innerText(),first);
   await refresh('closed','CLOSED','reports closed');
   await refresh('outage','UNKNOWN','not a report of a closure');
   await refresh('open','OPEN','available again');
   assert.match(await page.locator('#statusChangeText').innerText(),/What happened during the gap is not known/);
   await refresh('conflict','VERIFY','sources now disagree');
   await refresh('open','OPEN','available again');
   assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(out,'recovery-'+width+'.png'),fullPage:true});
   await context.close();
  }
  console.log('CBBT change browser replay passed at 390 and 1366 pixels');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
