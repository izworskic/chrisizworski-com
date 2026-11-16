'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=x=>fs.readFileSync(x,'utf8');
const hub=read('public/upper-peninsula-waterfalls/index.html');
const verified=JSON.parse(read('data/up-waterfall-photo-provenance.json')).photos;
const pending=JSON.parse(read('data/up-waterfall-photo-review-queue.json')).pending;
const css=read('public/assets/up-waterfalls.css');
const cases=[
 {id:'sturgeon-falls',need:'Sturgeon River Gorge in Ottawa National Forest',source:'https://commons.wikimedia.org/wiki/File:ONF_SturgeonRiverGorge_FC092215_(21008284173).jpg',rights:'https://commons.wikimedia.org/wiki/Template:PD-USGov-USDA-FS',noindex:false},
 {id:'silver-river-falls',need:'Silver River Falls roadside sign',source:'https://commons.wikimedia.org/wiki/File:Copper_Country_Trail_-_Silver_River_Falls_Sign_-_NARA_-_7717788.jpg',rights:'https://commons.wikimedia.org/wiki/Template:PD-USGov-DOT',noindex:true},
];
test('two publicly licensed archive photos are labeled as context, never falsely as named waterfall photos',()=>{
 assert.ok(css.includes('.upfall-context-photo img'));
 for(const c of cases){
  const page=read('public/upper-peninsula-waterfalls/'+c.id+'/index.html');
  assert.equal((page.match(/class="upfall-context-photo"/g)||[]).length,1);
  assert.ok(page.includes(c.need),c.id+' place');
  assert.ok(page.includes('Historic place context, not a verified waterfall photograph.'),c.id+' warning');
  assert.ok(page.includes('historical scene, not current conditions'.replace(/^h/,'H')),c.id+' historic condition');
  assert.ok(page.includes('href="'+c.source+'"'),c.id+' original source');
  assert.ok(page.includes('href="'+c.rights+'"'),c.id+' public-domain source');
  assert.ok(!page.includes('class="upfall-verified-photo"'),c.id+' do not claim exact falls image');
  assert.ok(page.includes(c.noindex?'content="noindex,follow"':'content="index,follow,max-image-preview:large"'),c.id+' robots unchanged');
  assert.ok(!verified.some(p=>p.id===c.id),c.id+' not promoted to cleared waterfall photos');
  assert.ok(pending.some(p=>p.id===c.id),c.id+' still requires waterfall-specific photograph');
  const card=hub.match(new RegExp('<article class="waterfall-card" data-fall data-id="'+c.id+'"[^]*?<\\/article>'))?.[0];
  assert.ok(card,c.id+' discoverability');
  assert.ok(!card.includes('class="upfall-card-preview"'),c.id+' cannot pass off context as falls in search results');
 }
});
test('Sturgeon update is truthful and Silver Falls remains out of sitemap',()=>{
 const s=read('public/sitemap-up-waterfalls.xml');
 assert.ok(s.includes('<loc>https://chrisizworski.com/upper-peninsula-waterfalls/sturgeon-falls/</loc><lastmod>2026-11-16</lastmod>'));
 assert.ok(!s.includes('/upper-peninsula-waterfalls/silver-river-falls/'));
 for(const c of cases)assert.ok(read('public/upper-peninsula-waterfalls/'+c.id+'/index.html').includes('"dateModified":"2026-11-16"'));
 assert.ok(hub.includes('pagead2.googlesyndication.com'),'ads unchanged');
});
