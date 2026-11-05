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
const {seasonForDate}=require('../lib/freighter-layup-season');
const activeSeason=seasonForDate(new Date()),activeYear=Number(activeSeason.slice(0,4));
const historyData=JSON.parse(fs.readFileSync(path.join(root,'assets','freighter-layup-history.json'),'utf8'));
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
    for(const size of [{width:1320,height:950,name:'desktop'},{width:1024,height:800,name:'compact-desktop'},{width:768,height:860,name:'tablet'},{width:390,height:844,name:'mobile'},{width:360,height:780,name:'small-mobile'}]){
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
      check(await page.locator('#season').inputValue()===activeSeason,size.name+': current winter is default even before new reports');
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
      // Controlled AIS fixture: only eight nearby signals appear until explicitly expanded.
      const simulatedAIS={ok:true,notLayupConfirmations:true,checkedAt:'2026-10-26T10:00:00Z',activity:Array.from({length:13},(_,i)=>({
        name:'QA Vessel '+(i+1),harborId:'superior',seen:'2026-10-26T09:58:00Z',behavior:'moving'
      }))};
      await context.route('**/api/freighter-layup-live',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(simulatedAIS)}));
      await page.locator('#ais-refresh').click();
      await page.waitForFunction(()=>document.querySelector('#ais-watch-list')?.querySelectorAll('li').length===8,{timeout:7000});
      check(await page.locator('#ais-watch-list li').count()===8,size.name+': AIS limited to eight visible observations');
      check(await page.locator('#ais-show-more').isVisible(),size.name+': user can expand nearby AIS observations');
      await page.locator('#ais-show-more').click();
      check(await page.locator('#ais-watch-list li').count()===13,size.name+': show more reveals all mock signals');
      await page.locator('#ais-show-more').click();
      check(await page.locator('#ais-watch-list li').count()===8,size.name+': show fewer restores eight');
      await context.unroute('**/api/freighter-layup-live');
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
      // Python-compiled harbor manifest: every archive ship remains in the HTML,
      // while the client offers a reversible season + harbor view.
      const hist = page.locator('#winter-fleet-history');
      await page.waitForFunction(()=>document.getElementById('winter-fleet-history')?.dataset.historyEnhanced==='true');
      check(await hist.locator('[data-history-vessel]').count()===historyData.recordCount,size.name+': every archived source record is crawlable');
      check(await hist.locator('[data-history-season="'+historyData.seasons[0].id+'"] [data-history-vessel]:visible').count()===historyData.seasons[0].recordCount,
        size.name+': latest historical winter is initially selected even when its records are empty');
      check(await hist.locator('[data-history-season="2024-25"]').isHidden(),size.name+': past year hidden only after JS enhancement');
      await hist.locator('[data-history-pick="2024-25"]').click();
      check(await hist.locator('[data-history-season="2024-25"] [data-history-vessel]:visible').count()===2,
        size.name+': two source-backed entries when selecting 2024–25');
      check(await hist.locator('[data-history-pick="2024-25"]').getAttribute('aria-pressed')==='true',
        size.name+': year selection is keyboard/assistive accessible');
      await hist.locator('#history-harbor').selectOption('owen-sound');
      check(await hist.locator('[data-history-season="2024-25"] [data-history-vessel]:visible').count()===2,
        size.name+': Owen Sound shows both curated historic records');
      await hist.locator('[data-history-pick="2025-26"]').click();
      check(await hist.locator('#history-harbor').inputValue()==='all',size.name+': switching season clears incompatible harbor filter');
      await hist.locator('#history-harbor').selectOption('superior');
      check(await hist.locator('[data-history-season="2025-26"] [data-history-vessel]:visible').count()===6,
        size.name+': Superior narrows the selected winter to six documented ships');
      await hist.locator('#history-harbor').selectOption('all');
      check(await hist.locator('[data-history-season="2025-26"] [data-history-vessel]:visible').count()===12,
        size.name+': clearing harbor restores all twelve records (A-to-B-to-A)');
      check((await hist.locator('#history-selection').textContent()).includes('Not a total fleet count'),
        size.name+': history never presents sampled records as a complete fleet census');
      check(await hist.locator('a[href^="https://"]').count()>=14,
        size.name+': primary evidence remains linked on historical records');

      const adFlow=await page.evaluate(()=>{
        const hero=document.querySelector('main > .hero'),wrapper=document.querySelector('main > .wrapper');
        const slot=document.createElement('div');slot.className='google-auto-placed';slot.style.height='280px';
        hero.after(slot);
        const result={slotAfterMainTool:slot.getBoundingClientRect().top>=wrapper.getBoundingClientRect().bottom-1,
          remainsInDOM:slot.isConnected,mapFollowsHero:hero.getBoundingClientRect().bottom<=wrapper.getBoundingClientRect().top+1};
        slot.remove();return result;
      });
      check(adFlow.slotAfterMainTool&&adFlow.remainsInDOM&&adFlow.mapFollowsHero,size.name+': injected auto ad retained but follows map-first tool');
      const filterWidths=await page.evaluate(()=>{
        const row=document.querySelector('.filter-row');
        return {width:row.getBoundingClientRect().width,scrollWidth:row.scrollWidth,
          controls:[...row.querySelectorAll('select')].map(e=>e.getBoundingClientRect().width)};
      });
      check(filterWidths.scrollWidth<=filterWidths.width+3,size.name+': filters do not overflow');
      check(filterWidths.controls.every(w=>w>=220||size.width<621),size.name+': harbor and berth select widths avoid truncation');
      const boundsText=await page.evaluate(()=>document.querySelector('#layup-map')?.dataset.initialBounds||'');
      const bounds=boundsText.split('|').map(v=>v.split(',').map(Number));
      check(bounds.length===2&&bounds.every(b=>b.length===2&&b.every(Number.isFinite)),size.name+': map exposes real initial bounds');
      check(bounds[0][0]>40&&bounds[1][0]<49.5&&bounds[0][1]<-91.5&&bounds[1][1]>-82,
        size.name+': Great Lakes rather than eastern-seaboard extent '+boundsText);
      const mapCenter=await page.evaluate(()=>document.querySelector('#layup-map')?.dataset.initialBounds);
      check(!!mapCenter,size.name+': initial map bounds verified');

      check(await page.locator('#stat-ships').textContent()==='12',size.name+': season stats');
      // Real browser runs local Leaflet and a deterministic missing-CARTO fallback.
      check(await page.evaluate(()=>Boolean(window.L&&document.querySelector('#layup-map .leaflet-pane'))),size.name+': Leaflet initialized');
      check(await page.locator('#layup-map .map-loading').count()===0,size.name+': map loading hint removed');
      check(await page.locator('.ship-monogram').count()===12,size.name+': all twelve ships use consistent monogram tiles');
      check((await page.locator('#count-note').textContent()).indexOf('12 sourced')===-1,size.name+': counts are not duplicated in roster');
      for(const ship of ['manitoulin','stewart-j-cort','algoma-compass','american-spirit']){
        const berth=await page.locator('[data-card="'+ship+'"] .berth').textContent();
        check(!/not verified|not documented|layup verified|winter 2025/i.test(berth),size.name+': concise berth label for '+ship);
      }
      check(await page.locator('#harbor-panel').count()===1,size.name+': harbor notebook exists only inside map workspace');
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

      await page.locator('#season').selectOption(activeSeason);
      check(await page.locator('#winter-live').isVisible(),size.name+': live desk visible in current season');
      check(await page.locator('[data-ship]').count()===0,size.name+': no invented future ship records');
      check(await page.locator('.layup-pin').count()===0,size.name+': no old harbor markers in future season');
      await page.locator('#season').selectOption('2025-26');
      check(await page.locator('[data-ship]').count()===12,size.name+': archive restored');

      // Simulated authorized dated report exercises live-season integration, not AIS inference.
      const sampleLive={schemaVersion:1,season:activeSeason,startedAt:activeYear+'-11-01T04:00:00.000Z',updatedAt:(activeYear+1)+'-01-16T12:00:00Z',previousSeasons:[],events:[{
       id:'winter-demo-arrival',vessel:{key:'lee-a-tregurtha',name:'Lee A. Tregurtha'},harborId:'superior',
       kind:'arrival',date:(activeYear+1)+'-01-16',confidence:'reported',
       summary:'Lee A. Tregurtha arrived for winter layup according to a dated harbor report.',
       source:{url:'https://www.duluthharborcam.com/2027/01/lee-arrival.html',title:'Arrival for winter layup',publisher:'Duluth Harbor Cam',class:'journalistic_report'}
      }]};
      await context.route('**/assets/freighter-layup-live-season.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(sampleLive)}));
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#winter-feed .winter-update').first().waitFor({timeout:10000});
      check(await page.locator('#season').inputValue()===activeSeason,size.name+': sourced winter chosen');
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
       kind:'departure',date:(activeYear+1)+'-03-01',confidence:'reported',
       summary:'Lee A. Tregurtha departed winter layup at Superior.',
       source:{url:'https://www.duluthharborcam.com/2027/03/lee-departure.html',title:'Departure',publisher:'Duluth Harbor Cam',class:'journalistic_report'}
      });
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#winter-feed .winter-update').first().waitFor({timeout:10000});
      check(await page.locator('#winter-live').isVisible(),size.name+': current-season story desk remains visible in archive view');
      check(await page.locator('#season').inputValue()===activeSeason,size.name+': season remains current after a departure');
      check(await page.locator('#live-departures').textContent()==='1',size.name+': departure is retained as a real winter event');
      await page.locator('#season').selectOption(activeSeason);
      check(await page.locator('.layup-pin').count()===0,size.name+': departed vessel removed from occupied winter harbor map');
      check(await page.locator('[data-ship]').count()===0,size.name+': departed vessel removed from current berth cards');
      check((await page.locator('#winter-feed').textContent()).includes('departed winter layup'),size.name+': departure preserved in source timeline');

      // A confirmed arrival in one harbor does not confirm an unverified move
      // to one of the other eight candidate harbor areas.
      sampleLive.events.splice(0,sampleLive.events.length,{
       id:'first-verified-arrival',vessel:{key:'lee-a-tregurtha',name:'Lee A. Tregurtha'},harborId:'superior',
       kind:'arrival',date:(activeYear+1)+'-01-16',confidence:'confirmed',summary:'Confirmed arrival at Superior.',
       source:{url:'https://duluthport.com/news/arrival/',title:'Verified winter arrival',publisher:'Duluth Seaway Port Authority',class:'port_authority'}
      },{
       id:'unverified-harbor-move',vessel:{key:'lee-a-tregurtha',name:'Lee A. Tregurtha'},harborId:'sarnia',
       kind:'berth_change',date:(activeYear+1)+'-01-20',confidence:'reported',summary:'Reported move to Sarnia, pending independent confirmation.',
       source:{url:'https://www.duluthharborcam.com/2027/01/ship-moved.html',title:'Possible move to Sarnia',publisher:'Duluth Harbor Cam',class:'journalistic_report'}
      });
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('[data-ship="lee-a-tregurtha"]').waitFor({timeout:10000});
      check(await page.locator('#season').inputValue()===activeSeason,size.name+': active winter regains default');
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
      if(overflow>3){
        const offenders=await page.evaluate(()=>[...document.body.querySelectorAll('*')]
          .filter(el=>{const b=el.getBoundingClientRect();return b.width>0&&(b.right>innerWidth+2||b.left< -2)})
          .slice(0,18).map(el=>{const b=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:String(el.className||'').slice(0,85),left:Math.round(b.left),right:Math.round(b.right),width:Math.round(b.width)}}));
        console.error('LAYUP OVERFLOW DEBUG',JSON.stringify({width:size.width,overflow,offenders}));
      }
      check(overflow<=3,size.name+': horizontal overflow '+overflow+'px');
      // Navigation and harbor details now flow with the document; no fixed ad reserve.
      const flow=await page.evaluate(()=>{
        const header=document.querySelector('.topbar'),nav=header.querySelector('nav');
        const links=[...nav.querySelectorAll('a')];
        window.scrollTo(0,0);
        const rects=links.map(a=>a.getBoundingClientRect()),navWidth=nav.getBoundingClientRect().width;
        const bodyPadding=parseFloat(getComputedStyle(document.body).paddingBottom);
        const headerPosition=getComputedStyle(header).position;
        const panelPosition=getComputedStyle(document.querySelector('.atlas-harbor-column')).position;
        window.scrollTo(0,Math.min(500,document.documentElement.scrollHeight-innerHeight));
        return {links:links.length,allVisible:rects.every(r=>r.left>=-1&&r.right<=innerWidth+1),
          navWidth,viewport:innerWidth,bodyPadding,headerPosition,panelPosition,
          headerAfterScroll:header.getBoundingClientRect().top};
      });
      check(flow.links===7&&flow.allVisible,size.name+': all seven maritime links visible without horizontal scrolling '+JSON.stringify(flow));
      check(flow.navWidth>=flow.viewport*.75,size.name+': navigation spans page width');
      check(flow.headerPosition==='static'&&flow.headerAfterScroll< -20,size.name+': header scrolls with content');
      check(flow.panelPosition==='static',size.name+': harbor notebook does not stick');
      check(flow.bodyPadding<20,size.name+': no artificial fixed ad reserve');
      check(await page.locator('script[src*="pagead/js/adsbygoogle.js"]').count()===0,size.name+': layup page excludes AdSense');

      const hero=await page.locator('.hero').boundingBox();
      const map=await page.locator('#explorer').boundingBox();
      check(hero&&map&&map.y>=hero.y+hero.height-3,size.name+': first tool is map directly after hero');

      check(pageErrors.length===0,size.name+': unhandled browser exceptions: '+pageErrors.join('; '));
      fs.mkdirSync(path.resolve(__dirname,'..','artifacts/layup-qa'),{recursive:true});
      await page.screenshot({path:path.resolve(__dirname,'..','artifacts/layup-qa/'+size.name+'.png'),fullPage:true});
      results.push(size.name+': PASS — historical statuses, map, filters, seasons, biographies, layout, JS exceptions');
      await context.close();
    }
    // A useful historical answer and supporting article links must survive without JS.
    const noJS = await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false,reducedMotion:'reduce'});
    await noJS.route('**/*',route=>{
      const host=new URL(route.request().url()).hostname;
      return host==='127.0.0.1'?route.continue():route.abort();
    });
    const staticPage = await noJS.newPage();
    await staticPage.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
    check(await staticPage.locator('#winter-fleet-history [data-history-vessel]').count()===historyData.recordCount,
      'no-JS: all historical ship records remain in the document');
    check(await staticPage.locator('#winter-fleet-history .history-season-panel').count()===historyData.seasons.length,
      'no-JS: every archived winter remains directly available');
    check(await staticPage.locator('#winter-fleet-history .history-controls').isHidden(),
      'no-JS: inert history controls are not shown');
    check(await staticPage.locator('#winter-fleet-history a[href^="https://"]').count()>=historyData.recordCount,
      'no-JS: original evidence links survive');
    await noJS.close();
    for(const r of results)console.log(r);
  }finally{await browser.close();await new Promise(r=>server.close(r))}
}
run().catch(err=>{console.error('LAYUP BROWSER SMOKE FAILED:',err.stack||err.message);process.exitCode=1;server.close()});
