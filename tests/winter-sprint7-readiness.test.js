'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=path=>readFileSync(join(__dirname,'..',path),'utf8');
const snow=read('public/snowmobile/index.html');
const snowCss=read('public/assets/snowmobile.css');
const snowGen=read('scripts/generate-snowmobile-region-pages.mjs');
const skiGen=read('scripts/generate-michigan-ski-pages.mjs');
const ski=read('public/michigan-ski-hills/index.html');
const skiCss=read('public/assets/michigan-ski.css');
const skiClient=read('public/assets/michigan-ski-decision.js');
const xc=read('public/michigan-cross-country-skiing/index.html');
const xcCss=read('public/assets/michigan-xc-skiing.css');
const winterMap=read('public/sitemap-winter.xml');
const mainMap=read('public/sitemap.xml');
const {RESORTS}=require('../lib/michigan-ski/resorts.js');
const regionIds=['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan'];
test('official Michigan snowmobile window, permit and distinct evidence are discoverable without live APIs',async()=>{
 const {FACTS,SOURCES}=await import('../lib/snowmobile/rules.mjs');
 assert.equal(FACTS.permit.fee,'$65');
 assert.equal(FACTS.season.opens,'Dec. 1');
 assert.equal(FACTS.season.closes,'Mar. 31');
 assert.ok(SOURCES.permits.url.includes('/permits-and-requirements'));
 assert.ok(snow.includes('id="snowmobile-departure-check"'));
 assert.ok(snow.includes('2026–27 trail permit: $65'));
 assert.ok(snow.includes('https://www.michigan.gov/dnr/things-to-do/snowmobiling/trail-reports'));
 assert.ok(snow.includes('https://www.michigan.gov/dnr/things-to-do/snowmobiling/where'));
 assert.ok(snow.includes('The DNR says third-party reports'));
 assert.ok(snow.includes('weather')&&snow.includes('/lake-effect-snow/'));
 assert.ok(snow.includes('/michigan-winter-weekends/#weekend-desk'));
});
test('all seven indexed riding regions retain evidence hierarchy and no unverified groomed claims',()=>{
 for(const key of regionIds){
  const h=read('public/snowmobile/regions/'+key+'.html');
  assert.ok(h.includes('id="s7-region-title"'),key);
  assert.ok(h.includes('href="#local-planning-title"'),key);
  assert.ok(h.includes('https://www.michigan.gov/dnr/things-to-do/snowmobiling/where'),key);
  assert.ok(h.includes('Club reports are manual evidence'),key);
  assert.ok(h.includes('not a guarantee of opening or grooming'),key);
  assert.ok(h.includes('/michigan-winter-weekends/#weekend-desk'),key);
  assert.ok(h.includes('data-source-name=')&&h.includes('id="routePlanner"'),key);
  assert.match(h,/"dateModified":"2026-11-11"/);
  assert.ok(winterMap.includes('https://chrisizworski.com/snowmobile/regions/'+key+'.html'));
 }
 assert.ok(snowGen.includes('s7-region-check'));
 assert.ok(snowGen.includes('dateModified: \'2026-11-11\''));
 assert.ok(snowCss.includes('.s7-readiness-steps'));
 assert.ok(snowCss.includes('@media(max-width:750px)'));
});
test('ski source generator ships operator checks on index and every original resort page',()=>{
 assert.equal(RESORTS.length,18);
 assert.ok(skiGen.includes('const readinessHtml=readiness?'));
 assert.ok(skiGen.includes('Read the official resort or trail report'));
 assert.ok(skiGen.includes('Verify tickets at the resort'));
 assert.ok(skiGen.includes('const today=\'2026-11-11\''));
 assert.ok(skiGen.includes('s7-ski-readiness'));
 assert.ok(ski.includes('id="s7-ski-title"'));
 assert.ok(ski.includes('hill’s official mountain report'));
 assert.ok(ski.includes('weather with a bad-weather backup') || ski.includes('weekend with a bad-weather backup'));
 assert.ok(skiCss.includes('.s7-ski-steps'));
 assert.ok(skiCss.includes('@media(max-width:760px)'));
});
test('stale snow forecast and unknown resort opening can never be labeled an operating ski shortlist',()=>{
 assert.ok(skiClient.includes('snapshotAge>2*3600000'));
 assert.ok(skiClient.includes('snapshotAge < -60000'));
 assert.ok(skiClient.includes('stale||(offSeason&&S.goal===\'powder\')?[]:candidates()'));
 assert.ok(skiClient.includes('Weather snapshot stale · no recommendation'));
 assert.ok(skiClient.includes('Forecast comparison · verify resort lifts'));
 assert.ok(!skiClient.includes('In-season comparison · verify resort operations'));
 assert.ok(!skiClient.includes('October forecast does not imply'));
 assert.ok(skiClient.includes('Original report update time is unverified'));
 assert.ok(skiClient.includes('Official hill / lift report'));
 assert.ok(skiClient.includes('No independently parsed resort operating report'));
});
test('XC snow, official grooming and actual parking remain distinct specialist ownership',()=>{
 assert.ok(xc.includes('id="xc-grooming-gate-title"'));
 assert.ok(xc.includes('https://www.michigan.gov/dnr/things-to-do/winter/xc-skiing'));
 assert.ok(xc.includes('does not control their currency or accuracy'));
 assert.ok(xc.includes('MiDrive describes highway travel'));
 assert.ok(xc.includes('https://xcski.chrisizworski.com/'));
 assert.ok(!xc.includes('/michigan-snowshoe-conditions/'));
 assert.ok(xcCss.includes('.xc-grooming-grid'));
 assert.ok(xcCss.includes('@media(max-width:790px)'));
});
test('preserve original canonical pages and truthful release dates',()=>{
 for(const [html,url] of [[snow,'/snowmobile/'],[ski,'/michigan-ski-hills/'],[xc,'/michigan-cross-country-skiing/']]){
  assert.ok(html.includes('https://chrisizworski.com'+url));
  assert.ok(html.includes('https://chrisizworski.com/#person'));
  assert.ok(html.includes('"dateModified":"2026-11-11"'));
  assert.ok(winterMap.includes('<loc>https://chrisizworski.com'+url+'</loc><lastmod>2026-11-11</lastmod>'));
 }
 assert.ok(mainMap.includes('<loc>https://chrisizworski.com/michigan-ski-hills/</loc><lastmod>2026-11-11</lastmod>'));
 for(const r of RESORTS){
  const path='https://chrisizworski.com/michigan-ski-hills/'+r.slug+'/';
  assert.ok(winterMap.includes('<loc>'+path+'</loc><lastmod>2026-11-11</lastmod>'),r.slug);
  assert.ok(mainMap.includes('<loc>'+path+'</loc><lastmod>2026-11-11</lastmod>'),r.slug);
 }
 assert.equal((snow.match(/adsbygoogle\.js/g)||[]).length,1);
 assert.ok(snow.includes('id="region-list"')&&snow.includes('id="state-map"'));
});
