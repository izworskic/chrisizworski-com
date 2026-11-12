'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const script=read('public/assets/michigan-snow-totals.js');
const snow=read('public/michigan-snow-totals/index.html');
const weekend=read('public/michigan-winter-weekends/index.html');
const homepage=read('public/index.html');
const sitemap=read('public/sitemap.xml');
const reputationSitemap=read('public/sitemap-reputation.xml');

test('original NWS product URL is allowlisted to HTTPS Iowa Mesonet or weather.gov only',()=>{
 const fragment=script.slice(script.indexOf('function originalReportUrl(raw) {'),script.indexOf('\n  function color('));
 const allow=new Function(fragment+'\nreturn originalReportUrl;')();
 const good=['https://mesonet.agron.iastate.edu/p.php?pid=202611061522-KMQT-NWUS53-LSRMQT','https://forecast.weather.gov/product.php?site=MQT','https://www.weather.gov/mqt/'];
 for(const url of good)assert.equal(allow(url),url);
 for(const bad of ['javascript:alert(1)','data:text/html,oh','http://mesonet.agron.iastate.edu/p.php','https://mesonet.agron.iastate.edu.evil.example/p.php','https://fakeweather.gov.test/','https://example.com/','//mesonet.agron.iastate.edu/p.php','not a url',null,{},''])
  assert.equal(allow(bad),'',String(bad));
});
test('storm shortcut has a real source link in its selected town/nearby results',()=>{
 const town=script.slice(script.indexOf('function reportLine('),script.indexOf('function nearLines('));
 assert.match(town,/originalReportUrl\(r\.productUrl\)/);
 assert.match(town,/Original NWS report/);
 assert.match(town,/noopener noreferrer/);
 assert.match(script.slice(script.indexOf('function popup('),script.indexOf('function renderMap(')),/originalReportUrl\(r\.productUrl\)/);
 assert.match(script.slice(script.indexOf('function renderTable('),script.indexOf('function loadPlaces(')),/originalReportUrl\(r\.productUrl\)/);
 assert.match(snow,/original NWS report text when the archive provides a link/);
 assert.match(snow,/michigan-snow-totals\.js\?v=20261112a/);
});
test('edited sprint pages retain their indexable canonicals, truthful review dates, 12 guides',()=>{
 for(const [html,slug] of [[snow,'michigan-snow-totals'],[weekend,'michigan-winter-weekends']]){
  assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com/'+slug+'/'));
  assert.ok(html.includes('2026-11-12'));
  assert.ok(!html.includes('noindex'));
 }
 assert.equal((weekend.match(/<article class="wf-story" id="stop-\d+"/g)||[]).length,12);
 assert.match(weekend,/Base-town routes reviewed October 28, 2026; weekend selector updated November 12, 2026/);
});

test('homepage November 11 edits have truthful matching JSON-LD and sitemap dates',()=>{
 assert.ok(homepage.includes('"dateModified": "2026-11-11"'));
 for(const map of [sitemap,reputationSitemap])assert.ok(map.includes('<loc>https://chrisizworski.com/</loc>\n    <lastmod>2026-11-11</lastmod>'));
});
