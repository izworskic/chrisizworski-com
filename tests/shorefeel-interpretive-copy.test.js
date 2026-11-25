'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
const mi=JSON.parse(read('data/beaches.json')).beaches;
const notes=JSON.parse(read('data/shorefeel-field-notes-mi.json')).notes;
const us=JSON.parse(read('data/shorefeel-us-coast.json')).beaches;
const ca=JSON.parse(read('data/shorefeel-canada-ontario.json')).locations;

test('Michigan beach stories are uniquely authored, source-controlled, and rendered below the answer',()=>{
 assert.equal(mi.length,50);
 assert.equal(Object.keys(notes).length,50);
 assert.equal(new Set(Object.values(notes)).size,50);
 const pins=read('scripts/verify-source.mjs');
 for(const b of mi){
  const note=notes[b.slug],html=read('public/great-lakes-beaches/'+b.slug+'/index.html');
  assert.ok(typeof note==='string'&&note.length>=120,b.slug+' needs a developed field note');
  assert.ok(html.includes('<p>'+esc(note).replaceAll('&#39;','&#039;')+'</p>'),b.slug+' generated note drift');
  assert.ok(html.indexOf('data-shorefeel-value')>=0&&html.indexOf('data-shorefeel-value')<html.indexOf(esc(note).replaceAll('&#39;','&#039;')),b.slug+' temperature must remain first');
  assert.match(html,/Reading the weather together/);
  assert.match(html,/rel="canonical"/);
  assert.ok(html.includes('https://chrisizworski.com/#person'),b.slug+' creator identity');
  const hash=crypto.createHash('sha256').update(html).digest('hex');
  assert.ok(pins.includes('["/great-lakes-beaches/'+b.slug+'/", "'+hash+'"]'),b.slug+' source hash must be repinned');
 }
 assert.match(notes['wenonah-park'],/not to a designated swimming beach/);
});

test('46 regional stories survive atlas and detail regeneration without changing weather source semantics',()=>{
 assert.equal(us.length,16);assert.equal(ca.length,30);
 const sitemap=read('public/sitemap-shorefeel-beaches.xml');
 assert.equal((sitemap.match(/<url>/g)||[]).length,46);
 for(const [area,places] of [['around-the-lakes',us],['canada',ca]]){
  const atlas=read('public/great-lakes-beaches/'+area+'/index.html');
  for(const b of places){
   const html=read('public/great-lakes-beaches/'+area+'/'+b.slug+'/index.html');
   assert.ok(b.story.length>150,b.slug+' needs interpretive context');
   assert.ok(atlas.includes('data-story="'+esc(b.story)+'"'),b.slug+' atlas is out of sync');
   assert.ok(html.includes('<p class="shore-story">'+esc(b.story)+'</p>'),b.slug+' page is out of sync');
   assert.ok(html.indexOf('id="feel-value"')<html.indexOf('class="shore-story"'),b.slug+' answer must come first');
   assert.match(html,/No measured beach cooling adjustment or current swimming-area water temperature/);
   assert.match(html,/https:\/\/chrisizworski.com\/#person/);
   assert.doesNotMatch(html,/<script[^>]+(googlesyndication|adsbygoogle)/i);
   assert.ok(sitemap.includes('/'+area+'/'+b.slug+'/'),b.slug+' absent from sitemap');
  }
 }
});

test('regional explorer language guides observation while preserving uncertainty',()=>{
 const michigan=read('public/great-lakes-beaches/index.html');
 const usAtlas=read('public/great-lakes-beaches/around-the-lakes/index.html');
 const caAtlas=read('public/great-lakes-beaches/canada/index.html');
 assert.match(michigan,/Picture the shoreline you want to visit/);
 assert.match(usAtlas,/Try a simple weather lesson/);
 assert.match(caAtlas,/Georgian Bay pines/);
 for(const html of [michigan,usAtlas,caAtlas]){
  assert.match(html,/rel="canonical"/);
  assert.match(html,/chrisizworski.com\/#person/);
 }
 assert.match(read('scripts/generate-beach-pages.mjs'),/shorefeel-field-notes-mi\.json/);
 assert.match(read('scripts/generate-shorefeel-details.mjs'),/Meet this shoreline/);
 assert.match(read('public/assets/shorefeel-ca.js'),/Environment Canada/);
});

test('legacy beach region guides and seasonal ranking keep the same interpretive and source boundaries',()=>{
 const guides=[
  ['great-lakes-beaches/lake-michigan',19,'Buoys do not measure conditions at a swimming beach'],
  ['great-lakes-beaches/saginaw-bay',5,'Wenonah Park gives you a riverfront view, not a swimming beach']
 ];
 const sitemap=read('public/sitemap.xml');
 for(const [route,count,lesson] of guides){
  const html=read('public/'+route+'/index.html');
  assert.equal((html.match(/class="loc-notes"/g)||[]).length,count,route+' place field notes');
  assert.ok(html.includes(lesson),route+' distinct shore/weather interpretation missing');
  assert.ok(html.includes('"dateModified": "2026-11-22"'),route+' source stamp');
  assert.ok(sitemap.includes('<loc>https://chrisizworski.com/'+route+'/</loc>\n    <lastmod>2026-11-22</lastmod>'),route+' sitemap freshness');
 }
 const route='best-michigan-beaches-today';
 const html=read('public/'+route+'/index.html');
 assert.match(html,/Step onto a Lake Michigan dune/);
 assert.match(html,/The Beach Day Score uses the same 100 available points/);
 assert.match(html,/Only designated swim beaches/);
 assert.match(html,/NWS low, moderate, and high swim risk/);
 assert.ok(html.includes('"dateModified": "2026-11-22"'));
 assert.ok(sitemap.includes('<loc>https://chrisizworski.com/'+route+'/</loc>\n    <lastmod>2026-11-22</lastmod>'));
 const beachMap=read('public/sitemap-beaches.xml');
 assert.ok(beachMap.includes('<loc>https://chrisizworski.com/'+route+'/</loc>\n    <lastmod>2026-11-22</lastmod>'));
 assert.ok(read('scripts/generate-beach-pages.mjs').includes('changefreq: "daily", lastmod: "2026-11-22"'));
 const pin=crypto.createHash('sha256').update(html).digest('hex');
 assert.ok(read('scripts/verify-source.mjs').includes('["/'+route+'/", "'+pin+'"]'),'exact seasonal source pin');
});
