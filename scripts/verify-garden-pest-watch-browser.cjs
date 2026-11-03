'use strict';
// Experience OS v1.2.1 Garden Pest Watch browser test. Fixture-based scientific
// states are NOT a validation of live Michigan pest emergence or NWS availability.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {chromium}=require('playwright');
const {decision}=require('../lib/garden-pest-watch.cjs');
const ORIGIN='http://127.0.0.1:8779';
const frames=[360,390,768,1440];
const weather={status:'AVAILABLE',source:'National Weather Service',sourceUrl:'https://www.weather.gov/documentation/services-web-api',issuedAt:'2026-07-12T15:00:00Z',forecastLowF:65,forecastHighF:87,summary:'Several hot, dry forecast hours suggest scouting for mites.',tags:['hot_dry']};
async function ready(){
 for(let n=0;n<35;n++){try{const x=await fetch(ORIGIN+'/michigan-garden-pest-watch/',{signal:AbortSignal.timeout(600)});if(x.ok)return;}catch{} await new Promise(resolve=>setTimeout(resolve,180));}
 throw Error('Garden Watch static test server unavailable');
}
function mockPayload(url,month=7){
 const crop=url.searchParams.get('crop')||'squash',stage=url.searchParams.get('stage')||'growing',observed=url.searchParams.get('observed')||null;
 const decisionData=decision({crop,stage,month,observed,weather});
 return {...decisionData,location:{name:url.searchParams.get('zip')?'ZIP '+url.searchParams.get('zip')+' area':'Bay City',kind:url.searchParams.get('zip')?'zcta-interior-point':'named-city',coordinateMeaning:'2020 Census ZCTA interior point, not a property'},weather,regionalObservation:{status:'UNAVAILABLE'},biologicalForecast:{status:'UNAVAILABLE'}};
}
function historyFixture(zip){
 const years=[2021,2022,2023,2024,2025];
 return {
  schema:'garden-pest-historical-lab-v1',status:'HISTORIC_MODELLED_RESEARCH_ONLY',
  publishedUse:'HISTORIC_RESEARCH_ONLY',realTimeForecast:'UNAVAILABLE',
  years,location:{name:zip?'ZIP '+zip+' area':'Bay City'},
  source:{url:'https://daymet.ornl.gov/single-pixel/api/data?lat=43.5945&lon=-83.8889&vars=tmax,tmin&years=2021,2022,2023,2024,2025'},
  events:[
   {id:'adults',stage:'Adult emergence heat threshold',status:'HISTORIC_MODELLED',yearsCrossed:5,medianYday:183,
    samples:years.map(year=>({year,date:year+'-07-02',yday:183}))},
   {id:'eggs',stage:'Egg hatch heat threshold',status:'HISTORIC_MODELLED',yearsCrossed:5,medianYday:222,
    samples:years.map(year=>({year,date:year+'-08-10',yday:222}))}
  ]
 };
}
function beetleFixture(url){
 const crop=url.searchParams.get('crop')||'roses',zip=url.searchParams.get('zip'),name=zip?'ZIP '+zip+' area':'Bay City';
 return {schema:'japanese-beetle-forecast-truth-v1',status:'OFFICIAL_MODEL_AVAILABLE',sourceKind:'OFFICIAL_SPECIES_SPECIFIC_GRIDDED_MODEL',
  sourceDate:'2026-11-02',year:2026,crop,
  location:{name,kind:zip?'zcta-interior-point':'named-city'},
  stages:{adult:{dayOfYear:186,approximateDate:'2026-07-05'},egg:{dayOfYear:217.1929,approximateDate:'2026-08-05'}},
  verdict:{status:'OFF_SEASON',verdict:'Past-season model record',action:'No current adult-emergence claim. Review past model stages and plan next summer’s leaf checks.'},
  source:{coverageUrl:'https://geoserver.usanpn.org/geoserver/wcs?service=WCS&request=DescribeCoverage&coverage=gdd%3Ajapanese_beetle_adult'}};
}
async function routeFixtures(page,month=7){
 await page.route('**/*',route=>route.request().url().startsWith(ORIGIN)?route.continue():route.abort());
 await page.route('**/api/garden-pest-field-observations?*',route=>{
  const u=new URL(route.request().url()),z=u.searchParams.get('zip'),y=Number(u.searchParams.get('year'));
  if(z==='48707')return route.fulfill({status:503,contentType:'application/json',body:'{"status":"UNAVAILABLE"}'});
  const date=y+'-07-06';
  const data={schema:'garden-pest-field-observations-v1',species:'squash-vine-borer',year:y,
   checkedAt:'2026-11-03T16:00:00Z',status:'DOCUMENTED_SPECIES_PHOTO',
   sourceKind:'OPPORTUNISTIC_SPECIES_PHOTOGRAPH',lifeStage:'NOT_INDEPENDENTLY_VERIFIED',
   seasonContext:'PAST_OR_DORMANT_SEASON_RECORDS',
   location:{name:z?'ZIP '+z+' area':'Bay City',searchRadiusKm:25},
   records:{inspectedResults:8,qualifyingRecords:2,limitedSearch:false,firstSampledDate:date,
    sampleNote:'Photo uploads are voluntary, not a standardized survey.',
    examples:[{date,url:'https://www.inaturalist.org/observations/123456789'}]}};
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.route('**/api/japanese-beetle-forecast?*',route=>{
  const u=new URL(route.request().url());
  if(u.searchParams.get('zip')==='48707'){
   return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'UNAVAILABLE',code:'CENSUS_ZIP_UNAVAILABLE'})});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(beetleFixture(u))});
 });
 await page.route('**/api/japanese-beetle-field-evidence?*',route=>{
  const u=new URL(route.request().url()),zip=u.searchParams.get('zip');
  if(zip==='48707')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'UNAVAILABLE'})});
  const year=Number(u.searchParams.get('year')),date=zip?'2026-07-06':'2026-07-05';
  const recordUrl='https://www.inaturalist.org/observations/'+(zip?'379100595':'378482973');
  const data={schema:'japanese-beetle-field-evidence-v1',status:'DOCUMENTED_PRESENCE',adultLifeStage:'NOT_VERIFIED_BY_SPECIES_IDENTIFICATION',year,checkedAt:'2026-11-02T20:00:00Z',
   observationalEvidence:{status:'DOCUMENTED_PRESENCE',firstObservationDate:date,inspectedResults:11,qualifyingRecords:8,limitedSearch:false,
    examples:[{date,url:recordUrl,distanceKm:1.8,positionAccuracyMeters:162}]}};
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.route('**/api/garden-pest-timing-lab?*',route=>{
  const u=new URL(route.request().url());
  route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(historyFixture(u.searchParams.get('zip')))});
 });
 await page.route('**/api/michigan-garden-pest-watch?*',async route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.get('zip')==='48707'){
   await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'UNAVAILABLE',code:'ZIP_LOOKUP_UNAVAILABLE'})});return;
  }
  if(url.searchParams.get('crop')==='tomatoes' && url.searchParams.get('stage')==='seedling'){
    await new Promise(resolve=>setTimeout(resolve,180));
  }
  const body=JSON.stringify(mockPayload(url,month));
  await route.fulfill({status:200,contentType:'application/json',body});
 });
}
async function waitForAnswer(page,pest){await page.waitForFunction(name=>document.querySelector('#watch-cards')?.textContent?.includes(name),pest,{timeout:6000});}
(async()=>{
 const server=spawn('python3',['-m','http.server','8779','--bind','127.0.0.1','--directory','public'],{stdio:'ignore'});
 let browser=null;
 try{
  await ready();browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  fs.mkdirSync('artifacts/garden-pest-watch-browser',{recursive:true});
  for(const width of frames){
   const ctx=await browser.newContext({viewport:{width,height:820},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await routeFixtures(page);
   await page.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
   await waitForAnswer(page,'Squash vine borer');
   assert.ok(await page.locator('#borer-records').isVisible());
   assert.match(await page.locator('#borer-record-status').innerText(),/Not checked/);
   await page.locator('#borer-record-check').click();
   await page.waitForFunction(()=>document.querySelector('#borer-record-status')?.textContent.includes('check recorded'),null,{timeout:6000});
   assert.match(await page.locator('#borer-record-results').innerText(),/Photographed species presence/);
   assert.match(await page.locator('#borer-record-results').innerText(),/not the first arrival or adult emergence/);
   assert.match(await page.locator('#borer-record-status').innerText(),/Historical season evidence only/);
   assert.equal(await page.locator('#borer-record-results .borer-record-links a').count(),1);
   // Photo-diagnosis QA on every viewport: all topics, disease labels, clue match,
   // no-result honesty, reset, and host-crop updates.
   assert.ok(await page.locator('#visual-results .visual-result').count()>=4);
   // The photo/action bridge uses the exact crop+stage+ZIP seasonal desk;
   // it never converts a photo into a confirmed pest or local probability.
   const borer=page.locator('#visual-results .visual-result').filter({has:page.getByRole('heading',{name:'Squash vine borer',exact:true})});
   assert.match(await borer.locator('.visual-plan-label').innerText(),/SEASONAL SCOUTING/);
   assert.match(await borer.locator('.visual-plan-primary').innerText(),/Where to check:/);
   await borer.locator('.visual-plan-details summary').click();
   assert.match(await borer.locator('.visual-plan-details').innerText(),/Only after confirming the organism/);
   assert.match(await borer.locator('.visual-plan-caveat').last().innerText(),/not a diagnosis/);
   await page.locator('#visual-category button[data-group="disease"]').click();
   assert.match(await page.locator('#visual-results').innerText(),/powdery mildew/i);
   assert.match(await page.locator('#visual-results .visual-kind').first().innerText(),/SYMPTOM/);
   await page.locator('#visual-category button[data-group="pest"]').click();
   assert.doesNotMatch(await page.locator('#visual-results').innerText(),/powdery mildew/i);
   await page.locator('#visual-category button[data-group="all"]').click();
   await page.locator('#visual-clues button[data-clue="white-powder"]').click();
   assert.equal(await page.locator('#visual-results .visual-result').count(),1);
   assert.match(await page.locator('#visual-results h3').first().innerText(),/powdery mildew/i);
   await page.locator('#visual-clues button[data-clue="shot-holes"]').click();
   assert.match(await page.locator('#visual-summary').innerText(),/2 selected clues/);
   await page.locator('#visual-reset').click();
   assert.ok(await page.locator('#visual-results .visual-result').count()>=4);
   assert.equal(await page.locator('#visual-clues button[aria-pressed="true"]').count(),0);
   const first=await page.locator('#primary-answer').innerText();
   assert.match(first,/squash/i);
   assert.match(await page.locator('#season-evidence').innerText(),/July/);
   assert.match(await page.locator('#weather-evidence').innerText(),/National Weather Service|NWS|forecast hours|hot/i);
   assert.match(await page.locator('#evidence-heading').innerText(),/actually know/);
   assert.ok(await page.locator('#watch-cards .watch-card').count()>=2);
   const current=await page.locator('#crop').inputValue();
   assert.equal(current,'squash');
   await page.locator('#crop').selectOption('tomatoes');
   assert.equal(await page.locator('#borer-records').isVisible(),false,'Other crops must hide squash-only field evidence');
   assert.match(await page.locator('.visual-plan-label').first().innerText(),/NOT VERIFIED/,'No stale squash action during crop change');
   await page.locator('#stage').selectOption('growing');
   await page.locator('#watch-form button[type=submit]').click();
   await waitForAnswer(page,'Tomato hornworm');
   assert.match(await page.locator('.visual-plan-label').first().innerText(),/SEASONAL SCOUTING|OUTSIDE THE MATCHED CROP STAGE/);
   await page.locator('#stage').selectOption('seedling');
   assert.match(await page.locator('.visual-plan-label').first().innerText(),/NOT VERIFIED/,'Stage change must invalidate old action plan');
   await page.locator('#stage').selectOption('growing');
   assert.notEqual(await page.locator('#primary-answer').innerText(),first);
   assert.match(await page.locator('#primary-answer').innerText(),/tomato|leaf/i);
   await page.locator('#crop').selectOption('squash');
   assert.ok(await page.locator('#borer-records').isVisible());
   assert.match(await page.locator('#borer-record-status').innerText(),/Crop changed/);
   await page.locator('#watch-form button[type=submit]').click();
   await waitForAnswer(page,'Squash vine borer');
   assert.equal(await page.locator('#primary-answer').innerText(),first,'A→B→A must restore the same garden answer');
   assert.ok(page.url().includes('crop=squash'));
   assert.equal(await page.locator('#observed option[value="squash-vine-borer"]').count(),1);
   await page.locator('#observed').selectOption('squash-vine-borer');
   await page.locator('#use-observation').click();
   await page.waitForFunction(()=>document.querySelector('.watch-card .pest-status')?.textContent?.includes('You reported'),null,{timeout:6000});
   assert.match(await page.locator('#watch-source-label').innerText(),/Scouting guidance/);
   assert.match(await page.locator('.watch-card').first().innerText(),/unverified report/);
   await page.locator('#observed').selectOption('');
   await page.locator('#use-observation').click();
   await page.waitForFunction(()=>!document.querySelector('.watch-card .pest-status')?.textContent?.includes('You reported'),null,{timeout:6000});
   assert.match(await page.locator('#beetle-answer').innerText(),/Choose a Japanese beetle host crop/i);
   await page.locator('#crop').selectOption('roses');
   await page.locator('#watch-form button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#beetle-evidence-type')?.textContent?.includes('PAST SEASON'),null,{timeout:6000});
   assert.match(await page.locator('#beetle-action').innerText(),/No current adult-emergence claim/);
   assert.match(await page.locator('#beetle-adult-date').innerText(),/Jul 5, 2026/);
   assert.match(await page.locator('#beetle-egg-date').innerText(),/Aug 5, 2026/);
   assert.match(await page.locator('#beetle-source-note').innerText(),/2026-11-02/);
   await page.waitForFunction(()=>document.querySelector('#beetle-field-status')?.textContent?.includes('PHOTOGRAPHED PRESENCE'),null,{timeout:7000});
   assert.match(await page.locator('#beetle-field-comparison').innerText(),/share a calendar date/);
   assert.ok(await page.locator('#beetle-field-links a').count()>=2);
   await page.locator('#zip').fill('48706');
   assert.match(await page.locator('#borer-record-status').innerText(),/Reference area changed/);
   assert.match(await page.locator('.visual-plan-label').first().innerText(),/NOT VERIFIED/,'ZIP change cannot retain prior location actions');
   assert.match(await page.locator('#beetle-field-first').innerText(),/No verified field date/);
   assert.match(await page.locator('#beetle-adult-date').innerText(),/Not verified/);
   await page.locator('#watch-form button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#beetle-location')?.textContent?.includes('ZIP 48706 area'),null,{timeout:6000});
   assert.match(await page.locator('#beetle-source-note').innerText(),/2026-11-02/);
   await page.waitForFunction(()=>document.querySelector('#beetle-field-comparison')?.textContent?.includes('1 days after'),null,{timeout:7000});
   assert.match(await page.locator('#beetle-field-caveat').innerText(),/not independently verify adult life stage/i);
   await page.locator('#zip').fill('');
   await page.locator('#crop').selectOption('squash');
   assert.match(await page.locator('#beetle-adult-date').innerText(),/Not verified/);
   assert.match(await page.locator('#beetle-field-status').innerText(),/NOT VERIFIED/);
   await page.locator('#watch-form button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#beetle-evidence-type')?.textContent?.includes('NOT A PILOT HOST'),null,{timeout:6000});
   assert.ok(await page.locator('#history-load').isVisible());
   await page.locator('#history-load').click();
   await page.waitForFunction(()=>document.querySelector('#history-results')?.textContent?.includes('Jul 2'),null,{timeout:7000});
   assert.equal(await page.locator('#history-results .history-row').count(),5);
   assert.equal(await page.locator('#history-results tbody tr').count(),5);
   assert.match(await page.locator('#history-results').innerText(),/not beetle observations/i);
   assert.match(await page.locator('#history-status').innerText(),/not a forecast/i);
   await page.locator('#zip').fill('48706');
   assert.equal(await page.locator('#history-results .history-row').count(),0,'Changing geography must clear old dates');
   await page.locator('#history-load').click();
   await page.waitForFunction(()=>document.querySelector('#history-status')?.textContent?.includes('ZIP 48706'),null,{timeout:7000});
   assert.equal(await page.locator('#history-results tbody tr').count(),5);
   const geometry=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,innerWidth:window.innerWidth,buttonHeight:document.querySelector('.update-button').getBoundingClientRect().height}));
   assert.ok(geometry.pageWidth<=geometry.innerWidth+1,'Horizontal overflow at '+width+': '+JSON.stringify(geometry));
   assert.ok(geometry.buttonHeight>=44,'Mobile/desktop action target minimum 44px');
   assert.deepEqual(errors,[],'JavaScript errors at '+width);
   await page.screenshot({path:'artifacts/garden-pest-watch-browser/watch-'+width+'.png',fullPage:true,animations:'disabled'});
   await ctx.close();
  }
  // An unavailable update must remove cards for the *previous* crop, not
  // leave stale live-looking recommendations on a new selection.
  const recovery=await browser.newContext({viewport:{width:390,height:820}});
  const rp=await recovery.newPage();
  await routeFixtures(rp);
  await rp.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await waitForAnswer(rp,'Squash vine borer');
  await rp.route('**/api/michigan-garden-pest-watch?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"code":"ZIP_LOOKUP_UNAVAILABLE","status":"UNAVAILABLE"}'}));
  await rp.locator('#crop').selectOption('tomatoes');
  await rp.locator('#zip').fill('48707');
  await rp.locator('#watch-form button[type=submit]').click();
  await rp.waitForFunction(()=>document.querySelector('#watch-source-label')?.textContent.includes('ZIP'),null,{timeout:6000});
  assert.doesNotMatch(await rp.locator('#watch-cards').innerText(),/Squash vine borer/);
  assert.match(await rp.locator('#primary-answer').innerText(),/tomato/i);
  assert.match(await rp.locator('#answer-reason').innerText(),/Census ZIP-area reference could not be verified/);
  assert.ok(await rp.locator('#observed').isDisabled(),'Do not offer stale suspect choices while API unavailable');
  await rp.screenshot({path:'artifacts/garden-pest-watch-browser/outage-after-change.png',fullPage:true,animations:'disabled'});
  await recovery.close();

  // An actual November NWS forecast may be warm/humid, but must not trigger
  // summer foliage scouting language when the crop desk is in off-season mode.
  const winterContext=await browser.newContext({viewport:{width:390,height:820}});
  const winter=await winterContext.newPage();
  await routeFixtures(winter,11);
  await winter.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await winter.waitForFunction(()=>document.querySelector('#watch-source-label')?.textContent.includes('off-season'),null,{timeout:6000});
  assert.match(await winter.locator('#primary-answer').innerText(),/squash/i);
  assert.match(await winter.locator('#weather-evidence').innerText(),/Off-season in Michigan/);
  assert.doesNotMatch(await winter.locator('#weather-evidence').innerText(),/scouting for mites|suggest inspecting leaves/i);
  assert.match(await winter.locator('#watch-cards').innerText(),/Squash vine borer/);
  assert.match(await winter.locator('#watch-cards').innerText(),/Squash bug/);
  assert.match(await winter.locator('.visual-plan-label').first().innerText(),/OFF-SEASON \/ PLAN FOR NEXT YEAR/);
  assert.match(await winter.locator('.visual-plan-primary').first().innerText(),/Next-season preparation/);
  assert.equal(await winter.locator('.visual-plan-details').count(),0,'November must not present in-season confirm-and-treat actions');
  assert.match(await winter.locator('#borer-records').innerText(),/In November.*past growing season/);
  await winter.screenshot({path:'artifacts/garden-pest-watch-browser/november-preparation-not-pest-weather.png',fullPage:true,animations:'disabled'});
  await winterContext.close();

  // Independent official beetle raster failure does not erase the crop field
  // notes and cannot leave a dated, once-successful beetle prediction behind.
  const modelOutage=await browser.newContext({viewport:{width:390,height:820}});
  const mp=await modelOutage.newPage();
  await routeFixtures(mp);
  await mp.route('**/api/japanese-beetle-forecast?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"status":"UNAVAILABLE"}'}));
  await mp.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await mp.locator('#crop').selectOption('roses');
  await mp.locator('#watch-form button[type=submit]').click();
  await mp.waitForFunction(()=>document.querySelector('#beetle-action')?.textContent?.includes('official species-specific forecast'),null,{timeout:7000});
  assert.match(await mp.locator('#beetle-adult-date').innerText(),/Not verified/);
  assert.match(await mp.locator('#beetle-source-note').innerText(),/Unknown does not mean no beetles/i);
  assert.ok(await mp.locator('#watch-cards .watch-card').count()>0);
  await mp.screenshot({path:'artifacts/garden-pest-watch-browser/beetle-official-source-unavailable.png',fullPage:true,animations:'disabled'});
  await modelOutage.close();

  // Missing API must not claim zero risk, and the HTML field guide survives.
  const broken=await browser.newContext({viewport:{width:390,height:820}});
  const p=await broken.newPage();
  await p.route('**/*',route=>route.request().url().startsWith(ORIGIN)?route.continue():route.abort());
  await p.route('**/api/michigan-garden-pest-watch?*',route=>route.fulfill({status:503,contentType:'application/json',body:'{"status":"UNAVAILABLE"}'}));
  await p.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.querySelector('#watch-source-label')?.textContent.includes('unavailable'),null,{timeout:6000});
  assert.match(await p.locator('#primary-answer').innerText(),/squash/i);
  assert.match(await p.locator('#weather-evidence').innerText(),/not verified|could not be verified/);
  assert.match(await p.locator('.visual-plan-label').first().innerText(),/NOT VERIFIED/,'API outage cannot leave a stale action plan');
  await p.screenshot({path:'artifacts/garden-pest-watch-browser/forecast-unavailable.png',fullPage:true,animations:'disabled'});
  await broken.close();
  const noJS=await browser.newContext({viewport:{width:390,height:820},javaScriptEnabled:false});
  const n=await noJS.newPage();await n.goto(ORIGIN+'/michigan-garden-pest-watch/',{waitUntil:'domcontentloaded'});
  assert.match(await n.locator('#primary-answer').innerText(),/squash stems/i);
  assert.ok(await n.locator('.nojs-guides').isVisible());
  assert.match(await n.locator('#borer-records').innerText(),/Enable JavaScript to check dated community records/);
  assert.ok(await n.locator('#borer-records a').count()>=2);
  assert.ok(await n.locator('#history-heading').isVisible());
  assert.ok(await n.locator('#beetle-heading').isVisible());
  assert.match(await n.locator('#beetle-source-note').innerText(),/never means no beetles/i);
  assert.ok(await n.locator('#history-load').isHidden());
  assert.ok(await n.locator('.primary-sources a').count()>=3);
  await noJS.close();
  console.log('Garden Pest Watch browser QA PASS: 360/390/768/1440px, crop A-B-A, self-report, evidence, mobile overflow, 503 and no-JS. These checks use deterministic fixtures, not live pest/meteorology validation.');
 }finally{if(browser)await browser.close();server.kill('SIGTERM');}
})().catch(err=>{console.error(err);process.exitCode=1;});
