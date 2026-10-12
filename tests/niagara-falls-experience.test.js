'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/niagara-falls-today/index.html');
const css=read('public/assets/niagara-falls-today.css');
const script=read('public/assets/niagara-falls-today.js');
const mediaSource=read('public/assets/niagara-falls-media.js');
const ctx={window:{}};vm.runInNewContext(mediaSource,ctx,{timeout:1000});
const media=ctx.window.NiagaraFallsMedia;
test('all eight experiences have distinct photos, accurate field notes and credits',()=>{
 assert.equal(Object.keys(media.stops).length,8);
 assert.equal(new Set(Object.values(media.stops).map(x=>x.src)).size,8);
 for(const [id,m] of Object.entries(media.stops)){
  assert.match(m.src,/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//,id);
  assert.ok(m.alt.length>55&&m.experience.length>90&&m.notice.length>30&&m.tip.length>30,id);
  assert.match(m.page,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(m.license,/CC BY-SA/);
  assert.match(m.licenseUrl,/^https:\/\//);
 }
});
test('waterfall hero visibly photographic with licensed attribution',()=>{
 assert.match(html,/class="hero-photo"/);
 assert.match(html,/hero-photo-credit/);
 assert.match(html,/hero\.src|NiagaraFallsPanorama\.jpg/);
 assert.match(html,/og:image/);
 assert.match(html,/name="twitter:card" content="summary_large_image"/);
 assert.match(css,/\.hero-photo img\{[^}]*object-fit:cover/);
});
test('photos appear in route stops without corrupting existing decision semantics',()=>{
 assert.match(script,/function stopMedia\(id\)/);
 assert.match(script,/stopMedia\(s\.id\)/);
 assert.match(script,/s\.schedule\.lastAdmission/);
 assert.match(script,/Official regional weather/);
 assert.match(script,/s\.transfer_minutes/);
 assert.match(script,/mediaFor\(s\.id\)\.tip/);
});
test('films are original sources and never load third-party playback automatically',()=>{
 assert.equal(media.videos.length,2);
 for(const film of media.videos){
  assert.match(film.id,/^[a-zA-Z0-9_-]{11}$/);
  assert.match(html,new RegExp('data-video-id="'+film.id+'"'));
  assert.match(html,new RegExp('https://www.youtube.com/watch\\?v='+film.id));
 }
 assert.doesNotMatch(html,/<iframe/i);
 assert.match(script,/button\.addEventListener\('click'/);
 assert.match(script,/youtube-nocookie\.com\/embed/);
});
test('images are lazy except hero; motion and mobile layouts guarded',()=>{
 assert.match(html,/loading="lazy" decoding="async"/);
 assert.match(html,/fetchpriority="high"/);
 assert.match(css,/@media\(max-width:630px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
test('no unofficial ranger impersonation, invented live claims, or changed canonical',()=>{
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/niagara-falls-today\/"/);
 assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
 assert.match(html,/Built by Chris Izworski/);
 assert.doesNotMatch(html,/official ranger|national park ranger narrat/i);
 assert.match(html,/illustrative|historical view, not live/i);
});
