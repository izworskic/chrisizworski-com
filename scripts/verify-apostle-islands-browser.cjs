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
      await page.locator('#island-sand .island-compare').click();
      check(!(await page.locator('#island-sand .island-compare').isChecked()),name+' comparison allowed a third selected island');
      check(await page.locator('.compare-snapshot').count()===2,name+' comparing two has changed');
      await page.locator('#island-compare-clear').click();
      check(await page.locator('.compare-snapshot').count()===0,name+' comparison clear failed');
      await page.locator('#island-planner').screenshot({path:path.join(out,name+'-island-access.png')});
      report.screenshots.push(name+'-island-access.png');
      // Official NPS cartography + 42 campsite points; Sand/Devils never plotted.
      check(await page.locator('#island-atlas').count()===1,name+' visual atlas section missing');
      check(await page.locator('.atlas-scene').count()===8,name+' must retain eight source-backed island maps');
      check(await page.locator('[data-atlas-go]').count()===8,name+' each island dossier must link to atlas');
      await page.locator('#atlas-geographic-map[data-map-state="loaded"]').waitFor({timeout:14000});
      check(await page.locator('.atlas-scene:visible').count()===1,name+' selected-island presentation');
      check(await page.locator('#atlas-geographic-map .leaflet-interactive').count()===21,name+' Stockton 21 NPS site positions');
      check(await page.locator('#atlas-map-note').innerText().then(x=>x.includes('21 of 21')),name+' Stockton count missing');
      await page.locator('#atlas-marker-filter').selectOption('accessible');
      check(await page.locator('#atlas-geographic-map .leaflet-interactive').count()===3,name+' Stockton accessible 3 points');
      await page.locator('#atlas-marker-filter').selectOption('group');
      check(await page.locator('#atlas-geographic-map .leaflet-interactive').count()===2,name+' Stockton two groups');
      await page.locator('#atlas-marker-filter').selectOption('all');
      await page.locator('[data-atlas-pick="oak"]').click();
      check(await page.locator('#atlas-oak').isVisible(),name+' Oak official map hidden');
      check(await page.locator('#atlas-geographic-map .leaflet-interactive').count()===7,name+' Oak seven NPS reference points');
      await page.locator('[data-atlas-pick="sand"]').click();
      check(await page.locator('#atlas-sand').isVisible(),name+' Sand official map missing');
      check(await page.locator('#atlas-coordinates-withheld').isVisible(),name+' Sand coordinates not withheld');
      check((await page.locator('#atlas-map-note').innerText()).includes('no campsite location markers'),name+' Sand corrected-coordinates caveat missing');
      await page.locator('[data-atlas-pick="devils"]').click();
      check(await page.locator('#atlas-coordinates-withheld').isVisible(),name+' Devils map pins should be withheld');
      check((await page.locator('#atlas-devils').innerText()).includes('closed south marina'),name+' Devils closed marina not explained');
      await page.locator('[data-atlas-pick="raspberry"]').click();
      check((await page.locator('#atlas-raspberry').innerText()).includes('no designated campsites'),name+' Raspberry camping exclusion');
      await page.locator('[data-atlas-pick="stockton"]').click();
      const firstMap=page.locator('#atlas-stockton .atlas-map-figure img');
      await firstMap.scrollIntoViewIfNeeded();
      await firstMap.evaluate(img=>img.complete?null:new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,4500);}));
      check(await firstMap.evaluate(img=>img.naturalWidth>0),name+' NPS Stockton trail map image failed to load');
      await page.locator('#island-atlas').screenshot({path:path.join(out,name+'-island-atlas.png')});
      report.screenshots.push(name+'-island-atlas.png');
      // NPS route evidence: labels, three-step chain, map emphasis and trip handoff.
      check(await page.locator('.atlas-path-card').count()===21,name+' 21 sourced pathway examples');
      check(await page.locator('.path-sequence li').count()===63,name+' three stages per pathway');
      check(await page.locator('.atlas-path-choose:not([hidden])').count()===21,name+' pathway data load or UI activation failed');
      await page.locator('#atlas-path-stockton-quarry-groups summary').click();
      await page.locator('[data-path-select="stockton-quarry-groups"]').click();
      check((await page.locator('#atlas-connection-readout').innerText()).includes('Quarry Bay'),name+' selected group-camp pathway missing');
      check((await page.locator('#atlas-connection-readout').innerText()).includes('A, B'),name+' published group site identifiers missing');
      check(await page.locator('#atlas-geographic-map .leaflet-interactive').count()===21,name+' selecting evidence must retain all Stockton site dots');
      check(await page.locator('#atlas-path-stockton-quarry-groups').evaluate(el=>el.classList.contains('is-selected')),name+' selected pathway not visually distinct');
      await page.locator('[data-atlas-pick="sand"]').click();
      check(await page.locator('#atlas-coordinates-withheld').isVisible(),name+' Sand dots should remain withheld');
      await page.locator('[data-path-select="sand-boardwalk"]').click();
      check((await page.locator('#atlas-connection-readout').innerText()).includes('No campsite markers plotted'),name+' Sand description implying guessed campsite locations');
      await page.locator('[data-path-trip="sand-boardwalk"]').click();
      check(await page.locator('#trip-island').inputValue()==='sand',name+' NPS pathway trip handoff lost island');
      check((await page.locator('#trip-selected-path').innerText()).includes('accessible site 3'),name+' trip brief lost verified accessible site context');
      await page.locator('[data-atlas-pick="stockton"]').click();
      await page.locator('#island-atlas').screenshot({path:path.join(out,name+'-source-pathways.png')});
      report.screenshots.push(name+'-source-pathways.png');
      // Visitor can move from a dock's published trail/campsite record to a trip brief.
      check(await page.locator('.dock-record').count()===11,name+' 11 NPS dock records');
      check(await page.locator('.dock-record[data-dock-state="closed"]').count()===1,name+' only Devils dock closed');
      check(await page.locator('.dock-record:visible').count()===3,name+' Stockton default should show three docks');
      await page.locator('#dock-island-choice').selectOption('raspberry');
      check(await page.locator('.dock-record:visible').count()===2,name+' Raspberry two dock options');
      await page.locator('#dock-island-choice').selectOption('devils');
      check(await page.locator('.dock-record:visible').count()===1,name+' Devils closed dock context');
      check((await page.locator('#dock-found-count').innerText()).includes('closed landing'),name+' closed count not prominent');
      check((await page.locator('#dock-devils-south .dock-chip').innerText()).includes('Closed'),name+' Devils status mislabeled');
      await page.locator('#dock-island-choice').selectOption('all');
      check(await page.locator('.dock-record:visible').count()===11,name+' all 11 dock records not visible');
      await page.locator('[data-dock-island="sand"]').click();
      check(await page.locator('#dock-island-choice').inputValue()==='sand',name+' island guide link did not select Sand');
      check(await page.locator('.dock-record:visible').count()===1,name+' Sand dock selection');
      await page.locator('#dock-sand-east .dock-plan-link').click();
      check(await page.locator('#trip-island').inputValue()==='sand',name+' landing-to-trip brief lost selected island');
      check((await page.locator('#trip-selected-dock').innerText()).includes('East Bay dock'),name+' exact dock not preserved in trip context');
      check((await page.locator('#trip-selected-dock').innerText()).includes('does not reserve a berth'),name+' no availability disclaimer');
      await page.locator('#dock-island-choice').selectOption('stockton');
      await page.locator('#landing-field-desk').screenshot({path:path.join(out,name+'-dock-field-desk.png')});
      report.screenshots.push(name+'-dock-field-desk.png');
      // Trip readiness has no live booking or marine-safety authority.
      check(await page.locator('#source-desk').count()===1,name+' source desk missing');
      check(await page.locator('.ap-source-item').count()===6,name+' six source entries missing');
      check((await page.locator('[data-source-id="operator-shuttle"] .ap-source-state').innerText()).includes('2026 season archived'),name+' old operator dates not marked archived');
      check((await page.locator('[data-source-id="nps-conditions"] .ap-source-state').innerText()).includes('check official source'),name+' NPS alerts improperly assumed live');
      check(await page.locator('.ap-source-item a[href*="nps.gov"]').count()>=4,name+' authoritative links missing');
      await page.locator('#source-desk').screenshot({path:path.join(out,name+'-source-desk.png')});report.screenshots.push(name+'-source-desk.png');
      check(await page.locator('#trip-readiness').count()===1,name+' missing trip readiness section');
      check(await page.locator('#trip-r-steps li').count()>=3,name+' no source-led booking sequence');
      await page.locator('#trip-transport').selectOption('none');
      check((await page.locator('#trip-r-status').innerText()).includes('No land-only access'),name+' no-water-transport guard failed');
      await page.locator('#trip-island').selectOption('devils');
      await page.locator('#trip-transport').selectOption('own');
      check((await page.locator('#trip-r-status').innerText()).includes('Landing plan blocked'),name+' closed Devils landing guard failed');
      await page.locator('#trip-island').selectOption('raspberry');
      await page.locator('#trip-type').selectOption('overnight');
      check((await page.locator('#trip-r-status').innerText()).includes('Camping plan not supported'),name+' Raspberry camping blocked');
      await page.locator('#trip-island').selectOption('oak');
      await page.locator('#trip-type').selectOption('day');
      await page.locator('#trip-transport').selectOption('scheduled');
      check((await page.locator('#trip-r-status').innerText()).includes('No verified scheduled service'),name+' Oak day shuttle not proven');
      await page.locator('#trip-type').selectOption('overnight');
      check((await page.locator('#trip-r-status').innerText()).includes('Archive only · next season unverified'),name+' Oak overnight route not explained');
      await page.locator('#trip-island').selectOption('michigan');
      await page.locator('#trip-transport').selectOption('taxi');
      await page.locator('#trip-people').fill('9');
      await page.locator('#trip-readiness-form').evaluate(form=>form.requestSubmit());
      check((await page.locator('#trip-r-status').innerText()).includes('No qualifying group campsite'),name+' non-group Michigan camping guard');
      await page.locator('#trip-island').selectOption('oak');
      await page.locator('#trip-date').fill('2028-07-15');
      check((await page.locator('#trip-r-date-note').innerText()).includes('March lottery'),name+' group lottery rule failed');
      await page.locator('#trip-island').selectOption('stockton');
      await page.locator('#trip-people').fill('2');
      await page.locator('#trip-readiness-form').evaluate(form=>form.requestSubmit());
      await page.locator('#trip-date').fill('2099-07-15');
      check((await page.locator('#trip-r-date-note').innerText()).includes('not opened'),name+' individual 30-day window rule failed');
      await page.locator('#trip-type').selectOption('day');
      check(await page.locator('#trip-r-fee').isHidden(),name+' day trip should hide camping fees');
      await page.locator('#trip-transport').selectOption('scheduled');
      check((await page.locator('#trip-r-date-note').innerText()).includes('future-season operator schedule'),name+' schedule expiration reminder');
      await page.locator('#trip-readiness').screenshot({path:path.join(out,name+'-trip-readiness.png')});
      report.screenshots.push(name+'-trip-readiness.png');
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
    check(await nojs.locator('#trip-readiness').count()===1,'no JavaScript NPS booking guidance');
    check(await nojs.locator('.ap-source-item').count()===6,'no JavaScript source provenance cards');
    check(await nojs.locator('.dock-record').count()===11,'no JavaScript public dock evidence');
    check(await nojs.locator('.atlas-scene').count()===8,'no JavaScript 8 official island maps');
    check(await nojs.locator('.atlas-trails li').count()===24,'no JavaScript 24 documented trails');
    check(await nojs.locator('.atlas-site-link').count()===42,'no JavaScript 42 NPS campsite site records');
    check(await nojs.locator('.atlas-path-card').count()===21,'no JavaScript NPS pathway descriptions');
    check(await nojs.locator('.path-sequence li').count()===63,'no JavaScript three-stage visitor sequences');
    check((await nojs.locator('#atlas-path-sand-boardwalk').textContent()).includes('NPS-documented East Bay dock boardwalk'),'no JavaScript verified Sand boardwalk');
    check((await nojs.locator('#atlas-path-devils-closed').textContent()).includes('Do not plan a dock landing'),'no JavaScript Devils closure explanation');
    check((await nojs.locator('#atlas-sand').innerText()).includes('being corrected'),'no JavaScript Sand location warning');
    check((await nojs.locator('#dock-devils-south').innerText()).includes('Closed landing'),'no JavaScript Devils closure');
    check((await nojs.locator('[data-source-id="operator-shuttle"]').innerText()).includes('Published season: June 20'),'no JavaScript dated operator evidence');
    check(await nojs.locator('#trip-r-steps li').count()===4,'no JavaScript booking checklist');
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
