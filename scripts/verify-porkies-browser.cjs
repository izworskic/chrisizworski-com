#!/usr/bin/env node
"use strict";
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../public'), out=path.resolve(__dirname,'../artifacts/porkies-browser');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
fs.mkdirSync(out,{recursive:true});
const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://127.0.0.1');
    const wanted=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname;
    const f=path.resolve(root,'.'+wanted);
    if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const data=await fs.promises.readFile(f).catch(()=>null);
    if(!data){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});
    res.end(data);
  }catch(e){res.writeHead(500);res.end('Server error');}
});
function need(value,message){if(!value)throw Error(message);}
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/porcupine-mountains/';
 const report={reviewDate:new Date().toISOString(),cases:[],photos:[],screenshots:[],failures:[]};
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const device of [{name:'mobile',width:390,height:844},{name:'tablet',width:768,height:1024},{name:'desktop',width:1366,height:900},{name:'narrow',width:340,height:750}]){
   const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:1,ignoreHTTPSErrors:false});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   // Deterministic DNR GIS fixture: test truth of evidence handling, not external network reliability.
   await page.route('**/DNRTrailsOPENDATA/FeatureServer/*/query?**',route=>route.fulfill({
    status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({features:[],exceededTransferLimit:false})
   }));
   await page.route('**/DNRReferenceAssetsOPENDATA/FeatureServer/0/query?**',route=>route.fulfill({
    status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({features:[{attributes:{OBJECTID:163,ASSETDETAILTYPE:'Vehicular',CONDITION:null}}]})
   }));
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   need(response?.status()===200,device.name+' HTML load failed');
   need(await page.locator('h1').count()===1,device.name+' missing H1');
   need((await page.locator('h1').innerText()).includes('Porkies'),device.name+' missing identity');
   need(await page.locator('#planner select').count()===5,device.name+' expected travel, vehicle and walking inputs');
   // Quick-start is an actual first-screen choice, not a decorative jump.
   need(await page.locator('.hero-quickstart [data-porkies-start]').count()===3,device.name+' three meaningful first-screen choices missing');
   if(device.width<=390){
     const first=await page.locator('.hero-quickstart [data-porkies-start="views"]').evaluate(x=>x.getBoundingClientRect().top);
     need(first<device.height-30,device.name+' first live planner choice is below the initial viewport ('+first+'px)');
   }
   await page.locator('.hero-quickstart [data-porkies-start="falls"]').click();
   await page.waitForFunction(()=>document.activeElement?.id==='travel-date',null,{timeout:4000});
   need((await page.locator('#interest').inputValue())==='falls',device.name+' hero interest did not propagate to planner');
   await page.locator('#interest').selectOption('mix');

   need(await page.locator('article.story').count()===3,device.name+' static destination stories missing');
   need(await page.locator('#crossings .crossing-card').count()===4,device.name+' evidence-supported river crossing desk missing');
   await page.locator('.crossing-inventory summary').click();
   need(await page.locator('.crossing-inventory-row').count()===9,device.name+' nine independent current-condition records missing');
   need(await page.locator('.crossing-alternative-grid>div').count()===3,device.name+' source-described no-river-route options missing');
   need((await page.locator('.crossing-inventory').innerText()).includes('No currently verified route'),device.name+' current bridge conditions incorrectly cleared');
   need((await page.locator('#crossings').innerText()).includes('No automated through-route'),device.name+' safety blocker not visible');

   need(await page.locator('#experience-choice-a option').count()===6,device.name+' six compared choices missing');
   await page.waitForFunction(()=>document.querySelector('#experience-compare')?.dataset.loaded==='yes',null,{timeout:15000});
   need((await page.locator('#experience-a h3').innerText())==='Lake of the Clouds overlook',device.name+' initial lake comparison missing');
   need((await page.locator('#experience-b h3').innerText())==='Summit Peak tower',device.name+' initial summit comparison missing');
   need(await page.locator('#read-landscape .journal-entry').count()===4,device.name+' four landscape stories missing');
   const reading=await page.evaluate(()=>({
     width:document.querySelector('.journal-text')?.getBoundingClientRect().width,
     font:parseFloat(getComputedStyle(document.querySelector('.journal-text p')).fontSize),
     note:parseFloat(getComputedStyle(document.querySelector('.experience-fieldnote-copy')).fontSize)
   }));
   need(reading.width>=245,device.name+' field journal reading column too narrow');
   need(reading.font>=14,device.name+' field journal text too small');
   need(reading.note>=14,device.name+' selection field note too small');
   need(await page.locator('#experience-a .experience-fieldnote').count()===1,device.name+' interactive lake story missing');
   await page.locator('#experience-a .experience-fieldnote summary').focus();
   await page.keyboard.press('Enter');
   need(await page.locator('#experience-a .experience-fieldnote').getAttribute('open')!==null,device.name+' keyboard note disclosure did not open');
   need((await page.locator('#experience-a .experience-fieldnote-copy').innerText()).includes('Lake of the Clouds'),device.name+' selected lake story missing');
   need(await page.locator('#experience-a .experience-entry').count()===1,device.name+' mapped parking-entry proof missing');
   const entry=page.locator('#experience-a .experience-entry');
   await entry.locator('summary').click();
   need((await entry.innerText()).includes('DNR parking asset #1409')&&(await entry.innerText()).includes('74 m'),device.name+' GIS parking point proof missing');
   need((await entry.innerText()).includes('NOT a walk'),device.name+' point offset falsely presented as walking distance');
   await page.locator('#experience-choice-a').selectOption('river');
   need((await page.locator('#experience-a .experience-fieldnote-copy').textContent()).includes('Presque Isle River'),device.name+' selected river story did not update');
   need((await page.locator('#experience-a .experience-fieldnote-source').getAttribute('href')).includes('/presque-isle-river-scenic-site'),device.name+' wrong DNR river source');
   need((await page.locator('#experience-a .experience-decision').innerText()).includes('Western road access unresolved'),device.name+' source risk not updated for river');
   need((await page.locator('#experience-a .experience-entry-relation').innerText()).includes('contact booth'),device.name+' separated river access points incorrectly merged');
   await page.locator('#experience-a .experience-entry-source summary').click();
   need((await page.locator('#experience-a .experience-entry-source').innerText()).includes('parking asset #841'),device.name+' Presque parking asset #841 missing');
   need((await page.locator('#experience-compare-status').innerText()).includes('Different park districts'),device.name+' origin and comparative district warning missing');
   await page.locator('#experience-choice-b').selectOption('clouds');
   await page.waitForFunction(()=>!!window.PorkiesAtlas?.map,null,{timeout:25000});
   await page.locator('#experience-a .experience-locate-parking').click();
   await page.waitForFunction(()=>document.querySelector('#parking-map-message')?.textContent.includes('1 DNR-mapped parking location'),null,{timeout:10000});
   need((await page.locator('#parking-map-message').innerText()).includes('NOT a continuous route'),device.name+' single parking pin implies a hiking route');
   await page.locator('#experience-map-compare').click();
   await page.waitForFunction(()=>document.querySelector('#parking-map-message')?.textContent.includes('2 DNR-mapped parking locations'),null,{timeout:15000});
   need((await page.locator('#parking-map-message').innerText()).includes('NOT a continuous route'),device.name+' map pins were presented as a driving route');
   await page.locator('#travel-date').fill('2027-01-15');
   await page.locator('#travel-date').dispatchEvent('change');
   await page.waitForFunction(()=>document.querySelector('#experience-b .experience-decision')?.textContent.includes('Scenic-road approach unverified'),null,{timeout:8000});
   await page.locator('#ability').selectOption('low');
   need((await page.locator('#experience-a .experience-proof').innerText()).includes('Nawadaha'),device.name+' accessible waterfall caveat missing');
   await page.locator('#experience-choice-b').selectOption('escarpment');
   need((await page.locator('#experience-b .experience-decision').innerText()).includes('Not a short or accessible walk'),device.name+' high difficulty mismatch not shown');
   need((await page.locator('#experience-b .experience-facts').innerText()).includes('4.3 miles'),device.name+' DNR edition dispute not shown');
   await page.locator('#experience-choice-b').selectOption('river');
   need(await page.locator('#experience-map-compare').isDisabled(),device.name+' duplicate outing should not offer two-pin map');
   await page.locator('#experience-choice-b').selectOption('summit');
   await page.locator('#experience-b .experience-trail-link').click();
   need(await page.locator('details.trail-truth-card[data-trail="summit-tower"]').getAttribute('open')!==null,device.name+' source trail evidence not opened');
   await page.locator('#experience-choice-b').selectOption('nature');
   need(await page.locator('#experience-b .experience-photo img').count()===1,device.name+' park-path archive photograph missing');
   need((await page.locator('#experience-b figcaption').innerText()).includes('Yinan Chen'),device.name+' public-domain path credit missing');
   need((await page.locator('#experience-b figcaption').innerText()).includes('NOT confirmed as the Visitor Center Nature Trail'),device.name+' misleading exact-trail photo claim');
   await page.locator('#experience-b .experience-photo img').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const i=document.querySelector('#experience-b .experience-photo img');return i&&i.complete&&i.naturalWidth>0},null,{timeout:15000});
   need((await page.locator('#experience-b .experience-entry').innerText()).includes('Visitor Center Nature Trail')&&(await page.locator('#experience-b .experience-entry').innerText()).includes('nearby parking'),device.name+' visitor trailhead crosswalk missing');
   await page.locator('#experience-choice-b').selectOption('winter');
   need((await page.locator('#experience-b figcaption').innerText()).includes('1959'),device.name+' ski photo archival date missing');
   need((await page.locator('#experience-b figcaption').innerText()).includes('NOT today'),device.name+' photo misrepresented as current winter facility');
   await page.locator('#experience-b .experience-photo img').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const i=document.querySelector('#experience-b .experience-photo img');return i&&i.complete&&i.naturalWidth>0},null,{timeout:15000});
   await page.locator('#experience-b .experience-photo').screenshot({path:path.join(out,device.name+'-winter-archive.png')});
   report.screenshots.push(device.name+'-winter-archive.png');
   await page.locator('#travel-date').fill('2026-10-28');
   await page.locator('#travel-date').dispatchEvent('change');
   await page.locator('#ability').selectOption('moderate');
   await page.locator('#experience-choice-a').selectOption('clouds');
   await page.locator('#experience-choice-b').selectOption('summit');
   await page.locator('#experience-compare').screenshot({path:path.join(out,device.name+'-experience-compare.png')});
   await page.locator('#read-landscape').screenshot({path:path.join(out,device.name+'-field-journal.png')});
   report.screenshots.push(device.name+'-field-journal.png');
   report.screenshots.push(device.name+'-experience-compare.png');
   // Regression from 2026-11-01 real-production sixteen-persona study.
   await page.locator('#travel-date').fill('2027-08-12');
   await page.locator('#arrival').selectOption('east');
   await page.locator('#vehicle').selectOption('rv');
   await page.locator('#hours').selectOption('4');
   await page.locator('#ability').selectOption('moderate');
   await page.locator('#interest').selectOption('views');
   await page.locator('#planner button[type="submit"]').click();
   need(await page.locator('#results .vehicle-check li').count()>=2,device.name+' main plan RV warning missing');
   need((await page.locator('#results .vehicle-check').innerText()).includes('middle ski hill parking area off M-107'),device.name+' DNR lower camper staging not in first answer');
   await page.locator('#vehicle').selectOption('trailer');
   await page.locator('#arrival').selectOption('west');
   await page.locator('#hours').selectOption('8');
   await page.locator('#interest').selectOption('falls');
   await page.locator('#planner button[type="submit"]').click();
   const trailer=await page.locator('#results .vehicle-check').innerText();
   need(trailer.includes('Summit Peak:')&&trailer.includes('Presque Isle:')&&trailer.includes('cross-park itinerary is not verified'),device.name+' trailer cross-park safety inconsistencies');
   await page.locator('#travel-date').fill('2027-02-17');
   await page.locator('#hours').selectOption('4');
   await page.locator('#ability').selectOption('low');
   await page.locator('#planner button[type="submit"]').click();
   need((await page.locator('#results .vehicle-check').innerText()).includes('County Road 519 work-zone reopening'),device.name+' winter motorhome west access not qualified');
   await page.locator('#vehicle').selectOption('car');
   await page.locator('#travel-date').fill('2027-08-12');
   await page.locator('#arrival').selectOption('east');
   await page.locator('#hours').selectOption('2');
   await page.locator('#ability').selectOption('moderate');
   await page.locator('#interest').selectOption('falls');
   await page.locator('#planner button[type="submit"]').click();
   need(await page.locator('#results .vehicle-check').count()===0,device.name+' normal car wrongly receives camper warning');
   need(await page.locator('#results .plan-fork-choice').count()===2,device.name+' two short-visit paths not visible');
   need((await page.locator('#results .recommendations').innerText()).includes('Lake of the Clouds'),device.name+' nearby result missing');
   need((await page.locator('#results .plan-fork-explainer').innerText()).includes('No verified cross-park driving time'),device.name+' inaccurate short transfer implication');
   await page.locator('#results [data-plan-path="desired"]').click();
   need((await page.locator('#results .recommendations').innerText()).includes('Presque Isle'),device.name+' desired waterfall did not replace substitute');
   need((await page.locator('#results .result-intro').innerText()).includes('NOT confirmed within your 2-hour window'),device.name+' desired path promises a two-hour drive');
   need((await page.locator('#experience-a h3').innerText()).includes('Presque Isle'),device.name+' selected destination did not synchronize comparison');
   need(new URL(page.url()).searchParams.get('path')==='desired',device.name+' destination path share state missing');
   await page.locator('#results [data-plan-path="local"]').click();
   need((await page.locator('#results .recommendations').innerText()).includes('Lake of the Clouds'),device.name+' local alternative did not reverse');
   need((await page.locator('#experience-a h3').innerText()).includes('Lake of the Clouds'),device.name+' reverse choice not reflected in comparison');
   await page.locator('#arrival').selectOption('west');
   await page.locator('#interest').selectOption('views');
   await page.locator('#planner button[type="submit"]').click();
   need((await page.locator('#results .recommendations').innerText()).includes('Presque Isle'),device.name+' west-local path missing');
   await page.locator('#results [data-plan-path="desired"]').click();
   need((await page.locator('#results .recommendations').innerText()).includes('Lake of the Clouds'),device.name+' west-side panorama desire still ignored');
   need((await page.locator('#experience-a h3').innerText()).includes('Lake of the Clouds'),device.name+' west target did not focus lake source panel');
   if(device.width<=390){
     await page.locator('#results .plan-fork').screenshot({path:path.join(out,device.name+'-short-trip-decision.png')});
     report.screenshots.push(device.name+'-short-trip-decision.png');
   }
   await page.locator('#vehicle').selectOption('car');
   await page.locator('#travel-date').fill('2026-10-28');
   await page.locator('#arrival').selectOption('east');
   await page.locator('#hours').selectOption('4');
   await page.locator('#ability').selectOption('moderate');
   await page.locator('#interest').selectOption('mix');
   await page.locator('#planner button[type="submit"]').click();

   need(await page.locator('.parking-card').count()===6,device.name+' six static DNR crosschecked parking cards missing');
   need(await page.locator('#park-access-evidence').count()===1,device.name+' official source status desk missing');
   await page.waitForFunction(()=>document.querySelector('#park-gis-panel')?.dataset.check==='queried',null,{timeout:10000});
   const sourceStatus=await page.locator('#park-gis-verdict').innerText();
   need(sourceStatus.includes('zero temporary closure lines'),device.name+' DNR GIS zero-count sample not presented');
   need(sourceStatus.includes('condition field')&&sourceStatus.includes('not live parking'),device.name+' bridge condition and vacancy caveat missing');
   need(await page.locator('.porkies-access-truth[data-match="crosschecked"]').count()===6,device.name+' six named parking-to-trailhead crosswalks missing');
   need(await page.locator('.porkies-access-truth[data-match="unverified"]').count()===15,device.name+' fifteen non-certified backcountry trailhead warnings missing');
   await page.locator('#park-gis-refresh').click();
   await page.waitForFunction(()=>document.querySelector('#park-gis-panel')?.dataset.check==='queried',null,{timeout:10000});

   need(await page.locator('#west-corridor-field-note').count()===1,device.name+' distinct western approach note missing');
   need((await page.locator('.access-proof-lead').innerText()).includes('not a walking or driving distance'),device.name+' missing plain-language 1.2km last-mile source gap');
   const proof=page.locator('#porkies-access-proof');
   need(await proof.count()===1,device.name+' access proof disclosure missing');
   await proof.locator('summary').click();
   need(await proof.getAttribute('open')!==null,device.name+' source proof disclosure failed to open');
   const proofText=await proof.innerText();
   need(proofText.includes('November 1 through April 15')&&proofText.includes('2–7 a.m.')&&proofText.includes('Johnson Road'),device.name+' incomplete work-zone/winter-parking source evidence');
   await proof.screenshot({path:path.join(out,device.name+'-access-proof.png')});
   report.screenshots.push(device.name+'-access-proof.png');
   await proof.locator('summary').focus();
   await page.keyboard.press('Enter');
   need(await proof.getAttribute('open')===null,device.name+' disclosure not keyboard reversible');
   const westNote=await page.locator('#west-corridor-field-note').innerText();
   need(westNote.includes('September 22, 2026')&&westNote.includes('Johnson Road')&&westNote.includes('17 connected Presque Isle Road'),'township detour and expanded MGF road ledger absent '+device.name);
   need(await page.locator('#west-corridor-field-note a[href*="wakefieldtownship.com/north-county-road-519-will-be-closed"]').count()>=1,'source-linked township notice missing '+device.name);
   need(westNote.includes('County Road 519')&&westNote.includes('2 of 10')&&westNote.includes('not an east-to-west shortcut'),device.name+' CR519 named route/pavement safety evidence missing');
   need(await page.locator('#west-corridor-field-note a[href*="michiganbusiness.org"]').count()===1,device.name+' county pavement source link missing');
   need(await page.locator('.trail-truth-card').count()===21,device.name+' source-cited 21-trail catalog missing');
   need(await page.locator('.trail-edition-warning').count()===4,device.name+' conflicting DNR map editions not flagged');
   await page.locator('#trail-truth-filter').selectOption('editions');
   need(await page.locator('.trail-truth-card:visible').count()===4,device.name+' only four named trails should show the edition conflict');
   await page.locator('#trail-truth-filter').selectOption('short');
   need(await page.locator('.trail-truth-card:visible').count()===4,device.name+' short-walk filter not working');
   await page.locator('#trail-truth-filter').selectOption('all');
   need(await page.locator('.trail-truth-card:visible').count()===21,device.name+' trail filter did not restore full inventory');

   await page.waitForFunction(()=>window.L && document.querySelectorAll('#parking-map .leaflet-interactive').length>=6,null,{timeout:20000});
   await page.waitForTimeout(2000);
   const pinCount=await page.locator('#parking-map .leaflet-interactive').count();
   need(pinCount>=6,device.name+' expected six mapped DNR parking pins, got '+pinCount);
   const tiles=await page.locator('#parking-map .leaflet-tile-loaded').evaluateAll(images=>images.filter(img=>img.complete&&img.naturalWidth>0).length);
   need(tiles>=3,device.name+' map has too few visible real tiles '+tiles);
   await page.locator('#parking-map').screenshot({path:path.join(out,device.name+'-parking-map.png')});
   report.screenshots.push(device.name+'-parking-map.png');
   if(device.name==='desktop'){
     // Two same-tick clicks used to create two independent GeoJSON layers.
     // Keep the requested layer on, and render only one copy of the DNR source.
     await page.locator('#porkies-trails-toggle').evaluate(button=>{button.click();button.click();});
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('Showing 819 DNR hiking features'),null,{timeout:30000});
     need(await page.locator('#porkies-trails-toggle').getAttribute('aria-pressed')==='true','trail overlay should be enabled');
     const trailLines=await page.locator('.leaflet-porkies-trail-evidence-pane path').count();
     need(trailLines>=500&&trailLines<1500,'DNR trail overlay missing or duplicated on rapid taps: '+trailLines);
     await page.locator('#porkies-roads-toggle').click();
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('selected park-area road centerlines'),null,{timeout:25000});
     need((await page.locator('#route-evidence-status').innerText()).includes('15 reviewed road-source segments'), 'western South Boundary source corridor must not be represented as the interior closure');
     await page.locator('#porkies-ski-toggle').click();
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('Showing 40 DNR ski-trail records'),null,{timeout:25000});
     const skiLines=await page.locator('.leaflet-porkies-ski-evidence-pane path').count();
     need(skiLines>=20,'Official DNR ski routes not rendered '+skiLines);
     const roadLines=await page.locator('.leaflet-porkies-road-evidence-pane path').count();
     need(roadLines>=50,'Official park-road centerline layer missing '+roadLines);
     await page.locator('#porkies-west-toggle').click();
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('Showing 17 mapped Presque Isle Road centerlines'),null,{timeout:25000});
     need(await page.locator('#porkies-west-toggle').getAttribute('aria-pressed')==='true','western source geometry should be enabled');
     const westLines=await page.locator('.leaflet-porkies-west-evidence-pane path').count();
     need(westLines>=30&&westLines<=80,'reviewed 17+15 western reference linework missing/duplicated '+westLines);
     await page.locator('#parking-map').screenshot({path:path.join(out,'desktop-west-519-source.png')});
     report.screenshots.push('desktop-west-519-source.png');
     await page.locator('#parking-map').screenshot({path:path.join(out,'desktop-road-trail-evidence.png')});
     report.screenshots.push('desktop-road-trail-evidence.png');
     await page.locator('#travel-date').fill('2027-01-15');
     await page.locator('#planner button[type=submit]').click();
     const marked=await page.locator('.leaflet-porkies-road-evidence-pane path[stroke="#ad4839"]').count();
     need(marked>=10,'seasonal park road segments not visibly flagged in winter '+marked);
     await page.locator('#travel-date').fill('2026-10-28');
     await page.locator('#planner button[type=submit]').click();

     await page.locator('details[data-trail="escarpment"] summary').click();
     await page.locator('details[data-trail="escarpment"] .trail-see-map').click();
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('Escarpment Trail: showing'),null,{timeout:20000});
     const sourceHigh=await page.locator('.leaflet-porkies-trail-evidence-pane path[stroke="#d07d31"]').count();
     need(sourceHigh>0,'The named Escarpment source geometry was not highlighted');
     for(const [id,name,parts] of [['east-river','East River Trail',2],['correction','Correction Line Trail',13],['cross','Cross Trail',38]]){
       await page.locator('details[data-trail="'+id+'"] summary').click();
       await page.locator('details[data-trail="'+id+'"] .trail-see-map').click();
       await page.waitForFunction(({name,parts})=>document.querySelector('#route-evidence-status')?.textContent.includes(name+': showing '+parts+' source line fragment'),{name,parts},{timeout:20000});
       const highlighted=await page.locator('.leaflet-porkies-trail-evidence-pane path[stroke="#d07d31"]').count();
       need(highlighted===parts,'DNR '+name+' mismatch between highlighted map paths and reviewed source parts: '+highlighted);
       if(id==='cross')need((await page.locator('#route-evidence-status').innerText()).includes('individual trail identity is unresolved'),'combined Cross/Correction name requires explicit warning');
     }
     await page.locator('details[data-trail="visitor-nature"] summary').click();
     await page.locator('details[data-trail="visitor-nature"] .trail-see-map').click();
     await page.waitForFunction(()=>document.querySelector('#route-evidence-status')?.textContent.includes('not present as a separately named line'),null,{timeout:10000});
     await page.locator('#porkies-trails-toggle').click();
     await page.locator('#porkies-roads-toggle').click();
     await page.locator('#porkies-ski-toggle').click();
     await page.locator('#porkies-west-toggle').click();
   }
   await page.waitForFunction(()=>document.querySelector('#results h3')?.textContent.includes('Let one corner'),null,{timeout:10000});
   let overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   need(overflow.scroll<=overflow.viewport+2,device.name+' horizontal overflow '+JSON.stringify(overflow));
   need(errors.length===0,device.name+' JS errors '+errors.join('; '));
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(out,device.name+'-hero.png')});
   report.screenshots.push(device.name+'-hero.png');
   await page.locator('#arrival').selectOption('west');
   await page.locator('#hours').selectOption('2');
   await page.locator('#travel-date').fill('2026-10-28');
   await page.locator('#planner button[type=submit]').click();
   let content=await page.locator('#results').innerText();
   need(content.includes('Presque Isle River waterfalls'),device.name+' west 2h did not select waterfall district');
   need(content.includes('Lake of the Clouds is in a different area'),device.name+' did not disclose far-detour tradeoff');

   await page.locator('#parking-focus').click();
   need(await page.locator('.parking-card:visible').count()===1,device.name+' focused itinerary should show one west-side parking match');
   need(await page.locator('[data-parking-id="presque"]:visible').count()===1,device.name+' selected west-side parking card missing');
   await page.locator('#travel-date').fill('2027-01-15');
   await page.locator('#planner button[type=submit]').click();
   need(await page.locator('#park-road-verdict').getAttribute('data-confidence')==='restricted',device.name+' winter road closure rule not flagged');

   content=await page.locator('#results').innerText();
   need(content.includes('Presque Isle River scenic-area access'),device.name+' distinct west-side winter approach missing');
   need(content.includes('not assumed available'),device.name+' winter road exclusion missing');

   await page.locator('#parking-all').click();
   need(await page.locator('[data-parking-id="lake"] .parking-drive').count()===0,device.name+' lake summer-road directions leaked in winter');
   need(await page.locator('[data-parking-id="summit"] .parking-drive').count()===0,device.name+' summit summer-road directions leaked in winter');
   const cr519=page.locator('[data-parking-id="presque"] .parking-drive');
   need(await cr519.count()===0,device.name+' winter CR519 navigation has no verified complete road route; withhold directions');
   need((await page.locator('[data-parking-id="presque"] .access-date-note').innerText()).includes('County Road 519'),device.name+' missing source-described western approach');
   need(await page.locator('[data-parking-id="presque"] .parking-maplink').count()===1,device.name+' mapped parking point link missing in winter');
   await page.locator('#travel-date').fill('2027-08-15');
   await page.waitForFunction(()=>!document.querySelector('[data-parking-id="presque"] .parking-drive'),null,{timeout:5000});
   need((await page.locator('[data-parking-id="presque"] .access-date-note').innerText()).includes('Johnson Road'),'summer west-side driving must remain withheld for unresolved work-zone');
   await page.locator('#travel-date').fill('2027-01-15');
   await page.locator('#arrival').selectOption('east');
   await page.locator('#planner button[type=submit]').click();
   await page.waitForFunction(()=>!document.querySelector('[data-parking-id="presque"] .parking-drive'),null,{timeout:5000});
   need(await page.locator('[data-parking-id="presque"] .parking-drive').count()===0,device.name+' east-origin winter route incorrectly offered County Road 519 across closed park');
   need(await page.locator('[data-parking-id="ski"] .parking-drive').count()===0,device.name+' uncertified ski-area winter drive should not be linked');
   content=await page.locator('#results').innerText();
   need(content.includes('Winter Sports Complex'),device.name+' eastern winter planner did not select ski complex');
   await page.locator('#travel-date').fill('2027-05-02');
   await page.locator('#planner button[type=submit]').click();
   content=await page.locator('#results').innerText();
   need(content.includes('The forest is waking, but the scenic roads may still be closed'),device.name+' May guard missing');
   await page.locator('#travel-date').fill('2026-10-28');
   await page.locator('#arrival').selectOption('east');
   await page.locator('#hours').selectOption('8');
   await page.locator('#ability').selectOption('low');
   await page.locator('#planner button[type=submit]').click();
   content=await page.locator('#results').innerText();
   need(content.includes('Lake of the Clouds'),device.name+' accessible outlook missing');
   need(!(await page.locator('#results .recommendations li a').allTextContents()).some(x=>x.includes('Summit Peak')),device.name+' inappropriate tower suggestion');
   await page.locator('#vehicle').selectOption('trailer');
   need(await page.locator('[data-parking-id="lake"] .parking-drive').count()===0,device.name+' trailer offered constrained Lake of the Clouds upper lot');
   need(await page.locator('[data-parking-id="summit"] .parking-drive').count()===0,device.name+' trailer offered Summit Peak upper lot');
   need((await page.locator('[data-parking-id="lake"] .access-date-note').innerText()).includes('middle ski-hill'),device.name+' official camper staging caution missing');
   await page.locator('#vehicle').selectOption('car');
   need(await page.locator('[data-parking-id="lake"] .parking-drive').count()===1,device.name+' ordinary-season car route missing');
   await page.locator('#travel-date').fill('2026-11-10');
   need(await page.locator('[data-parking-id="lake"] .parking-drive').count()===0,device.name+' seasonal change did not immediately withhold road directions');
   await page.locator('#travel-date').fill('2026-10-28');
   need(await page.locator('[data-parking-id="lake"] .parking-drive').count()===1,device.name+' returning to ordinary season did not restore car link');
   const summerGoogle=new URL(await page.locator('[data-parking-id="lake"] .parking-drive').getAttribute('href'));
   need(summerGoogle.hostname==='www.google.com'&&summerGoogle.pathname==='/maps/dir/'&&summerGoogle.searchParams.get('api')==='1',device.name+' DNR lot navigation URL malformed');
   await page.locator('#results').screenshot({path:path.join(out,device.name+'-decision.png')});
   report.screenshots.push(device.name+'-decision.png');
   if(device.name!=='narrow'){
     const imgs=page.locator('.hero-photo img,.story img');
     for(let i=0;i<await imgs.count();i++){
       const img=imgs.nth(i);
       await img.scrollIntoViewIfNeeded();
       await page.waitForFunction(index=>{
         const e=document.querySelectorAll('.hero-photo img,.story img')[index];
         return Boolean(e&&e.complete);
       },i,{timeout:20000});
       const info=await img.evaluate(el=>({url:el.currentSrc,width:el.naturalWidth,height:el.naturalHeight}));
       report.photos.push({device:device.name,index:i,...info});
       need(info.width>0,device.name+' failed image '+i+' '+info.url);
     }
     await page.locator('.story-grid').screenshot({path:path.join(out,device.name+'-stories.png')});
     report.screenshots.push(device.name+'-stories.png');
   }
   report.cases.push({device:device.name,viewport:device.width+'x'+device.height,overflow:'pass',errors:0,planner:'pass'});
   await ctx.close();
  }
  // An unavailable entry crosswalk must leave the verified static two-outing answer,
  // never publish unreviewed geometry or a fake parking-to-trail connection.
  const failedEntry=await browser.newContext({viewport:{width:390,height:844}});
  const fallbackPage=await failedEntry.newPage();
  await fallbackPage.route('**/experience-entry-evidence.json',route=>route.fulfill({status:503,body:'Unavailable'}));
  await fallbackPage.goto(url,{waitUntil:'domcontentloaded'});
  await fallbackPage.waitForFunction(()=>document.querySelector('#experience-compare')?.dataset.loaded==='unavailable',null,{timeout:12000});
  need(await fallbackPage.locator('#experience-choice-a').isDisabled(),'missing entry evidence did not disable unsupported comparison controls');
  need((await fallbackPage.locator('#experience-a').innerText()).includes('DNR parking asset #1409')===false,'static fallback overpromised unknown source');
  need((await fallbackPage.locator('#experience-a .experience-entry-static').innerText()).includes('asset #1409'),'static source-backed Lake overview vanished on source outage');
  need((await fallbackPage.locator('#experience-compare-status').innerText()).includes('unavailable'),'entry source outage not explained to visitor');
  await failedEntry.close();
  const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await noJS.newPage();
  await page.goto(url,{waitUntil:'domcontentloaded'});
  need(await page.locator('article.story').count()===3,'no JS static experiences missing');
  need(await page.locator('#crossings .crossing-card').count()===4,'no JS verified DNR crossing evidence missing');
  need(await page.locator('.crossing-inventory-row').count()===9,'no JS bridge source cards missing');
  need(await page.locator('.crossing-alternative-grid>div').count()===3,'no JS crossing-safe itinerary alternatives missing');
  need(await page.locator('#sources a').count()>=5,'no JS official sources missing');
  need(await page.locator('.parking-card').count()===6,'no JS six DNR parking source cards missing');
  need((await page.locator('#experience-a').innerText()).includes('100 yards'),'no JS lake-of-clouds walking proof missing');
  need((await page.locator('#experience-b').innerText()).includes('half a mile'),'no JS Summit Peak walking proof missing');
  need(await page.locator('#experience-choice-a option').count()===6,'no JS six available comparison choices missing');
  need(await page.locator('.hero-quickstart a[href="#decision"]').count()===3,'no JS first-screen choosing links missing');
  need((await page.locator('.plan-vehicle-source').innerText()).includes('DNR recommends different staging'),'no JS DNR camper staging reminder missing');
  need((await page.locator('.plan-choice-static').innerText()).includes('separate trip'),'no JS separate attraction tradeoff not described');

  need((await page.locator('#experience-a .experience-entry-static').innerText()).includes('asset #1409'),'no JS lake source starting point missing');
  need((await page.locator('#experience-b .experience-entry-static').innerText()).includes('asset #72'),'no JS Summit Peak signed entry uncertainty missing');
  need(await page.locator('#read-landscape .journal-entry').count()===4,'no JS field journal stories missing');
  await page.locator('#experience-a .experience-fieldnote summary').click();
  need((await page.locator('#experience-a .experience-fieldnote-copy').innerText()).includes('Lake of the Clouds'),'no JS interpretive note failed to expand');
  need(await page.locator('#experience-map-compare').count()===1,'no JS map button absent but source parking list must remain');

  need(await page.locator('.trail-truth-card').count()===21,'no JS 21 static trail descriptions missing');
  need(await page.locator('.access-proof-lead').count()===1,'no JS source-backed 1.2km warning missing');
  await page.locator('#porkies-access-proof summary').click();
  need((await page.locator('#porkies-access-proof').innerText()).includes('Gogebic County Road Commission'),'no JS native access-proof disclosure failed');
  need((await page.locator('#west-corridor-field-note').innerText()).includes('County Road 519'),'no JS winter access corridor note missing');
  need((await page.locator('#west-corridor-field-note').innerText()).includes('September 22, 2026'),'no-JS township work-zone warning missing');
  need(await page.locator('#porkies-west-toggle').count()===1,'source-only west layer control should exist without JS');
  need(await page.locator('details[data-trail="escarpment"] .trail-edition-warning').count()===1,'no JS source mileage discrepancy hidden');
  need((await page.locator('#routing-explainer').innerText()).includes('7 disconnected groups'),'source-only trail topology fallback missing');
  need(await page.locator('.parking-maplink').count()===6,'no JS parking map pin links missing');
  need(await page.locator('.story a[href*="upper-peninsula-waterfalls"]').count()===3,'no JS waterfall handoffs missing');
  await page.screenshot({path:path.join(out,'no-js-mobile.png')});
  report.screenshots.push('no-js-mobile.png');
  report.cases.push({device:'no-JavaScript',stories:3,officialSources:true,fallWaterfallLinks:true});
  await noJS.close();
 }catch(e){report.failures.push(e.stack||String(e));}
 finally {
  await fs.promises.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
 }
 console.log(JSON.stringify(report,null,2));
 if(report.failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
