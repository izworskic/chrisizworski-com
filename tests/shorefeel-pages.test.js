'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../public');
const pages=[
 ['great-lakes-water-temperature/index.html','/great-lakes-water-temperature/'],
 ['lake-michigan-water-temperature/index.html','/lake-michigan-water-temperature/'],
 ['lake-michigan-water-temperature/grand-haven/index.html','/lake-michigan-water-temperature/grand-haven/'],
 ['lake-michigan-water-temperature/traverse-city/index.html','/lake-michigan-water-temperature/traverse-city/']
];
test('four published, indexable, authored source-led destination pages',()=>{
 for(const [file,route] of pages){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(html,new RegExp('<link rel="canonical" href="https://chrisizworski\\.com'+route.replaceAll('/','\\/')+'"'));
  assert.match(html,/Built by Chris Izworski/);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/assets\/shorefeel\.css/);
  assert.match(html,/assets\/shorefeel\.js/);
  assert.match(html,/Great Lakes Buoys|buoys/i);
  assert.match(html,/beach.*condition|beach.*hazard/i);
  assert.doesNotMatch(html,/<meta name="robots" content="noindex/);
  const schemaMatch=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(schemaMatch);JSON.parse(schemaMatch[1]);
 }
});
test('destination narratives are locally differentiated and data claims do not interpolate',()=>{
 const grand=fs.readFileSync(path.join(root,pages[2][0]),'utf8');
 const traverse=fs.readFileSync(path.join(root,pages[3][0]),'utf8');
 assert.match(grand,/Port Sheldon/);assert.match(grand,/45029/);
 assert.match(traverse,/Grand Traverse Bay/);assert.match(traverse,/45020/);
 assert.match(traverse,/does not substitute/);
 for(const page of [grand,traverse]){
  assert.match(page,/data-activity="swim"/);assert.match(page,/data-activity="paddle"/);
  assert.match(page,/id="local-temp">Unavailable/);
  assert.match(page,/id="station-note"/);
 }
});
test('new sitemap and main directory link the same canonical hub',()=>{
 const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 const tools=fs.readFileSync(path.join(root,'tools/index.html'),'utf8');
 const routes=pages.map(([,x])=>'https://chrisizworski.com'+x);
 for(const route of routes)assert.ok(sitemap.includes('<loc>'+route+'</loc>'),route);
 assert.match(tools,/data-tool-id="shorefeel"/);
 assert.match(tools,/href="\/great-lakes-water-temperature\/"/);
});
test('API is noindex and does not interpolate or use paid services',()=>{
 const api=fs.readFileSync(path.join(__dirname,'../api/shorefeel.js'),'utf8');
 assert.match(api,/X-Robots-Tag/);
 assert.match(api,/Object\.hasOwn\(DESTINATIONS/);
 assert.match(api,/parseNDBC/);
 assert.doesNotMatch(api,/redis|anthropic|openai|apiKey/i);
});