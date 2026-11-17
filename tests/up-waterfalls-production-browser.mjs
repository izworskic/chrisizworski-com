#!/usr/bin/env node
// Read-only public waterfall explorer browser audit. No previews, accounts or data writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire('/tmp/up-waterfalls-production-playwright/package.json');
const {chromium}=require('playwright');
const origin='https://chrisizworski.com';
const path='/upper-peninsula-waterfalls/';
const folder='/tmp/up-waterfalls-production-audit';
await fs.mkdir(folder,{recursive:true});
const expected=JSON.parse(await fs.readFile('data/up-waterfalls.json','utf8')).waterfalls.length;
const checks=[];
async function check(label,callback){
  try{const detail=await callback();checks.push({label,passed:true,detail:detail||'PASS'});console.log('PASS '+label);}
  catch(error){checks.push({label,passed:false,error:String(error.message||error)});console.error('FAIL '+label+': '+String(error.message||error));}
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.UP_WATERFALL_CHROME?{executablePath:process.env.UP_WATERFALL_CHROME}:{})});
try{
  for(const width of [390,1440]){
    const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width===390,hasTouch:width===390});
    try{
      let response;
      await check('public '+width+'px page responds with usable HTML',async()=>{
        response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:45000});
        assert.equal(response?.status(),200);
        await page.locator('[data-fall]').first().waitFor({timeout:20000});
        assert.equal(await page.locator('[data-fall]').count(),expected);
        assert.equal(await page.locator('h1').count(),1);
        assert.equal(await page.locator('.upfall-hero-photo-wall').count(),0);
        assert.equal(await page.locator('#visit-lens').count(),1);
        assert.equal(await page.locator('#falls-map').count(),1);
        assert.equal(await page.locator('#shortlist').count(),1);
        return 'HTTP 200, '+expected+' curated cards, no top photo wall';
      });
      await check('public '+width+'px map initializes and renders an actual tile',async()=>{
        await page.waitForFunction(()=>!!window.UPWaterfallMap&&!!document.querySelector('#falls-map.leaflet-container'),null,{timeout:20000});
        await page.waitForFunction(()=>[...document.querySelectorAll('#falls-map img.leaflet-tile')].some(img=>img.complete&&img.naturalWidth>=200),null,{timeout:20000});
        assert.ok(await page.locator('#falls-map .leaflet-marker-icon').count()>0,'no rendered waterfall pins');
        const status=await page.locator('#falls-basemap-status').innerText();
        return 'tile loaded, markers rendered, map status: '+status.slice(0,140);
      });
      await check('public '+width+'px remains within viewport',async()=>{
        const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
        assert.ok(size.scroll<=size.width+2,'horizontal overflow '+size.scroll+' > '+size.width);
        return JSON.stringify(size);
      });
      if(width===390){
        await check('public mobile waterfall search and save complete a useful round trip',async()=>{
          await page.locator('#q').fill('Wagner');
          await page.waitForTimeout(350);
          const found=page.locator('[data-fall][data-id="wagner-falls"]');
          assert.ok(await found.isVisible(),'Wagner Falls hidden after search');
          assert.equal(await page.locator('[data-fall]:visible').count(),1,'search should narrow visible falls');
          const guide=await found.locator('h3 a').getAttribute('href');
          assert.equal(guide,'/upper-peninsula-waterfalls/wagner-falls/');
          await found.locator('button.save').click();
          assert.match(await page.locator('#selected-list').innerText(),/Wagner Falls/);
          await page.locator('#clear-list').click();
          assert.doesNotMatch(await page.locator('#selected-list').innerText(),/Wagner Falls/);
          await page.locator('#q').fill('');
        });
        await check('public mobile date and visit-length choices react',async()=>{
          await page.locator('#visit-budget').selectOption('30');
          assert.match(await page.locator('#visit-baseline').innerText(),/up to 30 minutes/i);
          await page.locator('#visit-budget').selectOption('60');
          assert.ok(await page.locator('#visit-picks [data-visit-pick]').count()>0,'visit matcher has no candidates');
          const urls=await page.locator('#visit-picks .waterfall-google-link').evaluateAll(links=>links.map(link=>link.href));
          assert.ok(urls.length>0);
          assert.ok(urls.every(url=>url.startsWith('https://www.google.com/maps/search/?api=1&query=')));
          assert.ok(urls.every(url=>!url.includes('/maps/dir/')));
          return 'time control works; place links are searches, not unverified driving routes';
        });
      }
      await page.screenshot({path:folder+'/hub-'+width+'.png',fullPage:false,animations:'disabled'});
    }finally{await page.close();}
  }
  const request=await browser.newContext();
  try{
    for(const name of ['dead-river-falls','au-train-falls','alger-falls-highway-parking-review']){
      await check('public research-only '+name+' does not offer a route',async()=>{
        const url=origin+path+'research/'+name+'/';
        const response=await request.request.get(url,{timeout:30000});
        assert.equal(response.status(),200);
        const html=await response.text();
        assert.match(html,/name="robots" content="noindex,follow"/);
        assert.doesNotMatch(html,/https:\/\/www\.google\.com\/maps\/dir\//);
        assert.match(html,/research|not cleared|not proven|access/i);
        return 'HTTP 200, noindex, no driving route';
      });
    }
  }finally{await request.close();}
}finally{await browser.close();}
await fs.writeFile(folder+'/audit.json',JSON.stringify({url:origin+path,checkedAt:new Date().toISOString(),expectedCurated:expected,checks},null,2)+'\n');
console.log('Production browser checks: '+checks.filter(x=>x.passed).length+'/'+checks.length+' passed.');
if(checks.some(x=>!x.passed))process.exitCode=1;
