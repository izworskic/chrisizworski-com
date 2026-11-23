'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const tools=read('public/tools/index.html');
const great=read('public/great-lakes/index.html');
const freight=read('public/freighters/index.html');
const sitemap=read('public/sitemap.xml');
const registry=JSON.parse(read('benchmarks/tool-network-registry.json'));
const rivers=[['calumet','calumet-river-watch','Chicago'],['cuyahoga','cuyahoga-river-watch','Cleveland']];
const schema=h=>JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const catalog=[...tools.matchAll(/<div class="tool-card"[^>]*>[\s\S]*?<div class="tool-title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/div>\s*<div class="tool-desc">([\s\S]*?)<\/div>\s*<\/div>/g)];
test('Working river listings are distinct real tool cards in the Great Lakes section',()=>{
 const start=tools.indexOf('<section class="tool-group" id="great-lakes-tools-group"');
 const end=tools.indexOf('</section>',start);
 assert.ok(start>0&&end>start);
 const section=tools.slice(start,end);
 for(const [river,id,city] of rivers){
  const slug='/'+river+'-freighter-watch/';
  const cards=catalog.filter(m=>m[1]===slug);
  assert.equal(cards.length,1,river+' directory card');
  assert.ok(section.includes(cards[0][0]));
  assert.match(cards[0][0],new RegExp('data-tool-id="'+id+'"'));
  assert.match(cards[0][0],/data-tags="[^"]*boating[^"]*freighters[^"]*ships/);
  assert.ok(cards[0][2].includes(city));
  assert.match(cards[0][3],/AIS|vessels/);
  assert.ok(fs.existsSync('public'+slug+'index.html'));
  assert.match(read('public'+slug+'index.html'),/name="robots" content="noindex,follow"/);
 }
 assert.equal(new Set(catalog.map(m=>m[1])).size,catalog.length);
});
test('Tools ItemList and registry agree with all 94 rendered cards',()=>{
 const graph=schema(tools)['@graph'];
 const list=graph.find(x=>x['@id']==='https://chrisizworski.com/tools/#toollist');
 assert.ok(list);
 assert.equal(catalog.length,94);
 assert.equal(list.numberOfItems,catalog.length);
 assert.equal(list.itemListElement.length,catalog.length);
 assert.deepEqual(list.itemListElement.map(x=>x.position),catalog.map((_,i)=>i+1));
 assert.equal(new Set(list.itemListElement.map(x=>x.item.url)).size,catalog.length);
 for(const [river,id] of rivers){
  const url='https://chrisizworski.com/'+river+'-freighter-watch/';
  assert.equal(list.itemListElement.filter(x=>x.item.url===url).length,1);
  const tool=registry.tools.find(x=>x.id===id);
  assert.ok(tool);
  assert.equal(tool.canonical,url);
  assert.equal(tool.cluster,'great-lakes-shipping');
  assert.equal(tool.searchTreatment.status,'noindex-pilot');
 }
 assert.equal(graph.find(x=>x['@id']==='https://chrisizworski.com/tools/').dateModified,'2026-11-23');
});
test('Great Lakes hub displays both river cards plus discoverable ship-following links',()=>{
 const i=great.indexOf('<div class="card-grid live-grid">');
 const j=great.indexOf('</div>',i);
 assert.ok(i>=0&&j>i);
 const featured=great.slice(i,j);
 assert.equal((featured.match(/data-featured-tool="/g)||[]).length,11);
 assert.match(great,/Eleven places to begin/);
 const lane=great.match(/<div class="decision-network__lane"><h3>Following ships<\/h3>([\s\S]*?)<\/ul><\/div>/)[1];
 for(const [river,id,city] of rivers){
  const slug=river+'-freighter-watch';
  assert.ok(featured.includes('data-featured-tool="'+id+'"'));
  assert.ok(featured.includes('href="/'+slug+'/" data-track-tool="'+id+'" data-placement="great-lakes-live"'));
  assert.ok(lane.includes('href="/'+slug+'/" data-decision-network="'+id+'" data-lane="ships"'));
  assert.ok(featured.includes(city));
 }
 assert.match(great,/rel="canonical" href="https:\/\/chrisizworski.com\/great-lakes\/"/);
});
test('Freighter Central links both tools and its ItemList preserves ordering',()=>{
 const start=freight.indexOf('<section id="live-tools"');
 const end=freight.indexOf('</section>',start);
 assert.ok(start>=0&&end>start);
 const grid=freight.slice(start,end);
 const graph=schema(freight)['@graph'];
 const list=graph.find(x=>x['@id']==='https://chrisizworski.com/freighters/#directory').itemListElement;
 assert.equal(new Set(list.map(x=>x.url)).size,list.length);
 assert.deepEqual(list.map(x=>x.position),list.map((_,i)=>i+1));
 assert.equal(graph.find(x=>x['@type']==='CollectionPage').dateModified,'2026-11-23');
 for(const [river,id,city] of rivers){
  const slug=river+'-freighter-watch';
  assert.ok(grid.includes('data-working-river="'+river+'"'));
  assert.ok(grid.includes('href="/'+slug+'/" data-track-tool="'+id+'" data-placement="freighters-live-tools"'));
  assert.ok(grid.includes(city));
  assert.equal(list.filter(x=>x.url==='https://chrisizworski.com/'+slug+'/').length,1);
 }
});
test('Sitemap lastmod for edited hub URLs is updated, but pilot pages remain noindex',()=>{
 for(const hub of ['tools','freighters'])assert.match(sitemap,new RegExp('<loc>https://chrisizworski.com/'+hub+'/</loc>\\s*<lastmod>2026-11-23</lastmod>'));
 for(const [river] of rivers)assert.ok(!sitemap.includes('<loc>https://chrisizworski.com/'+river+'-freighter-watch/</loc>'));
});
