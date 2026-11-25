'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve('public'),out='artifacts/welland-viewing';
fs.mkdirSync(out,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html')}catch{}
 fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');res.end(b)});
});
const T=Date.parse('2026-11-25T15:00:00Z'),iso=t=>new Date(t).toISOString();
const lock3={lat:43.155230,lon:-79.193058},lock7={lat:43.123446,lon:-79.193895},lock8={lat:42.899122,lon:-79.246166};
const overlap={lat:(lock3.lat+lock7.lat)/2,lon:(lock3.lon+lock7.lon)/2};
const ship=(id,point,now,age=2*60000,type=70)=>({mmsi:String(366000000+id),name:'FIXTURE '+id,...point,seen:iso(now-age),shipType:type,speedKnots:3,course:180,destination:null,source:'QA fixture'});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
 for(const width of [360,390,768,1280,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  let mode='single',now=T;
  await page.clock.install({time:new Date(T)});
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='unpkg.com'&&u.pathname.endsWith('/leaflet.js'))return route.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync('public/vendor/leaflet/leaflet.js')});
   if(u.hostname==='unpkg.com'&&u.pathname.endsWith('/leaflet.css'))return route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('public/vendor/leaflet/leaflet.css')});
   if(u.pathname==='/api/welland-canal'){
    if(mode==='failed')return route.fulfill({status:503,contentType:'application/json',body:'{}'});
    let vessels=mode==='single'?[ship(1,lock7,now)]:mode==='multiple'?[ship(1,lock3,now),ship(2,lock8,now,120000,80)]:mode==='overlap'?[ship(3,overlap,now)]:mode==='expiry'?[ship(4,lock7,now,14*60000+59000)]:mode==='other'?[ship(5,lock7,now,120000,37)]:[];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,checkedAt:iso(now),vessels,attribution:[{credit:'QA fixture only'}]})});
   }
   if(u.hostname==='127.0.0.1')return route.continue();
   return route.abort();
  });
  const answer=page.locator('#shoreComparisonAnswer'),choice=page.locator('#shoreComparisonChoose');
  const expect=async(re)=>{await page.waitForFunction(({source,flags})=>new RegExp(source,flags).test(document.getElementById('shoreComparisonAnswer').textContent),{source:re.source,flags:re.flags});};
  const refresh=async(next)=>{mode=next;now=await page.evaluate(()=>Date.now());await page.locator('#refreshShips').click();await page.waitForFunction(()=>!document.getElementById('refreshShips').disabled);};
  await page.goto(base+'/welland-canal/',{waitUntil:'domcontentloaded'});
  await expect(/Lock 7 is the only/);
  assert.equal(await choice.innerText(),'Compare Lock 7');
  await page.locator('#shoreComparison').screenshot({path:out+'/single-'+width+'.png'});
  await choice.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-spot="7"]').getAttribute('aria-pressed'),'true');
  assert.equal(await choice.isHidden(),true);
  await page.locator('[data-spot="3"]').click();
  assert.equal(await choice.innerText(),'Compare Lock 7');
  await refresh('multiple');await expect(/Lock 3, Lock 8/);
  assert.match(await answer.innerText(),/No basis to favor/);assert.equal(await choice.isHidden(),true);
  await refresh('overlap');await expect(/shared between overlapping/);
  assert.match(await answer.innerText(),/Lock 3, Lock 7/);
  await page.locator('#shoreComparison').screenshot({path:out+'/overlap-'+width+'.png'});
  await refresh('other');await expect(/No qualifying cargo or tanker reports/);
  assert.match(await answer.innerText(),/does not mean the canal is empty/);
  await refresh('failed');await expect(/fresh comparison is unavailable/);assert.equal(await choice.isHidden(),true);
  await refresh('expiry');await expect(/Lock 7 is the only/);
  await page.clock.fastForward(16000);await expect(/No qualifying cargo or tanker reports/);
  assert.equal(await choice.isHidden(),true);
  await refresh('single');await expect(/Lock 7 is the only/);
  assert.equal(await page.locator('[data-spot="3"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);
  assert.deepEqual(errors,[],'page errors '+width);
  await context.close();
 }
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),page=await context.newPage();
 await page.goto(base+'/welland-canal/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#shoreComparison').isHidden(),true);
 for(const id of ['3','7','8']){const link=page.locator('[data-shore-spot-google="'+id+'"]');assert.equal(await link.isVisible(),true);assert.match(await link.getAttribute('href'),/google\.com\/maps\/search/);}
 await context.close();
 console.log('Welland viewing comparison fixture browser acceptance complete. External tiles, live AIS and public deployment not tested.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
