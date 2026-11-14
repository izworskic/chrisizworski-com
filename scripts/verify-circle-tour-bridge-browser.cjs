'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/circle-tour-bridge');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try {
    const uri=new URL(req.url,'http://127.0.0.1');
    if(uri.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return;}
    const rel=uri.pathname==='/lake-superior-circle-tour/'?'/lake-superior-circle-tour/index.html':
      uri.pathname==='/lake-superior-circle-tour/10-day/'?'/lake-superior-circle-tour/10-day/index.html':uri.pathname;
    const file=path.resolve(root,'.'+rel);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const st=await fs.promises.stat(file).catch(()=>null);
    if(!st?.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
    res.end(await fs.promises.readFile(file));
  }catch{res.writeHead(500);res.end('Test server failed');}
});
function check(value,message){if(!value)throw Error(message);}
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const url='http://127.0.0.1:'+server.address().port+'/lake-superior-circle-tour/';
 const report={browser:'chromium',screenshots:[],cases:[],failures:[]};let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const size of [{name:'mobile360',width:360,height:780},{name:'mobile390',width:390,height:844},{name:'tablet',width:768,height:900},{name:'desktop',width:1366,height:900},{name:'wideDesktop',width:1440,height:900}]){
    const ctx=await browser.newContext({viewport:{width:size.width,height:size.height}}),page=await ctx.newPage();
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    check(response.status()===200,size.name+': original route missing');
    await page.waitForFunction(()=>document.querySelector('#ctb-status')?.textContent.includes('approved connection'),null,{timeout:30000});
    const count=await page.locator('#ctb-results .ctb-entry').count();
    check(count>0&&count<=6,size.name+': initial handoff results invalid '+count);
    check(await page.locator('article.stop-card').count()===31,size.name+': lost existing stop cards');
    check(await page.locator('#ctb-fallback').isHidden(),size.name+': fallback should hide only after success');
    const geometry=await page.evaluate(()=>{
      const box=document.querySelector('#circle-tour-tool-bridge').getBoundingClientRect();
      return {document:document.documentElement.scrollWidth,viewport:innerWidth,bridge:box.width,left:box.left};
    });
    check(geometry.document<=geometry.viewport+2,size.name+': horizontal overflow '+JSON.stringify(geometry));
    check(geometry.bridge<=size.width,size.name+': connection layer wider than viewport');

    // Source-backed road choices stay usable at each viewport, without hijacking the
    // original 31-stop map or turning a published estimate into a verified ETA.
    await page.waitForFunction(()=>window.CircleTourRust?.engine?.()==='rust-wasm',null,{timeout:20000});
    const native=await page.evaluate(()=>{
      const e=window.CircleTourRust;
      const cards=id=>document.getElementById('stop-'+id);
      const days=[...document.querySelectorAll('#itin-10 .itin-day')].map(el=>({
        stops:el.dataset.stops.split(','),miles:Number(el.dataset.miles)
      }));
      return {
        engine:e.engine(),stops:e.ORDER.length,
        ironwood:e.evidenceMiles('5','6'),
        withheld:e.evidenceMiles('7','8'),
        total:e.verifyPreset(days,1358,'counterclockwise'),
        stale:e.verifyPreset(days,1358,'clockwise')
      };
    });
    check(native.engine==='rust-wasm'&&native.stops===31&&native.ironwood===43&&
      native.withheld===null&&native.total===1358&&native.stale===null,
      size.name+': real shared Rust Circle Tour source/parity gate unavailable '+JSON.stringify(native));
    report.cases.push({state:size.name+' Rust itinerary core',result:'31 stop parity, incomplete legs withheld, published route retained'});
    await page.waitForFunction(()=>document.querySelectorAll('#routeDayList .route-day').length===10,null,{timeout:30000});
    check((await page.locator('#routePreviewMeta').textContent()).includes('1,358'),
      size.name+': 10-day estimated total missing');
    await page.locator('.preset-btn[data-preset="7"]').click();
    check(await page.locator('#routeDayList .route-day').count()===7,
      size.name+': 7-day route selection did not update');
    check((await page.locator('#routePreviewMeta').textContent()).includes('1,359'),
      size.name+': 7-day published mileage rounded into the wrong total');
    const roadEvidence=page.locator('#routeDayList .route-road-evidence');
    check(await roadEvidence.count()>=4,size.name+': sourced road-choice desk absent');
    const keweenaw=page.locator('#routeDayList .route-day').nth(2).locator('.route-road-evidence');
    await keweenaw.locator('summary').click();
    check((await keweenaw.textContent()).includes('Brockway Mountain Drive'),
      size.name+': Keweenaw route alternative is missing');
    const copperLink=keweenaw.locator('a').filter({hasText:'Map Copper Harbor detour'});
    check(await copperLink.count()===1,size.name+': distinct Copper Harbor route link missing');
    check(new URL(await copperLink.getAttribute('href')).searchParams.get('waypoints').includes('Copper Harbor'),
      size.name+': optional route did not include Copper Harbor');
    const borderDay=page.locator('#routeDayList .route-day').last();
    check((await borderDay.textContent()).includes('Road reality'),
      size.name+': North Shore source disclosure missing');
    const mapLink=borderDay.locator('a').filter({hasText:'Map the Hwy 61 driving corridor'});
    check(await mapLink.count()===1,size.name+': core highway route not named honestly');
    const points=new URL(await mapLink.getAttribute('href')).searchParams.get('waypoints');
    check(points.includes('Pigeon River Border Crossing')&&points.includes('Grand Portage')
      &&!points.includes('Tettegouche'),
      size.name+': border/core towns incorrect or false park trailheads added');
    const routeWidth=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth}));
    check(routeWidth.doc<=routeWidth.viewport+2,size.name+': expanded road evidence overflow');
    if([390,1440].includes(size.width)){
      const screenshot='circle-road-reality-'+size.name+'.png';
      await page.locator('.route-preview').screenshot({path:path.join(out,screenshot),timeout:25000});
      report.screenshots.push(screenshot);
    }
    await page.locator('.preset-btn[data-preset="10"]').click();
    check(await page.locator('#routeDayList .route-day').count()===10,
      size.name+': returning to original balanced route failed');
    // Sense-of-place photos and narration must follow the actual selected park,
    // without changing the specialist tool, adding a second map or breaking mobile layout.
    for(const sample of [
      {stop:'15',name:'Lake Superior Provincial Park',clue:'Old Woman Bay'},
      {stop:'20',name:'Sleeping Giant Provincial Park',clue:'Sea Lion'},
      {stop:'18',name:'Pukaskwa National Park',clue:'Hattie Cove'},
      {stop:'3',name:'Apostle Islands National Lakeshore',clue:'Devils Island'},
      {stop:'6',name:'Porcupine Mountains Wilderness State Park',clue:'Presque Isle River'},
      {stop:'11',name:'Pictured Rocks National Lakeshore',clue:'Chapel Rock'},
      {stop:'23',name:'Grand Marais, Minnesota',clue:'Artist'},
      {stop:'24',name:'Cascade River State Park',clue:'Lookout Mountain'},
      {stop:'25',name:'Lutsen Mountains & Temperance River State Park',clue:'Carlton Peak'},
      {stop:'26',name:'Tettegouche State Park',clue:'Shovel Point'},
      {stop:'27',name:'Split Rock Lighthouse State Park',clue:'Pebble Beach'}
    ]){
      await page.locator('#ctb-stop').selectOption(sample.stop);
      const place=page.locator('#ctb-decision .ctb-place-story');
      check(await place.count()===1,size.name+': missing story at stop '+sample.stop);
      check((await place.getAttribute('aria-label')).includes(sample.name),size.name+': story does not match selected location');
      check((await place.textContent()).includes(sample.clue),size.name+': place-specific geography missing');
      check(await place.locator('img').count()===2,size.name+': expected exactly two licensed images');
      check(await place.locator('a[href^="https://creativecommons.org/"]').count()===2,
        size.name+': image license links missing');
      const alts=await place.locator('img').evaluateAll(images=>images.map(img=>({
        alt:img.alt,loading:img.loading,src:img.getAttribute('src'),decoding:img.decoding
      })));
      check(alts.every(x=>x.alt.length>30&&x.loading==='lazy'&&x.decoding==='async'&&x.src.startsWith('https://thumb.wikimedia.org/')),
        size.name+': invalid rights-conscious photographic markup');
    }
    // Eight stops with no independent specialist still give a useful sourced visitor choice.
    for(const [id,hostname,secondaryCount] of [
      ['2','www.superiorwi.gov',1],['4','www.visitashland.com',1],
      ['17','whiteriver.ca',1],['19','www.nipigon.net',1],
      ['21','www.dnr.state.mn.us',1],['24','www.dnr.state.mn.us',2],
      ['25','files.dnr.state.mn.us',2],['26','www.dnr.state.mn.us',1]
    ]){
      await page.locator('#ctb-stop').selectOption(id);
      await page.locator('#ctb-theme').selectOption('all');
      const panel=page.locator('#ctb-decision');
      check((await panel.textContent()).includes('MAKE THE MOST OF THIS STOP'),
        size.name+': sourced visitor action absent at '+id);
      const primary=panel.locator('.ctb-stage-primary');
      check(await primary.count()===1,size.name+': official visitor link missing at '+id);
      check(new URL(await primary.getAttribute('href')).hostname===hostname,
        size.name+': wrong source domain at '+id);
      check(await panel.locator('.ctb-stage-actions .ctb-secondary-link').count()===secondaryCount,
        size.name+': expected original stop guide plus any additional official reference at '+id);
      check(await page.locator('#ctb-results .ctb-entry').count()===0,
        size.name+': false independent specialist card at '+id);
    }
    // Arrivals are named map searches or land-manager-published street addresses.
    // No precise pin is invented, and the earlier practical official handoff survives.
    for(const [id,expected] of [
      ['2',1],['4',1],['17',1],['19',2],['21',1],['24',2],['25',2],['26',1]
    ]){
      await page.locator('#ctb-stop').selectOption(id);
      await page.locator('#ctb-theme').selectOption('all');
      const desk=page.locator('#ctb-decision .ctb-arrivals');
      check(await desk.count()===1,size.name+': arrival desk missing at stop '+id);
      check((await desk.textContent()).includes('WHERE TO START'),size.name+': arrival desk unlabelled at '+id);
      check(await desk.locator('.ctb-arrival').count()===1,
        size.name+': multiple destination cards compete at '+id);
      const choices=desk.locator('.ctb-arrival-choice');
      check(await choices.count()===(expected>1?expected:0),
        size.name+': arrival choices missing at '+id);
      check(await desk.locator('.ctb-arrival-map').count()===1,
        size.name+': only the chosen starting point may have a map action');
      if(expected>1){
        check(await choices.first().getAttribute('aria-pressed')==='true',
          size.name+': initial arrival choice not selected at '+id);
        const oldMap=await desk.locator('.ctb-arrival-map').getAttribute('href');
        await choices.last().focus();
        await page.keyboard.press('Enter');
        check(await choices.last().getAttribute('aria-pressed')==='true',
          size.name+': keyboard choice not active at '+id);
        check(await choices.last().evaluate(node=>document.activeElement===node),
          size.name+': switching starting point lost keyboard focus at '+id);
        check(await desk.locator('.ctb-arrival-map').getAttribute('href')!==oldMap,
          size.name+': option did not change map destination at '+id);
        check(new URL(page.url()).searchParams.get('ctArrival')==='1',
          size.name+': active arrival not retained in shared URL');
        await choices.first().click();
        check(await desk.locator('.ctb-arrival-map').getAttribute('href')===oldMap,
          size.name+': A-B-A did not restore original directions at '+id);
        check(!new URL(page.url()).searchParams.has('ctArrival'),
          size.name+': reset leaked a stale arrival parameter at '+id);
      }
      const links=await desk.locator('.ctb-arrival-map').evaluateAll(nodes=>nodes.map(node=>({
        url:node.href,target:node.target,rel:node.rel
      })));
      check(links.length===1,size.name+': selected map link missing at '+id);
      for(const link of links){
        const u=new URL(link.url);
        check(u.hostname==='www.google.com'&&['/maps/search/','/maps/dir/'].includes(u.pathname)&&u.searchParams.get('api')==='1',
          size.name+': untrusted or malformed map link at '+id);
        check(link.target==='_blank'&&link.rel.includes('noopener'),
          size.name+': map link needs safe separate tab at '+id);
      }
      check(await desk.locator('.ctb-arrival-source').count()===1,
        size.name+': chosen arrival lacks one matching official source at '+id);
      const dimensions=await desk.evaluate(el=>({width:el.getBoundingClientRect().width,document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
      check(dimensions.document<=dimensions.viewport+2,
        size.name+': arrival cards caused horizontal overflow at '+id);
    }
    await page.locator('#ctb-stop').selectOption('19');
    await page.locator('#ctb-theme').selectOption('all');
    await page.locator('#ctb-decision .ctb-arrival-choice').last().click();
    check((await page.locator('#ctb-decision .ctb-arrival-title').textContent()).includes('Red Rock'),
      size.name+': selected Red Rock title missing');
    check((await page.locator('#ctb-decision .ctb-arrival-note').textContent()).includes('2.6 km return'),
      size.name+': Red Rock shorter lookout scale missing');
    if([390,1440].includes(size.width)){
      const screenshotName='arrival-red-rock-'+size.name+'.png';
      await page.locator('#ctb-decision').screenshot({path:path.join(out,screenshotName)});
      report.screenshots.push(screenshotName);
    }
    const chosenMap=await page.locator('#ctb-decision .ctb-arrival-map').getAttribute('href');
    await page.locator('#ctb-stop').selectOption('25');
    check((await page.locator('#ctb-decision .ctb-arrival-title').textContent()).includes('Temperance'),
      size.name+': stale Red Rock choice leaked to Temperance');
    check(!new URL(page.url()).searchParams.has('ctArrival'),
      size.name+': previous stop left a stale arrival query parameter');
    await page.locator('#ctb-stop').selectOption('19');
    check(await page.locator('#ctb-decision .ctb-arrival-map').getAttribute('href')===chosenMap,
      size.name+': returning to Nipigon lost visitor preference');
    if(size.width===390){
      const deep=await ctx.newPage();
      await deep.goto(url+'?ctStop=19&ctArrival=1',{waitUntil:'domcontentloaded'});
      await deep.waitForFunction(()=>document.querySelector('#ctb-decision .ctb-arrival-choice[aria-pressed="true"]'));
      check((await deep.locator('#ctb-decision .ctb-arrival-title').textContent()).includes('Red Rock'),
        size.name+': shared deep link did not restore Red Rock');
      await deep.close();
    }
    await page.locator('#ctb-stop').selectOption('24');
    await page.locator('#ctb-theme').selectOption('ships');
    check(await page.locator('#ctb-decision .ctb-arrivals').count()===0,
      size.name+': ships filter showed waterfall starting points');
    await page.locator('#ctb-decision .ctb-stage-reset').click();
    check(await page.locator('#ctb-decision .ctb-arrivals').count()===1,
      size.name+': unsupported interest recovery lost the correct arrival');
    await page.locator('#ctb-stop').selectOption('27');
    check(await page.locator('#ctb-decision .ctb-arrivals').count()===0,
      size.name+': independent specialist was overwritten by arrival desk');
    await page.locator('#ctb-stop').selectOption('26');
    check(await page.locator('#ctb-decision .ctb-place-story').count()===1,
      size.name+': Tettegouche story missing when no specialist is released');
    check(new URL(await page.locator('#ctb-decision .ctb-stage-primary').getAttribute('href')).hostname==='www.dnr.state.mn.us',
      size.name+': official Tettegouche reference must stay on DNR host');
    await page.locator('#ctb-stop').selectOption('27');
    check(await page.locator('#ctb-decision .ctb-stage-primary').count()===1,
      size.name+': Split Rock lost the approved specialist');
    await page.locator('#ctb-stop').selectOption('25');
    check(await page.locator('#ctb-decision .ctb-place-story').count()===1,
      size.name+': Temperance and Lutsen are missing their exact-place story');
    await page.locator('#ctb-stop').selectOption('24');
    check(await page.locator('#ctb-decision .ctb-place-story').count()===1,
      size.name+': Cascade River is missing its exact-place story');
    await page.locator('#ctb-stop').selectOption('22');
    check(await page.locator('#ctb-decision .ctb-place-story').count()===0,
      size.name+': unrelated unresearched stop inherited another park photograph');
    await page.locator('#ctb-stop').selectOption('11');
    await page.locator('#ctb-theme').selectOption('water');
    await page.waitForFunction(()=>document.querySelector('#ctb-status')?.textContent.includes('approved connection'));
    const items=await page.locator('#ctb-results .ctb-entry').count();
    check(items>0,size.name+': Pictured Rocks connections missing');
    check((await page.locator('#ctb-decision').textContent()).includes('Choose a boat, kayak'),size.name+': next question not actionable');
    check((await page.locator('#ctb-decision').textContent()).includes('What this does not establish'),size.name+': evidence boundary not visible');
    check((await page.locator('#ctb-decision .ctb-stage-primary').getAttribute('href'))==='https://picturedrocks.chrisizworski.com/',
      size.name+': first next-check canonical incorrect');
    const stopCount=await page.locator('#ctb-results .ctb-stop-link').allTextContents();
    check(stopCount.every(x=>x.startsWith('Stop 11')),size.name+': focus not respected');
    const target=page.locator('#ctb-results .ctb-link').first();
    check(await target.getAttribute('target')==='_blank',size.name+': independent tool link must open in new tab');
    check((await target.getAttribute('href')).startsWith('https://'),size.name+': canonical HTTPS link missing');
    await page.locator('#ctb-date').fill('2027-02-16');
    await page.locator('#ctb-date').press('Tab');
    await page.waitForFunction(()=>location.search.includes('ctDate=2027-02-16'));
    check(await page.locator('#ctb-season-caution').count()===0,size.name+': unexpected legacy selector');
    check(await page.locator('#ctb-results .ctb-season-caution').count()>0,size.name+': off-season caveat lost');
    const saved=new URL(page.url());
    check(saved.searchParams.get('ctStop')==='11'&&saved.searchParams.get('ctTheme')==='water',size.name+': shareable selection lost');
    // Trip planner remains a separate functioning owner.
    await page.locator('#stop-15 .add-btn').click();
    await page.waitForFunction(()=>document.querySelector('#stop-15 .add-btn')?.getAttribute('aria-pressed')==='true');
    check((await page.locator('#stop-15 .add-btn').getAttribute('aria-pressed'))==='true',size.name+': existing planner failed');
    await page.locator('#ctb-stop').selectOption('');
    await page.locator('#ctb-theme').selectOption('parks');
    await page.waitForFunction(()=>document.querySelector('#ctb-status')?.textContent.includes('approved connection'));
    const selectedResults=await page.locator('#ctb-results .ctb-stop-link').allTextContents();
    check(selectedResults.length>0&&selectedResults.every(x=>x.startsWith('Stop 15')),size.name+': selected trip ignored');
    check((await page.locator('#ctb-decision .ctb-stage-title').textContent()).includes('Lake Superior Provincial Park'),
      size.name+': selected stop did not change primary answer');
    await page.locator('#stop-18 .add-btn').click();
    await page.waitForFunction(()=>document.querySelector('#stop-18 .add-btn')?.getAttribute('aria-pressed')==='true');
    check(await page.locator('#ctb-decision .ctb-nav-button').count()===2,size.name+': route progression missing');
    await page.locator('#ctb-decision .ctb-nav-button').last().focus();
    await page.keyboard.press('Enter');
    check((await page.locator('#ctb-decision .ctb-stage-title').textContent()).includes('Pukaskwa'),
      size.name+': keyboard progression did not change the decision');
    await page.locator('#ctb-decision .ctb-nav-button').first().click();
    check((await page.locator('#ctb-decision .ctb-stage-title').textContent()).includes('Lake Superior Provincial Park'),
      size.name+': previous planned stop did not reverse the selection');
    await page.locator('#ctb-decision .ctb-nav-button').last().click();
    check((await page.locator('#ctb-decision .ctb-stage-title').textContent()).includes('Pukaskwa'),
      size.name+': A-B-A re-entry lost progression');
    await page.locator('#ctb-theme').selectOption('ships');
    check((await page.locator('#ctb-decision').textContent()).includes('There is no connected guide for this interest'),
      size.name+': unsupported interest invented a result');
    await page.locator('#ctb-decision .ctb-stage-reset').click();
    check((await page.locator('#ctb-decision').textContent()).includes('ONE USEFUL NEXT CHECK'),
      size.name+': reset did not restore a grounded choice');
    // The original CircleTourPage opens its own mobile trip sheet after Add.
    // Verify that it can be dismissed and capture the independent bridge unobstructed.
    const mobileSheet=page.locator('#mobileTripSheet');
    if(await mobileSheet.evaluate(el=>el.classList.contains('open'))){
      await page.locator('#mobileTripClose').click();
      check(!(await mobileSheet.evaluate(el=>el.classList.contains('open'))),size.name+': original trip sheet could not close');
    }
    if(size.width<=760){
      // The original sheet has a 220ms exit transition. Its class is removed
      // synchronously, but screenshots made immediately still capture the overlay.
      await page.waitForFunction(()=>document.querySelector('#mobileTripSheet').getBoundingClientRect().top>=innerHeight-1,
        null,{timeout:5000});
    }
    const railVisibility=await page.evaluate(()=>{
      const rail=document.querySelector('#ctb-route'),current=rail?.querySelector('button[aria-pressed="true"]');
      if(!rail||!current)return {found:false};
      const a=rail.getBoundingClientRect(),b=current.getBoundingClientRect();
      return {found:true,left:b.left-a.left,right:a.right-b.right};
    });
    check(railVisibility.found&&railVisibility.left>=-2&&railVisibility.right>=-2,
      size.name+': focused stop chip was hidden under horizontal rail '+JSON.stringify(railVisibility));
    // A real viewport capture verifies the actual fixed overlay behavior. A tall
    // element screenshot can stitch fixed controls at arbitrary positions, even
    // after the sheet is fully offscreen, so it is not sufficient evidence.
    await page.locator('#ctb-decision').scrollIntoViewIfNeeded();
    const sheetState=await page.evaluate(()=>{
      const sheet=document.querySelector('#mobileTripSheet');
      return {open:sheet.classList.contains('open'),top:sheet.getBoundingClientRect().top,viewport:innerHeight};
    });
    check(!sheetState.open&&sheetState.top>=sheetState.viewport-2,
      size.name+': original mobile drawer is genuinely covering decision '+JSON.stringify(sheetState));
    await page.screenshot({path:path.join(out,size.name+'-viewport.png'),animations:'disabled',timeout:25000});
    // Isolated full-height design evidence masks only the existing, fixed
    // original planner drawer/trigger during the screenshot. The live UI is unchanged.
    await page.locator('#circle-tour-tool-bridge').screenshot({
      path:path.join(out,size.name+'.png'),timeout:25000,animations:'disabled',
      style:'#mobileTripSheet,#mobileTripBackdrop,#mobileTripTrigger{visibility:hidden!important}'
    });
    report.screenshots.push(size.name+'-viewport.png',size.name+'.png');
    report.cases.push({viewport:size.name,initial:count,focus:items,selectedTrip:selectedResults.length,overflow:false,contextUrl:true});
    await ctx.close();
  }
  // A published, actually applied clockwise route may reverse sequence; a generic
  // preview-only direction control cannot silently reorder a custom selection.
  const routeCtx=await browser.newContext({viewport:{width:390,height:844}}),routePage=await routeCtx.newPage();
  await routePage.goto(url+'?plan=18%2C15%2C11&itinerary=10&direction=clockwise&ctTheme=parks',{waitUntil:'domcontentloaded',timeout:35000});
  await routePage.waitForFunction(()=>document.querySelector('#ctb-decision .ctb-stage-title')?.textContent.includes('Pukaskwa'),null,{timeout:30000});
  check((await routePage.locator('#ctb-decision').textContent()).includes('STOP 1 OF 3'),'published route should have a real step');
  await routePage.locator('#ctb-decision .ctb-nav-button').last().click();
  check((await routePage.locator('#ctb-decision .ctb-stage-title').textContent()).includes('Lake Superior Provincial Park'),
    'clockwise next stop did not preserve applied direction');
  report.cases.push({state:'applied clockwise published route',result:'ordered stop 18 to stop 15 without changing original planner'});
  await routeCtx.close();

  // Blocking the original map import does not block the independent evidence desk.
  const tileContext=await browser.newContext({viewport:{width:390,height:844}}),tilePage=await tileContext.newPage();
  await tilePage.route('**/assets/lake-superior-circle-tour-map.js*',route=>route.abort());
  await tilePage.goto(url+'?plan=11&ctTheme=water',{waitUntil:'domcontentloaded',timeout:35000});
  await tilePage.waitForFunction(()=>document.querySelector('#ctb-decision .ctb-stage-title')?.textContent.includes('Pictured Rocks'),null,{timeout:30000});
  check((await tilePage.locator('#ctb-decision .ctb-stage-primary').getAttribute('href'))==='https://picturedrocks.chrisizworski.com/',
    'missing basemap import incorrectly blocked independent specialist action');
  report.cases.push({state:'map import unavailable',result:'independent specialist decision remains actionable'});
  await tileContext.close();

  // A broken image CDN must drop empty photo slots and leave truthful text and the real action.
  const photoFailureCtx=await browser.newContext({viewport:{width:390,height:844}});
  const photoFailurePage=await photoFailureCtx.newPage();
  await photoFailurePage.route('**/wikipedia/commons/thumb/**',route=>route.abort());
  await photoFailurePage.goto(url+'?ctStop=15&ctTheme=parks',{waitUntil:'domcontentloaded',timeout:35000});
  await photoFailurePage.waitForFunction(()=>document.querySelector('#ctb-decision .ctb-place-story')?.textContent.includes('Old Woman Bay'),null,{timeout:30000});
  await photoFailurePage.locator('#ctb-decision .ctb-place-story').scrollIntoViewIfNeeded();
  await photoFailurePage.waitForFunction(()=>document.querySelector('#ctb-decision .ctb-place-gallery')===null,null,{timeout:20000});
  check((await photoFailurePage.locator('#ctb-decision .ctb-place-story').textContent()).includes('Nokomis'),
    'Image failure suppressed the researched landscape narrative');
  check(await photoFailurePage.locator('#ctb-decision .ctb-stage-primary').count()===1,
    'Image failure hid the useful specialist next check');
  report.cases.push({state:'photography source unavailable',result:'text and specialist action remain; empty photo frames removed'});
  await photoFailureCtx.close();

  // Bridge failure must never take down original route, atlas or static backup.
  const context=await browser.newContext({viewport:{width:390,height:844}}),failPage=await context.newPage();
  await failPage.route('**/circle-tour-tool-catalog.json',route=>route.fulfill({status:503,body:'unavailable'}));
  await failPage.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
  await failPage.waitForFunction(()=>document.querySelector('#ctb-status')?.textContent.includes('temporarily unavailable'),null,{timeout:30000});
  check(await failPage.locator('#ctb-fallback').isVisible(),'fallback missing for catalog failure');
  check(await failPage.locator('article.stop-card').count()===31,'catalog failure broke original route');
  report.cases.push({state:'catalog failure',result:'static fallback and 31 stops retained'});
  await context.close();

  // Native WASM must be optional, but its absence cannot reclassify a missing
  // road segment, zero out a border reserve, or change the original mileages.
  const rustFallbackCtx=await browser.newContext({viewport:{width:390,height:844}});
  const rustFallback=await rustFallbackCtx.newPage();
  await rustFallback.route('**/assets/shared-itinerary.wasm.b64*',route=>route.abort());
  await rustFallback.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
  await rustFallback.waitForFunction(()=>!!window.CircleTourRust?.activate,null,{timeout:30000});
  await rustFallback.evaluate(()=>window.CircleTourRust.activate());
  check(await rustFallback.evaluate(()=>window.CircleTourRust.engine())==='js-parity',
    'blocked WASM did not activate independent JS source oracle');
  await rustFallback.waitForFunction(()=>document.querySelector('#routePreviewMeta')?.textContent.includes('1,358'),
    null,{timeout:30000});
  check(await rustFallback.evaluate(()=>window.CircleTourRust.evidenceMiles('7','8'))===null,
    'blocked WASM invented an unverified road distance');
  check(await rustFallback.locator('article.stop-card').count()===31,
    'blocked WASM removed original source stop cards');
  report.cases.push({state:'shared WASM unavailable',result:'JS source evidence, 31 stops and published estimate retained'});
  await rustFallbackCtx.close();


  // First dedicated crawlable itinerary: the server returns complete Article
  // content without JS, while the client uses the real expanded Rust ABI.
  for(const width of [390,1366]){
    const guideCtx=await browser.newContext({viewport:{width,height:844}});
    const guide=await guideCtx.newPage();
    const response=await guide.goto(url+'10-day/',{waitUntil:'domcontentloaded',timeout:35000});
    check(response.status()===200,'10-day static page not served');
    check(await guide.locator('article.day').count()===10,'10-day source-rendered day cards missing');
    check((await guide.title()).includes('10-Day Itinerary'),'10-day search title missing');
    check(await guide.locator('link[rel="canonical"]').getAttribute('href')===
      'https://chrisizworski.com/lake-superior-circle-tour/10-day/','incorrect canonical');
    await guide.waitForFunction(()=>window.CircleTourRust?.engine?.()==='rust-wasm',null,{timeout:20000});
    await guide.waitForFunction(()=>document.querySelector('#day-10 .day-state')?.dataset.code==='4',null,{timeout:20000});
    check(await guide.locator('#day-10 .day-state').getAttribute('data-code')==='4',
      'unverified Pigeon River park approach was promoted into a timed arrival');
    await guide.locator('#ct-hours').selectOption('7').catch(()=>null); // 7 is not an offered editorial budget.
    await guide.locator('#ct-hours').selectOption('8');
    check(await guide.locator('#day-9 .day-state').getAttribute('data-code')==='3',
      'long Ontario driving day should exceed an eight-hour budget');
    await guide.locator('#ct-season').selectOption('winter');
    check(await guide.locator('#day-7 .day-state').getAttribute('data-code')==='5',
      'winter-sensitive park itinerary must prompt verification');
    check(await guide.locator('#day-10 .day-state').getAttribute('data-code')==='4',
      'winter advisory must not override incomplete road evidence');
    const viewport=await guide.evaluate(()=>({wide:document.documentElement.scrollWidth,screen:innerWidth}));
    check(viewport.wide<=viewport.screen+2,'new itinerary causes mobile horizontal overflow');
    report.cases.push({state:width+'px 10-day search page',result:'canonical, 10 source-rendered days, real Rust budget and incomplete-leg veto'});
    await guideCtx.close();
  }
  const noRustGuideCtx=await browser.newContext({viewport:{width:390,height:844}});
  const noRustGuide=await noRustGuideCtx.newPage();
  await noRustGuide.route('**/assets/shared-itinerary.wasm.b64*',route=>route.abort());
  await noRustGuide.goto(url+'10-day/',{waitUntil:'domcontentloaded',timeout:35000});
  await noRustGuide.waitForFunction(()=>document.querySelector('#day-10 .day-state')?.dataset.code==='4',null,{timeout:20000});
  check(await noRustGuide.evaluate(()=>window.CircleTourRust.engine())==='js-parity',
    'missing WASM did not preserve independent source-safe 10-day itinerary');
  check(await noRustGuide.locator('article.day').count()===10,
    'missing WASM removed crawlable editorial days');
  report.cases.push({state:'10-day wasm blocked',result:'source-rendered days and source-safe JS feasibility survive'});
  await noRustGuideCtx.close();

  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),staticPage=await noJs.newPage();
  await staticPage.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
  check(await staticPage.locator('#ctb-fallback').isVisible(),'no-JS fallback not visible');
  check(await staticPage.locator('#ctb-fallback a').count()>=8,'no-JS specialist and highway handoffs missing');
  check(await staticPage.locator('article.stop-card').count()===31,'no-JS original itinerary lost');
  report.cases.push({state:'no JavaScript',result:'canonical independent links and all 31 stop cards visible'});
  await noJs.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('CIRCLE TOUR CONNECTION BROWSER QA PASS',JSON.stringify(report));
 }catch(error){
   report.failures.push(String(error.stack||error));
   fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
   throw error;
 }finally{
   if(browser)await browser.close();
   await new Promise(done=>server.close(done));
 }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
