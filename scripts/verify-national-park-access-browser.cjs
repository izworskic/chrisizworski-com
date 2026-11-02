#!/usr/bin/env node
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(__dirname,'../artifacts/national-park-access-browser');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
fs.mkdirSync(out,{recursive:true});
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const data=await fs.promises.readFile(file).catch(()=>null);
  if(!data){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch(err){res.writeHead(500);res.end('Unavailable');}
});
function need(ok,message){if(!ok)throw Error(message);}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+server.address().port+'/national-park-phenomena-field-guide/';
 const report={date:new Date().toISOString(),checks:[],failures:[]};let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const d of [{name:'mobile',width:390,height:844},{name:'desktop',width:1366,height:900}]){
   const ctx=await browser.newContext({viewport:{width:d.width,height:d.height},deviceScaleFactor:1});
   const page=await ctx.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route(/basemaps\.cartocdn\.com|tile\.openstreetmap\.org/,route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL4GAAAAABJRU5ErkJggg==','base64')}));
   const response=await page.goto(address,{waitUntil:'domcontentloaded',timeout:30000});
   need(response?.status()===200,d.name+': page failed');
   await page.waitForFunction(()=>!!window.NP_PHENOMENA_DATA?.markers?.['glacier-going-to-the-sun-opening'],null,{timeout:20000});
   need(await page.locator('.wf-story').count()===12,d.name+': 12 stories not rendered');
   need(await page.locator('#phenomenon-leaflet-map .np-ranger-marker').count()===12,d.name+': map markers missing');
   need((await page.locator('#glacier-going-to-the-sun-opening').innerText()).includes('No 2026 Vehicle Reservation'),d.name+': Glacier false vehicle permit');
   need((await page.locator('#yosemite-horsetail-firefall').innerText()).includes('No 2026 Entry Reservation'),d.name+': Yosemite false vehicle permit');
   need((await page.locator('#rocky-mountain-elk-rut').innerText()).includes('7 PM MDT'),d.name+': RMNP incorrect release clock');
   need((await page.locator('#acadia-cadillac-first-sunrise').innerText()).includes('May 20–October 25'),d.name+': Acadia season gap');
   await page.locator('.np-filter-pill[data-filter="lottery"]').click();
   need(await page.locator('#yosemite-horsetail-firefall').evaluate(el=>getComputedStyle(el).display==='none'),d.name+': Yosemite incorrectly classified as lottery');
   need(await page.locator('#glacier-going-to-the-sun-opening').evaluate(el=>getComputedStyle(el).display==='none'),d.name+': Glacier incorrectly classified as lottery');
   await page.locator('.np-filter-pill[data-filter="open"]').click();
   need(await page.locator('#yosemite-horsetail-firefall').isVisible(),d.name+': Yosemite not visible in open category');
   await page.locator('.np-month-btn[data-month="2"]').click();
   need((await page.locator('#np-month-intel').innerText()).includes('February'),d.name+': month calendar did not update');
   const src=await page.locator('#glacier-going-to-the-sun-opening a[href*="nps.gov"]').getAttribute('href');
   need(src?.startsWith('https://www.nps.gov/glac/'),d.name+': official Glacier citation missing');
   const width=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
   need(width.scroll<=width.viewport+18,d.name+': horizontal overflow '+JSON.stringify(width));
   need(errors.length===0,d.name+': browser JS errors '+errors.join('; '));
   await page.screenshot({path:path.join(out,d.name+'.png'),fullPage:true,animations:'disabled'});
   report.checks.push({device:d.name,width,stories:12,mapMarkers:12,filters:'passed',map:'passed',sourceLinks:'passed',pageErrors:errors});
   await ctx.close();
  }
 }catch(err){report.failures.push(String(err.stack||err));throw err;}
 finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
