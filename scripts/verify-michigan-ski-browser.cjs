#!/usr/bin/env node
'use strict';
// Browser acceptance against real build-generated HTML/JS; mocked API scenarios
// are explicitly test-only, never claims of a real resort's operating status.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const chromium=require('playwright').chromium;
const {RESORTS}=require('../lib/michigan-ski/resorts');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/michigan-ski');
fs.mkdirSync(out,{recursive:true});
let mode='one-open';
const beforeTarget=Date.parse('2026-11-25T17:00:00Z'),afterTarget=Date.parse('2026-11-27T17:00:00Z');
let fixtureNow=beforeTarget;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
function snapshot(){
 const now=new Date(fixtureNow).toISOString(),report=new Date(fixtureNow-60*60*1000).toISOString();
 return {ok:true,generatedAt:now,season:'2026-27',policy:'PROVISIONAL',health:{nwsAlerts:'UNAVAILABLE',localStormReports:'UNAVAILABLE',nwsGridAvailable:0,officialReportsChecked:16,officialReportsParsed:mode==='one-open'?2:0},resorts:RESORTS.map(r=>{
  const isOpen=mode==='one-open'&&r.slug==='caberfae-peaks';
  const isClosed=mode==='one-open'&&r.slug==='nubs-nob';
  return {...r,official:isClosed?{status:'CLOSED_PER_OPERATOR',url:r.snow,lifts:{open:0,total:5},reportUpdatedAt:report,checkedAt:now}:r.slug==='alpine-valley'?{status:'NOT_CONNECTED',url:null,checkedAt:now}:isOpen?
   {status:'OPEN_PER_OPERATOR',url:'https://caberfaepeaks.com/snow-report/',lifts:{open:2,total:5},trails:{open:8,total:27},reportUpdatedAt:report,checkedAt:now}:
   mode==='undated'&&r.slug==='pine-knob'?
   {status:'UNVERIFIED',url:r.snow,reason:'UNDATED_OPERATOR_REPORT',lifts:{open:0,total:13},reportUpdatedAt:null,checkedAt:now}:
   mode==='undated'&&r.slug==='snowriver'?
   {status:'UNVERIFIED',url:r.snow,reason:'UNDATED_OPERATOR_REPORT',lifts:{open:1,total:10},operatorStatusText:'Anticipated opening December 5',reportUpdatedAt:null,checkedAt:now}:
   {status:'UNVERIFIED',url:r.snow,reason:'SOURCE_UNAVAILABLE',reportUpdatedAt:null,checkedAt:now},
   ranking:{score:null,verdict:'OFF_SEASON_PLANNING',components:{travelValue:0}},
   weather:{alerts:[],weatherCoverage:'NWS_GRID_UNAVAILABLE',skiDays:{
    saturday:{date:'2026-11-28',snowInches:null,lowF:null,highF:null},
    sunday:{date:'2026-11-29',snowInches:null,lowF:null,highF:null}},
    report24:null,report48:null,forecastSnowInches:null,lakeEffectWind:{status:'DATA_UNAVAILABLE'},
    snowmaking:{status:'UNAVAILABLE'}}};
 })};
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/api/michigan-ski'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(snapshot()));return;}
  const route=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=path.resolve(root,'.'+route);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const st=await fs.promises.stat(file).catch(()=>null);
  if(!st?.isFile()){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  res.end(await fs.promises.readFile(file));
 }catch{res.writeHead(500);res.end('Error');}
});
function need(ok,label){if(!ok)throw Error(label);}
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/michigan-ski-hills/';
 const report={date:new Date().toISOString(),cases:[],screenshots:[],errors:[]};
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [360,390,768,1280,1440]){
   mode='one-open';fixtureNow=beforeTarget;
   const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[];
   await page.clock.setFixedTime(new Date(fixtureNow));
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   need(response.status()===200,width+' hub loads');
   await page.waitForFunction(()=>document.querySelector('#ski-open-count')?.textContent.includes('1 confirmed open'),null,{timeout:20000});
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===17,width+' displays all downhill hills');
   need((await page.locator('#ski-operating-list').innerText()).includes('Caberfae Peaks'),width+' shows named official result');
   const closedRow=page.locator('.ski-operation-row').filter({hasText:"Nub's Nob"});
   need((await closedRow.innerText()).includes('lists zero lifts running'),width+' closed report has consistent evidence');
   need(!(await closedRow.innerText()).includes('could not be established'),width+' no contradictory closure note');
   const openRow=page.locator('.ski-operation-row').filter({hasText:'Caberfae Peaks'});
   need((await openRow.innerText()).includes('confirms lifts running'),width+' open report has consistent evidence');
   await page.waitForFunction(()=>document.querySelectorAll('#ski-resort-carousel .ski-carousel-card').length===18,null,{timeout:20000});
   need(await page.locator('#ski-point-map .ski-dot').count()===18,width+' map contains all 18 resort markers');
   need(await page.locator('#ski-resort-carousel .is-selected').count()===1,width+' exactly one selected card');
   const dynamicMaps=await page.locator('.ski-carousel-card').evaluateAll(cards=>cards.map(card=>({name:card.querySelector('.ski-card-select').textContent,href:card.querySelector('.ski-card-maps')?.href,staticHref:document.querySelector('.ski-directory a[href="/michigan-ski-hills/'+card.dataset.slug+'/"]')?.parentElement.querySelector('.ski-directory-maps')?.href})));
   need(dynamicMaps.every(v=>v.href&&v.href===v.staticHref&&new URL(v.href).pathname==='/maps/search/'&&new URL(v.href).searchParams.get('query').startsWith(v.name+',')),width+' named resort search matches no-JS link');
   const first=await page.locator('#ski-resort-carousel .is-selected').getAttribute('data-slug');
   await page.locator('#ski-carousel-next').click();
   need(await page.locator('#ski-resort-carousel .is-selected').getAttribute('data-slug')!==first,width+' next arrow changes selected hill');
   need(await page.locator('#ski-point-map .ski-dot.selected').getAttribute('data-slug')===await page.locator('#ski-resort-carousel .is-selected').getAttribute('data-slug'),width+' pin and carousel match');
   await page.locator('#ski-carousel-prev').click();
   need(await page.locator('#ski-resort-carousel .is-selected').getAttribute('data-slug')===first,width+' A-B-A selection is reversible');
   await page.locator('#ski-point-map .ski-dot[data-slug="mt-bohemia"]').click();
   need(await page.locator('#ski-resort-carousel .is-selected').getAttribute('data-slug')==='mt-bohemia',width+' selecting map pin opens the correct card');
   // Horizontal scrolling must reach every trailing card, not just the arrows.
   const cardSlugs=await page.locator('#ski-resort-carousel .ski-carousel-card').evaluateAll(cards=>cards.map(card=>card.dataset.slug));
   for(const slug of cardSlugs.slice(-3)){
    await page.locator('#ski-resort-carousel').evaluate((track,slug)=>{
     const card=Array.from(track.querySelectorAll('.ski-carousel-card')).find(card=>card.dataset.slug===slug);
     const origin=track.getBoundingClientRect().left+parseFloat(getComputedStyle(track).scrollPaddingLeft);
     track.scrollTo({left:track.scrollLeft+card.getBoundingClientRect().left-origin,behavior:'instant'});
    },slug);
    try{
     await page.waitForFunction(slug=>document.querySelector('#ski-resort-carousel .is-selected')?.dataset.slug===slug,slug,{timeout:5000});
    }catch(error){
     const state=await page.locator('#ski-resort-carousel').evaluate(track=>({left:track.scrollLeft,max:track.scrollWidth-track.clientWidth,selected:track.querySelector('.is-selected')?.dataset.slug,positions:Array.from(track.querySelectorAll('.ski-carousel-card')).slice(-3).map(card=>({slug:card.dataset.slug,left:card.getBoundingClientRect().left-track.getBoundingClientRect().left}))}));
     throw Error(width+' trailing scroll failed for '+slug+' '+JSON.stringify(state),{cause:error});
    }
    need(await page.locator('#ski-point-map .ski-dot.selected').getAttribute('data-slug')===slug,width+' trailing scroll selects matching pin '+slug);
   }
   need(await page.locator('#ski-carousel-next').isDisabled(),width+' last card disables next');
   await page.locator('#ski-day').selectOption('sunday');
   need((await page.locator('#ski-resort-carousel .is-selected').innerText()).includes('Sunday'),width+' carousel switches the NWS day');
   await page.locator('#ski-day').selectOption('saturday');
   const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
   need(overflow.scroll<=overflow.viewport+2,width+' horizontal overflow '+JSON.stringify(overflow));
   const title=await page.title();
   need(title==='Michigan Ski Resorts Open Today: Lifts & Snow',width+' title gate');
   const top=path.join(out,width+'-top.png');
   await page.screenshot({path:top});report.screenshots.push(path.basename(top));
   const board=path.join(out,width+'-operator-board.png');
   await page.locator('.ski-operations').screenshot({path:board});report.screenshots.push(path.basename(board));
   await page.locator('#ski-open-filter').click();
   need(await page.locator('#ski-open-filter').getAttribute('aria-pressed')==='true',width+' open filter pressed');
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===1,width+' filtered operating board');
   need(await page.locator('#resort-list .hill').count()===1,width+' filtered all hills list');
   need(await page.locator('#ski-resort-carousel .ski-carousel-card').count()===1,width+' open-now filter changes carousel');
   need(await page.locator('#ski-point-map .ski-dot').count()===1,width+' open-now filter changes map');
   await page.locator('#ski-plan-filter').click();
   need(await page.locator('#ski-plan-filter').getAttribute('aria-pressed')==='true',width+' plans filter pressed');
   need(await page.locator('#ski-open-filter').getAttribute('aria-pressed')==='false',width+' exclusive filters');
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===6,width+' six published plans');
   need(await page.locator('#resort-list .hill').count()===6,width+' resort comparison follows planned view');
   need(await page.locator('#ski-resort-carousel .ski-carousel-card').count()===6,width+' opening plans filter changes carousel');
   need(await page.locator('#ski-point-map .ski-dot').count()===6,width+' opening plans filter changes map');
   need((await page.locator('#ski-operating-list .ski-operation-row').first().innerText()).includes('Ski Brule'),width+' earliest plan first');
   need((await page.locator('#ski-filter-result').innerText()).includes('not confirmed openings'),width+' no plan treated as open');
   await page.locator('#region').selectOption('northern-lower');
   need(await page.locator('#region').inputValue()==='northern-lower',width+' one shared area selection');
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===4,width+' four northern lower plans');
   need(await page.locator('#resort-list .hill').count()===4,width+' main list area sync');
   need(await page.locator('#ski-resort-carousel .ski-carousel-card').count()===4,width+' region filters map carousel');
   await page.locator('#region').selectOption('western-up');
   need(await page.locator('#ski-resort-carousel .ski-carousel-card').count()===1,width+' western UP filter updates carousel');
   await page.locator('#region').selectOption('all');
   await page.locator('#ski-open-filter').click();
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===1,width+' plans to open');
   need(await page.locator('#ski-plan-filter').getAttribute('aria-pressed')==='false',width+' plans mode reset');
   await page.locator('#ski-open-filter').click();
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===17,width+' A-B-A restores all');
   need(await page.locator('#resort-list .hill').count()===18,width+' full ranking includes Nordic option');
   need(await page.locator('#ski-resort-carousel .ski-carousel-card').count()===18,width+' reset restores all map carousel cards');
   mode='all-down';
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#ski-open-count')?.textContent.includes('0 confirmed open'),null,{timeout:20000});
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===17,width+' all-down links retained');
   const failure=await page.locator('#ski-operating-list').innerText();
   need(failure.includes('No dated operator reports were verified'),width+' all-down caution visible');
   need(!failure.includes('Open per operator'),width+' no false open when all operator sources fail');
   need((await page.locator('#ski-operating-list').innerText()).includes('Next operator-announced opening target: Ski Brule'),width+' operator opening plan shown during source failures');
   need(await page.locator('.ski-unconfirmed').count()===1,width+' groups source gaps into an expandable summary');
   const down=path.join(out,width+'-all-sources-down.png');
   await page.locator('.ski-operations').screenshot({path:down});report.screenshots.push(path.basename(down));
   fixtureNow=afterTarget;
   await page.clock.setFixedTime(new Date(fixtureNow));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#ski-open-count')?.textContent.includes('0 confirmed open'),null,{timeout:20000});
   const nextTarget=await page.locator('.ski-next-opening').innerText();
   need(nextTarget.includes('Next operator-announced opening target: Crystal Mountain'),width+' expired November 26 target excluded');
   need(!nextTarget.includes('Ski Brule'),width+' past target not labeled upcoming');
   mode='undated';
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#ski-open-count')?.textContent.includes('0 confirmed open'),null,{timeout:20000});
   await page.locator('.ski-unconfirmed summary').click();
   const uncertain=await page.locator('#ski-operating-list').innerText();
   need(uncertain.includes('0 lifts listed · undated'),width+' zero-lift count is explicitly undated');
   need(uncertain.includes('Lift count undated'),width+' undated positive count cannot claim open');
   need(!uncertain.includes('Open per operator'),width+' no invented opening from a stale one-lift count');
   need(errors.length===0,width+' browser exceptions '+errors.join('; '));
   report.cases.push({width,initial:17,openFiltered:1,plansFiltered:6,regionFiltered:4,allSourcesDownNoOpen:true,overflow:false,jsErrors:errors.length});
   await ctx.close();
  }
  const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:900}});
  const page=await ctx.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  need(await page.locator('.ski-opening-evidence tbody tr').count()===17,'no-JS opening date table');
  need((await page.locator('.ski-operations').innerText()).includes('Which Michigan ski resorts are open today?'),'no-JS answer');
  need(!(await page.locator('#ski-open-filter').isVisible()),'no-JS Open now hidden');
  need(!(await page.locator('#ski-plan-filter').isVisible()),'no-JS Opening plans hidden');
  need(!(await page.locator('#ski-resort-carousel').isVisible()),'no-JS map carousel hidden without working script');
  need(await page.locator('.ski-directory a:not(.ski-directory-maps)').count()===18,'all 18 guide links available with no JavaScript');
  need(await page.locator('.ski-directory-maps').count()===18,'all 18 named Google Maps searches available with no JavaScript');
  const staticMaps=await page.locator('.ski-directory-maps').evaluateAll(links=>links.map(a=>a.href));
  need(staticMaps.every(h=>new URL(h).pathname==='/maps/search/'&&new URL(h).searchParams.has('query')),'static links are searches, not directions');
  const img=path.join(out,'360-no-javascript.png');await page.screenshot({path:img});report.screenshots.push(path.basename(img));
  report.cases.push({width:360,javaScript:false,openingRows:17,answerVisible:true});
  await ctx.close();
 }catch(e){report.errors.push(String(e.stack||e));throw e;}
 finally{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
}
run().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
