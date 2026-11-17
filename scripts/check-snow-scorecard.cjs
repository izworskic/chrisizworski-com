#!/usr/bin/env node
// Snow Totals scorecard browser evidence. Fixture readings come from the site's recorded NWS and ACIS tests.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('/tmp/snow-scorecard/node_modules/playwright');
const AxeBuilder = require('/tmp/snow-scorecard/node_modules/@axe-core/playwright').default;
const api = require('../api/michigan-snow-totals.js');
const storm = require('../tests/fixtures/snow-lsr-2025-11-30-storm.json');
const acis = require('../tests/fixtures/snow-acis-2025-07-01-to-2025-11-30.json');
const root = path.resolve('public');
const out = path.resolve('docs/visual-pilots/michigan-snow-totals/scorecard');
fs.mkdirSync(out, { recursive: true });
const now = Date.parse(storm.now);
async function recordedApi(query) {
  const oldFetch = global.fetch, oldNow = Date.now;
  global.fetch = async url => {
    const href = String(url);
    const ok = data => ({ ok: true, status: 200, json: async () => data });
    if (href.includes('mesonet.agron.iastate.edu')) return ok({ features: storm.properties.map(properties => ({ properties })) });
    if (href.includes('api.weather.gov')) return ok({ features: [] });
    if (href.includes('rcc-acis.org')) return ok(acis.response);
    throw new Error('Unexpected provider ' + href);
  };
  Date.now = () => now;
  try {
    let status = 0, body;
    await api({ method: 'GET', query, url: '/api/michigan-snow-totals?' + new URLSearchParams(query) }, {
      setHeader() {},
      status(c) { status = c; return this; },
      json(data) { body = data; return this; }
    });
    assert.equal(status, 200);
    assert.ok(body, 'The recorded API generated a response');
    return body;
  } finally { Date.now = oldNow; global.fetch = oldFetch; }
}
function serveHtml(req, res, live, season) {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (u.pathname === '/api/michigan-snow-totals') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(u.searchParams.get('view') === 'season' ? season : live)); return;
  }
  const file = path.resolve(root, '.' + decodeURIComponent(u.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file,'index.html') : file;
  if (!fs.existsSync(target)) { res.writeHead(404).end(); return; }
  const ext = path.extname(target);
  const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
}
(async () => {
  const [live, season] = await Promise.all([recordedApi({}), recordedApi({view:'season'})]);
  assert(live.ok && live.reports?.length > 50, 'Recorded storm has many report places');
  assert(season.season?.anySnow, 'Recorded ACIS season has snow');
  const server = http.createServer((req, res) => serveHtml(req,res,live,season));
  await new Promise(resolve => server.listen(4173,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,executablePath:process.env.SNOW_CHROME||undefined,args:['--no-sandbox']});
  const evidence = { checkedAt:new Date().toISOString(), runCommit:process.env.GITHUB_SHA||'local', viewports:[], a11y:[], fallbacks:{}, assertions:[] };
  function note(s) { evidence.assertions.push(s); console.log('PASS '+s); }
  const base = 'http://127.0.0.1:4173/michigan-snow-totals/?window=168h';
  async function setup(width, opts={}) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',isMobile:width<=390,hasTouch:width<=390,javaScriptEnabled:opts.noJS!==true});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    if(!opts.noJS) await page.addInitScript(frozen => { Date.now=()=>frozen; },now);
    if(opts.blockTiles) await page.route(/tile\.openstreetmap\.org\//,route=>route.abort('failed'));
    if(opts.blockLeaflet) await page.route('**/leaflet.js',route=>route.abort('failed'));
    if(opts.blockData) await page.route('**/api/michigan-snow-totals*',route=>route.abort('failed'));
    return {context,page,errors};
  }
  try {
    for(const width of [360,390,768,1280,1440]) {
      const {context,page,errors}=await setup(width);
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('.snow-peak-value') || /No snow|did not/.test(document.getElementById('snowSummary').textContent),null,{timeout:18000});
      assert(await page.locator('.snow-peak-value').isVisible(),'Large measured figure appears');
      const {scrollWidth,viewportWidth,header,peakFont,mapAfter,sourceCount,liveCount,rankCount,barWidths,seasonLabels}=await page.evaluate(()=>{
        const answer=document.querySelector('.snow-answer').getBoundingClientRect(),map=document.querySelector('.map-wrap').getBoundingClientRect();
        return {scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,header:getComputedStyle(document.querySelector('.site-header')).position,peakFont:parseInt(getComputedStyle(document.querySelector('.snow-peak-value')).fontSize,10),mapAfter:map.top>=answer.bottom,sourceCount:document.querySelectorAll('a[href="https://mesonet.agron.iastate.edu/lsr/"]').length,liveCount:document.querySelectorAll('#seasonLiveBars .comparison').length,rankCount:document.querySelectorAll('#stormPulseList button').length,barWidths:[...document.querySelectorAll('#stormPulseList .report-bar-fill')].map(el=>parseFloat(el.style.width)),seasonLabels:document.querySelector('#seasonLiveBars')?.textContent.slice(0,90)};
      });
      assert(scrollWidth<=viewportWidth+1,'No overflow at '+width+' px');
      assert.equal(header,'sticky');
      assert(mapAfter,'Map follows the complete answer card');
      assert(sourceCount>=1);
      assert.equal(peakFont,56,'Numbers use the requested 56px visual scale');
      assert(rankCount>=2,'Top reports available with the recorded NWS data');
      assert(barWidths[0]===100 && barWidths.every((v,i)=>v>=0&&v<=100&&(i===0||v<=barWidths[i-1])),'Bars encode relative observed inches');
      assert(liveCount>=1 && /Current season/.test(seasonLabels),'Current-season bars populated from recorded ACIS');
      await page.locator('.windows button[data-window="24h"]').click();
      assert.equal(await page.locator('.windows button[data-window="24h"]').getAttribute('aria-pressed'),'true');
      await page.locator('.windows button[data-window="168h"]').click();
      assert.equal(await page.locator('.windows button[data-window="168h"]').getAttribute('aria-pressed'),'true');
      await page.locator('button[data-region="keweenaw"]').click();
      assert.equal(await page.locator('button[data-region="keweenaw"]').getAttribute('aria-pressed'),'true');
      await page.locator('button[data-region=""]').click();
      assert.equal(await page.locator('button[data-region=""]').getAttribute('aria-pressed'),'true');
      await page.locator('.report-table-disclosure summary').click();
      assert(await page.locator('#snowTable tbody tr').count()>2);
      await page.locator('.answer-next summary').click();
      assert(await page.locator('#headingOut a').first().isVisible());
      if(width===390||width===1280) {
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:path.join(out,'enhanced-'+width+'.png'),animations:'disabled'});
      }
      const violations=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
      const serious=violations.violations.filter(v=>['critical','serious'].includes(v.impact));
      evidence.a11y.push({width,violations:violations.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,help:v.help})),seriousCount:serious.length});
      assert.equal(serious.length,0,'No serious or critical WCAG AA violations at '+width+': '+JSON.stringify(serious.map(v=>v.id)));
      assert.equal(errors.length,0,'No page errors: '+errors.join('; '));
      evidence.viewports.push({width,scrollWidth,header,peakFont,mapAfter,rankCount,barWidths,liveCount,errors});
      await context.close();
    }
    note('Mobile to desktop, reversibility, live source bars and serious/critical axe checks');
    for(const kind of ['tiles','leaflet','data','noJS']) {
      const o=kind==='tiles'?{blockTiles:true}:kind==='leaflet'?{blockLeaflet:true}:kind==='data'?{blockData:true}:{noJS:true};
      const {context,page,errors}=await setup(390,o);
      await page.goto(base,{waitUntil:'domcontentloaded'});
      if(kind==='noJS') {
        assert(await page.locator('noscript').count()>0,'No-JS map explanation is present');
        await page.locator('.answer-next summary').click();
        assert(await page.locator('#headingOut a').first().isVisible());
        evidence.fallbacks[kind]='Archive and native navigation available';
      }else{
        await page.waitForFunction(()=>document.querySelector('#snowMap')?.hidden,{timeout:18000});
        assert(await page.locator('.report-table-disclosure').evaluate(x=>x.open),'Full reports expand after map or API failure');
        assert(await page.locator('.map-fallback a').first().isVisible(),'Source archive link remains');
        assert(await page.locator('#mapNote').textContent()).includes('map could not load');
        evidence.fallbacks[kind]='Map collapsed; archive and full report disclosure available';
      }
      if(kind==='tiles')await page.screenshot({path:path.join(out,'tiles-unavailable-390.png'),animations:'disabled'});
      assert.equal(errors.length,0,'No page errors in '+kind+' failure path: '+errors.join('; '));
      await context.close();
    }
    note('Tile failure, Leaflet failure, missing data, and no-JavaScript source path');
    fs.writeFileSync(path.join(out,'measured-qa.json'),JSON.stringify(evidence,null,2)+'\n');
    console.log(JSON.stringify({pass:true,viewports:evidence.viewports.length,a11y:evidence.a11y,fallbacks:evidence.fallbacks},null,2));
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1});
