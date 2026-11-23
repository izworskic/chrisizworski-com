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
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
function snapshot(){
 const now=new Date().toISOString(),report=new Date(Date.now()-60*60*1000).toISOString();
 return {ok:true,generatedAt:now,season:'2026-27',policy:'PROVISIONAL',health:{nwsAlerts:'UNAVAILABLE',localStormReports:'UNAVAILABLE',nwsGridAvailable:0,officialReportsChecked:16,officialReportsParsed:mode==='one-open'?1:0},resorts:RESORTS.map(r=>{
  const isOpen=mode==='one-open'&&r.slug==='caberfae-peaks';
  return {...r,official:r.slug==='alpine-valley'?{status:'NOT_CONNECTED',url:null,checkedAt:now}:isOpen?
   {status:'OPEN_PER_OPERATOR',url:'https://caberfaepeaks.com/snow-report/',lifts:{open:2,total:5},trails:{open:8,total:27},reportUpdatedAt:report,checkedAt:now}:
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
  for(const width of [360,1440]){
   mode='one-open';
   const ctx=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   need(response.status()===200,width+' hub loads');
   await page.waitForFunction(()=>document.querySelector('#ski-open-count')?.textContent.includes('1 of 17'),null,{timeout:20000});
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===17,width+' displays all downhill hills');
   need((await page.locator('#ski-operating-list').innerText()).includes('Caberfae Peaks'),width+' shows named official result');
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
   await page.locator('#ski-open-filter').click();
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===17,width+' filter restores all hills');
   need(await page.locator('#resort-list .hill').count()===18,width+' full ranking includes Nordic option');
   mode='all-down';
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#ski-open-count')?.textContent.includes('0 of 17'),null,{timeout:20000});
   need(await page.locator('#ski-operating-list .ski-operation-row').count()===17,width+' all-down links retained');
   const failure=await page.locator('#ski-operating-list').innerText();
   need(failure.includes('No dated operator reports were verified'),width+' all-down caution visible');
   need(!failure.includes('Open per operator'),width+' no false open when all operator sources fail');
   const down=path.join(out,width+'-all-sources-down.png');
   await page.locator('.ski-operations').screenshot({path:down});report.screenshots.push(path.basename(down));
   need(errors.length===0,width+' browser exceptions '+errors.join('; '));
   report.cases.push({width,initial:17,openFiltered:1,allSourcesDownNoOpen:true,overflow:false,jsErrors:errors.length});
   await ctx.close();
  }
  const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:900}});
  const page=await ctx.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  need(await page.locator('.ski-opening-evidence tbody tr').count()===17,'no-JS opening date table');
  need((await page.locator('.ski-operations').innerText()).includes('Are Michigan ski resorts open?'),'no-JS answer');
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
