'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

const regions=[
 {name:'Starbase',slug:'starbase-rocket-launch-viewing',selector:'data-site-select',linkClass:'sb-google-place',expected:place=>place.lat+','+place.lon},
 {name:'Wallops',slug:'wallops-rocket-launch-viewing',selector:'data-choose',linkClass:'w-google-place',expected:place=>place.navigation}
];

for(const region of regions){
 test(region.name+' offers Google Maps beside every public map selector, without JS',()=>{
  const base='public/'+region.slug+'/';
  const html=read(base+'index.html');
  const sites=JSON.parse(read(base+'places.json')).sites;
  const links=[...html.matchAll(new RegExp('<a class="'+region.linkClass+'" href="([^"]+)"[^>]*>View in Google Maps<\\/a>','g'))];
  assert.equal(sites.length,3);
  assert.equal(links.length,sites.length);
  for(const place of sites){
   const safe=place.id.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
   const selector=new RegExp('<button\\b[^>]*'+region.selector+'="'+safe+'"[^>]*>[^<]+<\\/button>\\s*<a class="'+region.linkClass+'" href="([^"]+)"[^>]*>');
   const match=html.match(selector);
   assert.ok(match,place.id+' needs its own adjacent Google Maps link');
   const href=new URL(match[1].replace(/&amp;/g,'&'));
   assert.equal(href.origin,'https://www.google.com');
   assert.equal(href.pathname,'/maps/search/');
   assert.equal(href.searchParams.get('api'),'1');
   assert.equal(href.searchParams.get('query'),region.expected(place));
   assert.ok(!href.href.includes('/dir/'),place.id+' must not be a driving route');
   assert.match(match[0],/target="_blank" rel="noopener noreferrer"/);
   assert.match(match[0],/not directions to a launch pad/);
  }
  const css=read(base+'styles.css');
  assert.match(css,new RegExp('\\.'+region.linkClass+'\\{[^}]*min-height:44px'));
  assert.match(css,new RegExp('\\.'+region.linkClass+':focus-visible\\{'));
  assert.match(html,/20261113-rust-network-v1-gmaps-20261116/);
  assert.match(html,/styles\.css\?v=20261116-public-gmaps/);
  assert.match(html,/"dateModified":"2026-11-16"/);
  assert.match(read('public/sitemap.xml'),new RegExp('<loc>https://chrisizworski.com/'+region.slug+'/</loc>\\s*<lastmod>2026-11-16</lastmod>'));
 });
 test(region.name+' shows Google Maps in selected-place and map popups, never at the restricted pad',()=>{
  const script=read('public/'+region.slug+'/app.js');
  assert.doesNotThrow(()=>new Function(script));
  assert.match(script,/mapsPlace\(site\)/);
  assert.match(script,/mapsPlace\((site|p)\)/);
  assert.match(script,/View this place in Google Maps/);
  assert.match(script,/https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  assert.doesNotMatch(script,/google\.com\/maps\/dir\//);
  const start=script.indexOf(region.name==='Starbase'?'function displayPad()':'function updatePad()');
  const end=script.indexOf(region.name==='Starbase'?'function setTileReady()':'function loadLeaflet()',start);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(script.slice(start,end),/mapsPlace\(|google\.com\/maps/,'restricted-pad popup must never create Google Maps links');
 });
}
