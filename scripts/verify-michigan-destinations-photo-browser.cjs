#!/usr/bin/env node
'use strict';
/*
 * Live Michigan Adventure Finder photography acceptance check.
 * Tests actual scrolling into each destination, not offscreen element screenshots:
 * a screenshot of an offscreen lazy image can misleadingly show the CSS placeholder.
 * No user credentials, location permission, ad modifications or key logging.
 */
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const ROOT = path.resolve(__dirname, '../artifacts/michigan-destinations-photo');
const URL = process.env.MICHIGAN_DESTINATIONS_URL || 'https://chrisizworski.com/michigan-destinations/';
fs.mkdirSync(ROOT,{recursive:true});
const expected = 20;
const report={url:URL,checkedAt:new Date().toISOString(),views:[],outcomes:[],errors:[]};
function assert(x,msg){if(!x)throw new Error(msg)}
async function runView(browser, viewport) {
  const name=viewport.width < 600 ? 'phone390' : 'desktop1366';
  const context=await browser.newContext({viewport,deviceScaleFactor:1,locale:'en-US',reducedMotion:'reduce'});
  const page=await context.newPage();
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error' && /michigan-destinations/.test(message.text()))jsErrors.push(message.text())});
  const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:45000});
  assert(response && response.status()===200,name+': destination HTML status was not 200');
  const cards=page.locator('article.destination');
  const count=await cards.count();
  assert(count===expected,name+': expected '+expected+' cards, got '+count);
  // The public page starts with every destination visible regardless of month.
  await page.waitForFunction(()=>document.querySelectorAll('.destination-photo.card img').length===20);
  await page.locator('.hero-gallery').screenshot({path:path.join(ROOT,name+'-hero.jpg'),type:'jpeg',quality:76});
  const results=[];
  for(let i=0;i<expected;i++){
    const card=cards.nth(i);
    const id=await card.getAttribute('id');
    const img=card.locator('.destination-photo.card img');
    await img.scrollIntoViewIfNeeded({timeout:12000});
    try {
      await img.evaluate(async el=>{
        if(el.complete && el.naturalWidth > 0)return;
        await new Promise((resolve,reject)=>{
          let timer=setTimeout(()=>reject(Error('Image not loaded after scroll')),16000);
          const good=()=>{clearTimeout(timer);resolve()};
          const bad=()=>{clearTimeout(timer);reject(Error('Image load error'))};
          el.addEventListener('load',good,{once:true});
          el.addEventListener('error',bad,{once:true});
          if(el.complete)el.naturalWidth ? good():bad();
        });
      });
    } catch(error) {
      results.push({id,ok:false,reason:String(error.message).slice(0,220)});
      continue;
    }
    const status=await img.evaluate(el=>({complete:el.complete,width:el.naturalWidth,height:el.naturalHeight,currentSrc:el.currentSrc,alt:el.alt}));
    const creditCount=await card.locator('.photo-credit a').count();
    const ok=status.width>100 && status.height>100 && creditCount>=2 && status.alt.length>15;
    results.push({id,ok,width:status.width,height:status.height,credits:creditCount,reason:ok?'': 'Missing image dimensions, descriptive alt, or linked author/license credits'});
    if([0,3,4,10,11,12,13,16,19].includes(i)){
      await card.screenshot({path:path.join(ROOT,name+'-'+id+'.jpg'),type:'jpeg',quality:76});
    }
  }
  const mapStatus=await page.locator('#map-status').innerText();
  const markerCount=await page.locator('.leaflet-marker-icon').count();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const view={name,cardCount:count,photoCount:results.filter(x=>x.ok).length,markerCount,mapStatus,overflowPx:overflow,jsErrors};
  report.views.push(view);
  report.outcomes.push(...results.map(x=>({...x,viewport:name})));
  if(overflow>2)report.errors.push(name+': horizontal overflow '+overflow+'px');
  if(jsErrors.length)report.errors.push(name+': JS errors '+jsErrors.slice(0,3).join('; '));
  if(markerCount<15)report.errors.push(name+': fewer than 15 location markers');
  if(!/CARTO map loaded|OpenStreetMap/.test(mapStatus))report.errors.push(name+': map did not report rendered tiles: '+mapStatus);
  await context.close();
}
(async ()=>{
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    await runView(browser,{width:1366,height:900});
    await runView(browser,{width:390,height:844});
    const bad=report.outcomes.filter(x=>!x.ok);
    if(bad.length)report.errors.push('Destination photos failed on actual scroll: '+bad.map(x=>x.viewport+':'+x.id+'('+x.reason+')').join(', '));
  }catch(error){report.errors.push(String(error.stack||error))}
  finally{
    if(browser)await browser.close();
    fs.writeFileSync(path.join(ROOT,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({views:report.views,broken:report.outcomes.filter(x=>!x.ok),errors:report.errors},null,2));
    if(report.errors.length)process.exitCode=1;
  }
})();
