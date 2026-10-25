import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const paths=[
 ...Object.keys(JSON.parse(fs.readFileSync('scripts/ice/generated.json','utf8')).files)
   .map(x=>'public/michigan-ice/'+x),
 ...['index.html','eben/index.html','sand-point/index.html','grand-island/index.html','wagner-falls/index.html','tahquamenon-falls/index.html']
   .map(x=>'public/michigan-ice-caves/'+x),
 'public/mackinac-ice-bridge/index.html',
 'public/national-tools/ice-out/index.html'
];
const routeFile=(href)=>{
  const url=new URL(href,'https://chrisizworski.com');
  if(url.hostname!=='chrisizworski.com')return null;
  const dest=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  return 'public'+dest;
};
test('All 18 ice tool pages expose a small crawlable, accessible set of contextual next tools',()=>{
  assert.equal(paths.length,18);
  const canonical=[
    '/michigan-ice/','/michigan-ice-caves/','/mackinac-ice-bridge/','/national-tools/ice-out/'
  ];
  for(const file of paths){
    const html=fs.readFileSync(file,'utf8');
    assert.equal((html.match(/data-ice-network="v1"/g)||[]).length,1,file);
    assert.match(html,/<nav class="ice-network" aria-label="Explore more ice conditions"/,file);
    assert.match(html,/<link rel="stylesheet" href="\/assets\/ice-network.css"/,file);
    const nav=html.match(/<nav class="ice-network"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(nav,file);
    const hrefs=[...nav.matchAll(/<a class="ice-network__item" href="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(hrefs.length,3,file);
    assert.equal(new Set(hrefs).size,3,'No duplicate cards '+file);
    for(const href of hrefs){
      const destination=routeFile(href);
      assert.ok(destination&&fs.existsSync(destination),'Broken internal navigation from '+file+': '+href);
      const normalized=new URL(href,'https://chrisizworski.com').pathname;
      assert.ok(canonical.includes(normalized),'Link escapes curated tool network '+file+': '+href);
    }
    const sourceRoute=file.replace(/^public/,'').replace(/index\.html$/,'');
    if(canonical.includes(sourceRoute))assert.ok(!hrefs.some(h=>new URL(h,'https://chrisizworski.com').pathname===sourceRoute),'Self-link on '+file);
    assert.match(nav,/never establish safe ice/);
    assert.doesNotMatch(nav,/adsbygoogle|data-ad-slot/);
  }
});
test('The shared network is static, mobile-ready, and driven by the existing page generators',()=>{
 const css=fs.readFileSync('public/assets/ice-network.css','utf8');
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/display:none/);
 const ice=fs.readFileSync('scripts/ice/gen_chrome.py','utf8');
 const caves=fs.readFileSync('scripts/generate-ice-caves.mjs','utf8');
 assert.match(ice,/ICE_NETWORK_NAV/);
 assert.match(ice,/FOOTER = \(\s*ICE_NETWORK_NAV/);
 assert.match(caves,/iceNetworkNav/);
 const manifest=JSON.parse(fs.readFileSync('scripts/ice/generated.json','utf8'));
 for(const [name,hash] of Object.entries(manifest.files)){
   const bytes=fs.readFileSync(path.join('public/michigan-ice',name));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name+' checksum');
 }
});
