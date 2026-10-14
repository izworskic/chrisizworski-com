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
  if(k==='grand'){
   assert.match(html,/data-shorefeel-fallback="\/assets\/great-lakes-beaches\/lake-michigan-hero\.jpg"/);
   assert.match(html,/commons\.wikimedia\.org\/wiki\/File:/);
   assert.match(html,/archival photo/);
  }else if(k==='traverse'){
   assert.match(html,/src="https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/b\/b7\/Traverse_City_State_Park_beach_%28Oct_2020%29\.jpg"/);
   assert.match(html,/data-shorefeel-fallback="\/assets\/great-lakes-beaches\/lake-michigan-hero\.jpg"/);
   assert.match(html,/Notorious4life/);
   assert.match(html,/CC0/);
   assert.doesNotMatch(html,/Traverse_City_Clinch_Park_Beach\.jpg/);
   assert.match(html,/href="\/assets\/leaflet-1\.9\.4\.css"/);
   assert.match(html,/src="\/assets\/leaflet-1\.9\.4\.js"/);
  }else{
   assert.match(html,/src="\/assets\/great-lakes-beaches\/lake-michigan-hero\.jpg"/);
  }
 }
});
test('ShoreFeel has a compact mobile hierarchy without losing user intents or evidence',()=>{
 const css=fs.readFileSync(path.join(root,'assets/shorefeel.css'),'utf8');
 const js=fs.readFileSync(path.join(root,'assets/shorefeel.js'),'utf8');
 for(const q of ['@media(max-width:650px)','@media(max-width:380px)','overflow-wrap:anywhere','.table-scroll']) assert.ok(css.includes(q),q);
 assert.match(js,/shorefeelFallbackUsed/);
 assert.match(js,/Destination photograph unavailable/);
 assert.match(js,/Explore the Lake Michigan shoreline/);
 assert.match(css,/\.lake-table th:nth-child\(3\),\.lake-table td:nth-child\(3\)\{display:none\}/);
 const hub=fs.readFileSync(path.join(root,pages[0][0]),'utf8');
 assert.match(hub,/class="table-scroll"/);
 for(const [p] of pages.slice(2)){const html=fs.readFileSync(path.join(root,p),'utf8');assert.match(html,/id="shorefeel-now"/);assert.match(html,/data-activity="swim"/);assert.match(html,/data-activity="paddle"/);assert.match(html,/id="local-temp">Unavailable/);}
});


test('Traverse City first screen leads with a sourced water temperature, not the photograph',()=>{
 const html=fs.readFileSync(path.join(root,'lake-michigan-water-temperature/traverse-city/index.html'),'utf8');
 const hero=html.slice(html.indexOf('<section class="hero">'),html.indexOf('</section>',html.indexOf('<section class="hero">')));
 assert.ok(hero.indexOf('id="lead-temp"')>0&&hero.indexOf('id="lead-temp"')<hero.indexOf('class="hero-media"'));
 for(const id of ['lead-temp','lead-temp-label','lead-temp-when','lead-temp-caveat','lead-bay-status']){
  assert.match(hero,new RegExp('id="'+id+'"'));
 }
 assert.match(hero,/GRAND TRAVERSE BAY/);
 assert.match(hero,/id="lead-lake-context"/);
 assert.doesNotMatch(hero,/LAKE MICHIGAN SURFACE AVERAGE/,'the lead is the bay; the lake average is context only');
 assert.match(hero,/Grand Traverse Bay buoy 45020/);
 const js=fs.readFileSync(path.join(root,'assets/shorefeel.js'),'utf8');
 assert.match(js,/renderLead/);
 assert.doesNotMatch(js,/2026-10-12|62\.1°F/,'no hard-coded dated snapshot in the client');
 assert.match(js,/dated-official-fallback/);
 assert.match(js,/NOT the measured temperature/);
});
