'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'),out=path.resolve(__dirname,'../artifacts/journey-atlas');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try {
    const u=new URL(req.url,'http://127.0.0.1');
    if(u.pathname==='/api/carto-basemap-config'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{}');return;}
    const route=u.pathname==='/lake-superior-circle-tour/'?'/lake-superior-circle-tour/index.html':u.pathname;
    const f=path.resolve(root,'.'+route);
    if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const st=await fs.promises.stat(f).catch(()=>null);
    if(!st?.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});
    res.end(await fs.promises.readFile(f));
  }catch{res.writeHead(500);res.end('Test server error');}
});
function check(ok,msg){if(!ok)throw Error(msg);}
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port+'/lake-superior-circle-tour/';
 const report={screenshots:[],tests:[],failures:[]};
 let browser;
 try {
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const size of [{name:'mobile',width:390,height:844},{name:'desktop',width:1366,height:900}]){
    const ctx=await browser.newContext({viewport:{width:size.width,height:size.height}}),page=await ctx.newPage();
    const resp=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    check(resp.status()===200,size.name+' response');
    await page.waitForFunction(()=>document.querySelector('[data-journey-atlas]')?.dataset.jaReady==='true',null,{timeout:25000});
    check(await page.locator('#journey-atlas article.ja-card').count()===10,size.name+' card count');
    check(await page.locator('#journey-atlas article.ja-card:visible').count()===3,size.name+' initial suggestions');
    const widths=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
    check(widths.document<=widths.viewport+2,size.name+' horizontal overflow '+JSON.stringify(widths));
    await page.locator('#ja-region').selectOption('on');
    await page.locator('#ja-interest').selectOption('hiking');
    await page.locator('#ja-time').selectOption('short');
    check(await page.locator('#journey-atlas article.ja-card:visible').count()===1,size.name+' intersection filtering');
    await page.locator('#ja-interest').selectOption('maritime');
    check(await page.locator('#journey-atlas article.ja-card:visible').count()===0,size.name+' no match');
    check(await page.locator('#journey-atlas [data-ja-empty]').isVisible(),size.name+' no-match message');
    await page.locator('#journey-atlas [data-ja-reset]').click();
    check(await page.locator('#journey-atlas article.ja-card:visible').count()===3,size.name+' reset');
    await page.locator('#journey-atlas [data-ja-more]').click();
    check(await page.locator('#journey-atlas article.ja-card:visible').count()===10,size.name+' reveal all');
    check(await page.locator('#journey-atlas figure.ja-photo figcaption').count()===10,size.name+' ten photo credits');
    const imgs=page.locator('#journey-atlas figure.ja-photo img');
    check(await imgs.count()===10,size.name+' photographs missing');
    for(let i=0;i<10;i++){
      const el=imgs.nth(i);
      await el.scrollIntoViewIfNeeded({timeout:20000});
      await page.waitForFunction(index=>{const img=document.querySelectorAll('#journey-atlas figure.ja-photo img')[index];return img&&img.complete;},i,{timeout:25000});
      const state=await el.evaluate(img=>({url:img.currentSrc,width:img.naturalWidth}));
      check(state.width>0,size.name+' photograph '+i+' failed to load '+state.url);
    }
    await page.locator('#journey-atlas [data-ja-add-stop="15"]').click();
    await page.waitForFunction(()=>document.querySelector('#stop-15 .add-btn')?.getAttribute('aria-pressed')==='true',null,{timeout:12000});
    const filename=size.name+'-atlas.png';
    await page.locator('#journey-atlas').screenshot({path:path.join(out,filename),timeout:20000});
    report.screenshots.push(filename);report.tests.push({size:size.name,filters:'passed',trip:'passed',overflow:'none'});
    await ctx.close();
  }
  const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await ctx.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  check(await page.locator('#journey-atlas article.ja-card:visible').count()===10,'no-JS static cards');
  check(await page.locator('#journey-atlas a:has-text("Official source")').count()===10,'no-JS official links');
  report.tests.push({size:'no-JS',cards:10,sources:10});
  await ctx.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('JOURNEY_ATLAS_V1 BROWSER QA PASS',JSON.stringify(report));
 }catch(e){report.failures.push(e.message);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));throw e;}
 finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
