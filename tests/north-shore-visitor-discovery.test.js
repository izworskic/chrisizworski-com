const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../public');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const national=read('synced-national-tools/index.html');
const regional=read('synced-national-tools/northeast-great-lakes/index.html');
const circle=read('lake-superior-circle-tour/index.html');
const decisions=[
 ['split-rock-river-loop','/split-rock-river-loop/'],
 ['split-rock-lighthouse-visit','/split-rock-lighthouse-visit/'],
 ['isle-royale-ferry','/isle-royale-ferry/'],
 ['lake-superior-circle-tour','/lake-superior-circle-tour/']
];
function siteSchemas(html){return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const d=JSON.parse(m[1]);return d['@graph']||[d]})}
test('National Tools: North Shore is prominent and has the four canonical searchable decisions',()=>{
 assert.ok(national.indexOf('id="north-shore-visitor-tools"')>national.indexOf('<main'));
 assert.ok(national.indexOf('id="north-shore-visitor-tools"')<national.indexOf('class="catalog-group national-utilities"'));
 assert.match(national,/Going up the North Shore\? Make each stop count/);
 assert.match(national,/Will I see a freighter/);
 assert.match(national,/Can I hike the loop/);
 assert.match(national,/Which ticket do I need/);
 assert.match(national,/Windigo or Rock Harbor/);
 for(const [id,url] of decisions){assert.equal((national.match(new RegExp('data-tool-id="'+id+'"','g'))||[]).length,1,'one filterable '+id);assert.ok(national.includes('href="'+url+'"'),'link '+url);}
 const schemas=siteSchemas(national),list=schemas.find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
 assert.ok(list);
 const cards=(national.match(/data-search-card(?=\s|>)/g)||[]).length;
 assert.equal(cards,list.numberOfItems);
 assert.equal(cards,list.itemListElement.length);
 assert.equal(new Set(list.itemListElement.map(x=>x.url)).size,cards);
 for(const [id,url] of decisions)assert.equal(list.itemListElement.filter(x=>x.url==='https://chrisizworski.com'+url).length,1,id+' schema owner');
 assert.ok(list.itemListElement.every((x,i)=>x.position===i+1));
 assert.match(national,/https:\/\/chrisizworski.com\/#person/);
 assert.match(national,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/"/);
});
test('North Shore specialty links are real tools, not duplicate made-up pages',()=>{
 for(const [id,url] of decisions){
  if(id==='isle-royale-ferry')continue;
  assert.ok(fs.existsSync(path.join(root,url,'index.html')),'local canonical exists '+url);
 }
 assert.match(national,/published 2026/i);
 assert.match(national,/future sailings and seats unverified/i);
 assert.match(national,/upper crossing has no bridge/i);
});
test('Circle Tour: four visitor handoffs, contextual stop placement and unchanged 31-stop route',()=>{
 assert.match(circle,/id="north-shore-decisions"/);
 assert.match(circle,/id="seg-mn"/);
 assert.ok(circle.indexOf('id="north-shore-decisions"')>circle.indexOf('id="seg-mn"'));
 assert.ok(circle.indexOf('id="north-shore-decisions"')<circle.indexOf('id="stop-21"'));
 for(const url of ['/duluth-canal-park/','/split-rock-river-loop/','/split-rock-lighthouse-visit/','/isle-royale-ferry/'])assert.ok(circle.includes('href="'+url+'"'),url);
 assert.equal((circle.match(/class="stop-card"/g)||[]).length,31);
 for(const id of ['22','27','30']){
  const i=circle.indexOf('id="stop-'+id+'"');
  const j=circle.indexOf('</article>',i);
  assert.ok(i>=0 && j>i);
  assert.ok(circle.slice(i,j).includes('class="nshore-stop-decision"'),'stop '+id+' lost its contextual visitor decision');
 }
 assert.match(circle,/ferry travel is optional/i);
 assert.match(circle,/return travel together/);
 assert.match(circle,/id="circleTourMap"/);
 assert.match(circle,/data-preset="7"/);
 assert.match(circle,/data-preset="10"/);
 assert.match(circle,/data-preset="15"/);
 assert.match(circle,/rel="canonical" href="https:\/\/chrisizworski.com\/lake-superior-circle-tour\/"/);
 assert.match(circle,/https:\/\/chrisizworski.com\/#person/);
});
test('Great Lakes regional desk leads to all four and the full-circle map',()=>{
 assert.match(regional,/id="north-shore-trip-desk"/);
 assert.ok(regional.indexOf('id="north-shore-trip-desk"')<regional.indexOf('id="niagara-trip-desk"'));
 for(const url of ['/duluth-canal-park/','/split-rock-river-loop/','/split-rock-lighthouse-visit/','/isle-royale-ferry/','/lake-superior-circle-tour/#seg-mn']) assert.ok(regional.includes('href="'+url+'"'),url);
 assert.match(regional,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/northeast-great-lakes\/"/);
 assert.match(regional,/https:\/\/chrisizworski.com\/#person/);
});
