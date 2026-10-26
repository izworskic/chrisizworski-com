#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const [html,css,js,vendor,manifest,design,photo,map,qa]=await Promise.all([
  read('starter/index.html'), read('starter/field-guide.css'), read('starter/field-guide.js'),
  read('starter/vendor/leaflet-1.9.4.css'), read('manifest.json'),
  read('docs/DESIGN_STANDARD.md'),read('docs/PHOTO_STANDARD.md'),
  read('docs/MAP_AND_TRUTH.md'),read('docs/QA_SCORECARD.md')
]);
const errors=[];
const test=(name,fn)=>{try{fn();console.log('✓ '+name);}catch(e){errors.push(name+': '+e.message);console.error('✗ '+name+': '+e.message)}};
test('stable identifier and version',()=>{
  const j=JSON.parse(manifest);assert.equal(j.id,'FIELD_GUIDE_V1');assert.equal(j.version,'1.0.0');
});
test('HTML is a portable noindex static specimen',()=>{
  assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
  assert.equal((html.match(/class="fg-story" /g)||[]).length,3);
  assert.match(html,/<noscript>/);
  assert.match(html,/href=".\/field-guide.css"/);
  assert.match(html,/href=".\/vendor\/leaflet-1.9.4.css"/);
  assert.ok(html.indexOf('id="fg-browse"') < html.indexOf('id="fg-stories"'));
});
test('all sample image credits are real and linked',()=>{
  const figs=[...html.matchAll(/<figure class="fg-photo[\s\S]*?<\/figure>/g)];
  assert.equal(figs.length,5);
  for(const [fig] of figs){
    assert.match(fig,/<img[^>]*alt="[^"]{12,}"/);
    assert.match(fig,/class="fg-credit"/);
    assert.match(fig,/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(fig,/creativecommons\.org\//);
    assert.doesNotMatch(fig,/data:image\/|placeholder|ai-generated/i);
  }
});
test('CSS gives deliberate responsive editorial rhythm',()=>{
  assert.match(css,/--fg-pine:/);assert.match(css,/--fg-display:/);
  assert.match(css,/object-position:var\(--fg-image-position\)/);
  assert.match(css,/@media\(max-width:610px\)/);
  assert.match(css,/prefers-reduced-motion/);
});
test('map CSS is complete and local',()=>{
  for(const token of ['.leaflet-container','.leaflet-pane','.leaflet-control'])assert.ok(vendor.includes(token));
});
test('script parses; no private keys embedded; fallback works',()=>{
  assert.doesNotThrow(()=>new vm.Script(js));
  assert.match(js,/\/api\/carto-basemap-config/);
  assert.match(js,/rastertiles\/voyager/);
  assert.match(js,/tile\.openstreetmap\.org/);
  assert.match(js,/ResizeObserver/);
  assert.match(js,/invalidateSize/);
  assert.doesNotMatch(js,/sk-[a-z0-9]{15,}|private.*key\s*=/i);
});
test('method and release docs are not stubs',()=>{
  for(const content of [design,photo,map,qa])assert.ok(content.length>1200);
  assert.match(qa,/90\/100/);assert.match(photo,/Wikimedia Commons/);
});
if(errors.length){console.error('\nFAIL '+errors.length+' checks');process.exitCode=1}
else console.log('\nFIELD_GUIDE_V1: all checks passed');
