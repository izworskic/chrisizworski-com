#!/usr/bin/env node
'use strict';
// Real Chromium evidence for the shared beach field-note presentation.
// Mocks explicitly labeled model/sensor responses. This does not prove live data accuracy.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.SHORE_PW_MODULE||'playwright');
const {beachConditions}=require('../lib/shorefeel/beach-network.js');
const root=path.resolve(__dirname,'../public');
const out=path.resolve(process.env.SHORE_QA_OUTPUT||'artifacts/shorefeel-beach-qa');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  let filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(filename!==root&&!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(fs.statSync(filename).isDirectory())filename=path.join(filename,'index.html');
  res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'text/plain'});
  fs.createReadStream(filename).pipe(res);
 }catch{res.writeHead(404);res.end('not found');}
});
const locations=[
 {slug:'bay-city-state-park',name:'Bay City State Park',lake:'Lake Huron',swimming:true},
 {slug:'whitefish-point',name:'Whitefish Point',lake:'Lake Superior',swimming:true},
 {slug:'wenonah-park',name:'Wenonah Park',lake:'Lake Huron',swimming:false},
 {slug:'warren-dunes-state-park',name:'Warren Dunes State Park',lake:'Lake Michigan',swimming:true},
 {slug:'luna-pier',name:'Luna Pier',lake:'Lake Erie',swimming:true},
 {slug:'miners-beach',name:'Miners Beach',lake:'Lake Superior',swimming:true}
];
const sources=Object.fromEntries(['beachguard','weather','buoys','hazards','swim_risk'].map(k=>[k,{
 label:k==='weather'?'Open-Meteo forecast':'Official source',status:k==='weather'?'live':'unavailable',
 active_alert_count:null
}]));
function payload(place,mode){
 const now=new Date(),validAt=new Date(now.getTime()-10*60000).toISOString();
 const weather={current:{valid_at_utc:validAt,temperature_f:82,apparent_temperature_f:86,wind_mph:14},
 today:{temperature_max_f:83,precipitation_probability_max:12,wind_gusts_max_mph:17},forecast:[]};
 const lake={fresh:true,water_temp_f:66,wave_height_ft:1.5,station_id:'45163',distance_miles:22};
 const feel=mode==='unavailable'
  ?beachConditions(place,{current:{...weather.current,valid_at_utc:new Date(now.getTime()-5*3600000).toISOString()}},lake,now)
  :beachConditions(place,weather,lake,now);
 return {generated_at:now.toISOString(),season:{active:false,starts_on:'2027-05-15'},
  sources,active_nws_alerts:[],beaches:[{...place,url:'/great-lakes-beaches/'+place.slug+'/',
   shore_feel:feel,weather,lake_conditions:lake,
   rating:{score:null,label:'Source incomplete',reasons:[]},
   water_quality:{state:'unavailable',official_url:'https://mienviro.michigan.gov/nsite/beach/map/results'},
   swim_risk:{status:'unavailable',official_url:'https://www.weather.gov/greatlakes/beachhazards'},
   posted_flag:{label:'Check flags on arrival',official_url:'https://www.michigan.gov/dnr/education/safety-info/beach-safety'},
   hazards:[]
  }]};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const report=[];
  for(const width of [360,390,768,1366,1440]){
   for(const place of locations){
    const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
    await context.route('**/api/beaches?*',route=>route.fulfill({
     status:200,contentType:'application/json',body:JSON.stringify(payload(place,'ok'))}));
    await context.route('https://**/*',route=>route.abort());
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(origin+'/great-lakes-beaches/'+place.slug+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-shorefeel-value]')?.textContent==='86°F',
     {timeout:15000});
    // Check the painted result, not the same event-loop tick as a source update.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const headline=await page.locator('#shorefeel-heading').innerText();
    assert.match(headline,place.swimming?/at the beach/i:/on the waterfront/i);
    assert.match(await page.locator('[data-shorefeel-method]').innerText(),/Modeled apparent temperature/i);
    assert.match(await page.locator('[data-shorefeel-narrative]').innerText(),/wind|breeze/i);
    if(!place.swimming)assert.match(await page.locator('[data-shorefeel-water]').innerText(),/riverfront viewpoint/);
    const composition=await page.evaluate(()=>{
      const answer=document.querySelector('.shorefeel-primary');
      const value=document.querySelector('[data-shorefeel-value]');
      const photo=document.querySelector('.shorefeel-landscape');
      const secondary=document.querySelector('.beach-detail-layout');
      const intro=document.querySelector('.shorefeel-place-head');
      const rect=value.getBoundingClientRect();
      return {
        valueY:rect.top,
        numberPx:parseFloat(getComputedStyle(value).fontSize),
        numberRules:{
          status:answer.dataset.status,
          host:document.querySelector('[data-shorefeel]')?.dataset.status,
          css:getComputedStyle(value).fontSize,
          selectorMatches:value.matches('body[data-beach-report-page="detail"] .shorefeel-primary[data-status="forecast"] .shorefeel-main strong[data-shorefeel-value]'),
          parent:value.parentElement?.className,
          inline:value.style.cssText,
          stylesheets:[...document.styleSheets].map(x=>x.href||'inline').slice(0,8),
          matchedRules:[...document.styleSheets].flatMap(sheet=>{
            try{return [...sheet.cssRules].filter(rule=>rule.selectorText&&rule.selectorText.includes('shorefeel-primary')&&rule.selectorText.includes('strong')).map(rule=>({selector:rule.selectorText,css:rule.style?.fontSize||''}))}
            catch{return[]}
          }).slice(-12)
        },
        answerTop:answer.getBoundingClientRect().top,
        introBottom:intro.getBoundingClientRect().bottom,
        primaryBeforeSecondary:!!(answer.compareDocumentPosition(secondary)&Node.DOCUMENT_POSITION_FOLLOWING),
        primaryBeforePhoto:!!(answer.compareDocumentPosition(photo)&Node.DOCUMENT_POSITION_FOLLOWING),
        photoImageCount:photo.querySelectorAll('img[loading="lazy"]').length,
        noGenericHero:!document.querySelector('body[data-beach-report-page="detail"] .hero'),
        photoContainsNoDynamicReading:!photo.querySelector('[data-shorefeel-value]')
      };
    });
    assert.ok(composition.primaryBeforeSecondary,'ShoreFeel must precede generic beach metrics');
    assert.ok(composition.primaryBeforePhoto,'The photo must not swallow the first answer');
    assert.ok(composition.noGenericHero,'The beach detail page must not lead with unrelated hero art');
    assert.equal(composition.photoImageCount,1,'The representative image should be a real lazy-loaded photo');
    assert.ok(composition.photoContainsNoDynamicReading);
    assert.ok(composition.numberPx>=60,'Source-based numeric answer must be visibly large: '+place.slug+' '+width+' '+JSON.stringify(composition));
    assert.ok(composition.valueY<750,'First phone screen must show the model number: '+JSON.stringify(composition));

    const info=await page.evaluate(()=>{
     const el=document.querySelector('.shorefeel-interpretation p');
     const viewport=document.documentElement.clientWidth;
     const oversized=[...document.querySelectorAll('body *')].map(e=>({el:e,r:e.getBoundingClientRect()}))
      .filter(x=>x.r.width>0&&(x.r.right>viewport+2||x.r.left< -2))
      .slice(0,12).map(x=>({node:x.el.tagName+'.'+String(x.el.className||'').slice(0,60),left:Math.round(x.r.left),right:Math.round(x.r.right)}));
     return {viewport,
      pageWidth:document.documentElement.scrollWidth,
      bodyPx:parseFloat(getComputedStyle(el).fontSize),oversized};
    });
    assert.ok(info.pageWidth<=info.viewport+2,'horizontal overflow at '+width+' '+place.slug+' '+JSON.stringify(info.oversized));
    assert.ok(info.bodyPx>=14,'body prose needs readable size '+place.slug);
    assert.deepEqual(errors,[],'browser errors '+place.slug);
    await page.screenshot({path:path.join(out,'network-'+place.slug+'-'+width+'.png'),fullPage:true});
    report.push({width,beach:place.slug,mode:'source-backed',...info});
    await context.close();
   }
  }
  const context=await browser.newContext({viewport:{width:390,height:850}});
  const place=locations[0];
  await context.route('**/api/beaches?*',route=>route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify(payload(place,'unavailable'))}));
  await context.route('https://**/*',route=>route.abort());
  const page=await context.newPage();
  await page.goto(origin+'/great-lakes-beaches/'+place.slug+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-shorefeel-value]')?.textContent==='No recent forecast',
   {timeout:15000});
  assert.match(await page.locator('[data-shorefeel-time]').innerText(),/No verified recent/);
  assert.ok(parseFloat(await page.locator('[data-shorefeel-value]').evaluate(el=>getComputedStyle(el).fontSize))<45,
    'The no-data sentence should not masquerade as a large numeric reading');
  await page.screenshot({path:path.join(out,'network-stale-390.png'),fullPage:true});
  await context.close();
  // Exercise the legacy shared water-temperature consumer, including independent
  // model dependencies for the two Traverse City beaches.
  for(const width of [390,1366]){
   for(const mode of ['complete','west-expired','weather-expired','packet-expired']){
    const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
    const n=Date.now(),at=offset=>new Date(n+offset).toISOString(),H=3600000;
    const west={tempF:60,observedAt:at(-H)},east={tempF:62,observedAt:at(-H)};
    const model=(key,name,m)=>({key,name,levelKind:'satellite',levelTempF:m.tempF,levelObservedAt:m.observedAt,points:[0,24,48].map(leadH=>({leadH,startsAt:at(leadH*H),tempF:m.tempF,low:m.tempF-2,high:m.tempF+2}))});
    const today=new Date(n).toISOString().slice(0,10);
    const data={generatedAt:at(-60000),water:{kind:'satellite',...west,where:'Grand Traverse Bay',label:'NOAA west-bay pixel',caveat:'Offshore analysis'},
      local:{stationId:'45020',stationName:'NOAA test station',lat:44.8,lon:-85.6,measurement:null,periods:[{startsAt:at(H),tempF:99,windMph:10}],caveat:'Offshore buoy'},
      regionalSatellite:{cells:[{key:'west-bay',measurement:west},{key:'east-bay',measurement:east}]},
      weatherNow:{startsAt:at(-H/2),tempF:80,windMph:12,summary:'Sunny'},
      assessments:{swim:{heading:'Swimming preparation',beach:'Air forecast 80°F',water:'Nearby water 60°F',after:'Wind exposure',decision:'Check hazards'}},
      weatherWindows:{swim:{startsAt:at(H),tempF:80,windMph:12,summary:'Sunny'}},
      lakes:{michigan:{status:'recent',latest:{date:today,tempF:50},history:[],trend7:null}},
      beachForecast:{status:'available',cycle:at(-6*H),beaches:[model('clinch-park','Clinch Park beach',west),model('tc-state-park','Traverse City State Park beach',east)],validation:{error24hF:1.31,error48hF:1.87},method:'Fixture',caveat:'Not a safety forecast'}};
    if(mode==='west-expired'){west.observedAt=at(-73*H);data.water.observedAt=west.observedAt;}
    if(mode==='weather-expired')data.weatherNow.startsAt=at(-H);
    if(mode==='packet-expired')data.generatedAt=at(-31*60000);
    await ctx.route('**/api/shorefeel?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)}));
    await ctx.route('https://**/*',route=>route.abort());
    const pg=await ctx.newPage(),errors=[];
    pg.on('pageerror',e=>errors.push(e.message));
    await pg.goto(origin+'/lake-michigan-water-temperature/traverse-city/',{waitUntil:'domcontentloaded'});
    await pg.waitForFunction(()=>document.querySelector('#lead-temp')?.textContent==='60.0°F'||document.querySelector('#lead-temp')?.textContent==='No current reading',null,{timeout:15000});
    const count=mode==='west-expired'?1:mode==='packet-expired'?0:2;
    assert.equal(await pg.locator('#bf-body .bf-card').count(),count,'independent forecast cell dependencies');
    if(mode==='west-expired'){
     assert.match(await pg.locator('#lead-temp').innerText(),/No current reading/);
     assert.match(await pg.locator('#bf-body').innerText(),/Traverse City State Park beach/);
     assert.doesNotMatch(await pg.locator('#bf-body').innerText(),/Clinch Park beach/);
    }else assert.match(await pg.locator('#lead-temp').innerText(),/60.0°F/);
    assert.equal(await pg.locator('#air-temp').innerText(),['weather-expired','packet-expired'].includes(mode)?'Unavailable':'80°F');
    if(mode==='packet-expired')assert.match(await pg.locator('#weather-window').innerText(),/No reliable/);
    assert.deepEqual(errors,[]);
    await pg.screenshot({path:path.join(out,'dependency-traverse-'+mode+'-'+width+'.png'),fullPage:true});
    report.push({width,beach:'traverse-city',mode,modelCards:count});
    await ctx.close();
   }
  }
  console.log(JSON.stringify({status:'passed',report,stale:'no fabricated air value'},null,2));
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
