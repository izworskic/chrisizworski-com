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
    const rel=uri.pathname==='/lake-superior-circle-tour/'?'/lake-superior-circle-tour/index.html':uri.pathname;
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
    await page.locator('#ctb-stop').selectOption('26');
    check(await page.locator('#ctb-decision .ctb-place-story').count()===1,
      size.name+': Tettegouche story missing when no specialist is released');
    check(await page.locator('#ctb-decision .ctb-stage-primary').count()===0,
      size.name+': Tettegouche falsely gained a specialist');
    await page.locator('#ctb-stop').selectOption('27');
    check(await page.locator('#ctb-decision .ctb-stage-primary').count()===1,
      size.name+': Split Rock lost the approved specialist');
    await page.locator('#ctb-stop').selectOption('25');
    check(await page.locator('#ctb-decision .ctb-place-story').count()===0,
      size.name+': unresearched Lutsen stop inherited photographs');
    await page.locator('#ctb-stop').selectOption('24');
    check(await page.locator('#ctb-decision .ctb-place-story').count()===0,
      size.name+': unresearched stop inherited a different park photograph');
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
    check((await page.locator('#ctb-decision').textContent()).includes('No approved specialist'),
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
