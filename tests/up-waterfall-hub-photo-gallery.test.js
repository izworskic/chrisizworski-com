'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const css=fs.readFileSync('public/assets/up-waterfalls.css','utf8');
const photos=JSON.parse(fs.readFileSync('data/up-waterfall-photo-provenance.json','utf8')).photos;
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const featured=['bond-falls','miners-falls','spray-falls'];

test('hero previews feature exactly three real, unique waterfall photos with guide links and licenses',()=>{
  const photosInGallery=(hub.match(/class="upfall-photo-preview-card"/g)||[]).length;
  assert.equal(photosInGallery,3);
  assert.equal(new Set(featured).size,3);
  for(const id of featured){
    const p=photos.find(x=>x.id===id);
    assert.ok(p,'missing verified image '+id);
    assert.ok(hub.includes('href="/upper-peninsula-waterfalls/'+id+'/"'),'guide link '+id);
    assert.ok(hub.includes('src="'+esc(p.imageUrl)+'"'),'image source '+id);
    assert.ok(hub.includes('alt="'+esc(p.alt)+'"'),'alt '+id);
    assert.ok(hub.includes('href="'+esc(p.sourceUrl)+'"'),'credit source '+id);
    assert.ok(hub.includes('href="'+esc(p.licenseUrl)+'"'),'license '+id);
    assert.ok(hub.includes(p.creator),'creator '+id);
  }
  assert.ok(hub.includes('Historic photographs, cropped only in these previews.'));
  assert.ok(hub.includes('See each guide for the full photograph'));
});

test('photo treatment keeps main map, protected SEO and ads unchanged in their original layout',()=>{
  assert.match(hub,/class="hero"/);
  assert.match(hub,/class="upfall-photo-preview"/);
  assert.match(hub,/<main id="main">/);
  assert.match(hub,/id="falls-map"/);
  assert.match(hub,/id="shortlist"/);
  assert.match(hub,/rel="canonical" href="https:\/\/chrisizworski.com\/upper-peninsula-waterfalls\/"/);
  assert.ok(hub.includes('"dateModified":"2026-11-14"'));
  assert.ok(sitemap.includes('<loc>https://chrisizworski.com/upper-peninsula-waterfalls/</loc><lastmod>2026-11-14</lastmod>'));
  assert.match(css,/\.upfall-photo-preview-grid/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(hub,/<meta property="og:image"/);
  assert.match(hub,/<meta name="twitter:card" content="summary_large_image">/);
});
