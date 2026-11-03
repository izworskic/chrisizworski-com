'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const json=p=>JSON.parse(read(p));
const url='https://chrisizworski.com/living-garden/';
test('Living Garden has one canonical and a complete externally owned upstream route',()=>{
 const v=json('vercel.json');
 const expected=new Map([
  ['/living-garden','https://garden.chrisizworski.com/living-garden'],
  ['/living-garden/','https://garden.chrisizworski.com/living-garden'],
  ['/_next/:path*','https://garden.chrisizworski.com/_next/:path*'],
  ['/api/living-garden-weather','https://garden.chrisizworski.com/api/living-garden-weather'],
  ['/api/living-garden-climate','https://garden.chrisizworski.com/api/living-garden-climate'],
  ['/api/living-garden-frost','https://garden.chrisizworski.com/api/living-garden-frost']
 ]);
 for(const [source,dest] of expected){
  const actual=v.rewrites.filter(x=>x.source===source);
  assert.equal(actual.length,1,source+' routing must be unique');
  assert.equal(actual[0].destination,dest,source+' upstream must match the owning app');
 }
 const map=json('benchmarks/tool-network-registry.json');
 const nodes=map.tools.filter(x=>x.id==='living-garden');
 assert.equal(nodes.length,1);
 assert.equal(nodes[0].canonical,url);
 assert.ok(map.relationships.some(x=>x.from==='planting-calendar'&&x.to==='living-garden'));
 assert.ok(map.relationships.some(x=>x.from==='living-garden'&&x.to==='frost-dates'));
 const properties=json('benchmarks/creator-entity-contract.json');
 const origin=properties.properties.find(x=>x.host==='garden.chrisizworski.com');
 assert.ok(origin&&origin.toolIds.includes('living-garden'));
 assert.equal(origin.personId,'https://chrisizworski.com/#person');
});
test('Sitemap, gardening hub, Tools card and visible ItemList agree with the canonical',()=>{
 const sitemap=read('public/sitemap.xml');
 assert.equal((sitemap.match(/<loc>https:\/\/chrisizworski\.com\/living-garden\/<\/loc>/g)||[]).length,1);
 assert.match(read('public/michigan-gardening/index.html'),/class="start-card" href="\/living-garden\/"[^>]*><strong>The Living Garden/);
 const html=read('public/tools/index.html');
 assert.equal((html.match(/data-tool-id="living-garden"/g)||[]).length,1);
 assert.match(html,/data-tool-id="living-garden"[\s\S]{0,900}href="\/living-garden\/"[\s\S]*?<\/div>/);
 const ld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
 const list=ld.flatMap(x=>x['@graph']||[x]).find(x=>x['@type']==='ItemList');
 assert.ok(list);
 const shown=[...html.matchAll(/<div class="tool-card" data-tool-id="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(list.numberOfItems,shown.length);
 assert.equal(list.itemListElement.length,shown.length);
 const index=shown.indexOf('living-garden');
 assert.ok(index>=0);
 assert.equal(list.itemListElement[index].position,index+1);
 assert.equal(list.itemListElement[index].item.url,url);
 const instances=list.itemListElement.filter(x=>x.item?.url===url);
 assert.equal(instances.length,1);
});
