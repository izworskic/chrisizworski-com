#!/usr/bin/env node
'use strict';
/* Offline local page server + real Chromium. Does not exercise unsafe water decisions or use privileged tokens. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(__dirname,'../artifacts/apostle-islands');
fs.mkdirSync(out,{recursive:true});
const contentTypes={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer(async (req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    if(u.pathname==='/api/carto-basemap-config'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"force OSM fallback"}');return;}
    const name=u.pathname==='/apostle-islands/'?'/apostle-islands/index.html':u.pathname;
    const resolved=path.resolve(root,'.'+name);
    if(!resolved.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const stat=await fs.promises.stat(resolved).catch(()=>null);
    if(!stat?.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':contentTypes[path.extname(resolved)]||'application/octet-stream'});
    res.end(await fs.promises.readFile(resolved));
  }catch(e){res.writeHead(500);res.end('Internal test server error');}
});
function check(bool,why){if(!bool)throw Error(why);}
async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url='http://127.0.0.1:'+server.address().port+'/apostle-islands/';
  const report={date:new Date().toISOString(),viewports:[],failures:[],screenshots:[]};
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const {name,width,height} of [{name:'phone',width:390,height:844},{name:'desktop',width:1366,height:900}]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
      check(response.status()===200,name+' returned non-200');
      check(await page.locator('article.stop').count()===9,name+' lacks nine cards');
      check(await page.locator('.map-direct a').count()===3,name+' lacks independent road directions');
      check(await page.locator('a[href*="nps.gov"]').count()>=10,name+' missing official park links');
      try{await page.waitForFunction(()=>window.L && document.querySelectorAll('#ap-map .leaflet-interactive').length>=4,null,{timeout:14000});}catch{const diagnostic=await page.evaluate(()=>({leaflet:!!window.L,mapState:document.querySelector('#ap-map')?.dataset,dom:document.querySelector('#ap-map')?.innerHTML.slice(0,450),scripts:[...document.scripts].map(s=>s.src).filter(Boolean)}));throw Error(name+' map initialization diagnostic '+JSON.stringify(diagnostic)+'; JS errors: '+errors.join('; '));}
      const screen=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}));
      check(screen.scroll<=screen.width+2,name+' horizontal overflow '+JSON.stringify(screen));
      // Travel filters change the actual guide; all original cards remain in static DOM.
      await page.locator('input[name="mode"][value="ferry"]').check();
      check(await page.locator('article.stop:visible').count()===1,name+' ferry choice did not isolate Madeline');
      await page.locator('input[name="mode"][value="kayak"]').check();
      await page.locator('#time-choice').selectOption('day');
      check(await page.locator('article.stop:visible').count()===3,name+' kayak/day intersection failed');
      await page.locator('input[name="mode"][value="all"]').check();
      await page.locator('#time-choice').selectOption('all');
      check(await page.locator('article.stop:visible').count()===9,name+' reset choices failed');
      // The deep-island planner must remain meaningful even without data feeds.
      check(await page.locator('article.island-card').count()===8,name+' eight island dossiers');
      check(await page.locator('article.island-card .island-trails li').count()===17,name+' seventeen researched trails');
      await page.locator('input[name="island-purpose"][value="overnight"]').check();
      check(await page.locator('article.island-card:visible').count()===6,name+' camping filter must exclude Raspberry and Devils');
      await page.locator('input[name="island-purpose"][value="shuttle"]').check();
      check(await page.locator('article.island-card:visible').count()===4,name+' published season shuttle or lighthouse tour filter count');
      await page.locator('input[name="island-purpose"][value="lighthouse"]').check();
      check(await page.locator('article.island-card:visible').count()===4,name+' lighthouse context filter count');
      check(await page.locator('#island-devils').isVisible(),name+' closed Devils must not disappear from lighthouse context');
      check((await page.locator('#island-devils .island-status').innerText()).includes('DOCK CLOSED'),name+' Devils dock closure label');
      await page.locator('input[name="island-purpose"][value="all"]').check();
      check(await page.locator('article.island-card:visible').count()===8,name+' full island filter reset');
      await page.locator('#island-stockton details summary').click();
      check(await page.locator('#island-stockton details').getAttribute('open')!==null,name+' trail details disclosure failed');
      await page.locator('#island-stockton .island-compare').check();
      await page.locator('#island-oak .island-compare').check();
      check(await page.locator('.compare-snapshot').count()===2,name+' comparison did not create two columns');
      check((await page.locator('.compare-snapshot').first().innerText()).includes('Presque Isle'),name+' comparison lost dock facts');
      await page.locator('#island-sand .island-compare').check();
      check(!(await page.locator('#island-sand .island-compare').isChecked()),name+' comparison allowed a third selected island');
      check(await page.locator('.compare-snapshot').count()===2,name+' comparing two has changed');
      await page.locator('#island-compare-clear').click();
      check(await page.locator('.compare-snapshot').count()===0,name+' comparison clear failed');
      await page.locator('#island-planner').screenshot({path:path.join(out,name+'-island-access.png')});
      report.screenshots.push(name+'-island-access.png');
      await page.screenshot({path:path.join(out,name+'-top.png')});report.screenshots.push(name+'-top.png');
      const images=page.locator('figure.photo img');
      const imgResults=[];
      for(let i=0;i<await images.count();i++){
        const img=images.nth(i);await img.scrollIntoViewIfNeeded();
        await page.waitForFunction(index=>{const x=document.querySelectorAll('figure.photo img')[index];return x&&x.complete;},i,{timeout:20000});
        imgResults.push(await img.evaluate(n=>({width:n.naturalWidth,alt:n.alt,src:n.currentSrc})));
      }
      check(imgResults.length===4&&imgResults.every(x=>x.width>0),name+' failed photo load '+JSON.stringify(imgResults));
      await page.locator('#ap-map').scrollIntoViewIfNeeded();
      await page.waitForTimeout(5000);
      const tiles=await page.locator('.leaflet-tile-loaded').evaluateAll(imgs=>imgs.filter(x=>x.complete&&x.naturalWidth>0).length);
      check(tiles>=3,name+' OSM map failed to load 3 tiles; got '+tiles);
      const pins=await page.locator('#ap-map .leaflet-interactive').count();
      check(pins>=4,name+' lost map pins');
      await page.locator('#ap-map').screenshot({path:path.join(out,name+'-map.png')});report.screenshots.push(name+'-map.png');
      let roadPopups=0,islandPopups=0;
      for(let pi=0;pi<pins;pi++){
        await page.locator('#ap-map .leaflet-interactive').nth(pi).dispatchEvent('click');
        const popup=page.locator('#ap-map .leaflet-popup-content:visible').last();
        await popup.waitFor({state:'visible',timeout:3500});
        const href=await popup.locator('a').first().getAttribute('href');
        if(href.includes('google.com/maps/'))roadPopups++;
        else if(href.includes('nps.gov/places/sand-island.htm'))islandPopups++;
        else throw Error(name+' unexpected map popup URL '+href);
      }
      check(roadPopups===3&&islandPopups===1,name+' expected three road directions and one water-only NPS info pin, got '+roadPopups+'/'+islandPopups);
      check(errors.length===0,name+' page JS exceptions '+errors.join('; '));
      report.viewports.push({name,tiles,pins,photos:imgResults.length,filters:true,overflow:false});
      await context.close();
    }
    const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const nojs=await ctx.newPage();await nojs.goto(url,{waitUntil:'domcontentloaded'});
    check(await nojs.locator('article.stop').count()===9,'no JavaScript article cards');
    check(await nojs.locator('article.island-card').count()===8,'no JavaScript island cards');
    check(await nojs.locator('article.island-card .island-trails li').count()===17,'no JavaScript trail inventory');
    check(await nojs.locator('#island-devils').innerText().then(x=>x.includes('DOCK CLOSED')),'no JavaScript dock closure');
    check(await nojs.locator('#ap-map .fallback a').count()===3,'no JavaScript source directions');
    check((await nojs.locator('h1').innerText()).includes('Apostle Islands'),'no JavaScript first answer');
    await ctx.close();
    report.viewports.push({name:'no-js',cards:9,mapDirections:3});
    console.log('APOSTLE BROWSER QA PASS '+JSON.stringify(report.viewports));
  }catch(e){report.failures.push(e.stack||String(e));console.error('APOSTLE BROWSER QA FAIL',e.stack||e);process.exitCode=1;}
  finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
}
main();
