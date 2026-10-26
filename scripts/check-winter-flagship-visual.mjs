import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:4173/michigan-winter-activities/',out='artifacts/winter-field-guide-visual';await mkdir(out,{recursive:true});
const report={title:'Flagship field guide browser QA',photos:[],viewports:[],issues:[],filters:[]};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const check=(ok,label)=>{if(!ok)report.issues.push(label)};
try{
 for(const width of [320,390,768,1366]){
  const page=await browser.newPage({viewport:{width,height:width===1366?900:844},deviceScaleFactor:1});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#wf-stories .wf-story').first().waitFor({timeout:15000});
  await page.waitForTimeout(1500);
  const firstCount=await page.locator('.wf-story:visible').count();check(firstCount===18, 'wrong initial visible card count at '+width+': '+firstCount);
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
  check(overflow<=1,'horizontal overflow of '+overflow+'px at '+width);
  await page.screenshot({path:out+'/hero-'+width+'.png',fullPage:false});
  if(width===390||width===1366){
    await page.locator('#wf-map').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    await page.screenshot({path:out+'/map-'+width+'.png',fullPage:false});
    const imagery=page.locator('.wf-photo img');
    let loaded=0,failed=[];
    for(let i=0;i<await imagery.count();i++){
      const im=imagery.nth(i);
      await im.scrollIntoViewIfNeeded();
      await im.evaluate(el=>el.decode().catch(()=>{}));
      const p=await im.evaluate(el=>({alt:el.alt,src:el.currentSrc,ok:el.complete&&el.naturalWidth>0}));
      if(p.ok)loaded++;else failed.push(p.alt);
    }
    report.photos.push({width,loaded,total:await imagery.count(),failed});
    check(failed.length===0,'broken images at '+width+': '+failed.join(' | '));
    await page.locator('#stop-11').scrollIntoViewIfNeeded();
    await page.screenshot({path:out+'/cards-'+width+'.png',fullPage:false});
    await page.locator('button.wf-chip[data-tag="ice"]').click();
    const iceCount=await page.locator('.wf-story:visible').count();
    const markerCount=await page.locator('.leaflet-marker-icon').count();
    report.filters.push({width,iceCount,markerCount});
    check(iceCount===4,'ice filter wrong: '+iceCount+' at '+width);
    await page.locator('#wf-region').selectOption('up');
    const upIce=await page.locator('.wf-story:visible').count();
    check(upIce===3,'UP ice filter wrong: '+upIce+' at '+width);
    await page.locator('#wf-reset').click();
    check((await page.locator('.wf-story:visible').count())===18,'reset did not restore all at '+width);
    report.viewports.push({width,overflow,firstCount,iceCount,upIce,markerCount});
  }else report.viewports.push({width,overflow,firstCount});
  await page.close();
 }
 const page=await browser.newPage({javaScriptEnabled:false});
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 const count=await page.locator('.wf-story').count();
 check(count===18,'no-JS missing descriptions '+count);
 check(await page.locator('a[href^="https://www.michigan.gov/dnr/"]').count()>0,'no-JS source links missing');
 await page.close();
}finally{await browser.close()}
await writeFile(out+'/report.json',JSON.stringify(report,null,2));
console.log('Field Guide visual QA report:',JSON.stringify(report));
if(report.issues.length)process.exitCode=1;
