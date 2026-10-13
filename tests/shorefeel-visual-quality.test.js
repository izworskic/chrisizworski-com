'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public');
const pages=[['great-lakes-water-temperature/index.html','hub'],['lake-michigan-water-temperature/index.html','lake'],['lake-michigan-water-temperature/grand-haven/index.html','grand'],['lake-michigan-water-temperature/traverse-city/index.html','traverse']];
test('ShoreFeel shows one genuinely sourced image per destination with accessible description',()=>{
 for(const [file,k] of pages){const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.equal((html.match(/class="hero-photo"/g)||[]).length,1,k);
  assert.match(html,/class="hero-photo"[^>]*alt="[^"]{20,}"/,k);
  assert.match(html,/<figcaption>[^]*?<\/figcaption>/,k);
  assert.match(html,/href="#(?:lake-readings|shorefeel-now)"/,k);
  assert.match(html,/name="twitter:image"/);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  if(['grand','traverse'].includes(k)){
   assert.match(html,/data-shorefeel-fallback="\/assets\/great-lakes-beaches\/lake-michigan-hero\.jpg"/);
   assert.match(html,/commons\.wikimedia\.org\/wiki\/File:/);
   assert.match(html,/archival photo/);
  }else assert.match(html,/src="\/assets\/great-lakes-beaches\/lake-michigan-hero\.jpg"/);
 }
});
test('ShoreFeel has a compact mobile hierarchy without losing user intents or evidence',()=>{
 const css=fs.readFileSync(path.join(root,'assets/shorefeel.css'),'utf8');
 const js=fs.readFileSync(path.join(root,'assets/shorefeel.js'),'utf8');
 for(const q of ['@media(max-width:650px)','@media(max-width:380px)','overflow-wrap:anywhere','.table-scroll']) assert.ok(css.includes(q),q);
 assert.match(js,/shorefeelFallbackUsed/);
 assert.match(js,/Destination photograph unavailable/);
 const hub=fs.readFileSync(path.join(root,pages[0][0]),'utf8');
 assert.match(hub,/class="table-scroll"/);
 for(const [p] of pages.slice(2)){const html=fs.readFileSync(path.join(root,p),'utf8');assert.match(html,/id="shorefeel-now"/);assert.match(html,/data-activity="swim"/);assert.match(html,/data-activity="paddle"/);assert.match(html,/id="local-temp">Unavailable/);}
});
