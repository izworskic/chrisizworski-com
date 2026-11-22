'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const mi=read('public/great-lakes-beaches/index.html');
const us=read('public/great-lakes-beaches/around-the-lakes/index.html');
const ca=read('public/great-lakes-beaches/canada/index.html');
const css=read('public/assets/shorefeel-wayfinding.css');
const mainGen=read('scripts/generate-beach-pages.mjs');

test('visitors can choose a direct question on all three ShoreFeel regions',()=>{
  for(const [html,current] of [[mi,'/great-lakes-beaches/'],[us,'/great-lakes-beaches/around-the-lakes/'],[ca,'/great-lakes-beaches/canada/']]){
    assert.match(html,/class="shore-region-tabs"/);
    for(const route of ['/great-lakes-beaches/','/great-lakes-beaches/around-the-lakes/','/great-lakes-beaches/canada/'])
      assert.ok(html.includes('href="'+route+'"'),current+' lost cross-region entry');
    assert.ok(html.includes('href="'+current+'" aria-current="page"'),current+' current region unclear');
    assert.match(html,/class="shore-question-links"/);
    assert.match(html,/href="#swimSafety"/);
    assert.match(html,/id="swimSafety"/);
    assert.match(html,/assets\/shorefeel-wayfinding\.css/);
  }
  assert.match(mi,/href="#heroBeachSearch"/);
  assert.match(us,/href="#shore-search"/);
  assert.match(ca,/href="#shore-search"/);
});

test('Michigan answers first, but all 50 crawlable beaches remain in native disclosure',()=>{
  const live=mi.indexOf('id="beachExplorer"');
  const ranking=mi.indexOf('id="daily-heading"');
  const index=mi.indexOf('id="beachIndex"');
  assert.ok(live>=0&&live<ranking&&ranking<index,'find a beach before ranking and directory');
  const first=mi.indexOf('<!-- beach-index:start -->');
  const last=mi.indexOf('<!-- beach-index:end -->',first);
  const section=mi.slice(first,last);
  assert.match(section,/<details class="beach-index-details"><summary>Browse the full 50-beach directory by lake/);
  assert.equal((section.match(/<li><a href="\/great-lakes-beaches\//g)||[]).length,50);
  assert.match(section,/<\/details>/);
  assert.match(mi,/50 Lake Michigan, Huron, Superior, and Erie beaches/);
  assert.match(mi,/BeachGuard notices/);
  assert.match(mi,/NWS swim risk/);
  assert.match(mi,/Near me/);
  assert.ok(mainGen.includes('beach-index-details'),'generator preserves the native disclosure');
  const catalog=JSON.parse(read('data/beaches.json'));
  const block=mainGen.slice(mainGen.indexOf('const START ='),mainGen.indexOf('const hubPath ='));
  const escapeHtml=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const generated=new Function('catalog','escapeHtml',block+'\nreturn indexHtml;')(catalog,escapeHtml);
  assert.equal(mi.slice(first,last+'<!-- beach-index:end -->'.length),generated,'checked-in directory must round-trip through the generator');
});

test('regional shore finder has searchable 46 crawlable places and a truthful empty state',()=>{
  const datasets=[
    {html:us,script:read('public/assets/shorefeel-us.js'),count:16,area:'around-the-lakes',first:'park-point-beach-house'},
    {html:ca,script:read('public/assets/shorefeel-ca.js'),count:30,area:'canada',first:'agawa-bay'}
  ];
  for(const d of datasets){
    assert.equal((d.html.match(/class="shore-stop"/g)||[]).length,d.count,d.area+' lost source-linked beaches');
    assert.match(d.html,/id="shore-search" type="search"/);
    assert.match(d.html,/data-lake-filter="All" aria-pressed="true"/);
    assert.match(d.html,/id="shore-no-match"[^>]*role="status" hidden/);
    assert.match(d.html,/id="result-count" role="status"/);
    assert.ok(d.html.includes('id="report-detail" href="/great-lakes-beaches/'+d.area+'/'+d.first+'/'),d.area+' needs a canonical answer handoff');
    assert.ok(d.script.includes("'shore-search'"));
    assert.ok(d.script.includes("'shore-no-match'"));
    assert.ok(d.script.includes('search.value.trim().toLowerCase()'));
    assert.ok(d.script.includes("'All'"));
    assert.ok(d.script.includes("'field-report').hidden=true"),'old forecast must hide on zero search results');
    assert.ok(d.script.includes("'report-detail'"),'selected report must update canonical field note');
    assert.doesNotThrow(()=>new Function(d.script),'regional browser script must parse');
    assert.match(d.html,/<noscript>/);
  }
  assert.match(us,/No beach is labeled safe, open or recently tested here/);
  assert.match(ca,/Weather is not a swimming advisory/);
});

test('navigation remains lightweight, keyboard reachable and free of ad changes',()=>{
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/beach-index-details/);
  assert.doesNotMatch(css,/adsbygoogle|googlesyndication|ad-slot|auto-ads/i);
});
