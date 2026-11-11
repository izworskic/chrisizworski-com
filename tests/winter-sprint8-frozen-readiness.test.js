'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/frozen-michigan/index.html');
const js=read('public/assets/frozen-michigan-readiness.js');
const css=read('public/assets/frozen-michigan.css');
const guide=read('scripts/generate-ice-caves.mjs');
const sitemap=read('public/sitemap-winter.xml');
const engine=require('../public/assets/frozen-michigan-readiness.js');
const cards=[...html.matchAll(/<article class="wf-story" id="(stop-\d+)"([^>]*)>/g)].map(match=>({
 id:match[1],
 region:match[2].match(/data-region="([^"]+)"/)?.[1],
 access:match[2].match(/data-access="([^"]+)"/)?.[1],
 tag:match[2].match(/data-tag="([^"]+)"/)?.[1]
}));
const now=Date.parse('2026-12-19T17:00:00Z');
const siteIds=['sand-point','eben','grand-island','wagner-falls','tahquamenon-falls'];
function bundle(evidence={},age=15*60000){
 return {ok:true,generatedAt:new Date(now-age).toISOString(),sites:siteIds.map(id=>({id,evidence:id==='sand-point'?evidence:{}}))};
}
test('existing 11 photo-backed and sourced viewpoints stay indexable and navigable without JS',()=>{
 assert.equal(cards.length,11);
 assert.equal((html.match(/data-evidence="https:\/\//g)||[]).length,11);
 assert.equal((html.match(/<article class="wf-story"/g)||[]).length,11);
 assert.ok(html.includes('id="frozen-trip-desk"'));
 assert.ok(html.includes('id="fzn-desk-form" class="fzn-desk-form" hidden'));
 assert.ok(html.includes('id="fzn-desk-results" aria-live="polite"'));
 assert.ok(html.includes('id="fzn-desk-stamp" role="status"'));
 assert.ok(html.includes('src="/assets/frozen-michigan-readiness.js?v=20261111a"'));
 assert.ok(html.includes('href="#stop-2"')&&html.includes('href="#stop-10"'));
 assert.ok(css.includes('.fzn-desk-form[hidden]')&&css.includes('@media(max-width:630px)'));
 assert.ok(!js.includes('geolocation'));
 assert.ok(!js.includes('localStorage'));
});
test('curated matches are subsets of existing card data and access levels are enforceable',()=>{
 assert.deepEqual(engine.candidates(cards,{scene:'shore',access:'conditional'}).map(x=>x.id),['stop-2','stop-10','stop-11']);
 assert.deepEqual(engine.candidates(cards,{scene:'shore',access:'documented'}).map(x=>x.id),['stop-2']);
 assert.deepEqual(engine.candidates(cards,{scene:'curtains',access:'conditional'}).map(x=>x.id),['stop-1','stop-3','stop-4']);
 assert.deepEqual(engine.candidates(cards,{scene:'falls',access:'conditional'}).map(x=>x.id),['stop-5','stop-6','stop-7']);
 assert.deepEqual(engine.candidates(cards,{scene:'falls',access:'limited',region:'north'}).map(x=>x.id),['stop-9']);
 assert.deepEqual(engine.candidates(cards,{scene:'shore',region:'south',access:'conditional'}).map(x=>x.id),['stop-10','stop-11']);
 assert.deepEqual(engine.candidates(cards,{scene:'bay'}),[]);
 assert.deepEqual(engine.candidates(cards,{scene:'bad'}),[]);
 for(const scene of Object.keys(engine.MODE_IDS))assert.ok(engine.candidates(cards,{scene,access:'limited'}).every(x=>cards.some(y=>y.id===x.id)));
});
test('season-aware Michigan weekend dates do not substitute for weather or ice observations',()=>{
 assert.equal(engine.weekendLabel(Date.parse('2026-11-11T01:30:00Z')),'Nov 14–Nov 15');
 assert.equal(engine.weekendLabel(Date.parse('2026-11-15T21:00:00Z')),'Nov 21–Nov 22');
 assert.ok(!js.includes('isSafeIce'));
 assert.ok(js.includes('No verified current formation snapshot'));
});
test('stale, missing and invalid five-site evidence fails closed',()=>{
 assert.equal(engine.freshBundle(bundle({},15*60000),now),true);
 assert.equal(engine.freshBundle(bundle({},61*60000),now),false);
 assert.equal(engine.freshBundle(bundle({},-130000),now),false);
 assert.equal(engine.freshBundle({ok:true,generatedAt:new Date(now).toISOString(),sites:[]},now),false);
 assert.equal(engine.sourceSignal({id:'stop-1'},null,now).kind,'unavailable');
 assert.equal(engine.sourceSignal({id:'stop-1'},bundle({},61*60000),now).kind,'unavailable');
 assert.equal(engine.sourceSignal({id:'stop-1'},bundle(),now).kind,'unconfirmed');
 for(const id of ['stop-2','stop-6','stop-8','stop-10'])
  assert.equal(engine.sourceSignal({id},bundle({prime:true,state:'formed'}),now).kind,'not-monitored',id);
});
test('even a recently reported ice curtain needs concurrently reviewed access before highlighting',()=>{
 const report={siteId:'sand-point',state:'formed',observedOn:'2026-12-19',publishedOn:'2026-12-19'};
 const evidence={state:'formed',report,reportFresh:true,prime:true,access:'reviewed-open',
  accessReviewedAt:new Date(now-3600000).toISOString(),validUntil:new Date(now+3600000).toISOString()};
 assert.equal(engine.sourceSignal({id:'stop-1'},bundle(evidence),now).kind,'recent-official');
 assert.equal(engine.sourceSignal({id:'stop-1'},bundle({...evidence,access:'unverified'}),now).kind,'official-limited');
 assert.equal(engine.sourceSignal({id:'stop-1'},bundle({...evidence,validUntil:new Date(now-3600000).toISOString()}),now).kind,'official-limited');
 assert.equal(engine.sourceSignal({id:'stop-1'},bundle({...evidence,access:'closed'}),now).kind,'closed');
 assert.equal(engine.sourceSignal({id:'stop-1'},bundle({...evidence,report:{...report,observedOn:'2026-11-15'}}),now).kind,'unconfirmed');
 assert.equal(engine.SITE_OWNER['stop-3'],'grand-island');
 assert.equal(engine.SITE_OWNER['stop-5'],'tahquamenon-falls');
});
test('NPS does not offer a signed uphill trail; DNR Lower Falls parking must be rechecked',()=>{
 assert.ok(html.includes('Unmaintained uphill approach'));
 assert.ok(html.includes('There is no designated uphill trail'));
 assert.ok(!html.includes('Signed uphill winter trail'));
 assert.ok(!html.includes('Because the Park Service closes'));
 assert.match(html,/<article class="wf-story" id="stop-6" data-tag="falls" data-access="conditional"/);
 assert.ok(html.includes('current park plowing notices'));
 assert.ok(html.includes('Munising Falls Trail is closed until further notice'));
 assert.ok(html.includes('Never walk the icy pier'));
 assert.ok(html.includes('/michigan-ice/regions/saginaw-bay.html'));
 assert.ok(html.includes('Whole-Lake Huron coverage does not tell you Saginaw Bay ice concentration'));
 assert.ok(html.includes('https://www.michigan.gov/dnr/education/safety-info/ice'));
});
test('five-site original evidence engine links back to Frozen Michigan without creating new indexable routes',()=>{
 const routes=['','eben/','sand-point/','grand-island/','wagner-falls/','tahquamenon-falls/'];
 for(const route of routes){
  const p='public/michigan-ice-caves/'+route+'index.html';
  const page=read(p);
  assert.ok(page.includes('href="/frozen-michigan/#frozen-trip-desk"'),p);
  assert.ok(page.includes('"dateModified":"2026-11-11"'),p);
  assert.ok(sitemap.includes('<loc>https://chrisizworski.com/michigan-ice-caves/'+route+'</loc><lastmod>2026-11-11</lastmod>'),p);
 }
 assert.ok(guide.includes("date='2026-11-11'"));
 assert.ok(guide.includes('Land-based ice viewing trips'));
 assert.ok(sitemap.includes('<loc>https://chrisizworski.com/frozen-michigan/</loc><lastmod>2026-11-11</lastmod>'));
 assert.ok(html.includes('"dateModified":"2026-11-11"'));
 assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com/frozen-michigan/"'));
 assert.ok(html.includes('https://chrisizworski.com/#person'));
});
