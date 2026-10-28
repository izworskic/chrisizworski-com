import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const url='http://127.0.0.1:4173/michigan-winter-trails/',out='artifacts/michigan-winter-trails-visual';
await mkdir(out,{recursive:true});
const report={guide:'Michigan Winter Trails',viewports:[],images:[],map:[],issues:[],accessFilter:[],blockedPhoto:false,noJS:false};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const check=(ok,msg)=>{if(!ok)report.issues.push(msg)};
try{
 for(const width of [320,390,768,1366]){
  const p=await browser.newPage({viewport:{width,height:width===1366?900:844}});
  await p.route('**/unpkg.com/**', route=>route.abort('failed'));
  await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  const leafletLoaded=await p.evaluate(()=>typeof window.L!=='undefined' && typeof window.L.map==='function');
  check(leafletLoaded,'locally served Leaflet did not initialize at '+width);
  await p.locator('.wf-story').first().waitFor();
  await p.waitForTimeout(1300);
  const count=await p.locator('.wf-story:visible').count();
  const overflow=await p.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
  check(count===15,'initial 15 trail systems missing at '+width);check(overflow<=1,'overflow '+overflow+' at '+width);
  await p.screenshot({path:out+'/hero-'+width+'.png'});
  if(width===390||width===1366){
   await p.locator('#trl-use-stage').scrollIntoViewIfNeeded();
   await p.locator('[data-use="fatbike"]').click();
   check((await p.locator('#trl-use-title').textContent()).includes('Dune fat-bike'),'trail use decoder did not update at '+width);
   await p.screenshot({path:out+'/science-'+width+'.png'});
   await p.locator('#wf-map').scrollIntoViewIfNeeded();
   await p.waitForTimeout(1400);
   const mapState=await p.locator('#wf-map-message').textContent();
   check(!/map unavailable|map could not start|interactive map unavailable/i.test(mapState||''),'map failed while unpkg blocked at '+width+': '+mapState);
   const markers=await p.locator('.leaflet-marker-icon').count();
   const multi=await p.locator('.wf-pin-multi').count();
   check(markers>=10,'map markers missing at '+width);check(multi>=1,'Vasa marker grouping missing at '+width);
   await p.screenshot({path:out+'/map-'+width+'.png'});
   report.map.push({width,markers,multi,status:await p.locator('#wf-map-message').textContent()});
   const directMaps=await p.locator('#wf-stories a.trl-google-map-link').count();
   check(directMaps===15,'Google Maps location handoffs: expected 15 got '+directMaps+' at '+width);
   const mapHref=await p.locator('#wf-stories a.trl-google-map-link').first().getAttribute('href');
   check(mapHref?.includes('maps/search/?api=1&query=')&&mapHref?.includes('46.4100'),'invalid destination map URL at '+width);
   let loaded=0,fallback=0,unhandled=[];
   const images=p.locator('figure.wf-photo img');
   for(let i=0;i<await images.count();i++){
    const im=images.nth(i);
    await im.evaluate(el=>el.closest('figure')?.scrollIntoView({block:'center'}));
    await im.evaluate(el=>el.hidden?Promise.resolve():el.decode().catch(()=>{}));await p.waitForTimeout(200);
    const state=await im.evaluate(el=>({ok:el.naturalWidth>0,alt:el.alt,status:el.closest('figure')?.dataset.mediaStatus}));
    if(state.ok)loaded++;else if(state.status==='fallback')fallback++;else unhandled.push(state.alt);
   }
   check(unhandled.length===0,'unhandled broken image '+unhandled.join('|'));
   report.images.push({width,total:await images.count(),loaded,fallback,unhandled});
   await p.locator('#stop-11').scrollIntoViewIfNeeded();
   await p.screenshot({path:out+'/cards-'+width+'.png'});
   await p.locator('.wf-chip[data-tag="snowshoe"]').click();
   let snowshoe=await p.locator('.wf-story:visible').count();
   check(snowshoe===5,'snowshoe filter expected 5, got '+snowshoe+' at '+width);
   await p.locator('#wf-region').selectOption('up');
   let upper=await p.locator('.wf-story:visible').count();
   check(upper===2,'UP snowshoe filter expected 2, got '+upper+' at '+width);
   await p.locator('#wf-reset').click();
   await p.locator('#trl-access').selectOption('limited');
   let limited=await p.locator('.wf-story:visible').count();
   check(limited===2,'limited access filter expected 2 (Porkies + Negwegon), got '+limited+' at '+width);
   await p.locator('#wf-reset').click();
   check(await p.locator('.wf-story:visible').count()===15,'reset failed at '+width);
   report.accessFilter.push({width,snowshoe,upper,limited});
  }
  report.viewports.push({width,overflow,places:count});await p.close();
 }
 const blocked=await browser.newPage({viewport:{width:390,height:844}});
 for(const domain of ['**/commons.wikimedia.org/**','**/upload.wikimedia.org/**','**/thumb.wikimedia.org/**','**/www.nps.gov/**'])await blocked.route(domain,route=>route.abort('failed'));
 await blocked.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 const figure=blocked.locator('.trl-hero-montage figure.wf-photo').first();await figure.scrollIntoViewIfNeeded();await blocked.waitForTimeout(1100);
 const f=await figure.evaluate(el=>({state:el.dataset.mediaStatus,caption:el.querySelector('figcaption')?.textContent,panel:el.querySelector('.wf-photo-unavailable')?.textContent}));
 check(f.state==='fallback'&&f.panel?.includes('IMAGE UNAVAILABLE')&&f.caption?.includes('National Park Service'),'blocked-image photo credit fallback failed');
 report.blockedPhoto=f.state==='fallback';await blocked.screenshot({path:out+'/blocked-source-fallback-390.png'});await blocked.close();
 const nojs=await browser.newPage({javaScriptEnabled:false});
 await nojs.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 report.noJS=(await nojs.locator('.wf-story').count())===15&&(await nojs.locator('a[href^="https://www.michigan.gov"]').count())>0;
 check(report.noJS,'no-JS source narrative failed');await nojs.close();
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('Michigan Winter Trails QA report:',JSON.stringify(report));
if(report.issues.length)process.exitCode=1;
