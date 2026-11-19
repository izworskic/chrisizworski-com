/* Local, deterministic browser acceptance for the existing buoy page.
 * No production API, NDBC feed, ads, tracking or credentials are requested.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.BUOY_PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.BUOY_QA_OUTPUT || 'artifacts/buoy-observation-bridge');
fs.mkdirSync(output, { recursive: true });
const now = new Date();
const recent = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
const fixture = {
  count: 3, fetched_at: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
  stations: [
    {id:'45029',name:'Holland buoy',lake:'Michigan',type:'Buoy',lat:42.8,lng:-86.2,obs_time:recent,wind_spd:5,wave_ht:1.2,water_t:9.5},
    {id:'45005',name:'Western Lake Erie',lake:'Erie',type:'Buoy',lat:41.7,lng:-82.4,obs_time:recent,wind_spd:3,wave_ht:0.5,water_t:12},
    {id:'45187',name:'Saginaw Bay',lake:'Huron',type:'Buoy',lat:43.8,lng:-83.4,obs_time:recent,wind_spd:6,wave_ht:2.0,water_t:null}
  ]
};
const assets = {
  '/great-lakes-buoys/': ['public/great-lakes-buoys/index.html','text/html; charset=utf-8'],
  '/great-lakes-buoys/index.html': ['public/great-lakes-buoys/index.html','text/html; charset=utf-8'],
  '/great-lakes-buoys/observation-bridge.css': ['public/great-lakes-buoys/observation-bridge.css','text/css; charset=utf-8'],
  '/great-lakes-buoys/observation-bridge.js': ['public/great-lakes-buoys/observation-bridge.js','text/javascript; charset=utf-8'],
  '/great-lakes-buoys/map-first.css': ['public/great-lakes-buoys/map-first.css','text/css; charset=utf-8'],
  '/great-lakes-buoys/map-first.js': ['public/great-lakes-buoys/map-first.js','text/javascript; charset=utf-8']
};
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname==='/api/buoys'){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify(fixture));
    return;
  }
  const asset=assets[pathname];
  if(!asset){res.writeHead(404);res.end('Unavailable in isolated fixture');return;}
  res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-store'});
  res.end(fs.readFileSync(path.join(root,asset[0])));
});
const results = [];
function record(label, status, note) {
  results.push({label,status,note});
  console.log(status+' '+label+(note?' · '+note:''));
}
async function main(){
  await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',e=>e?reject(e):resolve()));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [360,390,768,1280,1440]){
      const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,reducedMotion:'reduce'});
      // Block external ads, analytics, tiles and CDN deliberately. This proves the
      // data/list experience is independent of third-party map availability.
      await context.route('**/*',r=>{
        const u=new URL(r.request().url());
        if(u.hostname==='127.0.0.1')r.continue();
        else r.abort();
      });
      const page=await context.newPage();
      const exceptions=[];
      page.on('pageerror',e=>exceptions.push(e.message));
      await page.goto(base+'/great-lakes-buoys/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('obWaveA').textContent!=='--',{timeout:15000});
      // The first useful tool element is activity choice + map, not the comparison.
      const mapIndex=await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>e.id==='station-map'||e.id==='observationBridge').map(e=>e.id));
      assert.deepEqual(mapIndex,['station-map','observationBridge']);
      const mapPosition=await page.locator('#station-map').boundingBox();
      const layout=await page.evaluate(()=>{
        const selectors=['.header','.nav','.live-strip','.body','.breadcrumb','.page-title','.sub','#waterDesk','.water-desk-head','.filter-bar','.pill-row','.filter-help','.map-first-head','#station-map'];
        return Object.fromEntries(selectors.map(k=>{
          const e=document.querySelector(k);
          if(!e)return [k,null];
          const r=e.getBoundingClientRect(),styles=getComputedStyle(e);
          return [k,{top:Math.round(r.top),height:Math.round(r.height),marginTop:styles.marginTop,marginBottom:styles.marginBottom}];
        }));
      });
      if(width===360)console.log('MAP_FIRST_LAYOUT '+JSON.stringify(layout));
      await page.screenshot({path:path.join(output,'buoy-'+width+'-before-layout-gate.png'),animations:'disabled'});
      assert.ok(mapPosition.y<840,'map appears too late on first '+width+'px viewport: '+mapPosition.y);
      assert.equal(await page.locator('#mapStationPicker').isEnabled(),true);
      assert.match(await page.locator('#mapStationTitle').innerText(),/Choose a buoy/);
      // Activity choice recolors the source map and updates the same selected station.
      await page.locator('[data-act="kayaking"]').click();
      assert.equal(await page.locator('[data-act="kayaking"]').getAttribute('aria-pressed'),'true');
      assert.match(await page.locator('#filterHelp').innerText(),/screening|thresholds/i);
      await page.selectOption('#mapStationPicker','45029');
      assert.match(await page.locator('#mapStationTitle').innerText(),/Holland buoy/);
      assert.match(await page.locator('#mapStationVerdict').innerText(),/screening thresholds/i);
      assert.match(await page.locator('#mapStationSource').getAttribute('href'),/station=45029/);
      await page.selectOption('#mapStationPicker','45187');
      assert.match(await page.locator('#mapStationVerdict').innerText(),/Cannot evaluate/);
      // Dispatch precisely the event a Leaflet marker fires, then test reversal.
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('buoy-map-station-selected',{detail:{id:'45005',origin:'map'}})));
      assert.match(await page.locator('#mapStationTitle').innerText(),/Western Lake Erie/);
      await page.selectOption('#mapStationPicker','45029');
      assert.match(await page.locator('#mapStationTitle').innerText(),/Holland buoy/);
      // Filtering the list/map to a different lake must clear an invisible selection.
      await page.locator('[data-lake="Erie"]').click();
      assert.match(await page.locator('#mapStationTitle').innerText(),/Choose a buoy/);
      assert.equal(await page.locator('#mapStationPicker').inputValue(),'');
      // Choosing a station outside that filter reveals it on the full-basin map again.
      await page.selectOption('#mapStationPicker','45029');
      assert.match(await page.locator('#mapStationTitle').innerText(),/Holland buoy/);
      const lakeClass=await page.locator('[data-lake="all"]').getAttribute('class');
      assert.ok(lakeClass && lakeClass.includes('active'), 'station picker must reset the lake filter');
      await page.locator('#mapStationCompare').click();
      assert.equal(await page.locator('#obStationA').inputValue(),'45029');
      await page.locator('[data-act="all"]').click();
      assert.equal(await page.locator('[data-act="all"]').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#obStationA').inputValue(),'45029');
      assert.equal(await page.locator('#obStationA').inputValue(),'45029');
      assert.equal(await page.locator('#obStationB').inputValue(),'45005');
      const initial=await page.locator('#obVerdict').innerText();
      assert.match(initial,/45029 reports waves/);
      assert.match(initial,/not a route or nearshore forecast/);
      assert.match(await page.locator('#obProvenance').innerText(),/via site API/);
      assert.match(await page.locator('#obAgeA').innerText(),/Recent report/i);
      assert.equal(await page.locator('#obWaterA').innerText(),'49');
      assert.equal(await page.locator('#obWaterB').innerText(),'54');
      // A -> C -> A must change and then return to the same measured answer.
      await page.selectOption('#obStationA','45187');
      assert.match(await page.locator('#obVerdict').innerText(),/45187 reports waves/);
      await page.selectOption('#obStationA','45029');
      assert.equal(await page.locator('#obVerdict').innerText(),initial);
      // The full station list can select the paired view without a map.
      await page.locator('[data-bridge-station="45187"]').click();
      assert.equal(await page.locator('#obStationA').inputValue(),'45187');
      await page.selectOption('#obStationB','45187');
      assert.match(await page.locator('#obVerdict').innerText(),/same station/);
      await page.selectOption('#obStationB','45005');
      assert.match(await page.locator('#obVerdict').innerText(),/45187 reports waves/);
      // Missing Leaflet cannot steal the station list or leave 560px of blank map.
      assert.equal(await page.locator('.map-wrap.map-unavailable').count(),1);
      assert.match(await page.locator('.map-alt').innerText(),/Browse station list/);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert.ok(overflow<=1,'horizontal document overflow at '+width+': '+overflow);
      assert.deepEqual(exceptions,[], 'page JS exceptions at '+width);
      await page.screenshot({path:path.join(output,'buoy-'+width+'-initial.png'),animations:'disabled'});
      await page.locator('#observationBridge').screenshot({path:path.join(output,'buoy-'+width+'-bridge.png'),animations:'disabled'});
      await page.locator('#waterDesk').screenshot({path:path.join(output,'buoy-'+width+'-map-first.png'),animations:'disabled'});
      record('viewport-'+width,'PASS','paired selection, A-C-A, station handoff, source age, map-free list and overflow');
      await context.close();
    }
    // Explicit API failure exercises the old snapshot as reference only.
    {
      const context=await browser.newContext({viewport:{width:390,height:844}});
      await context.route('**/*',r=>{
        const u=new URL(r.request().url());
        if(u.hostname!=='127.0.0.1')r.abort();
        else if(u.pathname==='/api/buoys')r.fulfill({status:503,contentType:'application/json',body:'{"error":"down"}'});
        else r.continue();
      });
      const page=await context.newPage();
      await page.goto(base+'/great-lakes-buoys/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('obProvenance').textContent.includes('Saved snapshot'),{timeout:15000});
      assert.match(await page.locator('#liveStatus').innerText(),/Saved snapshot; live readings unavailable/);
      assert.match(await page.locator('#obVerdict').innerText(),/older than two hours/);
      await page.selectOption('#mapStationPicker','45029');
      assert.match(await page.locator('#mapStationVerdict').innerText(),/Saved snapshot only/);
      await page.locator('[data-act="kayaking"]').click();
      assert.match(await page.locator('#mapStationVerdict').innerText(),/Saved snapshot only/);
      assert.equal(await page.locator('#smartCta.show').count(),0);
      assert.ok(await page.locator('#stationList .station-row').count()>0);
      await page.locator('#observationBridge').screenshot({path:path.join(output,'buoy-390-saved-snapshot.png'),animations:'disabled'});
      record('api-outage','PASS','snapshot disclosed, no positive live advisory, station list usable');
      await context.close();
    }
    // No JavaScript must keep the original authored static answer and sources.
    {
      const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
      const page=await context.newPage();
      await page.goto(base+'/great-lakes-buoys/',{waitUntil:'domcontentloaded'});
      assert.equal(await page.locator('#great-lakes-buoy-answer').isVisible(),true);
      assert.match(await page.locator('#great-lakes-buoy-answer').innerText(),/NOAA\/NDBC readings/);
      assert.equal(await page.locator('#obStationA').isDisabled(),true);
      assert.equal(await page.locator('#great-lakes-buoy-answer').isVisible(),true);
      assert.equal(await page.locator('#mapStationPicker').isDisabled(),true);
      assert.ok(await page.locator('.map-no-script').count()>0);
      assert.ok(await page.locator('a[href="https://www.weather.gov/marine/"]').count()>0);
      record('no-javascript','PASS','existing static answer and authoritative marine source preserved');
      await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({caseCount:results.length,results},null,2));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
