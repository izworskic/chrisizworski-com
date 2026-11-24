#!/usr/bin/env node
'use strict';
// Actual checked-in Duluth page and Leaflet. AIS and third-party video/ads
// are isolated fixtures, never a statement about live harbor traffic.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/duluth-pilot');
const leaflet=path.dirname(require.resolve('leaflet/dist/leaflet.js'));
fs.mkdirSync(out,{recursive:true});
let mode='reports';
function fixture(){
 const now=Date.now(),seen=new Date(now-120000).toISOString();
 const ship=(n,shipType,speedKnots,lat,lon,lengthMeters)=>({mmsi:String(366000000+n),name:'QA FIXTURE '+n,shipType,speedKnots,lat,lon,lengthMeters,seen,destination:'DULUTH'});
 const pick={...ship(1,70,10,46.79,-92.035,300),direction:'arrival',evidenceType:'lake-approach',confidence:.85,distanceNm:3,ageMinutes:2,sizeLabel:'cargo vessel',window:{start:new Date(now+900000).toISOString(),midpoint:new Date(now+1200000).toISOString(),end:new Date(now+1500000).toISOString()}};
 return {ok:true,checkedAt:new Date(now).toISOString(),attribution:[{credit:'QA fixture, not live AIS'}],mapVessels:mode==='empty'?[]:[pick,ship(2,52,5,46.80,-92.065,25),ship(3,null,null,46.77,-92.05,200),ship(4,37,0,46.76,-92.075,12)],candidates:mode==='empty'?[]:[pick],watchPick:mode==='empty'?null:pick};
}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/api/duluth-canal'){
   res.writeHead(mode==='failed'?503:200,{'Content-Type':'application/json'});
   return res.end(JSON.stringify(mode==='failed'?{ok:false}:fixture()));
  }
  if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/_vercel/')){res.writeHead(404);return res.end();}
  const name=u.pathname==='/duluth-canal-park/'?'/duluth-canal-park/index.html':u.pathname;
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const data=await fs.promises.readFile(file).catch(()=>null);
  if(!data){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(500);res.end();}
});
const tile=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=','base64');
async function main(){
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+server.address().port,url=origin+'/duluth-canal-park/';
 let browser;const report={fixture:'Synthetic AIS, pinned real Leaflet, fixture tiles on all widths except 390 live tile smoke',cases:[]};
 async function context(width,opts={}){
  const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce',javaScriptEnabled:opts.js!==false});
  await ctx.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===origin)return route.continue();
   if(u.hostname==='unpkg.com'&&u.pathname.startsWith('/leaflet@1.9.4/dist/')){
    if(opts.noLeaflet)return route.abort();
    const file=path.resolve(leaflet,u.pathname.slice('/leaflet@1.9.4/dist/'.length));
    if(file.startsWith(leaflet+path.sep)&&fs.existsSync(file))return route.fulfill({path:file,headers:{'access-control-allow-origin':'*','content-type':mime[path.extname(file)]||'application/octet-stream'}});
    return route.abort();
   }
   if(u.hostname==='tile.openstreetmap.org'){
    if(opts.liveTiles)return route.continue();
    return route.fulfill({body:tile,contentType:'image/png'});
   }
   // No ads, analytics, external embeds, cameras or third-party side effects.
   return route.abort();
  });
  return ctx;
 }
 async function overflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'horizontal overflow');}
 async function screenshot(page,name){await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});}
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true});
  for(const width of [360,390,768,1280,1440]){
   mode='reports';
   const ctx=await context(width,{liveTiles:width===390}),page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.locator('.ship-map-marker.is-selected.type-cargo').waitFor();
   assert.equal(await page.locator('.ship-map-marker').count(),4,'candidate deduplicated from local reports');
   assert.equal(await page.locator('.ship-map-marker.type-tug.is-local').count(),1);
   assert.equal(await page.locator('.ship-map-marker.type-unknown.is-motion-unknown').count(),1);
   assert.equal(await page.locator('.ship-map-marker.type-pleasure.is-stopped').count(),1);
   assert.equal(await page.locator('.watch-spot-marker').count(),3);
   await page.locator('.camera-network-marker').first().waitFor();
   await overflow(page);
   await page.locator('#watchPick').getByRole('button',{name:'Locate this ship'}).click();
   await page.locator('.leaflet-popup-content').getByText('AIS type: Freighter / cargo',{exact:true}).waitFor();
   assert.match(await page.locator('.leaflet-popup-content').innerText(),/Arrival planning window/);
   assert.match(await page.locator('.leaflet-popup-content').innerText(),/AIS 2 min old/);
   assert.equal(await page.locator('.leaflet-popup-content').getByRole('button',{name:'Open live camera monitor'}).count(),1);
   await page.locator('#duluthVesselMap').scrollIntoViewIfNeeded();
   await page.waitForTimeout(700);
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('.leaflet-tile-loaded')).some(i=>i.complete&&i.naturalWidth>0),null,{timeout:20000});
   assert.match(await page.locator('.leaflet-control-attribution').innerText(),/OpenStreetMap/);
   if(width===390||width===1280)await screenshot(page,'duluth-'+width+'-selected');
   const close=page.locator('.leaflet-popup-close-button');
   // Assert the real click target is within the map, not clipped by its toolbar.
   await page.waitForFunction(()=>{
    const p=document.querySelector('.leaflet-popup-close-button'),m=document.getElementById('duluthVesselMap');
    if(!p||!m)return false;
    const a=p.getBoundingClientRect(),b=m.getBoundingClientRect(),x=a.x+a.width/2,y=a.y+a.height/2;
    return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom&&p.contains(document.elementFromPoint(x,y));
   },null,{timeout:10000});
   await close.click();
   await page.locator('.leaflet-control-zoom-in').click();
   await page.locator('.leaflet-control-zoom-out').click();
   await page.locator('#resetCanal').click();
   await page.waitForTimeout(600);
   const unknown=page.locator('.ship-map-marker.type-unknown');
   await unknown.focus();
   await unknown.press('Enter');
   await page.locator('.leaflet-popup-content').getByText('AIS type: Type unknown',{exact:true}).waitFor();
   assert.match(await page.locator('.leaflet-popup-content').innerText(),/speed unavailable/);
   if(width===390||width===1280)await screenshot(page,'duluth-'+width+'-unknown');
   assert.deepEqual(errors,[]);
   if(width===390){
    mode='failed';await page.locator('#refreshVessels').click();
    await page.locator('#watchPick .stale-warning').waitFor();
    assert.match(await page.locator('#mapStatus').innerText(),/Last successful AIS picture retained/);
    mode='empty';await page.locator('#refreshVessels').click();
    await page.locator('#watchPick').getByText(/No approaching ship confirmed/).waitFor();
    assert.equal(await page.locator('.ship-map-marker').count(),0);
    assert.equal(await page.locator('.watch-spot-marker').count(),3);
    mode='reports';await page.locator('#refreshVessels').click();
    await page.locator('.ship-map-marker.is-selected').waitFor();
   }
   report.cases.push({width,result:'PASS',tiles:width===390?'live OSM':'fixture',markerCount:4});
   await ctx.close();
  }
  mode='reports';
  const noMap=await context(390,{noLeaflet:true}),p=await noMap.newPage();
  await p.goto(url,{waitUntil:'domcontentloaded'});
  await p.getByText('Map could not load. Live vessel details remain available above.',{exact:true}).waitFor();
  assert.match(await p.locator('#watchPick').innerText(),/QA FIXTURE 1/);
  await noMap.close();
  const noJs=await context(390,{js:false}),q=await noJs.newPage();
  await q.goto(url,{waitUntil:'domcontentloaded'});
  assert.ok(await q.locator('noscript .harbor-noscript').isVisible());
  assert.equal(await q.locator('#published-arrivals a[href="https://harborlookout.com/"]').count(),1);
  await overflow(q);await screenshot(q,'duluth-390-no-js');await noJs.close();
  report.cases.push({case:'map unavailable and JS disabled',result:'PASS'});
 }finally{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();server.close();
 }
 console.log('Duluth browser acceptance passed at all five widths; screenshots retained.');
}
main().catch(e=>{console.error(e);process.exitCode=1;server.close();});
