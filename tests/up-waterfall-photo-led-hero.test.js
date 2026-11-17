'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const css=fs.readFileSync('public/assets/up-waterfalls-experience-pilot.css','utf8');
const photos=JSON.parse(fs.readFileSync('data/up-waterfall-photo-provenance.json','utf8')).photos;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const featured=['manabezho-falls','wagner-falls','sable-falls'];
const scene=html.match(/<aside class="upfall-hero-photo-wall"[\s\S]*?<\/aside>/)?.[0];

test('waterfall main page opens with three different real, source-verified waterfall photographs',()=>{
  assert.ok(scene,'hero image wall must be present in the server-rendered HTML');
  assert.ok(html.indexOf('class="upfall-hero-photo-wall"')<html.indexOf('id="falls-map"'),'the visitor sees the photographs before the map');
  assert.equal((scene.match(/<figure class="upfall-hero-photo-card/g)||[]).length,3);
  assert.equal(new Set(featured).size,featured.length);
  for(const id of featured){
    const photo=photos.find(x=>x.id===id);
    assert.ok(photo&&photo.role==='verified-guide-photo','unverified photograph '+id);
    const figure=scene.match(new RegExp('<figure class="upfall-hero-photo-card[^"]*" data-featured-fall="'+id+'"[\\s\\S]*?<\\/figure>'))?.[0];
    assert.ok(figure,'missing image card for '+id);
    assert.ok(figure.includes('src="'+esc(photo.imageUrl)+'"'),'image source '+id);
    assert.ok(figure.includes('alt="'+esc(photo.alt)+'"'),'specific alt text '+id);
    assert.ok(figure.includes('width="'+photo.width+'" height="'+photo.height+'"'),'intrinsic image dimensions '+id);
    assert.ok(figure.includes('href="/upper-peninsula-waterfalls/'+id+'/"'),'guide link '+id);
    assert.ok(figure.includes('href="'+esc(photo.sourceUrl)+'"'),'photographer source '+id);
    assert.ok(figure.includes('href="'+esc(photo.licenseUrl)+'"'),'license link '+id);
    assert.ok(figure.includes(esc(photo.creator)),'visible creator credit '+id);
  }
  assert.match(scene,/Scenes from past visits, not today's trail or water conditions/);
  assert.match(scene,/Photo previews are framed for this layout/);
  assert.match(scene,/loading="eager" decoding="async" fetchpriority="high"/);
});

test('photography does not displace access research, map first visitor task or established gallery',()=>{
  assert.match(html,/<a class="pill-link" href="#falls-map">Explore the waterfall map<\/a>/);
  assert.match(html,/id="visit-lens"/);
  assert.match(html,/id="falls-map"/);
  assert.match(html,/id="shortlist"/);
  assert.match(html,/class="upfall-photo-preview"/);
  assert.equal((html.match(/class="upfall-photo-preview-card"/g)||[]).length,3);
  assert.match(html,/Munising Falls remains closed/);
  assert.match(html,/href="https:\/\/chrisizworski.com\/upper-peninsula-waterfalls\/"/);
  assert.match(html,/pagead2.googlesyndication.com\/pagead\/js\/adsbygoogle.js/);
  assert.match(html,/"dateModified":"2026-11-17"/);
  assert.match(css,/\.upfall-hero-photo-grid/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.doesNotMatch(scene,/data:image\/svg\+xml|placehold\.co|unsplash\.com/);
  assert.doesNotMatch(css,/touch-action:none/);
});
