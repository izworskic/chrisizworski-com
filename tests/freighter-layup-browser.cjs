'use strict';
/* Live-browser acceptance on the checked-out STATIC artifact, not a protected cloud preview.
 * Requires Playwright and system Chrome; never leaks secrets or changes production.
 * Run: node tests/freighter-layup-browser.cjs
 */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..','public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const raw=(req.url||'/').split('?')[0];
  let decoded;
  try{decoded=decodeURIComponent(raw)}catch{res.writeHead(400);res.end();return}
  let file=path.resolve(root,'.'+decoded);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  if(decoded.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"intentional fallback check"}');return}
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html')}catch{}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
  });
});
function check(cond,message){assert.ok(cond,message)}
async function run(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port+'/great-lakes-freighter-winter-layup/';
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  const results=[];
  try{
    for(const size of [{width:1320,height:950,name:'desktop'},{width:390,height:844,name:'mobile'}]){
      const context=await browser.newContext({viewport:{width:size.width,height:size.height},reducedMotion:'reduce'});
      // Exercise map markers without letting an external tile/photo/CDN outage block tests.
      await context.route('**/*',route=>{
        const host=new URL(route.request().url()).hostname;
        return host==='127.0.0.1'?route.continue():route.abort();
      });
      const page=await context.newPage(),pageErrors=[];
      page.on('pageerror',err=>pageErrors.push(err.message));
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
      try{await page.locator('[data-ship]').first().waitFor({timeout:10000});}
      catch(err){
       console.error('LAYUP BOOT DEBUG',JSON.stringify({
         errors:pageErrors,
         countNote:await page.locator('#count-note').textContent().catch(()=>null),
         mapStatus:await page.locator('#map-status').textContent().catch(()=>null),
         fleetHTML:(await page.locator('#ship-grid').innerHTML().catch(()=>'' )).slice(0,430),
         scripts:await page.evaluate(()=>[...document.scripts].filter(x=>x.src).map(x=>({src:x.src}))).catch(()=>[]),
         season:await page.locator('#season').inputValue().catch(()=>null),
       }));
       throw err;
      }
      check(await page.locator('[data-ship]').count()===12,size.name+': 2025–26 shows twelve ships');
      check(await page.locator('.feature-story').count()===3,size.name+': three editorial stories');
      check(await page.locator('body.layup-home .hero h1').isVisible(),size.name+': hero storytelling');
      check(await page.locator('.hero-media img').evaluate(img=>img.complete && img.naturalWidth>0),size.name+': self-hosted winter freighter hero image');
      check(await page.locator('.feature-story img').count()===3,size.name+': three licensed fleet photographs');
      for(const img of await page.locator('.feature-story img').all())check(await img.evaluate(el=>el.complete&&el.naturalWidth>0),size.name+': local story image available');

      check(await page.locator('.atlas-workspace #layup-map').count()===1,size.name+': integrated map and harbor notebook');
      await page.locator('.layup-pin').first().waitFor({timeout:10000});
      check(await page.locator('.layup-pin').count()===5,size.name+': five historical harbor map markers');
      check(await page.locator('#stat-ships').textContent()==='12',size.name+': season stats');
      // Real browser runs local Leaflet and a deterministic missing-CARTO fallback.
      check(await page.evaluate(()=>Boolean(window.L&&document.querySelector('#layup-map .leaflet-pane'))),size.name+': Leaflet initialized');
      check(await page.locator('#layup-map .map-loading').count()===0,size.name+': map loading hint removed');
      // The test intentionally blocks external Wikimedia images. Ship identity must remain
      // visually represented, and a failed photo may not retain a misleading photo badge.
      const photo=page.locator('.ship-art img').first();
      await photo.scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>[...document.querySelectorAll('.ship-art img')].some(i=>i.hidden),{timeout:5000});
      const imageFallback=await page.evaluate(()=>{
        const image=[...document.querySelectorAll('.ship-art img')].find(i=>i.hidden);
        return !!(image?.previousElementSibling && !image.previousElementSibling.hidden && !!image.parentElement.querySelector('.ship-illustration'));
      });
      check(imageFallback,size.name+': image outage reveals branded ship illustration');


      await page.locator('#harbor-filter').selectOption('sturgeon-bay');
      check(await page.locator('[data-ship]').count()===3,size.name+': Sturgeon Bay harbor filter');
      await page.locator('#focus-harbor').click();
      await page.locator('#ship-search').fill('James R Barker');
      check(await page.locator('[data-ship]').count()===1,size.name+': normalized ship alias');
      await page.locator('[data-ship="james-r-barker"]').click();
      check(await page.locator('#ship-detail').isVisible(),size.name+': ship detail opens');
      check((await page.locator('#detail-body').textContent()).includes('Fincantieri'),size.name+': right historical berth');
      check(await page.locator('#detail-body a[href*="/vessels/james-r-barker/"]').count()===1,size.name+': biography link in detail');
      await page.locator('#clear-filters').click();
      check(await page.locator('[data-ship]').count()===12,size.name+': clear restores fleet');
      await page.locator('#harbor-filter').selectOption('milwaukee');
      check(await page.locator('[data-ship]').count()===1,size.name+': Milwaukee filter');

      await page.locator('#season').selectOption('2024-25');
      check(await page.locator('[data-ship]').count()===2,size.name+': previous winter has two records');
      check(await page.locator('.layup-pin').count()===1,size.name+': one archived winter harbor');
      await page.locator('[data-ship="algoma-compass"]').click();
      check(await page.locator('[data-winter="2025-26"]').count()===1,size.name+': historical cross-winter link');
      await page.locator('[data-winter="2025-26"]').click();
      check(await page.locator('#season').inputValue()==='2025-26',size.name+': cross-winter season navigation');
      check((await page.locator('#detail-title').textContent())==='Algoma Compass',size.name+': vessel identity preserved across winters');

      await page.locator('#season').selectOption('2026-27');
      check(await page.locator('[data-ship]').count()===0,size.name+': no invented future ship records');
      check(await page.locator('.layup-pin').count()===0,size.name+': no old harbor markers in future season');
      await page.locator('#season').selectOption('2025-26');
      check(await page.locator('[data-ship]').count()===12,size.name+': archive restored');

      const bioUrl=url+'vessels/algoma-compass/';
      await page.goto(bioUrl,{waitUntil:'domcontentloaded'});
      check((await page.locator('h1').textContent()).includes('Algoma Compass'),size.name+': permanent biography loads');
      check((await page.locator('#winter-record').textContent()).includes('Winter 2024–25'),size.name+': earlier season biography table');
      check((await page.locator('#winter-record').textContent()).includes('Winter 2025–26'),size.name+': current archive biography table');
      check(await page.locator('meta[name="description"]').count()===1,size.name+': page-specific metadata');

      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.locator('[data-ship]').first().waitFor({timeout:10000});
      check(await page.locator('label[for="ship-search"]').count()===1,size.name+': search label');
      check(await page.locator('a.skip').count()===1,size.name+': keyboard skip link');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      check(overflow<=3,size.name+': horizontal overflow '+overflow+'px');
      check(pageErrors.length===0,size.name+': unhandled browser exceptions: '+pageErrors.join('; '));
      fs.mkdirSync(path.resolve(__dirname,'..','artifacts/layup-qa'),{recursive:true});
      await page.screenshot({path:path.resolve(__dirname,'..','artifacts/layup-qa/'+size.name+'.png'),fullPage:true});
      results.push(size.name+': PASS — historical statuses, map, filters, seasons, biographies, layout, JS exceptions');
      await context.close();
    }
    for(const r of results)console.log(r);
  }finally{await browser.close();await new Promise(r=>server.close(r))}
}
run().catch(err=>{console.error('LAYUP BROWSER SMOKE FAILED:',err.stack||err.message);process.exitCode=1;server.close()});
