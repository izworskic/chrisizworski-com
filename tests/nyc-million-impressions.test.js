'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/nyc-crossing/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public/assets/nyc-crossing.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/nyc-crossing.css'),'utf8');
const b=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/nyc-million-impressions-2026-10-09.json'),'utf8'));
const graph=JSON.parse(html.split('<script type="application/ld+json">')[1].split('</script>')[0])['@graph'];

test('NYC SERP promises match one indexable canonical intent',()=>{
 const title=(html.match(/<title>([^<]+)<\/title>/)||[])[1];
 const desc=(html.match(/<meta name="description" content="([^"]+)"/)||[])[1];
 assert.ok(title&&title.length<=60,title);
 assert.ok(desc&&desc.length<=158,desc);
 assert.match(title,/NYC Bridge/);
 assert.match(title,/Chris Izworski/);
 assert.match(desc,/tolls.*congestion pricing.*live crossing times/i);
 assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/nyc-crossing/">'));
 assert.ok(html.includes('<meta name="robots" content="index,follow'));
 assert.ok(html.includes('<h1>Which NYC crossing should you take?</h1>'));
 assert.equal(b.canonical,'https://chrisizworski.com/nyc-crossing/');
 assert.equal(b.decision.newIndexableUrls,0);
});

test('no-script visitors receive unique crossings, credit and source explanation',()=>{
 for(const item of ['Brooklyn, Manhattan, Williamsburg','Queensboro','Lincoln, Holland, Queens','crossing credit','approach corridor','511NY']){
   assert.ok(html.includes(item),'Missing crawlable answer: '+item);
 }
 for(const item of ['id="nyc-bridge-toll-guide"','href="#comparison-results"','id="comparison-results"',
   'href="https://congestionreliefzone.mta.info/tolling"','href="https://portal.311.nyc.gov/article/?kanumber=KA-03612"',
   'href="/flight-tracker/"','href="/national-tools/"','<form id="crossingForm">','id="results"']){
   assert.ok(html.includes(item),'Missing feature: '+item);
 }
});

test('one Person identity anchors WebPage, WebApplication and breadcrumb',()=>{
 const byType=t=>graph.find(x=>x['@type']===t);
 const person=byType('Person'),page=byType('WebPage'),app=byType('WebApplication'),crumb=byType('BreadcrumbList');
 assert.equal(person['@id'],'https://chrisizworski.com/#person');
 assert.equal(page.author['@id'],person['@id']);
 assert.equal(app.author['@id'],person['@id']);
 assert.equal(page.mainEntity['@id'],app['@id']);
 assert.equal(page.breadcrumb['@id'],crumb['@id']);
 assert.deepEqual(crumb.itemListElement.map(x=>x.item),['https://chrisizworski.com/','https://chrisizworski.com/tools/','https://chrisizworski.com/nyc-crossing/']);
 assert.ok(html.includes('pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075'));
});

test('mobile explainer, updated assets and truthful incident outage state',()=>{
 assert.ok(css.includes('.quick-facts{display:grid'));
 assert.ok(css.includes('@media(max-width:760px){.quick-facts{grid-template-columns:minmax(0,1fr)}'));
 assert.ok(html.includes('nyc-crossing.css?v=20261009d'));
 assert.ok(html.includes('nyc-crossing.js?v=20261009d'));
 assert.ok(js.includes("info?.state==='CACHE_UNAVAILABLE'"));
 assert.ok(js.includes('incident cache temporarily unavailable'));
 assert.ok(js.includes('no incident-clear claim is available'));
 assert.doesNotMatch(js,/NY511_PASSWORD|NY511_USERNAME|nysdot\.carsprogram\.org/);
});

test('genuine measurements, not manufactured GSC or revenue gains',()=>{
 assert.equal(b.program,'MILLION_IMPRESSIONS_PLAYBOOK.md');
 assert.equal(b.measurement.property,'sc-domain:chrisizworski.com');
 assert.equal(b.measurement.dateFrom,'2026-09-10');
 assert.equal(b.measurement.dateTo,'2026-10-07');
 assert.equal(b.measurement.site.impressions,109592);
 assert.equal(b.measurement.site.clicks,2815);
 assert.equal(b.measurement.ga4.views,23);
 assert.equal(b.measurement.nycPage.impressions,null);
 assert.ok(b.measurement.nycPage.status.startsWith('NOT AVAILABLE'));
 assert.equal(b.measurement.adsenseRevenue.status,'NOT AVAILABLE');
 assert.equal(b.targets.siteGscImpressions28d,1000000);
 assert.equal(b.targets.siteOrganicCtr,0.05);
 assert.ok(b.exactlyOneNextAction.doneWhen);
});
