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
      await page.locator('#winter-live').waitFor({timeout:10000});
      await page.waitForFunction(()=>!document.getElementById('live-update-status')?.textContent?.includes('Loading the new winter'),{timeout:10000});
      check(await page.locator('#season').inputValue()==='2025-26',size.name+': evidence-rich archive is default until first active report');
      check(await page.locator('#winter-live').isVisible(),size.name+': living winter desk stays visible while browsing archives');
      await page.locator('#source-evidence-details > summary').click();
      check(await page.locator('#layup-reporting-network .coverage-source').count()===20,size.name+': twenty linked reporting inputs');
      check(await page.locator('#source-evidence-details').evaluate(el=>el.open),size.name+': source disclosure expanded');
      await page.locator('#source-evidence-details > summary').click();
      check(await page.locator('#winter-feed .live-empty').count()===1,size.name+': new winter does not invent arrivals');
      check(await page.locator('#winter-live').evaluate(e=>e.classList.contains('is-preseason')),size.name+': empty current winter is presented as preseason');
      if(size.name==='mobile'){
       check(await page.locator('#winter-live').evaluate(e=>e.getBoundingClientRect().height)<1150,size.name+': compact preseason does not push the useful archive too far down');
      }
      await page.locator('#season').selectOption('2025-26');
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
      for(const id of ['harbor-filter','berth-filter']){
       const fit=await page.locator('#'+id).evaluate(el=>{const option=el.selectedOptions[0],canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=getComputedStyle(el).font;return {text:option?.textContent||'',required:ctx.measureText(option?.textContent||'').width+40,actual:el.clientWidth}});
       check(fit.actual>=fit.required,size.name+': untruncated '+id+' label '+JSON.stringify(fit));
      }

      check(await page.locator('#harbor-filter option').count()===6,size.name+': only five source-dated historical harbor choices; thirteen monitored areas are not claimed as layups');
      check(await page.locator('.feature-story').count()===3,size.name+': three editorial stories');
      check(await page.locator('body.layup-home .hero h1').isVisible(),size.name+': hero storytelling');
      check(await page.locator('.hero-media img').evaluate(img=>img.complete && img.naturalWidth>0),size.name+': self-hosted winter freighter hero image');
      check(await page.locator('.feature-story img').count()===3,size.name+': three licensed fleet photographs');
      for(const img of await page.locator('.feature-story img').all()){await img.evaluate(el=>el.decode().catch(()=>{}));const state=await img.evaluate(el=>({src:el.getAttribute('src'),complete:el.complete,hidden:el.hidden,width:el.naturalWidth}));check(state.complete&&state.width>0,size.name+': local story image available: '+JSON.stringify(state));}

      check(await page.locator('.atlas-workspace #layup-map').count()===1,size.name+': integrated map and harbor notebook');
      await page.locator('.layup-pin').first().waitFor({timeout:10000});
      check(await page.locator('.layup-pin').count()===5,size.name+': five historical harbor map markers');
      check(await page.locator('.atlas-harbor-column').isHidden(),size.name+': no empty harbor notebook panel');
      await page.locator('.layup-pin').first().click();
      check(await page.locator('.atlas-harbor-column').isVisible(),size.name+': selected harbor details integrated into map');
      check(await page.locator('.atlas-harbor-column .harbor-vessels li').count()>0,size.name+': harbor selection reveals vessel links');
      check(await page.locator('.harbor-chip button').count()===0,size.name+': no duplicate harbor button list');
      await page.locator('.harbor-panel-heading button').click();
      check(await page.locator('.atlas-harbor-column').isHidden(),size.name+': closing harbor restores full map');
      const headings=await page.locator('main h2').allTextContents();
      for(const title of ['Winter Harbor Map','Current Winter Arrivals','Harbor Roster','Ship Stories','Why Freighters Lay Up'])check(headings.some(x=>x.includes(title)),size.name+': functional section heading '+title);
      check(await page.locator('main > .wrapper > section').evaluateAll(nodes=>nodes.map(n=>n.id||n.className).join('|')).then(v=>v.startsWith('explorer|fleet|ship-biographies|stories|sources-evidence')),size.name+': page section order');
      check(await page.locator('#source-evidence-details').evaluate(e=>!e.open),size.name+': source and evidence methods collapsed by default');
      const boundsText=await page.evaluate(()=>document.querySelector('#layup-map')?.dataset.initialBounds||'');
      check(boundsText==='41.3,-92.4|48.9,-78.2',size.name+': Lakes-focused initial map target');

      check(await page.locator('#stat-ships').textContent()==='12',size.name+': season stats');
      // Real browser runs local Leaflet and a deterministic missing-CARTO fallback.
      check(await page.evaluate(()=>Boolean(window.L&&document.querySelector('#layup-map .leaflet-pane'))),size.name+': Leaflet initialized');
      check(await page.locator('#layup-map .map-loading').count()===0,size.name+': map loading hint removed');
      check(await page.locator('.ship-monogram').count()===12,size.name+': all twelve ships use consistent monogram tiles');
      check(await page.locator('.ship-art img').count()===0,size.name+': mixed roster photography removed');
      check(await page.locator('#ship-biographies .bio-related').count()===3,size.name+': nonfeatured biographies deduplicated');


      await page.locator('#harbor-filter').selectOption('sturgeon-bay');
      check(await page.locator('.atlas-harbor-column').isVisible(),size.name+': harbor filter highlights map notebook');
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
      check(await page.locator('#winter-live').isVisible(),size.name+': live desk visible in current season');
      check(await page.locator('[data-ship]').count()===0,size.name+': no invented future ship records');
      check(await page.locator('.layup-pin').count()===0,size.name+': no old harbor markers in future season');
      await page.locator('#season').selectOption('2025-26');
      check(await page.locator('[data-ship]').count()===12,size.name+': archive restored');

      // Simulated authorized dated report exercises live-season integration, not AIS inference.
      const sampleLive={schemaVersion:1,season:'2026-27',startedAt:'2026-11-01T00:00:00.000Z',updatedAt:'2027-01-16T12:00:00Z',previousSeasons:[],events:[{
       id:'winter-demo-arrival',vessel:{key:'lee-a-tregurtha',name:'Lee A. Tregurtha'},harborId:'superior',
       kind:'arrival',date:'2027-01-16',confidence:'reported',
       summary:'Lee A. Tregurtha arrived for winter layup according to a dated harbor report.',
       source:{url:'https://www.duluthharborcam.com/2027/01/lee-arrival.html',title:'Arrival for winter layup',publisher:'Duluth Harbor Cam',class:'journalistic_report'}
      }]};
      await context.route('**/assets/freighter-layup-live-season.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sampleLive)}));
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#winter-feed .winter-update').first().waitFor({timeout:10000});
      check(await page.locator('#season').inputValue()==='2026-27',size.name+': sourced winter chosen');
      check(await page.locator('#live-arrivals').textContent()==='1',size.name+': dated report adds arrival');
      check(await page.locator('.layup-pin').count()===1,size.name+': sourced record adds harbor map pin');
      check(await page.locator('[data-ship="lee-a-tregurtha"]').count()===1,size.name+': new winter roster grows');
      check((await page.locator('#winter-feed').textContent()).includes('Duluth Harbor Cam'),size.name+': exact source attribution');
      check((await page.locator('#winter-feed').textContent()).includes('Reported source'),size.name+': non-official remains reported');
      await page.locator('#season').selectOption('2025-26');
      check(await page.locator('[data-ship]').count()===12,size.name+': live ledger cannot overwrite last winter');

      // A departure ends the current berth but must NOT erase the dated story.
      sampleLive.events.push({
       id:'winter-demo-departure',vessel:{key:'lee-a-tregurtha',name:'Lee A. Tregurtha'},harborId:'superior',
       kind:'departure',date:'2027-03-01',confidence:'reported',
       summary:'Lee A. Tregurtha departed winter layup at Superior.',
       source:{url:'https://www.duluthharborcam.com/2027/03/lee-departure.html',title:'Departure',publisher:'Duluth Harbor Cam',class:'journalistic_report'}
      });
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#winter-feed .winter-update').first().waitFor({timeout:10000});
      check(await page.locator('#winter-live').isVisible(),size.name+': current-season story desk remains visible in archive view');
      check(await page.locator('#season').inputValue()==='2025-26',size.name+': archive is default when no actively reported berth remains');
      check(await page.locator('#live-departures').textContent()==='1',size.name+': departure is retained as a real winter event');
      await page.locator('#season').selectOption('2026-27');
      check(await page.locator('.layup-pin').count()===0,size.name+': departed vessel removed from occupied winter harbor map');
      check(await page.locator('[data-ship]').count()===0,size.name+': departed vessel removed from current berth cards');
      check((await page.locator('#winter-feed').textContent()).includes('departed winter layup'),size.name+': departure preserved in source timeline');

      // A confirmed arrival in one harbor does not confirm an unverified move
      // to one of the other eight candidate harbor areas.
      sampleLive.events.splice(0,sampleLive.events.length,{
       id:'first-verified-arrival',vessel:{key:'lee-a-tregurtha',name:'Lee A. Tregurtha'},harborId:'superior',
       kind:'arrival',date:'2027-01-16',confidence:'confirmed',summary:'Confirmed arrival at Superior.',
       source:{url:'https://duluthport.com/news/arrival/',title:'Verified winter arrival',publisher:'Duluth Seaway Port Authority',class:'port_authority'}
      },{
       id:'unverified-harbor-move',vessel:{key:'lee-a-tregurtha',name:'Lee A. Tregurtha'},harborId:'sarnia',
       kind:'berth_change',date:'2027-01-20',confidence:'reported',summary:'Reported move to Sarnia, pending independent confirmation.',
       source:{url:'https://www.duluthharborcam.com/2027/01/ship-moved.html',title:'Possible move to Sarnia',publisher:'Duluth Harbor Cam',class:'journalistic_report'}
      });
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('[data-ship="lee-a-tregurtha"]').waitFor({timeout:10000});
      check(await page.locator('#season').inputValue()==='2026-27',size.name+': active winter regains default');
      check(await page.locator('#harbor-filter option').count()===2,size.name+': newly sourced candidate harbor now filterable');
      check(await page.locator('#harbor-filter option[value="sarnia"]').count()===1,size.name+': Sarnia can be shown with actual dated evidence');
      check((await page.locator('#stat-year').textContent())==='0 / 1',size.name+': old confirmed harbor cannot validate new reported berth');
      sampleLive.events[1].harborId='superior';
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('[data-ship="lee-a-tregurtha"]').waitFor({timeout:10000});
      check((await page.locator('#stat-year').textContent())==='0 / 1',size.name+': unverified same-harbor move stays reported');
      sampleLive.events[1].harborId='sarnia';

      check(await page.locator('.layup-pin').count()===1,size.name+': one source-dated new harbor marker');
            await context.unroute('**/assets/freighter-layup-live-season.json');


      const bioUrl=url+'vessels/algoma-compass/';
      await page.goto(bioUrl,{waitUntil:'domcontentloaded'});
      check((await page.locator('h1').textContent()).includes('Algoma Compass'),size.name+': permanent biography loads');
      check(await page.locator('body.layup-biography .bio-hero h1').isVisible(),size.name+': designed ship hero');
      check(await page.locator('body.layup-biography .bio-trust-bar').isVisible(),size.name+': source-date honesty');
      check(await page.locator('.bio-chapter').count()>=2,size.name+': editorial history chapters');
      const overflowBio=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      check(overflowBio<=3,size.name+': ship biography overflow '+overflowBio);
      check((await page.locator('#winter-record').textContent()).includes('Winter 2024–25'),size.name+': earlier season biography table');
      check((await page.locator('#winter-record').textContent()).includes('Winter 2025–26'),size.name+': current archive biography table');
      check(await page.locator('meta[name="description"]').count()===1,size.name+': page-specific metadata');
      fs.mkdirSync(path.resolve(__dirname,'..','artifacts/layup-qa'),{recursive:true});
      await page.screenshot({path:path.resolve(__dirname,'..','artifacts/layup-qa/'+size.name+'-biography.png'),fullPage:true});
      await page.goto(url+'vessels/oakglen/',{waitUntil:'domcontentloaded'});
      check(await page.locator('.bio-hero-media img').evaluate(i=>i.complete&&i.naturalWidth>0),size.name+': Oakglen historical photo');
      await page.goto(url+'vessels/james-r-barker/',{waitUntil:'domcontentloaded'});
      check(await page.locator('.bio-hero-media img').evaluate(i=>i.complete&&i.naturalWidth>0),size.name+': Barker historical photo');
      await page.screenshot({path:path.resolve(__dirname,'..','artifacts/layup-qa/'+size.name+'-barker.png'),fullPage:true});


      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!document.getElementById('live-update-status')?.textContent?.includes('Loading the new winter'),{timeout:10000});
      await page.locator('#season').selectOption('2025-26');
      await page.locator('[data-ship]').first().waitFor({timeout:10000});
      check(await page.locator('label[for="ship-search"]').count()===1,size.name+': search label');
      check(await page.locator('a.skip').count()===1,size.name+': keyboard skip link');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      check(overflow<=3,size.name+': horizontal overflow '+overflow+'px');
      // Ad layout verification: a simulated sticky anchor sits in the reserved bottom
      // area and side-rail placement is removed only below desktop width.
      const adChecks=await page.evaluate(()=>{
        const ad=document.createElement('div');ad.className='ad-side-rail';ad.textContent='side rail QA';document.body.append(ad);
        const sideDisplay=getComputedStyle(ad).display;ad.remove();
        const footer=document.querySelector('.footer');
        window.scrollTo(0,document.documentElement.scrollHeight);
        return {rail:sideDisplay,bodyPadding:parseFloat(getComputedStyle(document.body).paddingBottom),
          footerBottom:footer.getBoundingClientRect().bottom,viewport:innerHeight};
      });
      check(adChecks.bodyPadding>=95,size.name+': reserved bottom sticky-anchor space');
      if(size.name==='mobile')check(adChecks.rail==='none',size.name+': narrow side rail suppressed');
      check(adChecks.footerBottom<=adChecks.viewport-90,size.name+': sticky bottom ad cannot cover footer at page end');

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
