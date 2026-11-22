'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const michigan=JSON.parse(read('data/beaches.json')).beaches;
const us=JSON.parse(read('data/shorefeel-us-coast.json')).beaches;
const ca=JSON.parse(read('data/shorefeel-canada-ontario.json')).locations;

test('all 84 currently curated Great Lakes beaches have a ShoreFeel location experience',()=>{
 assert.equal(michigan.length,50);
 assert.equal(us.length,16);
 assert.equal(ca.length,18);
 assert.equal(michigan.length+us.length+ca.length,84);
 assert.equal(new Set([...michigan.map(x=>'mi/'+x.slug),...us.map(x=>'us/'+x.slug),...ca.map(x=>'ca/'+x.slug)]).size,84);
 for(const b of michigan){
  const html=read('public/great-lakes-beaches/'+b.slug+'/index.html');
  assert.match(html,/data-shorefeel/,b.slug);
  assert.match(html,/id="at-the-beach"/,b.slug);
  assert.match(html,/data-beach-slug="/,b.slug);
 }
});

test('all 50 Michigan beach reports lead with model evidence rather than unrelated hero photography',()=>{
 const css=read('public/assets/beach-report.css');
 assert.match(css,/shorefeel-primary \.shorefeel-main strong/);
 assert.match(css,/font-size:clamp\(64px/);
 for(const b of michigan){
  const markup=read('public/great-lakes-beaches/'+b.slug+'/index.html');
  const main=markup.indexOf('<main class="page-shell" id="main">');
  const feel=markup.indexOf('class="section shorefeel-field-note shorefeel-primary"');
  const report=markup.indexOf('class="beach-detail-layout"');
  const photo=markup.indexOf('class="shorefeel-landscape"');
  assert.ok(main>=0&&main<feel&&feel<report&&report<photo,b.slug+' source-first page order');
  assert.doesNotMatch(markup,/<section class="hero" aria-labelledby="page-title">/,b.slug+' must not lead with large generic hero');
  assert.match(markup,/data-shorefeel-value aria-live="polite"/,b.slug);
  assert.match(markup,/Representative Great Lakes photograph, not /,b.slug);
  assert.match(markup,/loading="lazy" decoding="async"/,b.slug+' supporting photo after evidence');
  assert.match(markup,/National Park Service, public domain/,b.slug+' image credit');
  assert.match(markup,/rel="canonical"/,b.slug+' canonical retained');
  assert.match(markup,/chrisizworski\.com\/#person/,b.slug+' Person retained');
 }
});
test('shared US and Ontario ShoreFeel layout removes oval and displays source-based air first',()=>{
 const css=read('public/assets/shorefeel-beach-detail.css');
 const js=read('public/assets/shorefeel-beach-detail.js');
 assert.doesNotMatch(css,/\.shore-answer-inner:after\{content:""/,'No decorative oval on answer');
 assert.match(css,/\.shore-value\{font-size:clamp\(4\.1rem/,'large actual modeled comfort');
 assert.match(css,/data-status="unavailable"/,'clear distinct no-data sizing');
 assert.match(js,/Forecast hour \(UTC\)/,'unambiguous source time');
 assert.match(js,/shorefeel-us\?beach=/);
 assert.match(js,/shorefeel-ca\?beach=/);
 for(const region of ['around-the-lakes','canada']){
  for(const b of region==='canada'?ca:us){
   const h=read('public/great-lakes-beaches/'+region+'/'+b.slug+'/index.html');
   assert.ok(h.indexOf('id="feel-value"')<h.indexOf('class="shore-columns"'),b.slug);
   assert.match(h,/id="shorefeel-live" data-status="loading"/,b.slug);
   assert.doesNotMatch(h,/<script[^>]+(googlesyndication|adsbygoogle)/i,'No manual ad unit introduced');
  }
 }
});

test('all 34 US and Ontario reports have individual canonical source-linked HTML',()=>{
 const sitemap=read('public/sitemap-shorefeel-beaches.xml');
 const index=read('public/sitemap-index.xml');
 assert.match(index,/sitemap-shorefeel-beaches\.xml/);
 assert.equal((sitemap.match(/<url>/g)||[]).length,34);
 for(const [region,list] of [['around-the-lakes',us],['canada',ca]]){
  const atlas=read('public/great-lakes-beaches/'+region+'/index.html');
  for(const b of list){
   const url='/great-lakes-beaches/'+region+'/'+b.slug+'/';
   const html=read('public'+url+'index.html');
   assert.match(atlas,new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),b.slug+' missing atlas link');
   assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com'+url+'"'),b.slug+' canonical');
   assert.ok(sitemap.includes('<loc>https://chrisizworski.com'+url+'</loc>'),b.slug+' sitemap');
   assert.ok(html.includes('data-shorefeel-slug="'+b.slug+'"'),b.slug+' data');
   assert.ok(html.includes('id="feel-value"'),b.slug+' hero answer');
   assert.ok(html.includes('id="feel-evidence"'),b.slug+' source explanation');
   assert.ok(html.includes('id="feel-wind"'),b.slug+' wind');
   assert.ok(html.includes('https://www.google.com/maps/search/?api=1&amp;query=')||
             html.includes('https://www.google.com/maps/search/?api=1&query='),b.slug+' public place map');
   assert.ok(html.includes('https://chrisizworski.com/#person'),b.slug+' creator identity');
   assert.match(html,/No measured beach cooling adjustment or current swimming-area water temperature/i);
   if(region==='canada'){
    assert.match(html,/licence\/readme_en\//,b.slug+' ECCC licence URL');
    assert.match(html,/Data Server End-use Licence/,b.slug+' ECCC attribution');
   }else if(b.accessAlert){
    assert.ok(html.includes('Park access notice:'),b.slug+' access notice label');
    assert.ok(html.includes(b.accessAlert.replaceAll('&','&amp;')),b.slug+' original park access alert');
   }
   assert.doesNotMatch(html,/<script[^>]+(googlesyndication|adsbygoogle)/i,'No hand-added ad stack');
  }
 }
});

test('static generated reports are discoverable and source-driven on every site build',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.match(pkg.scripts['build:site'],/generate-shorefeel-details\.mjs/);
 assert.match(read('scripts/generate-shorefeel-us.mjs'),/shore-stop-links/);
 assert.match(read('scripts/generate-shorefeel-ca.mjs'),/shore-stop-links/);
 const generator=read('scripts/generate-shorefeel-details.mjs');
 assert.match(generator,/public\/sitemap-shorefeel-beaches\.xml/);
 assert.match(generator,/writeFile\(filename,content/);
 const client=read('public/assets/shorefeel-beach-detail.js');
 assert.match(client,/shorefeel-us\?beach=/);
 assert.match(client,/shorefeel-ca\?beach=/);
 assert.match(client,/data\.beach!==slug/);
 assert.match(client,/data\.status!=='forecast-based'/);
 assert.doesNotMatch(client,/geolocation|localStorage|sessionStorage/i);
});

test('Michigan ShoreFeel exposes true model wind direction and conditional air-water context',()=>{
 const {beachConditions}=require('../lib/shorefeel/beach-network.js');
 const now=new Date('2026-07-15T12:30:00Z');
 const b=michigan.find(x=>x.slug==='bay-city-state-park');
 const reading={
  current:{valid_at_utc:'2026-07-15T12:00:00Z',temperature_f:83,
   apparent_temperature_f:86,wind_mph:12,wind_from_deg:315}
 };
 const water={fresh:true,water_temp_f:65,station_id:'45163',distance_miles:20};
 const out=beachConditions(b,reading,water,now);
 assert.equal(out.status,'forecast-based');
 assert.equal(out.windFrom,'NW');
 assert.equal(out.airWaterContrastF,18);
 assert.equal(out.lakeSignal,'lake-cooler');
 assert.match(out.lakeContext,/If the breeze comes across the lake/);
 assert.match(out.limitation,/No beach-air cooling or warming correction/);
 assert.equal(out.apparentF,86,'No invented cooling in shown apparent air');
 const far=beachConditions(b,reading,{...water,distance_miles:42},now);
 assert.equal(far.airWaterContrastF,null,'Distant water station not valid contrast');
 assert.equal(far.lakeSignal,'unknown');
 const none=beachConditions(b,{current:{...reading.current,wind_from_deg:null}},water,now);
 assert.equal(none.windFrom,null);
});
