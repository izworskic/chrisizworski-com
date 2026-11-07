#!/usr/bin/env node
// Synthetic acceptance only. No provider request, production or visitor-outcome claim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/experience-foundry');
(async()=>{
 const {compile}=await import('../experience-foundry/lib/foundry.mjs');
 const {scenarioSpec,asOf}=await import('../experience-foundry/fixtures/scenarios.mjs');
 const registry=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/tool-network-registry.json')));
 const base=JSON.parse(fs.readFileSync(path.join(root,'experience-foundry/examples/saginaw-field-notes.json')));
 const pages=new Map();
 for(const recipe of ['field-notes','passage-log'])for(const scenario of ['populated','empty','stale','expired','conflict','hostile']){
  pages.set('/'+recipe+'/'+scenario,compile(scenarioSpec({...base,recipe},scenario),registry,{now:new Date(asOf)}).html);
 }
 const server=http.createServer((req,res)=>{
  const html=pages.get(req.url);
  res.writeHead(html?200:404,{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex, nofollow'});res.end(html||'Not found');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 let browser;
 const results=[];
 fs.mkdirSync(out,{recursive:true});
 try {
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
  for(const width of [360,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await context.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   for(const recipe of ['field-notes','passage-log']){
    for(const scenario of ['populated','empty','stale','expired','conflict','hostile']){
     await page.goto(url+'/'+recipe+'/'+scenario);
     assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex,nofollow,noarchive');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,recipe+'/'+scenario+' overflow at '+width);
     assert.equal(await page.evaluate(()=>Boolean(window.foundryInjected)),false);
     if(scenario==='stale') assert.match(await page.locator('main').innerText(),/STALE OBSERVATION/);
     if(scenario==='expired') {assert.match(await page.locator('main').innerText(),/EXPIRED FORECAST/);assert.match(await page.locator('main').innerText(),/EXPIRED NOTICE/);}
     if(scenario==='conflict') assert.match(await page.locator('main').innerText(),/CONFLICTING EVIDENCE/);
     if(scenario==='empty') assert.match(await page.locator('main').innerText(),/No (qualified field records|source-linked passages) supplied/);
     if(scenario==='populated'){
      if(recipe==='field-notes'){
       const control=page.locator('#evidence-filter');
       await control.selectOption('forecast');assert.equal(await page.locator('#field-entries li:visible').count(),1);
       assert.match(await page.locator('#field-entries li:visible').innerText(),/Beta forecast/);
       await control.selectOption('observation');assert.match(await page.locator('#field-entries li:visible').innerText(),/Alpha record/);
       await control.focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');
       assert.equal(await page.locator('#field-entries li:visible').count(),3);
       assert.match(await page.locator('#record-count').innerText(),/3 of 3/);
       assert.equal(await control.evaluate(e=>document.activeElement===e),true);
      }else{
       const a=page.locator('[data-event="0"]'),b=page.locator('[data-event="1"]');
       await b.focus();await page.keyboard.press('Enter');
       assert.match(await page.locator('#focus-title').innerText(),/Beta forecast/);
       assert.match(await page.locator('#from').innerText(),/origin B/);
       assert.match(await page.locator('#quality').innerText(),/Forecast, not observed/);
       assert.equal(await b.getAttribute('aria-pressed'),'true');
       await a.click();assert.match(await page.locator('#focus-title').innerText(),/Alpha record/);
       await page.locator('[data-event="2"]').click();assert.match(await page.locator('#scope').innerText(),/Illustrative gate only/);
       await a.click();assert.equal(await page.locator('#scope').innerText(),'');
       assert.equal(await page.locator('[aria-pressed=true]').count(),1);
      }
      await page.screenshot({path:path.join(out,recipe+'-'+width+'-interaction.png'),fullPage:true});
     }
     if(width===390&&['empty','hostile'].includes(scenario))await page.screenshot({path:path.join(out,recipe+'-'+scenario+'-390.png'),fullPage:true});
     results.push({recipe,scenario,width,status:'PASSED'});
    }
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  for(const recipe of ['field-notes','passage-log']){
   const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
   const page=await context.newPage();await page.goto(url+'/'+recipe+'/populated');
   const archive=page.locator(recipe==='field-notes'?'#field-entries':'.archive');
   for(const title of ['Synthetic Alpha record','Synthetic Beta forecast','Synthetic scoped notice'])assert.match(await archive.innerText(),new RegExp(title));
   assert.equal(await archive.locator('a[href="https://example.com/synthetic-foundry-fixture"]').count(),3);
   await page.screenshot({path:path.join(out,recipe+'-no-js-390.png'),fullPage:true});
   results.push({recipe,scenario:'no-JS',width:390,status:'PASSED'});await context.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASSED',scope:'Synthetic browser acceptance; not source truth, production or manual screen-reader proof',evaluatedAt:asOf,results},null,2));
  console.log('Foundry browser acceptance: '+results.length+' cases passed. Screenshots: '+out);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
