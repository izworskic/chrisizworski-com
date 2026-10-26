const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('public/michigan-snow-totals/index.html');
test('NWS observed totals remain first with functional city search and map',()=>{
  assert.match(html,/<h1>Michigan Snow Totals Today<\/h1>/);
  assert.match(html,/id="townSearch"/);
  assert.match(html,/id="snowMap"/);
  assert.match(html,/id="snowSummary"/);
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/michigan-snow-totals\/">/);
});
test('distinct next decisions link to the real winter network without confusing models with observations',()=>{
  for(const slug of ['michigan-snow-depth','lake-effect-snow','national-tools/snow','national-tools/white-christmas/forecast','snowmobile','michigan-cross-country-skiing']){
    assert.ok(html.includes('href="/'+slug+'/"'),'Crawlable winter link: '+slug);
  }
  assert.match(html,/where snow remains on the ground, distinct from reports of how much fell/);
  assert.match(html,/which snowbelt could receive new snow next/);
  assert.match(html,/today's snowfall report does not predict December 25/);
});
test('revised HTML date is synchronized with both site sitemaps',()=>{
  assert.match(html,/"dateModified": "2026-10-25"/);
  for(const file of ['public/sitemap.xml','public/sitemap-winter.xml']){
    assert.match(read(file),/<loc>https:\/\/chrisizworski\.com\/michigan-snow-totals\/<\/loc>\s*<lastmod>2026-10-25<\/lastmod>/);
  }
});
