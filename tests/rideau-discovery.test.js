'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const get=p=>fs.readFileSync(p,'utf8');
const canonical='https://chrisizworski.com/rideau-canal/';
const page=get('public/rideau-canal/index.html'),tools=get('public/tools/index.html');
const sitemap=get('public/sitemap.xml'),registry=JSON.parse(get('benchmarks/tool-network-registry.json'));
function jsonLd(html){const m=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);assert.ok(m);return JSON.parse(m[1]);}
const toolGraph=jsonLd(tools)['@graph'];
const list=toolGraph.find(x=>x['@id']==='https://chrisizworski.com/tools/#toollist');
test('Rideau launch intent has exactly one indexable canonical and an app identity',()=>{
  assert.ok(page.includes('<link rel="canonical" href="'+canonical+'">'));
  assert.doesNotMatch(page,/<meta[^>]+name=["']robots["'][^>]+noindex/i);
  const nodes=jsonLd(page)['@graph'];
  assert.ok(nodes.some(x=>x['@id']===canonical+'#page'&&x.mainEntity?.['@id']===canonical+'#app'));
  assert.ok(nodes.some(x=>x['@id']===canonical+'#app'&&x['@type']==='WebApplication'));
  assert.ok(nodes.some(x=>x['@id']==='https://chrisizworski.com/#person'));
  assert.ok(page.includes('2027 hours have not been verified'));
  assert.ok(page.includes('Parks Canada'));
});
test('visible Tools card and structured ItemList match one source identity and order',()=>{
  assert.equal((tools.match(/href="\/rideau-canal\/"/g)||[]).length,1);
  assert.equal((tools.match(/data-tool-id="rideau-canal"/g)||[]).length,1);
  assert.equal((tools.match(/class="tool-card"/g)||[]).length,list.itemListElement.length);
  assert.equal(list.numberOfItems,list.itemListElement.length);
  assert.deepEqual(list.itemListElement.map(x=>x.position),list.itemListElement.map((_,i)=>i+1));
  const item=list.itemListElement.filter(x=>x.item?.url===canonical);
  assert.equal(item.length,1);
  assert.equal(item[0].item['@id'],canonical+'#app');
  assert.equal(item[0].item.creator['@id'],'https://chrisizworski.com/#person');
  const urls=list.itemListElement.map(x=>x.item?.url);
  assert.equal(new Set(urls).size,urls.length);
});
test('new canonical is only listed once in public sitemap and discoverable from related waterways',()=>{
  assert.equal((sitemap.match(/<loc>https:\/\/chrisizworski\.com\/rideau-canal\/<\/loc>/g)||[]).length,1);
  for(const src of ['public/welland-canal/index.html','public/st-lawrence-seaway/index.html']){
    assert.ok(get(src).includes('href="/rideau-canal/"'),src);
  }
  assert.ok(page.includes('href="/welland-canal/"'));
});
test('tool network keeps Rideau search intent distinct from Welland shipping',()=>{
  const node=registry.tools.filter(x=>x.id==='rideau-canal');
  assert.equal(node.length,1);
  assert.equal(node[0].canonical,canonical);
  assert.match(node[0].primaryIntent,/paddling/);
  assert.ok(!node[0].primaryIntent.includes('ships today'));
  const edges=registry.relationships.filter(x=>x.from==='rideau-canal'||x.to==='rideau-canal');
  assert.equal(edges.length,4);
  for(const edge of edges){
    assert.ok(registry.tools.some(x=>x.id===edge.from));
    assert.ok(registry.tools.some(x=>x.id===edge.to));
  }
});
